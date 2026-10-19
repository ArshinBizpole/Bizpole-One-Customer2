import React, { useState, useEffect, createContext } from "react";
import ProfileMenu from "../components/ProfileMenu";
import NotificationBell from "../components/NotificationBell";
import GlobalSearch from "../components/GlobalSearch";
import { setSecureItem, getSecureItem } from "../utils/secureStorage";
import axiosInstance from "../api/axiosInstance";
import { JOURNL_URL } from "../utils/externalLinks";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  BookOpen,
  Layers,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";


// Context to provide selected company and quotes
export const DashboardContext = createContext();

const DashboardLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // The mobile menu floats over the page — close it once the user navigates.
  const { pathname } = useLocation();
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  // Close the company dropdown on a click outside it (or Esc).
  useEffect(() => {
    if (!showCompanyDropdown) return;
    const onDown = (e) => { if (!e.target.closest("[data-company-dropdown]")) setShowCompanyDropdown(false); };
    const onKey = (e) => { if (e.key === "Escape") setShowCompanyDropdown(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showCompanyDropdown]);
  const [companies, setCompanies] = useState([]);
  const [quotes, setQuotes] = useState([]);

  // Load companies and quotes from localStorage on mount
  useEffect(() => {
    try {
      let userStr = getSecureItem("user");
      console.log(userStr, "userStr");

      // Fix: Check if userStr is a string before using string methods
      if (userStr && typeof userStr === "string" && userStr.includes(":NULL")) {
        userStr = userStr.replace(/:NULL/g, ":null");
      }

      // Safely get selectedCompany from localStorage
      let savedCompanyId = null;
      let selectedCompanyObj = null;
      const selectedCompanyStr = getSecureItem("selectedCompany");
      if (selectedCompanyStr) {
        try {
          selectedCompanyObj = JSON.parse(selectedCompanyStr);
          savedCompanyId = selectedCompanyObj && selectedCompanyObj.CompanyID ? selectedCompanyObj.CompanyID : null;
        } catch (e) {
          console.log("Error parsing selectedCompany from localStorage", e);
          savedCompanyId = null;
        }
      }

      if (userStr) {
        let user = null;
        try {
          // If userStr is already an object, use it directly
          if (typeof userStr === 'object') {
            user = userStr;
          } else {
            user = JSON.parse(userStr);
          }
        } catch (e) {
          console.log("Error parsing user from localStorage", e);
        }

        if (user && user.Companies && Array.isArray(user.Companies)) {
     
          setCompanies(user.Companies);

          // Set default selected company to saved or first one
          let targetCompany = null;
          if (savedCompanyId && user.Companies.some(c => String(c.CompanyID) === String(savedCompanyId))) {
            targetCompany = user.Companies.find(c => String(c.CompanyID) === String(savedCompanyId));
          } else if (user.Companies.length > 0) {
            targetCompany = user.Companies[0];
          }

          if (targetCompany) {
                 
            setSelectedCompany(targetCompany.BusinessName);
            setSelectedCompanyId(targetCompany.CompanyID);
            
            // Load quotes for the selected company
            loadQuotesForCompany(targetCompany);
            setSecureItem("selectedCompany", JSON.stringify({
              CompanyID: targetCompany.CompanyID,
              CompanyName: targetCompany.BusinessName,
              State: targetCompany.State || ""
            }));
            // Child pages' effects run before this one, so on a reload they've
            // already fetched with the previously stored company. If the saved
            // company wasn't valid and we fell back to another one, tell them
            // to reload for the company actually selected.
            if (String(targetCompany.CompanyID) !== String(savedCompanyId)) {
              window.dispatchEvent(new Event("company-switched"));
            }
          }
        }
      } else {
        console.log("no user found");
      }
    } catch (e) {
      console.log("error in fetching user data from localStorage", e);
    }
  }, []);

  // Load quotes for a specific company
  const loadQuotesForCompany = (company) => {
    if (company && company.Quotes && Array.isArray(company.Quotes)) {
      setQuotes(company.Quotes);
    } else {
      setQuotes([]);
    }
    // The cached Quotes above are only as fresh as the last sign-in — anything
    // created since (e.g. the apply flow's quote) is missing. Refresh from the
    // server and cache the result. Customer sessions only (the endpoint takes a
    // website token); on failure the cached list stays.
    const companyId = company?.CompanyID;
    if (!companyId || !localStorage.getItem("token") || localStorage.getItem("partnerToken")) return;
    axiosInstance
      .get(`/website/company-quotes/${companyId}`)
      .then((res) => {
        const serverQuotes = res.data?.data;
        if (!res.data?.success || !Array.isArray(serverQuotes)) return;
        // Server rows win; keep any cached quote the server didn't return
        // (it only scopes by this customer + company).
        const cached = Array.isArray(company.Quotes) ? company.Quotes : [];
        const seen = new Set(serverQuotes.map((q) => String(q.QuoteID)));
        const fresh = [...serverQuotes, ...cached.filter((q) => !seen.has(String(q.QuoteID)))];
        setQuotes(fresh);
        try {
          const raw = getSecureItem("user");
          const user = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (user?.Companies) {
            user.Companies = user.Companies.map((c) =>
              String(c.CompanyID) === String(companyId) ? { ...c, Quotes: fresh } : c
            );
            setSecureItem("user", JSON.stringify(user));
          }
        } catch {
          // cache refresh is best-effort
        }
      })
      .catch(() => {});
  };

  // Re-read quotes from localStorage whenever a quote is created/updated
  // elsewhere (upsertQuote patches localStorage then fires this event) —
  // the mount-only effect above won't otherwise pick up the change since
  // this layout stays mounted across client-side nav within /dashboard/*.
  useEffect(() => {
    const handleQuotesUpdated = () => {
      try {
        const rawUser = getSecureItem("user");
        const user = typeof rawUser === "string" ? JSON.parse(rawUser) : rawUser;
        const company = user?.Companies?.find(
          (c) => String(c.CompanyID) === String(selectedCompanyId)
        );
        if (company) loadQuotesForCompany(company);
      } catch (e) {
        console.log("Failed to refresh quotes after update", e);
      }
    };
    window.addEventListener("quotes-updated", handleQuotesUpdated);
    return () => window.removeEventListener("quotes-updated", handleQuotesUpdated);
  }, [selectedCompanyId]);




  // Handle company selection
  const handleCompanySelect = (company) => {
    setSelectedCompany(company.BusinessName);
    setSelectedCompanyId(company.CompanyID);
    loadQuotesForCompany(company);
    setSecureItem("selectedCompany", JSON.stringify({
      CompanyID: company.CompanyID,
      CompanyName: company.BusinessName,
      State: company.State || ""
    }));
    window.dispatchEvent(new Event("company-switched"));
    setShowCompanyDropdown(false);
  };

  // Products — listed in the mobile header menu (desktop: the profile menu).
  const menuItems = [
    { name: "Bizpole One", path: "/dashboard/bizpoleone", icon: Layers },
    { name: "Journl", href: JOURNL_URL, icon: BookOpen }, // own site — new tab
  ];
const uniqueCompanies = Array.from(
  new Map(
    companies.map((company) => [company.BusinessName.trim(), company]),
  ).values(),
);
  return (
    <DashboardContext.Provider
      value={{
        selectedCompany,
        selectedCompanyId,
        companies,
        quotes,
        handleCompanySelect,
        loadQuotesForCompany,
      }}
    >
      {/* Locked to the screen height: only the page content (main) scrolls, so the
          sidebars stay in place. */}
      <div className="h-screen overflow-hidden flex flex-col bg-gray-50">
        {/* ✅ Top Navbar */}
        {/* Header + the mobile menu that drops down over the page from it */}
        <div className="relative z-30 shrink-0">
        <header className="bg-white px-4 sm:px-6 py-2 sm:py-3 flex justify-between items-center shadow-sm">
          {/* Logo */}
          <div className="flex items-center">
            <img src="/Images/image.png" alt="Bizpole Logo" className="h-10 sm:h-14" />
          </div>

          {/* Desktop Right Section */}
          <div className="hidden lg:flex items-center space-x-6">
            {/* Company Dropdown */}
            <div className="relative" data-company-dropdown>
              <button
                className="px-6 py-2 rounded-full font-semibold text-black bg-[#FFC42A40] hover:bg-[#FFC42A70] transition flex items-center gap-2"
                onClick={() => setShowCompanyDropdown((prev) => !prev)}
                type="button"
              >
                {selectedCompany || "Select Company"}
                <ChevronDown className="w-4 h-4" />
              </button>
              {/* Company Dropdown */}
              {showCompanyDropdown && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-lg z-20 border border-gray-200">
                  {uniqueCompanies.map((company) => (   
                    <button
                      key={company.CompanyID}
                      className={`w-full text-left px-5 py-3 hover:bg-yellow-100 rounded-xl transition ${
                        selectedCompany === company.BusinessName
                          ? "bg-yellow-50 font-bold"
                          : ""
                      }`}
                      onClick={() => handleCompanySelect(company)}
                    >
                      {company.BusinessName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quotes Dropdown removed as per request */}

            {/* Search + Icons Container */}
            <div className="flex items-center bg-white rounded-full shadow-md px-3 py-2 space-x-4">
              {/* Search Bar */}
              <GlobalSearch />

              {/* Notifications */}
              <NotificationBell />

              {/* Profile */}
              <ProfileMenu />
            </div>
          </div>

          {/* ✅ Mobile Right Section (Bell + User + Menu) */}
          <div className="flex items-center space-x-3 lg:hidden">
            {/* Notifications */}
            <NotificationBell />

            {/* User Profile */}
            <ProfileMenu />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded hover:bg-gray-100"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>

        {/* ✅ Mobile Dropdown Menu — floats over the page (doesn't push it down) */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute left-0 right-0 top-full bg-white shadow-lg border-t border-gray-100 px-4 py-4 space-y-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
            {/* Company Dropdown for Mobile */}
            <div className="relative" data-company-dropdown>
              <button
                className="w-full px-6 py-2 rounded-full font-semibold text-black bg-[#FFC42A40] hover:bg-[#FFC42A70] transition flex items-center justify-center gap-2"
                onClick={() => setShowCompanyDropdown((prev) => !prev)}
                type="button"
              >
                {selectedCompany || "Select Company"}
                <ChevronDown className="w-4 h-4" />
              </button>
              {/* Mobile Company Dropdown */}
              {showCompanyDropdown && (
                <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-lg z-10 border border-gray-200">
                  {uniqueCompanies.map((company) => (
                    <button
                      key={company.CompanyID || company.BusinessName}
                      className={`w-full text-left px-5 py-3 hover:bg-yellow-100 rounded-xl transition ${
                        selectedCompany === company.BusinessName
                          ? "bg-yellow-50 font-bold"
                          : ""
                      }`}
                      onClick={() => {
                        handleCompanySelect(company);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      {company.BusinessName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search Bar */}
            <GlobalSearch />

            {/* Products — the dark sidebar's links (that sidebar is desktop-only) */}
            <nav className="border-t pt-3">
              <ul className="grid grid-cols-2 gap-2">
                {menuItems.map((item) => (
                  <li key={item.path || item.href}>
                    {item.href ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition bg-gray-50 text-gray-700 hover:bg-gray-100"
                      >
                        <item.icon size={18} />
                        {item.name}
                      </a>
                    ) : (
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition ${
                          isActive ? "bg-[#221e1e] text-white" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                        }`
                      }
                    >
                      <item.icon size={18} />
                      {item.name}
                    </NavLink>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}
        </div>

        {/* ✅ Main Section */}
        <div className="flex flex-1 min-h-0">
          {/* Page Content */}
          <main className="flex-1 min-w-0 bg-gray-50 overflow-auto">
            <Outlet /> {/* ✅ Nested Dashboard Routes */}
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  );
};

export default DashboardLayout;

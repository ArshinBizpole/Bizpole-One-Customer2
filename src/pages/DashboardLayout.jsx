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
  Check,
  ExternalLink,
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
    { name: "Bizpole One", desc: "Business dashboard", path: "/dashboard/bizpoleone", icon: Layers },
    { name: "Journl", desc: "Accounting & Bookkeeping", href: JOURNL_URL, icon: BookOpen }, // own site — new tab
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
            {/* Opening notifications or the profile menu closes the ☰ menu */}
            <div onClickCapture={() => setIsMobileMenuOpen(false)}>
              <NotificationBell />
            </div>

            {/* User Profile */}
            <div onClickCapture={() => setIsMobileMenuOpen(false)}>
              <ProfileMenu />
            </div>

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
          <>
          {/* Dimmed page behind the menu — tap to close. -z-10 keeps it under the header. */}
          <div
            className="lg:hidden fixed inset-0 -z-10 bg-black/30"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            // Picking a link or search result closes the menu (even when it
            // doesn't change the page, e.g. Journl opens in a new tab)
            onClick={(e) => {
              if (e.target.closest('a, [role="option"]')) setIsMobileMenuOpen(false);
            }}
            className="lg:hidden absolute left-0 right-0 top-full bg-white rounded-b-2xl shadow-xl border-t border-gray-100 px-4 pt-4 pb-5 space-y-5 max-h-[calc(100vh-4rem)] overflow-y-auto">
            {/* Company */}
            <section data-company-dropdown>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Company</p>
              <button
                type="button"
                onClick={() => setShowCompanyDropdown((prev) => !prev)}
                aria-expanded={showCompanyDropdown}
                className="w-full flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-left transition hover:bg-amber-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFC42A] text-sm font-bold uppercase text-gray-900">
                  {(selectedCompany || "?").trim().charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-900">
                    {selectedCompany || "Select Company"}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {uniqueCompanies.length > 1 ? "Current company · tap to switch" : "Current company"}
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${showCompanyDropdown ? "rotate-180" : ""}`} />
              </button>
              {/* Company list opens in place */}
              {showCompanyDropdown && (
                <ul className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-gray-100 bg-white py-1 shadow-sm">
                  {uniqueCompanies.map((company) => {
                    const isSelected = selectedCompany === company.BusinessName;
                    return (
                      <li key={company.CompanyID || company.BusinessName}>
                        <button
                          type="button"
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition ${
                            isSelected ? "bg-amber-50 font-semibold text-gray-900" : "text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            handleCompanySelect(company);
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-bold uppercase text-gray-600">
                            {company.BusinessName.trim().charAt(0)}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{company.BusinessName}</span>
                          {isSelected && <Check className="h-4 w-4 shrink-0 text-amber-500" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Search */}
            <section>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Search</p>
              <GlobalSearch variant="menu" placeholder="Search services, orders, documents…" />
            </section>

            {/* Products — the dark sidebar's links (that sidebar is desktop-only) */}
            <nav>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Products</p>
              <ul className="grid grid-cols-2 gap-2">
                {menuItems.map((item) => {
                  const body = (
                    <>
                      <span className="flex items-center justify-between">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-amber-500 shadow-sm">
                          <item.icon size={17} />
                        </span>
                        {item.href && <ExternalLink className="h-3.5 w-3.5 text-gray-400" />}
                      </span>
                      <span className="mt-2 block text-sm font-semibold text-gray-900">{item.name}</span>
                      <span className="block text-[11px] leading-snug text-gray-500">{item.desc}</span>
                    </>
                  );
                  const base = "block h-full rounded-xl border p-3 transition";
                  return (
                    <li key={item.path || item.href}>
                      {item.href ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${base} border-gray-200 bg-gray-50 hover:bg-gray-100`}
                        >
                          {body}
                        </a>
                      ) : (
                        <NavLink
                          to={item.path}
                          className={({ isActive }) =>
                            `${base} ${isActive ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-gray-50 hover:bg-gray-100"}`
                          }
                        >
                          {body}
                        </NavLink>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
          </>
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

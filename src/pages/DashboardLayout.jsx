import React, { useState, useEffect, createContext } from "react";
import ProfileMenu from "../components/ProfileMenu";
import NotificationBell from "../components/NotificationBell";
import GlobalSearch from "../components/GlobalSearch";
import { setSecureItem, getSecureItem } from "../utils/secureStorage";
import axiosInstance from "../api/axiosInstance";
import { Outlet, NavLink } from "react-router-dom";
import {
  BookOpen,
  Layers,
  ChevronDown,
  Menu,
  X,
  FileText,
  Plus,
} from "lucide-react";


// Context to provide selected company and quotes
export const DashboardContext = createContext();

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Generate new quote
  const handleGenerateQuote = () => {
    if (!selectedCompanyId) {
      alert("Please select a company first");
      return;
    }
    // Navigate to quote generation page or open modal
    window.open('/startbusiness/choose', '_blank');
  };

  const encrypt = (id) => {
    const secret =
      import.meta.env.VITE_QUOTE_LINK_SECRET ||
      "q3!9fKs7@pLzXr84$nmYtB!cVZdQ3";
    return CryptoJS.AES.encrypt(String(id), secret).toString();
  };

  // View quote details
  const handleViewQuote = (quote) => {
    // Open quote in new tab or show details
    if (quote.QuoteID) {
      // Fix: Check if CryptoJS is available before using it
      if (typeof CryptoJS !== 'undefined') {
        const encrypted = encrypt(quote.QuoteID);
        const url = `${import.meta.env.VITE_CLIENT_BASE_URL}/quotes/saved-preview/${encodeURIComponent(encrypted)}`;
        window.open(url, "_blank");
      } else {
        console.error("CryptoJS is not available");
        // Fallback: open without encryption or show error
        alert("Unable to open quote preview. CryptoJS library not loaded.");
      }
    }
  };

  // ✅ Auto collapse on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ Updated sidebar menu items with new icons
  const menuItems = [
    { name: "Bizpole One", path: "/dashboard/bizpoleone", icon: Layers },
    { name: "Bizpole Books", path: "/dashboard/books", icon: BookOpen },
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
        <header className="bg-white px-6 py-3 flex justify-between items-center shadow-sm">
          {/* Logo */}
          <div className="flex items-center">
            <img src="/Images/logo.webp" alt="Bizpole Logo" className="h-14" />
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

        {/* ✅ Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white shadow-md px-6 py-4 space-y-4">
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
                  {companies.map((company) => (
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

            {/* Quotes Section for Mobile */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-800">
                  Quotes ({quotes.length})
                </h3>
                <button
                  onClick={handleGenerateQuote}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                >
                  <Plus size={14} />
                  Generate
                </button>
              </div>
              {quotes.length === 0 ? (
                <div className="text-center py-4 text-gray-500 border rounded-lg">
                  <FileText size={32} className="mx-auto mb-2 text-gray-400" />
                  <p>No quotes found</p>
                  <button
                    onClick={handleGenerateQuote}
                    className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600"
                  >
                    Generate Quote
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {quotes.map((quote) => (
                    <div
                      key={quote.QuoteID}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewQuote(quote)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800">
                            {quote.PackageName || "Untitled Quote"}
                          </p>
                          <p className="text-sm text-gray-600">
                            Status:{" "}
                            <span
                              className={`font-semibold ${
                                quote.QuoteStatus === "Approved"
                                  ? "text-green-600"
                                  : quote.QuoteStatus === "Draft"
                                    ? "text-yellow-600"
                                    : "text-gray-600"
                              }`}
                            >
                              {quote.QuoteStatus}
                            </span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-800">
                            ₹{quote.TotalAmount || quote.Total || "0"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(
                              quote.CreatedDate || quote.createdAt,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Search Bar */}
            <GlobalSearch />
          </div>
        )}

        {/* ✅ Main Section */}
        <div className="flex flex-1 min-h-0 p-2">
          {/* Sidebar */}
          <div
            className={`bg-[#221e1e] text-white transition-all duration-300
            ${isSidebarOpen ? "w-60" : "w-16"}
            flex flex-col justify-between rounded-xl shadow-md overflow-y-auto`}
          >
            {/* Sidebar Top */}
            <div>
              {/* Toggle + Title */}
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                {isSidebarOpen && (
                  <span className="font-bold text-lg tracking-wide">
                    Bizpole
                  </span>
                )}
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 rounded hover:bg-gray-800"
                >
                  {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </div>

              {/* Menu Items */}
              <nav className="mt-4 px-2">
                <ul className="space-y-2">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center gap-3 py-3 px-3 rounded-lg transition
                        ${
                          isActive
                            ? "bg-gray-700 text-white"
                            : "text-gray-300 hover:bg-gray-700 hover:text-white"
                        }`
                        }
                      >
                        <item.icon size={isSidebarOpen ? 24 : 20} />
                        {isSidebarOpen && (
                          <span className="text-sm font-medium">
                            {item.name}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            {/* Help / Logout removed from the sidebar — Log out now lives in
                the header profile menu (ProfileMenu). */}
          </div>

          {/* Sidebar Bottom */}
          {/* <div className="p-4 border-t border-gray-700 flex flex-col space-y-2">
            <NavLink
              to="/help"
              className="flex items-center gap-3 py-2 px-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <HelpCircle size={isSidebarOpen ? 24 : 20} />
              {isSidebarOpen && <span className="text-sm font-medium">Help</span>}
            </NavLink>
             <button
      onClick={() => setShowConfirm(true)}
      className="flex items-center gap-3 py-2 px-3 rounded-lg text-red-500 hover:bg-gray-700 hover:text-red-400"
    >
      <LogOut size={isSidebarOpen ? 24 : 20} />
      {isSidebarOpen && <span className="text-sm font-medium">Logout</span>}


    </button>
   
          </div> */}
          {/* Page Content */}
          <main className="flex-1 bg-gray-50 overflow-auto rounded-xl">
            <Outlet /> {/* ✅ Nested Dashboard Routes */}
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  );
};

export default DashboardLayout;

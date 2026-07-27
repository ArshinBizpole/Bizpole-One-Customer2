import React, { useState, useEffect, createContext } from "react";
import ConfirmMsg from "../components/ConfirmMsg";
import { setSecureItem, getSecureItem } from "../utils/secureStorage";
import { Outlet, NavLink } from "react-router-dom";
import {
  BookOpen,
  Layers,
  Bell,
  ChevronDown,
  Menu,
  X,
  HelpCircle,
  LogOut,
  FileText,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";


// Context to provide selected company and quotes
export const DashboardContext = createContext();

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
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
  };



  const navigate = useNavigate();

  const [showConfirm, setShowConfirm] = useState(false);
  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };
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
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* ✅ Top Navbar */}
        <header className="bg-white px-6 py-3 flex justify-between items-center shadow-sm">
          {/* Logo */}
          <div className="flex items-center">
            <img src="/Images/logo.webp" alt="Bizpole Logo" className="h-14" />
          </div>

          {/* Desktop Right Section */}
          <div className="hidden lg:flex items-center space-x-6">
            {/* Company Dropdown */}
            <div className="relative">
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
              <div className="flex items-center bg-[#FFC42A40] rounded-full px-3 py-1.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-500 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18.5a7.5 7.5 0 006.15-3.85z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search"
                  className="bg-transparent outline-none text-sm placeholder-gray-500 w-32 focus:w-44 transition-all"
                />
              </div>

              {/* Notifications */}
              <button className="p-2 rounded-full hover:bg-gray-100 relative cursor-pointer">
                <Bell size={22} className="text-gray-600" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>

              {/* Profile */}
              <NavLink
                to="/profile"
                className="flex items-center cursor-pointer"
              >
                <img
                  src="/Images/user.jpg"
                  alt="Profile"
                  className="w-9 h-9 rounded-full shadow"
                />
              </NavLink>
            </div>
          </div>

          {/* ✅ Mobile Right Section (Bell + User + Menu) */}
          <div className="flex items-center space-x-3 lg:hidden">
            {/* Notifications */}
            <button className="p-2 rounded-full hover:bg-gray-100 relative cursor-pointer">
              <Bell size={22} className="text-gray-600" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>

            {/* User Profile */}
            <div className="flex items-center cursor-pointer">
              <img
                src="/Images/user.jpg"
                alt="Profile"
                className="w-9 h-9 rounded-full shadow"
              />
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

        {/* ✅ Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white shadow-md px-6 py-4 space-y-4">
            {/* Company Dropdown for Mobile */}
            <div className="relative">
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
            <div className="flex items-center bg-[#FFC42A40] rounded-full px-3 py-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-500 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18.5a7.5 7.5 0 006.15-3.85z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search"
                className="bg-transparent outline-none text-sm placeholder-gray-500 w-full"
              />
            </div>
          </div>
        )}

        {/* ✅ Main Section */}
        <div className="flex flex-1 p-2">
          {/* Sidebar */}
          <div
            className={`bg-[#221e1e] text-white transition-all duration-300
            ${isSidebarOpen ? "w-60" : "w-16"}
            flex flex-col justify-between rounded-xl shadow-md`}
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

            {/* Sidebar Bottom */}
            <div className="p-4 border-t border-gray-700 flex flex-col space-y-2">
              <NavLink
                to="/help"
                className="flex items-center gap-3 py-2 px-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <HelpCircle size={isSidebarOpen ? 24 : 20} />
                {isSidebarOpen && (
                  <span className="text-sm font-medium">Help</span>
                )}
              </NavLink>
              <button
                onClick={() => setShowConfirm(true)}
                className="flex items-center gap-3 py-2 px-3 rounded-lg text-red-500 hover:bg-gray-700 hover:text-red-400"
              >
                <LogOut size={isSidebarOpen ? 24 : 20} />
                {isSidebarOpen && (
                  <span className="text-sm font-medium">Logout</span>
                )}
              </button>
              {/* Confirm Logout Modal - moved outside button for correct event handling */}
              <ConfirmMsg
                open={showConfirm}
                title="Logout"
                message="Do you want to logout?"
                confirmText="Logout"
                cancelText="Cancel"
                onConfirm={() => {
                  setShowConfirm(false);
                  handleLogout();
                }}
                onCancel={() => setShowConfirm(false)}
                showCancel={true}
                variant="delete"
              />
            </div>
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

// src/layouts/ProfileLayout.jsx
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { setSecureItem, getSecureItem } from "../utils/secureStorage";
import {
  LayoutGrid,
  Calendar,
  FileText,
  Folder,
  Briefcase,
  MessageSquare,
  Bell,
  Menu,
  X,
  ChevronDown,
  User,
  LogOut,
  ArrowLeft,
  Camera,
} from "lucide-react";
import { useState, useEffect, createContext } from "react";
import ConfirmMsg from "../components/ConfirmMsg";

export const ProfileCompanyContext = createContext(null);

const menuItems = [
  { name: "Profile", path: "", icon: LayoutGrid },
  { name: "Calendars", path: "calendar", icon: Calendar },
  { name: "Company Details", path: "companydetails", icon: FileText },
  { name: "Files", path: "files", icon: Folder },
  { name: "Compliance Calendar", path: "events", icon: Briefcase },
  { name: "Invoice", path: "invoice", icon: MessageSquare },
];

const ProfileLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState({});
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [companies, setCompanies] = useState([]);
  const navigate = useNavigate();
  const profileCompletion = user?.profileCompletion || 80;
  const creditScore = user?.creditScore || 755;
  const creditScorePercent = Math.min(100, Math.max(0, ((creditScore - 300) / (850 - 300)) * 100));

  const handlePhotoUpload = () => {
    // wire this up to your actual upload flow
    console.log("Open photo upload");
  };

  // Load user and company data from secureStorage (robust parse)
  useEffect(() => {
    try {
      const rawUser = getSecureItem("user");
      // getSecureItem might already return parsed object or a string
      const parsedUser = rawUser && typeof rawUser === "string" ? JSON.parse(rawUser) : rawUser;

      if (parsedUser) {
        setUser(parsedUser);

        if (Array.isArray(parsedUser.Companies) && parsedUser.Companies.length > 0) {
          setCompanies(parsedUser.Companies);

          // Try to get saved selectedCompany
          const rawSaved = getSecureItem("selectedCompany");
          const parsedSaved = rawSaved && typeof rawSaved === "string" ? JSON.parse(rawSaved) : rawSaved;

          if (parsedSaved && parsedSaved.CompanyID) {
            const found = parsedUser.Companies.find(
              (c) => String(c.CompanyID) === String(parsedSaved.CompanyID)
            );
            if (found) {
              setSelectedCompany(found.BusinessName || found.CompanyName || "");
              setSelectedCompanyId(found.CompanyID);
            } else {
              // saved selectedCompany not found in user's companies, fallback to first
              const first = parsedUser.Companies[0];
              setSelectedCompany(first.BusinessName || first.CompanyName || "");
              setSelectedCompanyId(first.CompanyID);
              setSecureItem(
                "selectedCompany",
                JSON.stringify({
                  CompanyID: first.CompanyID,
                  CompanyName: first.BusinessName || first.CompanyName || "",
                })
              );
            }
          } else {
            // no saved selectedCompany -> set first and persist
            const first = parsedUser.Companies[0];
            setSelectedCompany(first.BusinessName || first.CompanyName || "");
            setSelectedCompanyId(first.CompanyID);
            setSecureItem(
              "selectedCompany",
              JSON.stringify({
                CompanyID: first.CompanyID,
                CompanyName: first.BusinessName || first.CompanyName || "",
              })
            );
          }
        }
      }
    } catch (err) {
      console.log("Error parsing user data in ProfileLayout:", err);
    }
  }, []);

  // Handle logout
  const [showConfirm, setShowConfirm] = useState(false);
  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // Handle back to dashboard - MOVED INSIDE THE COMPONENT
  const handleBackToDashboard = () => {
    navigate("/dashboard/bizpoleone");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ===== Navbar ===== */}
      <header className="bg-white px-6 py-3 flex justify-between items-center shadow-sm fixed top-0 left-0 right-0 z-50">
        {/* Logo */}
        <div className="flex items-center">
          <img src="/Images/logo.webp" alt="Bizpole Logo" className="h-14" />
        </div>

        {/* Desktop Right Section */}
        <div className="hidden lg:flex items-center space-x-6">
          {/* Company Selector */}
          <div className="relative">
            <button
              className="px-6 py-2 rounded-full font-semibold text-black bg-[#FFC42A40] hover:bg-[#FFC42A70] transition flex items-center gap-2"
              onClick={() => setShowCompanyDropdown((prev) => !prev)}
              type="button"
            >
              {selectedCompany || "Select Company"}
              <ChevronDown className="w-4 h-4" />
            </button>

            {showCompanyDropdown && (
              <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-lg z-10 border border-gray-200">
                {companies.map((company) => (
                  <button
                    key={company.CompanyID || company.BusinessName}
                    className={`w-full text-left px-5 py-3 hover:bg-yellow-100 rounded-xl transition ${selectedCompany === (company.BusinessName || company.CompanyName)
                      ? "bg-yellow-50 font-bold"
                      : ""
                      }`}
                    onClick={() => {
                      const companyName = company.BusinessName || company.CompanyName || "";
                      setSelectedCompany(companyName);
                      setSelectedCompanyId(company.CompanyID);
                      setSecureItem(
                        "selectedCompany",
                        JSON.stringify({
                          CompanyID: company.CompanyID,
                          CompanyName: companyName,
                        })
                      );
                      setSecureItem("CompanyId", company.CompanyID.toString());
                      setShowCompanyDropdown(false);
                      window.dispatchEvent(new Event("company-switched"));
                    }}
                  >
                    {company.BusinessName || company.CompanyName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search + Notifications + Profile */}
          <div className="flex items-center bg-white rounded-full shadow-md px-3 py-2 space-x-4">
            {/* Search */}
            <div className="flex items-center bg-[#FFC42A40] rounded-full px-3 py-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-500 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18.5a7.5 7.5 0 006.15-3.85z" />
              </svg>
              <input type="text" placeholder="Search" className="bg-transparent outline-none text-sm placeholder-gray-500 w-32 focus:w-44 transition-all" />
            </div>

            {/* Bell */}
            <button className="p-2 rounded-full hover:bg-gray-100 relative cursor-pointer">
              <Bell size={22} className="text-gray-600" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>

            {/* Profile */}
            <NavLink to="/profile" className="flex items-center cursor-pointer">
              <img src="/Images/user.jpg" alt="Profile" className="w-9 h-9 rounded-full shadow" />
            </NavLink>
          </div>
        </div>

        {/* Mobile Right Section */}
        <div className="flex items-center space-x-3 lg:hidden">
          <button className="p-2 rounded-full hover:bg-gray-100 relative cursor-pointer">
            <Bell size={22} className="text-gray-600" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>
          <img src="/Images/user.jpg" alt="Profile" className="w-9 h-9 rounded-full shadow" />
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded hover:bg-gray-100">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* ===== Sidebar ===== */}
      <aside
        className={`fixed lg:static min-h-screen mt-16 left-0 w-72 bg-white shadow-md flex flex-col justify-between transform transition-transform duration-300 z-40 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div>
          {/* Profile Section */}
          <div className="p-8 text-center">
            <div className="relative inline-block">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#FBBF24"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 45}
                  strokeDashoffset={2 * Math.PI * 45 * (1 - profileCompletion / 100)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                    <User size={40} className="text-gray-400" />
                  </div>
                )}
              </div>
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-white text-[11px] font-bold w-9 h-9 rounded-full flex items-center justify-center border-4 border-white shadow">
                {profileCompletion}%
              </span>
              <button
                type="button"
                onClick={handlePhotoUpload}
                className="absolute -bottom-1 right-4 bg-yellow-400 hover:bg-yellow-500 text-white w-9 h-9 rounded-full flex items-center justify-center border-4 border-white shadow transition"
              >
                <Camera size={16} />
              </button>
            </div>
            <h2 className="text-lg font-semibold mt-4 text-gray-900">
              Hello {user?.FirstName || user?.firstName || "User"}
            </h2>
            <p className="text-sm text-gray-400">{user?.Email || user?.email || ""}</p>
          </div>


          {/* Grid Menu */}
          <div className="grid grid-cols-2 gap-px bg-gray-200 mx-6 rounded-lg overflow-hidden border border-gray-200">
            {menuItems.map(({ name, path }) => (
              <NavLink
                key={name}
                to={path}
                end={name === "Profile"}
                className={({ isActive }) =>
                  `relative flex items-center justify-center bg-white py-8 px-2 text-sm font-medium transition ${isActive ? "text-gray-600 font-semibold " : "text-gray-400 hover:text-gray-600"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute top-3 left-3 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                    {name}
                  </>
                )}
              </NavLink>
            ))}
          </div>


        </div>

        {/* Bottom Buttons */}
        <div className="p-6 space-y-4">
          {/* Credit Score */}
          <div className="px-6 mt-8 mb-4 text-center">
            <h3 className="text-base font-bold text-gray-900 mb-4">Your Credit Score</h3>
            <div className="relative w-40 h-24 mx-auto">
              <svg viewBox="0 0 200 110" className="w-full h-full">
                <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="#FDE9B8" strokeWidth="10" strokeLinecap="round" />
                <path
                  d="M 15 100 A 85 85 0 0 1 185 100"
                  fill="none"
                  stroke="#FBBF24"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="267"
                  strokeDashoffset={267 - (267 * creditScorePercent) / 100}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                <span className="text-2xl font-bold text-gray-900">{creditScore}</span>
              </div>
            </div>
            <button className="text-sm font-semibold text-yellow-600 mt-2 hover:underline">
              All goals →
            </button>
          </div>
          {/* Back to Dashboard Button */}
          <button
            onClick={handleBackToDashboard}
            className="w-full inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to Dashboard
            </span>

          </button>

          {/* <button className="flex w-full items-center justify-between rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600 hover:bg-gray-200">
            <span className="flex items-center gap-2">
              <Send size={16} /> Send Feedback
            </span>
            <span>→</span>
          </button> */}
          {/* <button className="flex w-full items-center justify-between rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600 hover:bg-gray-200">
            <span className="flex items-center gap-2">
              <HelpCircle size={16} /> Knowledge Base
            </span>
            <span>→</span>
          </button> */}

          {/* Logout */}
          <button onClick={() => setShowConfirm(true)} className=" w-full inline-flex items-center text-center gap-3 px-8 py-4 border border-red-500 text-red-500 rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all">
            <LogOut size={20} />
            <span className="text-sm font-medium">Logout</span>
          </button>
          <ConfirmMsg
            open={showConfirm}
            title="Logout"
            message="Do you want to logout?"
            confirmText="Logout"
            cancelText="Cancel"
            onConfirm={() => { setShowConfirm(false); handleLogout(); }}
            onCancel={() => setShowConfirm(false)}
            showCancel={true}
            variant="delete"
          />
        </div>
      </aside>

      {/* ===== Main Content ===== */}
      <main className="flex-1 p-8 overflow-y-auto mt-[76px]">
        <ProfileCompanyContext.Provider value={{ selectedCompanyId, selectedCompanyName: selectedCompany }}>
          <Outlet />
        </ProfileCompanyContext.Provider>
      </main>
    </div>
  );
};

export default ProfileLayout;
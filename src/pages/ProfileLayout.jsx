// src/layouts/ProfileLayout.jsx
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import GlobalSearch from "../components/GlobalSearch";
import NotificationBell from "../components/NotificationBell";
import { setSecureItem, getSecureItem } from "../utils/secureStorage";
import {
  LayoutGrid,
  Calendar,
  FileText,
  Folder,
  Briefcase,
  MessageSquare,
  Menu,
  X,
  ChevronDown,
  User,
  ArrowLeft,
} from "lucide-react";
import { useState, useEffect, createContext } from "react";
import ProfileMenu from "../components/ProfileMenu";
import ProfilePhotoPicker from "../components/ProfilePhotoPicker";
import { userPhoto } from "../utils/profilePhoto";

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
  // Set once the saved companies have been read, so a page can tell "no
  // company on this account" apart from "not loaded yet".
  const [companiesReady, setCompaniesReady] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Refunds is reached from the Invoice page, so keep the Invoice tile lit there
  const isTileActive = (path, isActive) =>
    isActive || (path === "invoice" && pathname.startsWith("/profile/refunds"));


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
    setCompaniesReady(true);
  }, []);

  // A company just added from Company Details (customer had none yet) — add it
  // to the dropdown and the saved user, and select it.
  const addCompany = (company) => {
    const companyName = company.BusinessName || "";
    setCompanies((prev) => [...prev, company]);
    setSelectedCompany(companyName);
    setSelectedCompanyId(company.CompanyID);
    setSecureItem("selectedCompany", JSON.stringify({ CompanyID: company.CompanyID, CompanyName: companyName }));
    setSecureItem("CompanyId", company.CompanyID.toString());
    try {
      const rawUser = getSecureItem("user");
      const parsedUser = rawUser && typeof rawUser === "string" ? JSON.parse(rawUser) : rawUser;
      if (parsedUser) {
        const updated = { ...parsedUser, Companies: [...(parsedUser.Companies || []), company] };
        setSecureItem("user", JSON.stringify(updated));
        setUser(updated);
      }
    } catch (err) {
      console.log("Error saving new company to user data:", err);
    }
    window.dispatchEvent(new Event("company-switched"));
  };

  // Handle logout

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
          <img src="/Images/image.png" alt="Bizpole Logo" className="h-14" />
        </div>

        {/* Desktop Right Section */}
        <div className="hidden lg:flex items-center space-x-6">
          {/* Company Selector */}
          <div className="relative" data-company-dropdown>
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
            <GlobalSearch />

            {/* Notifications */}
            <NotificationBell />

            {/* Profile */}
            <ProfileMenu />
          </div>
        </div>

        {/* Mobile Right Section */}
        <div className="flex items-center space-x-3 lg:hidden">
          <NotificationBell />
          <ProfileMenu />
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
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {userPhoto(user) ? (
                  <img src={userPhoto(user)} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                    <User size={40} className="text-gray-400" />
                  </div>
                )}
              </div>
              <ProfilePhotoPicker
                className="absolute -bottom-1 right-4"
                hasPhoto={!!userPhoto(user)}
                onChange={(url) => setUser((u) => ({ ...u, ProfileImage: url || null, profileImage: url || null }))}
              />
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
                  `relative flex items-center justify-center bg-white py-8 px-2 text-sm font-medium transition ${isTileActive(path, isActive) ? "text-gray-600 font-semibold " : "text-gray-400 hover:text-gray-600"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isTileActive(path, isActive) && (
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
        <div className="px-6 pt-6 pb-28 space-y-4">
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

          {/* Logout moved to the header profile menu (ProfileMenu). */}
        </div>
      </aside>

      {/* ===== Main Content ===== */}
      <main className="flex-1 p-8 overflow-y-auto mt-[76px]">
        <ProfileCompanyContext.Provider value={{ selectedCompanyId, selectedCompanyName: selectedCompany, companiesReady, addCompany }}>
          <Outlet />
        </ProfileCompanyContext.Provider>
      </main>
    </div>
  );
};

export default ProfileLayout;
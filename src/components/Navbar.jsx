import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";
import SigninModal from "./Modals/SigninModal";
import ProfileMenu from "./ProfileMenu";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSignin, setShowSignin] = useState(false);
  const [signinMode, setSigninMode] = useState("signin");
  const [hasToken, setHasToken] = useState(false);

  const navItems = [
    { label: "Services", path: "/services" },
    { label: "Product", path: "/products" },
    { label: "Bizpole One", path: "/bizpoleone", isNew: true },
    { label: "Partners", path: "/partners" },
    { label: "Trademark Search", path: "/trademark-search" },
  ];

  // Auto-open Signin Modal
  useEffect(() => {
    if (location.state?.openSigninModal || location.state?.openSignupModal) {
      setSigninMode(location.state?.openSignupModal ? "signup" : "signin");
      setShowSignin(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Token check — rechecked whenever a token is set/cleared, not just on mount,
  // since Navbar lives outside <Routes> and SPA navigation won't remount it.
  useEffect(() => {
    const checkToken = () => {
      setHasToken(!!localStorage.getItem("token"));
    };

    checkToken();

    window.addEventListener("auth-token-set", checkToken);
    window.addEventListener("auth-session-cleared", checkToken);
    window.addEventListener("storage", checkToken);

    return () => {
      window.removeEventListener("auth-token-set", checkToken);
      window.removeEventListener("auth-session-cleared", checkToken);
      window.removeEventListener("storage", checkToken);
    };
  }, []);

  // Legacy `?ref=` referral links are handled app-wide by useLegacyReferral (App.jsx) —
  // they are resolved server-side into a scan token; nothing is copied into PartnerID.

  const handleNavigate = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  // The Bizpole One page's hero shape runs up behind the nav, so the nav floats
  // over it instead of taking its own row.
  const isBizpoleOnePage = location.pathname === "/bizpoleone";

  return (
    <>
      {/* NAVBAR */}
      <nav className={`${isBizpoleOnePage ? "absolute top-0 left-0 right-0" : "relative"} z-50 w-full bg-transparent`}>
        <div className="h-20 lg:h-24 px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4">
          {/* LOGO */}
          <div
            onClick={() => navigate("/")}
            className="cursor-pointer flex items-center"
          >
            <img src="/Images/image.png" alt="Bizpole One" className="h-10 sm:h-12 lg:h-14 w-auto" />
          </div>

          {/* DESKTOP MENU */}
          <ul className="hidden lg:flex items-center gap-7 xl:gap-12 font-medium text-base xl:text-lg">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.path;

              return (
                <li key={index} className="relative">
                  {item.isNew ? (
                    // Highlighted pill with a "New" badge (design: 3.jpg)
                    <button
                      onClick={() => handleNavigate(item.path)}
                      className={`relative px-4 py-1.5 rounded-full border text-black transition-all duration-300 ${
                        isActive
                          ? "bg-[#FCE38A] border-[#F5C518]"
                          : "bg-[#FEF1B8] border-[#FBE08A] hover:bg-[#FCE38A]"
                      }`}
                    >
                      {item.label}
                      <span className="absolute -top-2.5 right-3 rounded-full bg-[#F5C518] px-1.5 py-[1px] text-[9px] font-semibold leading-tight text-black shadow-sm">
                        New
                        {/* Three short rays fanning out from the badge's top-right corner */}
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 16 16"
                          className="absolute -top-3 -right-3 h-4 w-4 text-[#F5C518] pointer-events-none"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        >
                          <path d="M4.5 7.5 L5.5 2.5" />
                          <path d="M7.5 9 L11.5 5" />
                          <path d="M8.5 12 L13.5 11" />
                        </svg>
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleNavigate(item.path)}
                      className={`transition-all duration-300 ${
                        isActive ? "text-black" : "text-gray-800 hover:text-black"
                      }`}
                    >
                      {item.label}
                    </button>
                  )}

                  {/* Active underline (the pill marks its own active state) */}
                  {isActive && !item.isNew && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute -bottom-2 left-0 right-0 h-[2px] bg-black rounded-full"
                    />
                  )}
                </li>
              );
            })}
          </ul>

          {/* RIGHT SIDE */}
          <div className="hidden lg:flex items-center gap-3">
            {hasToken ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/dashboard/bizpoleone")}
                  className="px-5 xl:px-6 py-2.5 rounded-full text-sm xl:text-base font-medium shadow-md bg-black text-white"
                >
                  Dashboard →
                </motion.button>
                <ProfileMenu />
              </>
            ) : (
              <>
                {/* Sign In */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSignin(true)}
                  className="px-5 py-2.5 rounded-full text-sm xl:text-base font-medium text-gray-700 hover:text-black"
                >
                  Sign In
                </motion.button>

                {/* CTA */}
                <motion.button
                  whileHover={{ scale: 1.07 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/startbusiness")}
                  className="px-5 xl:px-7 py-2.5 xl:py-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black text-sm xl:text-base font-semibold shadow-lg"
                >
                  Get Started Business
                </motion.button>
              </>
            )}
          </div>

          {/* MOBILE: profile (when signed in) + menu button */}
          <div className="lg:hidden flex items-center gap-3">
            {hasToken && <ProfileMenu />}
            <button
              className="text-black"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden absolute left-3 right-3 top-full rounded-2xl bg-white shadow-xl border border-gray-200"
            >
              <ul className="flex flex-col p-6 space-y-5 text-gray-800">
                {navItems.map((item, index) => (
                  <li key={index}>
                    <button
                      onClick={() => handleNavigate(item.path)}
                      className={`w-full text-left text-base sm:text-lg font-medium hover:text-black transition ${location.pathname === item.path ? "text-black" : ""}`}
                    >
                      {item.label}
                      {item.isNew && (
                        <span className="ml-2 align-middle rounded-full bg-[#F5C518] px-2 py-[2px] text-[10px] font-semibold text-black">
                          New
                        </span>
                      )}
                    </button>
                  </li>
                ))}

                {/* MOBILE CTA */}
                {hasToken ? (
                  <button
                    onClick={() => {
                      navigate("/dashboard");
                      setMobileMenuOpen(false);
                    }}
                    className="mt-4 w-full py-3 rounded-full bg-black text-white font-medium"
                  >
                    Dashboard
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setShowSignin(true)}
                      className="w-full py-3 rounded-full border border-gray-300"
                    >
                      Sign In
                    </button>

                    <button
                      onClick={() => navigate("/startbusiness")}
                      className="w-full py-3 rounded-full bg-yellow-400 font-semibold"
                    >
                      Get Started
                    </button>
                  </>
                )}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* SIGNIN MODAL */}
      <SigninModal
        isOpen={showSignin}
        initialMode={signinMode}
        onClose={() => {
          setShowSignin(false);
          setSigninMode("signin");
        }}
      />
    </>
  );
}
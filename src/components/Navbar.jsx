import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";
import SigninModal from "./Modals/SigninModal";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSignin, setShowSignin] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  const navItems = [
    { label: "Services", path: "/services" },
    { label: "Product", path: "/products" },
    { label: "Bizpole One", path: "/bizpoleone" },
    { label: "Partners", path: "/partners" },
  ];

  // Auto-open Signin Modal
  useEffect(() => {
    if (location.state?.openSigninModal) {
      setShowSignin(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Token check
  useEffect(() => {
    const token = localStorage.getItem("token");
    setHasToken(!!token);
  }, []);

  // Referral tracking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("PartnerID", ref);
    }
  }, []);

  const handleNavigate = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* NAVBAR */}
      <nav className="relative z-50 w-full bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-3 flex items-center justify-between">
          {/* LOGO */}
          <div
            onClick={() => navigate("/")}
            className="cursor-pointer flex items-center"
          >
            <img
              src="/Images/logo.webp"
              alt="Bizpole Logo"
              className="h-10"
            />
          </div>

          {/* DESKTOP MENU */}
          <ul className="hidden md:flex items-center gap-8 font-medium text-sm">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.path;

              return (
                <li key={index} className="relative">
                  <button
                    onClick={() => handleNavigate(item.path)}
                    className={`transition-all duration-300 ${
                      isActive
                        ? "text-black"
                        : "text-gray-600 hover:text-black"
                    }`}
                  >
                    {item.label}
                  </button>

                  {/* Active underline */}
                  {isActive && (
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
          <div className="hidden md:flex items-center gap-3">
            {hasToken ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/dashboard/bizpoleone")}
                className="px-5 py-2 rounded-full bg-black text-white text-sm font-medium shadow-md"
              >
                Dashboard →
              </motion.button>
            ) : (
              <>
                {/* Sign In */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSignin(true)}
                  className="px-5 py-2 rounded-full text-sm font-medium text-gray-700 hover:text-black"
                >
                  Sign In
                </motion.button>

                {/* CTA */}
                <motion.button
                  whileHover={{ scale: 1.07 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/startbusiness")}
                  className="px-6 py-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-semibold shadow-lg"
                >
                  Get Started Business
                </motion.button>
              </>
            )}
          </div>

          {/* MOBILE BUTTON */}
          <button
            className="md:hidden text-black"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
          </button>
        </div>

        {/* MOBILE MENU */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="md:hidden mt-3 mx-3 rounded-2xl bg-white shadow-xl border border-gray-200"
            >
              <ul className="flex flex-col p-6 space-y-5 text-gray-800">
                {navItems.map((item, index) => (
                  <li key={index}>
                    <button
                      onClick={() => handleNavigate(item.path)}
                      className="w-full text-left text-lg font-medium hover:text-black transition"
                    >
                      {item.label}
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
        onClose={() => setShowSignin(false)}
      />
    </>
  );
}
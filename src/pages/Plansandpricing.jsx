import { useState, useEffect } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { getSecureItem } from "../utils/secureStorage";
import Services from "./Services";
import PackagePlans from "../components/PackagePlans";

const PlansAndPricing = () => {
  const location = useLocation();
  // Opened for one service (e.g. the dashboard's global search): show its
  // details on the individual-services tab, inside the dashboard.
  const openServiceId = location.state?.serviceId || null;
  const [activeTab, setActiveTab] = useState("services");
  useEffect(() => {
    if (openServiceId) setActiveTab("services");
  }, [location.key, openServiceId]);

  // The customer's business type (picked during onboarding) pre-filters packages.
  const preferredTypeId = getSecureItem("location")?.serviceTypeId || null;

  return (
    <div className="w-full min-h-[100%] bg-gradient-to-br from-gray-50 to-gray-100">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      {/* Full width of the dashboard content area — no max-width side gutters. */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="text-center mb-7">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#F3C625] mb-3"
          >
            The Right Plan for Your Business
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 text-sm max-w-lg mx-auto"
          >
            Pick a ready-made package that bundles the services your business needs, or choose individual services and pay only for what you use.
          </motion.p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8 md:mb-10">
          <div className="inline-flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setActiveTab("services")}
              className={`px-5 py-2 rounded-full text-sm font-semibold border transition-all ${activeTab === "services"
                ? "bg-[#FFFBEA] border-[#F3C625] text-black shadow-md"
                : "bg-white border-[#F3C625] text-gray-700 hover:text-gray-900"
                }`}
            >
              Choose individual service
            </button>
            <button
              onClick={() => setActiveTab("packages")}
              className={`px-5 py-2 rounded-full text-sm font-semibold border transition-all ${activeTab === "packages"
                ? "bg-gray-900 border-gray-900 text-white shadow-md"
                : "bg-white border-gray-300 text-gray-600 hover:text-gray-900"
                }`}
            >
              Package
            </button>
          </div>
        </div>

        {activeTab === "packages" && <PackagePlans preferredTypeId={preferredTypeId} />}

        {/* Individual services — Services loads its own data */}
        {activeTab === "services" && <Services key={location.key} embedded initialServiceId={openServiceId} />}
      </div>
    </div>
  );
};

export default PlansAndPricing;

import { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { getPackagesByServiceType, getAllServiceTypes } from "../api/ServiceType";
import { upsertQuote } from "../api/Quote";
import { motion, AnimatePresence } from "framer-motion";
// import { Check, Calendar, Sparkles, ArrowRight } from "lucide-react";
import { Check } from "lucide-react";
import { setSecureItem, getSecureItem } from "../utils/secureStorage";

const PlansAndPricing = () => {
  const [activeTab, setActiveTab] = useState("packages");
  const navigate = useNavigate();
  // const [selectedServices, setSelectedServices] = useState([]);

  const [packages, setPackages] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  // Add this state near your other useState calls
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [selectedServicesMap, setSelectedServicesMap] = useState({});

  // 🔹 Load service type from local storage
  useEffect(() => {
    const loc = getSecureItem("location");
    console.log('Loaded location from storage:', loc);
    if (loc && loc.serviceTypeId) {
      setSelectedTypeId(loc.serviceTypeId);
    } else {
      setSelectedTypeId("");
    }
  }, []);

  // 🔹 Handle package quote
  const handlePackageQuote = async (plan) => {
    try {
      const quoteData = {
        packageId: plan.id || plan.packageId || plan.PackageID,
        packageName: plan.name || plan.PackageName || plan.packageName,
        amount: plan.price || plan.YearlyMRP || plan.amount,
        type: "package",
        // Pass the package's services through as-is (with their real
        // ProfessionalFeeYearly/VendorFeeYearly/GovernmentFeeYearly columns) so
        // upsertQuote.js can compute real fees/GST instead of falling back to
        // hardcoded placeholders.
        services: Array.isArray(plan.services) ? plan.services : [],
      };

      quoteData.is_manual = 0;
      // Debug: log the payload to verify ServiceDetails
      console.log('Submitting package quote:', quoteData);
      const data = await upsertQuote(quoteData);
      if (data && data.QuoteID) {
        const user = getSecureItem("user");
        if (user) {
          user.QuoteID = data.QuoteID;
          setSecureItem("user", user);
        }
      }

      toast.dismiss();
      toast.success(`Package quote created! QuoteCode: ${data.QuoteCode}`);
      navigate("/dashboard/bizpoleone");
    } catch (err) {
      console.error("Error creating package quote:", err);
      toast.dismiss();
      toast.error("Failed to create package quote.");
    }
  };

  // 🔹 Toggle service selection
  // const toggleServiceSelection = (service) => {
  //   setSelectedServices((prev) =>
  //     prev.find((s) => s.ID === service.ID)
  //       ? prev.filter((s) => s.ID !== service.ID)
  //       : [...prev, service]
  //   );
  // };

  // 🔹 Create quote for services
  // const handleServicesQuote = async () => {
  //   if (selectedServices.length === 0) {
  //     toast.info("Please select at least one service");
  //     return;
  //   }

  //   try {
  //     const totalAmount = selectedServices.reduce(
  //       (sum, s) => sum + (s.Price || s.price || 0),
  //       0
  //     );

  //     const quoteData = {
  //       services: selectedServices.map((s) => ({
  //         serviceId: s.ID,
  //         serviceName: s.ServiceName,
  //         price: s.Price || s.price,
  //       })),
  //       amount: totalAmount,
  //       type: "individual",
  //     };

  //     quoteData.is_manual = 0;
  //     const data = await upsertQuote(quoteData);
  //     if (data && data.QuoteID) {
  //       const user = getSecureItem("user");
  //       if (user) {
  //         user.QuoteID = data.QuoteID;
  //         setSecureItem("user", user);
  //       }
  //     }

  //     toast.dismiss();
  //     toast.success(`Services quote created! QuoteCode: ${data.QuoteCode}`);
  //   } catch (err) {
  //     console.error("Error creating services quote:", err);
  //     toast.dismiss();
  //     toast.error("Failed to create services quote.");
  //   }
  // };

  const toggleService = (e, packageId, serviceId) => {
    e.stopPropagation(); // don't trigger card selection
    setSelectedServicesMap((prev) => {
      const current = new Set(prev[packageId] || []);
      if (current.has(serviceId)) {
        current.delete(serviceId);
      } else {
        current.add(serviceId);
      }
      return { ...prev, [packageId]: current };
    });
  };

  // 🔹 Fetch business types
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const types = await getAllServiceTypes();
        setBusinessTypes(Array.isArray(types) ? types : []);
      } catch {
        setBusinessTypes([]);
      }
    };
    fetchTypes();
  }, []);

  // 🔹 Fetch packages and services - FIXED VERSION
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get serviceTypeId from localStorage or use default
        const loc = getSecureItem("location");
        let serviceTypeId = loc?.serviceTypeId || loc?.type || 29;

        console.log('Fetching data for serviceTypeId:', serviceTypeId);

        if (!serviceTypeId) {
          console.warn('No serviceTypeId found');
          setPackages([]);
          setServices([]);
          setLoading(false);
          return;
        }

        const data = await getPackagesByServiceType(serviceTypeId);
        console.log('API Response:', data);

        // Handle different response structures
        let packagesArr = [];

        if (Array.isArray(data)) {
          packagesArr = data;
        } else if (data && Array.isArray(data.data)) {
          packagesArr = data.data;
        } else if (data && data.packages) {
          packagesArr = data.packages;
        } else if (data && data.data && Array.isArray(data.data.packages)) {
          packagesArr = data.data.packages;
        }

        console.log('Processed packages:', packagesArr);
        setPackages(packagesArr);

        // Extract services from packages
        const allServices = packagesArr.reduce((acc, pkg) => {
          if (pkg.services && Array.isArray(pkg.services)) {
            pkg.services.forEach((service) => {
              if (!acc.find((s) => s.ID === service.ID)) acc.push(service);
            });
          }
          return acc;
        }, []);

        setServices(allServices);
        console.log('Extracted services:', allServices);

      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load pricing information");
        setPackages([]);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    if (selectedTypeId !== null) {
      fetchData();
    }
  }, [selectedTypeId]);

  // 🔹 Calculate total selected services
  // const calculateTotal = () =>
  //   selectedServices.reduce(
  //     (sum, s) => sum + (s.Price || s.price || 0),
  //     0
  //   );

  // 🔹 Switch between tabs (navigate for services)
  const handleTabClick = (tab) => {
    if (tab === "services") {
      navigate("/services");
    } else {
      setActiveTab(tab);
    }
  };

  // 🔹 Render package cards with better error handling
  // 🔹 Render package cards - compact, no black fill, border-highlight for selection
  const renderPackageCard = (plan, index) => {
    const packageId = plan.PackageID || plan.id || plan.packageId || index;
    const packageName = plan.PackageName || plan.name || plan.packageName || "Unnamed Package";
    const price = plan.YearlyFinalAmount || plan.YearlyMRP || plan.price || plan.amount || 0;
    const description = plan.Description || "No description available";
    const planServices = plan.services || [];
    const discountPercent = plan.DiscountPercent || plan.discount || null;
    const userLimit = plan.UserLimit || "Unlimited users";
    const billingPeriod = plan.BillingPeriod || "Annual";
    const audience = plan.TargetAudience || plan.audience || null;

    const isSelected = selectedPackageId === packageId;

    return (
      <motion.div
        key={packageId}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08 }}
        whileHover={{ scale: 1.02, y: -4 }}
        onClick={() => setSelectedPackageId(packageId)}
        className={`relative rounded-2xl p-6 border cursor-pointer flex flex-col h-full min-h-[300px] transition-all duration-200 bg-white text-gray-900 shadow-sm hover:shadow-md  ${isSelected
            ? "border-[#F3C625] border-2 shadow-md"
            : "border-gray-200 hover:border-[#F3C625]/60"
          }`}
      >
        {/* badges */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-gray-50 border border-gray-200 text-gray-500">
            {userLimit}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-amber-50 border border-[#F3C625]/50 text-gray-600">
            {billingPeriod}
          </span>
        </div>

        <h3 className="text-base font-semibold mb-1.5">{packageName}</h3>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl font-bold">₹{price}</span>
          {discountPercent && (
            <span className="bg-gray-800 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
              -{discountPercent}%
            </span>
          )}
        </div>

        <p className="text-xs mb-3 leading-snug text-gray-500">{description}</p>

        {audience && <p className="text-xs font-semibold mb-2">{audience}</p>}

        <ul className="space-y-2 mb-5">
          {planServices.slice(0, 5).map((service, idx) => {
            const serviceId = service.ID || idx;
            const isChecked = selectedServicesMap[packageId]?.has(serviceId);
            return (
              <li
                key={serviceId}
                onClick={(e) => toggleService(e, packageId, serviceId)}
                className="flex items-center gap-2 text-xs cursor-pointer"
              >
                <span
                  className={`flex items-center justify-center w-3.5 h-3.5 rounded flex-shrink-0 border ${isChecked ? "bg-[#F3C625] border-[#F3C625]" : "border-gray-300 bg-gray-50"
                    }`}
                >
                  {isChecked && <Check size={9} className="text-black" strokeWidth={3} />}
                </span>
                <span className="text-gray-700">
                  {service.ServiceName || service.name || "Unnamed Service"}
                </span>
              </li>
            );
          })}
          {planServices.length > 4 && (
            <li className="text-[11px] pl-5 text-gray-400">
              +{planServices.length - 4} more
            </li>
          )}
        </ul>

        {/* CTA — pinned to bottom */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePackageQuote(plan);
          }}
          className="w-full mt-auto py-2.5 rounded-full text-sm font-semibold bg-[#F3C625] hover:bg-[#d4ab1f] text-black transition-colors"
        >
          Get Quote
        </button>
      </motion.div>
    );
  };

  return (
    <div className="w-full min-h-[100%] bg-gradient-to-br from-gray-50 to-gray-100">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            Choose Your Perfect <span className="text-[#F3C625]">Plan</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-600 text-md max-w-2xl mx-auto"
          >
            Select from our comprehensive packages or build your own custom
            solution with individual services
          </motion.p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="rounded-full p-1 inline-flex gap-2">
            <button
              onClick={() => handleTabClick("packages")}
              className={`px-8 py-3 rounded-full font-semibold transition-all ${activeTab === "packages"
                ? "bg-gray-900 text-white shadow-md"
                : "text-gray-600 hover:text-gray-900 border border-gray-300"
                }`}
            >
              Package
            </button>

            <button
              onClick={() => handleTabClick("services")}
              className={`px-8 py-3 rounded-full font-semibold transition-all border ${activeTab === "services"
                ? "text-black shadow-md border-[#F3C625] bg-[#FFFBEA]"
                : "text-gray-600 hover:text-gray-900 border-[#F3C625]"
                }`}
            >
              Choose individual service
            </button>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#F3C625]"></div>
            <p className="mt-4 text-gray-600">Loading options...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-red-500 text-lg">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-[#F3C625] text-black px-6 py-2 rounded-lg font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Packages Content */}
        {!loading && !error && (
          <AnimatePresence mode="wait">
            {activeTab === "packages" && (
              <motion.div
                key="packages"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {packages.length === 0 ? (
                  <div className="text-center py-20 text-gray-500">
                    No packages available for your business type.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {packages.map((plan, index) => renderPackageCard(plan, index))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default PlansAndPricing;

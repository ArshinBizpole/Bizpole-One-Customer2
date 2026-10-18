import { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLocation, useNavigate } from "react-router-dom";
import { getPackagesByServiceType, getAllServiceTypes } from "../api/ServiceType";
import { upsertQuote } from "../api/Quote";
import { motion, AnimatePresence } from "framer-motion";
// import { Check, Calendar, Sparkles, ArrowRight } from "lucide-react";
import { Check, X } from "lucide-react";
import { setSecureItem, getSecureItem } from "../utils/secureStorage";
import Services from "./Services";

const PlansAndPricing = () => {
  const location = useLocation();
  // Opened for one service (e.g. the dashboard's global search): show its
  // details on the individual-services tab, inside the dashboard.
  const openServiceId = location.state?.serviceId || null;
  const [activeTab, setActiveTab] = useState(openServiceId ? "services" : "packages");
  useEffect(() => {
    if (openServiceId) setActiveTab("services");
  }, [location.key, openServiceId]);
  const navigate = useNavigate();
  // const [selectedServices, setSelectedServices] = useState([]);

  const [packages, setPackages] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  // Packages the user has multi-selected (packageId -> full plan object), for bundled "Request Quote"
  const [selectedPackages, setSelectedPackages] = useState({});
  const [packageCartOpen, setPackageCartOpen] = useState(false);
  const [requestingPackages, setRequestingPackages] = useState(false);
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

  // 🔹 Submit a single package as a quote (the backend stores one PackageID per quote row,
  // so bundling N selected packages means N separate upsertQuote calls, not one combined quote).
  const submitPackageQuote = (plan) => {
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
      is_manual: 0,
    };
    return upsertQuote(quoteData);
  };

  // 🔹 Toggle a package in/out of the multi-select cart
  const togglePackageSelect = (plan, packageId) => {
    setSelectedPackages((prev) => {
      const next = { ...prev };
      if (next[packageId]) {
        delete next[packageId];
      } else {
        next[packageId] = plan;
      }
      return next;
    });
  };

  const removeSelectedPackage = (packageId) => {
    setSelectedPackages((prev) => {
      const next = { ...prev };
      delete next[packageId];
      return next;
    });
  };

  // 🔹 Request quotes for every selected package at once
  const handleRequestSelectedPackages = async () => {
    const plans = Object.values(selectedPackages);
    if (plans.length === 0) return;

    setRequestingPackages(true);
    try {
      for (const plan of plans) {
        const data = await submitPackageQuote(plan);
        if (data?.QuoteID) {
          const user = getSecureItem("user");
          if (user) {
            user.QuoteID = data.QuoteID;
            setSecureItem("user", user);
          }
        }
      }

      toast.dismiss();
      toast.success(`${plans.length} package quote${plans.length > 1 ? "s" : ""} created successfully!`);
      setSelectedPackages({});
      setPackageCartOpen(false);
      navigate("/dashboard/bizpoleone");
    } catch (err) {
      console.error("Error creating package quotes:", err);
      toast.dismiss();
      toast.error("Failed to create one or more package quotes. Please try again.");
    } finally {
      setRequestingPackages(false);
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

  // 🔹 Switch between tabs
  const handleTabClick = (tab) => {
    setActiveTab(tab);
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

    const isSelected = !!selectedPackages[packageId];

    return (
      <motion.div
        key={packageId}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08 }}
        whileHover={{ scale: 1.02, y: -4 }}
        onClick={() => togglePackageSelect(plan, packageId)}
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
            togglePackageSelect(plan, packageId);
          }}
          className={`w-full mt-auto py-2.5 rounded-full text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${isSelected
            ? "bg-gray-900 text-white hover:bg-gray-800"
            : "bg-[#F3C625] hover:bg-[#d4ab1f] text-black"
            }`}
        >
          {isSelected && <Check size={14} strokeWidth={3} />}
          {isSelected ? "Selected" : "Select Package"}
        </button>
      </motion.div>
    );
  };

  return (
    <div className="w-full min-h-[100%] bg-gradient-to-br from-gray-50 to-gray-100">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      {/* Full width of the dashboard content area — no max-width side gutters. */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="text-center mb-8 md:mb-12">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            Choose Your Perfect <span className="text-[#F3C625]">Plan</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-600 text-sm sm:text-base max-w-2xl mx-auto"
          >
            Select from our comprehensive packages or build your own custom
            solution with individual services
          </motion.p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8 md:mb-12">
          <div className="rounded-full p-1 inline-flex flex-wrap justify-center gap-2">
            <button
              onClick={() => handleTabClick("packages")}
              className={`px-5 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base rounded-full font-semibold transition-all ${activeTab === "packages"
                ? "bg-gray-900 text-white shadow-md"
                : "text-gray-600 hover:text-gray-900 border border-gray-300"
                }`}
            >
              Package
            </button>

            <button
              onClick={() => handleTabClick("services")}
              className={`px-5 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base rounded-full font-semibold transition-all border ${activeTab === "services"
                ? "text-black shadow-md border-[#F3C625] bg-[#FFFBEA]"
                : "text-gray-600 hover:text-gray-900 border-[#F3C625]"
                }`}
            >
              Choose individual service
            </button>
          </div>
        </div>

        {/* Individual services — Services loads its own data, so it doesn't wait on the packages fetch */}
        {activeTab === "services" && <Services key={location.key} embedded initialServiceId={openServiceId} />}

        {/* Loading / Error */}
        {activeTab === "packages" && loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#F3C625]"></div>
            <p className="mt-4 text-gray-600">Loading options...</p>
          </div>
        )}

        {activeTab === "packages" && error && (
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {packages.map((plan, index) => renderPackageCard(plan, index))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Floating multi-select cart for packages — mirrors the individual-services selection UX */}
      {Object.keys(selectedPackages).length > 0 && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 1000 }}>
          <button
            onClick={() => setPackageCartOpen((o) => !o)}
            className="bg-[#F3C625] hover:bg-[#d4ab1f] py-2 px-4 text-black rounded-full flex items-center justify-center shadow-lg text-sm relative"
          >
            <span className="font-normal">Selected Packages   </span>
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[24px] text-center">
              {Object.keys(selectedPackages).length}
            </span>
          </button>

          {packageCartOpen && (
            <div className="bg-white rounded-2xl shadow-2xl p-5 mt-3 min-w-[320px] max-w-xs border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-lg">Selected Packages</h3>
                <button onClick={() => setPackageCartOpen(false)} className="text-gray-400 hover:text-gray-700">
                  <X size={16} />
                </button>
              </div>
              <ul className="divide-y divide-gray-100 mb-3">
                {Object.entries(selectedPackages).map(([id, plan]) => {
                  const name = plan.PackageName || plan.name || plan.packageName || `Package #${id}`;
                  const price = plan.YearlyFinalAmount || plan.YearlyMRP || plan.price || plan.amount || 0;
                  return (
                    <li key={id} className="py-2 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">{name}</div>
                        <div className="text-xs text-gray-500">₹{price}</div>
                      </div>
                      <button onClick={() => removeSelectedPackage(id)} className="text-red-400 hover:text-red-600 ml-2">
                        <X size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between border-t pt-3 mt-2">
                <span className="font-semibold text-gray-700">Total</span>
                <span className="font-bold text-green-700">
                  ₹{Object.values(selectedPackages)
                    .reduce((sum, plan) => sum + Number(plan.YearlyFinalAmount || plan.YearlyMRP || plan.price || plan.amount || 0), 0)
                    .toLocaleString("en-IN")}
                </span>
              </div>
              <button
                disabled={requestingPackages}
                onClick={handleRequestSelectedPackages}
                className={`w-full mt-4 px-4 py-2 rounded-xl shadow-md font-semibold text-black transition-all duration-300 ${requestingPackages
                  ? "bg-gray-200 cursor-not-allowed"
                  : "bg-gradient-to-r from-yellow-400 to-yellow-500 hover:shadow-xl"
                  }`}
              >
                {requestingPackages
                  ? "Requesting..."
                  : `Request Quote${Object.keys(selectedPackages).length > 1 ? "s" : ""}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlansAndPricing;

import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState, useContext } from "react";
import { CartContext } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import { upsertQuote } from "../api/Quote";
import { getSecureItem } from "../utils/secureStorage";
import CryptoJS from "crypto-js";
import ServicesApi from "../api/ServicesApi";
import axios from "../api/axiosInstance";
import { fetchFranchiseeGstInfo, calcGstAmount, splitGst } from "../utils/gstCalc";
import { motion, AnimatePresence } from "framer-motion";
import SigninModal from "../components/Modals/SigninModal";
import { Building2, FileText, Scale, CheckCircle2, Wallet, Globe2, Tag, Sparkles, Briefcase, Receipt, FileCheck2, DollarSign, ShoppingCart, MapPin, ArrowRight, X, Loader2 } from "lucide-react";
// Icons
const IconSearch = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const IconFilter = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
  </svg>
);
const IconChevronDown = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);
const IconChevronUp = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);
const IconArrowRight = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);
const IconStar = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);
const IconLocation = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconGrid = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const CATEGORY_ICON_MAP = {
  "IPR": Scale,
  "Business Registrations": Building2,
  "Compliance Services": CheckCircle2,
  "677": Tag,
  "drop shopping": Globe2,
  "GST TEST CAT": FileText,
  "mail": FileText,
  "pf": Wallet,
  "Project Report": FileText,
};

const CATEGORY_KEYWORD_MAP = [
  { match: /incorporation/i, icon: Briefcase },
  { match: /taxation|tax/i, icon: Receipt },
  { match: /legal/i, icon: Scale },
  { match: /compliance/i, icon: FileCheck2 },
  { match: /finance/i, icon: DollarSign },
  { match: /trade/i, icon: Globe2 },
];

const getCategoryIcon = (categoryName) => {
  if (CATEGORY_ICON_MAP[categoryName]) return CATEGORY_ICON_MAP[categoryName];
  const found = CATEGORY_KEYWORD_MAP.find(({ match }) => match.test(categoryName || ""));
  return found ? found.icon : Tag;
};

import { getAllStates } from "../api/States";

const buildQuotePreviewUrl = (quoteId) => {
  const secret = import.meta.env.VITE_QUOTE_LINK_SECRET || "q3!9fKs7@pLzXr84$nmYtB!cVZdQ3";
  const encrypted = CryptoJS.AES.encrypt(String(quoteId), secret).toString();
  return `${import.meta.env.VITE_CLIENT_BASE_URL}/quotes/saved-preview/${encodeURIComponent(encrypted)}`;
};

const ServiceCard = ({ service, onLearnMore, isSelected, onSelect, price, onSelectState, stateId, setShowSigninModal, navigate }) => {
  const features = service.Features || [];
  const categoryName = service.Category?.CategoryName || service.CategoryName;
  // API descriptions sometimes come wrapped in literal quote characters — strip them for display
  const description = (service.description || service.Description || "").trim().replace(/^["']+|["']+$/g, "").trim();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
      className={`relative rounded-2xl border-2 transition-all duration-300 overflow-hidden flex flex-col ${isSelected
        ? "border-[#F3C625] bg-[#FFFCF0]"
        : "bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200"
        }`}
    >
      {/* Popular Badge */}
      {service.IsPopular && (
        <div className="absolute top-4 right-4 bg-white shadow-sm text-gray-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-gray-100 z-10">
          <IconStar /> POPULAR
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-[#F3C625] flex items-center justify-center text-xl flex-shrink-0">
            {service.Icon || "⚡"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-gray-900 text-base leading-tight">{service.ServiceName}</h3>
              {isSelected && (
                <div className="w-6 h-6 bg-[#F3C625] rounded-full flex items-center justify-center flex-shrink-0">
                  <IconCheck />
                </div>
              )}
            </div>
            {categoryName && (
              <span className="inline-block mt-1 text-[10px] font-semibold text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded-full">
                {categoryName}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">
          {description || "Professional service tailored to meet your specific requirements."}
        </p>

        {/* Features */}
        {features.length > 0 && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-4">
            {features.slice(0, 4).map((feat, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSelected ? "bg-[#F3C625]" : "bg-gray-300"}`} />
                <span className="truncate">{feat}</span>
              </div>
            ))}
          </div>
        )}

        {/* Know More */}
        <button
          onClick={() => onLearnMore(service.ServiceID)}
          className="flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-[#F3C625] transition-colors mb-4 border border-gray-200 hover:border-[#F3C625] rounded-xl px-3 py-2.5 w-full bg-white"
        >
          <svg className="w-4 h-4 text-gray-400 group-hover:text-[#F3C625]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
          </svg>
          Know More
          <span className="inline-block">→</span>
        </button>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-100">
          {!stateId ? (
            <div className="flex-1 flex items-center gap-2">
              <button
                onClick={onSelectState}
                className="flex-1 flex items-center gap-2 text-xs bg-[#FDF4D6] hover:bg-[#fbecc0] transition-colors rounded-xl px-3 py-2.5 min-w-0"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <IconLocation />
                </div>
                <div className="flex flex-col items-start min-w-0 leading-tight">
                  <span className="font-bold text-gray-900 text-xs truncate">Select Your State</span>
                  <span className="text-gray-400 text-[10px]">To view pricing</span>
                </div>
              </button>

              <motion.button
                onClick={onSelectState}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex-shrink-0 px-4 py-2.5 rounded-xl shadow-md hover:shadow-xl font-semibold text-sm bg-[#F3C625] text-white hover:bg-[#e0b420]"
              >
                Select
              </motion.button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                {price ? (
                  <div className="flex flex-col justify-left text-xs">
                    <div className="flex justify-left text-lg font-bold text-green-700 mb-1">
                      <span className="mr-1">₹</span>
                      {price.TotalFee}
                    </div>
                    <span className="text-xs text-gray-400">Total Fee (All Inclusive)</span>
                  </div>
                ) : (
                  <span className="text-xs text-red-400 font-medium">
                    Not available in this state
                  </span>
                )}
                <button
                  className="text-xs text-black underline flex-shrink-0"
                  onClick={onSelectState}
                >
                  Change State
                </button>
              </div>

              {/* Request Quote + Select together */}
              <div className="flex items-center gap-2">
                <button
                  className={`flex-1 flex items-center justify-center text-xs font-semibold rounded-lg px-3 py-2 border transition-colors ${!stateId || !price
                    ? "border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed"
                    : "border-yellow-400 text-black hover:bg-yellow-500"
                    }`}
                  style={{ minHeight: 36 }}
                  type="button"
                  disabled={!stateId || !price}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!stateId || !price) return;
                    const token = localStorage.getItem('token');
                    if (!token) {
                      setShowSigninModal(true);
                      return;
                    }
                    try {
                      const user = getSecureItem("user");
                      const selectedCompany = getSecureItem("selectedCompany");
                      const franchiseeId = user?.FranchiseeId || user?.FranchiseeID || 1;
                      const employeeId = user?.EmployeeID || 9;
                      const employeeName = user?.FirstName || "admin";
                      const customerId = user?.CustomerID || 2;
                      const customerName = user?.FirstName ? `${user.FirstName} ${user.LastName || ''}`.trim() : "John Doe";
                      const stateName = selectedCompany?.State || "";
                      const companyName = selectedCompany?.CompanyName || "";
                      const companyId = selectedCompany?.CompanyID || null;
                      const priceObj = price || {
                        ProfessionalFee: 0,
                        VendorFee: 0,
                        GovtFee: 0,
                        ContractorFee: 0,
                        GSTPercent: 0,
                        GstAmount: 0,
                        CGST: 0,
                        SGST: 0,
                        IGST: 0,
                        Discount: 0,
                        Rounding: 0,
                        TotalFee: 0,
                        AdvanceAmount: 0
                      };
                      const professionalFee = Number(priceObj.ProfessionalFee ?? 0);
                      const vendorFee = Number(priceObj.VendorFee ?? 0);
                      const govtFee = Number(priceObj.GovernmentFee ?? 0);
                      const contractorFee = Number(priceObj.ContractFee ?? 0);
                      const discount = Number(priceObj.Discount ?? 0);
                      const rounding = Number(priceObj.Rounding ?? 0);

                      const { gstEligible, state: franchiseeState } = await fetchFranchiseeGstInfo(franchiseeId);
                      const gstAmount = calcGstAmount(professionalFee, vendorFee, gstEligible);
                      const { cgst, sgst, igst } = splitGst(gstAmount, franchiseeState, stateName);
                      const total = professionalFee + vendorFee + govtFee + contractorFee - discount + gstAmount;
                      const advanceAmount = Math.ceil(total * 0.3);

                      const serviceDetails = [
                        {
                          ServiceID: service?.ServiceID,
                          ItemName: service?.ServiceName,
                          ProfessionalFee: professionalFee,
                          VendorFee: vendorFee,
                          GovtFee: govtFee,
                          ContractorFee: contractorFee,
                          GSTPercent: gstEligible ? 18 : 0,
                          GstAmount: gstAmount,
                          CGST: cgst,
                          SGST: sgst,
                          IGST: igst,
                          Discount: discount,
                          Rounding: rounding,
                          Total: total,
                          AdvanceAmount: advanceAmount,
                          IsManual: 0,
                          IsIndividual: 1
                        }
                      ];
                      const payload = {
                        IsIndividual: 1,
                        IsMonthly: 0,
                        FranchiseeID: franchiseeId,
                        SelectedCompany: {
                          CompanyID: companyId,
                          CompanyName: companyName,
                          State: stateName
                        },
                        SelectedCustomer: {
                          CustomerID: customerId,
                          CustomerName: customerName
                        },
                        QuoteCRE: {
                          EmployeeID: employeeId,
                          EmployeeName: employeeName
                        },
                        SourceOfSale: "Website",
                        StateService: stateName,
                        Remarks: "",
                        QuoteStatus: "Draft",
                        IsDirect: 1,
                        ServiceDetails: serviceDetails,
                        SelectedServices: [service?.ServiceID],
                        SelectedServicePrices: { [service?.ServiceID]: priceObj },
                        MailQuoteCustomers: [
                          {
                            CustomerID: customerId,
                            CustomerName: customerName,
                            Email: user?.Email || ""
                          }
                        ],
                        PaymentType: 0,
                        EmployeeID: employeeId
                      };
                      payload.is_manual = 0;
                      await upsertQuote(payload);
                      toast.success("Requested quote");
                      navigate("/dashboard/bizpoleone");
                    } catch (err) {
                      toast.error("Failed to create quote. Please try again.", err);
                    }
                  }}
                >
                  Request Quote
                </button>

                <motion.button
                  onClick={() => {
                    if (!price) return;
                    onSelect(service.ServiceID);
                  }}
                  whileHover={price ? { scale: 1.03 } : undefined}
                  whileTap={price ? { scale: 0.97 } : undefined}
                  disabled={!price}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl font-semibold text-sm ${!price
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                    : isSelected
                      ? "bg-[#F3C625] text-black shadow-md hover:shadow-xl"
                      : "bg-[#F3C625] text-white hover:bg-[#e0b420] shadow-md hover:shadow-xl"
                    }`}
                >
                  {isSelected ? "Selected" : "Select"}
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const Services = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const { cart, addToCart, removeFromCart } = useContext(CartContext);
  // selectedServices is now derived from cart keys
  const selectedServices = Object.keys(cart).map(id => Number(id));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stateId, setStateId] = useState(() => localStorage.getItem("StateID"));
  const [bulkPrices, setBulkPrices] = useState({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [allStates, setAllStates] = useState([]);
  const [showSigninModal, setShowSigninModal] = useState(false);
  const [selectedStateForModal, setSelectedStateForModal] = useState("");
  const [statesLoading, setStatesLoading] = useState(false);
  const [proceedingToQuote, setProceedingToQuote] = useState(false);

  const navigate = useNavigate();

  // Fetch categories
  useEffect(() => {
    setCategoriesLoading(true);
    ServicesApi.getServiceCategories()
      .then((res) => setCategories(res.data || []))
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, []);

  // Fetch services
  useEffect(() => {
    setLoading(true);
    const updateAllServicesCache = (data) => {
      try {
        const prev = JSON.parse(localStorage.getItem("AllServicesCache") || "[]");
        // Merge new data with previous, avoiding duplicates
        const merged = [...prev];
        data.forEach(svc => {
          if (!merged.some(s => s.ServiceID === svc.ServiceID)) merged.push(svc);
        });
        localStorage.setItem("AllServicesCache", JSON.stringify(merged));
      } catch (err) { console.log(err); }
    };
    if (selectedCategory) {
      ServicesApi.getServicesByCategory(selectedCategory, { page, limit })
        .then((res) => {
          setServices(res.data || []);
          updateAllServicesCache(res.data || []);
          const total = res.total || 0;
          setTotalCount(total);
          setTotalPages(Math.max(1, Math.ceil(total / limit)));
        })
        .catch(() => { setServices([]); setTotalPages(1); })
        .finally(() => setLoading(false));
    } else {
      ServicesApi.getServices({ page, limit, filter })
        .then((res) => {
          setServices(res.data || []);
          updateAllServicesCache(res.data || []);
          setTotalPages(res.pagination?.totalPages || 1);
          setTotalCount(res.pagination?.total || res.data?.length || 0);
        })
        .catch(() => setServices([]))
        .finally(() => setLoading(false));
    }
  }, [page, limit, filter, selectedCategory]);



  // Modal is not shown automatically. Only open when user clicks select/change state.

  // Handle state selection in modal
  const handleStateModalSubmit = (e) => {
    e.preventDefault();
    if (selectedStateForModal) {
      localStorage.setItem("StateID", selectedStateForModal);
      setStateId(selectedStateForModal);
      setShowStateModal(false);
    }
  };

  // Open modal and fetch states if needed
  const openStateModal = () => {
    setShowStateModal(true);
    setSelectedStateForModal("");
    if (allStates.length === 0) {
      setStatesLoading(true);
      getAllStates()
        .then((states) => setAllStates(states || []))
        .catch(() => setAllStates([]))
        .finally(() => setStatesLoading(false));
    }
  };

  // Fetch bulk prices when services or stateId changes
  useEffect(() => {
    if (stateId && services.length > 0) {
      const serviceIds = services.map(s => s.ServiceID);
      setBulkLoading(true);
      axios.post("service-price-currency/bulk", {
        StateID: Number(stateId),
        ServiceIDs: serviceIds,
        isIndividual: 1
      })
        .then(res => {
          const priceMap = {};
          if (res.data && res.data.data) {
            res.data.data.forEach(item => {
              priceMap[item.ServiceID] = item;
            });
          }
          setBulkPrices(priceMap);
        })
        .catch(() => setBulkPrices({}))
        .finally(() => setBulkLoading(false));
    }
  }, [stateId, services]);

  const handleLearnMore = (serviceId) => {
    navigate(`/services/${serviceId}`, { state: { serviceId } });
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId === selectedCategory ? "" : categoryId);
    setPage(1);
  };

  const handleSelectService = (serviceId) => {
    if (selectedServices.includes(serviceId)) {
      removeFromCart(serviceId);
    } else {
      // Find the service and its price to add to cart
      const svc = services.find(s => s.ServiceID === serviceId);
      const price = bulkPrices[serviceId] || {};
      addToCart(serviceId, { ...price, ServiceName: svc?.ServiceName || svc?.Name });
    }
  };

  // No need to sync SelectedServices in localStorage; handled by CartContext

  // Helper to get price for a service
  const getBulkPrice = (serviceId) => {
    return bulkPrices[serviceId];
  };


  // Helper to change stateId (reuse modal)
  // const handleChangeState = () => {
  //   setShowStateModal(true);
  //   setSelectedStateForModal("");
  //   if (allStates.length === 0) {
  //     setStatesLoading(true);
  //     getAllStates()
  //       .then((states) => setAllStates(states || []))
  //       .catch(() => setAllStates([]))
  //       .finally(() => setStatesLoading(false));
  //   }
  // };

  // Store latest known prices for selected services in localStorage
  useEffect(() => {
    if (Object.keys(bulkPrices).length > 0) {
      try {
        const prev = JSON.parse(localStorage.getItem("SelectedServicePrices") || "{}") || {};
        const updated = { ...prev };
        Object.entries(bulkPrices).forEach(([sid, priceObj]) => {
          if (priceObj && priceObj.TotalFee) {
            updated[sid] = priceObj.TotalFee;
          }
        });
        localStorage.setItem("SelectedServicePrices", JSON.stringify(updated));
      } catch (err) { console.log(err); }
    }
  }, [bulkPrices]);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <SigninModal isOpen={showSigninModal} onClose={() => setShowSigninModal(false)} />
      <div className="min-h-screen bg-gray-50">

        {/* State selection modal */}
        {showStateModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 overflow-hidden">
              {/* Decorative corner glow */}
              <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-amber-50 to-transparent rounded-full" />

              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-[#F3C625] flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>

              {/* Heading */}
              <h2 className="text-3xl font-extrabold text-gray-900 mb-3">
                Where are you located?
              </h2>

              {/* Subtext */}
              <p className="text-gray-500 text-sm leading-relaxed">
                Where would you like to avail this service?<br />
                Please select your state to get accurate pricing.
              </p>
              <p className="text-amber-400 font-semibold text-sm mt-1 mb-6">
                Service availability and pricing may vary by location
              </p>

              <form onSubmit={handleStateModalSubmit}>
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Select your state <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedStateForModal}
                      onChange={e => setSelectedStateForModal(e.target.value)}
                      required
                      className="w-full appearance-none pl-4 pr-14 py-3.5 rounded-2xl border border-gray-200 text-sm text-gray-700 focus:ring-1 focus:ring-[#f7d761] focus:border-[#f7d761] outline-none disabled:opacity-60"
                      disabled={statesLoading}
                    >
                      <option value="">Choose your state</option>
                      {allStates.map((state) => (
                        <option key={state.id || state.StateID} value={state.id || state.StateID}>
                          {state.state_name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-[#F3C625] flex items-center justify-center pointer-events-none">
                      <IconChevronDown />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowStateModal(false)}
                    className="flex-1 px-6 py-3.5 border-2 border-gray-200 text-gray-900 text-sm font-bold rounded-2xl hover:border-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  // disabled={!!stateId}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedStateForModal}
                    className={`flex-1 px-6 py-3.5 text-sm font-bold rounded-2xl transition-colors ${selectedStateForModal
                      ? "bg-[#F3C625] text-gray-900 hover:bg-[#e0b420]"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                  >
                    Get Price
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Page Header */}
        <div className=" border-b border-gray-100">
          <div className="max-w-7xl mt-26 mb-18 mx-auto px-6 py-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-[#c9a700] text-xs font-semibold rounded-full mb-4 border border-amber-100">
              <IconStar /> Explore Our Services
            </div>
            <h1 className="text-4xl md:text-5xl font-bold  text-gray-900 mb-3">
              Choose Your Perfect Service
            </h1>
            <p className="text-gray-500 max-w-lg mx-auto text-sm">
              Professional business services tailored to help your company thrive in today's competitive market
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
          {/* Sidebar */}
          <motion.aside
            animate={{ width: sidebarOpen ? 240 : 0, opacity: sidebarOpen ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="flex-shrink-0 overflow-hidden"
          >
            <div className="w-60 bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sticky">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#F3C625] flex items-center justify-center">
                    <IconFilter />
                  </div>
                  <span className="font-bold text-gray-900 text-base">Filters</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <IconChevronUp />
                </button>
              </div>

              {/* Search */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-500 mb-2">Search Services</p>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type to search..."
                    value={filter}
                    onChange={(e) => { setFilter(e.target.value); setPage(1); }}
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-gray-100 border-none focus:ring-2 focus:ring-[#F3C625] outline-none transition-all placeholder:text-gray-400"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <IconSearch />
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Categories</p>
                <div className="space-y-1.5">
                  <button
                    onClick={() => handleCategoryChange("")}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${!selectedCategory
                      ? "bg-[#F3C625] text-white shadow-sm"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                  >
                    <Sparkles size={16} strokeWidth={2} />
                    All
                  </button>
                  {categoriesLoading ? (
                    <div className="text-xs text-gray-400 px-3 py-2">Loading…</div>
                  ) : (
                    categories.map((cat) => {
                      const CategoryIcon = getCategoryIcon(cat.CategoryName);
                      const isActive = selectedCategory === cat.CategoryID.toString();
                      return (
                        <button
                          key={cat.CategoryID}
                          onClick={() => handleCategoryChange(cat.CategoryID.toString())}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-left transition-all ${isActive
                            ? "bg-[#F3C625] text-white shadow-sm"
                            : "bg-gray-50 text-gray-500 hover:bg-gray-200"
                            }`}
                        >
                          <CategoryIcon size={16} strokeWidth={2} className="flex-shrink-0" />
                          {cat.CategoryName}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Your Selection */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart size={16} className="text-gray-700" strokeWidth={2} />
                  <span className="font-bold text-gray-900 text-sm">Your Selection</span>
                </div>

                {selectedServices.length === 0 ? (
                  <div className="flex flex-col items-center text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <ShoppingCart size={20} className="text-gray-400" strokeWidth={2} />
                    </div>
                    <p className="text-sm font-semibold text-gray-700">No services selected</p>
                    <p className="text-xs text-gray-400 mt-0.5">Select services to view here</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-56 overflow-y-auto mb-4">
                      {selectedServices.map(sid => {
                        let svc = services.find(s => s.ServiceID === sid);
                        if (!svc) {
                          try {
                            const allSvcs = JSON.parse(localStorage.getItem("AllServicesCache") || "[]");
                            svc = allSvcs.find(s => s.ServiceID === sid);
                          } catch (err) { console.log(err); }
                        }
                        const categoryName = svc?.Category?.CategoryName || svc?.CategoryName;
                        const CategoryIcon = getCategoryIcon(categoryName);

                        let price = bulkPrices[sid]?.TotalFee;
                        if (!price) {
                          try {
                            const priceCache = JSON.parse(localStorage.getItem("SelectedServicePrices") || "{}");
                            price = priceCache[sid];
                          } catch (error) { console.error("Error fetching services:", error); }
                        }

                        return (
                          <div key={sid} className="relative bg-[#FFFCF0] border border-amber-100 rounded-2xl p-3.5 pr-8">
                            <button
                              onClick={() => removeFromCart(sid)}
                              className="absolute top-3 right-3 text-red-400 hover:text-red-600"
                            >
                              <X size={14} strokeWidth={2.5} />
                            </button>
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-[#F3C625] flex items-center justify-center flex-shrink-0">
                                <CategoryIcon size={15} className="text-white" strokeWidth={2} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-gray-900 truncate" title={svc?.ServiceName}>
                                  {svc?.ServiceName || "Service"}
                                </p>
                                {categoryName && (
                                  <p className="text-xs text-gray-400">{categoryName}</p>
                                )}
                                {stateId && price && (
                                  <p className="text-sm font-extrabold text-gray-900 mt-1">
                                    ₹{typeof price === "object" ? price.TotalFee : price}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {!stateId ? (
                      <button
                        onClick={openStateModal}
                        className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-black bg-[#F3C625] hover:bg-[#e0b420] rounded-2xl px-2 py-3 whitespace-nowrap transition-colors"
                      >
                        <MapPin size={14} strokeWidth={2} className="flex-shrink-0" />
                        Select State to View Pricing
                      </button>
                    ) : (
                      <>
                        <div className="bg-gray-900 rounded-2xl px-4 py-3 mb-3">
                          <div className="flex justify-between items-center text-xs text-gray-400 mb-1.5">
                            <span>Subtotal</span>
                            <span>
                              ₹{selectedServices.reduce((sum, sid) => {
                                let price = bulkPrices[sid];
                                let value = 0;
                                if (price && typeof price === "object" && price.TotalFee) {
                                  value = parseFloat(price.TotalFee) || 0;
                                } else if (typeof price === "number" || typeof price === "string") {
                                  value = parseFloat(price) || 0;
                                } else {
                                  try {
                                    const priceCache = JSON.parse(localStorage.getItem("SelectedServicePrices") || "{}");
                                    value = parseFloat(priceCache[sid]) || 0;
                                  } catch (error) { console.error("Error fetching services:", error); }
                                }
                                return sum + value;
                              }, 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm font-bold text-white">
                            <span>Total</span>
                            <span className="text-[#F3C625]">
                              ₹{selectedServices.reduce((sum, sid) => {
                                let price = bulkPrices[sid];
                                let value = 0;
                                if (price && typeof price === "object" && price.TotalFee) {
                                  value = parseFloat(price.TotalFee) || 0;
                                } else if (typeof price === "number" || typeof price === "string") {
                                  value = parseFloat(price) || 0;
                                } else {
                                  try {
                                    const priceCache = JSON.parse(localStorage.getItem("SelectedServicePrices") || "{}");
                                    value = parseFloat(priceCache[sid]) || 0;
                                  } catch (error) { console.error("Error fetching services:", error); }
                                }
                                return sum + value;
                              }, 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        <button
                          className={`w-full flex items-center justify-center gap-2 text-sm font-bold rounded-2xl px-4 py-3 transition-colors ${proceedingToQuote
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "text-black bg-[#F3C625] hover:bg-[#e0b420]"
                            }`}
                          disabled={proceedingToQuote}
                          onClick={async () => {
                            const token = localStorage.getItem('token');
                            if (!token) {
                              setShowSigninModal(true);
                              return;
                            }
                            setProceedingToQuote(true);
                            // Open the tab synchronously, tied to this click, so the browser
                            // doesn't block it — then redirect it once the quote is ready below.
                            const previewTab = window.open("", "_blank");
                            if (previewTab) {
                              previewTab.document.write(
                                '<title>Loading your quote…</title><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;color:#666">Loading your quote…</body>'
                              );
                            }
                            try {
                              const user = getSecureItem("user");
                              const selectedCompany = getSecureItem("selectedCompany");
                              const franchiseeId = user?.FranchiseeId || user?.FranchiseeID || 1;
                              const employeeId = user?.EmployeeID || 9;
                              const employeeName = user?.FirstName || "admin";
                              const customerId = user?.CustomerID || 2;
                              const customerName = user?.FirstName ? `${user.FirstName} ${user.LastName || ''}`.trim() : "John Doe";
                              const stateName = selectedCompany?.State || "";
                              const companyName = selectedCompany?.CompanyName || "";
                              const companyId = selectedCompany?.CompanyID || null;

                              const selectedServiceIds = Object.keys(cart).map(Number);
                              const { gstEligible, state: franchiseeState } = await fetchFranchiseeGstInfo(franchiseeId);
                              const serviceDetails = selectedServiceIds.map(sid => {
                                let svc = services.find(s => s.ServiceID === sid);
                                if (!svc) {
                                  try {
                                    const allCache = JSON.parse(localStorage.getItem("AllServicesCache") || "[]");
                                    svc = allCache.find(s => s.ServiceID === sid);
                                  } catch (error) { console.error("Error fetching services:", error); }
                                }
                                const price = cart[sid] || {};
                                const professionalFee = Number(price.ProfessionalFee ?? 100);
                                const vendorFee = Number(price.VendorFee ?? 100);
                                const govtFee = Number(price.GovernmentFee ?? 100);
                                const contractorFee = Number(price.ContractFee ?? 100);
                                const discount = Number(price.Discount ?? 0);
                                const rounding = Number(price.Rounding ?? 0);
                                const gstAmount = calcGstAmount(professionalFee, vendorFee, gstEligible);
                                const { cgst, sgst, igst } = splitGst(gstAmount, franchiseeState, stateName);
                                const total = professionalFee + vendorFee + govtFee + contractorFee - discount + gstAmount;
                                const advanceAmount = Math.ceil(total * 0.3);
                                return {
                                  ServiceID: svc?.ServiceID,
                                  ItemName: svc?.ServiceName,
                                  ProfessionalFee: professionalFee,
                                  VendorFee: vendorFee,
                                  GovtFee: govtFee,
                                  ContractorFee: contractorFee,
                                  GSTPercent: gstEligible ? 18 : 0,
                                  GstAmount: gstAmount,
                                  CGST: cgst,
                                  SGST: sgst,
                                  IGST: igst,
                                  Discount: discount,
                                  Rounding: rounding,
                                  Total: total,
                                  AdvanceAmount: advanceAmount,
                                  IsManual: 0,
                                  IsIndividual: 1
                                };
                              });

                              const selectedServicePrices = {};
                              selectedServiceIds.forEach(sid => {
                                selectedServicePrices[sid] = cart[sid] || {};
                              });

                              const payload = {
                                IsIndividual: 1,
                                IsMonthly: 0,
                                FranchiseeID: franchiseeId,
                                SelectedCompany: { CompanyID: companyId, CompanyName: companyName, State: stateName },
                                SelectedCustomer: { CustomerID: customerId, CustomerName: customerName },
                                QuoteCRE: { EmployeeID: employeeId, EmployeeName: employeeName },
                                SourceOfSale: "Website",
                                StateService: stateName,
                                Remarks: "Generated from services page",
                                QuoteStatus: "Draft",
                                IsDirect: 1,
                                ServiceDetails: serviceDetails,
                                SelectedServices: selectedServiceIds,
                                SelectedServicePrices: selectedServicePrices,
                                MailQuoteCustomers: [{ CustomerID: customerId, CustomerName: customerName, Email: user?.Email || "" }],
                                PaymentType: 0,
                                EmployeeID: employeeId
                              };

                              payload.is_manual = 0;
                              const data = await upsertQuote(payload);
                              const quoteId = data?.QuoteID;
                              toast.success("Requested quote");
                              if (quoteId) {
                                const url = buildQuotePreviewUrl(quoteId);
                                if (previewTab) {
                                  previewTab.location.href = url;
                                } else {
                                  window.open(url, "_blank");
                                }
                              } else if (previewTab) {
                                previewTab.close();
                              }
                            } catch (err) {
                              if (previewTab) previewTab.close();
                              console.error("Error creating quote from cart:", err);
                              toast.error(err?.response?.data?.message || "Failed to create quote. Please try again.");
                            } finally {
                              setProceedingToQuote(false);
                            }
                          }}
                        >
                          {proceedingToQuote ? (
                            <>
                              <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              Proceed to Quote
                              <ArrowRight size={16} strokeWidth={2.5} />
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {!sidebarOpen && (
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl text-gray-600 hover:border-[#F3C625] hover:text-[#F3C625] transition-all"
                  >
                    <IconFilter /> Filters
                  </button>
                )}
                <div >
                  <p className="font-bold text-gray-900 text-sm">
                    {loading ? "Loading..." : `${totalCount} Services Available`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {selectedCategory
                      ? `In: ${categories.find(c => c.CategoryID.toString() === selectedCategory)?.CategoryName || "category"}`
                      : "across all categories"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(filter || selectedCategory) && (
                  <button
                    onClick={() => { setFilter(""); setSelectedCategory(""); setPage(1); }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
                <div className="text-xs text-amber-500 font-semibold flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                  <IconStar /> Popular picks
                </div>
              </div>
            </div>

            {/* Grid */}
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                          <div className="h-3 bg-gray-100 rounded w-1/3" />
                        </div>
                      </div>
                      <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-4/5 mb-4" />
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {[1, 2, 3, 4].map(j => <div key={j} className="h-3 bg-gray-100 rounded" />)}
                      </div>
                      <div className="h-10 bg-gray-100 rounded-xl" />
                    </div>
                  ))}
                </motion.div>
              ) : services.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-24 bg-white rounded-2xl border border-gray-100"
                >
                  <div className="text-5xl mb-4">🔍</div>
                  <h3 className="text-xl font-bold text-gray-700 mb-2">No services found</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    {filter || selectedCategory ? "Try adjusting your filters" : "No services available"}
                  </p>
                  {(filter || selectedCategory) && (
                    <button
                      onClick={() => { setFilter(""); setSelectedCategory(""); setPage(1); }}
                      className="px-5 py-2 bg-[#F3C625] text-white rounded-xl font-semibold text-sm hover:bg-[#e0b420] transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div key="grid" layout>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {services.map((service) => (
                      <ServiceCard
                        key={service.ServiceID}
                        service={service}
                        onLearnMore={handleLearnMore}
                        isSelected={selectedServices.includes(service.ServiceID)}
                        onSelect={handleSelectService}
                        price={getBulkPrice(service.ServiceID)}
                        onSelectState={openStateModal}
                        stateId={stateId}
                        bulkLoading={bulkLoading}
                        setShowSigninModal={setShowSigninModal}
                        navigate={navigate}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 disabled:opacity-40 hover:border-[#F3C625] hover:text-[#F3C625] transition-all"
                      >
                        ← Previous
                      </button>
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNum = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPage(pageNum)}
                              className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${page === pageNum
                                ? "bg-[#F3C625] text-white shadow-sm"
                                : "bg-white text-gray-600 border border-gray-200 hover:border-[#F3C625]"
                                }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 disabled:opacity-40 hover:border-[#F3C625] hover:text-[#F3C625] transition-all"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
};

export default Services;
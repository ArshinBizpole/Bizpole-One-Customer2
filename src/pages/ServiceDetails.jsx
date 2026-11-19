import { useEffect, useState, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getServiceById, getServicePrice, getServiceExtras } from "../api/ServicesApi";
import { upsertQuote } from "../api/Quote";
import { getSecureItem } from "../utils/secureStorage";
import { selectSignedInCompany } from "../utils/signedInCompany";
import { fetchFranchiseeGstInfo, calcGstAmount, splitGst } from "../utils/gstCalc";
import { proceedToQuote } from "../utils/proceedToQuote";
import { goToNewCustomerFlow } from "../utils/newCustomerFlow";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAllStates } from "../api/States";
import SigninModal from "../components/Modals/SigninModal";
import { motion, AnimatePresence } from "framer-motion";
import { CartContext } from "../context/CartContext";
import {
  FaBuilding,
  FaCheckCircle,
  FaBalanceScale,
  FaClipboardCheck,
  FaArrowRight,
  FaArrowLeft,
  FaFolderOpen,
  FaCogs,
  FaRupeeSign,
  // FaPlus,
  FaCheck,
  FaPhoneAlt,
  FaRegClock
} from "react-icons/fa";
// import { HiOutlineLocationMarker, HiOutlineCheckCircle } from "react-icons/hi";
import StateSelect from "../components/StateSelect";
import ServiceEnquiryForm from "../components/ServiceEnquiryForm";
const parsePriceResponse = (res) => {
  if (Array.isArray(res?.data)) return res.data[0] || null;
  if (typeof res?.data === 'object') return res.data;
  return res?.data?.Price || null;
};

// embedded: shown inside another page (e.g. Pricing & Plans) instead of the /services/:id route —
// takes serviceId as a prop, shows a Back button, and drops the public-site layout and Get Started CTA.
const ServiceDetails = ({ serviceId, embedded = false, onBack }) => {
  const navigate = useNavigate();
  const { id: routeServiceId } = useParams();
  const SERVICE_ID = serviceId ?? routeServiceId;

  // State management
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stateId, setStateId] = useState(() => {
    return localStorage.getItem("StateID") || "";
  });
  const [price, setPrice] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [allStates, setAllStates] = useState([]);
  const [statesLoading, setStatesLoading] = useState(false);
  // Set when "Add to Selection" is clicked before a state is chosen — the
  // state dropdown opens and the service is added once a state is picked.
  const [pendingAdd, setPendingAdd] = useState(false);
  const stateBarRef = useRef(null);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const stateSelectRef = useRef(null);
  const [activeTab, setActiveTab] = useState("eligibility");

  const { cart, addToCart, clearCart } = useContext(CartContext);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [showSigninModal, setShowSigninModal] = useState(false);

  // Fetch service details
  useEffect(() => {
    if (!SERVICE_ID) return;
    const fetchService = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getServiceById({ ServiceId: SERVICE_ID });
        console.log("service", res?.data);
        setService(res?.data || null);
      } catch (err) {
        setError("Failed to fetch service details.", err);
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [SERVICE_ID]);

  // "What You Get (Deliverables)" from the CRM's Service → Proposal step
  const [whatYouGet, setWhatYouGet] = useState([]);
  useEffect(() => {
    if (!SERVICE_ID) return;
    let stale = false;
    setWhatYouGet([]);
    getServiceExtras(SERVICE_ID)
      .then((extras) => { if (!stale) setWhatYouGet(Array.isArray(extras?.whatYouGet) ? extras.whatYouGet : []); })
      .catch(() => {});
    return () => { stale = true; };
  }, [SERVICE_ID]);

  // Fetch price if state and service are available
  useEffect(() => {
    const fetchPrice = async () => {
      if (!stateId || !service?.ServiceID) {
        setPrice(null);
        return;
      }
      setPriceLoading(true);
      try {
        const res = await getServicePrice({
          ServiceId: service.ServiceID,
          StateId: stateId
        });
        setPrice(parsePriceResponse(res));
      } catch {
        setPrice(null);
      } finally {
        setPriceLoading(false);
      }
    };
    fetchPrice();
  }, [stateId, service?.ServiceID]);

  // The state dropdown sits inline on the page, so load the list up front.
  useEffect(() => {
    setStatesLoading(true);
    getAllStates()
      .then((states) => setAllStates(states || []))
      .catch(() => setAllStates([]))
      .finally(() => setStatesLoading(false));
  }, []);

  // Key Benefits = ServiceFeatures. /filterServices sends them as plain names
  // (["..."]); older responses sent {FeatureName} objects — accept both. No
  // hard-coded fallback: a service without features just hides the section.
  const benefits = (Array.isArray(service?.Features) ? service.Features : [])
    .map(f => (typeof f === "string" ? f : f?.FeatureName))
    .filter(Boolean);

  // What's Included = the Proposal step's "What You Get" list; services that
  // don't have one yet fall back to their ServiceDeliverables. Some services
  // have the same deliverable saved several times — show each label once.
  const whatsIncluded = [...new Set(
    (whatYouGet.length ? whatYouGet : Array.isArray(service?.Deliverables) ? service.Deliverables : [])
      .map(d => (typeof d === "string" ? d : d?.label)?.trim())
      .filter(Boolean)
  )];

  const tabs = [
    { id: "eligibility", label: "ELIGIBILITY CRITERIA", icon: <FaClipboardCheck size={13} /> },
    { id: "documents", label: "DOCUMENTS REQUIRED", icon: <FaFolderOpen size={13} /> },
    { id: "process", label: "PROCESS", icon: <FaCogs size={13} /> },
  ];

  const TAB_CONTENT_ICON = {
    eligibility: <FaClipboardCheck size={20} />,
    documents: <FaFolderOpen size={20} />,
    process: <FaCogs size={20} />,
  };

  const isRowActive = (row) => row.IsActive === undefined || row.IsActive === null || row.IsActive === 1 || row.IsActive === true;

  // Backed by serviceeligibility / servicedocument / serviceprocedures tables
  const tabItems = {
    eligibility: (service?.Eligibility || [])
      .filter(isRowActive)
      .map((row) => ({ title: row.EligibilityName })),
    documents: (service?.Document || [])
      .filter(isRowActive)
      .map((row) => ({ title: row.DocumentName })),
    process: (service?.Procedures || [])
      .filter(isRowActive)
      .sort((a, b) => (a.Step ?? 0) - (b.Step ?? 0))
      .map((row) => ({ title: row.label, desc: `Step ${row.Step}` })),
  };
  const activeTabItems = tabItems[activeTab] || [];

  // API descriptions sometimes come wrapped in literal quote characters — strip them for display
  const stripWrappingQuotes = (text) =>
    typeof text === "string" ? text.trim().replace(/^["']+|["']+$/g, "").trim() : text;
  const serviceDescription = stripWrappingQuotes(service?.description || service?.Description);

  const isSelected = !!cart[service?.ServiceID];

  const handleStateChange = async (newStateId) => {
    if (!newStateId) return;
    localStorage.setItem("StateID", newStateId);
    setStateId(newStateId);
    if (pendingAdd && service?.ServiceID) {
      setPendingAdd(false);
      let statePrice = null;
      try {
        statePrice = parsePriceResponse(await getServicePrice({ ServiceId: service.ServiceID, StateId: newStateId }));
      } catch {
        statePrice = null;
      }
      addToSelection(statePrice);
    }
  };

  const addToSelection = (priceForState) => {
    // If price is not available, use a zero placeholder flagged priceMissing —
    // proceedToQuote refuses to quote it rather than inventing a price.
    const priceObj = priceForState || {
      priceMissing: true,
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
    addToCart(service.ServiceID, { ...priceObj, ServiceName: service?.Name || service?.ServiceName });
  };

  const pickedStateName = allStates.find((s) => String(s.id || s.StateID) === String(stateId))?.state_name || "";

  // Same as "Proceed to Quote" on the Services page: quotes the whole selection
  // and opens the quote preview in a new tab.
  const handleProceedToQuote = async () => {
    // New customer (not signed in, or no company yet) — collect their details
    // through the matching Start New Company application instead.
    if (!localStorage.getItem('token') || !getSecureItem("selectedCompany")?.CompanyID) {
      goToNewCustomerFlow(navigate, [service], pickedStateName);
      return;
    }
    setQuoteLoading(true);
    try {
      const quoteId = await proceedToQuote({ cart, services: service ? [{ ...service, ServiceName: service.ServiceName || service.Name }] : [] });
      // Quoted — the selection is done with, so clear it.
      if (quoteId) clearCart();
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleAddToSelection = () => {
    if (!service?.ServiceID) return;
    // Once added, the button becomes "Proceed to Quote"
    if (isSelected) {
      handleProceedToQuote();
      return;
    }
    // No state yet — ask for it first, then add with that state's price
    if (!stateId) {
      setPendingAdd(true);
      stateBarRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      stateSelectRef.current?.open();
      return;
    }
    addToSelection(price);
  };

  // Handle Request Quote
  const handleRequestQuote = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setShowSigninModal(true);
      return;
    }
    setQuoteLoading(true);
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

      // Build ServiceDetails for this service only
      const priceObj = cart[service?.ServiceID] || price || {};
      const professionalFee = Number(priceObj.ProfessionalFee ?? 100);
      const vendorFee = Number(priceObj.VendorFee ?? 100);
      const govtFee = Number(priceObj.GovernmentFee ?? 100);
      const contractorFee = Number(priceObj.ContractFee ?? 100);
      const discount = Number(priceObj.Discount ?? 0);
      const rounding = Number(priceObj.Rounding ?? 0);

      const { gstEligible, state: franchiseeState } = await fetchFranchiseeGstInfo(franchiseeId);
      const gstAmount = calcGstAmount(professionalFee, vendorFee, gstEligible);
      const { cgst, sgst, igst } = splitGst(gstAmount, franchiseeState, stateName);
      const total = professionalFee + vendorFee + govtFee + contractorFee - discount + gstAmount;
      const advanceAmount = Math.ceil(total * 0.25);

      const serviceDetails = [
        {
          ServiceID: service?.ServiceID,
          ItemName: service?.ServiceName || service?.Name,
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
      navigate("/dashboard/bizpoleone");
    } catch (err) {
      alert("Failed to create quote. Please try again.", err);
    } finally {
      setQuoteLoading(false);
    }
  };

  return (
    <>
      {!embedded && <ToastContainer position="top-right" autoClose={3000} />}
      <SigninModal
        isOpen={showSigninModal}
        onClose={() => setShowSigninModal(false)}
        // Stay on this service with the selection intact instead of jumping to the dashboard.
        onSuccess={(tokenData) => {
          selectSignedInCompany(tokenData?.user || getSecureItem("user"));
          setShowSigninModal(false);
          toast.success("Signed in. You can request your quote now.");
        }}
        // New customer: this service's application collects their details and makes the quote.
        onSignup={() => {
          setShowSigninModal(false);
          goToNewCustomerFlow(navigate, [service], pickedStateName);
        }}
      />
      <div className={embedded ? "pb-10 font-sans" : "bg-gray-100 min-h-screen pt-10 pb-20 font-sans mt-26"}>
        <div className={embedded ? "" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}>
          {(!embedded || onBack) && (
            <button
              type="button"
              onClick={
                embedded
                  ? onBack
                  : () => (window.history.state?.idx > 0 ? navigate(-1) : navigate("/services"))
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-semibold text-gray-800 shadow-sm hover:border-[#F3C625] hover:bg-[#FFFBEA] transition-all"
            >
              <FaArrowLeft className="text-xs text-[#CA8A04]" />
              Back to services
            </button>
          )}
          {/* Service details fetch status */}
          {loading && (
            <div className="text-center text-gray-500 py-8">Loading service details...</div>
          )}
          {error && (
            <div className="text-center text-red-500 py-8">{error}</div>
          )}
          {service && (
            // ── TOP CARD ──
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-2xl p-6 sm:p-10 shadow-sm mt-6"
            >
              {/* Header: icon tile + title + chips */}
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-2xl bg-[#FBC02D] flex items-center justify-center shrink-0 shadow-sm">
                  <FaBuilding className="text-gray-900 text-xl sm:text-2xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 leading-tight tracking-tight">
                    {service?.Name || service?.ServiceName || "Company Registration"}
                  </h1>
                  {(service?.Category?.CategoryName || service?.EstimatedTAT || service?.Duration) && (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {service?.Category?.CategoryName && (
                        <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs sm:text-sm font-medium">
                          {service.Category.CategoryName}
                        </span>
                      )}
                      {(service?.EstimatedTAT || service?.Duration) && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFBEA] border border-[#FDE9A6] text-gray-800 text-xs sm:text-sm font-medium">
                          <FaRegClock size={12} />
                          {service?.EstimatedTAT || service?.Duration} Days
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {serviceDescription && (
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed mt-6">
                  {serviceDescription}
                </p>
              )}

              {/* State / price strip */}
              <div ref={stateBarRef} className="relative overflow-hidden mt-6 rounded-2xl border border-[#FBE7A1] bg-[#FFFBF0] px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                <div className="min-w-0 sm:border-r sm:border-[#F3E3B0] sm:pr-6">
                  <AnimatePresence mode="wait">
                    {stateId && !priceLoading && price !== null && typeof price === 'object' ? (
                      <motion.div
                        key="price-object"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex items-baseline gap-1"
                      >
                        <FaRupeeSign className="text-green-600 text-base" />
                        <span className="text-2xl font-bold text-gray-900">
                          {price.TotalFee?.toLocaleString('en-IN')}
                        </span>
                      </motion.div>
                    ) : stateId && !priceLoading && price === null ? (
                      <motion.div
                        key="price-unavailable"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg"
                      >
                        Price not available for selected state
                      </motion.div>
                    ) : priceLoading ? (
                      <motion.div
                        key="price-loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-sm text-gray-500"
                      >
                        <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                        Checking price...
                      </motion.div>
                    ) : (
                      <motion.p
                        key="no-state"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm sm:text-base font-medium text-gray-800"
                      >
                        Select your state to view pricing
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div className="sm:ml-auto w-full sm:w-80">
                  <StateSelect
                    ref={stateSelectRef}
                    variant="pill"
                    states={allStates}
                    value={stateId}
                    onChange={handleStateChange}
                    loading={statesLoading}
                    placeholder="Select Your State"
                    // Closed without picking — drop the pending "Add to Selection"
                    onOpenChange={(isOpen) => { if (!isOpen && !localStorage.getItem("StateID")) setPendingAdd(false); }}
                  />
                </div>

                {/* corner accent */}
                <div className="pointer-events-none absolute -bottom-4 -right-4 w-8 h-8 bg-[#FBC02D] rotate-45" />
              </div>

              {/* What's Included */}
              {whatsIncluded.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-1.5 h-6 bg-[#FBC02D] rounded-sm -skew-x-12" />
                    <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 whitespace-nowrap">What's Included</h2>
                    <span className="flex-1 h-px bg-gray-200 ml-3" />
                  </div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 bg-gray-50/70 border border-gray-100 rounded-2xl p-5 sm:p-6">
                    {whatsIncluded.map((item, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-3 text-sm sm:text-[15px] text-gray-700"
                      >
                        <div className="w-6 h-6 rounded-md bg-green-100 flex items-center justify-center flex-shrink-0">
                          <FaCheck className="text-green-600" size={11} />
                        </div>
                        <span className="leading-snug pt-0.5">{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleAddToSelection}
                  disabled={!service?.ServiceID || quoteLoading}
                  className={`flex-1 font-bold py-4 px-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 text-base disabled:opacity-70 ${isSelected
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-[#FBC02D] hover:bg-[#F9B81B] text-gray-900"
                    }`}
                >
                  {quoteLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>{isSelected ? "Proceed to Quote" : "Add to Selection"}</span>
                      <FaArrowRight className="text-sm" />
                    </>
                  )}
                </motion.button>

                {/* Opens the lead form popup (replaces Call Us / Email Us) */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setShowEnquiry(true)}
                  className="sm:w-64 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-base transition-colors"
                >
                  <FaPhoneAlt size={14} />
                  <span>Request a Call Back</span>
                </motion.button>
              </div>

            </motion.div>
          )}

          {/* ── KEY BENEFITS ── */}
          {service && benefits.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="mt-6 bg-white rounded-2xl p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-5">
                <FaCheckCircle className="text-yellow-400" size={16} />
                <h2 className="font-extrabold text-gray-900 text-base">Key Benefits</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {benefits.map((item, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.04, boxShadow: "0 4px 18px rgba(0,0,0,0.08)" }}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.07 }}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 flex items-start gap-2 text-xs text-gray-700 font-medium cursor-default"
                  >
                    <FaCheckCircle className="text-yellow-500 shrink-0 mt-0.5" size={13} />
                    <span>{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── REGISTRATION MADE EASY ── */}
          {service && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="mt-6 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Yellow header */}
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-300 px-6 py-5">
                <div className="flex items-center gap-2 mb-1">
                  <FaBalanceScale className="text-gray-800" size={17} />
                  <h2 className="font-extrabold text-gray-900 text-base">
                    Registration Made Easy!
                  </h2>
                </div>
                <p className="text-gray-700 text-xs">
                  Here's everything you need to know to get started
                </p>

                {/* Tabs */}
                <div className="flex gap-2 mt-4 flex-wrap">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${activeTab === tab.id
                        ? "bg-white text-gray-900 shadow-sm"
                        : "bg-yellow-200/60 text-gray-700 hover:bg-yellow-100"
                        }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requirements grid */}
              <div className="bg-gray-50 p-5 grid md:grid-cols-2 gap-4">
                {activeTabItems.length > 0 ? (
                  activeTabItems.map((item, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.02 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.07 }}
                      className="bg-white rounded-xl p-4 shadow-sm flex gap-3 items-start border border-gray-100"
                    >
                      <div className="bg-yellow-100 text-yellow-600 p-2.5 rounded-lg shrink-0">
                        {TAB_CONTENT_ICON[activeTab]}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm leading-tight mb-0.5">
                          {item.title}
                        </h3>
                        {item.desc && (
                          <p className="text-xs text-gray-500 leading-relaxed">
                            {item.desc}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 md:col-span-2 text-center py-4">
                    No {tabs.find((t) => t.id === activeTab)?.label.toLowerCase()} available for this service.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── CTA ── */}
          {service && !embedded && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              whileHover={{ scale: 1.01 }}
              className="mt-6 bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100"
            >
              <div className="bg-yellow-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaBuilding className="text-yellow-500 text-2xl" />
              </div>

              <h3 className="text-lg font-extrabold text-gray-900 mb-2">
                Ready to Register Your Company?
              </h3>

              <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                Get your company registered with expert guidance and hassle-free documentation.
              </p>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 px-6 py-3 rounded-full shadow-md hover:shadow-xl font-semibold text-sm"
                onClick={() => navigate("/startbusiness")}
              >
                Get Started Now →
              </motion.button>
            </motion.div>
          )}

          {/* Lead form popup — "Request a Call Back" */}
          <AnimatePresence>
            {showEnquiry && service && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={() => setShowEnquiry(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ServiceEnquiryForm
                    serviceName={service?.Name || service?.ServiceName || ""}
                    states={allStates}
                    stateId={stateId}
                    onStateChange={handleStateChange}
                    statesLoading={statesLoading}
                    onClose={() => setShowEnquiry(false)}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default ServiceDetails;
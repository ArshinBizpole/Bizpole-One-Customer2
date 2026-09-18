import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, Loader2, Eye, Phone, Tag, FileText, CheckCircle, Users, Building2, Search, MapPin, Mail, Globe, Languages, Calendar, Hash, Briefcase } from "lucide-react";
import locationData from "../../utils/statesAndDistricts.json";
import DealsApi from "../../api/DealsApi";
import { getSecureItem } from "../../utils/secureStorage";
import Select, { components } from "react-select";

// ── Step Indicator ──────────────────────────────────────────────────────────
const StepIndicator = ({ currentStep }) => {
    const steps = [
        { number: 1, label: "Company Info" },
        { number: 2, label: "Service Info" },
        { number: 3, label: "Customer Info" },
    ];
    return (
        <div className="flex items-center justify-center gap-0 mb-6">
            {steps.map((step, idx) => {
                const isDone = currentStep > step.number;
                const isActive = currentStep === step.number;
                return (
                    <div key={step.number} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all
                                ${isDone ? "bg-yellow-400 text-white" : isActive ? "bg-yellow-400 text-white" : "bg-gray-200 text-gray-500"}`}>
                                {isDone ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : step.number}
                            </div>
                            <span className={`text-[11px] font-medium mt-1.5 whitespace-nowrap ${isActive || isDone ? "text-gray-800" : "text-gray-400"}`}>
                                {step.label}
                            </span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={`w-24 h-px mx-1 mb-5 ${currentStep > step.number ? "bg-yellow-400" : "bg-gray-200"}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ── Field Label with Icon ───────────────────────────────────────────────────
const FieldLabel = ({ icon: Icon, label, required }) => (
    <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Icon className="w-3 h-3 text-gray-500" />
        </div>
        <span className="text-sm font-medium text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
        </span>
    </div>
);

// ── Input Style ─────────────────────────────────────────────────────────────
const inputCls = (hasError) =>
    `w-full px-3 py-2.5 text-sm rounded-lg border ${hasError ? "border-red-300 focus:ring-red-100" : "border-gray-200 focus:ring-yellow-100 focus:border-yellow-400"} focus:outline-none focus:ring-2 placeholder:text-gray-300 transition-all bg-white`;

// ── react-select styles ─────────────────────────────────────────────────────
const rsStyles = (hasError = false) => ({
    control: (base, state) => ({
        ...base,
        borderRadius: "0.5rem",
        borderColor: hasError ? "#fca5a5" : state.isFocused ? "#facc15" : "#e5e7eb",
        boxShadow: state.isFocused ? `0 0 0 2px ${hasError ? "#fee2e2" : "#fef9c3"}` : "none",
        "&:hover": { borderColor: hasError ? "#fca5a5" : "#facc15" },
        minHeight: "42px",
        padding: "0 2px",
    }),
    placeholder: (base) => ({ ...base, color: "#d1d5db", fontSize: "0.875rem" }),
    singleValue: (base) => ({ ...base, fontSize: "0.875rem" }),
});

// ── Existing Entity Dropdown ────────────────────────────────────────────────
const ExistingEntityDropdown = ({ type, onSelect, onClose, apiBaseUrl }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const dropdownRef = useRef(null);
    const searchTimeout = useRef(null);

    const fetchEntities = useCallback(async (searchQuery, pageNum = 1, append = false) => {
        setIsLoading(true);
        try {
            const endpoint = type === "customer"
                ? `${apiBaseUrl}/customers?search=${encodeURIComponent(searchQuery)}&page=${pageNum}&limit=10`
                : `${apiBaseUrl}/companies?search=${encodeURIComponent(searchQuery)}&page=${pageNum}&limit=10`;
            const response = await fetch(endpoint, {
                headers: { Authorization: `Bearer ${getSecureItem("partnerToken")}` },
            });
            const data = await response.json();
            if (data.success) {
                const newResults = data.data || [];
                setResults(prev => append ? [...prev, ...newResults] : newResults);
                setHasMore(newResults.length === 10);
            }
        } catch (err) {
            console.error(`Error fetching ${type}s:`, err);
        } finally {
            setIsLoading(false);
        }
    }, [type, apiBaseUrl]);

    useEffect(() => { fetchEntities("", 1, false); }, []);
    useEffect(() => {
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => { setPage(1); fetchEntities(query, 1, false); }, 300);
        return () => clearTimeout(searchTimeout.current);
    }, [query]);
    useEffect(() => {
        const handleClick = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) onClose(); };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [onClose]);

    const handleLoadMore = () => { const next = page + 1; setPage(next); fetchEntities(query, next, true); };

    return (
        <motion.div ref={dropdownRef} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            <div className="p-2 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <Search className="w-3.5 h-3.5 text-gray-400" />
                    <input autoFocus type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                        placeholder={`Search ${type === "customer" ? "customers" : "companies"}…`}
                        className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-400" />
                    {query && <button onClick={() => setQuery("")}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
                </div>
            </div>
            <div className="max-h-52 overflow-y-auto">
                {isLoading && results.length === 0 ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span>
                    </div>
                ) : results.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                        {type === "customer" ? <Users className="w-7 h-7 mb-1 opacity-30" /> : <Building2 className="w-7 h-7 mb-1 opacity-30" />}
                        <p className="text-sm">No {type === "customer" ? "customers" : "companies"} found</p>
                    </div>
                ) : (
                    <>
                        {results.map((item, idx) => (
                            <button key={item.id || item.CustomerID || item.CompanyID || idx} type="button" onClick={() => onSelect(item)}
                                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    {type === "customer" ? <Users className="w-3.5 h-3.5 text-gray-500" /> : <Building2 className="w-3.5 h-3.5 text-gray-500" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate">
                                        {type === "customer" ? (item.name || item.Name || item.CustomerName) : (item.name || item.Name || item.CompanyName)}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {type === "customer" ? (item.mobile || item.Mobile || item.email || item.Email || "") : (item.gst || item.GST || item.CompanyGST || item.email || item.Email || "")}
                                    </p>
                                </div>
                            </button>
                        ))}
                        {hasMore && (
                            <button type="button" onClick={handleLoadMore} disabled={isLoading}
                                className="w-full py-2.5 text-xs font-semibold text-yellow-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
                                {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                {isLoading ? "Loading…" : "Load more"}
                            </button>
                        )}
                    </>
                )}
            </div>
        </motion.div>
    );
};

// ── If Existing Toggle Button ───────────────────────────────────────────────
const IfExistingButton = ({ active, onClick }) => (
    <button type="button" onClick={onClick}
        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-xl transition-all
            ${active ? "bg-yellow-400 text-gray-900 shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
        <Search className="w-3 h-3" />
        {active ? "New Entry" : "If Existing"}
    </button>
);

// ── Service Details Popup ───────────────────────────────────────────────────
const ServiceDetailsPopup = ({ category, services, onClose }) => {
    if (!category) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 24 }}
                className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                <div className="relative bg-yellow-400 px-6 pt-6 pb-8">
                    <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full bg-white/30 hover:bg-white/50 transition-colors">
                        <X className="w-4 h-4 text-gray-800" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/30 rounded-xl"><Tag className="w-5 h-5 text-gray-800" /></div>
                        <div>
                            <p className="text-gray-700 text-xs font-semibold uppercase tracking-widest">Service Category</p>
                            <h3 className="text-gray-900 text-lg font-bold">{category.label}</h3>
                        </div>
                    </div>
                    <span className="mt-3 inline-block bg-white/30 text-gray-800 text-xs font-bold px-3 py-1 rounded-full">
                        {services.length} {services.length === 1 ? "Service" : "Services"} available
                    </span>
                </div>
                <div className="px-6 py-4 max-h-[360px] overflow-y-auto">
                    {services.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <FileText className="w-10 h-10 mb-2 opacity-30" />
                            <p className="text-sm font-medium">No services found</p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {services.map((service, idx) => (
                                <li key={service.ServiceID || idx} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <CheckCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">{service.ServiceName}</p>
                                        {service.Description && <p className="text-xs text-gray-500 mt-0.5">{service.Description}</p>}
                                        {service.ServiceCode && (
                                            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                                                {service.ServiceCode}
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                    <button onClick={onClose} className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-full text-sm font-bold hover:bg-yellow-500 transition-colors">Close</button>
                </div>
            </motion.div>
        </div>
    );
};

// ── Main Modal ──────────────────────────────────────────────────────────────
const AddDealModal = ({ isOpen = true, onClose, onSuccess, deal, initialData }) => {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableDistricts, setAvailableDistricts] = useState([]);
    const [errors, setErrors] = useState({});
    const [dealType, setDealType] = useState("Individual");

    const [useExistingCustomer, setUseExistingCustomer] = useState(false);
    const [useExistingCompany, setUseExistingCompany] = useState(false);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
    const [selectedExistingCustomer, setSelectedExistingCustomer] = useState(null);
    const [selectedExistingCompany, setSelectedExistingCompany] = useState(null);

    const [associateCompanies, setAssociateCompanies] = useState([]);
    const [associateCustomersForCompany, setAssociateCustomersForCompany] = useState([]);
    const [isFetchingCompanies, setIsFetchingCompanies] = useState(false);
    const [isFetchingCustomers, setIsFetchingCustomers] = useState(false);
    const [companySearch, setCompanySearch] = useState("");
    const [customerSearch, setCustomerSearch] = useState("");

    const [servicePopup, setServicePopup] = useState({ open: false, category: null });

    const [formData, setFormData] = useState({
        firstName: "", lastName: "", mobile: "", email: "", country: "India", pincode: "",
        state: "", district: "", preferredLanguage: "", closureDate: "",
        communication: false, serviceType: "individual", serviceCategory: "",
        serviceState: "", selectedServices: [], selectedPackage: null,
        billingPeriod: "monthly", companyName: "", companyGST: "",
        companyMobile: "", companyEmail: "", companyCountry: "India",
        companyState: "", companyDistrict: "", companyPincode: "", companyPreferredLanguage: "",
    });

    const [availableCompanyDistricts, setAvailableCompanyDistricts] = useState([]);
    const [serviceCategories, setServiceCategories] = useState([]);
    const [availableServices, setAvailableServices] = useState([]);
    const [availableStates, setAvailableStates] = useState([]);
    const [servicePricing, setServicePricing] = useState([]);
    const [availablePackages, setAvailablePackages] = useState([]);
    const [categoryServicesCache, setCategoryServicesCache] = useState({});


    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        if (formData.state) {
            const s = locationData.states.find((s) => s.stateName === formData.state);
            setAvailableDistricts(s ? s.districts : []);
        } else setAvailableDistricts([]);
    }, [formData.state]);

    useEffect(() => {
        if (formData.companyState) {
            const s = locationData.states.find((s) => s.stateName === formData.companyState);
            setAvailableCompanyDistricts(s ? s.districts : []);
        } else setAvailableCompanyDistricts([]);
    }, [formData.companyState]);

    useEffect(() => {
        const fetchAssociateCompanies = async () => {
            if (!isOpen) return;
            setIsFetchingCompanies(true);
            try {
                const user = getSecureItem("partnerUser") || {};
                const response = await fetch(`${API_BASE_URL}/company/associate-list`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ AssociateID: user.id || null, page: 1, limit: 100 }),
                });
                const data = await response.json();
                if (data.success) setAssociateCompanies(data.data || []);
            } catch (err) { console.error("Error fetching associate companies:", err); }
            finally { setIsFetchingCompanies(false); }
        };
        fetchAssociateCompanies();
    }, [isOpen]);

    const fetchCustomersForCompany = async (companyId) => {
        if (!companyId) { setAssociateCustomersForCompany([]); return; }
        setIsFetchingCustomers(true);
        try {
            const resp = await fetch(`${API_BASE_URL}/company/get-details`, {
                method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getSecureItem("partnerToken")}` },
                body: JSON.stringify({ CompanyId: companyId }),
            });
            const data = await resp.json();
            if (data.success && data.data) setAssociateCustomersForCompany(data.data.Customers || []);
            else {
                const user = getSecureItem("partnerUser") || {};
                const r = await fetch(`${API_BASE_URL}/customer/associate-list`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ AssociateID: user.id || null, page: 1, limit: 100 }),
                });
                const d = await r.json();
                if (d.success) setAssociateCustomersForCompany(d.data || []);
            }
        } catch (err) { setAssociateCustomersForCompany([]); console.log(err) }
        finally { setIsFetchingCustomers(false); }
    };

    useEffect(() => {
        const fetch_ = async () => {
            try {
                const r = await fetch(`${API_BASE_URL}/service-category?page=1&limit=100`, { headers: { Authorization: `Bearer ${getSecureItem("partnerToken")}` } });
                const d = await r.json();
                if (d.success) setServiceCategories(d.data || []);
            } catch (error) {
                console.error("Error fetching service categories:", error);
            }
        };
        if (isOpen) fetch_();
    }, [isOpen]);

    console.log("formData", { formData });


    useEffect(() => {
        if (!isOpen) return;
        const fetchFullDealDetails = async () => {
            if (deal && deal.id) {
                try {
                    const result = await DealsApi.getDealById(deal.id);
                    if (result.success && result.data) {
                        const d = result.data;
                        console.log("FETCHED DEAL FOR EDIT:", d);
                        let fullCustomer = {};
                        let fullCompany = {};

                        // Fetch full customer details if ID is present
                        const custId = d.CustomerID || d.customerId || d.CustomerID;
                        if (custId) {
                            try {
                                const cr = await fetch(`${API_BASE_URL}/customer/get`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getSecureItem("partnerToken")}` },
                                    body: JSON.stringify({ CustomerID: custId }),
                                });
                                const cData = await cr.json();
                                if (cData.success) fullCustomer = cData.data || {};
                            } catch (e) { console.error("Error fetching cust", e); }
                        }

                        // Fetch full company details if ID is present
                        const compId = d.CompanyID || d.companyId;
                        if (compId) {
                            try {
                                const comR = await fetch(`${API_BASE_URL}/company/get-details`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getSecureItem("partnerToken")}` },
                                    body: JSON.stringify({ CompanyId: compId }),
                                });
                                const comData = await comR.json();
                                if (comData.success) fullCompany = comData.data || {};
                            } catch (e) { console.error("Error fetching comp", e); }
                        }

                        let fName = d.FirstName || d.firstName || fullCustomer.FirstName || fullCustomer.firstName || "";
                        let lName = d.LastName || d.lastName || fullCustomer.LastName || fullCustomer.lastName || "";
                        if (!fName && !lName && (d.name || fullCustomer.CustomerName)) {
                            const nameToSplit = d.name || fullCustomer.CustomerName || "";
                            const parts = nameToSplit.trim().split(/\s+/);
                            fName = parts[0] || "";
                            lName = parts.slice(1).join(" ") || "";
                        }

                        setFormData({
                            firstName: fName,
                            lastName: lName,
                            mobile: d.mobile || d.Mobile || fullCustomer.Mobile || fullCustomer.mobile || "",
                            email: d.email || d.Email || fullCustomer.Email || fullCustomer.email || "",
                            country: d.country || d.Country || fullCustomer.Country || "India",
                            pincode: d.PinCode || d.pincode || fullCustomer.PinCode || fullCustomer.pincode || "",
                            state: d.state || d.State || fullCustomer.State || fullCustomer.state || "",
                            district: d.district || d.District || d.city || d.City || fullCustomer.District || fullCustomer.City || "",
                            preferredLanguage: d.PreferredLanguage || d.preferredLanguage || fullCustomer.PreferredLanguage || "",
                            closureDate: d.ClosureDate ? d.ClosureDate.split('T')[0] : (d.closureDate ? d.closureDate.split('T')[0] : ""),
                            serviceType: (d.dealType || d.serviceType || d.DealType || "individual").toLowerCase(),
                            serviceCategory: d.serviceCategoryId || d.service_category_id || d.ServiceCategoryID || d.CategoryID || d.categoryId || d.serviceCategory || d.ServiceCategory || (d.services && d.services.length > 0 ? (d.services[0].serviceCategoryId || d.services[0].service_category_id || d.services[0].ServiceCategoryID || d.services[0].CategoryID || d.services[0].categoryId || d.services[0].serviceCategory || d.services[0].ServiceCategory) : "") || "",
                            serviceState: d.StateService || d.serviceState || d.state || d.State || d.ServiceState || "",
                            selectedServices: d.services?.map(s => s.serviceId || s.ServiceID || s.service_id || s.ServiceId || s.id).filter(Boolean) || [],
                            selectedPackage: d.packageId || d.PackageID || d.package_id || d.PackageId || null,
                            billingPeriod: d.billingPeriod || d.BillingPeriod || "monthly",
                            companyName: d.CompanyName || fullCompany.BusinessName || fullCompany.CompanyName || d.companyName || "",
                            companyGST: d.CompanyGST || d.GSTNumber || fullCompany.GSTNumber || fullCompany.CompanyGST || d.gst || "",
                            companyMobile: d.CompanyMobile || fullCompany.CompanyMobile || fullCompany.Mobile || d.companyMobile || "",
                            companyEmail: d.CompanyEmail || fullCompany.CompanyEmail || fullCompany.Email || d.companyEmail || "",
                            companyCountry: d.CompanyCountry || fullCompany.Country || "India",
                            companyState: d.CompanyState || fullCompany.State || d.companyState || "",
                            companyDistrict: d.CompanyDistrict || fullCompany.District || d.companyDistrict || "",
                            companyPincode: d.CompanyPincode || fullCompany.PinCode || fullCompany.pincode || d.companyPincode || "",
                            companyPreferredLanguage: d.CompanyPreferredLanguage || fullCompany.PreferredLanguage || d.companyPreferredLanguage || "",
                            communication: d.communication === 1 || d.communication === true || false,
                        });
                        setDealType((d.dealType || d.DealType || "individual").toLowerCase() === "package" ? "Package" : "Individual");
                        if (custId) { setSelectedExistingCustomer(fullCustomer); setUseExistingCustomer(true); }
                        if (compId) { setSelectedExistingCompany(fullCompany); setUseExistingCompany(true); setAssociateCustomersForCompany(fullCompany.Customers || []); }
                    }
                } catch (err) { console.error("Error fetching full deal details", err); }
            } else if (!deal) {
                if (initialData && Object.keys(initialData).length > 0) {
                    setFormData(prev => ({
                        ...prev, serviceType: initialData.serviceType || "individual",
                        serviceCategory: initialData.serviceCategory || "",
                        serviceState: initialData.serviceState || "",
                        selectedServices: initialData.selectedServices || [],
                        selectedPackage: initialData.packageId || null,
                    }));
                    setDealType(initialData.serviceType === "package" ? "Package" : "Individual");
                    setStep(1);
                } else {
                    setFormData({
                        firstName: "", lastName: "", mobile: "", email: "", country: "India", pincode: "",
                        state: "", district: "", preferredLanguage: "", closureDate: "",
                        communication: false, serviceType: "individual", serviceCategory: "",
                        serviceState: "", selectedServices: [], selectedPackage: null,
                        billingPeriod: "monthly", companyName: "", companyGST: "",
                        companyMobile: "", companyEmail: "", companyCountry: "India",
                        companyState: "", companyDistrict: "", companyPincode: "", companyPreferredLanguage: "",
                    });
                    setDealType("Individual"); setStep(1);
                }
            }
        };
        fetchFullDealDetails();
    }, [isOpen, deal, initialData]);

    // Resolve category name to ID if needed
    useEffect(() => {
        if (formData.serviceCategory && isNaN(formData.serviceCategory) && serviceCategories.length > 0) {
            const found = serviceCategories.find(c => c.CategoryName === formData.serviceCategory);
            if (found) setFormData(prev => ({ ...prev, serviceCategory: found.CategoryID }));
        }
    }, [formData.serviceCategory, serviceCategories]);

    useEffect(() => {
        const fetch_ = async () => {
            if (!formData.serviceCategory || isNaN(formData.serviceCategory)) { setAvailableServices([]); return; }
            try {
                const r = await fetch(`${API_BASE_URL}/service-categories/${formData.serviceCategory}?limit=100`, { headers: { Authorization: `Bearer ${getSecureItem("partnerToken")}` } });
                const d = await r.json();
                if (d.success && d.data) {
                    const svcs = d.data.Services || [];
                    setAvailableServices(svcs);
                    setCategoryServicesCache(prev => ({ ...prev, [formData.serviceCategory]: svcs }));
                }
            } catch { setAvailableServices([]); }
        };
        fetch_();
    }, [formData.serviceCategory]);

    useEffect(() => {
        const fetch_ = async () => {
            try {
                const r = await fetch(`${API_BASE_URL}/states`);
                const d = await r.json();
                if (d.success) setAvailableStates(d.data || []);
            } catch (error) {
                console.error("Error fetching states:", error);
            }
        };
        if (isOpen) fetch_();
    }, [isOpen]);

    useEffect(() => {
        const fetch_ = async () => {
            if (!formData.serviceState || !formData.selectedServices?.length) { setServicePricing([]); return; }
            try {
                const selectedState = availableStates.find((s) => s.state_name === formData.serviceState);
                if (!selectedState) return;
                const r = await fetch(`${API_BASE_URL}/service-price-currency/bulk`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getSecureItem("partnerToken")}` },
                    body: JSON.stringify({ StateID: selectedState.ID, ServiceIDs: formData.selectedServices, isIndividual: formData.serviceType === 'individual' ? 1 : 0, packageId: formData.selectedPackage, yearly: formData.billingPeriod === 'yearly' ? 1 : 0 }),
                });
                const d = await r.json();
                if (d.success) setServicePricing(d.data || []);
            } catch { setServicePricing([]); }
        };
        fetch_();
    }, [formData.serviceState, formData.selectedServices, formData.serviceType, formData.selectedPackage, formData.billingPeriod, availableStates]);

    useEffect(() => {
        const fetch_ = async () => {
            if (formData.serviceType !== "package" || !formData.serviceState) { setAvailablePackages([]); return; }
            try {
                const selectedState = availableStates.find((s) => s.state_name === formData.serviceState);
                if (!selectedState) return;
                const r = await fetch(`${API_BASE_URL}/getPackage`, { headers: { Authorization: `Bearer ${getSecureItem("partnerToken")}` } });
                const d = await r.json();
                if (d.data) setAvailablePackages(d.data || []);
            } catch { setAvailablePackages([]); }
        };
        fetch_();
    }, [formData.serviceType, formData.serviceState, availableStates]);

    const handleOpenServicePopup = async (categoryOption) => {
        const catId = categoryOption.value;
        if (categoryServicesCache[catId]) { setServicePopup({ open: true, category: categoryOption, services: categoryServicesCache[catId] }); return; }
        try {
            const r = await fetch(`${API_BASE_URL}/service-categories/${catId}?limit=100`, { headers: { Authorization: `Bearer ${getSecureItem("partnerToken")}` } });
            const d = await r.json();
            const svcs = (d.success && d.data) ? (d.data.Services || []) : [];
            setCategoryServicesCache(prev => ({ ...prev, [catId]: svcs }));
            setServicePopup({ open: true, category: categoryOption, services: svcs });
        } catch { setServicePopup({ open: true, category: categoryOption, services: [] }); }
    };

    const handleSelectExistingCustomer = async (customer) => {
        const customerId = customer.CustomerID || customer.id || customer.ID;
        if (!customerId) return;
        setSelectedExistingCustomer(customer);
        setShowCustomerDropdown(false);
        try {
            const r = await fetch(`${API_BASE_URL}/customer/get`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${getSecureItem("partnerToken")}` },
                body: JSON.stringify({ CustomerID: customerId }),
            });
            const data = await r.json();
            if (data.success && data.data) {
                const c = data.data;
                const firstName = c.FirstName || "";
                const lastName = c.LastName || "";
                setFormData(prev => ({ ...prev, firstName: firstName, lastName: lastName, mobile: c.Mobile || c.mobile || "", email: c.Email || c.email || "", country: c.Country || c.country || "India", pincode: c.PinCode || c.Pincode || c.pincode || "", state: c.State || c.state || "", district: c.District || c.district || "", preferredLanguage: c.PreferredLanguage || c.preferredLanguage || "", communication: c.communication === 1 || c.communication === true || false }));
            }
        } catch (error) {
            console.error("Error fetching customer details:", error);
        }
    };

    const handleSelectExistingCompany = async (company) => {
        const companyId = company.CompanyID || company.id || company.ID;
        if (!companyId) return;
        setSelectedExistingCompany(company);
        setShowCompanyDropdown(false);
        try {
            const r = await fetch(`${API_BASE_URL}/company/get-details`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${getSecureItem("partnerToken")}` },
                body: JSON.stringify({ CompanyId: companyId }),
            });
            const data = await r.json();
            if (data.success && data.data) {
                const c = data.data;
                setFormData(prev => ({ ...prev, companyName: c.BusinessName || c.CompanyName || c.name || c.Name || "", companyGST: c.GSTNumber || c.CompanyGST || c.gst || c.GST || "", companyMobile: c.CompanyMobile || c.Mobile || c.mobile || "", companyEmail: c.CompanyEmail || c.Email || c.email || "", companyCountry: c.Country || c.country || "India", companyState: c.State || c.state || "", companyDistrict: c.District || c.district || "", companyPincode: c.PinCode || c.pincode || "", companyPreferredLanguage: c.PreferredLanguage || c.preferredLanguage || "" }));
                setAssociateCustomersForCompany(c.Customers || []);
                if (c.Customers?.length > 0) { setUseExistingCustomer(true); setShowCustomerDropdown(true); }
            } else {
                setFormData(prev => ({ ...prev, companyName: company.BusinessName || company.CompanyName || company.name || company.Name || "", companyGST: company.GSTNumber || company.CompanyGST || company.gst || company.GST || "", companyMobile: company.CompanyMobile || company.Mobile || company.mobile || "", companyEmail: company.CompanyEmail || company.Email || company.email || "", companyCountry: company.Country || company.country || "India", companyState: company.State || company.state || "", companyDistrict: company.District || company.district || "", companyPincode: company.PinCode || company.pincode || "", companyPreferredLanguage: company.PreferredLanguage || company.preferredLanguage || "" }));
                fetchCustomersForCompany(companyId);
            }
        } catch { fetchCustomersForCompany(companyId); }
        setSelectedExistingCustomer(null);
    };

    const toggleExistingCustomer = () => {
        if (useExistingCustomer) { setUseExistingCustomer(false); setShowCustomerDropdown(false); setSelectedExistingCustomer(null); setFormData(prev => ({ ...prev, firstName: "", lastName: "", mobile: "", email: "", country: "India", pincode: "", state: "", district: "", preferredLanguage: "", communication: false })); }
        else { setUseExistingCustomer(true); setShowCustomerDropdown(true); }
    };

    const toggleExistingCompany = () => {
        if (useExistingCompany) { setUseExistingCompany(false); setShowCompanyDropdown(false); setSelectedExistingCompany(null); setFormData(prev => ({ ...prev, companyName: "", companyGST: "", companyMobile: "", companyEmail: "", companyCountry: "India", companyState: "", companyDistrict: "", companyPincode: "", companyPreferredLanguage: "" })); }
        else { setUseExistingCompany(true); setShowCompanyDropdown(true); }
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => { const u = { ...prev, [name]: value }; if (name === "serviceType") u.dealType = value === "individual" ? "Individual" : "Package"; return u; });
        if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    };

    const handleServiceToggle = (serviceId) => {
        setFormData(prev => {
            const already = prev.selectedServices.includes(serviceId);
            return { ...prev, selectedServices: already ? prev.selectedServices.filter(id => id !== serviceId) : [...prev.selectedServices, serviceId] };
        });
        if (errors.selectedServices) setErrors(prev => { const n = { ...prev }; delete n.selectedServices; return n; });
    };

    const validateStep1 = () => {
        const e = {};
        if (!formData.companyName.trim()) e.companyName = "Required";
        if (!formData.companyState) e.companyState = "Required";
        if (!formData.companyDistrict) e.companyDistrict = "Required";
        setErrors(e); return Object.keys(e).length === 0;
    };
    const validateStep2 = () => {
        const e = {};
        if (!formData.serviceState) e.serviceState = "Required";
        if (formData.serviceType === "individual") {
            if (!formData.serviceCategory) e.serviceCategory = "Required";
            if (!formData.selectedServices?.length) e.selectedServices = "Please select at least one service";
        } else if (!formData.selectedPackage) e.selectedPackage = "Required";
        setErrors(e); return Object.keys(e).length === 0;
    };
    const validateStep3 = () => {
        const e = {};
        if (!formData.firstName.trim()) e.firstName = "Required";
        if (!formData.mobile.trim()) e.mobile = "Required";
        if (!formData.email.trim()) e.email = "Required";
        if (!formData.state) e.state = "Required";
        if (!formData.district) e.district = "Required";
        if (!formData.closureDate) e.closureDate = "Required";
        setErrors(e); return Object.keys(e).length === 0;
    };

    const handleNext = () => { if (step === 1 && validateStep1()) setStep(2); else if (step === 2 && validateStep2()) setStep(3); };
    const handleBack = () => { if (step === 3) setStep(2); else if (step === 2) setStep(1); };

    const handleSubmit = async () => {
        if (!validateStep3()) return;
        setIsSubmitting(true);
        try {
            const user = getSecureItem("partnerUser") || {};
            // const selectedState = availableStates.find((s) => s.state_name === formData.serviceState);
            const selectedCategory = serviceCategories.find(c => c.CategoryID === parseInt(formData.serviceCategory));
            let servicesPayload = [];
            if (formData.serviceType === "individual") {
                servicesPayload = formData.selectedServices.map((serviceId) => {
                    const service = availableServices.find((s) => s.ServiceID === serviceId);
                    const pricing = servicePricing.find((p) => p.ServiceID === serviceId);
                    return { serviceId, serviceName: service?.ServiceName || pricing?.ServiceName || "", serviceCategoryId: formData.serviceCategory, serviceCategory: selectedCategory?.CategoryName || "", professionalFee: pricing?.ProfessionalFee || 0, vendorFee: pricing?.VendorFee || 0, contractorFee: pricing?.ContractFee || 0, govtFee: pricing?.GovernmentFee || 0, total: pricing?.TotalFee || pricing?.Total || 0, dealType: "Individual" };
                });
            } else if (formData.serviceType === "package") {
                const selectedPackage = availablePackages.find((pkg) => pkg.PackageID === parseInt(formData.selectedPackage));
                if (selectedPackage?.services?.length > 0) {
                    servicesPayload = selectedPackage.services.map((s) => ({ serviceId: s.ServiceID || s.serviceId, serviceName: s.ServiceName || s.name || "", packageId: selectedPackage.PackageID, packageName: selectedPackage.PackageName, billingPeriod: formData.billingPeriod, professionalFee: formData.billingPeriod === "yearly" ? (s.ProfessionalFeeYearly || 0) : (s.ProfessionalFeeMonthly || 0), vendorFee: formData.billingPeriod === "yearly" ? (s.VendorFeeYearly || 0) : (s.VendorFeeMonthly || 0), govtFee: formData.billingPeriod === "yearly" ? (s.GovernmentFeeYearly || 0) : (s.GovernmentFeeMonthly || 0), total: formData.billingPeriod === "yearly" ? (s.TotalFeeYearly || 0) : (s.TotalFeeMonthly || 0), dealType: "Package" }));
                }
            }
            if (deal && deal.id) {
                const payload = {
                    id: deal.id,
                    name: `${formData.firstName} ${formData.lastName}`.trim(),
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    mobile: formData.mobile,
                    email: formData.email,
                    state: formData.state,
                    franchiseId: user.FranchiseeID || 1,
                    employeeId: user.EmployeeID || 9,
                    converted_at: deal.converted_at || new Date().toISOString(),
                    CompanyID: deal.CompanyID,
                    CustomerID: deal.CustomerID,
                    ClosureDate: formData.closureDate,
                    serviceCategoryId: formData.serviceCategory,
                    serviceCategory: selectedCategory?.CategoryName || "",
                    quoteCRE: deal.quoteCRE || 9,
                    sourceOfSale: "Associate",
                    dealType: formData.serviceType === "individual" ? "Individual" : "Package",
                    isIndividual: formData.serviceType === "individual" ? 1 : 0,
                    services: servicesPayload,
                    packageName: formData.serviceType === "package" ? servicesPayload[0]?.packageName : null,
                    packageId: formData.serviceType === "package" ? servicesPayload[0]?.packageId : null,
                    billingPeriod: formData.billingPeriod,
                    StateService: formData.serviceState,
                    AssociateID: user.id || null,
                    communication: formData.communication
                };
                console.log("Update Payload:", payload);
                const response = await DealsApi.updateDeal(payload);
                if (response.success) { onSuccess?.(); onClose(); } else setErrors({ api: response.message || "Failed to update deal" });
            } else {
                const isIndividual = formData.serviceType === "individual";
                const selectedPackageObj = !isIndividual ? availablePackages.find((pkg) => pkg.PackageID === parseInt(formData.selectedPackage)) : null;
                const payload = {
                    leadId: null,
                    ServiceDetails: servicesPayload.map(s => ({
                        serviceId: s.serviceId,
                        categoryId: s.serviceCategoryId,
                        categoryName: s.serviceCategory,
                        serviceName: s.serviceName,
                        professionalFee: s.professionalFee,
                        vendorFee: s.vendorFee,
                        contractFee: s.contractorFee || 0,
                        governmentFee: s.govtFee,
                        total: s.total,
                    })),
                    customer: {
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        name: `${formData.firstName} ${formData.lastName}`.trim(),
                        mobile: formData.mobile,
                        email: formData.email,
                        country: formData.country,
                        pincode: formData.pincode,
                        state: formData.state,
                        district: formData.district,
                        preferredLanguage: formData.preferredLanguage,
                        closureDate: formData.closureDate,
                        communication: formData.communication,
                        isAssociate: true,
                        sourceOfSale: "Associate",
                        ...(selectedExistingCustomer && { existingCustomerId: selectedExistingCustomer.id || selectedExistingCustomer.CustomerID }),
                        services: servicesPayload.map(s => ({
                            ...s,
                            ServiceID: s.serviceId,
                            ServiceName: s.serviceName,
                            CategoryID: s.serviceCategoryId,
                            CategoryName: s.serviceCategory,
                            TotalFee: s.total,
                            ProfessionalFee: s.professionalFee,
                            VendorFee: s.vendorFee,
                            GovernmentFee: s.govtFee,
                            ContractFee: s.contractorFee
                        }))
                    },
                    company: {
                        name: formData.companyName,
                        gst: formData.companyGST,
                        mobile: formData.companyMobile,
                        email: formData.companyEmail,
                        country: formData.companyCountry,
                        pincode: formData.companyPincode,
                        state: formData.companyState,
                        district: formData.companyDistrict,
                        preferredLanguage: formData.companyPreferredLanguage,
                        isAssociate: true,
                        sourceOfSale: "Associate",
                        ...(selectedExistingCompany && { existingCompanyId: selectedExistingCompany.id || selectedExistingCompany.CompanyID })
                    },
                    dealType: isIndividual ? "Individual" : "Package",
                    isIndividual: isIndividual ? 1 : 0,
                    packageId: isIndividual ? null : (selectedPackageObj?.PackageID || parseInt(formData.selectedPackage) || null),
                    packageName: isIndividual ? null : (selectedPackageObj?.PackageName || null),
                    billingPeriod: isIndividual ? null : formData.billingPeriod,
                    serviceType: formData.serviceType,
                    franchiseeId: user.FranchiseeID || 1,
                    employeeId: user.EmployeeID || 9,
                    isAssociate: true,
                    AssociateID: user.id || null,
                    sourceOfSale: "Associate",
                    StateService: formData.serviceState
                };
                console.log("Creation Payload:", payload);
                const response = await DealsApi.convertToDeal(payload);
                if (response.success) { onSuccess?.(); onClose(); } else setErrors({ api: response.message || "Failed to create deal" });
            }
        } catch (error) {
            setErrors({ api: error.response?.data?.message || "An error occurred" });
        } finally { setIsSubmitting(false); }
    };

    const CategoryOption = (props) => (
        <components.Option {...props}>
            <div className="flex items-center justify-between w-full">
                <span>{props.data.label}</span>
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenServicePopup(props.data); }}
                    className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-400">
                    <Eye className="w-4 h-4" />
                </button>
            </div>
        </components.Option>
    );

    if (!isOpen) return null;

    return (
        <>
            <AnimatePresence>
                {servicePopup.open && (
                    <ServiceDetailsPopup category={servicePopup.category} services={servicePopup.services || []}
                        onClose={() => setServicePopup({ open: false, category: null })} />
                )}
            </AnimatePresence>

            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
                    className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                        <h2 className="text-lg font-bold text-gray-900">{deal ? "Edit Deal" : "Create Deal"}</h2>
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    {/* Step Indicator */}
                    <div className="px-6 pt-5 flex-shrink-0">
                        <StepIndicator currentStep={step} />
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-100 mx-0 flex-shrink-0" />

                    {/* Body */}
                    <div className="overflow-y-auto flex-1 px-6 py-5">
                        <AnimatePresence mode="wait">

                            {/* ── STEP 1: Company Info ── */}
                            {step === 1 && (
                                <motion.div key="step1" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="space-y-5">
                                    <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                                        {/* Company Name */}
                                        <div className="col-span-2 relative">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <FieldLabel icon={Building2} label="Company Name" required />
                                                {!selectedExistingCompany && <IfExistingButton active={useExistingCompany} onClick={toggleExistingCompany} />}
                                            </div>
                                            {useExistingCompany ? (
                                                <div className="relative">
                                                    <button type="button" onClick={() => setShowCompanyDropdown(v => !v)}
                                                        className={`w-full px-3 py-2.5 bg-white border rounded-lg text-left flex items-center justify-between transition-all text-sm ${selectedExistingCompany ? "border-yellow-400 ring-2 ring-yellow-100" : "border-gray-200 hover:border-yellow-300"}`}>
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                            <span className={selectedExistingCompany ? "text-gray-800 font-medium truncate" : "text-gray-300 truncate"}>
                                                                {selectedExistingCompany ? (selectedExistingCompany.BusinessName || selectedExistingCompany.name || selectedExistingCompany.CompanyName) : (isFetchingCompanies ? "Loading…" : "Select existing company…")}
                                                            </span>
                                                        </div>
                                                        {isFetchingCompanies ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" /> : <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCompanyDropdown ? "rotate-180" : ""}`} />}
                                                    </button>
                                                    <AnimatePresence>
                                                        {showCompanyDropdown && (
                                                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                                                                className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                                                                <div className="p-2 border-b border-gray-100 bg-gray-50">
                                                                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                                                                        <Search className="w-3.5 h-3.5 text-gray-400" />
                                                                        <input type="text" value={companySearch} onChange={(e) => setCompanySearch(e.target.value)} placeholder="Search company..." className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-300" />
                                                                        {companySearch && <button onClick={() => setCompanySearch("")}><X className="w-3 h-3 text-gray-400" /></button>}
                                                                    </div>
                                                                </div>
                                                                <div className="max-h-52 overflow-y-auto">
                                                                    {associateCompanies.filter(c => (c.BusinessName || c.CompanyName || "").toLowerCase().includes(companySearch.toLowerCase())).length === 0 ? (
                                                                        <div className="flex flex-col items-center py-6 text-gray-400"><Building2 className="w-7 h-7 mb-1 opacity-30" /><p className="text-sm">No companies found</p></div>
                                                                    ) : associateCompanies.filter(c => (c.BusinessName || c.CompanyName || "").toLowerCase().includes(companySearch.toLowerCase())).map((company, idx) => (
                                                                        <button key={company.CompanyID || idx} type="button" onClick={() => { handleSelectExistingCompany(company); setShowCompanyDropdown(false); setCompanySearch(""); }}
                                                                            className="w-full px-4 py-2.5 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-center gap-3">
                                                                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center"><Building2 className="w-3.5 h-3.5 text-gray-500" /></div>
                                                                            <div><p className="text-sm font-semibold text-gray-800">{company.BusinessName || company.CompanyName}</p><p className="text-xs text-gray-400">{company.GSTNumber || company.CompanyGST || ""}</p></div>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                    {selectedExistingCompany && (
                                                        <div className="mt-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-yellow-600" /><span className="text-xs text-yellow-700 font-semibold">Company details autofilled</span></div>
                                                            <button type="button" onClick={() => { setSelectedExistingCompany(null); setAssociateCustomersForCompany([]); setSelectedExistingCustomer(null); setShowCompanyDropdown(true); }} className="text-xs text-gray-400 hover:text-gray-600">Change</button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Enter company name" className={inputCls(errors.companyName)} />
                                            )}
                                            {errors.companyName && <p className="text-xs text-red-500 mt-1">{errors.companyName}</p>}
                                        </div>

                                        {/* Company GST */}
                                        <div className="col-span-2">
                                            <FieldLabel icon={Hash} label="Company GST" />
                                            <input type="text" name="companyGST" value={formData.companyGST} onChange={handleChange} placeholder="Enter company GST number" className={inputCls(false)} />
                                        </div>

                                        {/* Company Mobile */}
                                        <div>
                                            <FieldLabel icon={Phone} label="Company Mobile" />
                                            <input type="text" name="companyMobile" value={formData.companyMobile} onChange={handleChange} placeholder="Enter company mobile number" className={inputCls(false)} />
                                        </div>

                                        {/* Company Email */}
                                        <div>
                                            <FieldLabel icon={Mail} label="Company Email" />
                                            <input type="email" name="companyEmail" value={formData.companyEmail} onChange={handleChange} placeholder="Enter company email address" className={inputCls(false)} />
                                        </div>

                                        {/* Company Country */}
                                        <div>
                                            <FieldLabel icon={Globe} label="Company Country" />
                                            <input type="text" name="companyCountry" value={formData.companyCountry} onChange={handleChange} className={inputCls(false)} />
                                        </div>

                                        {/* Company State */}
                                        <div>
                                            <FieldLabel icon={MapPin} label="Company State" required />
                                            <Select options={locationData.states.map((s) => ({ value: s.stateName, label: s.stateName }))}
                                                value={formData.companyState ? { value: formData.companyState, label: formData.companyState } : null}
                                                onChange={(sel) => setFormData({ ...formData, companyState: sel?.value || "", companyDistrict: "" })}
                                                placeholder="Enter company state" isSearchable styles={rsStyles(errors.companyState)} />
                                            {errors.companyState && <p className="text-xs text-red-500 mt-1">{errors.companyState}</p>}
                                        </div>

                                        {/* Company District */}
                                        <div>
                                            <FieldLabel icon={MapPin} label="Company District" required />
                                            <Select options={availableCompanyDistricts.map((d) => ({ value: d.districtName, label: d.districtName }))}
                                                value={formData.companyDistrict ? { value: formData.companyDistrict, label: formData.companyDistrict } : null}
                                                onChange={(sel) => setFormData({ ...formData, companyDistrict: sel?.value || "" })}
                                                placeholder="Enter company district" isSearchable isDisabled={!formData.companyState}
                                                styles={rsStyles(errors.companyDistrict)} />
                                            {errors.companyDistrict && <p className="text-xs text-red-500 mt-1">{errors.companyDistrict}</p>}
                                        </div>

                                        {/* Company Preferred Language */}
                                        <div>
                                            <FieldLabel icon={Languages} label="Company Preferred Language" />
                                            <div className="relative">
                                                <select name="companyPreferredLanguage" value={formData.companyPreferredLanguage} onChange={handleChange}
                                                    className={inputCls(false) + " appearance-none"}>
                                                    <option value=""></option>
                                                    <option value="Malayalam">Malayalam</option>
                                                    <option value="English">English</option>
                                                    <option value="Hindi">Hindi</option>
                                                    <option value="Tamil">Tamil</option>
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Company Pin Code */}
                                        <div className="col-span-2">
                                            <FieldLabel icon={MapPin} label="Company Pin Code" />
                                            <input type="text" name="companyPincode" value={formData.companyPincode} onChange={handleChange} placeholder="Enter company pin code" className={inputCls(false)} />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── STEP 2: Service Info ── */}
                            {step === 2 && (
                                <motion.div key="step2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
                                    {/* State where you need Service */}
                                    <div>
                                        <FieldLabel icon={MapPin} label="State where you need Service" required />
                                        <Select options={availableStates.map((s) => ({ value: s.state_name, label: s.state_name }))}
                                            value={formData.serviceState ? { value: formData.serviceState, label: formData.serviceState } : null}
                                            onChange={(sel) => setFormData({ ...formData, serviceState: sel?.value || "" })}
                                            placeholder="" isSearchable styles={rsStyles(errors.serviceState)} />
                                        {errors.serviceState && <p className="text-xs text-red-500 mt-1">{errors.serviceState}</p>}
                                    </div>

                                    {/* Individual / Package toggle */}
                                    <div>
                                        <FieldLabel icon={Briefcase} label="Individual / Package Service" required />
                                        <div className="grid grid-cols-2 gap-3">
                                            {["individual", "package"].map((type) => (
                                                <button key={type} type="button"
                                                    onClick={() => { if (formData.serviceState) handleChange({ target: { name: "serviceType", value: type } }); }}
                                                    disabled={!formData.serviceState}
                                                    className={`py-2.5 rounded-full text-sm font-semibold transition-all capitalize border
                                                        ${formData.serviceType === type
                                                            ? "bg-yellow-400 text-gray-900 border-yellow-400 shadow-sm"
                                                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"} 
                                                        disabled:opacity-40 disabled:cursor-not-allowed`}>
                                                    {type === "individual" ? "Individual" : "Package"}
                                                </button>
                                            ))}
                                        </div>
                                        {!formData.serviceState && <p className="text-xs text-gray-400 mt-1.5">Please select a state first</p>}
                                    </div>

                                    {formData.serviceType === "individual" ? (
                                        <>
                                            {/* Service Category */}
                                            <div>
                                                <FieldLabel icon={Tag} label="Service Category" required />
                                                <Select
                                                    options={serviceCategories.map((c) => ({ value: c.CategoryID, label: c.CategoryName }))}
                                                    value={formData.serviceCategory ? { value: formData.serviceCategory, label: serviceCategories.find((c) => parseInt(c.CategoryID) === parseInt(formData.serviceCategory))?.CategoryName || "Selected Category" } : null}
                                                    onChange={(sel) => setFormData({ ...formData, serviceType: "individual", serviceCategory: sel?.value || "" })}
                                                    placeholder="" isSearchable isDisabled={!formData.serviceState}
                                                    styles={rsStyles(errors.serviceCategory)}
                                                    components={{ Option: CategoryOption }}
                                                />
                                                {errors.serviceCategory && <p className="text-xs text-red-500 mt-1">{errors.serviceCategory}</p>}
                                            </div>

                                            {/* Services as chips */}
                                            <div>
                                                <FieldLabel icon={FileText} label="Services" />
                                                {availableServices.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {availableServices.map((service) => {
                                                            const isSelected = formData.selectedServices.includes(service.ServiceID);
                                                            return (
                                                                <button key={service.ServiceID} type="button"
                                                                    onClick={() => handleServiceToggle(service.ServiceID)}
                                                                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                                                                        ${isSelected
                                                                            ? "bg-yellow-400 text-gray-900 border-yellow-400"
                                                                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}>
                                                                    {service.ServiceName}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-400">{!formData.serviceCategory ? "Please select a service category first" : "No services available"}</p>
                                                )}
                                                {errors.selectedServices && <p className="text-xs text-red-500 mt-1">{errors.selectedServices}</p>}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* Package Name */}
                                            <div>
                                                <FieldLabel icon={Briefcase} label="Package Name" required />
                                                <div className="relative">
                                                    <select name="selectedPackage" value={formData.selectedPackage || ""} onChange={handleChange}
                                                        disabled={!formData.serviceState}
                                                        className={inputCls(errors.selectedPackage) + " appearance-none disabled:bg-gray-50 disabled:cursor-not-allowed"}>
                                                        <option value="">Select Package</option>
                                                        {availablePackages.map((pkg) => (<option key={pkg.PackageID} value={pkg.PackageID}>{pkg.PackageName}</option>))}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                </div>
                                                {errors.selectedPackage && <p className="text-xs text-red-500 mt-1">{errors.selectedPackage}</p>}
                                            </div>

                                            {/* Billing Period */}
                                            <div>
                                                <FieldLabel icon={Calendar} label="Billing Period" />
                                                <div className="grid grid-cols-2 gap-3">
                                                    {["monthly", "yearly"].map((period) => (
                                                        <button key={period} type="button"
                                                            onClick={() => { if (formData.selectedPackage) handleChange({ target: { name: "billingPeriod", value: period } }); }}
                                                            disabled={!formData.selectedPackage}
                                                            className={`py-2.5 rounded-full text-sm font-semibold transition-all capitalize border
                                                                ${formData.billingPeriod === period
                                                                    ? "bg-yellow-400 text-gray-900 border-yellow-400"
                                                                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}
                                                                disabled:opacity-40 disabled:cursor-not-allowed`}>
                                                            {period === "monthly" ? "Monthly" : "Yearly"}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}

                            {/* ── STEP 3: Customer Info ── */}
                            {step === 3 && (
                                <motion.div key="step3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
                                    {/* Direct Contact Toggle */}
                                    <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                                <Phone className="w-4 h-4 text-gray-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">Direct contact</p>
                                                <p className="text-xs text-gray-400">Enable for direct customer communication</p>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, communication: !prev.communication }))}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${formData.communication ? "bg-yellow-400" : "bg-gray-300"}`}>
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-300 ${formData.communication ? "translate-x-6" : "translate-x-1"}`} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                                        {/* Customer Name */}
                                        <div className="relative col-span-2">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <FieldLabel icon={Users} label="First Name" required />
                                                {!selectedExistingCustomer && <IfExistingButton active={useExistingCustomer} onClick={toggleExistingCustomer} />}
                                            </div>
                                            {useExistingCustomer ? (
                                                <div className="relative">
                                                    <button type="button" onClick={() => setShowCustomerDropdown(v => !v)}
                                                        className={`w-full px-3 py-2.5 bg-white border rounded-lg text-left flex items-center justify-between transition-all text-sm ${selectedExistingCustomer ? "border-yellow-400 ring-2 ring-yellow-100" : "border-gray-200 hover:border-yellow-300"}`}>
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                            <span className={selectedExistingCustomer ? "text-gray-800 font-medium truncate" : "text-gray-300 truncate"}>
                                                                {selectedExistingCustomer ? (selectedExistingCustomer.FirstName || formData.firstName || selectedExistingCustomer.CustomerName || selectedExistingCustomer.name || "") : (isFetchingCustomers ? "Loading…" : "Select existing customer…")}
                                                            </span>
                                                        </div>
                                                        {isFetchingCustomers ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" /> : <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCustomerDropdown ? "rotate-180" : ""}`} />}
                                                    </button>
                                                    <AnimatePresence>
                                                        {showCustomerDropdown && (
                                                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                                                                className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                                                                <div className="p-2 border-b border-gray-100 bg-gray-50">
                                                                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                                                                        <Search className="w-3.5 h-3.5 text-gray-400" />
                                                                        <input type="text" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search customer..." className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-300" />
                                                                        {customerSearch && <button onClick={() => setCustomerSearch("")}><X className="w-3 h-3 text-gray-400" /></button>}
                                                                    </div>
                                                                </div>
                                                                <div className="max-h-52 overflow-y-auto">
                                                                    {associateCustomersForCompany.filter(c => (c.CustomerName || c.name || "").toLowerCase().includes(customerSearch.toLowerCase())).length === 0 ? (
                                                                        <div className="flex flex-col items-center py-6 text-gray-400"><Users className="w-7 h-7 mb-1 opacity-30" /><p className="text-sm">No customers found</p></div>
                                                                    ) : associateCustomersForCompany.filter(c => (c.CustomerName || c.name || "").toLowerCase().includes(customerSearch.toLowerCase())).map((customer, idx) => (
                                                                        <button key={customer.CustomerID || idx} type="button" onClick={() => { handleSelectExistingCustomer(customer); setShowCustomerDropdown(false); setCustomerSearch(""); }}
                                                                            className="w-full px-4 py-2.5 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-center gap-3">
                                                                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center"><Users className="w-3.5 h-3.5 text-gray-500" /></div>
                                                                            <div><p className="text-sm font-semibold text-gray-800">{customer.CustomerName || customer.name || `${customer.FirstName || ''} ${customer.LastName || ''}`.trim()}</p><p className="text-xs text-gray-400">{customer.CustomerCode || customer.Email || ""}</p></div>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                    {selectedExistingCustomer && (
                                                        <div className="mt-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-yellow-600" /><span className="text-xs text-yellow-700 font-semibold">Customer details autofilled</span></div>
                                                            <button type="button" onClick={() => { setSelectedExistingCustomer(null); setShowCustomerDropdown(true); }} className="text-xs text-gray-400 hover:text-gray-600">Change</button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Enter first name" className={inputCls(errors.firstName)} />
                                            )}
                                            {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
                                        </div>

                                        {/* Last Name */}
                                        <div className="col-span-2">
                                            <FieldLabel icon={Users} label="Last Name" />
                                            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Enter last name" className={inputCls(false)} />
                                        </div>

                                        {/* Mobile */}
                                        <div>
                                            <FieldLabel icon={Phone} label="Customer Mobile" required />
                                            <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="Enter customer mobile number" className={inputCls(errors.mobile)} />
                                            {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>}
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <FieldLabel icon={Mail} label="Customer Email" required />
                                            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter customer email address" className={inputCls(errors.email)} />
                                            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                                        </div>

                                        {/* Country */}
                                        <div>
                                            <FieldLabel icon={Globe} label="Customer Country" />
                                            <input type="text" name="country" value={formData.country} onChange={handleChange} className={inputCls(false)} />
                                        </div>

                                        {/* State */}
                                        <div>
                                            <FieldLabel icon={MapPin} label="Customer State" required />
                                            <Select options={locationData.states.map((s) => ({ value: s.stateName, label: s.stateName }))}
                                                value={formData.state ? { value: formData.state, label: formData.state } : null}
                                                onChange={(sel) => setFormData({ ...formData, state: sel?.value || "", district: "" })}
                                                placeholder="Enter customer state" isSearchable styles={rsStyles(errors.state)} />
                                            {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
                                        </div>

                                        {/* District */}
                                        <div>
                                            <FieldLabel icon={MapPin} label="Customer District" required />
                                            <Select options={availableDistricts.map((d) => ({ value: d.districtName, label: d.districtName }))}
                                                value={formData.district ? { value: formData.district, label: formData.district } : null}
                                                onChange={(sel) => setFormData({ ...formData, district: sel?.value || "" })}
                                                placeholder="Enter customer district" isSearchable isDisabled={!formData.state} styles={rsStyles(errors.district)} />
                                            {errors.district && <p className="text-xs text-red-500 mt-1">{errors.district}</p>}
                                        </div>

                                        {/* Preferred Language */}
                                        <div>
                                            <FieldLabel icon={Languages} label="Customer Preferred Language" />
                                            <div className="relative">
                                                <select name="preferredLanguage" value={formData.preferredLanguage} onChange={handleChange} className={inputCls(false) + " appearance-none"}>
                                                    <option value=""></option>
                                                    <option value="Malayalam">Malayalam</option>
                                                    <option value="English">English</option>
                                                    <option value="Hindi">Hindi</option>
                                                    <option value="Tamil">Tamil</option>
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Pin Code */}
                                        <div>
                                            <FieldLabel icon={MapPin} label="Customer Pin Code" />
                                            <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} placeholder="Enter customer pin code" className={inputCls(false)} />
                                        </div>

                                        {/* Closure Date */}
                                        <div className="col-span-2">
                                            <FieldLabel icon={Calendar} label="Closure Date" required />
                                            <input type="date" name="closureDate" value={formData.closureDate} onChange={handleChange} className={inputCls(errors.closureDate)} />
                                            {errors.closureDate && <p className="text-xs text-red-500 mt-1">{errors.closureDate}</p>}
                                        </div>
                                    </div>
                                    {errors.api && <p className="text-sm text-red-500 text-center py-2">{errors.api}</p>}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
                        <button onClick={step === 1 ? onClose : handleBack}
                            className="px-6 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                            {step === 1 ? "Cancel" : "Previous"}
                        </button>
                        {step < 3 ? (
                            <button onClick={handleNext} className="px-8 py-2.5 text-sm font-bold bg-yellow-400 text-gray-900 hover:bg-yellow-500 rounded-full transition-colors shadow-sm">
                                Next
                            </button>
                        ) : (
                            <button onClick={handleSubmit} disabled={isSubmitting}
                                className="px-8 py-2.5 text-sm font-bold bg-yellow-400 text-gray-900 hover:bg-yellow-500 rounded-full transition-colors shadow-sm disabled:opacity-60 flex items-center gap-2">
                                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />{deal ? "Updating..." : "Creating..."}</> : (deal ? "Update Deal" : "Create Deal")}
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </>
    );
};

export default AddDealModal;

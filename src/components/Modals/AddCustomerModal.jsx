import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Search, Building2, Users, Plus, Trash2, CheckCircle, Smartphone, Mail, Globe } from "lucide-react";
import locationData from "../../utils/statesAndDistricts.json";
import DealsApi from "../../api/DealsApi";
import { getSecureItem } from "../../utils/secureStorage";
import { toast } from "react-toastify";
import { sanitize, validate, isIndia } from "../../utils/formValidation";

const sanitizePan = (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);

// Customer fields whose sanitizer doesn't depend on another field (pincode depends on country)
const CUSTOMER_SANITIZERS = {
    firstName: sanitize.personName,
    lastName: sanitize.personName,
    mobile: sanitize.mobile,
    email: sanitize.email,
    country: sanitize.country,
    pan: sanitizePan,
};

const COMPANY_SANITIZERS = {
    name: sanitize.text(150),
    gst: sanitize.gstin,
    mobile: sanitize.mobile,
    email: sanitize.email,
    country: sanitize.country,
    pan: sanitizePan,
    cin: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 21),
    website: (v) => v.replace(/\s/g, "").slice(0, 200),
};

const companyErrorKey = (id, field) => `company_${id}_${field}`;

const companyInputBorder = (error) => (error ? "border-red-500" : "border-gray-100");

// --- Existing Entity Dropdown ---
const ExistingEntityDropdown = ({ type, onSelect, onClose, apiUrl }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef(null);
    const searchTimeout = useRef(null);

    const fetchEntities = useCallback(async (searchQuery) => {
        setIsLoading(true);
        try {
            const user = getSecureItem("partnerUser") || {};
            const associateId = user.id || null;

            const endpoint = `${apiUrl}/${type === "customer" ? "customer" : "company"}/associate-list`;

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getSecureItem("partnerToken")}`
                },
                body: JSON.stringify({
                    AssociateID: associateId,
                    search: searchQuery || "",
                    page: 1,
                    limit: 50
                })
            });

            const data = await response.json();

            if (data.success && Array.isArray(data.data)) {
                let fetchedResults = data.data;

                // ✅ Backup client-side filtering (in case backend ignores search)
                if (searchQuery) {
                    const lowerQuery = searchQuery.toLowerCase();

                    fetchedResults = fetchedResults.filter(item =>
                        (item.CustomerName || item.BusinessName || item.name || "")
                            .toLowerCase()
                            .includes(lowerQuery) ||
                        (item.Mobile || item.CompanyMobile || "")
                            .toLowerCase()
                            .includes(lowerQuery) ||
                        (item.GSTNumber || "")
                            .toLowerCase()
                            .includes(lowerQuery)
                    );
                }

                setResults(fetchedResults);
            } else {
                setResults([]);
            }

        } catch (err) {
            console.error(`Error fetching ${type}s:`, err);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [type, apiUrl]);


    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            fetchEntities(query);
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [query, fetchEntities]);

    useEffect(() => {
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            fetchEntities(query);
        }, 300);
        return () => clearTimeout(searchTimeout.current);
    }, [query, fetchEntities]);

    useEffect(() => {
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) onClose();
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [onClose]);

    return (
        <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-[100] w-80 right-0 mt-2 bg-white border border-yellow-100 rounded-2xl shadow-2xl shadow-yellow-200/50 overflow-hidden"
        >
            <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-yellow-400/20 transition-all">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                        autoFocus
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={`Search ${type}...`}
                        className="flex-1 text-sm outline-none"
                    />
                </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
                {isLoading ? (
                    <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-yellow-500" /></div>
                ) : results.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-500">No results found</div>
                ) : (
                    results.map((item) => (
                        <button
                            key={item.id || item.CustomerID || item.CompanyID}
                            onClick={() => onSelect(item)}
                            className="w-full px-4 py-3 text-left hover:bg-yellow-50 transition-colors border-b border-gray-50 last:border-0"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
                                    {type === "customer" ? <Users className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate">{item.CustomerName || item.BusinessName || item.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{item.Mobile || item.CompanyMobile || item.GSTNumber}</p>
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </motion.div>
    );
};

const AddCustomerModal = ({ isOpen, onClose, onSuccess, initialData }) => {
    const [activeTab, setActiveTab] = useState("customer");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCompanySearch, setShowCompanySearch] = useState(false);
    const [errors, setErrors] = useState({});
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    const [customerData, setCustomerData] = useState({
        firstName: "",
        lastName: "",
        mobile: "",
        email: "",
        pan: "",
        country: "India",
        state: "",
        district: "",
        pincode: "",
        preferredLanguage: "",
        closureDate: "",
        communication: false,
        isCompanyRegistered: false
    });

    const [companies, setCompanies] = useState([
        {
            id: Date.now(),
            name: "",
            pan: "",
            gst: "",
            cin: "",
            email: "",
            mobile: "",
            constitutionCategory: "",
            sector: "",
            businessNature: "",
            website: "",
            country: "India",
            state: "",
            district: "",
            pincode: "",
            preferredLanguage: "", // ✅ added
            isPrimary: true,
            isExisting: false,
            existingCompanyId: null
        }
    ]);

    useEffect(() => {
        if (isOpen && initialData) {
            setCustomerData({
                CustomerID: initialData.CustomerID,
                firstName: initialData.FirstName || "",
                lastName: initialData.LastName || "",
                mobile: initialData.Mobile || "",
                email: initialData.Email || "",
                pan: initialData.PANNumber || "",
                country: initialData.Country || "India",
                state: initialData.State || "",
                district: initialData.District || "",
                pincode: initialData.PinCode || "",
                preferredLanguage: initialData.PreferredLanguage || "",
                communication: !!initialData.communication,
                isCompanyRegistered: !!initialData.IsComponyRegistered
            });

            if (initialData.Companies && initialData.Companies.length > 0) {
                setCompanies(initialData.Companies.map(c => ({
                    id: c.CompanyID || Date.now() + Math.random(),
                    CompanyID: c.CompanyID,
                    name: c.BusinessName || "",
                    pan: c.CompanyPAN || "",
                    gst: c.GSTNumber || "",
                    cin: c.CIN || "",
                    email: c.CompanyEmail || "",
                    mobile: c.CompanyMobile || "",
                    constitutionCategory: c.ConstitutionCategory || "",
                    sector: c.Sector || "",
                    businessNature: c.BusinessNature || "",
                    website: c.Website || "",
                    country: c.Country || "India",
                    state: c.State || "",
                    district: c.District || "",
                    pincode: c.PinCode || "",
                    preferredLanguage: c.PreferredLanguage || "",
                    isPrimary: !!c.PrimaryCompany,
                    isExisting: false,
                    existingCompanyId: null
                })));
            }
        } else if (isOpen && !initialData) {
            setCustomerData({
                firstName: "",
                lastName: "",
                mobile: "",
                email: "",
                pan: "",
                country: "India",
                state: "",
                district: "",
                pincode: "",
                preferredLanguage: "",
                closureDate: "",
                communication: false,
                isCompanyRegistered: false
            });
            setCompanies([
                {
                    id: Date.now(),
                    name: "",
                    pan: "",
                    gst: "",
                    cin: "",
                    email: "",
                    mobile: "",
                    constitutionCategory: "",
                    sector: "",
                    businessNature: "",
                    website: "",
                    country: "India",
                    state: "",
                    district: "",
                    pincode: "",
                    preferredLanguage: "",
                    isPrimary: true,
                    isExisting: false,
                    existingCompanyId: null
                }
            ]);
        }
    }, [isOpen, initialData]);

    const handleCustomerChange = (e) => {
        const { name, value, type, checked } = e.target;
        let cleanValue = value;
        if (type !== 'checkbox') {
            if (name === "pincode") cleanValue = sanitize.postal(value, customerData.country);
            else if (CUSTOMER_SANITIZERS[name]) cleanValue = CUSTOMER_SANITIZERS[name](value);
        }
        setCustomerData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : cleanValue }));
        // Clear error when user types (a country change also invalidates the pincode check)
        const keysToClear = name === "country" ? [name, "pincode"] : [name];
        if (keysToClear.some(k => errors[k])) {
            setErrors(prev => {
                const newErrors = { ...prev };
                keysToClear.forEach(k => delete newErrors[k]);
                return newErrors;
            });
        }
    };

    const clearErrorKeys = (keys) => {
        setErrors(prev => {
            if (!keys.some(k => prev[k])) return prev;
            const newErrors = { ...prev };
            keys.forEach(k => delete newErrors[k]);
            return newErrors;
        });
    };

    const clearCompanyErrors = (id) => {
        setErrors(prev => {
            const prefix = `company_${id}_`;
            if (!Object.keys(prev).some(k => k.startsWith(prefix))) return prev;
            const newErrors = { ...prev };
            Object.keys(newErrors).forEach(k => {
                if (k.startsWith(prefix)) delete newErrors[k];
            });
            return newErrors;
        });
    };

    const handleCompanyChange = (id, field, value) => {
        setCompanies(prev => prev.map(c => {
            if (c.id !== id) return c;
            let cleanValue = value;
            if (field === "pincode") cleanValue = sanitize.postal(value, c.country);
            else if (COMPANY_SANITIZERS[field]) cleanValue = COMPANY_SANITIZERS[field](value);
            return { ...c, [field]: cleanValue };
        }));
        const keysToClear = [companyErrorKey(id, field)];
        if (field === "country") keysToClear.push(companyErrorKey(id, "pincode"));
        clearErrorKeys(keysToClear);
    };

    const addCompany = () => {
        setCompanies(prev => [
            ...prev,
            {
                id: Date.now(),
                name: "",
                pan: "",
                gst: "",
                cin: "",
                email: "",
                mobile: "",
                constitutionCategory: "",
                sector: "",
                businessNature: "",
                website: "",
                country: "India",
                state: "",
                district: "",
                pincode: "",
                preferredLanguage: "", // ✅ added
                isPrimary: false,
                isExisting: false,
                existingCompanyId: null
            }
        ]);
    };

    const removeCompany = (id) => {
        if (companies.length === 1) return;
        const removed = companies.find(c => c.id === id);
        setCompanies(prev => {
            const newList = prev.filter(c => c.id !== id);
            if (removed.isPrimary && newList.length > 0) {
                newList[0].isPrimary = true;
            }
            return newList;
        });
    };

    const setPrimaryCompany = (id) => {
        setCompanies(prev => prev.map(c => ({ ...c, isPrimary: c.id === id })));
    };

    const handleSelectExistingCompany = async (selected) => {
        const companyId = selected.CompanyID || selected.id;
        if (!companyId) return;

        try {
            const response = await DealsApi.getCompanyDetails(companyId);

            if (response.success && response.data) {
                const fullData = response.data;

                setCompanies(prev => {
                    const updated = [...prev];

                    // ✅ Always use the first company form (same form)
                    updated[0] = {
                        ...updated[0],
                        name: fullData.BusinessName || fullData.CompanyName || fullData.name || "",
                        pan: fullData.CompanyPAN || fullData.pan || "",
                        gst: fullData.GSTNumber || fullData.gst || "",
                        cin: fullData.CIN || "",
                        email: fullData.CompanyEmail || fullData.email || "",
                        mobile: fullData.CompanyMobile || fullData.mobile || "",
                        constitutionCategory: fullData.ConstitutionCategory || "",
                        sector: fullData.Sector || "",
                        businessNature: fullData.BusinessNature || "",
                        website: fullData.Website || "",
                        country: fullData.Country || "India",
                        state: fullData.State || "",
                        district: fullData.District || "",
                        pincode: fullData.PinCode || fullData.pincode || "",
                        preferredLanguage: fullData.PreferredLanguage || "",
                        isExisting: true,
                        existingCompanyId: companyId
                    };

                    return updated;
                });
                // Existing companies aren't validated, so drop any stale errors on that row
                clearCompanyErrors(companies[0]?.id);
            }
        } catch (err) {
            console.error("Error fetching company details:", err);
            toast.error("Failed to fetch full company details");
        }

        setShowCompanySearch(false);
    };



    // const handleNewCompanyEntry = () => {
    //     setShowCompanySearch(false);

    //     setCompanies(prev => [
    //         ...prev,
    //         {
    //             id: Date.now() + Math.random(),
    //             name: "",
    //             pan: "",
    //             gst: "",
    //             cin: "",
    //             email: "",
    //             mobile: "",
    //             constitutionCategory: "",
    //             sector: "",
    //             businessNature: "",
    //             website: "",
    //             country: "India",
    //             state: "",
    //             district: "",
    //             pincode: "",
    //             preferredLanguage: "",
    //             isPrimary: prev.length === 0,
    //             isExisting: false,
    //             existingCompanyId: null
    //         }
    //     ]);
    // };



    const validateCustomer = () => {
        const checks = {
            firstName: validate.personName(customerData.firstName, { required: true, label: "First name" }),
            lastName: validate.personName(customerData.lastName, { required: true, label: "Last name", min: 1 }),
            mobile: validate.mobile(customerData.mobile, { required: true }),
            email: validate.email(customerData.email, { required: true }),
            country: validate.country(customerData.country),
            pincode: validate.postal(customerData.pincode, customerData.country),
            state: customerData.state ? "" : "Please select state",
            district: customerData.district ? "" : "Please select district",
        };

        const newErrors = {};
        Object.entries(checks).forEach(([field, message]) => {
            if (message) newErrors[field] = message;
        });
        return newErrors;
    };

    // Rows picked from the existing-company search are read-only, so only new/edited rows are checked
    const validateCompanies = () => {
        const newErrors = {};

        companies.forEach(company => {
            if (company.isExisting) return;

            const checks = {
                gst: validate.gstin(company.gst),
                mobile: validate.mobile(company.mobile),
                email: validate.email(company.email),
                country: validate.country(company.country),
                pincode: validate.postal(company.pincode, company.country),
            };

            Object.entries(checks).forEach(([field, message]) => {
                if (message) newErrors[companyErrorKey(company.id, field)] = message;
            });
        });

        return newErrors;
    };

    const handleNextStep = () => {
        const newErrors = validateCustomer();

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error("Please fill all required fields correctly");
            return;
        }

        setErrors({});
        setActiveTab("company");
    };

    const handleClearCompanyForm = () => {
        setCompanies(prev => {
            const updated = [...prev];

            updated[0] = {
                ...updated[0],
                name: "",
                pan: "",
                gst: "",
                cin: "",
                email: "",
                mobile: "",
                constitutionCategory: "",
                sector: "",
                businessNature: "",
                website: "",
                country: "India",
                state: "",
                district: "",
                pincode: "",
                preferredLanguage: "",
                isExisting: false,
                existingCompanyId: null
            };

            return updated;
        });
        clearCompanyErrors(companies[0]?.id);
    };

    const handleSubmit = async () => {
        const customerErrors = validateCustomer();
        const companyErrors = validateCompanies();
        const newErrors = { ...customerErrors, ...companyErrors };

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error("Please fill all required fields correctly");
            setActiveTab(Object.keys(customerErrors).length > 0 ? "customer" : "company");
            return;
        }

        setIsSubmitting(true);
        try {
            const user = getSecureItem("partnerUser") || {};

            const payload = {
                customer: {
                    ...customerData,
                    city: customerData.district // Map district back to city for backend
                },
                companies: companies.map(c => ({
                    ...c,
                    city: c.district, // keep existing mapping

                    // ✅ ADD THIS
                    PrimaryCompany: c.isPrimary ? 1 : 0

                })),
                franchiseeId: user.FranchiseeID || 1,
                AssociateID: user.id
            };

            const result = await DealsApi.saveAssociateCustomer(payload);
            if (result.success) {
                toast.success(customerData.CustomerID ? "Customer updated successfully" : "Customer added successfully");
                onSuccess();
                onClose();
            } else {
                toast.error(result.message || (customerData.CustomerID ? "Failed to update customer" : "Failed to add customer"));
            }
        } catch (err) {
            toast.error("Error connecting to server", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col h-[90vh] overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-yellow-600 to-yellow-700 text-white">
                    <div>
                        <h2 className="text-xl font-bold">{customerData.CustomerID ? "Edit Customer" : "Add New Customer"}</h2>
                        <p className="text-yellow-100 text-sm mt-1">
                            {customerData.CustomerID ? "Update customer profile and linked companies" : "Create a new customer profile and link companies"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 py-4 flex gap-8 border-b border-gray-100 bg-gray-50/50">
                    <button
                        onClick={() => setActiveTab("customer")}
                        className={`flex items-center gap-2 pb-2 px-1 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === "customer" ? "text-yellow-600" : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        Customer Details
                        {activeTab === "customer" && <motion.div layoutId="tabLine" className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400 rounded-full" />}
                    </button>
                    <button
                        onClick={() => {
                            if (activeTab === "customer") {
                                handleNextStep();
                            } else {
                                setActiveTab("company");
                            }
                        }}
                        className={`flex items-center gap-2 pb-2 px-1 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === "company" ? "text-yellow-600" : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        <Building2 className="w-4 h-4" />
                        Company Details
                        {activeTab === "company" && <motion.div layoutId="tabLine" className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400 rounded-full" />}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {activeTab === "customer" ? (
                            <motion.div
                                key="customer-tab"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >

                                {/* Customer Names */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-600">
                                            First Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={customerData.firstName}
                                            onChange={handleCustomerChange}
                                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-yellow-400/20 text-sm transition-all ${errors.firstName ? "border-red-500 focus:ring-red-500/20" : "border-gray-200"
                                                }`}
                                            placeholder="Enter first name"
                                        />
                                        {errors.firstName && <p className="text-xs text-red-500 mt-1 font-medium">{errors.firstName}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-600">
                                            Last Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="lastName"
                                            value={customerData.lastName}
                                            onChange={handleCustomerChange}
                                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-yellow-400/20 text-sm transition-all ${errors.lastName ? "border-red-500 focus:ring-red-500/20" : "border-gray-200"
                                                }`}
                                            placeholder="Enter last name"
                                        />
                                        {errors.lastName && <p className="text-xs text-red-500 mt-1 font-medium">{errors.lastName}</p>}
                                    </div>
                                </div>

                                {/* Mobile */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-600">
                                        Mobile <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="mobile"
                                        value={customerData.mobile}
                                        onChange={handleCustomerChange}
                                        inputMode="numeric"
                                        maxLength={10}
                                        className={`w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-yellow-400/20 text-sm transition-all ${errors.mobile ? "border-red-500 focus:ring-red-500/20" : "border-gray-200"
                                            }`}
                                        placeholder="10-digit mobile number"
                                    />
                                    {errors.mobile && <p className="text-xs text-red-500 mt-1 font-medium">{errors.mobile}</p>}
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-600">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={customerData.email}
                                        onChange={handleCustomerChange}
                                        className={`w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-yellow-400/20 text-sm transition-all ${errors.email ? "border-red-500 focus:ring-red-500/20" : "border-gray-200"
                                            }`}
                                        placeholder="Enter email address"
                                    />
                                    {errors.email && <p className="text-xs text-red-500 mt-1 font-medium">{errors.email}</p>}
                                </div>

                                {/* Country + Pincode */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-600">
                                            Country
                                        </label>
                                        <input
                                            type="text"
                                            name="country"
                                            value={customerData.country}
                                            onChange={handleCustomerChange}
                                            disabled
                                            className={`w-full px-4 py-3 bg-gray-100 border rounded-xl outline-none text-sm ${errors.country ? "border-red-500" : "border-gray-200"}`}
                                        />
                                        {errors.country && <p className="text-xs text-red-500 mt-1 font-medium">{errors.country}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-600">
                                            Pincode
                                        </label>
                                        <input
                                            type="text"
                                            name="pincode"
                                            value={customerData.pincode}
                                            onChange={handleCustomerChange}
                                            inputMode={isIndia(customerData.country) ? "numeric" : "text"}
                                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-yellow-400/20 text-sm transition-all ${errors.pincode ? "border-red-500 focus:ring-red-500/20" : "border-gray-200"
                                                }`}
                                            placeholder={isIndia(customerData.country) ? "6-digit PIN code" : "Enter postal / ZIP code"}
                                        />
                                        {errors.pincode && <p className="text-xs text-red-500 mt-1 font-medium">{errors.pincode}</p>}
                                    </div>
                                </div>

                                {/* State + District */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-600">
                                            State <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="state"
                                            value={customerData.state}
                                            onChange={handleCustomerChange}
                                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-yellow-400/20 text-sm transition-all ${errors.state ? "border-red-500 focus:ring-red-500/20" : "border-gray-200"
                                                }`}
                                        >
                                            <option value="">Search or select state</option>
                                            {locationData.states.map(s => (
                                                <option key={s.stateName} value={s.stateName}>
                                                    {s.stateName}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.state && <p className="text-xs text-red-500 mt-1 font-medium">{errors.state}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-600">
                                            District <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="district"
                                            value={customerData.district}
                                            onChange={handleCustomerChange}
                                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-yellow-400/20 text-sm transition-all ${errors.district ? "border-red-500 focus:ring-red-500/20" : "border-gray-200"
                                                }`}
                                        >
                                            <option value="">Search or select district</option>
                                            {customerData.state &&
                                                locationData.states
                                                    .find(s => s.stateName === customerData.state)
                                                    ?.districts.map(d => (
                                                        <option key={d.districtName} value={d.districtName}>
                                                            {d.districtName}
                                                        </option>
                                                    ))}
                                        </select>
                                        {errors.district && <p className="text-xs text-red-500 mt-1 font-medium">{errors.district}</p>}
                                    </div>
                                </div>

                                {/* Preferred Language */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-600">
                                        Preferred Language
                                    </label>
                                    <select
                                        name="preferredLanguage"
                                        value={customerData.preferredLanguage}
                                        onChange={handleCustomerChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400/20 text-sm"
                                    >
                                        <option value="">Select Language</option>
                                        <option value="English">English</option>
                                        <option value="Hindi">Hindi</option>
                                        <option value="Malayalam">Malayalam</option>
                                        <option value="Tamil">Tamil</option>
                                        <option value="Kannada">Kannada</option>
                                    </select>
                                </div>

                            </motion.div>
                        ) : (
                            <motion.div
                                key="company-tab"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-bold text-gray-700">Company (Primary & Others)</h4>
                                    <div className="relative">
                                        <button
                                            onClick={() => {
                                                if (companies[0]?.isExisting) {
                                                    handleClearCompanyForm();
                                                } else {
                                                    setShowCompanySearch(!showCompanySearch);
                                                }
                                            }}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${companies[0]?.isExisting
                                                ? "bg-yellow-400 text-black hover:bg-yellow-500"
                                                : "bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
                                                }`}
                                        >
                                            <Search className="w-4 h-4" />
                                            {companies[0]?.isExisting ? "New Entry" : "If Existing"}
                                        </button>
                                        <AnimatePresence>
                                            {showCompanySearch && (
                                                <ExistingEntityDropdown
                                                    type="company"
                                                    apiUrl={API_BASE_URL}
                                                    onSelect={handleSelectExistingCompany}
                                                    onClose={() => setShowCompanySearch(false)}
                                                />
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {companies.map((company) => (
                                    <motion.div
                                        key={company.id}
                                        layout
                                        className={`relative p-8 rounded-3xl border-2 transition-all duration-300 ${company.isPrimary ? 'border-yellow-600 bg-yellow-50/20' : 'border-gray-100 bg-gray-50/40'
                                            }`}
                                    >
                                        {company.isPrimary && (
                                            <div className="absolute -top-3 left-6 px-3 py-1 bg-yellow-400 text-black text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" />
                                                Primary Company
                                            </div>
                                        )}

                                        <div className="absolute top-4 right-4 flex gap-2">
                                            {!company.isPrimary && (
                                                <button
                                                    onClick={() => setPrimaryCompany(company.id)}
                                                    className="p-2 text-yellow-400 hover:text-yellow-600 hover:bg-white rounded-xl transition-all"
                                                    title="Set as Primary"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                </button>
                                            )}
                                            {companies.length > 1 && (
                                                <button
                                                    onClick={() => removeCompany(company.id)}
                                                    className="p-2 text-red-300 hover:text-red-500 hover:bg-white rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                            {/* Company Name */}
                                            <div className="space-y-2 col-span-full">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                                                    Company Name
                                                </label>
                                                <div className="relative group">
                                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={company.name}
                                                        onChange={(e) => handleCompanyChange(company.id, "name", e.target.value)}
                                                        disabled={company.isExisting}
                                                        maxLength={150}
                                                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none text-sm font-medium"
                                                        placeholder="Enter company name"
                                                    />
                                                </div>
                                            </div>

                                            {/* Company GST */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                                                    Company GST
                                                </label>
                                                <input
                                                    type="text"
                                                    value={company.gst}
                                                    onChange={(e) => handleCompanyChange(company.id, "gst", e.target.value)}
                                                    disabled={company.isExisting}
                                                    maxLength={15}
                                                    className={`w-full px-4 py-3 bg-white border rounded-2xl outline-none text-sm font-medium ${companyInputBorder(errors[companyErrorKey(company.id, "gst")])}`}
                                                    placeholder="e.g. 32ABCDE1234F1Z5"
                                                />
                                                {errors[companyErrorKey(company.id, "gst")] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[companyErrorKey(company.id, "gst")]}</p>}
                                            </div>

                                            {/* Company Mobile */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                                                    Company Mobile
                                                </label>
                                                <div className="relative group">
                                                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={company.mobile}
                                                        onChange={(e) => handleCompanyChange(company.id, "mobile", e.target.value)}
                                                        disabled={company.isExisting}
                                                        inputMode="numeric"
                                                        maxLength={10}
                                                        className={`w-full pl-11 pr-4 py-3 bg-white border rounded-2xl outline-none text-sm font-medium ${companyInputBorder(errors[companyErrorKey(company.id, "mobile")])}`}
                                                        placeholder="10-digit mobile number"
                                                    />
                                                </div>
                                                {errors[companyErrorKey(company.id, "mobile")] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[companyErrorKey(company.id, "mobile")]}</p>}
                                            </div>

                                            {/* Company Email */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                                                    Company Email
                                                </label>
                                                <div className="relative group">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="email"
                                                        value={company.email}
                                                        onChange={(e) => handleCompanyChange(company.id, "email", e.target.value)}
                                                        disabled={company.isExisting}
                                                        className={`w-full pl-11 pr-4 py-3 bg-white border rounded-2xl outline-none text-sm font-medium ${companyInputBorder(errors[companyErrorKey(company.id, "email")])}`}
                                                        placeholder="Enter email address"
                                                    />
                                                </div>
                                                {errors[companyErrorKey(company.id, "email")] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[companyErrorKey(company.id, "email")]}</p>}
                                            </div>

                                            {/* Company Country */}
                                            <div className="space-y-2 col-span-full">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                                                    Company Country
                                                </label>
                                                <div className="relative group">
                                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={company.country}
                                                        onChange={(e) => handleCompanyChange(company.id, "country", e.target.value)}
                                                        disabled
                                                        className={`w-full pl-11 pr-4 py-3 bg-gray-50 border rounded-2xl outline-none text-sm font-medium ${companyInputBorder(errors[companyErrorKey(company.id, "country")])}`}
                                                    />
                                                </div>
                                                {errors[companyErrorKey(company.id, "country")] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[companyErrorKey(company.id, "country")]}</p>}
                                            </div>

                                            {/* State */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                                                    State
                                                </label>
                                                <select
                                                    value={company.state}
                                                    onChange={(e) => handleCompanyChange(company.id, "state", e.target.value)}
                                                    disabled={company.isExisting}
                                                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none text-sm"
                                                >
                                                    <option value="">Search or select state</option>
                                                    {locationData.states.map(s => (
                                                        <option key={s.stateName} value={s.stateName}>
                                                            {s.stateName}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* District */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                                                    District
                                                </label>
                                                <select
                                                    value={company.district}
                                                    onChange={(e) => handleCompanyChange(company.id, "district", e.target.value)}
                                                    disabled={company.isExisting}
                                                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none text-sm"
                                                >
                                                    <option value="">Search or select district</option>
                                                    {company.state &&
                                                        locationData.states
                                                            .find(s => s.stateName === company.state)
                                                            ?.districts.map(d => (
                                                                <option key={d.districtName} value={d.districtName}>
                                                                    {d.districtName}
                                                                </option>
                                                            ))}
                                                </select>
                                            </div>

                                            {/* Company Pin Code */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                                                    Pin Code
                                                </label>
                                                <input
                                                    type="text"
                                                    value={company.pincode}
                                                    onChange={(e) => handleCompanyChange(company.id, "pincode", e.target.value)}
                                                    disabled={company.isExisting}
                                                    inputMode={isIndia(company.country) ? "numeric" : "text"}
                                                    className={`w-full px-4 py-3 bg-white border rounded-2xl outline-none text-sm ${companyInputBorder(errors[companyErrorKey(company.id, "pincode")])}`}
                                                    placeholder={isIndia(company.country) ? "6-digit PIN code" : "Enter postal / ZIP code"}
                                                />
                                                {errors[companyErrorKey(company.id, "pincode")] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[companyErrorKey(company.id, "pincode")]}</p>}
                                            </div>

                                            {/* Company Preferred Language */}
                                            <div className="space-y-2 col-span-full">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                                                    Company Preferred Language
                                                </label>
                                                <select
                                                    value={company.preferredLanguage}
                                                    onChange={(e) => handleCompanyChange(company.id, "preferredLanguage", e.target.value)}
                                                    disabled={company.isExisting}
                                                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none text-sm font-medium"
                                                >
                                                    <option value="">Select Language</option>
                                                    <option value="English">English</option>
                                                    <option value="Hindi">Hindi</option>
                                                    <option value="Malayalam">Malayalam</option>
                                                    <option value="Tamil">Tamil</option>
                                                    <option value="Kannada">Kannada</option>
                                                </select>
                                            </div>

                                        </div>
                                    </motion.div>
                                ))}

                                <button
                                    onClick={addCompany}
                                    disabled={companies.some(c => c.isExisting)}
                                    className={`w-full py-6 border-2 border-dashed rounded-3xl transition-all flex flex-col items-center gap-2 group
        ${companies.some(c => c.isExisting)
                                            ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
                                            : "border-gray-200 text-gray-400 hover:text-yellow-600 hover:border-yellow-300 hover:bg-yellow-50/10"
                                        }
    `}
                                >
                                    <div className="p-3 bg-gray-50 text-gray-400 group-hover:bg-yellow-400 group-hover:text-black rounded-2xl transition-all">
                                        <Plus className="w-6 h-6" />
                                    </div>
                                    <span className="font-bold text-sm tracking-wide">Add Another Company</span>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white ${activeTab === 'customer' ? 'bg-yellow-400 text-black' : 'bg-gray-300 text-gray-500'}`}>1</div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white ${activeTab === 'company' ? 'bg-yellow-400 text-black' : 'bg-gray-300 text-gray-500'}`}>2</div>
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            Step {activeTab === 'customer' ? '1' : '2'} of 2
                        </span>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="px-8 py-3 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        {activeTab === "customer" ? (
                            <button
                                onClick={handleNextStep}
                                className="px-10 py-3 bg-yellow-400 text-black rounded-2xl text-sm font-bold shadow-lg shadow-yellow-200 hover:bg-yellow-500 hover:shadow-yellow-300 transition-all transform active:scale-95"
                            >
                                Next Step
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-10 py-3 bg-yellow-400 text-black rounded-2xl text-sm font-bold shadow-lg shadow-yellow-200 hover:bg-yellow-500 disabled:opacity-50 transition-all flex items-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                {customerData.CustomerID ? "Update Customer" : "Save Customer"}
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AddCustomerModal;

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Search, Building2, Users, Plus, Trash2, CheckCircle, Smartphone, Mail, Globe } from "lucide-react";
import locationData from "../../utils/statesAndDistricts.json";
import DealsApi from "../../api/DealsApi";
import { getSecureItem } from "../../utils/secureStorage";
import { toast } from "react-toastify";
import { sanitize, validate, isIndia } from "../../utils/formValidation";

const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;
const CIN_REGEX = /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/;

// --- Existing Entity Dropdown ---
const ExistingEntityDropdown = ({ type, onSelect, onClose, apiUrl }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef(null);


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
                            .includes(lowerQuery) ||
                        (item.CustomerCode || "")
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
                                    <p className="text-xs text-gray-500 truncate">{item.Mobile || item.CompanyMobile || item.GSTNumber || item.CustomerCode}</p>
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </motion.div>
    );
};

const AddCompanyModal = ({ isOpen, onClose, onSuccess, initialData }) => {
    const [activeTab, setActiveTab] = useState("company");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [existingCompany, setExistingCompany] = useState(null);
    const [existingEmail, setExistingEmail] = useState(null);
    const [existingMobile, setExistingMobile] = useState(null);
    const [isCheckingName, setIsCheckingName] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [isCheckingMobile, setIsCheckingMobile] = useState(false);
    const [errors, setErrors] = useState({});
    // Existing customer picked from search whose record has no first name: that one input stays editable
    const [editableExistingNameId, setEditableExistingNameId] = useState(null);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    const [companyData, setCompanyData] = useState({
        name: "",
        gst: "",
        email: "",
        mobile: "",
        country: "India",
        state: "",
        district: "",
        pincode: "",
        preferredLanguage: ""
    });

    const [customers, setCustomers] = useState([
        {
            id: Date.now(),
            firstName: "",
            lastName: "",
            mobile: "",
            email: "",
            country: "India",
            state: "",
            district: "",
            pincode: "",
            preferredLanguage: "",
            isPrimary: true,
            isExisting: false,
            existingCustomerId: null
        }
    ]);

    useEffect(() => {
        if (isOpen) {
            setErrors({});
            setEditableExistingNameId(null);
        }
        if (isOpen && initialData) {
            setCompanyData({
                CompanyID: initialData.CompanyID,
                name: initialData.BusinessName || "",
                gst: initialData.GSTNumber || "",
                email: initialData.CompanyEmail || "",
                mobile: initialData.CompanyMobile || "",
                country: initialData.Country || "India",
                state: initialData.State || "",
                district: initialData.District || initialData.City || "",
                pincode: initialData.PinCode || "",
                preferredLanguage: initialData.PreferredLanguage || ""
            });

            if (initialData.Customers && initialData.Customers.length > 0) {
                setCustomers(initialData.Customers.map(c => ({
                    id: c.CustomerID || Date.now() + Math.random(),
                    CustomerID: c.CustomerID,
                    firstName: c.FirstName || "",
                    lastName: c.LastName || "",
                    mobile: c.Mobile || "",
                    email: c.Email || "",
                    country: c.Country || "India",
                    state: c.State || "",
                    district: c.District || c.City || "",
                    pincode: c.PinCode || "",
                    preferredLanguage: c.PreferredLanguage || "",
                    isPrimary: !!c.PrimaryCustomer,
                    isExisting: false,
                    existingCustomerId: null
                })));
            }
        } else if (isOpen && !initialData) {
            setCompanyData({
                name: "",
                gst: "",
                email: "",
                mobile: "",
                country: "India",
                state: "",
                district: "",
                pincode: "",
                preferredLanguage: ""
            });
            setCustomers([
                {
                    id: Date.now(),
                    firstName: "",
                    lastName: "",
                    mobile: "",
                    email: "",
                    country: "India",
                    state: "",
                    district: "",
                    pincode: "",
                    preferredLanguage: "",
                    isPrimary: true,
                    isExisting: false,
                    existingCustomerId: null
                }
            ]);
        }
    }, [isOpen, initialData]);

    useEffect(() => {
        if (!companyData.name) {
            setExistingCompany(null);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setIsCheckingName(true);
            try {
                const result = await DealsApi.checkCompanyExistence(companyData.name, companyData.CompanyID);
                if (result.success && result.exists) {
                    setExistingCompany(result.company);
                } else {
                    setExistingCompany(null);
                }
            } catch (err) {
                console.error("Error checking company existence:", err);
            } finally {
                setIsCheckingName(false);
            }
        }, 600);

        return () => clearTimeout(delayDebounce);
    }, [companyData.name, companyData.CompanyID]);

    useEffect(() => {
        if (!companyData.email) {
            setExistingEmail(null);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setIsCheckingEmail(true);
            try {
                const result = await DealsApi.checkCompanyEmailExistence(companyData.email, companyData.CompanyID);
                if (result.success && result.exists) {
                    setExistingEmail(result.company);
                } else {
                    setExistingEmail(null);
                }
            } catch (err) {
                console.error("Error checking company email existence:", err);
            } finally {
                setIsCheckingEmail(false);
            }
        }, 600);

        return () => clearTimeout(delayDebounce);
    }, [companyData.email, companyData.CompanyID]);

    useEffect(() => {
        if (!companyData.mobile) {
            setExistingMobile(null);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setIsCheckingMobile(true);
            try {
                const result = await DealsApi.checkCompanyMobileExistence(companyData.mobile, companyData.CompanyID);
                if (result.success && result.exists) {
                    setExistingMobile(result.company);
                } else {
                    setExistingMobile(null);
                }
            } catch (err) {
                console.error("Error checking company mobile existence:", err);
            } finally {
                setIsCheckingMobile(false);
            }
        }, 600);

        return () => clearTimeout(delayDebounce);
    }, [companyData.mobile, companyData.CompanyID]);

    // Characters each company field can never contain are dropped as the user types
    const COMPANY_SANITIZERS = {
        name: sanitize.text(150),
        gst: sanitize.gstin,
        mobile: sanitize.mobile,
        email: sanitize.email,
        country: sanitize.country,
        pincode: (v) => sanitize.postal(v, companyData.country),
        pan: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10),
        cin: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 21),
        website: (v) => v.replace(/\s/g, "").slice(0, 200)
    };

    const CUSTOMER_SANITIZERS = {
        firstName: sanitize.personName,
        lastName: sanitize.personName,
        mobile: sanitize.mobile,
        email: sanitize.email,
        country: sanitize.country
    };

    const clearErrors = (...keys) => {
        if (!keys.some(k => errors[k])) return;
        setErrors(prev => {
            const newErrors = { ...prev };
            keys.forEach(k => delete newErrors[k]);
            return newErrors;
        });
    };

    const clearCustomerErrors = (id) => {
        const prefix = `customer_${id}_`;
        setErrors(prev => {
            const newErrors = { ...prev };
            Object.keys(newErrors).forEach(k => {
                if (k.startsWith(prefix)) delete newErrors[k];
            });
            return newErrors;
        });
    };

    const handleCompanyChange = (e) => {
        const { name } = e.target;
        const value = COMPANY_SANITIZERS[name] ? COMPANY_SANITIZERS[name](e.target.value) : e.target.value;

        setCompanyData(prev => ({ ...prev, [name]: value }));

        if (name === "country") clearErrors("country", "pincode");
        else clearErrors(name);
    };

    const handleCustomerChange = (id, field, rawValue) => {
        let value = rawValue;
        if (CUSTOMER_SANITIZERS[field]) value = CUSTOMER_SANITIZERS[field](rawValue);
        else if (field === "pincode") value = sanitize.postal(rawValue, customers.find(c => c.id === id)?.country);

        setCustomers(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));

        if (field === "country") clearErrors(`customer_${id}_country`, `customer_${id}_pincode`);
        else clearErrors(`customer_${id}_${field}`);
    };

    const validateCompany = () => {
        const newErrors = {};

        if (!companyData.name?.trim()) newErrors.name = "Please fill company name";

        const gstError = validate.gstin(companyData.gst);
        if (gstError) newErrors.gst = gstError;

        if (!companyData.mobile) {
            newErrors.mobile = "Please fill company mobile number";
        } else {
            const mobileError = validate.mobile(companyData.mobile, { required: true });
            if (mobileError) newErrors.mobile = mobileError;
        }

        if (!companyData.email) {
            newErrors.email = "Please fill company email address";
        } else {
            const emailError = validate.email(companyData.email, { required: true });
            if (emailError) newErrors.email = emailError;
        }

        const countryError = validate.country(companyData.country);
        if (countryError) newErrors.country = countryError;

        const pincodeError = validate.postal(companyData.pincode, companyData.country);
        if (pincodeError) newErrors.pincode = pincodeError;

        if (companyData.pan && !PAN_REGEX.test(companyData.pan)) newErrors.pan = "Enter a valid 10-character PAN (e.g. ABCDE1234F)";
        if (companyData.cin && !CIN_REGEX.test(companyData.cin)) newErrors.cin = "Enter a valid 21-character CIN";

        if (!companyData.state) newErrors.state = "Please select state";
        if (!companyData.district) newErrors.district = "Please select district";

        if (existingCompany) newErrors.name = "A company with this name already exists";
        if (existingEmail) newErrors.email = "This email already exists";
        if (existingMobile) newErrors.mobile = "This mobile already exists";

        return newErrors;
    };

    const validateCustomers = () => {
        const newErrors = {};

        customers.forEach(c => {
            const key = (field) => `customer_${c.id}_${field}`;

            // Existing customers come prefilled and locked; only a blank first name must be typed in
            if (c.isExisting) {
                if (!c.firstName?.trim()) newErrors[key("firstName")] = "First name is required";
                return;
            }

            const checks = {
                firstName: validate.personName(c.firstName, { required: true, label: "First name" }),
                lastName: validate.personName(c.lastName, { label: "Last name", min: 1 }),
                mobile: validate.mobile(c.mobile),
                email: validate.email(c.email),
                country: validate.country(c.country),
                pincode: validate.postal(c.pincode, c.country)
            };
            Object.entries(checks).forEach(([field, message]) => {
                if (message) newErrors[key(field)] = message;
            });
        });

        return newErrors;
    };

    const addCustomer = () => {
        setCustomers(prev => [
            ...prev,
            {
                id: Date.now(),
                firstName: "",
                lastName: "",
                mobile: "",
                email: "",
                country: "India",
                state: "",
                district: "",
                pincode: "",
                preferredLanguage: "",
                isPrimary: false,
                isExisting: false,
                existingCustomerId: null
            }
        ]);
    };

    const removeCustomer = (id) => {
        if (customers.length === 1) return;
        const removed = customers.find(c => c.id === id);
        clearCustomerErrors(id);
        setCustomers(prev => {
            const newList = prev.filter(c => c.id !== id);
            if (removed.isPrimary && newList.length > 0) {
                newList[0].isPrimary = true;
            }
            return newList;
        });
    };

    const setPrimaryCustomer = (id) => {
        setCustomers(prev => prev.map(c => ({ ...c, isPrimary: c.id === id })));
    };

    const handleSelectExistingCustomer = async (selected) => {
        const customerId = selected.CustomerID || selected.id;
        if (!customerId) return;

        try {
            const response = await DealsApi.getCustomerDetails(customerId);

            if (response.success && response.data) {
                const fullData = response.data;

                setEditableExistingNameId(fullData.FirstName?.trim() ? null : customers[0]?.id);
                clearCustomerErrors(customers[0]?.id);

                setCustomers(prev => {
                    const updated = [...prev];
                    updated[0] = {
                        ...updated[0],
                        firstName: fullData.FirstName || "",
                        lastName: fullData.LastName || "",
                        mobile: fullData.Mobile || "",
                        email: fullData.Email || "",
                        country: fullData.Country || "India",
                        state: fullData.State || "",
                        district: fullData.District || "",
                        pincode: fullData.PinCode || "",
                        preferredLanguage: fullData.PreferredLanguage || "",
                        isExisting: true,
                        existingCustomerId: customerId
                    };
                    return updated;
                });
            }
        } catch (err) {
            console.error("Error fetching customer details:", err);
            toast.error("Failed to fetch customer details");
        }
        setShowCustomerSearch(false);
    };

    const handleClearCustomerForm = () => {
        setEditableExistingNameId(null);
        clearCustomerErrors(customers[0]?.id);
        setCustomers(prev => {
            const updated = [...prev];
            updated[0] = {
                ...updated[0],
                firstName: "",
                lastName: "",
                mobile: "",
                email: "",
                country: "India",
                state: "",
                district: "",
                pincode: "",
                preferredLanguage: "",
                isExisting: false,
                existingCustomerId: null
            };
            return updated;
        });
    };

    const handleNextStep = () => {
        const newErrors = validateCompany();

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error("Please fill all required fields correctly");
            return;
        }

        setErrors({});
        setActiveTab("customer");
    };

    const handleSubmit = async () => {
        const companyErrors = validateCompany();
        const newErrors = { ...companyErrors, ...validateCustomers() };

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error("Please fix validation errors");
            setActiveTab(Object.keys(companyErrors).length > 0 ? "company" : "customer");
            return;
        }

        setIsSubmitting(true);
        try {
            const user = getSecureItem("partnerUser") || {};

            const payload = {
                company: {
                    ...companyData,
                    city: companyData.district
                },
                customers: customers.map(c => ({
                    ...c,
                    city: c.district
                })),
                franchiseeId: user.FranchiseeID || 1,
                AssociateID: user.id
            };

            const result = await DealsApi.saveAssociateCompany(payload);
            if (result.success) {
                toast.success(companyData.CompanyID ? "Company updated successfully" : "Company added successfully");
                onSuccess();
                onClose();
            } else {
                toast.error(result.message || (companyData.CompanyID ? "Failed to update company" : "Failed to add company"));
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
                        <h2 className="text-xl font-bold">{companyData.CompanyID ? "Edit Company" : "Add New Company"}</h2>
                        <p className="text-yellow-100 text-sm mt-1">
                            {companyData.CompanyID ? "Update company profile and link customers" : "Create a new company profile and link customers"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 py-4 flex gap-8 border-b border-gray-100 bg-gray-50/50">
                    <button
                        onClick={() => setActiveTab("company")}
                        className={`flex items-center gap-2 pb-2 px-1 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === "company" ? "text-yellow-600" : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        <Building2 className="w-4 h-4" />
                        Company Details
                        {activeTab === "company" && <motion.div layoutId="tabLine" className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400 rounded-full" />}
                    </button>
                    <button
                        onClick={() => {
                            if (activeTab === "company") {
                                handleNextStep();
                            } else {
                                setActiveTab("customer");
                            }
                        }}
                        className={`flex items-center gap-2 pb-2 px-1 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === "customer" ? "text-yellow-600" : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        Customer Details
                        {activeTab === "customer" && <motion.div layoutId="tabLine" className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400 rounded-full" />}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {activeTab === "company" ? (
                            <motion.div
                                key="company-tab"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 col-span-full">
                                        <label className="text-sm font-bold text-gray-500 uppercase tracking-tight">Company Name <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                name="name"
                                                value={companyData.name}
                                                onChange={handleCompanyChange}
                                                className={`w-full pl-12 pr-4 py-4 bg-white border rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400/20 text-sm transition-all ${errors.name ? "border-red-500 focus:ring-red-500/20" :
                                                    existingCompany ? "border-amber-400 bg-amber-50/10" : "border-gray-200"
                                                    }`}
                                                placeholder="Enter company name"
                                            />
                                            {errors.name && (
                                                <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.name}</p>
                                            )}
                                            {isCheckingName && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                    <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        <AnimatePresence>
                                            {existingCompany && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <p className="text-xs font-medium text-amber-600 flex items-center gap-1.5 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100">
                                                        <Search className="w-3 h-3" />
                                                        A company with this name already exists (ID: {existingCompany.CompanyCode || existingCompany.CompanyID})
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-500 uppercase tracking-tight">Company GST</label>
                                        <input
                                            type="text"
                                            name="gst"
                                            value={companyData.gst}
                                            onChange={handleCompanyChange}
                                            maxLength={15}
                                            className={`w-full px-4 py-4 bg-white border rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400/20 text-sm transition-all ${errors.gst ? "border-red-500 focus:ring-red-500/20" : "border-gray-200"}`}
                                            placeholder="Enter GST number"
                                        />
                                        {errors.gst && (
                                            <p className="text-xs text-red-500 mt-1 font-medium">{errors.gst}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-500 uppercase tracking-tight">Company Mobile <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                name="mobile"
                                                value={companyData.mobile}
                                                onChange={handleCompanyChange}
                                                inputMode="numeric"
                                                maxLength={10}
                                                className={`w-full pl-12 pr-4 py-4 bg-white border rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400/20 text-sm transition-all ${
                                                    errors.mobile ? "border-red-500 focus:ring-red-500/20" :
                                                    existingMobile ? "border-amber-400 bg-amber-50/10" : "border-gray-200"
                                                }`}
                                                placeholder="10-digit mobile number"
                                            />
                                            {isCheckingMobile && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                    <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                                                </div>
                                            )}
                                            {errors.mobile && (
                                                <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.mobile}</p>
                                            )}
                                            <AnimatePresence>
                                                {existingMobile && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <p className="text-xs font-medium text-amber-600 flex items-center gap-1.5 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100">
                                                            <Search className="w-3 h-3" />
                                                            This mobile number already exists for {existingMobile.BusinessName} ({existingMobile.CompanyCode || existingMobile.CompanyID})
                                                        </p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="space-y-2 col-span-full">
                                        <label className="text-sm font-bold text-gray-500 uppercase tracking-tight">Company Email <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="email"
                                                name="email"
                                                value={companyData.email}
                                                onChange={handleCompanyChange}
                                                className={`w-full pl-12 pr-4 py-4 bg-white border rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400/20 text-sm transition-all ${
                                                    errors.email ? "border-red-500 focus:ring-red-500/20" :
                                                    existingEmail ? "border-amber-400 bg-amber-50/10" : "border-gray-200"
                                                }`}
                                                placeholder="Enter email address"
                                            />
                                            {isCheckingEmail && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                    <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                                                </div>
                                            )}
                                            {errors.email && (
                                                <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.email}</p>
                                            )}
                                            <AnimatePresence>
                                                {existingEmail && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <p className="text-xs font-medium text-amber-600 flex items-center gap-1.5 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100">
                                                            <Search className="w-3 h-3" />
                                                            This email address already exists for {existingEmail.BusinessName} ({existingEmail.CompanyCode || existingEmail.CompanyID})
                                                        </p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="space-y-2 col-span-full">
                                        <label className="text-sm font-bold text-gray-500 uppercase tracking-tight">Company Country</label>
                                        <div className="relative">
                                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                name="country"
                                                value={companyData.country}
                                                disabled
                                                className={`w-full pl-12 pr-4 py-4 bg-gray-50/50 border rounded-2xl outline-none text-sm cursor-not-allowed ${errors.country ? "border-red-500" : "border-gray-200"}`}
                                            />
                                        </div>
                                        {errors.country && (
                                            <p className="text-xs text-red-500 mt-1 font-medium">{errors.country}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-500 uppercase tracking-tight">State <span className="text-red-500">*</span></label>
                                        <select
                                            name="state"
                                            value={companyData.state}
                                            onChange={handleCompanyChange}
                                            className={`w-full px-4 py-4 bg-white border rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400/20 text-sm appearance-none transition-all ${errors.state ? "border-red-500 focus:ring-red-500/20" : "border-gray-200"
                                                }`}
                                        >
                                            <option value="">Search or select state</option>
                                            {locationData.states.map(s => (
                                                <option key={s.stateName} value={s.stateName}>{s.stateName}</option>
                                            ))}
                                        </select>
                                        {errors.state && (
                                            <p className="text-xs text-red-500 mt-1 font-medium">{errors.state}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-500 uppercase tracking-tight">District <span className="text-red-500">*</span></label>
                                        <select
                                            name="district"
                                            value={companyData.district}
                                            onChange={handleCompanyChange}
                                            className={`w-full px-4 py-4 bg-white border rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400/20 text-sm appearance-none transition-all ${errors.district ? "border-red-500 focus:ring-red-500/20" : "border-gray-200"
                                                }`}
                                        >
                                            <option value="">Search or select district</option>
                                            {companyData.state &&
                                                locationData.states
                                                    .find(s => s.stateName === companyData.state)
                                                    ?.districts.map(d => (
                                                        <option key={d.districtName} value={d.districtName}>{d.districtName}</option>
                                                    ))}
                                        </select>
                                        {errors.district && (
                                            <p className="text-xs text-red-500 mt-1 font-medium">{errors.district}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-500 uppercase tracking-tight">Pin Code</label>
                                        <input
                                            type="text"
                                            name="pincode"
                                            value={companyData.pincode}
                                            onChange={handleCompanyChange}
                                            inputMode={isIndia(companyData.country) ? "numeric" : "text"}
                                            className={`w-full px-4 py-4 bg-white border rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400/20 text-sm transition-all ${errors.pincode ? "border-red-500 focus:ring-red-500/20" : "border-gray-200"}`}
                                            placeholder={isIndia(companyData.country) ? "6-digit PIN code" : "Enter postal / ZIP code"}
                                        />
                                        {errors.pincode && (
                                            <p className="text-xs text-red-500 mt-1 font-medium">{errors.pincode}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2 col-span-full">
                                        <label className="text-sm font-bold text-gray-500 uppercase tracking-tight">Company Preferred Language</label>
                                        <select
                                            name="preferredLanguage"
                                            value={companyData.preferredLanguage}
                                            onChange={handleCompanyChange}
                                            className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400/20 text-sm appearance-none"
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
                        ) : (
                            <motion.div
                                key="customer-tab"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-bold text-gray-700">Customers (Primary & Others)</h4>
                                    <div className="relative">
                                        <button
                                            onClick={() => {
                                                if (customers[0]?.isExisting) {
                                                    handleClearCustomerForm();
                                                } else {
                                                    setShowCustomerSearch(!showCustomerSearch);
                                                }
                                            }}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${customers[0]?.isExisting
                                                ? "bg-yellow-400 text-black hover:bg-yellow-500"
                                                : "bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
                                                }`}
                                        >
                                            <Search className="w-4 h-4" />
                                            {customers[0]?.isExisting ? "New Entry" : "If Existing"}
                                        </button>
                                        <AnimatePresence>
                                            {showCustomerSearch && (
                                                <ExistingEntityDropdown
                                                    type="customer"
                                                    apiUrl={API_BASE_URL}
                                                    onSelect={handleSelectExistingCustomer}
                                                    onClose={() => setShowCustomerSearch(false)}
                                                />
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {customers.map((customer) => (
                                    <motion.div
                                        key={customer.id}
                                        layout
                                        className={`relative p-8 rounded-3xl border-2 transition-all duration-300 ${customer.isPrimary ? 'border-yellow-600 bg-yellow-50/20' : 'border-gray-100 bg-gray-50/40'
                                            }`}
                                    >
                                        {customer.isPrimary && (
                                            <div className="absolute -top-3 left-6 px-3 py-1 bg-yellow-400 text-black text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" />
                                                Primary Customer
                                            </div>
                                        )}

                                        <div className="absolute top-4 right-4 flex gap-2">
                                            {!customer.isPrimary && (
                                                <button
                                                    onClick={() => setPrimaryCustomer(customer.id)}
                                                    className="p-2 text-yellow-400 hover:text-yellow-600 hover:bg-white rounded-xl transition-all"
                                                    title="Set as Primary"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                </button>
                                            )}
                                            {customers.length > 1 && (
                                                <button
                                                    onClick={() => removeCustomer(customer.id)}
                                                    className="p-2 text-red-300 hover:text-red-500 hover:bg-white rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-gray-500">First Name <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    value={customer.firstName}
                                                    onChange={(e) => handleCustomerChange(customer.id, "firstName", e.target.value)}
                                                    disabled={customer.isExisting && editableExistingNameId !== customer.id}
                                                    className={`w-full px-4 py-4 bg-white border rounded-2xl outline-none text-sm ${errors[`customer_${customer.id}_firstName`] ? "border-red-500" : "border-gray-200"}`}
                                                    placeholder="Enter first name"
                                                />
                                                {errors[`customer_${customer.id}_firstName`] && (
                                                    <p className="text-xs text-red-500 mt-1 font-medium">{errors[`customer_${customer.id}_firstName`]}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-gray-500">Last Name</label>
                                                <input
                                                    type="text"
                                                    value={customer.lastName}
                                                    onChange={(e) => handleCustomerChange(customer.id, "lastName", e.target.value)}
                                                    disabled={customer.isExisting}
                                                    className={`w-full px-4 py-4 bg-white border rounded-2xl outline-none text-sm ${errors[`customer_${customer.id}_lastName`] ? "border-red-500" : "border-gray-200"}`}
                                                    placeholder="Enter last name"
                                                />
                                                {errors[`customer_${customer.id}_lastName`] && (
                                                    <p className="text-xs text-red-500 mt-1 font-medium">{errors[`customer_${customer.id}_lastName`]}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2 col-span-full">
                                                <label className="text-sm font-semibold text-gray-500">Mobile</label>
                                                <input
                                                    type="text"
                                                    value={customer.mobile}
                                                    onChange={(e) => handleCustomerChange(customer.id, "mobile", e.target.value)}
                                                    disabled={customer.isExisting}
                                                    inputMode="numeric"
                                                    maxLength={10}
                                                    className={`w-full px-4 py-4 bg-white border rounded-2xl outline-none text-sm ${errors[`customer_${customer.id}_mobile`] ? "border-red-500" : "border-gray-200"}`}
                                                    placeholder="10-digit mobile number"
                                                />
                                                {errors[`customer_${customer.id}_mobile`] && (
                                                    <p className="text-xs text-red-500 mt-1 font-medium">{errors[`customer_${customer.id}_mobile`]}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2 col-span-full">
                                                <label className="text-sm font-semibold text-gray-500">Email</label>
                                                <input
                                                    type="email"
                                                    value={customer.email}
                                                    onChange={(e) => handleCustomerChange(customer.id, "email", e.target.value)}
                                                    disabled={customer.isExisting}
                                                    className={`w-full px-4 py-4 bg-white border rounded-2xl outline-none text-sm ${errors[`customer_${customer.id}_email`] ? "border-red-500" : "border-gray-200"}`}
                                                    placeholder="Enter email address"
                                                />
                                                {errors[`customer_${customer.id}_email`] && (
                                                    <p className="text-xs text-red-500 mt-1 font-medium">{errors[`customer_${customer.id}_email`]}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-gray-500">Country</label>
                                                <input
                                                    type="text"
                                                    value={customer.country}
                                                    disabled
                                                    className={`w-full px-4 py-4 bg-gray-50/50 border rounded-2xl outline-none text-sm cursor-not-allowed ${errors[`customer_${customer.id}_country`] ? "border-red-500" : "border-gray-200"}`}
                                                />
                                                {errors[`customer_${customer.id}_country`] && (
                                                    <p className="text-xs text-red-500 mt-1 font-medium">{errors[`customer_${customer.id}_country`]}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-gray-500">Pincode</label>
                                                <input
                                                    type="text"
                                                    value={customer.pincode}
                                                    onChange={(e) => handleCustomerChange(customer.id, "pincode", e.target.value)}
                                                    disabled={customer.isExisting}
                                                    inputMode={isIndia(customer.country) ? "numeric" : "text"}
                                                    className={`w-full px-4 py-4 bg-white border rounded-2xl outline-none text-sm ${errors[`customer_${customer.id}_pincode`] ? "border-red-500" : "border-gray-200"}`}
                                                    placeholder={isIndia(customer.country) ? "6-digit PIN code" : "Enter postal / ZIP code"}
                                                />
                                                {errors[`customer_${customer.id}_pincode`] && (
                                                    <p className="text-xs text-red-500 mt-1 font-medium">{errors[`customer_${customer.id}_pincode`]}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-gray-500">State</label>
                                                <select
                                                    value={customer.state}
                                                    onChange={(e) => handleCustomerChange(customer.id, "state", e.target.value)}
                                                    disabled={customer.isExisting}
                                                    className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl outline-none text-sm"
                                                >
                                                    <option value="">Search or select state</option>
                                                    {locationData.states.map(s => (
                                                        <option key={s.stateName} value={s.stateName}>{s.stateName}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-gray-500">District</label>
                                                <select
                                                    value={customer.district}
                                                    onChange={(e) => handleCustomerChange(customer.id, "district", e.target.value)}
                                                    disabled={customer.isExisting}
                                                    className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl outline-none text-sm"
                                                >
                                                    <option value="">Search or select district</option>
                                                    {customer.state &&
                                                        locationData.states
                                                            .find(s => s.stateName === customer.state)
                                                            ?.districts.map(d => (
                                                                <option key={d.districtName} value={d.districtName}>{d.districtName}</option>
                                                            ))}
                                                </select>
                                            </div>

                                            <div className="space-y-2 col-span-full">
                                                <label className="text-sm font-semibold text-gray-500">Preferred Language</label>
                                                <select
                                                    value={customer.preferredLanguage}
                                                    onChange={(e) => handleCustomerChange(customer.id, "preferredLanguage", e.target.value)}
                                                    disabled={customer.isExisting}
                                                    className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl outline-none text-sm"
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
                                    onClick={addCustomer}
                                    disabled={customers.some(c => c.isExisting)}
                                    className={`w-full py-6 border-2 border-dashed rounded-3xl transition-all flex flex-col items-center gap-2 group
                                        ${customers.some(c => c.isExisting)
                                            ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
                                            : "border-gray-200 text-gray-400 hover:text-yellow-600 hover:border-yellow-300 hover:bg-yellow-50/10"
                                        }
                                    `}
                                >
                                    <div className="p-3 bg-gray-50 text-gray-400 group-hover:bg-yellow-400 group-hover:text-black rounded-2xl transition-all">
                                        <Plus className="w-6 h-6" />
                                    </div>
                                    <span className="font-bold text-sm tracking-wide">Add Another Customer</span>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white ${activeTab === 'company' ? 'bg-yellow-400 text-black' : 'bg-gray-300 text-gray-500'}`}>1</div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white ${activeTab === 'customer' ? 'bg-yellow-400 text-black' : 'bg-gray-300 text-gray-500'}`}>2</div>
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            Step {activeTab === 'company' ? '1' : '2'} of 2
                        </span>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-8 py-3 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancel</button>
                        {activeTab === "company" ? (
                            <button
                                onClick={handleNextStep}
                                className="px-10 py-3 bg-yellow-400 text-black rounded-2xl text-sm font-bold shadow-lg shadow-yellow-200 hover:bg-yellow-500 transition-all transform active:scale-95"
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
                                {companyData.CompanyID ? "Update Company" : "Save Company"}
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AddCompanyModal;

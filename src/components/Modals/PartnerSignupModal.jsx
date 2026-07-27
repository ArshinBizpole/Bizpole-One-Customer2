import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import locationData from "../../utils/statesAndDistricts.json";
import AssociateApi from "../../api/AssociateApi";
import { getSecureItem, setSecureItem } from "../../utils/secureStorage";
import { notifyTokenSet } from "../../utils/authSession";
import { useNavigate } from "react-router-dom";
import Select from "react-select";


const PartnerSignupModal = ({ isOpen, onClose, onSwitchToLogin }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        associateName: "",
        mobile: "",
        email: "",
        state: "",
        district: "",
        language: "",
        address: "",
        addressLine1: "",
        addressLine2: "",
        postalCode: "",
        country: "",
        profession: "",
    });
    const [step, setStep] = useState(1);
    const [kycFiles, setKycFiles] = useState({
        pan: null,
        aadhaar: null,
        gst: null,
    });
    const [availableDistricts, setAvailableDistricts] = useState([]);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiSuccess, setApiSuccess] = useState(false);
    const [createdAssociateId, setCreatedAssociateId] = useState(null);
    const [otpValues, setOtpValues] = useState(["", "", "", ""]);
    const [timer, setTimer] = useState(30);
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        let interval;
        if (step === 2 && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [step, timer]);

    const validateStep1 = () => {
        const newErrors = {};
        if (!formData.associateName.trim()) newErrors.associateName = "Associate name is required";
        if (!formData.mobile.trim()) {
            newErrors.mobile = "Mobile number is required";
        } else if (!/^\d{10}$/.test(formData.mobile.trim())) {
            newErrors.mobile = "Please enter a valid 10-digit mobile number";
        }
        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            newErrors.email = "Please enter a valid email address";
        }
        if (!formData.profession) newErrors.profession = "Profession is required";
        if (!formData.state) newErrors.state = "State is required";
        if (!formData.district) newErrors.district = "District is required";
        if (!formData.language) newErrors.language = "Preferred language is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        if (formData.state) {
            const selectedState = locationData.states.find(
                (s) => s.stateName === formData.state
            );
            setAvailableDistricts(selectedState ? selectedState.districts : []);
            setFormData((prev) => ({ ...prev, district: "" }));
        } else {
            setAvailableDistricts([]);
        }
    }, [formData.state]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name] || errors.api) {
            setErrors((prev) => {
                const updated = { ...prev };
                delete updated[name];
                delete updated.api;
                return updated;
            });
        }
    };

    const handleFileChange = (type, e) => {
        const file = e.target.files[0];
        if (file) {
            setKycFiles((prev) => ({ ...prev, [type]: file }));
        }
    };

    const handleUploadClick = (id) => {
        document.getElementById(id).click();
    };

    const handleNextStep = async (e) => {
        e.preventDefault();
        if (!validateStep1()) return;
        setIsSubmitting(true);
        try {
            const userObj = getSecureItem("partnerUser") || {};
            const fullAddress = [
                formData.addressLine1,
                formData.addressLine2,
                formData.postalCode,
                formData.country,
            ]
                .filter(Boolean)
                .join(", ");

            const payload = {
                AssociateName: formData.associateName,
                Mobile: formData.mobile,
                Email: formData.email,
                Address: fullAddress,
                State: formData.state,
                District: formData.district,
                PreferredLanguage: formData.language,
                CreatedBy: userObj.EmployeeID || null,
                EmployeeID: userObj.EmployeeID || null,
                FranchiseeID: userObj.FranchiseeID || null,
                Profession: formData.profession,
            };

            const response = await AssociateApi.createAssociate(payload);

            if (response.success) {
                setCreatedAssociateId(response.data.AssociateID);
                try {
                    await AssociateApi.requestAssociateEmailOtp(formData.email);
                    setStep(2);
                    setTimer(30);
                    setOtpValues(["", "", "", ""]);
                } catch (otpErr) {
                    console.error("OTP request error during signup:", otpErr);
                    setErrors((prev) => ({
                        ...prev,
                        api: "Associate created but failed to send OTP. Please try login or contact support.",
                    }));
                }
            } else {
                setErrors((prev) => ({
                    ...prev,
                    api: response.message || "Failed to create associate",
                }));
            }
        } catch (error) {
            setErrors((prev) => ({
                ...prev,
                api: error.response?.data?.message || "An error occurred while creating associate",
            }));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackStep = () => {
        if (step === 2) setStep(1);
        else if (step === 3) setStep(2);
    };

    const handleOtpChange = async (index, value) => {
        if (value.length <= 1) {
            const newOtpValues = [...otpValues];
            newOtpValues[index] = value;
            setOtpValues(newOtpValues);

            if (value && index < 3) {
                const nextInput = document.getElementById(`signup-otp-${index + 1}`);
                nextInput?.focus();
            }

            if (index === 3 && value && newOtpValues.every((v) => v.length === 1)) {
                setIsVerifying(true);
                setErrors({});
                try {
                    const otp = newOtpValues.join("");
                    const response = await AssociateApi.verifyAssociateEmailOtp(formData.email, otp);
                    if (response.success) {
                        if (response.token && response.user) {
                            localStorage.setItem('partnerToken', response.token);
                            notifyTokenSet();
                            localStorage.setItem('EmployeeID', response.user.EmployeeID);
                            localStorage.setItem('FranchiseeID', response.user.FranchiseeID);
                            localStorage.setItem('AssociateID', response.user.id);
                            setSecureItem("partnerUser", response.user);
                        }
                        setStep(3);
                    } else {
                        setErrors({ otp: response.message || "Invalid OTP" });
                    }
                } catch (err) {
                    setErrors({ otp: err.response?.data?.message || "OTP verification failed" });
                } finally {
                    setIsVerifying(false);
                }
            }
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
            const prevInput = document.getElementById(`signup-otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleResendOtp = async () => {
        if (timer === 0) {
            setIsSubmitting(true);
            try {
                await AssociateApi.requestAssociateEmailOtp(formData.email);
                setTimer(30);
                setOtpValues(["", "", "", ""]);
                setErrors({});
            } catch (err) {
                setErrors({ api: "Failed to resend OTP" }, err);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleFinalSubmit = async () => {
        if (!createdAssociateId) {
            alert("Associate ID not found. Please complete the first step again.");
            return;
        }
        setIsSubmitting(true);
        try {
            const formDataObj = new FormData();
            formDataObj.append('associateId', createdAssociateId);

            if (kycFiles.pan) formDataObj.append('pan', kycFiles.pan);
            if (kycFiles.aadhaar) formDataObj.append('aadhaar', kycFiles.aadhaar);
            if (kycFiles.gst) formDataObj.append('gst', kycFiles.gst);

            if (kycFiles.pan || kycFiles.aadhaar || kycFiles.gst) {
                for (let pair of formDataObj.entries()) {
                    console.log(pair[0] + ', ' + (pair[1] instanceof File ? pair[1].name : pair[1]));
                }
                await AssociateApi.uploadAssociateDocuments(formDataObj);
            }

            setApiSuccess(true);
            setTimeout(() => {
                onClose();
                navigate("/associate/dashboard");
                setStep(1);
                setApiSuccess(false);
                setFormData({
                    associateName: "",
                    mobile: "",
                    email: "",
                    businessType: "",
                    state: "",
                    district: "",
                    language: "",
                    address: "",
                    addressLine1: "",
                    addressLine2: "",
                    postalCode: "",
                    country: "",
                    profession: "",
                });
                setKycFiles({ pan: null, aadhaar: null, gst: null });
            }, 2000);
        } catch (error) {
            console.error("KYC upload error:", error);
            alert(error.response?.data?.message || "An error occurred during KYC upload");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = () => {
        handleFinalSubmit();
    };

    if (!isOpen) return null;

    // Shared select styles matching the image (yellow border, rounded)
    const selectStyles = (hasError) => ({
        control: (base, state) => ({
            ...base,
            borderRadius: "0.5rem",
            padding: "2px 4px",
            borderColor: hasError ? "#f87171" : "#e5e7eb",
            borderWidth: "1px",
            boxShadow: state.isFocused
                ? hasError ? "0 0 0 2px #fee2e2" : "0 0 0 2px #fef9c3"
                : "none",
            "&:hover": { borderColor: hasError ? "#f87171" : "#d1d5db" },
            minHeight: "44px",
        }),
        placeholder: (base) => ({ ...base, color: "#9ca3af", fontSize: "0.875rem" }),
        singleValue: (base) => ({ ...base, fontSize: "0.875rem" }),
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Add New Associate</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {/* ── STEP 1: Form ── */}
                    {step === 1 && (
                        <motion.div
                            key="form-step"
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 16 }}
                            className="px-6 py-6 max-h-[80vh] overflow-y-auto"
                        >
                            <form onSubmit={handleNextStep}>
                                {errors.api && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-4 bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-2"
                                    >
                                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        <p className="text-sm text-red-700">{errors.api}</p>
                                    </motion.div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                                    {/* Associate Name */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                                            {/* person icon */}
                                            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                                            <span className="text-red-500">*</span> Associate Name
                                        </label>
                                        <input
                                            type="text"
                                            name="associateName"
                                            value={formData.associateName}
                                            onChange={handleChange}
                                            placeholder="Enter associate name"
                                            className={`w-full px-3 py-2.5 text-sm rounded-lg border ${errors.associateName ? 'border-red-400' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-yellow-100 placeholder:text-gray-300 transition-all`}
                                        />
                                        {errors.associateName && <span className="text-xs text-red-500">{errors.associateName}</span>}
                                    </div>

                                    {/* Mobile */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                                            {/* phone icon */}
                                            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.68 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l1.37-1.37a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                            <span className="text-red-500">*</span> Mobile
                                        </label>
                                        <input
                                            type="text"
                                            name="mobile"
                                            value={formData.mobile}
                                            onChange={handleChange}
                                            placeholder="Enter mobile number"
                                            className={`w-full px-3 py-2.5 text-sm rounded-lg border ${errors.mobile ? 'border-red-400' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-yellow-100 placeholder:text-gray-300 transition-all`}
                                        />
                                        {errors.mobile && <span className="text-xs text-red-500">{errors.mobile}</span>}
                                    </div>

                                    {/* Email */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                                            {/* email icon */}
                                            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                            <span className="text-red-500">*</span> Email
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="Enter email address"
                                            className={`w-full px-3 py-2.5 text-sm rounded-lg border ${errors.email ? 'border-red-400' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-yellow-100 placeholder:text-gray-300 transition-all`}
                                        />
                                        {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
                                    </div>

                                    {/* Profession */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                                            {/* briefcase icon */}
                                            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
                                            <span className="text-red-500">*</span> Select Profession
                                        </label>
                                        <div className="relative">
                                            <select
                                                name="profession"
                                                value={formData.profession || ""}
                                                onChange={handleChange}
                                                className={`w-full appearance-none px-3 py-2.5 text-sm rounded-lg border ${errors.profession ? 'border-red-400' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-yellow-100 text-gray-700 bg-white transition-all`}
                                            >
                                                <option value="" disabled>Select profession...</option>
                                                <option value="lawyer">Lawyer</option>
                                                <option value="consultant">Consultant</option>
                                                <option value="engineer">Engineer</option>
                                                <option value="doctor">Doctor</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                        {errors.profession && <span className="text-xs text-red-500">{errors.profession}</span>}
                                    </div>

                                    {/* State */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                                            {/* globe icon */}
                                            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20A14.5 14.5 0 0 0 12 2" /><path d="M2 12h20" /></svg>
                                            <span className="text-red-500">*</span> State
                                        </label>
                                        <Select
                                            options={locationData.states.map((s) => ({ value: s.stateName, label: s.stateName }))}
                                            value={formData.state ? { value: formData.state, label: formData.state } : null}
                                            onChange={(selected) => setFormData({ ...formData, state: selected ? selected.value : "", district: "" })}
                                            placeholder="Select state..."
                                            isSearchable
                                            styles={selectStyles(errors.state)}
                                        />
                                        {errors.state && <span className="text-xs text-red-500">{errors.state}</span>}
                                    </div>

                                    {/* District */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                                            {/* map pin icon */}
                                            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                            <span className="text-red-500">*</span> District
                                        </label>
                                        <Select
                                            options={availableDistricts.map((d) => ({ value: d.districtName, label: d.districtName }))}
                                            value={formData.district ? { value: formData.district, label: formData.district } : null}
                                            onChange={(selected) => setFormData({ ...formData, district: selected ? selected.value : "" })}
                                            placeholder={formData.state ? "Select district..." : "Select state first"}
                                            isSearchable
                                            isDisabled={!formData.state}
                                            styles={selectStyles(errors.district)}
                                        />
                                        {errors.district && <span className="text-xs text-red-500">{errors.district}</span>}
                                    </div>

                                    {/* Preferred Language */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                                            {/* language/translate icon */}
                                            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="m22 22-5-10-5 10" /><path d="M14 18h6" /></svg>
                                            <span className="text-red-500">*</span> Preferred Language
                                        </label>
                                        <div className="relative">
                                            <select
                                                name="language"
                                                value={formData.language}
                                                onChange={handleChange}
                                                className={`w-full appearance-none px-3 py-2.5 text-sm rounded-lg border ${errors.language ? 'border-red-400' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-yellow-100 text-gray-700 bg-white transition-all`}
                                            >
                                                <option value="" disabled>Select...</option>
                                                <option value="english">English</option>
                                                <option value="hindi">Hindi</option>
                                                <option value="malayalam">Malayalam</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                        {errors.language && <span className="text-xs text-red-500">{errors.language}</span>}
                                    </div>

                                    {/* Country */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                                            {/* globe icon */}
                                            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20A14.5 14.5 0 0 0 12 2" /><path d="M2 12h20" /></svg>
                                            Country
                                        </label>
                                        <input
                                            type="text"
                                            name="country"
                                            value={formData.country || ""}
                                            onChange={handleChange}
                                            placeholder="Enter country"
                                            className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-100 placeholder:text-gray-300 transition-all"
                                        />
                                    </div>

                                    {/* Address Line 1 – full width */}
                                    <div className="flex flex-col gap-1.5 md:col-span-2">
                                        <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                            Address Line 1 <span className="text-gray-400 font-normal">(House No, Building, Street)</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="addressLine1"
                                            value={formData.addressLine1 || ""}
                                            onChange={handleChange}
                                            placeholder="Enter Address Line 1"
                                            className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-100 placeholder:text-gray-300 transition-all"
                                        />
                                    </div>

                                    {/* Address Line 2 – full width */}
                                    <div className="flex flex-col gap-1.5 md:col-span-2">
                                        <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                            Address Line 2 <span className="text-gray-400 font-normal">(Area, Apartment, Landmark – optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="addressLine2"
                                            value={formData.addressLine2 || ""}
                                            onChange={handleChange}
                                            placeholder="Enter Address Line 2"
                                            className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-100 placeholder:text-gray-300 transition-all"
                                        />
                                    </div>

                                    {/* Postal Code – full width */}
                                    <div className="flex flex-col gap-1.5 md:col-span-2">
                                        <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                                            {/* hash icon */}
                                            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" x2="20" y1="9" y2="9" /><line x1="4" x2="20" y1="15" y2="15" /><line x1="10" x2="8" y1="3" y2="21" /><line x1="16" x2="14" y1="3" y2="21" /></svg>
                                            Postal Code / ZIP Code
                                        </label>
                                        <input
                                            type="text"
                                            name="postalCode"
                                            value={formData.postalCode || ""}
                                            onChange={handleChange}
                                            placeholder="Enter Postal Code / ZIP Code"
                                            className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-100 placeholder:text-gray-300 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-6 py-2.5 rounded-full text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-8 py-2.5 rounded-full text-sm font-bold bg-yellow-400 text-gray-900 hover:bg-yellow-500 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" />Processing...</>
                                        ) : "Submit"}
                                    </button>
                                </div>

                                <div className="mt-4 text-center">
                                    <p className="text-sm text-gray-500">
                                        Already have an account?{" "}
                                        <button
                                            type="button"
                                            onClick={onSwitchToLogin}
                                            className="text-gray-900 font-bold underline underline-offset-2 hover:text-yellow-600 transition-colors"
                                        >
                                            Sign in
                                        </button>
                                    </p>
                                </div>
                            </form>
                        </motion.div>
                    )}

                    {/* ── STEP 2: OTP ── */}
                    {step === 2 && (
                        <motion.div
                            key="otp-step"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            className="px-8 py-8 flex flex-col items-center"
                        >
                            {/* Title */}
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">OTP Verification</h3>

                            {/* Description */}
                            <p className="text-center text-sm text-gray-500 mb-1 leading-relaxed">
                                We Will send you a one time password on
                            </p>
                            <p className="text-center text-sm text-gray-500 mb-1">
                                this{" "}<span className="font-bold text-gray-800">Mobile Number</span>
                            </p>
                            <p className="text-center font-bold text-gray-900 mb-8 text-sm">
                                +91 - {formData.mobile || "XXXXXXXXXX"}
                            </p>

                            {/* OTP Inputs — circular style */}
                            <div className="flex gap-4 mb-6">
                                {[0, 1, 2, 3].map((index) => (
                                    <input
                                        key={index}
                                        id={`signup-otp-${index}`}
                                        type="text"
                                        maxLength="1"
                                        value={otpValues[index]}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                        className="w-14 h-14 border-2 border-yellow-400 rounded-full text-center text-xl font-bold text-gray-800 outline-none focus:ring-4 focus:ring-yellow-100 bg-white transition-all"
                                    />
                                ))}
                            </div>

                            {/* Timer */}
                            <div className="text-sm font-mono text-gray-500 mb-4">
                                {`00.${timer.toString().padStart(2, "0")}`}
                            </div>

                            {/* Resend */}
                            <p className="text-sm text-gray-500 mb-8">
                                Do not send OTP ?{" "}
                                <button
                                    onClick={handleResendOtp}
                                    disabled={timer > 0 || isSubmitting}
                                    className="text-yellow-500 font-bold hover:text-yellow-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                                >
                                    Resend OTP
                                </button>
                            </p>

                            {/* Verifying / Error */}
                            {isVerifying && (
                                <div className="flex items-center gap-2 text-yellow-600 font-semibold text-sm mb-4">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Verifying...
                                </div>
                            )}
                            {errors.otp && (
                                <div className="flex items-center gap-1 text-sm text-red-500 font-medium mb-4">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>{errors.otp}</span>
                                </div>
                            )}

                            {/* Yellow pill arrow button */}
                            <button
                                onClick={() => {
                                    if (otpValues.every((v) => v.length === 1)) {
                                        handleOtpChange(3, otpValues[3]);
                                    }
                                }}
                                disabled={isVerifying || !otpValues.every((v) => v.length === 1)}
                                className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full px-6 py-3 font-semibold transition-all shadow-md"
                            >
                                <span className="w-7 h-7 bg-white rounded-full flex items-center justify-center">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </span>
                            </button>
                        </motion.div>
                    )}

                    {/* ── STEP 3: KYC Upload ── */}
                    {step === 3 && (
                        <motion.div
                            key="kyc-step"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            className="px-6 py-6"
                        >
                            {/* Back */}
                            <button
                                onClick={handleBackStep}
                                className="flex items-center text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6 group"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 group-hover:-translate-x-0.5 transition-transform">
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                                Back
                            </button>

                            {/* Heading */}
                            <div className="text-center mb-8">
                                <h3 className="text-xl font-bold text-gray-900 mb-1.5">Upload Your Documents</h3>
                                <p className="text-sm text-gray-400">Complete your verification by uploading the required documents</p>
                            </div>

                            {/* Upload Cards */}
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                {[
                                    { id: "pan", title: "PAN Card", desc: "PDF, JPG or PNG" },
                                    { id: "aadhaar", title: "Aadhaar Card", desc: "PDF, JPG or PNG" },
                                    { id: "gst", title: "GST Certificate", desc: "PDF, JPG or PNG", optional: true }
                                ].map((doc) => (
                                    <div key={doc.id} className="flex flex-col gap-2">
                                        <label className="text-xs font-semibold text-gray-600">
                                            {doc.title}
                                            {doc.optional && <span className="text-gray-400 font-normal ml-1">(Optional)</span>}
                                        </label>

                                        <input
                                            type="file"
                                            id={`${doc.id}-upload`}
                                            className="hidden"
                                            onChange={(e) => handleFileChange(doc.id, e)}
                                        />

                                        <div
                                            onClick={() => handleUploadClick(`${doc.id}-upload`)}
                                            className={`border rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all h-36 ${kycFiles[doc.id]
                                                ? "border-green-400 bg-green-50"
                                                : "border-gray-200 hover:border-yellow-400 hover:bg-yellow-50/40"
                                                }`}
                                        >
                                            {kycFiles[doc.id] ? (
                                                <div className="flex flex-col items-center gap-2 px-3 text-center">
                                                    {/* Green circle check */}
                                                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-[11px] font-semibold text-green-700">Uploaded Successfully</p>
                                                    <p className="text-[10px] text-green-600 truncate max-w-[100px]">{kycFiles[doc.id].name}</p>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleUploadClick(`${doc.id}-upload`); }}
                                                        className="text-[10px] text-red-700 font-semibold underline underline-offset-1 hover:text-green-900"
                                                    >
                                                        Reupload
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2">
                                                    {/* Upload icon in circle */}
                                                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-500">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m14-7-5-5-5 5m5-5v12" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-[11px] font-semibold text-gray-600">Upload File</p>
                                                    <p className="text-[10px] text-gray-400">{doc.desc}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleSkip}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 rounded-full text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-all"
                                >
                                    Skip for Now
                                </button>
                                <button
                                    onClick={handleFinalSubmit}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 rounded-full text-sm font-bold bg-yellow-400 text-gray-900 hover:bg-yellow-500 transition-all shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" />Processing...</>
                                    ) : apiSuccess ? (
                                        <><CheckCircle2 className="w-4 h-4" />Success!</>
                                    ) : "Complete Registration"}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default PartnerSignupModal;
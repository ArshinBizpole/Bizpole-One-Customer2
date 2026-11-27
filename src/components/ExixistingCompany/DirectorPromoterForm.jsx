import { useState,useEffect } from "react";
import { upsertCompany } from "../../api/CompanyApi";
import { getSecureItem } from "../../utils/secureStorage";

// Business type constants (should match CompanyInformationForm)
const BUSINESS_TYPES = {
  PRIVATE_LIMITED: "Private Limited",
  LLP: "LLP",
  OPC: "OPC",
  PARTNERSHIP: "Partnership",
  PROPRIETORSHIP: "Proprietorship"
};

// Field matrix for director fields based on business type
const directorFieldMatrix = {
  fullName: {
    mandatory: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP]
  },
  designation: {
    mandatory: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP]
  },
  din: {
    mandatory: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP] // DIN mandatory for Private Limited & LLP only
  },
  mobile: {
    mandatory: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP]
  },
  email: {
    mandatory: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP]
  },
  pan: {
    mandatory: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP]
  },
  shareholding: {
    mandatory: [] // Non-mandatory for all
  },
  shareCapital: {
    mandatory: [] // Non-mandatory for all
  },
  profitShare: {
    mandatory: [] // Non-mandatory for all
  }
};

function isDirectorFieldMandatory(fieldName, businessType) {
  const config = directorFieldMatrix[fieldName];
  if (!config || !businessType) return false;
  return config.mandatory.includes(businessType);
}

const DirectorPromoterForm = ({ onNext, onBack, initialData }) => {
  const [companyInfo, setCompanyInfo] = useState(null);
  const [businessType, setBusinessType] = useState("");
  const [count, setCount] = useState(initialData?.count || 1);
  const [directors, setDirectors] = useState(
    initialData?.directors || [
      {
        fullName: "",
        designation: "",
        din: "",
        mobile: "",
        email: "",
        pan: "",
        shareholding: "",
        shareCapital: "",
        profitShare: "",
        isPrimary: true
      },
    ]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({});

  // Load company info from secure storage on mount
  useEffect(() => {
    const loadCompanyInfo = async () => {
      try {
        const stored = await getSecureItem("companyInfo");
        if (stored) {
          const parsed = typeof stored === "string" ? JSON.parse(stored) : stored;
          setCompanyInfo(parsed);
          setBusinessType(parsed.ConstitutionCategory || "");
          
          // Set initial director count based on business type - only when there's
          // no previously-typed draft to restore (e.g. first visit to this step)
          const type = parsed.ConstitutionCategory;
          if (!initialData && (type === BUSINESS_TYPES.OPC || type === BUSINESS_TYPES.PROPRIETORSHIP)) {
            setCount(1);
            setDirectors([{
              fullName: "",
              designation: type === BUSINESS_TYPES.OPC ? "Director" : "Proprietor",
              din: "",
              mobile: "",
              email: "",
              pan: "",
              shareholding: "",
              shareCapital: "",
              profitShare: "",
              isPrimary: true
            }]);
          }
        }
      } catch (err) {
        console.error("Error loading company info:", err);
        setError("Unable to load company information. Please go back to Company Information step.");
      }
    };
    loadCompanyInfo();
  }, []);

  // Check if director count selection should be disabled
  const isCountDisabled = () => {
    return businessType === BUSINESS_TYPES.OPC || businessType === BUSINESS_TYPES.PROPRIETORSHIP;
  };

  // Get max directors based on business type
  const getMaxDirectors = () => {
    if (businessType === BUSINESS_TYPES.OPC) return 1;
    if (businessType === BUSINESS_TYPES.PROPRIETORSHIP) return 1;
    if (businessType === BUSINESS_TYPES.PARTNERSHIP) return 50;
    return 15; // Default for Private Limited, LLP
  };

  // Get count options based on business type
  const getCountOptions = () => {
    const max = getMaxDirectors();
    const options = [];
    for (let i = 1; i <= max; i++) {
      options.push(i);
    }
    return options;
  };

  // Handle number of directors change
  const handleCountChange = (e) => {
    if (isCountDisabled()) return;
    
    const newCount = Number(e.target.value);
    setCount(newCount);

    setDirectors((prev) => {
      if (newCount > prev.length) {
        // Add new directors
        const newDirectors = [...prev];
        for (let i = prev.length; i < newCount; i++) {
          newDirectors.push({
            fullName: "", 
            designation: "", 
            din: "", 
            mobile: "", 
            email: "", 
            pan: "", 
            shareholding: "",
            shareCapital: "",
            profitShare: "",
            isPrimary: i === 0 // First one remains primary
          });
        }
        return newDirectors;
      } else {
        // Remove directors
        return prev.slice(0, newCount).map((director, index) => ({
          ...director,
          isPrimary: index === 0 // Ensure first one is primary if removing others
        }));
      }
    });
  };

  // Handle input changes for each director
  const handleDirectorChange = (idx, field, value) => {
    setDirectors((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  // Handle blur for validation
  const handleBlur = (idx, field) => {
    setTouched((prev) => ({
      ...prev,
      [`${idx}-${field}`]: true,
    }));
  };

  // Set primary director
  const setPrimaryDirector = (idx) => {
    setDirectors((prev) =>
      prev.map((director, index) => ({
        ...director,
        isPrimary: index === idx,
      }))
    );
  };

  // Validation functions
  const validateEmail = (email) => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateMobile = (mobile) => {
    if (!mobile) return false;
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(mobile);
  };

  const validatePAN = (pan) => {
    if (!pan) return false;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
  };

  const validateDIN = (din) => {
    if (!din) return true; // DIN is optional for some business types
    const dinRegex = /^\d{8}$/;
    return dinRegex.test(din);
  };

  const validateForm = () => {
    const errors = [];

    // Validate each director based on business type
    directors.forEach((director, idx) => {
      // Full Name - Mandatory for all
      if (isDirectorFieldMandatory("fullName", businessType) && !director.fullName?.trim()) {
        errors.push(`Director ${idx + 1}: Full Name is required`);
      }

      // Designation - Mandatory for all
      if (isDirectorFieldMandatory("designation", businessType) && !director.designation) {
        errors.push(`Director ${idx + 1}: Designation is required`);
      }

      // DIN - Mandatory only for Private Limited & LLP
      if (isDirectorFieldMandatory("din", businessType) && !director.din?.trim()) {
        errors.push(`Director ${idx + 1}: DIN is required for ${businessType}`);
      } else if (director.din && !validateDIN(director.din)) {
        errors.push(`Director ${idx + 1}: DIN should be 8 digits`);
      }

      // Mobile - Mandatory for all
      if (isDirectorFieldMandatory("mobile", businessType) && !director.mobile?.trim()) {
        errors.push(`Director ${idx + 1}: Mobile Number is required`);
      } else if (director.mobile && !validateMobile(director.mobile)) {
        errors.push(`Director ${idx + 1}: Mobile Number must be 10 digits starting with 6-9`);
      }

      // Email - Mandatory for all
      if (isDirectorFieldMandatory("email", businessType) && !director.email?.trim()) {
        errors.push(`Director ${idx + 1}: Email is required`);
      } else if (director.email && !validateEmail(director.email)) {
        errors.push(`Director ${idx + 1}: Please enter a valid email address`);
      }

      // PAN - Mandatory for all
      if (isDirectorFieldMandatory("pan", businessType) && !director.pan?.trim()) {
        errors.push(`Director ${idx + 1}: PAN is required`);
      } else if (director.pan && !validatePAN(director.pan)) {
        errors.push(`Director ${idx + 1}: PAN should be in valid format (e.g., ABCDE1234F)`);
      }
    });

    return errors;
  };

  // Check if field has error
  const hasError = (idx, field) => {
    if (!isDirectorFieldMandatory(field, businessType)) return false;
    return touched[`${idx}-${field}`] && !directors[idx][field]?.trim();
  };

  // Handle "Next" (submit) button
  const handleNext = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate form
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setError(validationErrors[0]);
        setLoading(false);
        return;
      }

      // Safely retrieve and parse company info from secure storage
      const storedCompany = await getSecureItem("companyInfo");
      
      let companyInfoData = null;

      if (storedCompany) {
        try {
          companyInfoData = typeof storedCompany === "string"
            ? JSON.parse(storedCompany)
            : storedCompany;
        } catch (err) {
          console.error("Error parsing companyInfo:", err);
          setError("Invalid company information. Please complete the previous step again.");
          setLoading(false);
          return;
        }
      }

      // Validate EmployeeID & FranchiseID
      if (!companyInfoData || !companyInfoData.EmployeeID || !companyInfoData.FranchiseID) {
        setError(
          "Please complete the Company Information step to assign an agent and franchisee before proceeding."
        );
        setLoading(false);
        return;
      }

      // Map directors → Customers array
      const Customers = directors.map((d, index) => ({
        FirstName: d.fullName.split(' ')[0] || d.fullName,
        LastName: d.fullName.split(' ').slice(1).join(' ') || "",
        DateOfBirth: "",
        PreferredLanguage: companyInfoData.Customers?.[0]?.PreferredLanguage || "english",
        Email: d.email,
        Mobile: d.mobile,
        Country: "India",
        State: companyInfoData.State || "",
        City: companyInfoData.City || "",
        PinCode: companyInfoData.PinCode || "",
        PANNumber: d.pan?.toUpperCase() || "",
        DIN: d.din || "",
        Shareholding: d.shareholding || "",
        ShareCapital: d.shareCapital || "",
        ProfitShare: d.profitShare || "",
        IsComponyRegistered: 1,
        PrimaryCustomer: d.isPrimary ? 1 : 0,
      }));

      // Merge into final payload
      const payload = {
        ...companyInfoData,
        Customers,
        EmployeeID: companyInfoData.EmployeeID,
        FranchiseID: companyInfoData.FranchiseID,
      };

      console.log("Final payload:", payload);

      // API call
      await upsertCompany(payload);
      // Pass this step's data along so navigating back here later restores it
      if (onNext) onNext({ directors, count });
    } catch (err) {
      console.error("Error while saving:", err);
      setError(err.response?.data?.message || "Failed to save director/promoter details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Get designation options based on business type
  const getDesignationOptions = () => {
    if (businessType === BUSINESS_TYPES.PROPRIETORSHIP) {
      return [
        { value: "Proprietor", label: "Proprietor" }
      ];
    }
    if (businessType === BUSINESS_TYPES.PARTNERSHIP) {
      return [
        { value: "Partner", label: "Partner" },
        { value: "Managing Partner", label: "Managing Partner" }
      ];
    }
    if (businessType === BUSINESS_TYPES.OPC) {
      return [
        { value: "Director", label: "Director" },
        { value: "Nominee Director", label: "Nominee Director" }
      ];
    }
    // Private Limited & LLP
    return [
      { value: "Director", label: "Director" },
      { value: "Managing Director", label: "Managing Director" },
      { value: "CEO", label: "CEO" },
      { value: "CFO", label: "CFO" },
      { value: "Company Secretary", label: "Company Secretary" },
      { value: "Whole-time Director", label: "Whole-time Director" },
      { value: "Independent Director", label: "Independent Director" }
    ];
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
      {/* Header with Logo - Mobile/Tablet */}
      <div className="lg:hidden flex justify-between items-center p-4 bg-white shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">Director Details</h1>
        <img src="/logo.png" alt="Company Logo" className="h-8 w-auto" />
      </div>

      {/* Left Section */}
      <div className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header with Logo - Desktop */}
          <div className="hidden lg:flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Director/Promoter Details</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-1.5 w-20 bg-yellow-400 rounded-full"></div>
                <span className="text-xs text-gray-500">Step 2 of 4</span>
              </div>
              {businessType && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full mt-2 inline-block">
                  {businessType}
                </span>
              )}
            </div>
 <img
              src="/Images/logo.webp"
              alt="Bizpole Logo"
              className="h-12 md:h-14 lg:h-14"
            />          </div>

          {/* Mobile Header Progress */}
          <div className="lg:hidden mb-4">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-20 bg-yellow-400 rounded-full"></div>
              <span className="text-xs text-gray-500">Step 2 of 4</span>
            </div>
            {businessType && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full mt-2 inline-block">
                {businessType}
              </span>
            )}
          </div>

          {/* Number of Directors/Partners Dropdown */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Number of Directors/Partners *
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <select
                className={`w-full sm:w-48 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 ${
                  isCountDisabled() 
                    ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
                    : 'border-gray-200 hover:border-yellow-200'
                }`}
                value={count}
                onChange={handleCountChange}
                disabled={loading || isCountDisabled()}
              >
                {getCountOptions().map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              {isCountDisabled() && (
                <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                  Fixed to 1 for {businessType}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {businessType === BUSINESS_TYPES.OPC 
                ? "One Person Company must have exactly 1 director."
                : businessType === BUSINESS_TYPES.PROPRIETORSHIP
                ? "Proprietorship must have exactly 1 proprietor."
                : "Select the number of directors/partners. The first will be set as primary."}
            </p>
          </div>

          {/* Director/Partner Details */}
          <div className="space-y-4">
            {directors.map((director, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl shadow-sm p-4 relative border border-gray-100"
              >
                {/* Header with Director Number and Primary Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                      Director {idx + 1}
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="primaryDirector"
                        checked={director.isPrimary}
                        onChange={() => setPrimaryDirector(idx)}
                        className="w-3.5 h-3.5 accent-yellow-400"
                        disabled={loading || idx === 0} // First director is always primary by default
                      />
                      <span className="text-xs font-medium text-yellow-600">
                        Primary
                      </span>
                    </label>
                  </div>
                  {director.isPrimary && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                      Primary Director
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Full Name - Mandatory for all */}
                    <div>
                      <label className="block mb-1 text-xs font-medium text-gray-600">
                        Full Name
                        {isDirectorFieldMandatory("fullName", businessType) && <span className="text-red-500 ml-1">*</span>}
                        {!isDirectorFieldMandatory("fullName", businessType) && <span className="text-gray-400 text-xs ml-2">(Optional)</span>}
                      </label>
                      <input
                        type="text"
                        value={director.fullName}
                        onChange={(e) => handleDirectorChange(idx, "fullName", e.target.value)}
                        onBlur={() => handleBlur(idx, "fullName")}
                        placeholder="e.g. John Doe"
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all ${
                          hasError(idx, "fullName") 
                            ? 'border-red-400 bg-red-50' 
                            : director.fullName 
                              ? 'border-green-400 bg-green-50' 
                              : 'border-gray-200 hover:border-yellow-200'
                        }`}
                        disabled={loading}
                      />
                      {hasError(idx, "fullName") && (
                        <p className="text-red-500 text-xs mt-1">Full Name is required</p>
                      )}
                    </div>

                    {/* Designation - Mandatory for all */}
                    <div>
                      <label className="block mb-1 text-xs font-medium text-gray-600">
                        Designation
                        {isDirectorFieldMandatory("designation", businessType) && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <select
                        value={director.designation}
                        onChange={(e) => handleDirectorChange(idx, "designation", e.target.value)}
                        onBlur={() => handleBlur(idx, "designation")}
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all ${
                          hasError(idx, "designation") 
                            ? 'border-red-400 bg-red-50' 
                            : director.designation 
                              ? 'border-green-400 bg-green-50' 
                              : 'border-gray-200 hover:border-yellow-200'
                        }`}
                        disabled={loading}
                      >
                        <option value="">Select Designation</option>
                        {getDesignationOptions().map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {hasError(idx, "designation") && (
                        <p className="text-red-500 text-xs mt-1">Designation is required</p>
                      )}
                    </div>

                    {/* DIN - Mandatory only for Private Limited & LLP */}
                    {isDirectorFieldMandatory("din", businessType) && (
                      <div>
                        <label className="block mb-1 text-xs font-medium text-gray-600">
                          DIN
                          {isDirectorFieldMandatory("din", businessType) && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <input
                          type="text"
                          value={director.din}
                          onChange={(e) => handleDirectorChange(idx, "din", e.target.value)}
                          onBlur={() => handleBlur(idx, "din")}
                          placeholder="e.g. 12345678"
                          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all ${
                            hasError(idx, "din") 
                              ? 'border-red-400 bg-red-50' 
                              : director.din 
                                ? 'border-green-400 bg-green-50' 
                                : 'border-gray-200 hover:border-yellow-200'
                          }`}
                          disabled={loading}
                          maxLength="8"
                        />
                        {hasError(idx, "din") && (
                          <p className="text-red-500 text-xs mt-1">DIN is required for {businessType}</p>
                        )}
                      </div>
                    )}

                    {/* Shareholding % - Non-mandatory */}
                    <div>
                      <label className="block mb-1 text-xs font-medium text-gray-600">
                        Shareholding %
                        <span className="text-gray-400 text-xs ml-2">(Optional)</span>
                      </label>
                      <input
                        type="number"
                        value={director.shareholding}
                        onChange={(e) => handleDirectorChange(idx, "shareholding", e.target.value)}
                        placeholder="e.g. 50"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 hover:border-yellow-200 transition-all"
                        disabled={loading}
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Mobile - Mandatory for all */}
                    <div>
                      <label className="block mb-1 text-xs font-medium text-gray-600">
                        Mobile Number
                        {isDirectorFieldMandatory("mobile", businessType) && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type="tel"
                        value={director.mobile}
                        onChange={(e) => handleDirectorChange(idx, "mobile", e.target.value)}
                        onBlur={() => handleBlur(idx, "mobile")}
                        placeholder="e.g. 9876543210"
                        maxLength="10"
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all ${
                          hasError(idx, "mobile") 
                            ? 'border-red-400 bg-red-50' 
                            : director.mobile && /^[6-9]\d{9}$/.test(director.mobile)
                              ? 'border-green-400 bg-green-50' 
                              : 'border-gray-200 hover:border-yellow-200'
                        }`}
                        disabled={loading}
                      />
                      {hasError(idx, "mobile") && (
                        <p className="text-red-500 text-xs mt-1">Mobile number is required</p>
                      )}
                    </div>

                    {/* Email - Mandatory for all */}
                    <div>
                      <label className="block mb-1 text-xs font-medium text-gray-600">
                        Email ID
                        {isDirectorFieldMandatory("email", businessType) && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type="email"
                        value={director.email}
                        onChange={(e) => handleDirectorChange(idx, "email", e.target.value)}
                        onBlur={() => handleBlur(idx, "email")}
                        placeholder="e.g. john@example.com"
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all ${
                          hasError(idx, "email") 
                            ? 'border-red-400 bg-red-50' 
                            : director.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(director.email)
                              ? 'border-green-400 bg-green-50' 
                              : 'border-gray-200 hover:border-yellow-200'
                        }`}
                        disabled={loading}
                      />
                      {hasError(idx, "email") && (
                        <p className="text-red-500 text-xs mt-1">Email is required</p>
                      )}
                    </div>

                    {/* PAN - Mandatory for all */}
                    <div>
                      <label className="block mb-1 text-xs font-medium text-gray-600">
                        PAN
                        {isDirectorFieldMandatory("pan", businessType) && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type="text"
                        value={director.pan}
                        onChange={(e) => handleDirectorChange(idx, "pan", e.target.value.toUpperCase())}
                        onBlur={() => handleBlur(idx, "pan")}
                        placeholder="e.g. ABCDE1234F"
                        maxLength="10"
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all ${
                          hasError(idx, "pan") 
                            ? 'border-red-400 bg-red-50' 
                            : director.pan && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(director.pan)
                              ? 'border-green-400 bg-green-50' 
                              : 'border-gray-200 hover:border-yellow-200'
                        }`}
                        disabled={loading}
                      />
                      {hasError(idx, "pan") && (
                        <p className="text-red-500 text-xs mt-1">PAN is required</p>
                      )}
                    </div>

                    {/* Share Capital - Non-mandatory */}
                    <div>
                      <label className="block mb-1 text-xs font-medium text-gray-600">
                        Share Capital
                        <span className="text-gray-400 text-xs ml-2">(Optional)</span>
                      </label>
                      <input
                        type="number"
                        value={director.shareCapital}
                        onChange={(e) => handleDirectorChange(idx, "shareCapital", e.target.value)}
                        placeholder="e.g. 500000"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 hover:border-yellow-200 transition-all"
                        disabled={loading}
                        min="0"
                      />
                    </div>

                    {/* Profit Share % - Non-mandatory */}
                    <div>
                      <label className="block mb-1 text-xs font-medium text-gray-600">
                        Profit Share %
                        <span className="text-gray-400 text-xs ml-2">(Optional)</span>
                      </label>
                      <input
                        type="number"
                        value={director.profitShare}
                        onChange={(e) => handleDirectorChange(idx, "profitShare", e.target.value)}
                        placeholder="e.g. 50"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 hover:border-yellow-200 transition-all"
                        disabled={loading}
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200">
            <button
              className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-all disabled:opacity-50"
              type="button"
              disabled={loading}
              onClick={onBack}
            >
              ←
            </button>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 accent-yellow-400" disabled={loading} />
                <span className="text-xs text-gray-600">Save & continue later</span>
              </label>
              
              <button
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-6 py-2.5 rounded-full flex items-center gap-1.5 transition-all shadow-sm hover:shadow text-sm disabled:opacity-50"
                onClick={handleNext}
                disabled={loading || !businessType}
              >
                {loading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    Next Step
                    <span className="text-lg">→</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <span className="text-red-600 text-sm">❌</span>
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Timeline Stepper */}
         {/* Right Sidebar - Timeline Stepper */}
<div className="hidden lg:block w-80 bg-gradient-to-b from-yellow-400 to-yellow-500 text-black p-6 rounded-tl-3xl rounded-bl-3xl">
  <div className="sticky top-30">
    <h2 className="font-bold text-lg mb-1 text-center">Quick Setup</h2>
    <p className="text-black text-xs mb-8 text-center">Complete these 4 steps</p>

    <div className="relative">
      {/* Progress Line */}
      <div className="absolute left-3 top-2 bottom-0 w-0.5 bg-yellow-300"></div>

      {/* Step 1 */}
      <div className="relative flex items-center gap-3 mb-8">
        <div className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center font-bold text-xs z-10 shadow flex-shrink-0"><svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg></div>
        <div>
          <h3 className="font-semibold text-sm text-white">Company Information</h3>
          <p className="text-white text-xs">Basic company details</p>
        </div>
      </div>

      {/* Step 2 */}
      <div className="relative flex items-center gap-3 mb-8">
        <div className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center font-bold text-xs z-10 flex-shrink-0">2</div>
        <div>
          <h3 className="font-semibold text-sm text-black">Director/Promoter Details</h3>
          <p className="text-black text-xs">Add directors/promoters</p>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full mt-0.5 inline-block">Current</span>

        </div>
      </div>

      {/* Step 3 */}
      <div className="relative flex items-center gap-3 mb-8">
        <div className="w-6 h-6 bg-white/20 text-black rounded-full flex items-center justify-center font-bold text-xs z-10 flex-shrink-0">3</div>
        <div>
          <h3 className="font-semibold text-sm text-black">Registration Status</h3>
          <p className="text-black text-xs">Company & tax registrations</p>
        </div>
      </div>

      {/* Step 4 */}
      <div className="relative flex items-center gap-3">
        <div className="w-6 h-6 bg-white/20 text-black rounded-full flex items-center justify-center font-bold text-xs z-10 flex-shrink-0">4</div>
        <div>
          <h3 className="font-semibold text-sm text-black">Compliance</h3>
          <p className="text-black text-xs">Final verification & documents</p>
        </div>
      </div>
    </div>

    {/* Progress Summary */}
    <div className="mt-10 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
      <div className="flex justify-between mb-1 text-xs text-black mb-3">
        <span>Overall Progress</span>
        <span className="font-bold">50%</span>
      </div>
      <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div className="w-1/2 h-full bg-white rounded-full"></div>
      </div>
    </div>
  </div>
</div>
    </div>
  );
};

export default DirectorPromoterForm;

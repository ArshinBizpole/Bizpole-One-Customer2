// Business type constants
const BUSINESS_TYPES = {
  PRIVATE_LIMITED: "Private Limited",
  LLP: "LLP",
  OPC: "OPC",
  PARTNERSHIP: "Partnership",
  PROPRIETORSHIP: "Proprietorship"
};

// Field matrix config: controls visibility and mandatory status
const fieldMatrix = {
  businessType: {
    visible: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP],
    mandatory: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP]
  },
  businessName: {
    visible: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP],
    mandatory: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP]
  },
  dateOfIncorporation: {
    visible: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP],
    mandatory: []
  },
  pan: {
    visible: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP],
    mandatory: []
  },
  cin: {
    visible: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.OPC],
    mandatory: []
  },
  llpin: {
    visible: [BUSINESS_TYPES.LLP],
    mandatory: [BUSINESS_TYPES.LLP]
  },
  sector: {
    visible: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP],
    mandatory: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP]
  },
  natureOfBusiness: {
    visible: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP],
    mandatory: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP]
  },
  capital: {
    visible: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP],
    mandatory: []
  },
  turnover: {
    visible: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP],
    mandatory: []
  },
  preferredLanguage: {
    visible: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP],
    mandatory: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP]
  },
  registeredOffice: {
    visible: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP],
    mandatory: []
  },
  district: {
    visible: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP],
    mandatory: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP]
  },
  state: {
    visible: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP],
    mandatory: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP]
  },
  communicationAddress: {
    visible: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP],
    mandatory: []
  },
  companyMobile: {
    visible: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP],
    mandatory: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP]
  },
  companyEmail: {
    visible: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP],
    mandatory: [BUSINESS_TYPES.PRIVATE_LIMITED, BUSINESS_TYPES.LLP, BUSINESS_TYPES.OPC, BUSINESS_TYPES.PARTNERSHIP, BUSINESS_TYPES.PROPRIETORSHIP]
  }
};

function isFieldMandatory(fieldName, businessType) {
  const config = fieldMatrix[fieldName];
  if (!config || !businessType) return false;
  return config.mandatory.includes(businessType);
}

function isFieldVisible(fieldName, businessType) {
  const config = fieldMatrix[fieldName];
  if (!config || !businessType) return false;
  return config.visible.includes(businessType);
}

function getVisibleFields(businessType) {
  return {
    showCIN: isFieldVisible("cin", businessType),
    showLLPIN: isFieldVisible("llpin", businessType)
  };
}

import React, { useState, useEffect } from "react";
// import { upsertCompany } from "../../api/CompanyApi";
import { getAllStates } from "../../api/States";
import { assignCustomer } from "../../api/CustomerApi";
import { setSecureItem } from "../../utils/secureStorage";

const CompanyInformationForm = ({ onNext }) => {
  const [form, setForm] = useState({
    businessType: "",
    businessName: "",
    dateOfIncorporation: "",
    pan: "",
    cin: "",
    llpin: "",
    sector: "IT",
    natureOfBusiness: "",
    capital: "",
    turnover: "",
    gstStatus: "",
    gstNumber: "",
    gstType: "",
    registeredOffice: "",
    commAddress1: "",
    commAddress2: "",
    commCity: "",
    commState: "",
    commPincode: "",
    preferredLanguage: "",
    employeeId: "",
    agentName: "",
    franchiseeId: "",
    companyMobile: "",
    companyEmail: "",
  });

  // Language dropdown options
  const languageOptions = [
    { label: "English", value: "english" },
    { label: "Hindi", value: "hindi" },
    { label: "Marathi", value: "marathi" },
    { label: "Tamil", value: "tamil" },
    { label: "Telugu", value: "telugu" },
    { label: "Gujarati", value: "gujarati" },
    { label: "Bengali", value: "bengali" },
    { label: "Kannada", value: "kannada" },
    { label: "Malayalam", value: "malayalam" },
  ];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [states, setStates] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [touched, setTouched] = useState({});

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const data = await getAllStates();
        setStates(data || []);
      } catch (err) {
        console.error("Error fetching states:", err);
        setStates([]);
      }
    };
    fetchStates();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear district error when user starts typing
    if (name === "commCity" && touched.commCity) {
      setTouched((prev) => ({
        ...prev,
        commCity: false
      }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  // Enhanced assignCustomer function with debouncing
  const handleAssignBlur = () => {
    const { preferredLanguage, commState, commCity } = form;

    // Validate required fields for assignment
    if (!preferredLanguage || !commState || !commCity) {
      setForm((prev) => ({
        ...prev,
        employeeId: "",
        agentName: "",
        franchiseeId: ""
      }));
      setAssignError("Please select Language, State, and City to assign an agent.");
      return;
    }

    setAssignLoading(true);
    setAssignError("");

    assignCustomer({
      language: preferredLanguage,
      state: commState,
      district: commCity,
    })
      .then((res) => {
        if (res && res.agent && res.agent.id && res.franchiseeId) {
          setForm((prev) => ({
            ...prev,
            employeeId: res.agent.id,
            agentName: res.agent.name || "",
            franchiseeId: res.franchiseeId
          }));
          setAssignError("");
        } else {
          setForm((prev) => ({
            ...prev,
            employeeId: "",
            agentName: "",
            franchiseeId: ""
          }));
          setAssignError("No agent/franchisee found for the selected criteria.");
        }
      })
      .catch((err) => {
        console.error("Error assigning customer:", err);
        setForm((prev) => ({
          ...prev,
          employeeId: "",
          agentName: "",
          franchiseeId: ""
        }));
        setAssignError("Could not assign agent/franchisee. Please try again.");
      })
      .finally(() => {
        setAssignLoading(false);
      });
  };

  const handleRadio = (name, value) => {
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Dynamic validation function - only checks MANDATORY fields
  const validateForm = () => {
    const errors = {};
    const businessType = form.businessType;

    if (!businessType) {
      errors.businessType = "Business Type is required";
      return errors;
    }

    // Check ONLY mandatory fields from fieldMatrix
    Object.keys(fieldMatrix).forEach(field => {
      if (isFieldMandatory(field, businessType)) {
        const value = form[field];
        
        // Special handling for district field
        if (field === "district") {
          if (!form.commCity || form.commCity.trim() === "") {
            errors.district = "District is required";
          }
        } 
        // Special handling for state field
        else if (field === "state") {
          if (!form.commState || form.commState.trim() === "") {
            errors.state = "State is required";
          }
        }
        else {
          if (!value || (typeof value === 'string' && !value.trim())) {
            // Format field name for display
            const fieldDisplay = field
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase());
            errors[field] = `${fieldDisplay} is required`;
          }
        }
      }
    });

    // Optional validations (only if field is filled)
    if (form.pan && form.pan.trim() !== "" && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan.toUpperCase())) {
      errors.pan = "PAN should be in valid format (e.g., ABCDE1234F)";
    }

    if (form.companyMobile && !/^\d{10}$/.test(form.companyMobile)) {
      errors.companyMobile = "Mobile number should be 10 digits";
    }

    if (form.companyEmail && form.companyEmail.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.companyEmail)) {
      errors.companyEmail = "Please enter a valid email address";
    }

    if (form.commPincode && form.commPincode.trim() !== "" && !/^\d{6}$/.test(form.commPincode)) {
      errors.commPincode = "Pincode should be 6 digits";
    }

    return errors;
  };

  const handleNext = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Mark all mandatory fields as touched for validation
    const businessType = form.businessType;
    if (businessType) {
      const newTouched = { ...touched };
      Object.keys(fieldMatrix).forEach(field => {
        if (isFieldMandatory(field, businessType)) {
          if (field === "district") {
            newTouched.commCity = true;
          } else if (field === "state") {
            newTouched.commState = true;
          } else {
            newTouched[field] = true;
          }
        }
      });
      setTouched(newTouched);
    }

    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setError(Object.values(validationErrors)[0]);
      setLoading(false);
      return;
    }

    try {
      // Map form fields to backend payload structure
      const payload = {
        BusinessName: form.businessName.trim(),
        CompanyPAN: form.pan?.toUpperCase() || "",
        GSTNumber: form.gstNumber || "",
        CIN: form.cin || form.llpin || "",
        ConstitutionCategory: form.businessType,
        Sector: form.sector,
        BusinessNature: form.natureOfBusiness || "",
        Origin: "",
        CompanyEmail: form.companyEmail,
        CompanyMobile: form.companyMobile,
        Website: "",
        Country: "India",
        State: form.commState,
        City: form.commCity.trim(),
        PinCode: form.commPincode,
        EmployeeID: form.employeeId,
        FranchiseID: form.franchiseeId,
        Customers: [
          {
            FirstName: "",
            LastName: "",
            DateOfBirth: "",
            PreferredLanguage: form.preferredLanguage,
            Email: form.companyEmail,
            Mobile: form.companyMobile,
            Country: "India",
            State: form.commState,
            City: form.commCity.trim(),
            PinCode: form.commPincode,
            PANNumber: form.pan?.toUpperCase() || "",
            IsComponyRegistered: 1,
            PrimaryCustomer: 0
        // Console log the payload before saving
    
          }
        ]
      };

          console.log("Saving companyInfo to local storage:", payload);

      // Save to secure storage
      await setSecureItem("companyInfo", JSON.stringify(payload));

      // Call onNext callback if provided
      if (onNext) {
        onNext();
      }
    } catch (err) {
      console.error("Error saving company information:", err);
      setError("Failed to save company information. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if field has error
  const hasError = (fieldName) => {
    if (!isFieldMandatory(fieldName, form.businessType)) return false;
    
    // Special handling for district field
    if (fieldName === "district") {
      return touched.commCity && (!form.commCity || form.commCity.trim() === "");
    }
    // Special handling for state field
    if (fieldName === "state") {
      return touched.commState && (!form.commState || form.commState.trim() === "");
    }
    
    return touched[fieldName] && !form[fieldName]?.trim();
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
      {/* Header with Logo - Mobile/Tablet */}
      <div className="lg:hidden flex justify-between items-center p-4 bg-white shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">Company Info</h1>
        <img src="/logo.png" alt="Company Logo" className="h-8 w-auto" />
      </div>

      {/* Left Section */}
      <div className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header with Logo - Desktop */}
          <div className="hidden lg:flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Company Information</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-1.5 w-20 bg-yellow-400 rounded-full"></div>
                <span className="text-xs text-gray-500">Step 1 of 3</span>
              </div>
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
              <span className="text-xs text-gray-500">Step 1 of 3</span>
            </div>
          </div>

          {/* Business Type Selection - Always Visible */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <label className="block mb-3 text-base font-semibold text-gray-800">
              Type of Business <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {[
                BUSINESS_TYPES.PRIVATE_LIMITED,
                BUSINESS_TYPES.LLP,
                BUSINESS_TYPES.OPC,
                BUSINESS_TYPES.PROPRIETORSHIP,
                BUSINESS_TYPES.PARTNERSHIP
              ].map((type) => (
                <label
                  key={type}
                  className={`
                    flex items-center justify-center p-2.5 rounded-lg border cursor-pointer transition-all text-sm
                    ${form.businessType === type 
                      ? 'border-yellow-400 bg-yellow-50 shadow-sm' 
                      : 'border-gray-200 hover:border-yellow-200 hover:bg-gray-50'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="businessType"
                    value={type}
                    checked={form.businessType === type}
                    onChange={() => handleRadio("businessType", type)}
                    onBlur={handleBlur}
                    className="hidden"
                  />
                  <span className={`font-medium ${form.businessType === type ? 'text-yellow-700' : 'text-gray-700'}`}>
                    {type}
                  </span>
                </label>
              ))}
            </div>
            {touched.businessType && !form.businessType && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                <span>⚠️</span> Please select a business type
              </p>
            )}
          </div>

          {/* Dynamic Form Sections */}
          {form.businessType && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Business Name - MANDATORY */}
                {isFieldVisible("businessName", form.businessType) && (
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Name of Business
                      {isFieldMandatory("businessName", form.businessType) && <span className="text-red-500 ml-1">*</span>}
                      {!isFieldMandatory("businessName", form.businessType) && <span className="text-gray-400 text-xs ml-2">(Optional)</span>}
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      value={form.businessName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="e.g. Bizpole"
                      className={`
                        w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all
                        ${hasError("businessName") 
                          ? 'border-red-400 bg-red-50' 
                          : form.businessName 
                            ? 'border-green-400 bg-green-50' 
                            : 'border-gray-200 hover:border-yellow-200'
                        }
                      `}
                    />
                    {hasError("businessName") && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠️ Business Name is required</p>
                    )}
                  </div>
                )}

                {/* Date of Incorporation - NON-MANDATORY for all */}
                {isFieldVisible("dateOfIncorporation", form.businessType) && (
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Date of Incorporation
                      <span className="text-gray-400 text-xs ml-2">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      name="dateOfIncorporation"
                      value={form.dateOfIncorporation}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 hover:border-yellow-200 transition-all"
                    />
                  </div>
                )}

                {/* PAN - NON-MANDATORY for all */}
                {isFieldVisible("pan", form.businessType) && (
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      PAN of the Entity
                      <span className="text-gray-400 text-xs ml-2">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      name="pan"
                      value={form.pan}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="e.g. ABCDE1234F"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 hover:border-yellow-200 transition-all"
                      maxLength="10"
                    />
                    {form.pan && form.pan.length === 10 && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan.toUpperCase()) && (
                      <p className="text-orange-500 text-xs mt-1 flex items-center gap-1">⚠️ Invalid PAN format</p>
                    )}
                  </div>
                )}

                {/* CIN/LLPIN - NON-MANDATORY based on business type */}
                {(() => {
                  const { showCIN, showLLPIN } = getVisibleFields(form.businessType);
                  if (showCIN) {
                    return (
                      <div className="bg-white rounded-xl shadow-sm p-4">
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">
                          CIN
                          <span className="text-gray-400 text-xs ml-2">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          name="cin"
                          value={form.cin}
                          onChange={handleChange}
                          placeholder="e.g. U72900MH2023PTC123456"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 hover:border-yellow-200 transition-all"
                        />
                      </div>
                    );
                  }
                  if (showLLPIN) {
                    return (
                      <div className="bg-white rounded-xl shadow-sm p-4">
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">
                          LLPIN
                          {isFieldMandatory("llpin", form.businessType)
                            ? <span className="text-red-500 ml-1">*</span>
                            : <span className="text-gray-400 text-xs ml-2">(Optional)</span>
                          }
                        </label>
                        <input
                          type="text"
                          name="llpin"
                          value={form.llpin || ""}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="e.g. LLP12345"
                          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all ${
                            hasError("llpin") ? "border-red-400 bg-red-50" : form.llpin ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-yellow-200"
                          }`}
                        />
                        {hasError("llpin") && (
                          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠️ LLPIN is required</p>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Sector - MANDATORY */}
                {isFieldVisible("sector", form.businessType) && (
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Sector
                      {isFieldMandatory("sector", form.businessType) && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <select
                      name="sector"
                      value={form.sector}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 hover:border-yellow-200 transition-all"
                    >
                      <option value="IT">Information Technology</option>
                      <option value="Finance">Finance & Banking</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Services">Services</option>
                      <option value="Trading">Trading</option>
                      <option value="RealEstate">Real Estate</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Education">Education</option>
                    </select>
                  </div>
                )}

                {/* Nature of Business - MANDATORY */}
                {isFieldVisible("natureOfBusiness", form.businessType) && (
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Nature of Business
                      {isFieldMandatory("natureOfBusiness", form.businessType) && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type="text"
                      name="natureOfBusiness"
                      value={form.natureOfBusiness || ""}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="e.g. Software Development"
                      className={`
                        w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all
                        ${hasError("natureOfBusiness") 
                          ? 'border-red-400 bg-red-50' 
                          : form.natureOfBusiness 
                            ? 'border-green-400 bg-green-50' 
                            : 'border-gray-200 hover:border-yellow-200'
                        }
                      `}
                    />
                    {hasError("natureOfBusiness") && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠️ Nature of Business is required</p>
                    )}
                  </div>
                )}

                {/* Capital - NON-MANDATORY */}
                {isFieldVisible("capital", form.businessType) && (
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Capital of the Business
                      <span className="text-gray-400 text-xs ml-2">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      name="capital"
                      value={form.capital}
                      onChange={handleChange}
                      placeholder="e.g. 1000000"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 hover:border-yellow-200 transition-all"
                    />
                  </div>
                )}

                {/* Turnover - NON-MANDATORY */}
                {isFieldVisible("turnover", form.businessType) && (
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Annual Turnover
                      <span className="text-gray-400 text-xs ml-2">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      name="turnover"
                      value={form.turnover}
                      onChange={handleChange}
                      placeholder="e.g. 5000000"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 hover:border-yellow-200 transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* GST Section */}
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    GST Registration
                  </label>
                  <div className="flex flex-wrap gap-4 mb-3">
                    {["Yes", "No", "NA"].map((status) => (
                      <label key={status} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="gstStatus"
                          checked={form.gstStatus === status}
                          onChange={() => handleRadio("gstStatus", status)}
                          className="w-3.5 h-3.5 accent-yellow-400"
                        />
                        <span className="text-sm text-gray-700">{status}</span>
                      </label>
                    ))}
                  </div>

                  {form.gstStatus === "Yes" && (
                    <div className="space-y-3 mt-3 pt-3 border-t border-gray-200">
                      <input
                        type="text"
                        name="gstNumber"
                        value={form.gstNumber}
                        onChange={handleChange}
                        placeholder="GST Registration Number"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
                      />
                      <div className="flex flex-wrap gap-3">
                        {["Regular", "Composition", "IFF"].map((type) => (
                          <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="gstType"
                              checked={form.gstType === type}
                              onChange={() => handleRadio("gstType", type)}
                              className="w-3.5 h-3.5 accent-yellow-400"
                            />
                            <span className="text-sm text-gray-700">{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Registered Office - NON-MANDATORY */}
                {isFieldVisible("registeredOffice", form.businessType) && (
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Registered Office Address
                      <span className="text-gray-400 text-xs ml-2">(Optional)</span>
                    </label>
                    <textarea
                      name="registeredOffice"
                      value={form.registeredOffice}
                      onChange={handleChange}
                      rows="2"
                      placeholder="Enter registered office address"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 hover:border-yellow-200 transition-all"
                    />
                    
                  </div>
                )}

                {/* Communication Address */}
                <div className="bg-white rounded-xl shadow-sm p-4">
                  {/* State */}
                  <div className="mb-2">
                    <label className="block mb-1 text-xs font-medium text-gray-600">
                      State
                      {isFieldMandatory("state", form.businessType) && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <select
                      name="commState"
                      value={form.commState}
                      onChange={handleChange}
                      onBlur={(e) => {
                        handleBlur(e);
                        handleAssignBlur();
                      }}
                      className={`
                        w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all
                        ${hasError("state")
                          ? 'border-red-400 bg-red-50'
                          : form.commState
                            ? 'border-green-400 bg-green-50'
                            : 'border-gray-200 hover:border-yellow-200'
                        }
                      `}
                    >
                      <option value="">Select State</option>
                      {states.map((state) => (
                        <option key={state._id || state.id || state.state_name} value={state.state_name}>
                          {state.state_name}
                        </option>
                      ))}
                    </select>
                    {hasError("state") && (
                      <p className="text-red-500 text-xs mt-1">⚠️ State is required</p>
                    )}
                  </div>

                  {/* District - MANDATORY */}
                  <div className="mb-2">
                    <label className="block mb-1 text-xs font-medium text-gray-600">
                      District
                      {isFieldMandatory("district", form.businessType) && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type="text"
                      name="commCity"
                      value={form.commCity}
                      onChange={handleChange}
                      onBlur={(e) => {
                        handleBlur(e);
                        handleAssignBlur();
                      }}
                      placeholder="Enter district"
                      className={`
                        w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all
                        ${hasError("district")
                          ? 'border-red-400 bg-red-50'
                          : form.commCity && form.commCity.trim() !== ""
                            ? 'border-green-400 bg-green-50'
                            : 'border-gray-200 hover:border-yellow-200'
                        }
                      `}
                    />
                    {hasError("district") && (
                      <p className="text-red-500 text-xs mt-1">⚠️ District is required</p>
                    )}
                  </div>

                  <label className="block mb-1.5 text-sm font-medium text-gray-700">
                    Communication Address
                  </label>

                  <textarea
                    name="commAddress1"
                    value={form.commAddress1}
                    onChange={handleChange}
                    rows="2"
                    placeholder="Address (House No, Building, Street, Area)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  />

                  <input
                    type="text"
                    name="commAddress2"
                    value={form.commAddress2}
                    onChange={handleChange}
                    placeholder="Locality/Town"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  />

                  {/* Pincode */}
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">
                      Pincode
                    </label>
                    <input
                      type="text"
                      name="commPincode"
                      value={form.commPincode}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="6 digits"
                      maxLength="6"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
                    />
                  </div>
                </div>

                {/* Preferred Language - MANDATORY */}
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">
                    Preferred Language
                    {isFieldMandatory("preferredLanguage", form.businessType) && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <select
                    name="preferredLanguage"
                    value={form.preferredLanguage}
                    onChange={handleChange}
                    onBlur={(e) => {
                      handleBlur(e);
                      handleAssignBlur();
                    }}
                    className={`
                      w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all
                      ${hasError("preferredLanguage") 
                        ? 'border-red-400 bg-red-50' 
                        : form.preferredLanguage 
                          ? 'border-green-400 bg-green-50' 
                          : 'border-gray-200 hover:border-yellow-200'
                      }
                    `}
                  >
                    <option value="">Select Language</option>
                    {languageOptions.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                  {hasError("preferredLanguage") && (
                    <p className="text-red-500 text-xs mt-1">⚠️ Preferred Language is required</p>
                  )}
                </div>

                {/* Company Mobile - MANDATORY */}
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">
                    Company Mobile
                    {isFieldMandatory("companyMobile", form.businessType) && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="tel"
                    name="companyMobile"
                    value={form.companyMobile}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="10 digit mobile number"
                    maxLength="10"
                    className={`
                      w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all
                      ${hasError("companyMobile") 
                        ? 'border-red-400 bg-red-50' 
                        : form.companyMobile && /^\d{10}$/.test(form.companyMobile)
                          ? 'border-green-400 bg-green-50' 
                          : 'border-gray-200 hover:border-yellow-200'
                      }
                    `}
                  />
                  {hasError("companyMobile") && (
                    <p className="text-red-500 text-xs mt-1">⚠️ Company Mobile is required</p>
                  )}
                </div>

                {/* Company Email - MANDATORY */}
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">
                    Company Email
                    {isFieldMandatory("companyEmail", form.businessType) && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="email"
                    name="companyEmail"
                    value={form.companyEmail}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="company@example.com"
                    className={`
                      w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all
                      ${hasError("companyEmail") 
                        ? 'border-red-400 bg-red-50' 
                        : form.companyEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.companyEmail)
                          ? 'border-green-400 bg-green-50' 
                          : 'border-gray-200 hover:border-yellow-200'
                      }
                    `}
                  />
                  {hasError("companyEmail") && (
                    <p className="text-red-500 text-xs mt-1">⚠️ Company Email is required</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Assignment Status */}
          {assignLoading && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-700">Assigning agent...</span>
            </div>
          )}
          
          {assignError && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
              <span className="text-orange-600 text-sm">⚠️</span>
              <span className="text-sm text-orange-700">{assignError}</span>
            </div>
          )}
          
          {form.employeeId && form.franchiseeId && !assignLoading && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex flex-wrap items-center gap-2 text-sm text-green-700">
                <span>✅</span>
                <span className="font-medium">Agent:</span>
                <span>{form.agentName || form.employeeId}</span>
                <span className="text-xs text-green-600">(ID: {form.employeeId})</span>
                <span className="ml-2 font-medium">Franchisee ID:</span>
                <span>{form.franchiseeId}</span>
              </div>
            </div>
          )}

          {/* Bottom Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200">
            <button 
              className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-all" 
              type="button" 
              disabled={loading}
            >
              ←
            </button>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 accent-yellow-400" />
                <span className="text-xs text-gray-600">Save & continue later</span>
              </label>
              
              <button
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-6 py-2.5 rounded-full flex items-center gap-1.5 transition-all shadow-sm hover:shadow text-sm disabled:opacity-50"
                onClick={handleNext}
                disabled={loading || assignLoading || !form.businessType}
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

          {/* Global Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <span className="text-red-600 text-sm">❌</span>
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}
        </div>
      </div>

    {/* Right Sidebar - Timeline Stepper */}
<div className="hidden lg:block w-80 bg-gradient-to-b from-yellow-400 to-yellow-500 text-black p-6 rounded-tl-3xl rounded-bl-3xl">
  <div className="sticky top-30">
    <h2 className="font-bold text-lg mb-1 text-center">Quick Setup</h2>
    <p className="text-black text-xs mb-8 text-center">Complete these 3 steps</p>
    
    <div className="relative">
      {/* Progress Line */}
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-yellow-300"></div>
      
      {/* Step 1 */}
      <div className="relative flex items-center gap-3 mb-8">
        <div className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center font-bold text-xs z-10 shadow flex-shrink-0">1</div>
        <div>
          <h3 className="font-semibold text-sm text-black">Company Information</h3>
          <p className="text-black text-xs">Basic company details</p>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full mt-0.5 inline-block">Current</span>
        </div>
      </div>
      
      {/* Step 2 */}
      <div className="relative flex items-center gap-3 mb-8">
        <div className="w-6 h-6 bg-white/20 text-black rounded-full flex items-center justify-center font-bold text-xs z-10 flex-shrink-0">2</div>
        <div>
          <h3 className="font-semibold text-sm text-black">Director/Promoter Details</h3>
          <p className="text-black text-xs">Add directors/promoters</p>
        </div>
      </div>
      
      {/* Step 3 */}
      <div className="relative flex items-center gap-3">
        <div className="w-6 h-6 bg-white/20 text-black rounded-full flex items-center justify-center font-bold text-xs z-10 flex-shrink-0">3</div>
        <div>
          <h3 className="font-semibold text-sm text-black">Compliance</h3>
          <p className="text-black text-xs">Final verification & documents</p>
        </div>
      </div>
    </div>
    
    {/* Progress Summary */}
    <div className="mt-10 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
      <div className="flex justify-between mb-1 text-xs text-black">
        <span>Overall Progress</span>
        <span className="font-bold">33%</span>
      </div>
      <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div className="w-1/3 h-full bg-white rounded-full"></div>
      </div>
    </div>
  </div>
</div>
    </div>
  );
};

export default CompanyInformationForm;
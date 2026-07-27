import { useEffect, useState, useRef, useContext } from "react";
import {
  Building2,
  FileText,
  MapPin,
  Users,
  User,
  Phone,
  CheckCircle,
  XCircle,
  ChevronRight,
  Pencil,
  Save,
  X,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { getCompanyDetails, updateCompanyDetails } from "../api/CompanyApi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ProfileCompanyContext } from "./ProfileLayout";

/* ---------- Reusable pieces ---------- */

const ViewField = ({ label, value, valueClassName = "" }) => (
  <div>
    <p className="text-xs text-gray-500 mb-1.5">{label}</p>
    <div
      className={`text-sm bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 min-h-[42px] flex items-center text-gray-700 ${valueClassName}`}
    >
      {value || <span className="text-gray-400">—</span>}
    </div>
  </div>
);

const EditField = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  textarea = false,
}) => (
  <div>
    <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
    {textarea ? (
      <textarea
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        rows={3}
        className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition resize-none"
      />
    ) : (
      <input
        type={type}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"
      />
    )}
  </div>
);

const EditSelect = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
    <select
      value={value || ""}
      onChange={onChange}
      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition bg-white"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

const RadioOption = ({ label, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-2.5 w-full text-left px-4 py-3 rounded-lg border text-sm transition ${
      selected
        ? "border-gray-300 bg-white text-gray-900 font-medium"
        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
    }`}
  >
    <span
      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
        selected ? "border-yellow-500" : "border-gray-300"
      }`}
    >
      {selected && <span className="w-2 h-2 rounded-full bg-yellow-500" />}
    </span>
    {label}
  </button>
);

// columns must be one of these literal classes — Tailwind needs static strings, not interpolated ones
const COLS_CLASS = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" };

const RadioGroup = ({ label, options, value, onChange, columns = 2 }) => (
  <div>
    <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
    <div className={`grid ${COLS_CLASS[columns] || "grid-cols-2"} gap-3`}>
      {options.map((opt) => (
        <RadioOption
          key={opt}
          label={opt}
          selected={value === opt}
          onClick={() => onChange(opt)}
        />
      ))}
    </div>
  </div>
);

const Card = ({ title, icon: Icon, iconBg = "bg-yellow-400", children }) => (
  <div className="bg-white rounded-2xl border border-yellow-100 p-6">
    <div className="flex items-center gap-2.5 mb-6">
      {Icon && (
        <span
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}
        >
          <Icon size={16} className="text-white" />
        </span>
      )}
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
    </div>
    {children}
  </div>
);

const LoadingScreen = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full"
    />
  </div>
);

const ErrorScreen = ({ error }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md text-center border border-gray-200">
      <XCircle className="w-14 h-14 text-yellow-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Something went wrong
      </h3>
      <p className="text-gray-500 text-sm mb-6">{error}</p>
      <button
        onClick={() => window.location.reload()}
        className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-2.5 rounded-lg font-medium text-sm transition"
      >
        Try Again
      </button>
    </div>
  </div>
);

/* ---------- Main component ---------- */

const CompanyDetails = () => {
  const { selectedCompanyId } = useContext(ProfileCompanyContext);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({});
  const [saving, setSaving] = useState(false);

  const [isEditingDirector, setIsEditingDirector] = useState(false);
  const [directorForm, setDirectorForm] = useState({});

  const directorRef = useRef(null);

  useEffect(() => {
    // Reset all state immediately so stale data from the previous company isn't visible
    setCompany(null);
    setError(null);
    setIsEditingCompany(false);
    setIsEditingDirector(false);
    setSaving(false);
    setCompanyForm({});
    setDirectorForm({});

    if (!selectedCompanyId) return;

    const fetchCompany = async () => {
      setLoading(true);
      try {
        const response = await getCompanyDetails(selectedCompanyId);
        if (response.success) {
          setCompany(response.data);
        } else {
          setError("Failed to fetch company details");
        }
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to fetch company details");
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
  }, [selectedCompanyId]);

  const primaryDirector =
    company?.Customers?.find((c) => c.PrimaryCustomer === 1) ||
    company?.Customers?.[0] ||
    {};

  /* ---- Company edit handlers ---- */
  const startEditCompany = () => {
    setCompanyForm({
      businessType:      company?.ConstitutionCategory || "Pvt Ltd",
      businessName:      company?.BusinessName || "",
      companyCode:       company?.CompanyCode || "",
      foundingDate:      company?.CompanyFoundingDate || "",
      pan:               company?.CompanyPAN || "",
      cin:               company?.CIN || "",
      sector:            company?.Sector || "",
      businessActivity:  company?.BusinessNature || "",
      gstNumber:         company?.GSTNumber || "",
      companyEmail:      company?.CompanyEmail || "",
      companyMobile:     company?.CompanyMobile || "",
      website:           company?.Website || "",
      addressLine1:      company?.AddressLine1 || "",
      addressLine2:      company?.AddressLine2 || "",
      district:          company?.District || "",
      city:              company?.City || "",
      state:             company?.State || "",
      country:           company?.Country || "India",
      pincode:           company?.PinCode || "",
    });
    setIsEditingCompany(true);
  };

  const cancelEditCompany = () => setIsEditingCompany(false);

  const handleSaveCompany = async () => {
    setSaving(true);
    try {
      await updateCompanyDetails(selectedCompanyId, {
        ConstitutionCategory: companyForm.businessType,
        BusinessName:         companyForm.businessName,
        CompanyPAN:           companyForm.pan,
        GSTNumber:            companyForm.gstNumber,
        CIN:                  companyForm.cin,
        Sector:               companyForm.sector,
        BusinessNature:       companyForm.businessActivity,
        CompanyFoundingDate:  companyForm.foundingDate || null,
        CompanyEmail:         companyForm.companyEmail,
        CompanyMobile:        companyForm.companyMobile,
        Website:              companyForm.website,
        AddressLine1:         companyForm.addressLine1,
        AddressLine2:         companyForm.addressLine2,
        District:             companyForm.district,
        City:                 companyForm.city,
        State:                companyForm.state,
        PinCode:              companyForm.pincode,
        Country:              companyForm.country,
      });
      setCompany((prev) => ({
        ...prev,
        ConstitutionCategory: companyForm.businessType,
        BusinessName:         companyForm.businessName,
        CompanyCode:          companyForm.companyCode,
        CompanyFoundingDate:  companyForm.foundingDate,
        CompanyPAN:           companyForm.pan,
        CIN:                  companyForm.cin,
        Sector:               companyForm.sector,
        BusinessNature:       companyForm.businessActivity,
        GSTNumber:            companyForm.gstNumber,
        CompanyEmail:         companyForm.companyEmail,
        CompanyMobile:        companyForm.companyMobile,
        Website:              companyForm.website,
        AddressLine1:         companyForm.addressLine1,
        AddressLine2:         companyForm.addressLine2,
        District:             companyForm.district,
        City:                 companyForm.city,
        State:                companyForm.state,
        Country:              companyForm.country,
        PinCode:              companyForm.pincode,
      }));
      setIsEditingCompany(false);
      toast.success("Company details updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update company details");
    } finally {
      setSaving(false);
    }
  };

  const handleContinueToDirector = async () => {
    await handleSaveCompany();
    startEditDirector();
    setTimeout(
      () =>
        directorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      100,
    );
  };

  /* ---- Director edit handlers ---- */
  const startEditDirector = () => {
    setDirectorForm({
      numberOfDirectors: company?.Customers?.length || 1,
      fullName:
        `${primaryDirector.FirstName || ""} ${primaryDirector.LastName || ""}`.trim(),
      designation: primaryDirector.Designation || "",
      din: primaryDirector.DIN || "",
      mobile: primaryDirector.Mobile || "",
      email: primaryDirector.Email || "",
      panNumber: primaryDirector.PANNumber || "",
      dateOfBirth: primaryDirector.DateOfBirth || "",
    });
    setIsEditingDirector(true);
  };

  const cancelEditDirector = () => setIsEditingDirector(false);

  const handleSaveDirector = async () => {
    try {
      // TODO: wire to a real update endpoint for director/promoter info
      setIsEditingDirector(false);
      toast.success("Director details updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update director details");
    }
  };

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;
  if (!company) return <ErrorScreen error="No company data available" />;

  return (
    <div className=" bg-gray-50 p-4 md:p-6 lg:p-8">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-6xl mx-auto space-y-10">
        {/* {companies.length > 1 && (
          <div className="flex items-center gap-3 bg-white rounded-full p-2 border border-gray-200 shadow-sm w-fit">
            <ArrowLeftRight className="w-4 h-4 text-yellow-500 ml-3" />
            <select
              value={selectedCompanyId}
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="bg-transparent border-none focus:outline-none focus:ring-0 px-2 py-1.5 text-sm text-gray-900 font-medium cursor-pointer"
            >
              {companies.map((c) => (
                <option key={c.CompanyID} value={c.CompanyID}>
                  {c.BusinessName || `Company #${c.CompanyID}`}
                </option>
              ))}
            </select>
          </div>
        )} */}

        {/* ===================== Company Details ===================== */}
        <section>
          {!isEditingCompany ? (
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Company details
              </h1>
              <button
                onClick={startEditCompany}
                className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-4 py-2.5 rounded-lg text-sm transition"
              >
                <Pencil size={14} /> Edit Details
              </button>
            </div>
          ) : (
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Company Details
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Manage your business information and settings
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={cancelEditCompany}
                    className="flex items-center gap-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-4 py-2.5 rounded-lg text-sm transition"
                  >
                    <X size={14} /> Cancel
                  </button>
                  <button
                    onClick={handleSaveCompany}
                    disabled={saving}
                    className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-4 py-2.5 rounded-lg text-sm transition disabled:opacity-50"
                  >
                    <Save size={14} /> {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-4 py-3">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                You are currently editing your company details. Don't forget to
                save your changes.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Basic Information */}
            <Card
              title="Basic Information"
              icon={isEditingCompany ? Building2 : undefined}
              iconBg="bg-purple-400"
            >
              {!isEditingCompany ? (
                <div className="space-y-4">
                  <ViewField label="Type of Business"   value={company?.ConstitutionCategory} />
                  <ViewField label="Name of Business"   value={company?.BusinessName} />
                  <ViewField label="Company Code"       value={company?.CompanyCode} />
                  <ViewField label="Date of Founding"   value={company?.CompanyFoundingDate} />
                  <ViewField label="PAN of the Entity"  value={company?.CompanyPAN} />
                  <ViewField label="CIN/LLPIN"          value={company?.CIN} />
                  <ViewField label="Sector"             value={company?.Sector} />
                  <ViewField label="Business Nature"    value={company?.BusinessNature} />
                </div>
              ) : (
                <div className="space-y-4">
                  <RadioGroup
                    label="Type of Business"
                    options={["Pvt Ltd", "LLP", "OPC", "Sole proprietor"]}
                    value={companyForm.businessType}
                    onChange={(val) => setCompanyForm({ ...companyForm, businessType: val })}
                    columns={2}
                  />
                  <EditField
                    label="Name of Business"
                    value={companyForm.businessName}
                    onChange={(e) => setCompanyForm({ ...companyForm, businessName: e.target.value })}
                  />
                  <EditField
                    label="Company Code"
                    value={companyForm.companyCode}
                    onChange={(e) => setCompanyForm({ ...companyForm, companyCode: e.target.value })}
                  />
                  <EditField
                    label="Date of Founding"
                    type="date"
                    value={companyForm.foundingDate}
                    onChange={(e) => setCompanyForm({ ...companyForm, foundingDate: e.target.value })}
                  />
                  <EditField
                    label="PAN of the Entity"
                    value={companyForm.pan}
                    onChange={(e) => setCompanyForm({ ...companyForm, pan: e.target.value })}
                  />
                  <EditField
                    label="CIN/LLPIN"
                    value={companyForm.cin}
                    onChange={(e) => setCompanyForm({ ...companyForm, cin: e.target.value })}
                  />
                  <EditField
                    label="Sector"
                    value={companyForm.sector}
                    onChange={(e) => setCompanyForm({ ...companyForm, sector: e.target.value })}
                  />
                  <EditField
                    label="Business Nature"
                    value={companyForm.businessActivity}
                    onChange={(e) => setCompanyForm({ ...companyForm, businessActivity: e.target.value })}
                  />
                </div>
              )}
            </Card>

            {/* Contact & GST Information */}
            <Card
              title="Contact & GST Information"
              icon={isEditingCompany ? FileText : undefined}
              iconBg="bg-green-400"
            >
              {!isEditingCompany ? (
                <div className="space-y-4">
                  <ViewField label="GST Number"      value={company?.GSTNumber} />
                  <ViewField label="Company Email"   value={company?.CompanyEmail} />
                  <ViewField label="Company Mobile"  value={company?.CompanyMobile} />
                  <ViewField label="Website"         value={company?.Website} />
                  <ViewField label="Status"          value={company?.Status} />
                  <ViewField label="Franchise"       value={company?.FranchiseName} />
                </div>
              ) : (
                <div className="space-y-4">
                  <EditField
                    label="GST Number"
                    value={companyForm.gstNumber}
                    onChange={(e) => setCompanyForm({ ...companyForm, gstNumber: e.target.value })}
                  />
                  <EditField
                    label="Company Email"
                    type="email"
                    value={companyForm.companyEmail}
                    onChange={(e) => setCompanyForm({ ...companyForm, companyEmail: e.target.value })}
                  />
                  <EditField
                    label="Company Mobile"
                    value={companyForm.companyMobile}
                    onChange={(e) => setCompanyForm({ ...companyForm, companyMobile: e.target.value })}
                  />
                  <EditField
                    label="Website"
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                  />
                </div>
              )}
            </Card>
          </div>

          {/* Communication Address */}
          <Card
            title="Communication Address"
            icon={isEditingCompany ? MapPin : undefined}
            iconBg="bg-yellow-400"
          >
            {!isEditingCompany ? (
              <div className="space-y-4">
                <ViewField label="Address Line 1" value={company?.AddressLine1} />
                <ViewField label="Address Line 2" value={company?.AddressLine2} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ViewField label="District"     value={company?.District} />
                  <ViewField label="City"         value={company?.City} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ViewField label="State"        value={company?.State} />
                  <ViewField label="Pin Code"     value={company?.PinCode} />
                </div>
                <ViewField label="Country"        value={company?.Country} />
              </div>
            ) : (
              <div className="space-y-4">
                <EditField
                  label="Address Line 1"
                  placeholder="House No, Building, Street"
                  value={companyForm.addressLine1}
                  onChange={(e) => setCompanyForm({ ...companyForm, addressLine1: e.target.value })}
                />
                <EditField
                  label="Address Line 2"
                  placeholder="Area, Landmark"
                  value={companyForm.addressLine2}
                  onChange={(e) => setCompanyForm({ ...companyForm, addressLine2: e.target.value })}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditField
                    label="District"
                    value={companyForm.district}
                    onChange={(e) => setCompanyForm({ ...companyForm, district: e.target.value })}
                  />
                  <EditField
                    label="City"
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditField
                    label="State"
                    value={companyForm.state}
                    onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
                  />
                  <EditField
                    label="Pin Code"
                    value={companyForm.pincode}
                    onChange={(e) => setCompanyForm({ ...companyForm, pincode: e.target.value })}
                  />
                </div>
                <EditField
                  label="Country"
                  value={companyForm.country}
                  onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })}
                />
              </div>
            )}
          </Card>

          {isEditingCompany && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleContinueToDirector}
                className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-3 rounded-lg text-sm transition"
              >
                Continue to Director Details <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>

        {/* ===================== Director/Promoter Details ===================== */}
        <section ref={directorRef}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center">
                <Users size={18} className="text-white" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Director/Promoter Details
                </h2>
                <p className="text-sm text-gray-500">
                  Manage director and promoter information
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isEditingDirector && (
                <span className="flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                  <CheckCircle size={13} /> Verified
                </span>
              )}
              {!isEditingDirector ? (
                <button
                  onClick={startEditDirector}
                  className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-4 py-2.5 rounded-lg text-sm transition"
                >
                  <Pencil size={14} /> Edit Details
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={cancelEditDirector}
                    className="flex items-center gap-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-4 py-2.5 rounded-lg text-sm transition"
                  >
                    <X size={14} /> Cancel
                  </button>
                  <button
                    onClick={handleSaveDirector}
                    className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-4 py-2.5 rounded-lg text-sm transition"
                  >
                    <Save size={14} /> Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Director Information" icon={User}>
              {!isEditingDirector ? (
                <div className="space-y-4">
                  <ViewField
                    label="Number of Directors/Partners"
                    value={`${company?.Customers?.length || 0} Directors`}
                    valueClassName="text-amber-600 font-medium"
                  />
                  <ViewField
                    label="Full Name"
                    value={`${primaryDirector.FirstName || ""} ${primaryDirector.LastName || ""}`.trim()}
                  />
                  <ViewField
                    label="Designation"
                    value={primaryDirector.Designation}
                    valueClassName="text-amber-600 font-medium"
                  />
                  <ViewField
                    label="DIN (Director Identification Number)"
                    value={primaryDirector.DIN}
                  />
                  <ViewField
                    label="Shareholding %"
                    value={primaryDirector.Shareholding}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <EditField
                    label="Number of Directors/Partners"
                    type="number"
                    value={directorForm.numberOfDirectors}
                    onChange={(e) =>
                      setDirectorForm({
                        ...directorForm,
                        numberOfDirectors: e.target.value,
                      })
                    }
                  />
                  <EditField
                    label="Full Name"
                    value={directorForm.fullName}
                    onChange={(e) =>
                      setDirectorForm({
                        ...directorForm,
                        fullName: e.target.value,
                      })
                    }
                  />
                  <EditField
                    label="Designation"
                    value={directorForm.designation}
                    onChange={(e) =>
                      setDirectorForm({
                        ...directorForm,
                        designation: e.target.value,
                      })
                    }
                  />
                  <EditField
                    label="DIN (Director Identification Number)"
                    value={directorForm.din}
                    onChange={(e) =>
                      setDirectorForm({ ...directorForm, din: e.target.value })
                    }
                  />
                </div>
              )}
            </Card>

            <Card title="Contact Information" icon={Phone}>
              {!isEditingDirector ? (
                <div className="space-y-4">
                  <ViewField
                    label="Mobile Number"
                    value={primaryDirector.Mobile}
                  />
                  <ViewField label="Email ID" value={primaryDirector.Email} />
                  <ViewField
                    label="PAN Number"
                    value={primaryDirector.PANNumber}
                  />
                  <ViewField
                    label="Date of Birth"
                    value={primaryDirector.DateOfBirth}
                  />
                  <ViewField
                    label="Company Email"
                    value={company?.CompanyEmail}
                  />
                  <ViewField
                    label="Company Mobile"
                    value={company?.CompanyMobile}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <EditField
                    label="Mobile Number"
                    value={directorForm.mobile}
                    onChange={(e) =>
                      setDirectorForm({
                        ...directorForm,
                        mobile: e.target.value,
                      })
                    }
                  />
                  <EditField
                    label="Email ID"
                    type="email"
                    value={directorForm.email}
                    onChange={(e) =>
                      setDirectorForm({
                        ...directorForm,
                        email: e.target.value,
                      })
                    }
                  />
                  <EditField
                    label="PAN Number"
                    value={directorForm.panNumber}
                    onChange={(e) =>
                      setDirectorForm({
                        ...directorForm,
                        panNumber: e.target.value,
                      })
                    }
                  />
                  <EditField
                    label="Date of Birth"
                    type="date"
                    value={directorForm.dateOfBirth}
                    onChange={(e) =>
                      setDirectorForm({
                        ...directorForm,
                        dateOfBirth: e.target.value,
                      })
                    }
                  />
                </div>
              )}
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CompanyDetails;

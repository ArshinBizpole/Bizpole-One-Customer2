import { useEffect, useState, useRef } from 'react';
import { User, Mail, Phone, MapPin, FileText, CheckCircle2, Upload, Edit, Download, Share2, Link, X, UploadCloud, Eye, TrendingUp, Briefcase } from 'lucide-react';
import { getSecureItem } from '../utils/secureStorage';
import axiosInstance from '../api/axiosInstance';
import { getAssociateById, getAssociateDocuments, uploadAssociateDocuments } from '../api/AssociateApi';
import { getDistrictsByState } from '../utils/constants';
import Select from "react-select"
import { sanitize, validate } from '../utils/formValidation';

const FIELD_SANITIZERS = {
    AssociateName: sanitize.personName,
    Email: sanitize.email,
    Mobile: sanitize.mobile,
    Profession: sanitize.text(100),
};

const AssociateProfile = () => {
    const user = getSecureItem("partnerUser");
    const URL = import.meta.env.VITE_URL

    const [userData, setUserData] = useState();
    const [documents, setDocuments] = useState([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        AssociateID: "",
        AssociateName: '',
        Email: '',
        Mobile: '',
        District: '',
        Profession: '',
        State: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [editErrors, setEditErrors] = useState({});

    const fileInputRef = useRef(null);
    const [selectedDocType, setSelectedDocType] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [modalUploadType, setModalUploadType] = useState(null);

    const profileData = {
        fullName: userData?.AssociateName || "John Doe",
        email: userData?.Email || "john.doe@example.com",
        phone: userData?.Mobile || "+91 98765 43210",
        companyName: "ABC Business Solutions",
        businessType: "Private Limited",
        city: "Mumbai",
        kycStatus: "Verified",
        memberSince: "January 2024",
        assignedManager: "Rajesh Sharma",
        Profession: userData?.Profession,
        State: userData?.State,
        District: userData?.District,
        stats: {
            totalLeads: 156,
            activeDeals: 34,
            completedOrders: 89,
            totalEarnings: "₹2.4L"
        }
    };

    async function fetchUserData() {
        try {
            if (user.id) {
                const userDataResponse = await getAssociateById(user.id);
                setUserData(userDataResponse.data);
                const docsResponse = await getAssociateDocuments(user.id);
                setDocuments(docsResponse.data || []);
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    }

    useEffect(() => {
        fetchUserData();
    }, [user.id]);

    const handleEditClick = () => {
        setEditFormData({
            AssociateID: user.id,
            AssociateName: userData?.AssociateName || '',
            Email: userData?.Email || '',
            Mobile: userData?.Mobile || '',
            District: userData?.District || '',
            Profession: userData?.Profession || '',
            State: userData?.State || ''
        });
        setEditErrors({});
        setIsEditModalOpen(true);
    };

    const handleInputChange = (e) => {
        const { name } = e.target;
        const value = FIELD_SANITIZERS[name] ? FIELD_SANITIZERS[name](e.target.value) : e.target.value;
        setEditFormData(prev => ({
            ...prev,
            [name]: value,
            ...(name === 'State' && { District: '' })
        }));
        if (editErrors[name]) setEditErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateEditForm = () => {
        const errs = {
            AssociateName: validate.personName(editFormData.AssociateName, { required: true, label: 'Full name' }),
            Email: validate.email(editFormData.Email, { required: true }),
            Mobile: validate.mobile(editFormData.Mobile, { required: true }),
        };
        Object.keys(errs).forEach(k => { if (!errs[k]) delete errs[k]; });
        setEditErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const editInputCls = (hasError) =>
        `w-full px-3 py-2.5 text-sm rounded-lg border ${hasError ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:ring-yellow-200'} focus:outline-none focus:ring-2 placeholder:text-gray-300`;

    const handleSaveProfile = async () => {
        if (!validateEditForm()) return;
        setIsSaving(true);
        try {
            const response = await axiosInstance.put(`/associate/${user.id}`, editFormData);
            setUserData(response.data);
            alert("Profile updated successfully!");
            setIsEditModalOpen(false);
            await fetchUserData();
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUploadClick = (type) => {
        setSelectedDocType(type);
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedDocType) return;
        // Match what the upload card promises: PDF, JPG, PNG (Max 5MB)
        if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) {
            alert("Only PDF, JPG and PNG files are allowed.");
            e.target.value = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("File is too large. Maximum size is 5MB.");
            e.target.value = '';
            return;
        }
        setUploading(true);
        const formData = new FormData();
        formData.append('associateId', user.id);
        formData.append(selectedDocType.toLowerCase(), file);
        try {
            await uploadAssociateDocuments(formData);
            await new Promise(res => setTimeout(res, 500));
            await fetchUserData();
            alert("Document uploaded successfully!");
            setIsUploadModalOpen(false);
            setModalUploadType(null);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload document.");
        } finally {
            setUploading(false);
            setSelectedDocType(null);
            e.target.value = '';
        }
    };

    const requiredDocuments = [
        { type: "PAN", name: "PAN Card", icon: FileText },
        { type: "AADHAAR", name: "Aadhaar Card", icon: FileText },
        { type: "GST", name: "GST Certificate", icon: FileText },
    ];

    const getDocumentStatus = (type) => {
        const foundDoc = documents.find(
            d => d.DocumentType.toLowerCase() === type.toLowerCase()
        );
        if (foundDoc) {
            return {
                status: "Verified",
                date: new Date(foundDoc.CreatedAt).toISOString().split('T')[0],
                found: true,
                url: foundDoc.FileUrl,
                fileName: foundDoc.FileName || foundDoc.FileUrl?.split('/').pop()
            };
        }
        return { status: "Not uploaded", date: null, found: false, url: null };
    };

    const uploadedCount = requiredDocuments.filter(d => getDocumentStatus(d.type).found).length;

    // Shared field label icon style
    const FieldIcon = ({ icon: Icon }) => (
        <span className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
            <Icon className="w-3 h-3 text-white" />
        </span>
    );

    // Edit modal select styles
    const editSelectStyles = {
        control: (base, state) => ({
            ...base,
            padding: "2px 4px",
            borderRadius: "0.5rem",
            borderColor: "#e5e7eb",
            boxShadow: state.isFocused ? "0 0 0 2px #fde68a" : "none",
            "&:hover": { borderColor: "#facc15" },
        }),
        placeholder: (base) => ({ ...base, color: "#9ca3af", fontSize: "0.875rem" }),
        singleValue: (base) => ({ ...base, fontSize: "0.875rem" }),
    };

    return (
        <div className=" mx-auto p-6">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
            />

            {/* ── EDIT MODAL ── */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">Edit Profile</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 grid grid-cols-2 gap-x-5 gap-y-4">
                            {/* Full Name */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-gray-600 flex items-center gap-2">
                                    <FieldIcon icon={User} /> Full Name
                                </label>
                                <input type="text" name="AssociateName" value={editFormData.AssociateName} onChange={handleInputChange}
                                    placeholder="Enter full name" maxLength={100}
                                    className={editInputCls(editErrors.AssociateName)} />
                                {editErrors.AssociateName && <p className="text-xs text-red-500 mt-1">{editErrors.AssociateName}</p>}
                            </div>
                            {/* Email */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-gray-600 flex items-center gap-2">
                                    <FieldIcon icon={Mail} /> Email Address
                                </label>
                                <input type="email" name="Email" value={editFormData.Email} onChange={handleInputChange}
                                    placeholder="Enter email" maxLength={100}
                                    className={editInputCls(editErrors.Email)} />
                                {editErrors.Email && <p className="text-xs text-red-500 mt-1">{editErrors.Email}</p>}
                            </div>
                            {/* Phone */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-gray-600 flex items-center gap-2">
                                    <FieldIcon icon={Phone} /> Phone Number
                                </label>
                                <input type="tel" name="Mobile" value={editFormData.Mobile} onChange={handleInputChange}
                                    placeholder="10-digit mobile number" inputMode="numeric" maxLength={10}
                                    className={editInputCls(editErrors.Mobile)} />
                                {editErrors.Mobile && <p className="text-xs text-red-500 mt-1">{editErrors.Mobile}</p>}
                            </div>
                            {/* State */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-gray-600 flex items-center gap-2">
                                    <FieldIcon icon={MapPin} /> State
                                </label>
                                <Select
                                    options={["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"].map(s => ({ value: s, label: s }))}
                                    value={editFormData.State ? { value: editFormData.State, label: editFormData.State } : null}
                                    onChange={(sel) => setEditFormData({ ...editFormData, State: sel?.value || "", District: "" })}
                                    placeholder="Select State" isSearchable styles={editSelectStyles}
                                />
                            </div>
                            {/* District */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-gray-600 flex items-center gap-2">
                                    <FieldIcon icon={MapPin} /> District
                                </label>
                                <Select
                                    options={getDistrictsByState(editFormData.State).map(d => ({ value: d, label: d }))}
                                    value={editFormData.District ? { value: editFormData.District, label: editFormData.District } : null}
                                    onChange={(sel) => setEditFormData({ ...editFormData, District: sel?.value || "" })}
                                    placeholder="Select District" isSearchable isDisabled={!editFormData.State}
                                    styles={{
                                        ...editSelectStyles,
                                        control: (base, state) => ({
                                            ...editSelectStyles.control(base, state),
                                            backgroundColor: !editFormData.State ? "#f9fafb" : "white"
                                        })
                                    }}
                                />
                            </div>
                            {/* Profession */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-gray-600 flex items-center gap-2">
                                    <FieldIcon icon={Briefcase} /> Profession
                                </label>
                                <input type="text" name="Profession" value={editFormData.Profession} onChange={handleInputChange}
                                    placeholder="Enter profession" maxLength={100}
                                    className={editInputCls(false)} />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                            <button onClick={() => setIsEditModalOpen(false)}
                                className="px-5 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSaveProfile} disabled={isSaving}
                                className="px-5 py-2 text-sm font-bold bg-yellow-400 text-gray-900 rounded-full hover:bg-yellow-500 transition-colors flex items-center gap-2 disabled:opacity-60">
                                {isSaving ? (
                                    <><div className="w-3.5 h-3.5 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />Saving...</>
                                ) : (
                                    <><CheckCircle2 className="w-3.5 h-3.5" />Save Changes</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── UPLOAD MODAL ── */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">Upload New Document</h2>
                            <button onClick={() => { setIsUploadModalOpen(false); setModalUploadType(null); }} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-gray-600">Document Type</label>
                                <Select
                                    options={requiredDocuments.map(doc => ({ value: doc.type, label: doc.name }))}
                                    value={modalUploadType ? { value: modalUploadType, label: requiredDocuments.find(d => d.type === modalUploadType)?.name } : null}
                                    onChange={(sel) => setModalUploadType(sel?.value)}
                                    placeholder="Select document type..." styles={editSelectStyles}
                                />
                            </div>
                            <div
                                onClick={() => modalUploadType && handleUploadClick(modalUploadType)}
                                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 transition-all cursor-pointer
                                    ${modalUploadType ? 'border-yellow-300 hover:border-yellow-400 hover:bg-yellow-50/40' : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'}`}
                            >
                                <div className={`p-3 rounded-full ${modalUploadType ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
                                    <UploadCloud className="w-7 h-7" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-gray-800">{modalUploadType ? 'Click to select file' : 'Select a document type first'}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">PDF, JPG, PNG (Max 5MB)</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100">
                            <button onClick={() => setIsUploadModalOpen(false)}
                                className="w-full py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── PAGE HEADER ── */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
                <p className="text-sm text-gray-400 mt-0.5">Manage your account information and documents</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── LEFT COLUMN ── */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Profile Header Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative">
                        {/* Edit button top-right */}
                        <button
                            onClick={handleEditClick}
                            className="absolute top-4 right-4 w-9 h-9 bg-yellow-400 hover:bg-yellow-500 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                        >
                            <Edit className="w-4 h-4 text-gray-800" />
                        </button>

                        <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <div className="w-14 h-14 rounded-full bg-yellow-400 flex items-center justify-center text-xl font-bold text-gray-800 flex-shrink-0">
                                {profileData.fullName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-bold text-gray-900">{profileData.fullName}</h2>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
                                        <CheckCircle2 className="w-3 h-3" /> Verified Account
                                    </span>
                                    {profileData.Profession && (
                                        <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full capitalize">
                                            {profileData.Profession}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="truncate">{profileData.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                                        <span>{profileData.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                        <span>{[profileData.District, profileData.State].filter(Boolean).join(', ') || '—'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="capitalize">{profileData.Profession || '—'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Personal Information */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <span className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                                <User className="w-3.5 h-3.5 text-white" />
                            </span>
                            <h2 className="text-base font-bold text-gray-900">Personal Information</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { label: "Full Name", value: profileData.fullName, icon: User },
                                { label: "Email Address", value: profileData.email, icon: Mail },
                                { label: "Phone Number", value: profileData.phone, icon: Phone },
                                { label: "District", value: profileData.District, icon: MapPin },
                                { label: "Profession", value: profileData.Profession, icon: Briefcase },
                                { label: "State", value: profileData.State, icon: MapPin },
                            ].map(({ label, value, icon: Icon }) => (
                                <div key={label} className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                                        <Icon className="w-3.5 h-3.5 text-gray-400" /> {label}
                                    </label>
                                    <div className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-100 bg-gray-50 text-gray-700">
                                        {value || <span className="text-gray-300">—</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* KYC Documents */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-3.5 h-3.5 text-white" />
                                </span>
                                <div>
                                    <h2 className="text-base font-bold text-gray-900">KYC Documents</h2>
                                    <p className="text-xs text-gray-400">{uploadedCount}/{requiredDocuments.length} uploaded</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {requiredDocuments.map((docType, index) => {
                                const statusInfo = getDocumentStatus(docType.type);
                                return (
                                    <div key={index} className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Doc icon — yellow/gray rounded square */}
                                            <div
                                                className={`relative group/img flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all
                                                    ${statusInfo.found ? 'bg-yellow-400 hover:bg-yellow-500' : 'bg-gray-100'}`}
                                                onClick={() => statusInfo.found && statusInfo.url && window.open(statusInfo.url, "_blank")}
                                            >
                                                {statusInfo.found ? (
                                                    <>
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                            <polyline points="14 2 14 8 20 8" />
                                                            <line x1="16" y1="13" x2="8" y2="13" />
                                                            <line x1="16" y1="17" x2="8" y2="17" />
                                                            <polyline points="10 9 9 9 8 9" />
                                                        </svg>
                                                        <div className="absolute inset-0 rounded-xl bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Eye className="w-4 h-4 text-white" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                        <polyline points="17 8 12 3 7 8" />
                                                        <line x1="12" y1="3" x2="12" y2="15" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-semibold text-gray-800">{docType.name}</span>
                                                    {statusInfo.found ? (
                                                        <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Verified</span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Required</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400 mt-0.5 truncate">
                                                    {statusInfo.found ? `${statusInfo.date}  ${statusInfo.fileName || ''}` : 'Not uploaded yet'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                            {statusInfo.found ? (
                                                <>
                                                    <button onClick={() => window.open(statusInfo.url, "_blank")}
                                                        className="text-xs font-medium text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-white transition-colors">
                                                        View
                                                    </button>
                                                    <button onClick={() => handleUploadClick(docType.type)}
                                                        className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-white transition-colors">
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => handleUploadClick(docType.type)} disabled={uploading}
                                                    className="flex items-center gap-1.5 text-xs font-bold text-gray-800 bg-yellow-400 hover:bg-yellow-500 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                                                    <Upload className="w-3 h-3" />
                                                    {uploading && selectedDocType === docType.type ? 'Uploading...' : 'Upload'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Bottom info bar */}
                        <div className="mt-4 flex items-center gap-2 bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-2.5">
                            <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-white">!</span>
                            </div>
                            <p className="text-xs text-yellow-700">Upload clear copies in PDF or image format (max 5MB)</p>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT COLUMN ── */}
                <div className="space-y-5">
                    {/* QR Code Card — unchanged functionality */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                                <Share2 className="w-4 h-4 text-white" />
                            </span>
                            <div>
                                <h2 className="text-base font-bold text-gray-900">My QR Code</h2>
                                <p className="text-xs text-gray-400">Scan to connect</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center space-y-4">
                            <div className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${URL}?ref=${user.id}`}
                                    alt="Associate QR Code"
                                    className="w-44 h-44 object-contain"
                                />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-gray-700">bizpole.com/refer/{profileData.fullName.toLowerCase().replace(/\s+/, '-')}</p>
                                <p className="text-xs text-gray-400 mt-0.5">Share this code to earn rewards</p>
                            </div>

                            <div className="flex gap-2 w-full">
                                <button
                                    onClick={async () => {
                                        try {
                                            const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${URL}?ref=${user.id}`);
                                            const blob = await response.blob();
                                            const url = window.URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.download = `associate-qr-${user.id}.png`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                        } catch (error) {
                                            console.error('Download failed:', error);
                                        }
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-xs font-bold px-3 py-2.5 rounded-xl transition-colors"
                                >
                                    <Download className="w-3.5 h-3.5" /> Download
                                </button>
                                <button
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({ title: 'My Associate Profile', text: 'Check out my associate profile on Bizpole', url: `${URL}?ref=${user.id}` }).catch(console.error);
                                        } else {
                                            alert("Share not supported on this device/browser");
                                        }
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold px-3 py-2.5 rounded-xl transition-colors"
                                >
                                    <Share2 className="w-3.5 h-3.5" /> Share
                                </button>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${URL}?ref=${user.id}`);
                                        alert("Link copied to clipboard!");
                                    }}
                                    className="w-10 flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
                                >
                                    <Link className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Performance Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <TrendingUp className="w-4 h-4 text-gray-700" />
                            <h2 className="text-base font-bold text-gray-900">Performance</h2>
                        </div>
                        <div className="space-y-4">
                            {/* Active Deals */}
                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-500 font-medium">Active Deals</span>
                                    <User className="w-4 h-4 text-gray-300" />
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{profileData.stats.activeDeals}</p>
                            </div>
                            {/* Completed Orders */}
                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-500 font-medium">Completed Orders</span>
                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{profileData.stats.completedOrders}</p>
                            </div>
                            {/* Total Earnings */}
                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-500 font-medium">Total Earnings</span>
                                    <TrendingUp className="w-4 h-4 text-yellow-400" />
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{profileData.stats.totalEarnings}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssociateProfile;
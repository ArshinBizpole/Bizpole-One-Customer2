import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    ChevronRight,
    Loader2,
    Briefcase,
    CheckCircle2,
    Upload,
    Eye
} from 'lucide-react';
import * as CustomerApi from '../../api/CustomerApi';
import * as CompanyApi from '../../api/CompanyApi';
import { format } from 'date-fns';
import { getSecureItem } from '../../utils/secureStorage';

const CustomerDetailView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('Summary');
    const [documents, setDocuments] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [selectedDocType, setSelectedDocType] = useState(null);
    const fileInputRef = useRef(null);

    const fetchDocuments = useCallback(async () => {
        try {
            const response = await CustomerApi.getCustomerDocuments(id);

            if (response.data.success) {
                setDocuments(response.data.data);
            }
        } catch (err) {
            console.error("Error fetching documents:", err);
        }
    }, [id]);

    useEffect(() => {
        const fetchCustomerDetails = async () => {
            setLoading(true);
            try {
                const user = getSecureItem("partnerUser") || {};
                const EmployeeID = user.id || null;
                const response = await CustomerApi.getCustomerById(id, EmployeeID);

                console.log("Customer fetch response:", response.data);

                if (response.data.success) {
                    let customerData = response.data.data;
                    
                    // Explicitly fetch companies if not present or empty
                    if (!customerData.Companies || customerData.Companies.length === 0) {
                        try {
                            const companyRes = await CompanyApi.getCompaniesByCustomerId(id);
                            if (companyRes.success) {
                                customerData.Companies = companyRes.data;
                            }
                        } catch (compErr) {
                            console.error("Error fetching companies separately", compErr);
                        }
                    }
                    
                    setCustomer(customerData);
                } else {
                    setError(response.data.message || "Failed to fetch customer details");
                }
            } catch (err) {
                console.error("fetchCustomerDetails error", err);
                setError("An error occurred while fetching customer details");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchCustomerDetails();
            fetchDocuments();
        }

    }, [id, fetchDocuments]);

    const handleUploadClick = (type) => {
        setSelectedDocType(type);
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedDocType) return;

        if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) {
            alert("Only PDF, JPG and PNG files are allowed.");
            setSelectedDocType(null);
            e.target.value = '';
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            alert("File is too large. Maximum size is 2MB.");
            setSelectedDocType(null);
            e.target.value = '';
            return;
        }

        setUploading(true);

        const formData = new FormData();
        formData.append('customerId', id);
        formData.append(selectedDocType.toLowerCase(), file);

        try {
            await CustomerApi.uploadCustomerDocuments(formData);
            await new Promise(res => setTimeout(res, 500));
            await fetchDocuments();
            alert("Document uploaded successfully!");
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload document.");
        } finally {
            setUploading(false);
            setSelectedDocType(null);
            e.target.value = '';
        }
    };

    const getDocumentStatus = (type) => {
        if (!documents) return { status: "Not uploaded", found: false, url: null };

        const fieldMap = {
            'pan': 'PAN',
            'aadhaar': 'ADHAAR',
            'passportphoto': 'PassportPhoto'
        };

        const fieldName = fieldMap[type.toLowerCase()];
        const url = documents[fieldName];

        if (url) {
            return {
                status: "Verified",
                found: true,
                url: url
            };
        }

        return {
            status: "Not uploaded",
            found: false,
            url: null
        };
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-yellow-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Loading customer details...</p>
            </div>
        );
    }

    if (error || !customer) {
        return (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 inline-block mb-4">
                    {error || "Customer not found"}
                </div>
                <div>
                    <button
                        onClick={() => navigate('/associate/customers')}
                        className="text-yellow-600 font-bold hover:underline"
                    >
                        Back to Customers
                    </button>
                </div>
            </div>
        );
    }

    const renderSummary = () => (
        <div className="bg-white rounded-2xl p-8 border border-amber-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <DetailItem label="First Name" value={customer.FirstName} />
                <DetailItem label="Last Name" value={customer.LastName || '-'} />
                <DetailItem label="Preferred Language" value={customer.PreferredLanguage || '-'} />
                <DetailItem label="Created On" value={customer.CreatedAt ? format(new Date(customer.CreatedAt), 'dd/MM/yyyy, HH:mm:ss') : '-'} />
                <DetailItem label="Updated On" value={customer.UpdatedAt ? format(new Date(customer.UpdatedAt), 'dd/MM/yyyy, HH:mm:ss') : '-'} />
                <DetailItem label="Mobile" value={customer.Mobile} />
                <DetailItem label="Email" value={customer.Email} />
                <DetailItem label="Country" value={customer.Country || 'India'} />
                <DetailItem label="State" value={customer.State || '-'} />
                <DetailItem label="City" value={customer.District || '-'} />
                <DetailItem label="Pincode" value={customer.PinCode || '-'} />
            </div>
        </div>
    );

    const renderCompanyInfo = () => (
        <div className="space-y-8">
            {customer.Companies && customer.Companies.length > 0 ? (
                customer.Companies.map((company) => (
                    <CompanySummaryRow key={company.CompanyID} companyId={company.CompanyID} />
                ))
            ) : (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
                    <Briefcase className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">No company information available</p>
                </div>
            )}
        </div>
    );

    const tabs = ['Summary', 'Company Information', 'Files'];
    const requiredDocuments = [
        { type: "pan", name: "PAN Card", description: "Upload a clear image of your PAN card" },
        { type: "aadhaar", name: "Aadhaar Card", description: "Upload a clear image of your Aadhaar card" },
        { type: "passportphoto", name: "Passport Photo", description: "Upload passport size Photo" }
    ];

    const renderFiles = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requiredDocuments.map((doc, index) => {
                const statusInfo = getDocumentStatus(doc.type);
                return (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all h-full flex flex-col"
                    >
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-slate-900">{doc.name}</h3>
                                {statusInfo.found && (
                                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                        verified
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="p-5 flex-grow flex flex-col">
                            <p className="text-xs text-slate-500 mb-6">{doc.description}</p>

                            <div className="mt-auto">
                                {statusInfo.found ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 p-3 bg-green-50/50 border border-green-100 rounded-xl">
                                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-700">{doc.name} Uploaded</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => window.open(statusInfo.url, "_blank")}
                                                className="flex-1 flex items-center justify-center gap-2 border border-amber-500 text-amber-600 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-50 transition-colors"
                                            >
                                                <Eye className="w-4 h-4" />
                                                View
                                            </button>
                                            <button
                                                onClick={() => handleUploadClick(doc.type)}
                                                disabled={uploading}
                                                className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
                                            >
                                                <Upload className="w-4 h-4" />
                                                {uploading && selectedDocType === doc.type ? '...' : 'Upload New'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => handleUploadClick(doc.type)}
                                        className={`group cursor-pointer border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all ${uploading && selectedDocType === doc.type
                                            ? 'bg-slate-50 border-slate-300'
                                            : 'border-slate-200 hover:border-amber-400 hover:bg-amber-50/30'
                                            }`}
                                    >
                                        <div className={`p-3 rounded-full transition-colors ${uploading && selectedDocType === doc.type
                                            ? 'bg-slate-200 text-slate-400'
                                            : 'bg-slate-100 text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-500'
                                            }`}>
                                            {uploading && selectedDocType === doc.type ? (
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                            ) : (
                                                <Upload className="w-6 h-6" />
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-slate-700">
                                                {uploading && selectedDocType === doc.type ? 'Uploading...' : 'Click to upload'}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1">PDF, JPG, PNG (Max 2MB)</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
            />

            <div className="space-y-4">
                <button
                    onClick={() => navigate('/associate/customers')}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-600 hover:text-slate-900 shadow-sm transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Link to="/associate/customers" className="hover:text-slate-600 transition-colors uppercase tracking-wider font-semibold">Customer</Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-slate-600 uppercase tracking-wider font-semibold">Customer Details</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-slate-900 font-bold uppercase tracking-wider">{activeTab}</span>
                </div>

                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-slate-900">
                        {customer.FirstName} {customer.LastName || ''}
                    </h1>
                </div>
            </div>

            <div className="flex gap-8 border-b border-slate-200">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-4 text-sm font-bold transition-all relative ${activeTab === tab
                            ? 'text-amber-500'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"
                            />
                        )}
                    </button>
                ))}
            </div>

            <div className="mt-6">
                {activeTab === 'Summary' && renderSummary()}
                {activeTab === 'Company Information' && renderCompanyInfo()}
                {activeTab === 'Files' && renderFiles()}
            </div>
        </div>
    );
};

const CompanySummaryRow = ({ companyId }) => {
    const [companyDetails, setCompanyDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const response = await CompanyApi.getCompanyById(companyId);

                if (response.success) {
                    setCompanyDetails(response.data);
                }
            } catch (err) {
                console.error("Error fetching company details", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [companyId]);

    if (loading) {
        return (
            <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-sm flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin mr-3" />
                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Fetching Company Data...</span>
            </div>
        );
    }

    if (!companyDetails) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[1.5rem] p-10 border border-amber-400 shadow-sm"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
                <DetailItem label="Company ID" value={companyDetails.CompanyID} />
                <DetailItem label="Created Date" value={companyDetails.CreatedAt ? format(new Date(companyDetails.CreatedAt), 'dd/MM/yyyy') : '-'} />

                <DetailItem label="Company Name" value={companyDetails.BusinessName || '-'} />
                <DetailItem label="Company Created" value={companyDetails.CreatedByName || '-'} />

                <DetailItem label="Mobile 1" value={companyDetails.CompanyMobile || '-'} />
                <DetailItem label="Email 1" value={companyDetails.CompanyEmail || '-'} />

                <DetailItem label="Country" value={companyDetails.Country || 'India'} />

                <DetailItem label="State" value={companyDetails.State || '-'} />
                <DetailItem label="City" value={companyDetails.District || '-'} />
            </div>
        </motion.div>
    );
};

const DetailItem = ({ label, value }) => (
    <div className="flex items-center gap-2">
        <p className="text-[13px] font-bold text-slate-800 whitespace-nowrap">{label}:</p>
        <p className="text-[13px] text-slate-500 font-medium">{value}</p>
    </div>
);

export default CustomerDetailView;

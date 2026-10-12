import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    ChevronRight,
    Loader2,
    Info,
    FileText,
    CreditCard,
    Calendar,
    Download,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import { format, isValid } from 'date-fns';
import { downloadQuote } from '../../components/associate/quote/downloadQuote';

const safeFormat = (dateValue, formatStr, fallback = "--") => {
    if (!dateValue) return fallback;
    const dateObj = new Date(dateValue);
    if (!isValid(dateObj)) return fallback;
    return format(dateObj, formatStr);
};

const QuoteDetailView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quote, setQuote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [downloading, setDownloading] = useState(false);

    // Same QUOTATION document admin downloads (ported QuoteDocument), via the print dialog
    const handleDownload = async () => {
        if (!quote || downloading) return;
        setDownloading(true);
        try {
            await downloadQuote(quote);
        } catch (err) {
            console.error("Quote download error", err);
            alert("Failed to download the quote. Please try again.");
        } finally {
            setDownloading(false);
        }
    };

    useEffect(() => {
        const fetchQuoteDetails = async () => {
            setLoading(true);
            try {
                const response = await axiosInstance.get(`/getQuoteById/${id}`);
                if (response.data?.success) {
                    setQuote(response.data.data);
                } else {
                    setError(response.data?.message || "Failed to fetch quote details");
                }
            } catch (err) {
                console.error("fetchQuoteDetails error", err);
                setError("An error occurred while fetching quote details");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchQuoteDetails();
        }
    }, [id]);

    const calculateTotalAmount = () => {
        if (!quote || !quote.ServiceDetails) return 0;
        return quote.ServiceDetails.reduce((sum, item) => {
            const prof = Number(item.ProfessionalFee || 0);
            const vendor = Number(item.VendorFee || 0);
            const govt = Number(item.GovtFee || 0);
            const contractor = Number(item.ContractorFee || 0);
            const gst = Number(item.GstAmount || 0);
            return sum + prof + vendor + govt + contractor + gst;
        }, 0);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-yellow-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Loading quote details...</p>
            </div>
        );
    }

    if (error || !quote) {
        return (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 inline-block mb-4">
                    {error || "Quote not found"}
                </div>
                <div>
                    <button
                        onClick={() => navigate('/associate/quotes')}
                        className="text-yellow-600 font-bold hover:underline"
                    >
                        Back to Quotes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Navigation */}
            <div className="flex flex-col gap-4">
                <button
                    onClick={() => navigate('/associate/quotes')}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors w-fit border border-slate-200 px-4 py-1.5 rounded-lg bg-white shadow-sm hover:shadow transition-all"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Back to Quotes</span>
                </button>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Link to="/associate/quotes" className="hover:text-slate-900">Quotes</Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-slate-900 font-medium">Quote Details</span>
                    <ChevronRight className="w-3 h-3" />
                    <span>Summary</span>
                </div>
            </div>

            {/* Header section */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-400/10 rounded-2xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{quote.QuoteCodeId}</h1>
                            <div className="flex items-center gap-4 mt-1">
                                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                                    Status
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ml-1 ${quote.QuoteStatus === 'Converted to Order' || quote.QuoteStatus === 'Created-Order'
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                        {quote.QuoteStatus}
                                    </span>
                                </span>
                                <span className="flex items-center gap-1 text-sm text-slate-500">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {safeFormat(quote.QuoteDate, "dd MMM yyyy")}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        title="Download quote PDF"
                        className="flex items-center gap-2 w-fit border border-slate-200 px-4 py-2 rounded-lg bg-white text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {downloading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Download className="w-4 h-4" />}
                        Download
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-8 mt-8 border-b border-slate-100">
                    <button className="pb-4 text-sm font-bold text-red-500 border-b-2 border-red-500 transition-all">
                        Summary
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 gap-6">
                {/* Basic Information */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm border-t-4 border-t-amber-400">
                    <div className="flex items-center gap-2 mb-6 text-slate-800">
                        <Info className="w-5 h-5" />
                        <h3 className="font-bold text-lg">Basic Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-4">
                        <div>
                            <p className="text-xs text-slate-400 mb-1">QUOTE ID</p>
                            <p className="text-sm font-medium text-slate-900 uppercase">{quote.QuoteCodeId}</p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-400 mb-1">QUOTE CODE</p>
                            <p className="text-sm font-medium text-slate-900">{quote.QuoteCode || "--"}</p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-400 mb-1">DEAL ID</p>
                            {quote.DealID ? (
                                <p
                                    onClick={() => navigate(`/associate/deals/${quote.DealID}`)}
                                    className="text-sm font-medium text-blue-500 cursor-pointer hover:underline uppercase"
                                >
                                    {quote.DealCode || `#${quote.DealID}`}
                                </p>
                            ) : (
                                <p className="text-sm font-medium text-slate-900">--</p>
                            )}
                        </div>

                        <div>
                            <p className="text-xs text-slate-400 mb-1">COMPANY NAME</p>
                            <p className="text-sm font-medium text-slate-900">{quote.CompanyName || "--"}</p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-400 mb-1">CUSTOMER NAME</p>
                            <p className="text-sm font-medium text-slate-900">{quote.CustomerName || "--"}</p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-400 mb-1">STATUS</p>
                            <p className="text-sm font-medium text-slate-900">{quote.QuoteStatus}</p>
                        </div>

                        <div>
                            <p className="text-xs text-gray-500 uppercase">
                                {quote?.PackageName ? "Package" : "Service"}
                            </p>

                            <p className="font-medium text-gray-800">
                                {quote?.PackageName
                                    ? quote.PackageName
                                    : quote?.ServiceDetails?.map(service => service.ItemName).join(", ") || "--"}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-400 mb-1">CREATED AT</p>
                            <p className="text-sm font-medium text-slate-900">{safeFormat(quote.QuoteDate, "M/d/yyyy, h:mm:ss a")}</p>
                        </div>
                    </div>
                </div>

                {/* Pricing Information */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm ">
                    <div className="flex items-center gap-2 mb-6 text-slate-800">
                        <CreditCard className="w-5 h-5 text-slate-600" />
                        <h3 className="font-bold text-lg">Pricing Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-4">
                        <div>
                            <p className="text-xs text-slate-400 mb-1">TOTAL AMOUNT</p>
                            <p className="text-lg font-bold text-slate-900">₹{calculateTotalAmount().toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 mb-1">PAYMENT STATUS</p>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${quote.QuoteStatus === 'Converted to Order' || quote.QuoteStatus === 'Created-Order'
                                ? 'text-emerald-600'
                                : 'text-amber-600'
                                }`}>
                                {quote.QuoteStatus === 'Converted to Order' || quote.QuoteStatus === 'Created-Order' ? 'Paid' : 'Pending'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuoteDetailView;

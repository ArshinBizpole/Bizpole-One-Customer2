import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Loader2, ChevronLeft, ChevronRight, X, Calendar, RotateCcw } from 'lucide-react';
import { getSecureItem } from '../../utils/secureStorage';
import { format } from 'date-fns';
import { fetchReceiptByPayment, listAssociateReceipts } from '../../api/AssociateApi';
import { generateReceiptPdf } from '../../utils/receiptPdf';
import PaymentReceiptModal from '../../components/associate/PaymentReceiptModal';

const DEFAULT_FILTERS = {
    status: '', // '' means all (backend defaults to success if not provided)
    dateFrom: '',
    dateTo: '',
};

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

const AssociateReceipts = () => {
    const navigate = useNavigate();
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalReceipts, setTotalReceipts] = useState(0);
    const [pageSize, setPageSize] = useState(30);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
    const [dateRangeError, setDateRangeError] = useState('');

    // Modal state
    // PaymentID of the receipt shown in the admin-style receipt popup
    const [viewReceiptId, setViewReceiptId] = useState(null);
    const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);

    const activeFilterCount = [
        !!appliedFilters.status,
        !!(appliedFilters.dateFrom || appliedFilters.dateTo),
    ].filter(Boolean).length;

    const fetchReceipts = useCallback(async () => {
        setLoading(true);
        try {
            const user = getSecureItem("partnerUser") || {};
            const AssociateID = user.id || localStorage.getItem("AssociateID");

            const response = await listAssociateReceipts({
                isAssociate: true,
                AssociateID,
                limit: pageSize,
                page: currentPage,
                search: searchTerm,
                status: appliedFilters.status,
                dateFrom: appliedFilters.dateFrom,
                dateTo: appliedFilters.dateTo,
            });

            if (response.success) {
                setReceipts(response.data);
                setTotalReceipts(response.total);
            }
        } catch (err) {
            console.error("fetchReceipts error", err);
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, pageSize, appliedFilters]);

    useEffect(() => {
        fetchReceipts();
    }, [fetchReceipts]);

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setCurrentPage(1);
            fetchReceipts();
        }
    };

    const handleApplyFilters = () => {
        if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
            setDateRangeError('"From" date cannot be after "To" date');
            return;
        }
        setDateRangeError('');
        setAppliedFilters({ ...filters });
        setCurrentPage(1);
        setShowFilters(false);
    };

    const handleResetFilters = () => {
        setFilters(DEFAULT_FILTERS);
        setDateRangeError('');
    };

    const handleOpenFilters = () => {
        setFilters({ ...appliedFilters });
        setDateRangeError('');
        setShowFilters(prev => !prev);
    };

    const removeChip = (key) => {
        if (key === 'status') {
            setAppliedFilters(prev => ({ ...prev, status: '' }));
            setFilters(prev => ({ ...prev, status: '' }));
        } else if (key === 'date') {
            setAppliedFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }));
            setFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }));
        }
        setCurrentPage(1);
    };

    const handleClearAllFilters = () => {
        setFilters(DEFAULT_FILTERS);
        setAppliedFilters(DEFAULT_FILTERS);
        setSearchTerm('');
        setCurrentPage(1);
    };

    const handleViewReceipt = (paymentId) => setViewReceiptId(paymentId);

    // Row "Download": same receipt data and layout as the popup
    const downloadPDF = async (receipt) => {
        if (!receipt?.PaymentID) return;
        setDownloadingReceiptId(receipt.PaymentID);
        try {
            await generateReceiptPdf(await fetchReceiptByPayment(receipt.PaymentID));
        } catch (e) {
            console.error("Receipt download error", e);
            alert("Failed to download the receipt. Please try again.");
        } finally {
            setDownloadingReceiptId(null);
        }
    };

    const totalPages = Math.ceil(totalReceipts / pageSize);

    return (
        <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 leading-tight">Receipt Listing</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage and track verified payments</p>
                </div>

                {/* Search & Filters Bar */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by Receipt ID, Quote ID, Order ID, or Company"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearch}
                            className="w-full pl-11 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-all text-sm font-medium"
                        />
                        <button
                            onClick={fetchReceipts}
                            className="absolute right-1 top-1/2 -translate-y-1/2 bg-slate-900 text-white px-5 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
                        >
                            Search
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleOpenFilters}
                            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all ${showFilters || activeFilterCount > 0 ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Filter className="w-4 h-4" />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={handleClearAllFilters}
                            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* Active Filter Chips */}
                {activeFilterCount > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {appliedFilters.status && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-bold capitalize">
                                Status: {appliedFilters.status}
                                <button onClick={() => removeChip('status')} className="hover:text-amber-900">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {(appliedFilters.dateFrom || appliedFilters.dateTo) && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-bold">
                                Date: {appliedFilters.dateFrom ? format(new Date(appliedFilters.dateFrom), 'dd/MM/yyyy') : '...'}
                                {' → '}
                                {appliedFilters.dateTo ? format(new Date(appliedFilters.dateTo), 'dd/MM/yyyy') : '...'}
                                <button onClick={() => removeChip('date')} className="hover:text-amber-900">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        <button
                            onClick={handleClearAllFilters}
                            className="text-xs text-slate-400 hover:text-slate-600 underline font-medium"
                        >
                            Clear all
                        </button>
                    </div>
                )}

                {/* Filter Panel */}
                {showFilters && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-6 bg-amber-400 rounded-full" />
                                <h3 className="font-bold text-slate-800 text-sm">Receipt Filters</h3>
                            </div>
                            <button
                                onClick={handleResetFilters}
                                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reset Filters
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Status</h4>
                                <div className="flex flex-col gap-3">
                                    {['success', 'pending', 'failure'].map(status => (
                                        <label key={status} className="flex items-center gap-3 cursor-pointer group">
                                            <input
                                                type="radio"
                                                className="hidden"
                                                checked={filters.status === status}
                                                onChange={() => setFilters(prev => ({ ...prev, status }))}
                                            />
                                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${filters.status === status ? 'bg-amber-400 border-amber-400 shadow-sm' : 'bg-white border-slate-200 group-hover:border-amber-200'}`}>
                                                {filters.status === status && <X className="w-3.5 h-3.5 text-slate-900 font-bold" />}
                                            </div>
                                            <span className={`text-sm font-bold capitalize transition-colors ${filters.status === status ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                                {status}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Date Range</h4>
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1">
                                        <input
                                            type="date"
                                            value={filters.dateFrom}
                                            max={filters.dateTo || undefined}
                                            onChange={e => { setFilters(prev => ({ ...prev, dateFrom: e.target.value })); setDateRangeError(''); }}
                                            className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-all"
                                        />
                                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 pointer-events-none" />
                                    </div>
                                    <span className="text-slate-300 font-bold">→</span>
                                    <div className="relative flex-1">
                                        <input
                                            type="date"
                                            value={filters.dateTo}
                                            min={filters.dateFrom}
                                            onChange={e => { setFilters(prev => ({ ...prev, dateTo: e.target.value })); setDateRangeError(''); }}
                                            className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-all"
                                        />
                                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 pointer-events-none" />
                                    </div>
                                </div>
                                {dateRangeError && <p className="text-xs text-red-500 mt-1">{dateRangeError}</p>}
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setShowFilters(false)} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleApplyFilters} className="px-8 py-2 text-sm font-bold text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl transition-all shadow-md shadow-amber-200">Apply Filters</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Content Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider font-semibold text-slate-500">
                                <th className="px-4 py-4 text-center">S.No</th>
                                <th className="px-4 py-4">Receipt ID</th>
                                <th className="px-4 py-4">Quote ID</th>
                                <th className="px-4 py-4">Order ID</th>
                                <th className="px-4 py-4">Company Name</th>
                                <th className="px-4 py-4 text-right">Total Amount</th>
                                <th className="px-4 py-4">Transaction ID</th>
                                <th className="px-4 py-4 text-center">Payment Status</th>
                                <th className="px-4 py-4 whitespace-nowrap">Created At</th>
                                <th className="px-4 py-4 whitespace-nowrap">Transaction Date</th>
                                <th className="px-4 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="11" className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                                            <span>Loading receipts...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : receipts.length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="px-6 py-12 text-center text-slate-400">No receipts found</td>
                                </tr>
                            ) : (
                                receipts.map((receipt, index) => (
                                    <tr key={receipt.PaymentID} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-4 text-center text-slate-400">{(currentPage - 1) * pageSize + index + 1}</td>
                                        <td className="px-4 py-4 font-bold text-slate-700">{receipt.ReceiptCode || receipt.ReceiptNumber || receipt.PaymentID}</td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span
                                                onClick={() => navigate(`/associate/quotes/${receipt.QuoteID}`)}
                                                className="text-blue-500 cursor-pointer hover:underline"
                                            >
                                                {receipt.QuoteCodeId || receipt.QuoteID}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {receipt.OrderID ? (
                                                <span
                                                    onClick={() => navigate(`/associate/orders/${receipt.OrderID}`)}
                                                    className="text-blue-500 cursor-pointer hover:underline"
                                                >
                                                    {receipt.OrderCodeId || receipt.OrderID}
                                                </span>
                                            ) : <span className="text-slate-500">N/A</span>}
                                        </td>
                                        <td className="px-4 py-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 font-semibold rounded-md text-xs">{receipt.CompanyName || "N/A"}</span></td>
                                        <td className="px-4 py-4 text-right font-bold text-slate-800">₹{parseFloat(receipt.TotalAmount || 0).toFixed(2)}</td>
                                        <td className="px-4 py-4 text-slate-600">{receipt.TransactionID}</td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${(receipt.PaymentStatus || "").toLowerCase() === "success" ? "text-green-600 bg-green-50" : "text-orange-600 bg-orange-50"}`}>
                                                {receipt.PaymentStatus || "pending"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-slate-500 whitespace-nowrap">{receipt.PaymentDate ? format(new Date(receipt.PaymentDate), "dd/MM/yyyy") : "--"}</td>
                                        <td className="px-4 py-4 text-slate-500 whitespace-nowrap">
                                            {receipt.TransactionDate ? format(new Date(receipt.TransactionDate), "dd/MM/yyyy") : (receipt.PaymentDate ? format(new Date(receipt.PaymentDate), "dd/MM/yyyy") : "--")}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleViewReceipt(receipt.PaymentID)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors">Receipt</button>
                                                <button
                                                    onClick={() => downloadPDF(receipt)}
                                                    disabled={downloadingReceiptId === receipt.PaymentID}
                                                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-60"
                                                >
                                                    {downloadingReceiptId === receipt.PaymentID && <Loader2 className="w-3 h-3 animate-spin" />}
                                                    Download
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-white">
                    <div className="flex items-center gap-4">
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Showing page {currentPage} of {totalPages || 1}</p>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Rows per page:</span>
                            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400">
                                {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                        {totalPages > 0 && [...Array(Math.min(5, totalPages))].map((_, i) => {
                            const pageNum = i + 1;
                            return <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum ? 'bg-amber-400 text-slate-900' : 'text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>{pageNum}</button>;
                        })}
                        <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0} className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            {/* Receipt Modal */}
            {viewReceiptId !== null && (
                <PaymentReceiptModal paymentId={viewReceiptId} onClose={() => setViewReceiptId(null)} />
            )}
        </div>
    );
};

export default AssociateReceipts;

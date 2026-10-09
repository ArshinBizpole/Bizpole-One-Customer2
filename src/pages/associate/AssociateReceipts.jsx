import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Loader2, ChevronLeft, ChevronRight, Download, X, Calendar, RotateCcw } from 'lucide-react';
import { getSecureItem } from '../../utils/secureStorage';
import { format } from 'date-fns';
import { listAssociateReceipts, getAssociateReceiptDetails } from '../../api/AssociateApi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

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

    const handleViewReceipt = async (paymentId) => {
        setDetailLoading(true);
        setModalOpen(true);
        try {
            const response = await getAssociateReceiptDetails(paymentId);
            if (response.success) {
                setSelectedReceipt(response.data);
            }
        } catch (error) {
            console.error("Error fetching details:", error);
        } finally {
            setDetailLoading(false);
        }
    };

    const downloadPDF = async (receiptData = null) => {
        const data = receiptData || selectedReceipt;
        if (!data) return;

        let fullData = data;
        if (!data.services) {
            try {
                const res = await getAssociateReceiptDetails(data.PaymentID);
                if (res.success) fullData = res.data;
            } catch (e) {
                console.error("Error fetching full details for PDF", e);
                return;
            }
        }

        const doc = new jsPDF();
        doc.setFillColor(255, 193, 7);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text("PAYMENT RECEIPT", 14, 20);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text("Official Transaction Record", 14, 28);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text(`Receipt ID: ${fullData.PaymentID}`, 14, 50);

        const startY = 60;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("TRANSACTION ID", 14, startY);
        doc.text("TRANSACTION DATE", 110, startY);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(fullData.TransactionID || "N/A", 14, startY + 6);
        doc.text(fullData.TransactionDate ? format(new Date(fullData.TransactionDate), "dd/MM/yyyy") : (fullData.PaymentDate ? format(new Date(fullData.PaymentDate), "dd/MM/yyyy") : "N/A"), 110, startY + 6);

        const row2Y = startY + 20;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("PAYMENT STATUS", 14, row2Y);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text((fullData.PaymentStatus || "").toUpperCase(), 14, row2Y + 6);
        doc.setFont('helvetica', 'normal');

        const row3Y = row2Y + 20;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("REMARKS", 14, row3Y);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(fullData.Remarks || "No remarks provided", 14, row3Y + 6);

        const tableY = row3Y + 20;
        doc.setFontSize(14);
        doc.setTextColor(245, 158, 11);
        doc.text("Service Breakdown", 14, tableY);
        const tableColumn = ["Service", "Vendor Fee", "Professional Fee", "Contractor Fee"];
        const tableRows = [];

        if (fullData.services && fullData.services.length > 0) {
            fullData.services.forEach(service => {
                tableRows.push([
                    service.ServiceName || `Service ID: ${service.ServiceID}`,
                    `Rs. ${parseFloat(service.VendorFee || 0).toFixed(2)}`,
                    `Rs. ${parseFloat(service.ProfessionalFee || 0).toFixed(2)}`,
                    `Rs. ${parseFloat(service.ContractorFee || 0).toFixed(2)}`,
                ]);
            });
        } else {
            tableRows.push([
                "Service Details",
                `Rs. ${parseFloat(fullData.VendorFee || 0).toFixed(2)}`,
                `Rs. ${parseFloat(fullData.ProfessionalFee || fullData.ProfFee || 0).toFixed(2)}`,
                `Rs. ${parseFloat(fullData.ContractorFee || 0).toFixed(2)}`,
            ]);
        }

        autoTable(doc, {
            startY: tableY + 10,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [249, 250, 251], textColor: [100, 100, 100], fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 6 },
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Amount: Rs. ${parseFloat(fullData.TotalAmount || 0).toFixed(2)}`, 140, finalY, { align: 'right' });
        doc.save(`Receipt_${fullData.PaymentID}.pdf`);
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
                            placeholder="Search by Payment ID, Order ID, or Company"
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
                                <th className="px-4 py-4">Payment ID</th>
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
                                        <td className="px-4 py-4 font-bold text-slate-700">{receipt.PaymentID}</td>
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
                                                <button onClick={() => downloadPDF(receipt)} className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors">Download</button>
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
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-amber-400 p-6 flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-white uppercase tracking-wide">Payment Receipts</h2>
                                <p className="text-white/90 text-sm mt-1">Official Transaction Record</p>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="text-white/80 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            {detailLoading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                                    <p className="mt-2 text-slate-500">Loading details...</p>
                                </div>
                            ) : selectedReceipt ? (
                                <div className="space-y-6">
                                    <div className="text-sm text-slate-500">Receipt ID: {selectedReceipt.PaymentID}</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Transaction ID</p>
                                            <div className="bg-white border border-slate-200 rounded px-3 py-2 text-sm font-medium text-slate-700">{selectedReceipt.TransactionID || "N/A"}</div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Transaction Date</p>
                                            <div className="font-bold text-lg text-slate-800">
                                                {selectedReceipt.TransactionDate ? format(new Date(selectedReceipt.TransactionDate), "dd/MM/yyyy") : (selectedReceipt.PaymentDate ? format(new Date(selectedReceipt.PaymentDate), "dd/MM/yyyy") : "N/A")}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Payment Status</p>
                                            <div className="font-bold text-lg text-slate-900 capitalize">{selectedReceipt.PaymentStatus}</div>
                                        </div>
                                        <div className="col-span-1 md:col-span-2">
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Remarks</p>
                                            <div className="bg-white border border-slate-200 rounded px-3 py-2 text-sm text-slate-600">{selectedReceipt.Remarks || "No remarks"}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                                            <h3 className="text-sm font-bold text-slate-700">Service Breakdown</h3>
                                        </div>
                                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-slate-50 border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-4 py-3 font-semibold text-slate-500 uppercase">Service</th>
                                                        <th className="px-4 py-3 font-semibold text-slate-500 uppercase text-right">Vendor Fee</th>
                                                        <th className="px-4 py-3 font-semibold text-slate-500 uppercase text-right">Professional Fee</th>
                                                        <th className="px-4 py-3 font-semibold text-slate-500 uppercase text-right">Contractor Fee</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {selectedReceipt.services && selectedReceipt.services.length > 0 ? (
                                                        selectedReceipt.services.map((svc, idx) => (
                                                            <tr key={idx}>
                                                                <td className="px-4 py-3 text-slate-700 font-medium">{svc.ServiceName || `Service ID: ${svc.ServiceID}`}</td>
                                                                <td className="px-4 py-3 text-right text-slate-600">₹{parseFloat(svc.VendorFee || 0).toFixed(2)}</td>
                                                                <td className="px-4 py-3 text-right text-slate-600">₹{parseFloat(svc.ProfessionalFee || 0).toFixed(2)}</td>
                                                                <td className="px-4 py-3 text-right text-slate-600">₹{parseFloat(svc.ContractorFee || 0).toFixed(2)}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td className="px-4 py-3 text-slate-700 font-medium">Service Details</td>
                                                            <td className="px-4 py-3 text-right text-slate-600">₹{parseFloat(selectedReceipt.VendorFee || 0).toFixed(2)}</td>
                                                            <td className="px-4 py-3 text-right text-slate-600">₹{parseFloat(selectedReceipt.ProfessionalFee || selectedReceipt.ProfFee || 0).toFixed(2)}</td>
                                                            <td className="px-4 py-3 text-right text-slate-600">₹{parseFloat(selectedReceipt.ContractorFee || 0).toFixed(2)}</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-center text-slate-500">No details available</p>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Close</button>
                            <button onClick={() => downloadPDF()} className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"><Download className="w-4 h-4" />Download PDF</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssociateReceipts;

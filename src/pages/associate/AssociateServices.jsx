import { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Search, Filter, X, RotateCcw, Calendar } from 'lucide-react';
import { getSecureItem } from '../../utils/secureStorage';
import { format, differenceInDays } from 'date-fns';
import { listOrders } from '../../api/Orders/Order';
import { useNavigate } from 'react-router-dom';

const DEFAULT_FILTERS = {
    serviceType: [],
    dateFrom: '',
    dateTo: '',
};

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

const AssociateServices = () => {
    const navigate = useNavigate();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
    const [dateRangeError, setDateRangeError] = useState('');
    const [pageSize, setPageSize] = useState(30);

    const activeFilterCount = [
        appliedFilters.serviceType.length > 0,
        !!(appliedFilters.dateFrom || appliedFilters.dateTo),
    ].filter(Boolean).length;

    const fetchServices = useCallback(async () => {
        setLoading(true);
        try {
            const user = getSecureItem("partnerUser") || {};
            const AssociateID = user.id || localStorage.getItem("AssociateID");

            const params = {
                isAssociate: true,
                AssociateID: AssociateID,
                limit: pageSize,
                page: currentPage,
                search: searchTerm,
                ...(appliedFilters.serviceType.length === 1 ? { IsIndividual: appliedFilters.serviceType[0] === 'individual' ? 1 : 0 } : {}),
                ...(appliedFilters.dateFrom ? { OrderDateFrom: appliedFilters.dateFrom } : {}),
                ...(appliedFilters.dateTo ? { OrderDateTo: appliedFilters.dateTo } : {}),
            };

            const response = await listOrders(params);

            if (response.success) {
                const flattened = [];

                response.data.forEach(order => {
                    (order.ServiceDetails || []).forEach(service => {
                        flattened.push({
                            ...service,
                            orderInfo: {
                                OrderID: order.OrderID,
                                OrderCodeId: order.OrderCodeId,
                                OrderCreatedAt: order.OrderCreatedAt,
                                QuoteCRE_EmployeeName: order.QuoteCRE_EmployeeName,
                                IsIndividual: order.IsIndividual,
                                CompanyName: order.CompanyName,
                                CustomerName: order.CustomerName,
                                CreatedBy: order.CreatedBy,
                                OrderStatus: order.OrderStatus,
                                TotalAmount: order.TotalAmount,
                                State: order.State
                            }
                        });
                    });
                });

                setServices(flattened);
                setTotalOrders(response.total);
            }
        } catch (err) {
            console.error("fetchServices error", err);
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, searchTerm, appliedFilters]);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

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

    const removeChip = (key, value) => {
        if (key === 'serviceType') {
            const next = appliedFilters.serviceType.filter(t => t !== value);
            setAppliedFilters(prev => ({ ...prev, [key]: next }));
            setFilters(prev => ({ ...prev, [key]: next }));
        } else if (key === 'date') {
            setAppliedFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }));
            setFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }));
        }
        setCurrentPage(1);
    };

    const handleClearAllFilters = () => {
        setFilters(DEFAULT_FILTERS);
        setAppliedFilters(DEFAULT_FILTERS);
        setCurrentPage(1);
    };

    const toggleFilter = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: prev[key].includes(value)
                ? prev[key].filter(v => v !== value)
                : [...prev[key], value]
        }));
    };

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setCurrentPage(1);
            fetchServices();
        }
    };

    const getAgeing = (date) => {
        if (!date) return 0;
        return differenceInDays(new Date(), new Date(date));
    };

    const getReceivedForService = (service) => {
        return (service.ReceivedPayments || []).reduce((sum, p) => sum + Number(p.Amount || 0), 0);
    };

    const totalPages = Math.ceil(totalOrders / pageSize);

    return (
        <div className="p-4 md:p-6 space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-slate-900">Service Listing</h1>
                </div>

                {/* Search & Filters Bar */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by Service Name or ID"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearch}
                            className="w-full pl-11 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-all text-sm font-medium"
                        />
                        <button
                            onClick={fetchServices}
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
                            onClick={() => { setSearchTerm(''); handleClearAllFilters(); }}
                            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* Active Filter Chips */}
                {activeFilterCount > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {appliedFilters.serviceType.map(type => (
                            <span key={type} className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-bold">
                                {type === 'individual' ? 'Individual' : 'Package'}
                                <button onClick={() => removeChip('serviceType', type)} className="hover:text-amber-900">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                        {(appliedFilters.dateFrom || appliedFilters.dateTo) && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-bold">
                                Order Date: {appliedFilters.dateFrom ? format(new Date(appliedFilters.dateFrom), 'dd/MM/yyyy') : '...'}
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
                                <h3 className="font-bold text-slate-800 text-sm">Service Filters</h3>
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
                            {/* Service Type */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service Type</h4>
                                <div className="flex flex-col gap-3">
                                    {['individual', 'package'].map(type => (
                                        <label key={type} className="flex items-center gap-3 cursor-pointer group">
                                            <div
                                                onClick={() => toggleFilter('serviceType', type)}
                                                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${filters.serviceType.includes(type) ? 'bg-amber-400 border-amber-400 shadow-sm' : 'bg-white border-slate-200 group-hover:border-amber-200'}`}
                                            >
                                                {filters.serviceType.includes(type) && <X className="w-3.5 h-3.5 text-slate-900 font-bold" />}
                                            </div>
                                            <span className={`text-sm font-bold transition-colors ${filters.serviceType.includes(type) ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                                {type === 'individual' ? 'Individual' : 'Package'}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Date Range */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order Date Range</h4>
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
                            <button
                                onClick={() => setShowFilters(false)}
                                className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApplyFilters}
                                className="px-8 py-2 text-sm font-bold text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl transition-all shadow-md shadow-amber-200"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Table Container with horizontal scroll */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[10px] whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 uppercase tracking-tighter font-bold text-slate-500">
                                <th className="px-4 py-3 text-center">S.No</th>
                                <th className="px-4 py-3">Service Code</th>
                                <th className="px-4 py-3">Order ID</th>
                                <th className="px-4 py-3">Order Date</th>
                                <th className="px-4 py-3">Order CRE</th>
                                <th className="px-4 py-3">Service Name</th>
                                {/* <th className="px-4 py-3">Service Category</th> */}
                                <th className="px-4 py-3">Service Type</th>
                                {/* <th className="px-4 py-3">Target Date</th> */}
                                <th className="px-4 py-3 text-right">Service Value</th>
                                <th className="px-4 py-3 text-right">Order Value</th>
                                {/* <th className="px-4 py-3 text-right">Professional Fee</th>
                                <th className="px-4 py-3 text-right">Vendor Fee</th>
                                <th className="px-4 py-3 text-right">Govt. Fee</th>
                                <th className="px-4 py-3 text-right">Contractor Fee</th>
                                <th className="px-4 py-3 text-right">GST Amount</th>
                                <th className="px-4 py-3 text-right">CGST %</th>
                                <th className="px-4 py-3 text-right">SGST %</th>
                                <th className="px-4 py-3 text-right">IGST %</th> */}
                                <th className="px-4 py-3 text-right">Discount (Order)</th>
                                <th className="px-4 py-3">Company Name</th>
                                {/* <th className="px-4 py-3">Company State</th> */}
                                <th className="px-4 py-3">Primary Customer</th>
                                <th className="px-4 py-3 text-center">Aging (Days)</th>
                                <th className="px-4 py-3 text-right">Amount Allocated</th>
                                <th className="px-4 py-3 text-right">Amount Received</th>
                                <th className="px-4 py-3">Created Date</th>
                                <th className="px-4 py-3">Created By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="28" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                                            <span className="text-slate-400 font-medium">Crunching service data...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : services.length === 0 ? (
                                <tr>
                                    <td colSpan="28" className="px-6 py-20 text-center text-slate-400">
                                        No services found matching your criteria
                                    </td>
                                </tr>
                            ) : (
                                services.map((service, index) => {
                                    const info = service.orderInfo;
                                    const amountReceived = getReceivedForService(service);
                                    return (
                                        <tr key={`${info.OrderID}_${service.ServiceID}_${index}`} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-4 py-3 text-center text-slate-400 font-medium">{index + 1}</td>
                                            <td
                                                className="px-4 py-3 font-bold text-yellow-600 hover:underline cursor-pointer"
                                                onClick={() => navigate(`/associate/services/${service.ServiceDetailID}`)}
                                            >
                                                {service.service_code || `SV${String(service.ServiceID).padStart(4, '0')}`}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700 font-semibold">{info.OrderCodeId || '--'}</td>
                                            <td className="px-4 py-3 text-slate-500">
                                                {info.OrderCreatedAt ? format(new Date(info.OrderCreatedAt), "yyyy-MM-dd HH:mm:ss") : "--"}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{info.QuoteCRE_EmployeeName || "admin"}</td>
                                            <td className="px-4 py-3 font-bold text-slate-700">{service.ServiceName}</td>
                                            {/* <td className="px-4 py-3 text-slate-500 italic">{service.ServiceCategory || "--"}</td> */}
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-[4px] font-medium ${!info.IsIndividual ? 'bg-purple-50 text-purple-600' : 'bg-slate-50 text-slate-600'}`}>
                                                    {!info.IsIndividual ? "Package" : "Individual"}
                                                </span>
                                            </td>
                                            {/* <td className="px-4 py-3 text-slate-400">{service.TargetDate ? format(new Date(service.TargetDate), "yyyy-MM-dd") : "null"}</td> */}
                                            <td className="px-4 py-3 text-right font-bold text-slate-700">₹{(service.Total || 0).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-slate-500">₹{(info.TotalAmount || 0).toLocaleString()}</td>
                                            {/* <td className="px-4 py-3 text-right text-slate-600">₹{(service.ProfessionalFee || service.ProfFee || 0).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-slate-600">₹{(service.VendorFee || 0).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-slate-600">₹{(service.GovtFee || 0).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-slate-600">₹{(service.ContractorFee || 0).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-emerald-600">₹{(service.GstAmount || service.GST || 0).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-slate-400">{service.CGST || "undefined"}</td>
                                            <td className="px-4 py-3 text-right text-slate-400">{service.SGST || "undefined"}</td>
                                            <td className="px-4 py-3 text-right text-slate-400">{service.IGST || "undefined"}</td> */}
                                            <td className="px-4 py-3 text-right text-red-400">₹{(service.Discount || 0).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-blue-600 font-medium hover:underline cursor-pointer">{info.CompanyName}</td>
                                            {/* <td className="px-4 py-3 text-slate-500 uppercase">{info.State || "undefined"}</td> */}
                                            <td className="px-4 py-3 text-slate-700 font-medium">{info.CustomerName}</td>
                                            <td className="px-4 py-3 text-center font-bold text-slate-600">{getAgeing(info.OrderCreatedAt)}</td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-800">₹{(service.Total || 0).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right font-bold text-yellow-600">₹{amountReceived.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-slate-400 text-[9px]">
                                                {info.OrderCreatedAt ? format(new Date(info.OrderCreatedAt), "yyyy-MM-dd HH:mm:ss") : "--"}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">{info.CreatedBy || "admin"}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Pagination matching image style */}
                <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-white">
                    <div className="flex items-center gap-4">
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                            Showing page {currentPage} of {totalPages || 1}
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Rows per page:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            >
                                {PAGE_SIZE_OPTIONS.map(size => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 disabled:opacity-30 hover:bg-slate-50 hover:text-slate-600 transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {totalPages > 0 && [...Array(Math.min(5, totalPages))].map((_, i) => {
                            const pageNum = i + 1;
                            // Basic logic to show pages around current page if there are many pages
                            // For now, keeping it simple as it was
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum ? 'bg-amber-400 text-slate-900 shadow-md shadow-amber-200' : 'text-slate-500 border border-slate-200 hover:bg-slate-50 hover:border-amber-200'}`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 disabled:opacity-30 hover:bg-slate-50 hover:text-slate-600 transition-all"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssociateServices;

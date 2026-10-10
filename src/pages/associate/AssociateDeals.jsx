import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AddDealModal from '../../components/Modals/AddDealModal';
import { Plus, Edit2, Trash2, Search, Filter, Loader2, MoreVertical, RotateCcw, X, Calendar } from 'lucide-react';
import DealsApi from '../../api/DealsApi';
import { getSecureItem } from '../../utils/secureStorage';
import { format } from 'date-fns';
import axiosInstance from '../../api/axiosInstance';

const getDealDataFromParams = (search) => {
    try {
        const params = new URLSearchParams(search);
        if (params.get("create") === "true") {
            return {
                serviceState: params.get("state") || "",
                serviceCategory: params.get("category") || "",
                selectedServices: params.get("serviceId") ? [params.get("serviceId")] : [],
                packageId: params.get("packageId") || null,
                serviceType: params.get("type") || "individual"
            };
        }
    } catch (e) {
        console.error("Error parsing params", e);
    }
    return null;
};

const TABS = [
    { label: 'All', value: 'all' },
    { label: 'Proposal Quote', value: 'proposal' },
    { label: 'Requested', value: 'requested' },
    { label: 'Created', value: 'created' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

const DEFAULT_FILTERS = {
    dealType: [],
    closureDateFrom: '',
    closureDateTo: '',
};

const AssociateDeals = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [preFilledData, setPreFilledData] = useState(null);
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [creatingQuote, setCreatingQuote] = useState(null);
    const [editingDeal, setEditingDeal] = useState(null);
    const [companyNames, setCompanyNames] = useState({});
    const [existingQuoteDealIds, setExistingQuoteDealIds] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(30);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
    const menuRef = useRef(null);

    const activeFilterCount = [
        appliedFilters.dealType.length > 0,
        !!(appliedFilters.closureDateFrom || appliedFilters.closureDateTo),
    ].filter(Boolean).length;

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const dealData = getDealDataFromParams(location.search);
        if (dealData) {
            setPreFilledData(dealData);
            setIsModalOpen(true);
        }
    }, [location.search]);

    const fetchDeals = useCallback(async () => {
        setLoading(true);
        try {
            const user = getSecureItem("partnerUser") || {};
            // Deals are assigned by round-robin, so filter by the associate only
            // (not by the associate's BDE/franchisee).
            if (!user.id) {
                setDeals([]);
                return;
            }
            const result = await DealsApi.listDeals({
                isAssociate: true,
                AssociateID: user.id || null
            });

            const AssociateID = user.id || localStorage.getItem("AssociateID");
            const quotesResponse = await axiosInstance.post('/getLatestQuotes', {
                AssociateID,
                isAssociate: true
            });

            const quoteDealIds = (quotesResponse.data?.data || [])
                .map(q => q.DealID)
                .filter(Boolean);

            setExistingQuoteDealIds(quoteDealIds);

            if (result.success) {
                const dealsData = result.data || [];
                setDeals(dealsData);
                fetchCompanyNames(dealsData);
            } else {
                setError(result.message || "Failed to fetch deals");
            }
        } catch (err) {
            console.error("fetchDeals error", err);
            setError("An error occurred while fetching deals");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDeals();
    }, [fetchDeals]);

    const fetchCompanyNames = async (dealsList) => {
        const uniqueCompanyIds = [...new Set(dealsList.map(d => d.CompanyID).filter(id => id && !companyNames[id]))];
        for (const id of uniqueCompanyIds) {
            try {
                const response = await DealsApi.getCompanyDetails(id);
                if (response.success && response.data) {
                    setCompanyNames(prev => ({ ...prev, [id]: response.data.BusinessName }));
                }
            } catch (err) {
                console.error(`Error fetching company name for ${id}`, err);
            }
        }
    };

    const handleDealSuccess = () => {
        fetchDeals();
        setEditingDeal(null);
    };

    const handleEdit = (deal) => {
        setEditingDeal(deal);
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const handleDelete = async (deal) => {
        setOpenMenuId(null);
        if (window.confirm(`Are you sure you want to delete deal "${deal.name}"?`)) {
            try {
                const result = await DealsApi.deleteDeal(deal.id);
                if (result.success) {
                    fetchDeals();
                } else {
                    alert(result.message || "Failed to delete deal");
                }
            } catch (err) {
                console.error("Delete deal error", err);
                alert("An error occurred while deleting the deal");
            }
        }
    };

    const handleCreateQuote = async (deal) => {
        setCreatingQuote(deal.id);
        setOpenMenuId(null);
        try {
            const user = getSecureItem("partnerUser") || {};
            const result = await DealsApi.requestQuote(deal.id, user.FranchiseeID || null);
            if (result.success) {
                setDeals(prev => prev.map(d =>
                    d.id === deal.id ? { ...d, associate_request: 1 } : d
                ));
            } else {
                alert('Failed to request quote: ' + (result.message || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error requesting quote from deal:', err);
            alert('Failed to request quote. Please try again.');
        } finally {
            setCreatingQuote(null);
        }
    };

    const getDealStatus = (deal) => {
        if (existingQuoteDealIds.includes(deal.id)) return 'created';
        if (deal.associate_request === 1) return 'requested';
        return 'proposal';
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'proposal':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-400 text-white">
                        Proposal Quote
                    </span>
                );
            case 'requested':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                        Requested
                    </span>
                );
            case 'created':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                        Created
                    </span>
                );
            default:
                return null;
        }
    };

    // Filter handlers
    const handleDealTypeToggle = (type) => {
        setFilters(prev => ({
            ...prev,
            dealType: prev.dealType.includes(type)
                ? prev.dealType.filter(t => t !== type)
                : [...prev.dealType, type]
        }));
    };

    const handleResetFilters = () => {
        setFilters(DEFAULT_FILTERS);
    };

    const handleApplyFilters = () => {
        setAppliedFilters({ ...filters });
        setCurrentPage(1);
        setShowFilterPanel(false);
    };

    const handleOpenFilter = () => {
        setFilters({ ...appliedFilters });
        setShowFilterPanel(prev => !prev);
    };

    const removeChip = (key, value) => {
        if (key === 'dealType') {
            const next = appliedFilters.dealType.filter(t => t !== value);
            setAppliedFilters(prev => ({ ...prev, dealType: next }));
            setFilters(prev => ({ ...prev, dealType: next }));
        } else if (key === 'date') {
            setAppliedFilters(prev => ({ ...prev, closureDateFrom: '', closureDateTo: '' }));
            setFilters(prev => ({ ...prev, closureDateFrom: '', closureDateTo: '' }));
        }
        setCurrentPage(1);
    };

    const handleClearAllFilters = () => {
        setFilters(DEFAULT_FILTERS);
        setAppliedFilters(DEFAULT_FILTERS);
        setCurrentPage(1);
    };

    const filteredDeals = deals
        .filter(d => {
            const status = getDealStatus(d);
            if (activeTab === 'all') return true;
            if (activeTab === 'proposal') return status === 'proposal';
            if (activeTab === 'requested') return status === 'requested';
            if (activeTab === 'created') return status === 'created';
            return true;
        })
        .filter(d =>
            d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.DealCode?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .filter(d => {
            if (appliedFilters.dealType.length > 0) {
                const isInd = d.isIndividual === 1;
                const ok = (appliedFilters.dealType.includes('individual') && isInd) ||
                    (appliedFilters.dealType.includes('package') && !isInd);
                if (!ok) return false;
            }
            if (appliedFilters.closureDateFrom && d.ClosureDate) {
                if (new Date(d.ClosureDate) < new Date(appliedFilters.closureDateFrom)) return false;
            }
            if (appliedFilters.closureDateTo && d.ClosureDate) {
                if (new Date(d.ClosureDate) > new Date(appliedFilters.closureDateTo)) return false;
            }
            return true;
        });

    const totalPages = Math.ceil(filteredDeals.length / pageSize);
    const paginatedDeals = filteredDeals.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="p-6 bg-white min-h-screen font-sans">
            {/* Header */}
            <div className="flex justify-between items-start mb-5">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Deal</h1>
                    <p className="text-xs text-slate-400 mt-0.5">Manage and track your business deals</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add deal
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 border-b border-slate-100">
                {TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => { setActiveTab(tab.value); setCurrentPage(1); }}
                        className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors -mb-px ${activeTab === tab.value
                            ? 'bg-amber-400 text-white border border-b-white border-amber-400'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search + Filter bar */}
            <div className="flex items-center justify-between mb-3 gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search quotes..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-all text-sm bg-white placeholder-slate-400"
                    />
                </div>
                <button
                    onClick={handleOpenFilter}
                    className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilterPanel || activeFilterCount > 0
                        ? 'border-indigo-400 text-indigo-600 bg-indigo-50'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <Filter className="w-3.5 h-3.5" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="bg-indigo-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            {activeFilterCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {appliedFilters.dealType.map(type => (
                        <span key={type} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-medium">
                            {type === 'individual' ? 'Individual' : 'Package'}
                            <button onClick={() => removeChip('dealType', type)} className="hover:text-indigo-900">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                    {(appliedFilters.closureDateFrom || appliedFilters.closureDateTo) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-medium">
                            Closure:{' '}
                            {appliedFilters.closureDateFrom ? format(new Date(appliedFilters.closureDateFrom), 'dd/MM/yyyy') : '...'}
                            {' → '}
                            {appliedFilters.closureDateTo ? format(new Date(appliedFilters.closureDateTo), 'dd/MM/yyyy') : '...'}
                            <button onClick={() => removeChip('date')} className="hover:text-indigo-900">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}
                    <button
                        onClick={handleClearAllFilters}
                        className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Filter Panel */}
            {showFilterPanel && (
                <div className="mb-4 border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
                    {/* Panel Header */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                            <span className="w-1 h-5 bg-indigo-500 rounded-full inline-block"></span>
                            <span className="text-sm font-semibold text-slate-700">Comprehensive Filters</span>
                        </div>
                        <button
                            onClick={handleResetFilters}
                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors font-medium"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reset to Default
                        </button>
                    </div>

                    {/* Filter Body */}
                    <div className="px-6 py-5 flex flex-wrap gap-12">
                        {/* Deal Type */}
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Deal Type</p>
                            <div className="flex flex-col gap-3">
                                {[
                                    { label: 'Individual', value: 'individual' },
                                    { label: 'Package', value: 'package' },
                                ].map(({ label, value }) => {
                                    const checked = filters.dealType.includes(value);
                                    return (
                                        <label
                                            key={value}
                                            className="flex items-center gap-2.5 cursor-pointer group"
                                            onClick={() => handleDealTypeToggle(value)}
                                        >
                                            <div
                                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${checked
                                                    ? 'border-indigo-500 bg-indigo-500'
                                                    : 'border-slate-300 bg-white group-hover:border-indigo-300'
                                                    }`}
                                            >
                                                {checked && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                                            </div>
                                            <span className={`text-sm transition-colors ${checked ? 'text-slate-800 font-medium' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                                {label}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Closure Date Range */}
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Closure Date Range</p>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={filters.closureDateFrom}
                                        onChange={e => setFilters(prev => ({ ...prev, closureDateFrom: e.target.value }))}
                                        className="border border-slate-200 rounded-lg pl-3 pr-9 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white w-38 transition-all"
                                    />
                                    <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                </div>
                                <span className="text-slate-400 font-medium">→</span>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={filters.closureDateTo}
                                        min={filters.closureDateFrom || undefined}
                                        onChange={e => setFilters(prev => ({ ...prev, closureDateTo: e.target.value }))}
                                        className="border border-slate-200 rounded-lg pl-3 pr-9 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white w-38 transition-all"
                                    />
                                    <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Panel Footer */}
                    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
                        <button
                            onClick={() => setShowFilterPanel(false)}
                            className="px-4 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApplyFilters}
                            className="px-5 py-1.5 text-sm text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg font-semibold transition-colors shadow-sm"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                {['S.NO', 'ID', 'DEAL NAME', 'COMPANY', 'CLOSURE DEAL', 'SERVICES', 'SERVICE CATEGORY', 'DEAL TYPE', 'MOBILE', 'STATUS', 'ACTION'].map(col => (
                                    <th key={col} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="11" className="px-4 py-16 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                                            <p className="text-slate-400 text-sm">Loading deals...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="11" className="px-4 py-16 text-center">
                                        <div className="max-w-xs mx-auto space-y-2">
                                            <div className="bg-red-50 text-red-500 p-3 rounded-lg border border-red-100 text-sm">{error}</div>
                                            <button onClick={fetchDeals} className="text-amber-500 font-semibold text-sm hover:underline">Try Again</button>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedDeals.length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="px-4 py-16 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-50">
                                            <Search className="w-10 h-10 text-slate-300" />
                                            <p className="text-slate-500 font-medium">No deals found</p>
                                            <p className="text-slate-400 text-sm">
                                                {activeFilterCount > 0 ? 'Try adjusting your filters' : 'Add your first deal to get started'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedDeals.map((deal, index) => {
                                    const status = getDealStatus(deal);
                                    const globalIndex = (currentPage - 1) * pageSize + index + 1;
                                    return (
                                        <tr key={deal.id} className="hover:bg-slate-50/60 transition-colors text-sm">
                                            <td className="px-4 py-3 text-slate-500 text-xs">{globalIndex}</td>

                                            <td
                                                className="px-4 py-3 text-blue-500 font-mono text-xs cursor-pointer hover:underline"
                                                onClick={() => navigate(`/associate/deals/${deal.id}`)}
                                            >
                                                {deal.DealCode || "--"}
                                            </td>

                                            <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                                                {deal.name}
                                            </td>

                                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                                {companyNames[deal.CompanyID] || deal.CompanyName || "--"}
                                            </td>

                                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                                                {deal.ClosureDate ? format(new Date(deal.ClosureDate), "dd-MM-yyyy") : "--"}
                                            </td>

                                            <td className="px-4 py-3 text-xs max-w-[180px]">
                                                {deal.packageName ? (
                                                    <div>
                                                        <span className="font-semibold text-[#4b49ac]">{deal.packageName}</span>
                                                        <div className="text-slate-400 truncate">{deal.services?.map(s => s.serviceName).join(", ") || "--"}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-blue-500 font-medium">
                                                        {deal.serviceNames || (deal.services?.map(s => s.serviceName).join(", ")) || "--"}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                                                {deal.serviceCategory || (deal.services?.length > 0 ? [...new Set(deal.services.map(s => s.serviceCategory))].join(", ") : "--")}
                                            </td>

                                            <td className="px-4 py-3">
                                                {deal.isIndividual === 1 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-600 border border-green-100">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
                                                        INDIVIDUAL
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block"></span>
                                                        PACKAGE
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 text-slate-600 font-mono text-xs whitespace-nowrap">
                                                {deal.mobile || "--"}
                                            </td>

                                            <td className="px-4 py-3">
                                                {getStatusBadge(status)}
                                            </td>

                                            {/* ACTION */}
                                            <td className="px-4 py-3 relative" ref={openMenuId === deal.id ? menuRef : null}>
                                                {status !== 'created' && (
                                                    <>
                                                        <button
                                                            onClick={() => setOpenMenuId(openMenuId === deal.id ? null : deal.id)}
                                                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>

                                                        {openMenuId === deal.id && (
                                                            <div className="absolute right-4 top-10 z-50 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[140px]">
                                                                <button
                                                                    onClick={() => handleCreateQuote(deal)}
                                                                    disabled={creatingQuote === deal.id || deal.associate_request === 1}
                                                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
                                                                >
                                                                    {creatingQuote === deal.id ? (
                                                                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Requesting...</>
                                                                    ) : (
                                                                        deal.associate_request === 1 ? "Requested" : "Request Quote"
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEdit(deal)}
                                                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5 text-slate-400" /> Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(deal)}
                                                                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && filteredDeals.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span>Page</span>
                            <div className="flex gap-1">
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setCurrentPage(p)}
                                        className={`w-7 h-7 rounded-full text-xs font-semibold transition-colors ${currentPage === p
                                            ? 'bg-amber-400 text-white'
                                            : 'text-slate-500 hover:bg-slate-100'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                            <span>•</span>
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                            >
                                {PAGE_SIZE_OPTIONS.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            <AddDealModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingDeal(null);
                    setPreFilledData(null);
                    navigate("/associate/deals", { replace: true });
                }}
                onSuccess={handleDealSuccess}
                deal={editingDeal}
                initialData={preFilledData}
            />
        </div>
    );
};

export default AssociateDeals;
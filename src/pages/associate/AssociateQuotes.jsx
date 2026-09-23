import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Loader2, Download, X, Calendar, } from 'lucide-react';
import { getSecureItem } from '../../utils/secureStorage';
import { format } from 'date-fns';
import { getQuoteStatus } from '../../api/QuoteStatusApi';
import axiosInstance from '../../api/axiosInstance';
import DealsApi from '../../api/DealsApi';
import AddDealModal from '../../components/Modals/AddDealModal';
import CryptoJS from "crypto-js";

const STATUS_TABS = [
    { key: 'all', label: 'All' },
    { key: 'created', label: 'Created Quotes' },
    { key: 'converted', label: 'Converted to Orders' },
    { key: 'modified', label: 'Modified Quotes' },
    { key: 'rejected', label: 'Rejected Quotes' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

const getStatusStyle = (status = '') => {
    const s = status.toLowerCase();
    if (s.includes('draft') || s.includes('created')) return { bg: '#EFF6FF', color: '#3B82F6', label: 'Quote Draft' };
    if (s.includes('converted') || s.includes('payment')) return { bg: '#ECFDF5', color: '#10B981', label: 'Converted to Order' };
    if (s.includes('modified')) return { bg: '#FFFBEB', color: '#F59E0B', label: 'Modified' };
    if (s.includes('rejected')) return { bg: '#FEF2F2', color: '#EF4444', label: 'Rejected' };
    return { bg: '#F1F5F9', color: '#64748B', label: status };
};

const getApprovedStyle = (isApproved) => {
    if (isApproved) return { bg: '#ECFDF5', color: '#10B981', label: 'Approved' };
    return { bg: '#F1F5F9', color: '#64748B', label: 'Approve' };
};

const DEFAULT_FILTERS = {
    quoteType: [],
    dateFrom: '',
    dateTo: '',
};

const AssociateQuotes = () => {
    const navigate = useNavigate();
    const [activeStatusTab, setActiveStatusTab] = useState('all');
    const [activeTab, setActiveTab] = useState('approved'); // 'requested' or 'approved'
    const [quotes, setQuotes] = useState([]);
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingDeal, setEditingDeal] = useState(null);
    const [companyNames, setCompanyNames] = useState({});
    const [quoteStatuses, setQuoteStatuses] = useState({});
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(30);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);

    const activeFilterCount = [
        appliedFilters.quoteType.length > 0,
        !!(appliedFilters.dateFrom || appliedFilters.dateTo),
    ].filter(Boolean).length;

    const fetchDeals = async () => {
        if (activeTab !== 'requested') return;
        setLoading(true);
        setError(null);
        try {
            const user = getSecureItem("partnerUser") || {};
            const AssociateID = user.id || localStorage.getItem("AssociateID");
            const result = await DealsApi.listDeals({ isAssociate: true, AssociateID });
            const quotesResponse = await axiosInstance.post('/getLatestQuotes', { AssociateID, isAssociate: true });
            const existingQuoteDealIds = (quotesResponse.data?.data || []).map(q => q.DealID).filter(Boolean);

            if (result.success) {
                const requestedDeals = result.data.filter(d =>
                    d.associate_request === 1 && !existingQuoteDealIds.includes(d.id)
                );
                setDeals(requestedDeals);
                await Promise.all(requestedDeals.map(async (deal) => {
                    if (deal.CompanyID && !companyNames[deal.CompanyID]) {
                        const compResult = await DealsApi.getCompanyDetails(deal.CompanyID);
                        if (compResult.success && compResult.data) {
                            setCompanyNames(prev => ({ ...prev, [deal.CompanyID]: compResult.data.BusinessName }));
                        }
                    }
                }));
            }
        } catch (err) {
            console.error("fetchDeals error", err);
            setError("An error occurred while fetching deals");
        } finally {
            setLoading(false);
        }
    };

    const fetchQuotes = async () => {
        if (activeTab !== 'approved') return;
        setLoading(true);
        try {
            const user = getSecureItem("partnerUser") || {};
            const AssociateID = user.id || localStorage.getItem("AssociateID");
            const response = await axiosInstance.post('/getLatestQuotes', { AssociateID, isAssociate: true });
            if (response.data?.data) {
                const fetchedQuotes = response.data.data;
                setQuotes(fetchedQuotes);
                const quoteIds = fetchedQuotes.map(q => q.QuoteID).filter(Boolean);
                if (quoteIds.length > 0) {
                    try {
                        const statusRes = await getQuoteStatus(quoteIds);
                        if (statusRes?.results) {
                            const statusMap = {};
                            statusRes.results.forEach(s => {
                                let status = s.quotestatus;
                                if (status === "1") status = "Draft";
                                if (status === "3") status = "Payment Received & Converted";
                                statusMap[s.quoteId] = status;
                            });
                            setQuoteStatuses(statusMap);
                        }
                    } catch (statusErr) {
                        console.error("Error fetching quote statuses:", statusErr);
                    }
                }
            }
        } catch (err) {
            console.error("fetchQuotes error", err);
            setError("An error occurred while fetching quotes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'requested') fetchDeals();
        else fetchQuotes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const encrypt = (id) => {
        const secret = import.meta.env.VITE_QUOTE_LINK_SECRET || "q3!9fKs7@pLzXr84$nmYtB!cVZdQ3";
        return CryptoJS.AES.encrypt(String(id), secret).toString();
    };

    const handleViewQuote = (quote) => {
        if (!quote?.QuoteID) return;
        if (typeof CryptoJS === "undefined") { alert("Unable to open quote preview."); return; }
        const encryptedId = encodeURIComponent(encrypt(quote.QuoteID));
        window.open(`https://dev.bizpoleindia.in/quotes/saved-preview/${encryptedId}`, "_blank");
    };

    const handleDownloadQuote = (quote) => {
        if (!quote?.QuoteID) { alert("Quote ID not found"); return; }
        window.open(`https://dev.bizpoleindia.in/quotes/download/${quote.QuoteID}`, "_blank");
    };

    const filterByStatusTab = (list) => {
        if (activeStatusTab === 'all') return list;
        return list.filter(q => {
            const status = (quoteStatuses[q.QuoteID] || q.QuoteStatus || '').toLowerCase();
            if (activeStatusTab === 'created') return status.includes('draft') || status.includes('created');
            if (activeStatusTab === 'converted') return status.includes('converted') || status.includes('payment');
            if (activeStatusTab === 'modified') return status.includes('modified');
            if (activeStatusTab === 'rejected') return status.includes('rejected');
            return true;
        });
    };

    const handleQuoteTypeToggle = (type) => {
        setFilters(prev => ({
            ...prev,
            quoteType: prev.quoteType.includes(type)
                ? prev.quoteType.filter(t => t !== type)
                : [...prev.quoteType, type]
        }));
    };

    const handleApplyFilters = () => {
        setAppliedFilters({ ...filters });
        setPage(1);
        setShowFilters(false);
    };

    const handleResetFilters = () => {
        setFilters(DEFAULT_FILTERS);
    };

    const handleOpenFilters = () => {
        setFilters({ ...appliedFilters });
        setShowFilters(prev => !prev);
    };

    const removeChip = (key, value) => {
        if (key === 'quoteType') {
            const next = appliedFilters.quoteType.filter(t => t !== value);
            setAppliedFilters(prev => ({ ...prev, quoteType: next }));
            setFilters(prev => ({ ...prev, quoteType: next }));
        } else if (key === 'date') {
            setAppliedFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }));
            setFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }));
        }
        setPage(1);
    };

    const handleClearAllFilters = () => {
        setFilters(DEFAULT_FILTERS);
        setAppliedFilters(DEFAULT_FILTERS);
        setPage(1);
    };

    const filteredQuotes = filterByStatusTab(
        quotes.filter(q => {
            const matchSearch =
                q.QuoteCodeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                q.QuoteCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                q.QuoteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                q.CompanyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                q.CustomerName?.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchSearch) return false;

            if (appliedFilters.quoteType.length > 0) {
                const isInd = q.IsIndividual;
                const ok = (appliedFilters.quoteType.includes('individual') && isInd) ||
                    (appliedFilters.quoteType.includes('package') && !isInd);
                if (!ok) return false;
            }

            const qDate = q.QuoteDate ? new Date(q.QuoteDate) : null;
            if (appliedFilters.dateFrom && qDate) {
                if (qDate < new Date(appliedFilters.dateFrom)) return false;
            }
            if (appliedFilters.dateTo && qDate) {
                if (qDate > new Date(appliedFilters.dateTo)) return false;
            }

            return true;
        })
    );

    // const filteredDeals = deals.filter(d =>
    //     d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    //     d.DealCode?.toLowerCase().includes(searchTerm.toLowerCase())
    // );

    const totalPages = Math.ceil(filteredQuotes.length / pageSize);
    const pagedQuotes = filteredQuotes.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div style={{ padding: '28px 32px', background: '#F8F9FB', minHeight: '100vh', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1D23', margin: 0 }}>Quotes</h1>
                <p style={{ fontSize: 13, color: '#8A94A6', marginTop: 4 }}>View status of requested quotes</p>
            </div>

            {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '10px 16px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                    {error}
                </div>
            )}

            {/* Status Tabs */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid #E5E7EB' }}>
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveStatusTab(tab.key); setPage(1); setActiveTab('approved'); }}
                        style={{
                            padding: '8px 18px',
                            fontSize: 13,
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: '6px 6px 0 0',
                            transition: 'all 0.15s',
                            background: activeStatusTab === tab.key ? '#F5A623' : 'transparent',
                            color: activeStatusTab === tab.key ? '#fff' : '#6B7280',
                            marginBottom: -1,
                            borderBottom: activeStatusTab === tab.key ? '2px solid #F5A623' : '2px solid transparent',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search & Filter Bar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
                background: '#fff', padding: '12px 16px', borderRadius: 10,
                border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#9CA3AF' }} />
                    <input
                        type="text"
                        placeholder="Search quotes..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        style={{
                            width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                            border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none',
                            background: '#F9FAFB', color: '#374151', boxSizing: 'border-box'
                        }}
                    />
                </div>
                <button
                    onClick={handleOpenFilters}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                        border: `1px solid ${showFilters || activeFilterCount > 0 ? '#4B49AC' : '#E5E7EB'}`,
                        borderRadius: 8,
                        background: showFilters || activeFilterCount > 0 ? '#F0F0FF' : '#fff',
                        fontSize: 13, fontWeight: 500,
                        color: showFilters || activeFilterCount > 0 ? '#4B49AC' : '#374151',
                        cursor: 'pointer', transition: 'all 0.15s', position: 'relative'
                    }}
                >
                    <Filter style={{ width: 14, height: 14 }} /> Filters
                    {activeFilterCount > 0 && (
                        <span style={{
                            marginLeft: 4,
                            background: '#4B49AC',
                            color: 'white',
                            fontSize: 10,
                            fontWeight: 'bold',
                            borderRadius: '50%',
                            width: 16,
                            height: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {activeFilterCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {appliedFilters.quoteType.map(type => (
                        <span key={type} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                            background: '#F0F0FF', border: '1px solid #C7D2FE', color: '#4338CA',
                            borderRadius: 100, fontSize: 12, fontWeight: 500
                        }}>
                            {type === 'individual' ? 'Individual' : 'Package'}
                            <button onClick={() => removeChip('quoteType', type)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#4338CA', display: 'flex' }}>
                                <X style={{ width: 12, height: 12 }} />
                            </button>
                        </span>
                    ))}
                    {(appliedFilters.dateFrom || appliedFilters.dateTo) && (
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                            background: '#F0F0FF', border: '1px solid #C7D2FE', color: '#4338CA',
                            borderRadius: 100, fontSize: 12, fontWeight: 500
                        }}>
                            Date: {appliedFilters.dateFrom ? format(new Date(appliedFilters.dateFrom), 'dd/MM/yyyy') : '...'}
                            {' → '}
                            {appliedFilters.dateTo ? format(new Date(appliedFilters.dateTo), 'dd/MM/yyyy') : '...'}
                            <button onClick={() => removeChip('date')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#4338CA', display: 'flex' }}>
                                <X style={{ width: 12, height: 12 }} />
                            </button>
                        </span>
                    )}
                    <button
                        onClick={handleClearAllFilters}
                        style={{ background: 'none', border: 'none', fontSize: 12, color: '#9CA3AF', textDecoration: 'underline', cursor: 'pointer', padding: '4px 0' }}
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Filter Panel */}
            {showFilters && (
                <div style={{
                    background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16, overflow: 'hidden'
                }}>
                    {/* Panel Header */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 20px', borderBottom: '1px solid #F3F4F6'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 3, height: 18, background: '#4B49AC', borderRadius: 2 }} />
                            <span style={{ fontWeight: 700, fontSize: 14, color: '#1A1D23' }}>Comprehensive Filters</span>
                        </div>
                        <button
                            onClick={handleResetFilters}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: 13, color: '#6B7280', fontWeight: 500
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                            </svg>
                            Reset to Default
                        </button>
                    </div>

                    {/* Filter Body */}
                    <div style={{ padding: '20px 24px', display: 'flex', gap: 60, flexWrap: 'wrap' }}>
                        {/* Quote Type */}
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 12, marginTop: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Deal Type</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {[{ value: 'individual', label: 'Individual' }, { value: 'package', label: 'Package' }].map(opt => (
                                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                                        <div
                                            onClick={() => handleQuoteTypeToggle(opt.value)}
                                            style={{
                                                width: 16, height: 16, borderRadius: '50%',
                                                border: `2px solid ${filters.quoteType.includes(opt.value) ? '#4B49AC' : '#D1D5DB'}`,
                                                background: filters.quoteType.includes(opt.value) ? '#4B49AC' : '#fff',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s'
                                            }}
                                        >
                                            {filters.quoteType.includes(opt.value) && (
                                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                                            )}
                                        </div>
                                        <span onClick={() => handleQuoteTypeToggle(opt.value)}>{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Closure Date Range */}
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 12, marginTop: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Closure Date Range</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="date"
                                        value={filters.dateFrom}
                                        onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                                        style={{
                                            padding: '7px 36px 7px 10px', border: '1px solid #E5E7EB',
                                            borderRadius: 8, fontSize: 13, color: '#374151',
                                            background: '#F9FAFB', outline: 'none', cursor: 'pointer',
                                            width: 140, boxSizing: 'border-box'
                                        }}
                                    />
                                    <Calendar style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', width: 14, height: 14, color: '#4B49AC' }} />
                                </div>
                                <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
                                    <path d="M0 4h14M10 1l4 3-4 3" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="date"
                                        value={filters.dateTo}
                                        min={filters.dateFrom || undefined}
                                        onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                                        style={{
                                            padding: '7px 36px 7px 10px', border: '1px solid #E5E7EB',
                                            borderRadius: 8, fontSize: 13, color: '#374151',
                                            background: '#F9FAFB', outline: 'none', cursor: 'pointer',
                                            width: 140, boxSizing: 'border-box'
                                        }}
                                    />
                                    <Calendar style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', width: 14, height: 14, color: '#4B49AC' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filter Footer */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                        gap: 10, padding: '14px 20px', borderTop: '1px solid #F3F4F6'
                    }}>
                        <button
                            onClick={() => { handleResetFilters(); setShowFilters(false); }}
                            style={{
                                padding: '8px 20px', borderRadius: 8, border: '1px solid #E5E7EB',
                                background: '#fff', fontSize: 13, fontWeight: 500, color: '#374151',
                                cursor: 'pointer', transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApplyFilters}
                            style={{
                                padding: '8px 20px', borderRadius: 8, border: 'none',
                                background: '#4B49AC', fontSize: 13, fontWeight: 600, color: '#fff',
                                cursor: 'pointer', transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#3f3e9a'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#4B49AC'; }}
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                {['S.NO', 'QUOTE ID', 'QUOTE DATE', 'COMPANY NAME', 'PRIMARY CUSTOMER', 'ORIGIN', 'SERVICES TYPE', 'QUOTE DESC', 'QUOTE VALUE', 'QUOTE STATUS', 'ISAPPROVED', 'ACTIONS'].map(h => (
                                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={12} style={{ padding: '48px 0', textAlign: 'center', color: '#9CA3AF' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                            <Loader2 style={{ width: 22, height: 22, color: '#F5A623', animation: 'spin 1s linear infinite' }} />
                                            <span>Loading quotes...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : pagedQuotes.length === 0 ? (
                                <tr>
                                    <td colSpan={12} style={{ padding: '48px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                                        No quotes found
                                    </td>
                                </tr>
                            ) : pagedQuotes.map((quote, index) => {
                                const rawStatus = quoteStatuses[quote.QuoteID] || quote.QuoteStatus || '';
                                const statusStyle = getStatusStyle(rawStatus);
                                const approvedStyle = getApprovedStyle(quote.IsApproved);
                                const total = (quote.ServiceDetails || []).reduce((s, i) => s + Number(i.Total || 0), 0);

                                return (
                                    <tr key={quote.QuoteID}
                                        style={{ borderBottom: '1px solid #F3F4F6', transition: 'background 0.12s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                    >
                                        <td style={{ padding: '11px 14px', color: '#6B7280' }}>{(page - 1) * pageSize + index + 1}</td>
                                        <td style={{ padding: '11px 14px' }}>
                                            <span
                                                onClick={() => navigate(`/associate/quotes/${quote.QuoteID}`)}
                                                style={{ color: '#3B82F6', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}
                                                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                                                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                                            >
                                                {quote.QuoteCodeId}
                                            </span>
                                        </td>
                                        <td style={{ padding: '11px 14px', color: '#374151', whiteSpace: 'nowrap' }}>
                                            {quote.QuoteDate ? format(new Date(quote.QuoteDate), "dd/MM/yyyy") : '--'}
                                        </td>
                                        <td style={{ padding: '11px 14px', color: '#3B82F6', cursor: 'pointer' }}>{quote.CompanyName || '--'}</td>
                                        <td style={{ padding: '11px 14px', color: '#3B82F6', cursor: 'pointer' }}>{quote.CustomerName || '--'}</td>
                                        <td style={{ padding: '11px 14px', color: '#374151' }}>{quote.SourceOfSale || 'Associate'}</td>
                                        <td style={{ padding: '11px 14px', color: '#374151' }}>{quote.IsIndividual ? 'Individual' : 'Package'}</td>
                                        <td style={{ padding: '11px 14px', color: '#374151' }}>{quote.QuoteCRE_EmployeeName || '-admin'}</td>
                                        <td style={{ padding: '11px 14px', color: '#1A1D23', fontWeight: 600 }}>
                                            ₹{total.toLocaleString('en-IN')}
                                        </td>
                                        <td style={{ padding: '11px 14px' }}>
                                            <span style={{
                                                display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                                                fontSize: 12, fontWeight: 600,
                                                background: statusStyle.bg, color: statusStyle.color
                                            }}>
                                                {statusStyle.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '11px 14px' }}>
                                            <span style={{
                                                display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                                                fontSize: 12, fontWeight: 600,
                                                background: approvedStyle.bg, color: approvedStyle.color
                                            }}>
                                                {approvedStyle.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '11px 14px' }}>
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                {!quote.IsApproved && (
                                                    <button
                                                        onClick={() => handleViewQuote(quote)}
                                                        style={{
                                                            padding: '5px 12px', borderRadius: 6, border: '1px solid #E5E7EB',
                                                            background: '#fff', fontSize: 12, fontWeight: 500,
                                                            color: '#374151', cursor: 'pointer'
                                                        }}
                                                    >
                                                        Approve
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDownloadQuote(quote)}
                                                    style={{
                                                        padding: '5px 8px', borderRadius: 6, border: '1px solid #E5E7EB',
                                                        background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center'
                                                    }}
                                                >
                                                    <Download style={{ width: 14, height: 14, color: '#6B7280' }} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {!loading && filteredQuotes.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 }}>
                    <span style={{ fontSize: 13, color: '#6B7280' }}>Page</span>
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        style={{
                            width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB',
                            background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer',
                            color: '#6B7280', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >‹</button>
                    <span style={{
                        width: 32, height: 32, borderRadius: 6, background: '#F5A623',
                        color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>{page}</span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || totalPages === 0}
                        style={{
                            width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB',
                            background: '#fff', cursor: (page === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
                            color: '#6B7280', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >›</button>
                    <select
                        value={pageSize}
                        onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                        style={{
                            padding: '4px 8px', border: '1px solid #E5E7EB', borderRadius: 6,
                            fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer'
                        }}
                    >
                        {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            )}

            <AddDealModal
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); setEditingDeal(null); }}
                onSuccess={() => { fetchDeals(); setIsEditModalOpen(false); setEditingDeal(null); }}
                deal={editingDeal}
            />

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                input:focus { border-color: #F5A623 !important; box-shadow: 0 0 0 2px rgba(245,166,35,0.15) !important; }
            `}</style>
        </div>
    );
};

export default AssociateQuotes;
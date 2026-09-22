import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Loader2, X, RotateCcw, Calendar } from 'lucide-react';
import { getSecureItem } from '../../utils/secureStorage';
import { format, differenceInDays } from 'date-fns';
import { initPayment, listOrders } from '../../api/Orders/Order';
import { useNavigate } from 'react-router-dom';
import { toCustomerOrderStatus, toCustomerServiceStatus } from '../../utils/orderStatus';

const ORDER_STATUSES = [
    { value: 1, label: "Not Started" },
    { value: 2, label: "Action Required" },
    { value: 3, label: "In Process" },
    { value: 4, label: "Completed" },
    { value: 5, label: "On Hold" },
    { value: 6, label: "Dropped" },
    { value: 7, label: "Cancelled" },
    // 8 (Expired) and the legacy 9 are deliberately absent: toCustomerOrderStatus
    // maps both to In Process before they reach this list.
];

const getStatusStyle = (status) => {
    const s = String(status || '').toLowerCase().replace(/\s/g, '');
    if (s.includes('notstart')) return { bg: '#F1F5F9', color: '#64748B', label: 'Not Started' };
    if (s.includes('action')) return { bg: '#FEF9C3', color: '#92400E', label: 'Action' };
    if (s.includes('inprocess') || s.includes('progress')) return { bg: '#DBEAFE', color: '#1D4ED8', label: 'In Process' };
    if (s.includes('complet')) return { bg: '#DCFCE7', color: '#15803D', label: 'Completed' };
    if (s.includes('onhold') || s.includes('hold')) return { bg: '#FEF3C7', color: '#B45309', label: 'On Hold' };
    if (s.includes('drop')) return { bg: '#FEE2E2', color: '#DC2626', label: 'Dropped' };
    if (s.includes('cancel')) return { bg: '#FCE7F3', color: '#9D174D', label: 'Cancelled' };
    // 'expired' is internal (a team missed its 48h acceptance SLA); the work is
    // still outstanding, so the customer sees it as In Process.
    if (s.includes('expir')) return { bg: '#DBEAFE', color: '#1D4ED8', label: 'In Process' };
    return { bg: '#F1F5F9', color: '#64748B', label: status || 'Unknown' };
};

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

const DEFAULT_FILTERS = {
    orderType: [],
    activation: [],
    dateFrom: '',
    dateTo: '',
};

const AssociateOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(30);
    const [totalOrders, setTotalOrders] = useState(0);
    const [payingOrderId, setPayingOrderId] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);

    const activeFilterCount = [
        appliedFilters.orderType.length > 0,
        appliedFilters.activation.length > 0,
        !!(appliedFilters.dateFrom || appliedFilters.dateTo),
    ].filter(Boolean).length;

    const navigate = useNavigate();

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const user = getSecureItem("partnerUser") || {};
            const AssociateID = user.id || localStorage.getItem("AssociateID");

            const params = {
                isAssociate: true,
                AssociateID,
                limit: pageSize,
                page: currentPage,
                search: searchTerm,
                ...(appliedFilters.orderType.length === 1 ? { IsIndividual: appliedFilters.orderType[0] === 'individual' ? 1 : 0 } : {}),
                ...(appliedFilters.dateFrom ? { OrderDateFrom: appliedFilters.dateFrom } : {}),
                ...(appliedFilters.dateTo ? { OrderDateTo: appliedFilters.dateTo } : {}),
            };

            const response = await listOrders(params);

            if (response.success) {
                let data = response.data || [];
                if (appliedFilters.activation.length > 0) {
                    data = data.filter(order => {
                        const pending = Number(order.PendingAmount || 0);
                        const isPaid = pending <= 0;
                        if (appliedFilters.activation.includes('paid') && isPaid) return true;
                        if (appliedFilters.activation.includes('pending') && !isPaid) return true;
                        return false;
                    });
                }
                setOrders(data);
                setTotalOrders(response.total);
            }
        } catch (err) {
            console.error("fetchOrders error", err);
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, pageSize, appliedFilters]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const handleApplyFilters = () => {
        setAppliedFilters({ ...filters });
        setCurrentPage(1);
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
        if (key === 'orderType' || key === 'activation') {
            const next = appliedFilters[key].filter(t => t !== value);
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
        if (e.key === 'Enter') { setCurrentPage(1); fetchOrders(); }
    };

    const getAgeing = (date) => {
        if (!date) return 0;
        return differenceInDays(new Date(), new Date(date));
    };

    const handlePayBalance = async (order) => {
        try {
            setPayingOrderId(order.OrderID);
            const servicePayment = (order.ServiceDetails || []).map((service) => ({
                serviceId: service.ServiceID || service.serviceId,
                vendorFee: Number(service.VendorFee || 0),
                professionalFee: Number(service.ProfessionalFee || service.ProfFee || 0),
                contractorFee: Number(service.ContractorFee || 0),
                govFee: Number(service.GovtFee || 0),
                gst: Number(service.GstAmount || service.GST || 0),
                pendingAmount: Number(order.PendingAmount || 0)
            }));
            const totalPendingAmount = servicePayment.reduce((sum, s) => sum + Number(s.pendingAmount || 0), 0);
            const payload = {
                QuoteID: order.QuoteID,
                totalAmount: Number(totalPendingAmount.toFixed(2)),
                govFee: Number(order.GovtFee || 0),
                vendorFee: Number(order.VendorFee || 0),
                contractorFee: Number(order.ContractorFee || 0),
                profFee: Number(order.ProfessionalFee || 0),
                customer: {
                    name: order.CustomerName || "Customer",
                    email: order.CustomerEmail || order.Email || "test@example.com",
                    phone: order.CustomerPhone || order.Phone || "9999999999"
                },
                servicePayment,
                StateID: order.StateID || 0,
                IsInternal: order.IsInternal || 0
            };
            const response = await initPayment(payload);
            if (response.success && response.paymentUrl) {
                window.open(response.paymentUrl, "_blank", "noopener,noreferrer");
            }
        } catch (error) {
            console.error("Payment Error:", error);
        } finally {
            setPayingOrderId(null);
        }
    };

    const totalPages = Math.ceil(totalOrders / pageSize);

    const th = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.05em', whiteSpace: 'nowrap' };

    return (
        <div style={{ padding: '28px 32px', background: '#F8F9FB', minHeight: '100vh', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1D23', margin: 0 }}>Orders</h1>
                <p style={{ fontSize: 13, color: '#8A94A6', marginTop: 4 }}>Manage and track all associate orders</p>
            </div>

            {/* Search & Filter Bar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
                background: '#fff', padding: '12px 16px', borderRadius: 10,
                border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#9CA3AF' }} />
                    <input
                        type="text"
                        placeholder="Search orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleSearch}
                        style={{
                            width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                            border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none',
                            background: '#F9FAFB', color: '#374151', boxSizing: 'border-box'
                        }}
                    />
                </div>
                <button
                    onClick={() => { setCurrentPage(1); fetchOrders(); }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
                        border: 'none', borderRadius: 8, background: '#4B49AC',
                        fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer'
                    }}
                >
                    Search
                </button>
                <button
                    onClick={handleOpenFilters}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                        border: `1px solid ${showFilters || activeFilterCount > 0 ? '#4B49AC' : '#E5E7EB'}`,
                        borderRadius: 8, background: showFilters || activeFilterCount > 0 ? '#F0F0FF' : '#fff',
                        fontSize: 13, fontWeight: 500, color: showFilters || activeFilterCount > 0 ? '#4B49AC' : '#374151',
                        cursor: 'pointer', transition: 'all 0.15s', position: 'relative'
                    }}
                >
                    <Filter style={{ width: 14, height: 14 }} /> Filters
                    {activeFilterCount > 0 && (
                        <span style={{
                            marginLeft: 4, background: '#4B49AC', color: 'white',
                            fontSize: 10, fontWeight: 'bold', borderRadius: '50%',
                            width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {activeFilterCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {appliedFilters.orderType.map(type => (
                        <span key={type} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                            background: '#F0F0FF', border: '1px solid #C7D2FE', color: '#4338CA',
                            borderRadius: 100, fontSize: 12, fontWeight: 500
                        }}>
                            {type === 'individual' ? 'Individual' : 'Package'}
                            <button onClick={() => removeChip('orderType', type)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#4338CA', display: 'flex' }}>
                                <X style={{ width: 12, height: 12 }} />
                            </button>
                        </span>
                    ))}
                    {appliedFilters.activation.map(val => (
                        <span key={val} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                            background: '#F0F0FF', border: '1px solid #C7D2FE', color: '#4338CA',
                            borderRadius: 100, fontSize: 12, fontWeight: 500
                        }}>
                            {val === 'paid' ? 'Paid' : 'Pending Balance'}
                            <button onClick={() => removeChip('activation', val)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#4338CA', display: 'flex' }}>
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
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 20, overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 3, height: 18, background: '#4B49AC', borderRadius: 2 }} />
                            <span style={{ fontWeight: 700, fontSize: 14, color: '#1A1D23' }}>Order Filters</span>
                        </div>
                        <button onClick={handleResetFilters} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6B7280', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <RotateCcw style={{ width: 14, height: 14 }} /> Reset
                        </button>
                    </div>

                    <div style={{ padding: '20px 24px', display: 'flex', gap: 60, flexWrap: 'wrap' }}>
                        {/* Order Type */}
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Order Type</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {['individual', 'package'].map(type => (
                                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                                        <div onClick={() => toggleFilter('orderType', type)} style={{
                                            width: 16, height: 16, borderRadius: 4, border: `2px solid ${filters.orderType.includes(type) ? '#4B49AC' : '#D1D5DB'}`,
                                            background: filters.orderType.includes(type) ? '#4B49AC' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {filters.orderType.includes(type) && <X style={{ width: 12, height: 12, color: '#fff' }} />}
                                        </div>
                                        <span onClick={() => toggleFilter('orderType', type)}>{type === 'individual' ? 'Individual' : 'Package'}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Activation */}
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Activation</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {[{ v: 'paid', l: 'Paid' }, { v: 'pending', l: 'Pending Balance' }].map(opt => (
                                    <label key={opt.v} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                                        <div onClick={() => toggleFilter('activation', opt.v)} style={{
                                            width: 16, height: 16, borderRadius: 4, border: `2px solid ${filters.activation.includes(opt.v) ? '#4B49AC' : '#D1D5DB'}`,
                                            background: filters.activation.includes(opt.v) ? '#4B49AC' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {filters.activation.includes(opt.v) && <X style={{ width: 12, height: 12, color: '#fff' }} />}
                                        </div>
                                        <span onClick={() => toggleFilter('activation', opt.v)}>{opt.l}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Order Date Range */}
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Order Date Range</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ position: 'relative' }}>
                                    <input type="date" value={filters.dateFrom} onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                                        style={{ padding: '7px 36px 7px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#374151', background: '#F9FAFB', outline: 'none', width: 140, boxSizing: 'border-box' }}
                                    />
                                    <Calendar style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', width: 14, height: 14, color: '#4B49AC' }} />
                                </div>
                                <span style={{ color: '#9CA3AF' }}>→</span>
                                <div style={{ position: 'relative' }}>
                                    <input type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                                        style={{ padding: '7px 36px 7px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#374151', background: '#F9FAFB', outline: 'none', width: 140, boxSizing: 'border-box' }}
                                    />
                                    <Calendar style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', width: 14, height: 14, color: '#4B49AC' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '1px solid #F3F4F6', background: '#F9FAFB' }}>
                        <button onClick={() => setShowFilters(false)} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={handleApplyFilters} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#4B49AC', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Apply Filters</button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                <th style={{ ...th, textAlign: 'center' }}>S.NO</th>
                                <th style={th}>ORDER ID</th>
                                <th style={th}>ORDER DATE</th>
                                <th style={th}>ORDER CREATOR</th>
                                <th style={th}>COMPANY NAME</th>
                                <th style={th}>PRIMARY CUSTOMER</th>
                                <th style={th}>ORDER STATUS</th>
                                <th style={{ ...th, textAlign: 'center' }}>AGEING (DAYS)</th>
                                <th style={{ ...th, textAlign: 'right' }}>AMOUNT PAID</th>
                                <th style={{ ...th, textAlign: 'center' }}>ACTIVATION</th>
                                <th style={th}>ORDER TYPE</th>
                                <th style={th}>CREATED ON</th>
                                <th style={th}>UPDATED ON</th>
                                {/* <th style={th}>CREATED BY</th> */}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={14} style={{ padding: '48px 0', textAlign: 'center', color: '#9CA3AF' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                            <Loader2 style={{ width: 22, height: 22, color: '#4B49AC', animation: 'spin 1s linear infinite' }} />
                                            <span>Loading orders...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={14} style={{ padding: '48px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                                        No orders found
                                    </td>
                                </tr>
                            ) : orders.map((order, index) => {
                                const pendingAmount = Number(order.PendingAmount || 0);
                                const statusNum = toCustomerOrderStatus(order.OrderStatusID || order.OrderStatus_ID || order.OrderStatus);
                                const statusObj = ORDER_STATUSES.find(s => s.value === statusNum);
                                const statusLabel = statusObj
                                    ? statusObj.label
                                    : (typeof order.OrderStatus === 'string' ? order.OrderStatus : 'Unknown');
                                const statusStyle = getStatusStyle(statusLabel);

                                return (
                                    <tr key={order.OrderID}
                                        style={{ borderBottom: '1px solid #F3F4F6' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                    >
                                        <td style={{ padding: '11px 14px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                                            {(currentPage - 1) * pageSize + index + 1}
                                        </td>

                                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                                            <span
                                                onClick={() => navigate(`/associate/orders/${order.OrderID}`)}
                                                style={{ color: '#4B49AC', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                                                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                                                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                                            >
                                                {order.OrderCodeId || '--'}
                                            </span>
                                        </td>

                                        <td style={{ padding: '11px 14px', color: '#374151', fontSize: 13, whiteSpace: 'nowrap' }}>
                                            {order.OrderCreatedAt ? format(new Date(order.OrderCreatedAt), "dd/MM/yyyy") : '--'}
                                        </td>

                                        <td style={{ padding: '11px 14px', color: '#374151', fontSize: 13 }}>
                                            {order.QuoteCRE_EmployeeName || 'admin'}
                                        </td>

                                        <td style={{ padding: '11px 14px', fontSize: 13 }}>
                                            <span style={{ color: '#3B82F6', cursor: 'pointer' }}
                                                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                                                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                                            >
                                                {order.CompanyName}
                                            </span>
                                        </td>

                                        <td style={{ padding: '11px 14px', fontSize: 13 }}>
                                            <span style={{ color: '#3B82F6', cursor: 'pointer' }}
                                                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                                                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                                            >
                                                {order.CustomerName}
                                            </span>
                                        </td>

                                        <td style={{ padding: '11px 14px' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '4px 12px',
                                                borderRadius: 20,
                                                fontSize: 12,
                                                fontWeight: 600,
                                                background: statusStyle.bg,
                                                color: statusStyle.color,
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {statusStyle.label}
                                            </span>
                                        </td>

                                        <td style={{ padding: '11px 14px', textAlign: 'center', color: '#374151', fontWeight: 500, fontSize: 13 }}>
                                            {getAgeing(order.OrderCreatedAt)}
                                        </td>

                                        <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: '#1A1D23', fontSize: 13 }}>
                                            ₹{(order.ReceivedAmount || 0).toLocaleString('en-IN')}
                                        </td>

                                        {/* Activation / Pay Balance */}
                                        <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                                            {pendingAmount > 0 ? (
                                                <button
                                                    onClick={() => handlePayBalance(order)}
                                                    disabled={payingOrderId === order.OrderID}
                                                    style={{
                                                        padding: '5px 14px', borderRadius: 20, border: 'none',
                                                        background: '#F59E0B', color: '#fff',
                                                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                                        opacity: payingOrderId === order.OrderID ? 0.7 : 1,
                                                        whiteSpace: 'nowrap', letterSpacing: '0.01em',
                                                        boxShadow: '0 1px 3px rgba(245,158,11,0.3)'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#D97706'}
                                                    onMouseLeave={e => e.currentTarget.style.background = '#F59E0B'}
                                                >
                                                    {payingOrderId === order.OrderID ? (
                                                        <><Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} /> Processing...</>
                                                    ) : 'Pay Balance'}
                                                </button>
                                            ) : (
                                                <span style={{
                                                    padding: '5px 16px', borderRadius: 20,
                                                    background: '#DCFCE7', color: '#15803D',
                                                    fontSize: 12, fontWeight: 700, display: 'inline-block',
                                                    letterSpacing: '0.01em'
                                                }}>
                                                    Paid
                                                </span>
                                            )}
                                        </td>

                                        <td style={{ padding: '11px 14px' }}>
                                            <span style={{
                                                display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                                                fontSize: 12, fontWeight: 500,
                                                background: order.IsIndividual ? '#F1F5F9' : '#F5F3FF',
                                                color: order.IsIndividual ? '#64748B' : '#7C3AED'
                                            }}>
                                                {order.IsIndividual ? 'Individual' : 'Package'}
                                            </span>
                                        </td>

                                        <td style={{ padding: '11px 14px', color: '#9CA3AF', fontSize: 13, whiteSpace: 'nowrap' }}>
                                            {order.OrderCreatedAt ? format(new Date(order.OrderCreatedAt), "dd/MM/yyyy") : '-'}
                                        </td>

                                        <td style={{ padding: '11px 14px', color: '#9CA3AF', fontSize: 13, whiteSpace: 'nowrap' }}>
                                            {order.OrderUpdatedAt ? format(new Date(order.OrderUpdatedAt), "dd/MM/yyyy") : '-'}
                                        </td>

                                        {/* <td style={{ padding: '11px 14px', color: '#6B7280', fontSize: 13 }}>
                                            {order.CreatedBy || '-'}
                                        </td> */}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && totalOrders > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '18px 0', borderTop: '1px solid #F3F4F6' }}>
                        <span style={{ fontSize: 13, color: '#6B7280' }}>Page</span>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{
                                width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB',
                                background: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                color: '#6B7280', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: currentPage === 1 ? 0.4 : 1
                            }}
                        >‹</button>
                        <span style={{
                            width: 32, height: 32, borderRadius: 6, background: '#F5A623',
                            color: '#fff', fontWeight: 700, fontSize: 13,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>{currentPage}</span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            style={{
                                width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB',
                                background: '#fff', cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
                                color: '#6B7280', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: (currentPage === totalPages || totalPages === 0) ? 0.4 : 1
                            }}
                        >›</button>
                        <select
                            value={pageSize}
                            onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                            style={{
                                padding: '4px 8px', border: '1px solid #E5E7EB', borderRadius: 6,
                                fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer'
                            }}
                        >
                            {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                input:focus { border-color: #4B49AC !important; box-shadow: 0 0 0 2px rgba(75,73,172,0.12) !important; }
            `}</style>
        </div>
    );
};

export default AssociateOrders;
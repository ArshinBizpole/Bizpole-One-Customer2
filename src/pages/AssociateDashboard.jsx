import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    Handshake,
    FileText,
    ShoppingCart,
    Plus,
    CheckCircle2,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Loader2,
    RefreshCw,
    Inbox
} from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid
} from 'recharts';
import { getSecureItem } from '../utils/secureStorage';
import { useNavigate } from 'react-router-dom';
import { getAssociateDashboard } from '../api/AssociateApi';

const formatINR = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

const timeAgo = (date) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const units = [
        ['year', 31536000],
        ['month', 2592000],
        ['week', 604800],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60]
    ];
    for (const [unit, secs] of units) {
        const n = Math.floor(seconds / secs);
        if (n >= 1) return `${n} ${unit}${n > 1 ? 's' : ''} ago`;
    }
    return 'just now';
};

// Month-over-month trend for a stat that has thisMonth / lastMonth counts
const monthTrend = ({ thisMonth = 0, lastMonth = 0 } = {}) => {
    if (lastMonth === 0) {
        return { trend: thisMonth > 0 ? 'up' : 'flat', change: `${thisMonth} new this month` };
    }
    const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
    return {
        trend: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
        change: `${pct > 0 ? '+' : ''}${pct}% vs last month`
    };
};

const activityMeta = {
    deal: { icon: <Plus className="w-4 h-4" />, color: 'bg-blue-100 text-blue-600', title: (a) => `New deal added: ${a.name || a.code}`, path: (a) => `/associate/deals/${a.refId}` },
    quote: { icon: <FileText className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-600', title: (a) => `Quote ${a.code || ''} created for ${a.name || 'client'}`, path: (a) => `/associate/quotes/${a.refId}` },
    order: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'bg-purple-100 text-purple-600', title: (a) => `Order ${a.code || ''} created for ${a.name || 'client'}`, path: (a) => `/associate/orders/${a.refId}` },
    payment: { icon: <Wallet className="w-4 h-4" />, color: 'bg-green-100 text-green-600', title: (a) => `Payment of ${formatINR(a.amount)} received from ${a.name || 'client'}`, path: () => `/associate/receipts` }
};

const AssociateDashboard = () => {
    const navigate = useNavigate();

    const user = getSecureItem("partnerUser") || { username: "Associate" };
    const AssociateID = user.id || localStorage.getItem("AssociateID");

    const [range, setRange] = useState('7d');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDashboard = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getAssociateDashboard({ AssociateID, range });
            if (result.success) setData(result.data);
            else setError(result.message || 'Failed to load dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range]);

    const s = data?.stats;
    const stats = [
        {
            title: "Total Deals",
            value: s?.totalDeals.value,
            ...monthTrend(s?.totalDeals),
            icon: <Users className="w-6 h-6" />,
            color: "bg-blue-50 text-blue-600",
            path: "/associate/deals"
        },
        {
            title: "Active Deals",
            value: s?.activeDeals.value,
            trend: 'flat',
            change: s ? `of ${s.totalDeals.value} total deals` : '',
            icon: <Handshake className="w-6 h-6" />,
            color: "bg-green-50 text-green-600",
            path: "/associate/deals"
        },
        {
            title: "Pending Quotes",
            value: s?.pendingQuotes.value,
            trend: 'flat',
            change: s ? `${s.pendingQuotes.awaitingQuote} request${s.pendingQuotes.awaitingQuote === 1 ? '' : 's'} awaiting quote` : '',
            icon: <FileText className="w-6 h-6" />,
            color: "bg-red-50 text-red-600",
            path: "/associate/quotes"
        },
        {
            title: "Orders",
            value: s?.orders.value,
            ...monthTrend(s?.orders),
            icon: <ShoppingCart className="w-6 h-6" />,
            color: "bg-yellow-50 text-yellow-600",
            path: "/associate/orders"
        }
    ];

    const quickActions = [
        { title: "Add New Deal", desc: "Create a new deal entry", icon: <Users className="w-5 h-5" />, color: "bg-blue-50 text-blue-600", path: "/associate/deals" },
        { title: "Request Quote", desc: "Get pricing for a service", icon: <FileText className="w-5 h-5" />, color: "bg-green-50 text-green-600", path: "/associate/quotes" },
        { title: "View Orders", desc: "Track order status", icon: <ShoppingCart className="w-5 h-5" />, color: "bg-yellow-50 text-yellow-600", path: "/associate/orders" }
    ];

    const performance = data?.performance || [];
    const hasPerformance = performance.some(p => p.deals || p.quotes || p.orders);
    const recentActivity = data?.recentActivity || [];

    const trendClass = { up: 'text-green-500', down: 'text-red-500', flat: 'text-slate-400' };
    const trendIcon = {
        up: <ArrowUpRight className="w-4 h-4" />,
        down: <ArrowDownRight className="w-4 h-4" />,
        flat: <Minus className="w-4 h-4" />
    };

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Welcome back, {user.username}!</h1>
                <p className="text-slate-500 mt-1">Here's what's happening with your business today.</p>
            </div>

            {/* Explore Services CTA */}
            <div className="bg-gradient-to-r from-yellow-50 to-white border border-yellow-200 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">
                        Discover Services to Grow Your Business 🚀
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Explore available services and find the best solutions for your clients.
                    </p>
                </div>

                <button
                    onClick={() => navigate("/associate/explore-services")}
                    className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                    Explore Services
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 flex items-center justify-between">
                    <span className="text-sm font-medium">{error}</span>
                    <button onClick={fetchDashboard} className="flex items-center gap-1 text-sm font-bold hover:underline">
                        <RefreshCw className="w-4 h-4" /> Retry
                    </button>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => navigate(stat.path)}
                        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                                <h3 className="text-3xl font-bold text-slate-900 mt-1">
                                    {stat.value ?? (loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-300 my-1" /> : '—')}
                                </h3>
                                {s && (
                                    <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${trendClass[stat.trend]}`}>
                                        {trendIcon[stat.trend]}
                                        {stat.change}
                                    </div>
                                )}
                            </div>
                            <div className={`p-4 rounded-xl ${stat.color} group-hover:scale-110 transition-transform`}>
                                {stat.icon}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Quick Actions */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold text-slate-900">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {quickActions.map((action, idx) => (
                            <button
                                key={idx}
                                onClick={() => navigate(action.path)}
                                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-yellow-400 hover:shadow-md transition-all text-left flex flex-col gap-4 group"
                            >
                                <div className={`p-3 rounded-xl w-fit ${action.color} group-hover:scale-110 transition-transform`}>
                                    {action.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{action.title}</h3>
                                    <p className="text-xs text-slate-500 mt-1">{action.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Performance Overview */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-slate-900">Performance Overview</h2>
                            <select
                                value={range}
                                onChange={(e) => setRange(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-sm font-medium px-4 py-2 rounded-xl focus:outline-none"
                            >
                                <option value="7d">Last 7 days</option>
                                <option value="30d">Last 30 days</option>
                                <option value="year">Last 12 months</option>
                            </select>
                        </div>
                        <div className="h-64 relative">
                            {loading ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
                                </div>
                            ) : !hasPerformance ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                    <Inbox className="w-8 h-8 mb-2" />
                                    <p className="text-sm font-medium">No deals, quotes or orders in this period</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={performance} barGap={2}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                        <Bar dataKey="deals" name="Deals" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={16} />
                                        <Bar dataKey="quotes" name="Quotes" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={16} />
                                        <Bar dataKey="orders" name="Orders" fill="#facc15" radius={[4, 4, 0, 0]} maxBarSize={16} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        {loading && !data ? (
                            <div className="p-10 flex justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
                            </div>
                        ) : recentActivity.length === 0 ? (
                            <div className="p-10 flex flex-col items-center text-slate-400">
                                <Inbox className="w-8 h-8 mb-2" />
                                <p className="text-sm font-medium">No activity yet</p>
                            </div>
                        ) : (
                            recentActivity.map((activity, idx) => {
                                const meta = activityMeta[activity.type];
                                return (
                                    <div
                                        key={`${activity.type}-${activity.refId}`}
                                        onClick={() => navigate(meta.path(activity))}
                                        className={`p-6 flex gap-4 hover:bg-slate-50 transition-all cursor-pointer ${idx !== recentActivity.length - 1 ? 'border-b border-slate-100' : ''}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${meta.color}`}>
                                            {meta.icon}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{meta.title(activity)}</p>
                                            <p className="text-xs text-slate-500 mt-1">{timeAgo(activity.at)}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssociateDashboard;

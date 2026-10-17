import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Users,
    Handshake,
    FileText,
    ShoppingCart,
    Briefcase,
    User,
    LogOut,
    Search,
    Bell,
    Receipt,
    ChevronRight,
    ChevronLeft,
    HelpCircle,
    Building2,
    ArrowLeft
} from 'lucide-react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { getSecureItem } from '../utils/secureStorage';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AssociateLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const user = getSecureItem("partnerUser") || { username: "Associate" };

    // Detail pages (/associate/<section>/:id) render their own "Back to ..." button,
    // so the header one is only for top-level pages other than the dashboard
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const showHeaderBack = pathSegments.length === 2 && location.pathname !== '/associate/dashboard';

    const handleBack = () => {
        // location.key is 'default' when this is the first entry (e.g. opened in a new tab)
        if (location.key !== 'default') navigate(-1);
        else navigate('/associate/dashboard');
    };

    const handleLogoutClick = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        // Remove partner-specific token and user data
        localStorage.removeItem("partnerToken");
        localStorage.removeItem("partnerUser");
        navigate("/");
    };

    const sidebarItems = [
        { id: 'dashboard', path: '/associate/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
        // { id: 'leads', path: '/associate/leads', icon: <Users className="w-5 h-5" />, label: 'Leads' },
        { id: 'deals', path: '/associate/deals', icon: <Handshake className="w-5 h-5" />, label: 'Deals' },
        { id: 'quotes', path: '/associate/quotes', icon: <FileText className="w-5 h-5" />, label: 'Quotes' },
        { id: 'orders', path: '/associate/orders', icon: <ShoppingCart className="w-5 h-5" />, label: 'Orders' },
        { id: 'services', path: '/associate/services', icon: <Briefcase className="w-5 h-5" />, label: 'Services' },
        { id: 'customers', path: '/associate/customers', icon: <Users className="w-5 h-5" />, label: 'Customers' },
        { id: 'companies', path: '/associate/companies', icon: <Building2 className="w-5 h-5" />, label: 'Companies' },
        { id: 'receipts', path: '/associate/receipts', icon: <Receipt className="w-5 h-5" />, label: 'Receipts' },
        { id: 'explore-services', path: '/associate/explore-services', icon: <FileText className="w-5 h-5" />, label: 'Explore' },
        { id: 'referrals', path: '/associate/referrals', icon: <Gift className="w-5 h-5" />, label: 'Refer & Earn' },
        // { id: 'invoices', path: '/associate/invoices', icon: <FileSpreadsheet className="w-5 h-5" />, label: 'Invoices' },
    ];

    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };





    const getPageTitle = () => {
        if (location.pathname.includes('dashboard')) return 'Dashboard';
        if (location.pathname.includes('profile')) return 'Profile';
        const item = sidebarItems.find(item =>
            location.pathname === item.path || location.pathname.startsWith(item.path + '/')
        );
        return item ? item.label : 'Dashboard';
    };

    return (
        <div className="flex h-screen bg-[#f8fafc]">
            <ToastContainer position="top-right" autoClose={3000} />
            {/* Sidebar */}
            <motion.aside
                animate={{ width: isCollapsed ? 80 : 256 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="bg-[#111111] text-white flex flex-col relative z-20 shadow-xl"
            >
                {/* Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-10 w-6 h-6 bg-white rounded-full flex items-center justify-center text-slate-900 shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors z-30"
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>

                <div className={`p-6 flex flex-col items-center gap-4 overflow-hidden`}>
                    <div className="flex items-center gap-3 w-full justify-start">
                        <div className="min-w-[40px] w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center font-bold text-black text-xl italic flex-shrink-0">B</div>
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-xl font-bold tracking-tight whitespace-nowrap"
                            >
                                Bizpole
                            </motion.span>
                        )}
                    </div>
                    <div className="w-full border-t border-white/10" />
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto no-scrollbar">
                    {sidebarItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            title={isCollapsed ? item.label : ""}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isCollapsed ? 'justify-center' : ''} ${isActive(item.path)
                                ? 'bg-yellow-400/10 text-yellow-400 font-semibold'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <div className="flex-shrink-0">{item.icon}</div>
                            {!isCollapsed && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="whitespace-nowrap"
                                >
                                    {item.label}
                                </motion.span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className={`p-4 border-t border-slate-800 space-y-1 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
                    <button
                        onClick={() => navigate('/associate/profile')}
                        title={isCollapsed ? "Profile" : ""}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isCollapsed ? 'justify-center' : ''} ${isActive('/associate/profile')
                            ? 'bg-yellow-400/10 text-yellow-400 font-semibold'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <User className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="whitespace-nowrap"
                            >
                                Profile
                            </motion.span>
                        )}
                    </button>
                    <button
                        title={isCollapsed ? "Help" : ""}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-400 hover:bg-white/5 hover:text-white ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <HelpCircle className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="whitespace-nowrap"
                            >
                                Help
                            </motion.span>
                        )}
                    </button>
                    <button
                        onClick={handleLogoutClick}
                        title={isCollapsed ? "Logout" : ""}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-all ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="whitespace-nowrap"
                            >
                                Logout
                            </motion.span>
                        )}
                    </button>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-4 flex-1 max-w-xl">
                        {showHeaderBack && (
                            <button
                                onClick={handleBack}
                                title="Back"
                                aria-label="Back"
                                className="w-10 h-10 flex items-center justify-center shrink-0 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-full bg-white shadow-sm hover:shadow transition-all"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        {location.pathname !== '/associate/profile' && location.pathname !== '/associate/dashboard' && <div className="relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder={`Search ${getPageTitle().toLowerCase()}...`}
                                className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400/20 transition-all"
                            />
                        </div>}
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all relative">
                            <Bell className="w-6 h-6" />
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/associate/profile')}
                            title="View profile"
                            className="flex items-center gap-3 pl-4 border-l border-slate-200 rounded-r-xl py-1 pr-1 hover:opacity-80 transition-opacity cursor-pointer"
                        >
                            <div className="text-right">
                                <p className="text-sm font-bold text-slate-900">{user.username}</p>
                                <p className="text-xs text-slate-500 capitalize">{user.type || 'Associate'}</p>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center font-bold text-black border-2 border-white shadow-sm">
                                {user.username?.charAt(0)}
                            </div>
                        </button>
                    </div>
                </header>

                <div className="p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Logout Confirmation Modal */}
            <AnimatePresence>
                {showLogoutModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLogoutModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
                                    <LogOut className="w-8 h-8 text-red-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Ready to leave?</h3>
                                <p className="text-slate-500 mb-8">Are you sure you want to logout? You'll need to sign back in to access your dashboard.</p>

                                <div className="flex flex-col w-full gap-3">
                                    <button
                                        onClick={confirmLogout}
                                        className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/25 active:scale-[0.98]"
                                    >
                                        Yes, logout
                                    </button>
                                    <button
                                        onClick={() => setShowLogoutModal(false)}
                                        className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all active:scale-[0.98]"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AssociateLayout;

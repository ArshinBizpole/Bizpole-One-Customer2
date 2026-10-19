import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  ListChecks,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Box,
  Wrench,
  LifeBuoy,
  Gift,
  SearchCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { SHOW_CUSTOMER_REFER_AND_EARN } from "../utils/featureFlags";

// Phone-width menu: one scrollable row of tabs (Orders' two pages listed
// directly) so the page itself starts right under the header, instead of the
// full sidebar + illustration stacked on top of it.
const MOBILE_TABS = [
  { to: "/dashboard/bizpoleone", end: true, label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/bizpoleone/package", label: "Package Service", icon: Box },
  { to: "/dashboard/bizpoleone/individual", label: "Individual services", icon: Wrench },
  { to: "/dashboard/bizpoleone/tasks", label: "My task", icon: ListChecks },
  { to: "/dashboard/bizpoleone/trademark-search", label: "Trademark Search", icon: SearchCheck },
  { to: "/dashboard/bizpoleone/pricing", label: "Pricing & Plans", icon: CreditCard },
  { to: "/dashboard/bizpoleone/support", label: "Customer supports", icon: LifeBuoy },
  ...(SHOW_CUSTOMER_REFER_AND_EARN ? [{ to: "/dashboard/bizpoleone/referrals", label: "Refer & Earn", icon: Gift }] : []),
];

const BizpoleOneDashboardLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const location = useLocation();

  // Helper: is mobile (kept in step with the window, not read once)
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Helper: is Orders submenu active
  const isOrdersActive =
    location.pathname.startsWith("/dashboard/bizpoleone/package") ||
    location.pathname.startsWith("/dashboard/bizpoleone/individual");

  return (
    <div className="flex flex-col md:flex-row bg-gray-50 h-full min-h-0">
      {/* Phone: scrollable tab row */}
      <nav className="md:hidden bg-white shadow-sm shrink-0">
        <ul className="flex gap-2 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MOBILE_TABS.map(({ to, end, label, icon: Icon }) => (
            <li key={to} className="shrink-0">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${isActive
                    ? "bg-[#FFC42A] text-white shadow-inner"
                    : "text-gray-600 bg-gray-50 hover:bg-gray-100"
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sidebar (tablet / desktop) */}
      <motion.aside
        animate={{ width: isCollapsed ? "80px" : "260px" }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="bg-white hidden md:flex flex-col justify-between shadow-sm relative md:h-full"
      >
        {/* Collapse Button (hide on mobile) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 -translate-y-1/2 bg-white border rounded-full shadow-md p-1 hover:bg-gray-100 transition hidden md:block"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        {/* Sidebar Top — scrolls on its own if the menu is taller than the
            screen (kept off the aside so the collapse button isn't clipped) */}
        <div className="p-4 flex-1 min-h-0 overflow-y-auto">
          <nav>
            <ul className="space-y-2">
              {/* Dashboard */}
              <li>
                <NavLink
                  to="/dashboard/bizpoleone"
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition-all ${isActive
                      ? "bg-[#FFC42A] text-white shadow-inner"
                      : "text-gray-600 hover:bg-gray-50"
                    }`
                  }
                >
                  <LayoutDashboard size={20} />
                  {!isCollapsed && <span>Dashboard</span>}
                </NavLink>
              </li>

              {/* Orders with dropdown (always show dropdown on mobile) */}
              <li>
                <button
                  onClick={() => setOrdersOpen((prev) => !prev)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg font-medium w-full transition-all
                    ${isOrdersActive ? "bg-[#FFC42A] text-white shadow-inner" : "text-gray-600 hover:bg-gray-50"}
                  `}
                  aria-expanded={ordersOpen}
                >
                  <ShoppingBag size={20} />
                  {/* Always show label and chevron on mobile, or when expanded */}
                  {(!isCollapsed || isMobile) && (
                    <>
                      <span>Orders</span>
                      <ChevronDown
                        size={16}
                        className={`ml-auto transform transition-transform ${ordersOpen ? "rotate-180" : ""}`}
                      />
                    </>
                  )}
                </button>

                {/* Submenu: show if expanded, or if collapsed and open (on any device) */}
                {ordersOpen && (
                  <ul
                    className={`mt-1 space-y-1 text-sm ${isCollapsed ? "ml-2" : "ml-10"
                      }`}
                  >
                    <li>
                      <NavLink
                        to="/dashboard/bizpoleone/package"
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-2 py-2 rounded transition-all ${isActive
                            ? "bg-[#FFE9A7] text-yellow-700 font-semibold shadow"
                            : "text-gray-500 hover:bg-[#FFF5D1] hover:text-yellow-700"
                          }`
                        }
                        onClick={() => isMobile && setIsCollapsed(true)}
                      >
                        <Box size={18} />
                        {!isCollapsed && <span>Package Service</span>}
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/dashboard/bizpoleone/individual"
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-2 py-2 rounded transition-all ${isActive
                            ? "bg-[#FFE9A7] text-yellow-700 font-semibold shadow"
                            : "text-gray-500 hover:bg-[#FFF5D1] hover:text-yellow-700"
                          }`
                        }
                        onClick={() => isMobile && setIsCollapsed(true)}
                      >
                        <Wrench size={18} />
                        {!isCollapsed && <span>Individual services</span>}
                      </NavLink>
                    </li>
                  </ul>
                )}
              </li>

              {/* My Task */}
              <li>
                <NavLink
                  to="/dashboard/bizpoleone/tasks"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition-all ${isActive
                      ? "bg-[#FFC42A] text-white shadow-inner"
                      : "text-gray-600 hover:bg-gray-50"
                    }`
                  }
                >
                  <ListChecks size={20} />
                  {!isCollapsed && <span>My task</span>}
                </NavLink>
              </li>

              {/* Chat */}
              {/* <li>
                <NavLink
                  to="/dashboard/bizpoleone/chat"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition-all ${
                      isActive
                        ? "bg-[#FFC42A] text-white shadow-inner"
                        : "text-gray-600 hover:bg-gray-50"
                    }`
                  }
                >
                  <MessageCircle size={20} />
                  {!isCollapsed && <span>Chat</span>}
                </NavLink>
              </li> */}

              {/* Trademark Search — same page as the website's /trademark-search,
                  with the customer's search history and report downloads */}
              <li>
                <NavLink
                  to="/dashboard/bizpoleone/trademark-search"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition-all ${isActive
                      ? "bg-[#FFC42A] text-white shadow-inner"
                      : "text-gray-600 hover:bg-gray-50"
                    }`
                  }
                >
                  <SearchCheck size={20} />
                  {!isCollapsed && <span>Trademark Search</span>}
                </NavLink>
              </li>

              {/* Pricing & Plans */}
              <li>
                <NavLink
                  to="/dashboard/bizpoleone/pricing"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition-all ${isActive
                      ? "bg-[#FFC42A] text-white shadow-inner"
                      : "text-gray-600 hover:bg-gray-50"
                    }`
                  }
                >
                  <CreditCard size={20} />
                  {!isCollapsed && <span>Pricing & Plans</span>}
                </NavLink>
              </li>

              {/* Customer supports */}
              <li>
                <NavLink
                  to="/dashboard/bizpoleone/support"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition-all ${isActive
                      ? "bg-[#FFC42A] text-white shadow-inner"
                      : "text-gray-600 hover:bg-gray-50"
                    }`
                  }
                >
                  <LifeBuoy size={20} />
                  {!isCollapsed && <span>Customer supports</span>}
                </NavLink>
              </li>

              {/* Refer & Earn */}
              {SHOW_CUSTOMER_REFER_AND_EARN && (
              <li>
                <NavLink
                  to="/dashboard/bizpoleone/referrals"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition-all ${isActive
                      ? "bg-[#FFC42A] text-white shadow-inner"
                      : "text-gray-600 hover:bg-gray-50"
                    }`
                  }
                >
                  <Gift size={20} />
                  {!isCollapsed && <span>Refer &amp; Earn</span>}
                </NavLink>
              </li>
              )}
            </ul>
          </nav>
        </div>

        {/* Sidebar Bottom Section */}
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, type: "spring" }}
            className="p-4 space-y-4"
          >
            {/* Upgrade Card */}
            {/* <div className="bg-[#FFC42A] rounded-2xl text-center p-4 text-white font-medium shadow-md">
              <div className="mb-3 flex justify-center">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <span className="text-[#FFC42A] font-bold text-lg">⬆</span>
                </div>
              </div>
              <p className="text-sm">Upgrade to PRO</p>
              <p className="text-xs mt-1 opacity-90">
                to get access to all features!
                <br />
                Connect with Venus World!
              </p>
            </div> */}

            {/* Custom Sidebar Image */}
            <img
              src="/Images/sidbarimg.jpg"
              alt="Sidebar Illustration"
              className="rounded-2xl w-full object-cover"
            />
          </motion.div>
        )}
      </motion.aside>

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex-1 min-h-0 p-3 sm:p-4 md:p-6 overflow-y-auto"
      >
        <Outlet />
      </motion.main>
    </div>
  );
};

export default BizpoleOneDashboardLayout;

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
  RotateCcw,
  LifeBuoy,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const BizpoleOneDashboardLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const location = useLocation();

  // Helper: is mobile
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // Helper: is Orders submenu active
  const isOrdersActive =
    location.pathname.startsWith("/dashboard/bizpoleone/package") ||
    location.pathname.startsWith("/dashboard/bizpoleone/individual");

  return (
    <div className="flex flex-col md:flex-row bg-gray-50 max-h-[100vh] min-h-[89]">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: isCollapsed ? "80px" : "260px" }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="bg-white flex flex-col justify-between shadow-sm relative min-h-[60px] md:min-h-screen w-full md:w-auto"
      >
        {/* Collapse Button (hide on mobile) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 -translate-y-1/2 bg-white border rounded-full shadow-md p-1 hover:bg-gray-100 transition hidden md:block"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        {/* Sidebar Top */}
        <div className="p-4 flex-1">
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

              {/* Refunds */}
              <li>
                <NavLink
                  to="/dashboard/bizpoleone/refunds"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition-all ${isActive
                      ? "bg-[#FFC42A] text-white shadow-inner"
                      : "text-gray-600 hover:bg-gray-50"
                    }`
                  }
                >
                  <RotateCcw size={20} />
                  {!isCollapsed && <span>Refunds</span>}
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
        className="flex-1 p-6 overflow-y-auto"
      >
        <Outlet />
      </motion.main>
    </div>
  );
};

export default BizpoleOneDashboardLayout;

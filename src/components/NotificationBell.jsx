import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CreditCard,
  XCircle,
  ShoppingBag,
  RefreshCw,
  AlertTriangle,
  FileDown,
  Receipt,
  LifeBuoy,
  PhoneCall,
} from "lucide-react";
import useCustomerNotifications, {
  markNotificationRead,
  markAllNotificationsRead,
  refreshCustomerNotifications,
} from "../hooks/useCustomerNotifications";

const TYPE_ICON = {
  payment: { icon: CreditCard, cls: "bg-green-50 text-green-600" },
  payment_failed: { icon: XCircle, cls: "bg-red-50 text-red-600" },
  order: { icon: ShoppingBag, cls: "bg-amber-50 text-amber-600" },
  order_status: { icon: RefreshCw, cls: "bg-blue-50 text-blue-600" },
  action_required: { icon: AlertTriangle, cls: "bg-orange-50 text-orange-600" },
  deliverable: { icon: FileDown, cls: "bg-purple-50 text-purple-600" },
  invoice: { icon: Receipt, cls: "bg-amber-50 text-amber-600" },
  ticket: { icon: LifeBuoy, cls: "bg-sky-50 text-sky-600" },
  callback: { icon: PhoneCall, cls: "bg-green-50 text-green-600" },
};

const timeAgo = (value) => {
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

/**
 * Customer notification bell + dropdown.
 * variant="header"  — round icon button used in the top header (DashboardLayout)
 * variant="compact" — bordered square button used next to Export (HeaderStats)
 */
const NotificationBell = ({ variant = "header" }) => {
  const { items, unread, loading } = useCustomerNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) refreshCustomerNotifications();
    setOpen((o) => !o);
  };

  const onItemClick = (n) => {
    markNotificationRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const badge = unread > 99 ? "99+" : String(unread);

  const buttonCls =
    variant === "compact"
      ? "relative flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 text-gray-700 shadow-sm transition hover:bg-gray-50"
      : "relative p-2 rounded-full hover:bg-gray-100 cursor-pointer";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className={buttonCls}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
      >
        <Bell
          size={variant === "compact" ? 16 : 22}
          className={variant === "compact" ? "" : "text-gray-600"}
        />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-[18px] text-center">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(92vw,360px)] bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">
              Notifications{unread > 0 ? ` (${unread})` : ""}
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="text-xs font-medium text-amber-600 hover:text-amber-700"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Loading…</p>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">You're all caught up</p>
                <p className="text-xs text-gray-400 mt-1">
                  Updates on payments, orders, documents and tickets will appear here.
                </p>
              </div>
            ) : (
              items.map((n) => {
                const cfg = TYPE_ICON[n.type] || { icon: Bell, cls: "bg-gray-50 text-gray-500" };
                const Icon = cfg.icon;
                const isUnread = !Number(n.isRead);
                return (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => onItemClick(n)}
                    className={`w-full text-left flex gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition ${
                      isUnread ? "bg-amber-50/40" : ""
                    }`}
                  >
                    <span className={`flex-none w-8 h-8 rounded-lg flex items-center justify-center ${cfg.cls}`}>
                      <Icon size={15} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-start justify-between gap-2">
                        <span className={`text-sm ${isUnread ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                          {n.title}
                        </span>
                        <span className="flex-none text-[11px] text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</span>
                      </span>
                      {n.message && (
                        <span className="block text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</span>
                      )}
                    </span>
                    {isUnread && <span className="flex-none w-2 h-2 mt-2 rounded-full bg-amber-500" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

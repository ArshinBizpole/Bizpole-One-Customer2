import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  MessagesSquare,
  MessageCircle,
  Mail,
  Phone,
  PhoneMissed,
  CalendarCheck,
  PhoneCall,
  LifeBuoy,
  Wrench,
  Loader2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getCustomerCommunications } from "../api/CustomerCommunicationApi";
import { ProfileCompanyContext } from "./ProfileLayout";

const PAGE_SIZE = 10;

const TYPE_OPTIONS = [
  { key: "", label: "All communications" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Email" },
  { key: "call", label: "Calls" },
  { key: "followup", label: "Follow-ups" },
  { key: "callback", label: "Call-back requests" },
  { key: "ticket", label: "Support tickets" },
  { key: "service", label: "Service updates" },
];

const TYPE_STYLE = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle, tint: "bg-green-50 text-green-600" },
  email: { label: "Email", icon: Mail, tint: "bg-blue-50 text-blue-600" },
  call: { label: "Call", icon: Phone, tint: "bg-yellow-50 text-yellow-600" },
  followup: { label: "Follow-up", icon: CalendarCheck, tint: "bg-purple-50 text-purple-600" },
  callback: { label: "Call-back", icon: PhoneCall, tint: "bg-orange-50 text-orange-600" },
  ticket: { label: "Support ticket", icon: LifeBuoy, tint: "bg-red-50 text-red-500" },
  service: { label: "Service update", icon: Wrench, tint: "bg-teal-50 text-teal-600" },
};

const STATUS_STYLE = {
  Connected: "bg-green-50 text-green-700",
  Completed: "bg-green-50 text-green-700",
  Done: "bg-green-50 text-green-700",
  Resolved: "bg-green-50 text-green-700",
  Closed: "bg-gray-100 text-gray-600",
  Cancelled: "bg-gray-100 text-gray-600",
  "Not reachable": "bg-red-50 text-red-600",
  Missed: "bg-red-50 text-red-600",
  "Not answered": "bg-red-50 text-red-600",
  Sent: "bg-blue-50 text-blue-700",
  Received: "bg-green-50 text-green-700",
  Shared: "bg-teal-50 text-teal-700",
};

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const formatTime = (value) =>
  new Date(value).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

const formatDateTime = (value) => `${formatDate(value)}, ${formatTime(value)}`;

const formatDuration = (seconds) => {
  const s = Number(seconds) || 0;
  if (!s) return "";
  const m = Math.floor(s / 60);
  return m ? `${m} min ${s % 60} sec` : `${s} sec`;
};

// One-line summary for the Details column; the full message text sits under it.
const detailHeading = (item) => {
  switch (item.type) {
    case "call":
      return [item.title, formatDuration(item.durationSeconds)].filter(Boolean).join(", ");
    case "callback":
      return item.callbackAt ? `Call back requested for ${formatDateTime(item.callbackAt)}` : item.title;
    case "followup":
    case "ticket":
    case "service":
      return item.title;
    default:
      // WhatsApp / email: the text is the detail; a template email keeps its name.
      return item.text ? (item.type === "email" && item.from === "Bizpole" ? item.title : "") : item.title;
  }
};

const CommunicationRow = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const missed = item.type === "call" && item.title === "Missed call";
  const { label, icon: Icon, tint } = TYPE_STYLE[item.type] || TYPE_STYLE.service;
  const ShownIcon = missed ? PhoneMissed : Icon;
  const heading = detailHeading(item);
  const longText = (item.text || "").length > 160;

  return (
    <tr className="align-top hover:bg-yellow-50/40">
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-sm text-gray-800">{formatDate(item.at)}</p>
        <p className="text-xs text-gray-400">{formatTime(item.at)}</p>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="inline-flex items-center gap-2 text-sm text-gray-800">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center ${tint}`}>
            <ShownIcon size={14} />
          </span>
          {label}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-sm text-gray-800">{item.from}</p>
        {item.staffName && <p className="text-xs text-gray-400">{item.staffName}</p>}
      </td>
      <td className="px-4 py-3 min-w-[260px] max-w-md">
        {heading && <p className="text-sm font-medium text-gray-800">{heading}</p>}
        {item.text && (
          <>
            <p className={`text-sm text-gray-600 whitespace-pre-line break-words ${!expanded && longText ? "line-clamp-2" : ""}`}>
              {item.text}
            </p>
            {longText && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-xs font-medium text-yellow-600 hover:text-yellow-700"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {item.status ? (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[item.status] || "bg-yellow-50 text-yellow-700"}`}>
            {item.status}
          </span>
        ) : (
          <span className="text-sm text-gray-300">—</span>
        )}
      </td>
    </tr>
  );
};

const ProfileCommunications = () => {
  const { selectedCompanyId, companiesReady } = useContext(ProfileCompanyContext);
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Drops responses from an older type/company/page once a newer request started.
  const requestId = useRef(0);

  const load = useCallback(
    async (pageNo) => {
      const id = ++requestId.current;
      setLoading(true);
      setError("");
      try {
        const res = await getCustomerCommunications({
          companyId: selectedCompanyId,
          type,
          offset: (pageNo - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
        });
        if (id !== requestId.current) return;
        setItems(res.items);
        setHasMore(res.hasMore);
      } catch (err) {
        if (id !== requestId.current) return;
        console.error("Failed to load communications:", err);
        setError("Couldn't load your communication history. Please try again.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [selectedCompanyId, type],
  );

  // Back to page 1 whenever the type or company changes.
  useEffect(() => {
    setPage(1);
  }, [selectedCompanyId, type]);

  useEffect(() => {
    if (!companiesReady) return;
    load(page);
  }, [companiesReady, load, page]);

  const firstRow = (page - 1) * PAGE_SIZE + 1;

  return (
    <div className=" mx-auto mt-8">
      <div className="mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Communications</h1>
      </div>
      <motion.div
        className="bg-white rounded-2xl shadow-sm mx-auto p-8 border border-yellow-200 max-w-5xl"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MessagesSquare className="text-yellow-500" size={20} />
              <h2 className="text-lg font-semibold text-gray-900">Communication History</h2>
            </div>
            <p className="text-sm text-gray-500">
              Every WhatsApp message, email, call, follow-up and request between you and Bizpole.
            </p>
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="border border-yellow-300 bg-white rounded-lg px-3.5 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
          >
            {TYPE_OPTIONS.map(({ key, label }) => (
              <option key={key || "all"} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="flex items-center gap-2 justify-center text-sm font-medium text-red-600 mb-4">
            <XCircle size={18} />
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="text-center py-12">
            <MessagesSquare className="mx-auto text-gray-300" size={40} />
            <p className="text-sm text-gray-500 mt-3">
              {type ? `No ${TYPE_OPTIONS.find((o) => o.key === type)?.label.toLowerCase()} yet.` : "No communication yet."}
            </p>
          </div>
        )}

        {items.length > 0 && (
          <div className={`overflow-x-auto border border-gray-200 rounded-xl transition-opacity ${loading ? "opacity-50" : ""}`}>
            <table className="min-w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Date &amp; time</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <CommunicationRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {loading && items.length === 0 && (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-yellow-500" size={24} />
          </div>
        )}

        {items.length > 0 && (page > 1 || hasMore) && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <p className="text-sm text-gray-500">
              Showing {firstRow}–{firstRow + items.length - 1}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={loading || page === 1}
                className="flex items-center gap-1 border border-gray-300 hover:bg-yellow-50 text-gray-700 font-medium px-3 py-2 rounded-lg transition text-sm disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <span className="px-3 py-2 text-sm font-semibold bg-yellow-400 text-black rounded-lg">{page}</span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={loading || !hasMore}
                className="flex items-center gap-1 border border-gray-300 hover:bg-yellow-50 text-gray-700 font-medium px-3 py-2 rounded-lg transition text-sm disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ProfileCommunications;

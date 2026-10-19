import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyCallbacks } from "../../api/CalendarApi";

const KIND = {
  compliance: { bar: "bg-amber-400", label: "Compliance due" },
  action: { bar: "bg-fuchsia-400", label: "Needed from you" },
  callback: { bar: "bg-sky-400", label: "Call from Bizpole" },
};

const DONE_CALLBACK = new Set(["completed", "done", "closed", "cancelled"]);

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// "Today | 5:00 PM", "Tomorrow", "24 Oct 2026 | 11:30 AM"
const whenLabel = (date, hasTime) => {
  const days = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);
  const day = days === 0 ? "Today" : days === 1 ? "Tomorrow"
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return hasTime ? `${day} | ${date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : day;
};

// Time left, shown as a chip: "3h", "2d", "Now"
const leftLabel = (date, hasTime) => {
  const end = hasTime ? date : new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59);
  const ms = end - new Date();
  if (ms <= 0) return "Now";
  const h = Math.floor(ms / 3600000);
  return h < 24 ? `${Math.max(1, h)}h` : `${Math.ceil(h / 24)}d`;
};

const UpcomingEvents = ({ events, loading }) => {
  const [callbacks, setCallbacks] = useState([]);

  // Call-backs belong to the signed-in customer (not a company) — customer sessions only.
  useEffect(() => {
    if (!localStorage.getItem("token") || localStorage.getItem("partnerToken")) return;
    let cancelled = false;
    getMyCallbacks().then((rows) => {
      if (cancelled) return;
      const now = new Date();
      setCallbacks(
        rows
          .filter((c) => !DONE_CALLBACK.has(String(c.status || "").toLowerCase()))
          .map((c) => {
            const date = new Date(`${c.followUpDate}T${c.followUpTime || "23:59"}`);
            return { id: `callback-${c.source}-${c.id}`, kind: "callback", title: c.remark || "Call-back", date, hasTime: !!c.followUpTime };
          })
          .filter((c) => c.date >= now)
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = [
    ...(events || []).map((e) => ({ ...e, date: new Date(e.date), hasTime: false })),
    ...callbacks,
  ]
    .sort((a, b) => a.date - b.date)
    .slice(0, 5);

  return (
    <div className="h-full rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Upcoming Events</h3>
        <Link to="/profile/calendar" className="text-sm font-medium text-amber-500 hover:underline">
          View all
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 rounded bg-gray-50" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">Nothing scheduled.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((e) => {
            const kind = KIND[e.kind] || KIND.action;
            return (
              <li key={e.id} className="flex gap-3">
                <span className={`w-[3px] shrink-0 rounded-full ${kind.bar}`} />
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{kind.label}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-gray-800">{e.title}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400">{whenLabel(e.date, e.hasTime)}</span>
                    <span className="rounded-md bg-slate-50 px-2 py-1 text-[11px] font-medium text-gray-600">
                      {leftLabel(e.date, e.hasTime)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default UpcomingEvents;

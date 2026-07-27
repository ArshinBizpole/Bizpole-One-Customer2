import { useEffect, useState } from "react";
import { Shield, Settings, Pin, Calendar, Search, Download, Bell } from "lucide-react";
import useSelectedCompany from "../hooks/useSelectedCompany";
import { getDashboardStats } from "../api/DashboardApi";

const CARD_META = {
  complianceScore: { icon: Shield, label: "Compliance Score", barColor: "bg-yellow-500" },
  activeServices: { icon: Settings, label: "Active Services", barColor: "bg-yellow-500" },
  pendingActions: { icon: Pin, label: "Pending Actions", barColor: "bg-red-500" },
  nextDeadline: { icon: Calendar, label: "Next Deadline", barColor: "bg-amber-500" },
};

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "";

const buildStats = (data) => {
  if (!data) return [];
  const { complianceScore, activeServices, pendingActions, nextDeadline } = data;

  const cards = [
    {
      key: "complianceScore",
      value: String(complianceScore.value),
      suffix: "/100",
      delta:
        complianceScore.deltaPts === null
          ? "—"
          : `${complianceScore.deltaPts >= 0 ? "▲ +" : "▼ "}${Math.abs(complianceScore.deltaPts)} pts`,
      deltaTone: complianceScore.deltaPts === null ? "up" : complianceScore.deltaTone,
      note: "vs last month",
      progress: complianceScore.value,
    },
    {
      key: "activeServices",
      value: String(activeServices.count),
      delta: activeServices.newThisQuarter > 0 ? `▲ ${activeServices.newThisQuarter} new` : "No change",
      deltaTone: "up",
      note: "this quarter",
      progress: Math.min(100, activeServices.count * 10),
    },
    {
      key: "pendingActions",
      value: String(pendingActions.count),
      delta: pendingActions.count > 0 ? "▲ needs you" : "✓ all clear",
      deltaTone: pendingActions.count > 0 ? "down" : "up",
      note: pendingActions.breakdown,
      progress: pendingActions.count > 0 ? Math.min(100, pendingActions.count * 20) : 100,
    },
    {
      key: "nextDeadline",
      value: nextDeadline ? String(nextDeadline.daysLeft) : "—",
      suffix: nextDeadline ? " days" : "",
      delta: nextDeadline ? nextDeadline.label : "No deadlines due",
      deltaTone: nextDeadline && nextDeadline.daysLeft <= 7 ? "down" : "up",
      note: nextDeadline ? formatDate(nextDeadline.date) : "",
      progress: nextDeadline ? Math.max(5, 100 - nextDeadline.daysLeft * 4) : 0,
    },
  ];

  return cards.map((c) => ({ ...c, ...CARD_META[c.key] }));
};

const HeaderStats = () => {
  const { companyId, companyName } = useSelectedCompany();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setStats([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getDashboardStats(companyId).then((res) => {
      if (cancelled) return;
      setStats(res.success ? buildStats(res.data) : []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return (
    <header className="w-full px-2 py-6 sm:px-4 md:px-6">
      {/* Topbar */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            Dashboard
            <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">
              Live
            </span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, <b className="text-gray-700">{companyName || "your business"}</b> — here's
            your business at a glance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <Search className="h-4 w-4 text-yellow-500" />
            <input
              placeholder="Search services, docs…"
              className="w-40 bg-transparent text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none sm:w-56"
            />
          </div>
          <button className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 text-gray-700 shadow-sm transition hover:bg-gray-50">
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-white p-3.5 shadow-md">
                <div className="h-3 w-20 rounded bg-gray-100" />
                <div className="mt-2 h-6 w-14 rounded bg-gray-100" />
                <div className="mt-3 h-1 w-full rounded-full bg-gray-100" />
              </div>
            ))
          : stats.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  className="group bg-white shadow-md rounded-xl p-3.5 hover:shadow-lg transition cursor-pointer"
                >
                  {/* Top row: label + value / icon */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-xl font-bold text-indigo-900">
                        {item.value}
                        {item.suffix && (
                          <small className="text-xs font-medium text-gray-400">
                            {item.suffix}
                          </small>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 transition group-hover:bg-yellow-500">
                      <Icon className="w-4 h-4 text-yellow-500 transition group-hover:text-white" />
                    </div>
                  </div>

                  {/* Delta + note */}
                  <div className="mt-2 flex items-center gap-1.5">
                    <span
                      className={`text-[11px] font-semibold ${
                        item.deltaTone === "up" ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {item.delta}
                    </span>
                    <span className="text-[10px] text-gray-400">{item.note}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-1 w-full rounded-full bg-gray-100 overflow-hidden">
                    <span
                      className={`block h-full rounded-full ${item.barColor}`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
      </div>
    </header>
  );
};

export default HeaderStats;

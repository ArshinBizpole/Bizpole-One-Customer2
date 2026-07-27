import { useEffect, useState } from "react";
import { Shield, AlertTriangle, CalendarDays, TrendingUp, ChevronRight } from "lucide-react";
import useSelectedCompany from "../../hooks/useSelectedCompany";
import { getComplianceHealth } from "../../api/DashboardApi";

const statusStyles = {
  ok: "bg-green-100 text-green-700",
  warn: "bg-amber-100 text-amber-700",
  due: "bg-red-100 text-red-600",
};

const dotColors = {
  green: "bg-green-600",
  amber: "bg-amber-500",
  red: "bg-red-600",
};

const toneFromDot = { green: "ok", amber: "warn", red: "due" };

const alertBarColor = {
  urgent: "bg-red-600",
  warning: "bg-amber-500",
  info: "bg-blue-600",
};

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHead = ({ icon: Icon, title, sub, link }) => (
  <div className="mb-4 flex items-start justify-between gap-2">
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
      </div>
    </div>
    {link && (
      <button className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-yellow-700 hover:underline">
        {link} <ChevronRight className="h-3 w-3" />
      </button>
    )}
  </div>
);

const formatTrendMonth = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short" });
};

const ComplianceHealth = () => {
  const { companyId } = useSelectedCompany();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getComplianceHealth(companyId).then((res) => {
      if (cancelled) return;
      setData(res.success ? res.data : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 animate-pulse">
        <div className="h-64 rounded-2xl bg-white shadow-sm lg:col-span-2" />
        <div className="h-64 rounded-2xl bg-white shadow-sm" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <p className="text-sm text-gray-500">No compliance data available yet for this company.</p>
      </Card>
    );
  }

  const { score, breakdown, alerts, deadlines, trend } = data;
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - score / 100);
  const maxTrendScore = Math.max(1, ...trend.map((t) => t.score));

  return (
    <>
      {/* Row 1: breakdown + risk alerts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHead
            icon={Shield}
            title="Compliance Score Breakdown"
            sub={`Why your score is ${score} — tap any item to fix`}
            link="View all"
          />
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            {/* Gauge */}
            <div className="relative h-[130px] w-[130px] shrink-0">
              <svg viewBox="0 0 120 120" className="h-[130px] w-[130px]">
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#F3F4F6" strokeWidth="14" />
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="#FFC42A"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={offset}
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <b className="text-3xl font-extrabold text-gray-900">{score}</b>
                <small className="text-[11px] text-gray-500">
                  {score >= 80 ? "Good standing" : score >= 50 ? "Needs attention" : "At risk"}
                </small>
              </div>
            </div>
            {/* Breakdown list */}
            <div className="flex-1 self-stretch">
              {breakdown.length === 0 && (
                <p className="text-sm text-gray-400">No compliances generated yet.</p>
              )}
              {breakdown.map((row) => {
                const tone = toneFromDot[row.dot] || "warn";
                return (
                  <div
                    key={row.name}
                    className="flex items-center justify-between border-b border-dashed border-gray-200 py-2 text-sm last:border-0"
                  >
                    <span className="flex items-center text-gray-700">
                      <span
                        className={`mr-2 inline-block h-2 w-2 rounded-full ${dotColors[row.dot] || "bg-gray-400"}`}
                      />
                      {row.name}
                    </span>
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${statusStyles[tone]}`}>
                      {row.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <CardHead icon={AlertTriangle} title="Risk Alerts" />
          <div className="space-y-2.5">
            {alerts.length === 0 && <p className="text-sm text-gray-400">No active risk alerts.</p>}
            {alerts.map((a) => (
              <div key={a.title} className="flex items-start gap-3 rounded-xl border border-gray-200 p-3">
                <span className={`w-1 self-stretch rounded ${alertBarColor[a.severity] || "bg-gray-400"}`} />
                <div className="flex-1">
                  <b className="text-[13px] text-gray-800">{a.title}</b>
                  <p className="mt-0.5 text-xs text-gray-500">{a.body}</p>
                </div>
                <button className="shrink-0 whitespace-nowrap text-[11px] font-bold text-yellow-700 hover:underline">
                  {a.cta} ›
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 2: deadlines + trend */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHead icon={CalendarDays} title="Upcoming Deadlines" link="Open calendar" />
          <div>
            {deadlines.length === 0 && <p className="text-sm text-gray-400">No upcoming deadlines.</p>}
            {deadlines.map((dl) => (
              <div
                key={`${dl.title}-${dl.date}`}
                className="flex items-center gap-3 border-b border-gray-100 py-2.5 last:border-0"
              >
                <div className="w-12 shrink-0 rounded-lg bg-gray-50 py-1.5 text-center">
                  <b className="block text-base leading-none text-gray-900">{dl.day}</b>
                  <small className="text-[10px] uppercase text-gray-500">{dl.month}</small>
                </div>
                <div className="flex-1">
                  <b className="text-[13px] text-gray-800">{dl.title}</b>
                  <p className="text-[11px] text-gray-500">{dl.sub}</p>
                </div>
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${statusStyles[dl.tone]}`}>
                  {dl.status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead icon={TrendingUp} title="Compliance Score Trend" />
          {trend.length === 0 ? (
            <p className="text-sm text-gray-400">Trend builds up over your first few months with Bizpole.</p>
          ) : (
            <>
              <div className="flex h-32 items-end gap-2 pt-2">
                {trend.map((t, i) => (
                  <div key={t.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <div
                      className={`w-full rounded-t-lg ${i === trend.length - 1 ? "bg-yellow-600" : "bg-yellow-400"}`}
                      style={{ height: `${Math.max(4, (t.score / maxTrendScore) * 100)}%` }}
                    />
                    <small className="text-[10px] text-gray-400">{formatTrendMonth(t.month)}</small>
                  </div>
                ))}
              </div>
              {trend.length > 1 && (
                <p className="mt-3 text-[11px] text-gray-400">
                  {trend[trend.length - 1].score >= trend[0].score
                    ? `Up ${trend[trend.length - 1].score - trend[0].score} points since we started tracking — a clear, shareable proof of value.`
                    : "Keep filing on time to grow your score."}
                </p>
              )}
            </>
          )}
        </Card>
      </div>
    </>
  );
};

export default ComplianceHealth;

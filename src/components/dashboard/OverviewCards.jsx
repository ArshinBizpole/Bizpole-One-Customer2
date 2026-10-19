import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock, Package, CircleCheck, TrendingUp, ChevronRight, CalendarDays, ArrowRight,
  ArrowUpRight, ShieldCheck,
} from "lucide-react";

const inr = (n) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;
const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "short", year: "numeric" });
};

const Card = ({ to, icon: Icon, title, children }) => (
  <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md">
    <Link to={to} className="group flex items-start justify-between gap-2 p-4 pb-0">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="text-sm font-medium leading-tight text-gray-700">{title}</span>
      </div>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition group-hover:text-gray-500" />
    </Link>
    {children}
  </div>
);

// Single-series monthly bars, tallest = full height. Each bar shows its value on hover.
const MonthBars = ({ data, unit, color, fadeColor }) => {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const active = hover ?? data.length - 1;
  return (
    <div className="mt-auto px-4 pb-4 pt-4">
      <p className="h-4 text-[11px] text-gray-500">
        {monthLabel(data[active].month)} · <b className="text-gray-700">{data[active].value}</b> {unit}
      </p>
      <div className="mt-1 flex h-16 items-end gap-[3px]" onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <div key={d.month} className="flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)}>
            <div
              className="w-full rounded-t-[4px] transition-colors"
              style={{
                height: `${d.value ? Math.max(6, (d.value / max) * 100) : 4}%`,
                background: d.value ? (i === active ? color : fadeColor) : "#F3F4F6",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// Smooth area line of monthly amounts, with a hover marker per month.
const PaidSparkline = ({ data }) => {
  const [hover, setHover] = useState(null);
  const W = 240;
  const H = 70;
  const max = Math.max(1, ...data.map((d) => d.value));
  const PAD = 8;
  const pts = data.map((d, i) => [PAD + (i / (data.length - 1)) * (W - 2 * PAD), H - 6 - (d.value / max) * (H - 16)]);
  const line = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = pts[i - 1];
    const cx = (px + x) / 2;
    return `${acc} C${cx},${py} ${cx},${y} ${x},${y}`;
  }, "");
  const active = hover ?? data.length - 1;
  const [ax, ay] = pts[active];
  return (
    <div className="mt-auto pt-4">
      <p className="h-4 px-4 text-[11px] text-gray-500">
        Paid in {monthLabel(data[active].month)} · <b className="text-gray-700">{inr(data[active].value)}</b>
      </p>
      <div className="relative mt-1 h-[70px]">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-full w-full" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="paidFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`} fill="url(#paidFill)" />
        <path d={line} fill="none" stroke="#F5B400" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {pts.map(([x], i) => (
          <rect key={i} x={x - W / data.length / 2} y="0" width={W / data.length} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      {/* marker as HTML so the stretched viewBox doesn't squash it */}
      <span
        className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#F5B400] bg-white"
        style={{ left: `${(ax / W) * 100}%`, top: `${(ay / H) * 100}%` }}
      />
      </div>
    </div>
  );
};

const ScoreRing = ({ value }) => {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const v = value ?? 0;
  return (
    <div className="relative mx-auto h-[124px] w-[124px]">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#F3F4F6" strokeWidth="11" />
        {value != null && (
          <circle
            cx="60" cy="60" r={r} fill="none" stroke="#F5A800" strokeWidth="11" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - v / 100)}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <b className="text-2xl font-bold text-gray-900">{value ?? "—"}</b>
        <small className="text-[11px] text-gray-500">Score</small>
      </div>
    </div>
  );
};

const scoreStanding = (v) => {
  if (v == null) return { title: "Not tracked yet", sub: "Add compliances to start", tone: "text-gray-500 bg-gray-50" };
  if (v >= 80) return { title: "On track", sub: "Keep it up", tone: "text-green-700 bg-green-50" };
  if (v >= 50) return { title: "Needs attention", sub: "Keep improving", tone: "text-amber-700 bg-amber-50" };
  return { title: "At risk", sub: "Filings overdue", tone: "text-red-600 bg-red-50" };
};

const SkeletonCard = () => (
  <div className="h-[290px] animate-pulse rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className="h-9 w-32 rounded bg-gray-100" />
    <div className="mt-5 h-7 w-24 rounded bg-gray-100" />
    <div className="mt-16 h-16 w-full rounded bg-gray-50" />
  </div>
);

const OverviewCards = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const { payments, services, tasks, compliance } = data;
  const svcDelta = services.startedLastMonth > 0
    ? Math.round(((services.startedThisMonth - services.startedLastMonth) / services.startedLastMonth) * 100)
    : null;
  const standing = scoreStanding(compliance.value);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* Payment due */}
      <Card to="/dashboard/bizpoleone/billing" icon={Clock} title="Next Payment Due">
        <div className="px-4 pt-4">
          <p className="text-[26px] font-bold leading-none text-gray-900">{inr(payments.outstanding)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <CalendarDays className="h-3.5 w-3.5 text-amber-500" />
              {payments.pendingOrders > 0
                ? `Pending on ${payments.pendingOrders} order${payments.pendingOrders > 1 ? "s" : ""}`
                : "Nothing pending"}
            </span>
            {payments.outstanding > 0 && (
              <Link
                to="/dashboard/bizpoleone/billing"
                className="flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-800 hover:bg-gray-50"
              >
                Pay now <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
        <PaidSparkline data={payments.paidByMonth} />
      </Card>

      {/* Active services */}
      <Card to="/dashboard/bizpoleone/individual" icon={Package} title="Total Services Active">
        <div className="px-4 pt-4">
          <p className="text-[26px] font-bold leading-none text-gray-900">{services.active}</p>
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700">
            <ArrowUpRight className="h-3 w-3" />
            {svcDelta !== null
              ? `${svcDelta >= 0 ? "+" : ""}${svcDelta}% from last month`
              : services.startedThisMonth > 0
                ? `+${services.startedThisMonth} new this month`
                : `${services.total} service${services.total !== 1 ? "s" : ""} in total`}
          </span>
        </div>
        <MonthBars data={services.startedByMonth} unit="started" color="#16A34A" fadeColor="#BBF7D0" />
      </Card>

      {/* Tasks completed */}
      <Card to="/dashboard/bizpoleone/tasks" icon={CircleCheck} title="Tasks Completed">
        <div className="px-4 pt-4">
          <p className="text-[26px] font-bold leading-none text-gray-900">{tasks.completed.toLocaleString("en-IN")}</p>
          <span className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-green-700">
            <CircleCheck className="h-4 w-4 fill-green-600 text-white" />
            {tasks.total > 0 ? `${tasks.completed} of ${tasks.total} tasks done` : "No tasks yet"}
          </span>
        </div>
        <MonthBars data={tasks.completedByMonth} unit="completed" color="#F59E0B" fadeColor="#FDE68A" />
      </Card>

      {/* Compliance score */}
      <Card to="/profile/events" icon={TrendingUp} title="Compliance Score">
        <div className="flex flex-1 flex-col justify-between gap-3 p-4">
          <ScoreRing value={compliance.value} />
          <Link to="/profile/events" className={`flex items-center justify-between rounded-xl px-3 py-2 ${standing.tone}`}>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6" />
              <span>
                <b className="block text-xs">{standing.title}</b>
                <small className="text-[10px] opacity-80">{standing.sub}</small>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 opacity-60" />
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default OverviewCards;

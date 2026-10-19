export const formatINR = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "₹0";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const humanize = (value) =>
  value ? String(value).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

export const STATUS_TONE = {
  // stages
  signed_up: "bg-gray-100 text-gray-700",
  lead: "bg-blue-50 text-blue-700",
  deal: "bg-indigo-50 text-indigo-700",
  order: "bg-green-50 text-green-700",
  // reward / referrer / kyc statuses
  earned: "bg-yellow-50 text-yellow-800",
  withdrawable: "bg-amber-100 text-amber-800",
  approved: "bg-blue-50 text-blue-700",
  in_payout: "bg-indigo-50 text-indigo-700",
  paid: "bg-green-50 text-green-700",
  credited: "bg-green-50 text-green-700",
  reversed: "bg-red-50 text-red-700",
  lapsed: "bg-gray-100 text-gray-500",
  expired: "bg-gray-100 text-gray-500",
  nil: "bg-gray-100 text-gray-500",
  active: "bg-green-50 text-green-700",
  pending: "bg-amber-100 text-amber-800",
  suspended: "bg-red-50 text-red-700",
  rejected: "bg-red-50 text-red-700",
  submitted: "bg-blue-50 text-blue-700",
  verified: "bg-green-50 text-green-700",
  requested: "bg-amber-100 text-amber-800",
  not_submitted: "bg-gray-100 text-gray-600",
};

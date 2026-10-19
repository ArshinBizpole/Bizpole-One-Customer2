import { STATUS_TONE, humanize } from "./format";

// Small presentational building blocks shared by every referral screen.

export const Card = ({ title, icon, action, children, className = "" }) => (
  <div className={`rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm ${className}`}>
    {(title || action) && (
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
              {icon}
            </div>
          )}
          {title && <h3 className="text-sm font-semibold text-gray-800">{title}</h3>}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

export const StatusPill = ({ value }) => (
  <span
    className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${
      STATUS_TONE[value] || "bg-gray-100 text-gray-600"
    }`}
  >
    {humanize(value)}
  </span>
);

export const Stat = ({ label, value, hint, highlight = false }) => (
  <div
    className={`rounded-xl border p-3 ${
      highlight ? "border-yellow-300 bg-yellow-50" : "border-gray-100 bg-gray-50"
    }`}
  >
    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-1 text-lg font-extrabold text-gray-800">{value}</p>
    {hint && <p className="mt-0.5 text-[11px] leading-snug text-gray-500">{hint}</p>}
  </div>
);

export const PrimaryButton = ({ children, className = "", ...props }) => (
  <button
    type="button"
    {...props}
    className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#FFC42A] px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
  >
    {children}
  </button>
);

export const SecondaryButton = ({ children, className = "", ...props }) => (
  <button
    type="button"
    {...props}
    className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
  >
    {children}
  </button>
);

export const InlineMessage = ({ tone = "info", children }) => {
  const tones = {
    info: "border-blue-100 bg-blue-50 text-blue-800",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-100 bg-red-50 text-red-700",
    success: "border-green-100 bg-green-50 text-green-800",
  };
  return <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
};

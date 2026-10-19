import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import useSelectedCompany from "../../hooks/useSelectedCompany";
import axiosInstance from "../../api/axiosInstance";

// The customer's deals (service requests) for the selected company — e.g. the
// ones the WhatsApp assistant creates. Customer sessions only (website token).

const statusLabel = (raw) => {
  const s = String(raw || "").replace(/^Deal\s*-\s*/i, "").trim();
  if (!s) return "Open";
  if (/won|converted|order/i.test(s)) return "Confirmed";
  if (/lost|dropped/i.test(s)) return "Closed";
  return "In progress";
};

const statusStyles = {
  Open: "bg-blue-100 text-blue-700",
  "In progress": "bg-blue-100 text-blue-700",
  Confirmed: "bg-green-100 text-green-700",
  Closed: "bg-gray-200 text-gray-600",
};

const DealsList = () => {
  const { companyId } = useSelectedCompany();
  const [deals, setDeals] = useState(null); // null = loading

  useEffect(() => {
    if (!companyId || !localStorage.getItem("token") || localStorage.getItem("partnerToken")) {
      setDeals([]);
      return;
    }
    let cancelled = false;
    setDeals(null);
    axiosInstance
      .get(`/website/company-deals/${companyId}`)
      .then((res) => {
        if (!cancelled) setDeals(Array.isArray(res.data?.data) ? res.data.data : []);
      })
      .catch(() => {
        if (!cancelled) setDeals([]);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const list = deals || [];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
          <ClipboardList className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Your Requests</h3>
          <p className="text-xs text-gray-500">
            {deals === null ? "Loading…" : `${list.length} request${list.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {deals !== null && list.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">No service requests for this company yet.</p>
      ) : (
        <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
          {list.map((deal) => {
            const status = statusLabel(deal.Status);
            const title = deal.PackageName
              ? `${deal.PackageName}${deal.BillingPeriod ? ` (${deal.BillingPeriod})` : ""}`
              : deal.Services.map((s) => s.name).filter(Boolean).join(", ") || "Service request";
            return (
              <div key={deal.DealID} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {deal.DealCode || `Request #${deal.DealID}`}
                    {" · "}
                    <span className={`rounded px-1.5 py-0.5 font-semibold ${statusStyles[status]}`}>{status}</span>
                    {deal.ExpertName ? <span className="ml-1">· Expert: {String(deal.ExpertName).trim()}</span> : null}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-gray-800">₹{Math.round(deal.Total).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-gray-400">
                    {deal.CreatedAt ? new Date(deal.CreatedAt).toLocaleDateString() : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DealsList;

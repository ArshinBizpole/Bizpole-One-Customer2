import { useContext, useEffect, useState } from "react";
import { FileText, ChevronRight, Plus } from "lucide-react";
import CryptoJS from "crypto-js";
import { useNavigate } from "react-router-dom";
import { DashboardContext } from "../../pages/DashboardLayout";
import useSelectedCompany from "../../hooks/useSelectedCompany";
import QuoteStatusApi from "../../api/QuoteStatusApi";
import axiosInstance from "../../api/axiosInstance";
import { getClientBaseUrl } from "../../utils/clientBaseUrl";

const QUOTE_STATUS_MAP = {
  1: "Quote Created",
  2: "Quote Declined by Client",
  3: "Paid",
  4: "Quote Modification Required",
  5: "Quote Dropped",
  6: "Quote Draft",
  7: "Quote Approved",
  10: "Order Created By Executive",
  11: "Quote Expired",
};

// [pill classes, dot class]
const statusStyles = {
  "Quote Created": ["bg-blue-50 text-blue-700", "bg-blue-500"],
  "Quote Declined by Client": ["bg-red-50 text-red-600", "bg-red-500"],
  Paid: ["bg-green-50 text-green-700", "bg-green-500"],
  "Quote Modification Required": ["bg-amber-50 text-amber-700", "bg-amber-500"],
  "Quote Dropped": ["bg-red-50 text-red-600", "bg-red-500"],
  "Quote Draft": ["bg-amber-50 text-amber-700", "bg-amber-500"],
  "Quote Approved": ["bg-green-50 text-green-700", "bg-green-500"],
  "Order Created By Executive": ["bg-blue-50 text-blue-700", "bg-blue-500"],
  "Quote Expired": ["bg-gray-100 text-gray-600", "bg-gray-400"],
};

const normalizeStatus = (raw) => {
  if (raw === null || raw === undefined || raw === "") return "Quote Draft";
  const value = String(raw);
  if (value === "Converted to Order" || value === "Created-Order") return "Paid";
  return QUOTE_STATUS_MAP[Number(value)] || value;
};

// Quote summaries embedded in the login payload carry no pricing fields at all —
// the real amount only exists on the full quote record's ServiceDetails, fetched per-QuoteID.
const sumServiceDetails = (details) => {
  if (!Array.isArray(details)) return 0;
  return details.reduce((sum, item) => {
    if (item.Total != null) return sum + Number(item.Total || 0);
    const prof = Number(item.ProfessionalFee || 0);
    const vendor = Number(item.VendorFee || 0);
    const govt = Number(item.GovtFee || 0);
    const contractor = Number(item.ContractorFee || 0);
    const gst = Number(item.GstAmount || 0);
    return sum + prof + vendor + govt + contractor + gst;
  }, 0);
};

// "GST Registration", or "GST Registration +2" for a multi-service quote.
const serviceSummary = (details) => {
  const names = (Array.isArray(details) ? details : []).map((d) => d.ItemName || d.ServiceName).filter(Boolean);
  if (names.length === 0) return null;
  return names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0];
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const openQuotePreview = (quoteId) => {
  const secret = import.meta.env.VITE_QUOTE_LINK_SECRET || "q3!9fKs7@pLzXr84$nmYtB!cVZdQ3";
  const encrypted = CryptoJS.AES.encrypt(String(quoteId), secret).toString();
  const url = `${getClientBaseUrl()}/quotes/saved-preview/${encodeURIComponent(encrypted)}`;
  window.open(url, "_blank");
};

const QuotesList = () => {
  const navigate = useNavigate();
  const { quotes } = useContext(DashboardContext) || {};
  const { companyId, companyName } = useSelectedCompany();
  const [quoteStatuses, setQuoteStatuses] = useState({});
  const [quoteDetails, setQuoteDetails] = useState({}); // QuoteID -> { amount, service } | null
  const [detailsLoading, setDetailsLoading] = useState(false);

  const companyQuotes = Array.isArray(quotes)
    ? quotes.filter((q) => String(q.CompanyID) === String(companyId))
    : [];
  const quoteIdsKey = companyQuotes.map((q) => q.QuoteID).filter(Boolean).join(",");

  useEffect(() => {
    if (!quoteIdsKey) {
      setQuoteStatuses({});
      return;
    }
    let cancelled = false;
    QuoteStatusApi.getQuoteStatus(quoteIdsKey.split(",").map(Number))
      .then((res) => {
        if (cancelled) return;
        const map = {};
        (res?.results || []).forEach((s) => {
          map[s.quoteId] = normalizeStatus(s.quotestatus);
        });
        setQuoteStatuses(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [quoteIdsKey]);

  // Login-provided quote summaries have no pricing or service lines — fetch each
  // quote's full ServiceDetails for its actual total and service names.
  useEffect(() => {
    const ids = quoteIdsKey ? quoteIdsKey.split(",").map(Number) : [];
    if (ids.length === 0) {
      setQuoteDetails({});
      return;
    }
    let cancelled = false;
    setDetailsLoading(true);
    Promise.all(
      ids.map((id) =>
        axiosInstance
          .get(`/getQuoteById/${id}`)
          .then((res) => {
            const details = res.data?.data?.ServiceDetails;
            return [id, { amount: sumServiceDetails(details), service: serviceSummary(details) }];
          })
          .catch(() => [id, null])
      )
    ).then((pairs) => {
      if (cancelled) return;
      setQuoteDetails(Object.fromEntries(pairs));
      setDetailsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [quoteIdsKey]);

  const pending = <span className="text-gray-300">…</span>;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Quotes</h3>
            <p className="text-xs text-gray-400">
              {companyQuotes.length} quote{companyQuotes.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/dashboard/bizpoleone/pricing")}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-gray-900 shadow-sm hover:bg-amber-500"
        >
          <Plus className="h-4 w-4" /> New quote
        </button>
      </div>

      {companyQuotes.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">No quotes found for this company yet.</p>
      ) : (
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                <th className="px-6 py-3 font-semibold">Quote ID</th>
                <th className="px-3 py-3 font-semibold">Service</th>
                <th className="px-3 py-3 font-semibold">Company / Client</th>
                <th className="px-3 py-3 font-semibold">Amount</th>
                <th className="px-3 py-3 font-semibold">Valid Till</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {companyQuotes.map((quote, index) => {
                const status = quoteStatuses[quote.QuoteID] || normalizeStatus(quote.QuoteStatus);
                const [pill, dot] = statusStyles[status] || ["bg-gray-100 text-gray-600", "bg-gray-400"];
                const detail = quoteDetails[quote.QuoteID];
                const waiting = detailsLoading && !detail;
                const amount = detail ? detail.amount : sumServiceDetails(quote.ServiceDetails);
                const service = detail?.service || serviceSummary(quote.ServiceDetails) || quote.PackageName || "—";
                return (
                  <tr key={quote.QuoteID || index} className="text-gray-700 hover:bg-gray-50/60">
                    <td className="px-6 py-3.5 text-gray-500">
                      {quote.QuoteCodeId || quote.QuoteCode || `#${quote.QuoteID}`}
                    </td>
                    <td className="px-3 py-3.5 font-semibold text-gray-900">{waiting ? pending : service}</td>
                    <td className="px-3 py-3.5">{companyName || "—"}</td>
                    <td className="px-3 py-3.5 font-semibold text-gray-900">
                      {waiting ? pending : `₹${amount.toLocaleString("en-IN")}`}
                    </td>
                    <td className="px-3 py-3.5">{fmtDate(quote.endDate)}</td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${pill}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => openQuotePreview(quote.QuoteID)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        View <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default QuotesList;

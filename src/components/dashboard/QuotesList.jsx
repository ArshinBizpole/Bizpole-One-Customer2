import { useContext, useEffect, useState } from "react";
import { FileText, ChevronRight, Plus } from "lucide-react";
import CryptoJS from "crypto-js";
import { useNavigate } from "react-router-dom";
import { DashboardContext } from "../../pages/DashboardLayout";
import useSelectedCompany from "../../hooks/useSelectedCompany";
import QuoteStatusApi from "../../api/QuoteStatusApi";
import axiosInstance from "../../api/axiosInstance";

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

const statusStyles = {
  "Quote Created": "bg-blue-100 text-blue-700",
  "Quote Declined by Client": "bg-red-100 text-red-600",
  Paid: "bg-green-100 text-green-700",
  "Quote Modification Required": "bg-amber-100 text-amber-700",
  "Quote Dropped": "bg-red-100 text-red-600",
  "Quote Draft": "bg-amber-100 text-amber-700",
  "Quote Approved": "bg-green-100 text-green-700",
  "Order Created By Executive": "bg-blue-100 text-blue-700",
  "Quote Expired": "bg-gray-200 text-gray-600",
};

const normalizeStatus = (raw) => {
  if (raw === null || raw === undefined || raw === "") return "Quote Draft";
  const value = String(raw);
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

const openQuotePreview = (quoteId) => {
  const secret = import.meta.env.VITE_QUOTE_LINK_SECRET || "q3!9fKs7@pLzXr84$nmYtB!cVZdQ3";
  const encrypted = CryptoJS.AES.encrypt(String(quoteId), secret).toString();
  const url = `${import.meta.env.VITE_CLIENT_BASE_URL}/quotes/saved-preview/${encodeURIComponent(encrypted)}`;
  window.open(url, "_blank");
};

const QuotesList = () => {
  const navigate = useNavigate();
  const { quotes } = useContext(DashboardContext) || {};
  const { companyId } = useSelectedCompany();
  const [quoteStatuses, setQuoteStatuses] = useState({});
  const [quoteAmounts, setQuoteAmounts] = useState({});
  const [amountsLoading, setAmountsLoading] = useState(false);

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

  // Login-provided quote summaries have no pricing data — fetch each quote's
  // full ServiceDetails to compute its actual total amount.
  useEffect(() => {
    const ids = quoteIdsKey ? quoteIdsKey.split(",").map(Number) : [];
    if (ids.length === 0) {
      setQuoteAmounts({});
      return;
    }
    let cancelled = false;
    setAmountsLoading(true);
    Promise.all(
      ids.map((id) =>
        axiosInstance
          .get(`/getQuoteById/${id}`)
          .then((res) => [id, sumServiceDetails(res.data?.data?.ServiceDetails)])
          .catch(() => [id, null])
      )
    ).then((pairs) => {
      if (cancelled) return;
      const map = {};
      pairs.forEach(([id, amount]) => {
        map[id] = amount;
      });
      setQuoteAmounts(map);
      setAmountsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [quoteIdsKey]);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Quotes</h3>
            <p className="text-xs text-gray-500">
              {companyQuotes.length} quote{companyQuotes.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/startbusiness/choose", { state: { navigate: true } })}
          className="flex shrink-0 items-center gap-1 text-xs font-semibold text-yellow-700 hover:underline"
        >
          <Plus className="h-3 w-3" /> New quote
        </button>
      </div>

      {companyQuotes.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          No quotes found for this company yet.
        </p>
      ) : (
        <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
          {companyQuotes.map((quote, index) => {
            const status = quoteStatuses[quote.QuoteID] || normalizeStatus(quote.QuoteStatus);
            return (
              <div
                key={quote.QuoteID || index}
                onClick={() => openQuotePreview(quote.QuoteID)}
                className="flex cursor-pointer items-center justify-between gap-3 py-3 hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {quote.PackageName || quote.QuoteCodeId || `Quote ${index + 1}`}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Status:{" "}
                    <span
                      className={`rounded px-1.5 py-0.5 font-semibold ${statusStyles[status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {status}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">
                      {quoteAmounts[quote.QuoteID] == null
                        ? amountsLoading
                          ? <span className="text-gray-300">…</span>
                          : `₹${sumServiceDetails(quote.ServiceDetails).toLocaleString("en-IN")}`
                        : `₹${quoteAmounts[quote.QuoteID].toLocaleString("en-IN")}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {quote.CreatedDate ? new Date(quote.CreatedDate).toLocaleDateString() : "Recent"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuotesList;

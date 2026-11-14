import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiDownload } from "react-icons/fi";
import { getSharedTrademarkReport } from "../api/TrademarkApi";
import TrademarkReport from "../components/Trademark/TrademarkReport";
import { saveElementAsPdf } from "../utils/elementToPdf";
import { localDate, fileSafe, waitForImages, pdfOptions } from "./TrademarkSearch";

// A customer's saved Trademark Search Report, opened from the customer's
// report email or the CRM (a lead's / deal's Trademark Searches → View report).
// The link's token stands in for a sign-in and is good for that one report only.
export default function TrademarkSharedReport() {
  const [params] = useSearchParams();
  const token = params.get("t") || "";
  const reportRef = useRef(null);
  const [entry, setEntry] = useState(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("This report link is incomplete. Please open it again from your email.");
      return;
    }
    getSharedTrademarkReport(token)
      .then(setEntry)
      .catch((err) => setError(err.response?.data?.message || "Could not load the report. Please try again."));
  }, [token]);

  const download = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      await waitForImages(reportRef.current);
      await saveElementAsPdf(
        reportRef.current,
        `Trademark-Search-Report-${fileSafe(entry.query)}-${localDate(entry.createdAt)}`,
        pdfOptions(entry.reportRef)
      );
    } catch {
      setError("Could not download the report. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-2 sm:px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-2">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Trademark Search Report</h1>
            {entry && (
              <p className="text-sm text-gray-500">
                {entry.query} · {entry.reportRef} · {localDate(entry.createdAt)}
              </p>
            )}
          </div>
          {entry?.results?.length > 0 && (
            <button
              type="button"
              onClick={download}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-500 disabled:opacity-60"
            >
              <FiDownload /> {downloading ? "Preparing PDF…" : "Download PDF"}
            </button>
          )}
        </div>

        {error && <p className="mx-2 mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {!entry && !error && <p className="py-20 text-center text-gray-500">Loading report…</p>}

        {entry && (
          <div className="bg-white rounded-xl shadow-sm p-2 sm:p-4 overflow-x-auto">
            {entry.results?.length ? (
              <TrademarkReport
                ref={reportRef}
                results={entry.results}
                query={entry.query}
                queryType={entry.queryType}
                classes={entry.classNumbers || "All"}
                total={entry.totalCount ?? entry.results.length}
                reportDate={localDate(entry.createdAt)}
                assessment={entry.assessment && { ...entry.assessment, reportRef: entry.reportRef }}
              />
            ) : (
              <p className="py-10 text-center text-gray-600">No matching trademarks were found for this search.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

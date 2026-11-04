import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { FaFilePdf, FaArrowRight } from "react-icons/fa";
import { getSharedTrademarkReport, fetchTrademarkImage } from "../api/TrademarkApi";
import TrademarkReport from "../components/Trademark/TrademarkReport";
import { saveElementAsPdf } from "../utils/elementToPdf";

// /trademark-report?t=<token> — one saved Trademark Search Report opened from a
// signed link (WhatsApp, email, CRM), no sign-in: view it and download the PDF.

const TRADEMARK_SERVICE_ID = 344;
const localDate = (d) => new Date(d).toLocaleDateString("en-CA");
const fileSafe = (s) => String(s || "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "search";

// Same PDF page furniture as the Trademark Search page's report.
const pdfOptions = (reportRef) => ({
  resolveImage: (src) => (src.includes("binbash.ai/media/trademarks/") ? fetchTrademarkImage(src) : null),
  runningHeader: { logo: "/Images/image.png", left: "Bizpole One", right: `Trademark Search Report${reportRef ? `  ·  Ref: ${reportRef}` : ""}` },
  footer: "Bizpole One  |  Trademark Search Report  ·  Confidential · Advisory opinion only, not a guarantee of registration",
});

// The report's images are lazy-loaded; force them and wait (bounded) before the PDF snapshot.
async function waitForImages(el) {
  const imgs = Array.from(el.querySelectorAll("img"));
  imgs.forEach((img) => { img.loading = "eager"; });
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? null
        : new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
            setTimeout(resolve, 5000);
          })
    )
  );
}

export default function TrademarkReportPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t");
  const reportRef = useRef(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("This report link is incomplete. Please open the link exactly as it was sent to you.");
      return;
    }
    getSharedTrademarkReport(token)
      .then(setReport)
      .catch((err) => setError(err.response?.data?.message || "Could not load the report. Please try again."));
  }, [token]);

  const download = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      await waitForImages(reportRef.current);
      await saveElementAsPdf(
        reportRef.current,
        `Trademark-Search-Report-${fileSafe(report.query)}-${localDate(report.createdAt)}`,
        pdfOptions(report.reportRef)
      );
    } catch {
      setError("Could not generate the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {!report && !error && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white border border-gray-200 animate-pulse" />
            ))}
          </div>
        )}

        {error && !report && (
          <div className="rounded-2xl bg-white border border-gray-200 p-10 text-center">
            <p className="text-lg font-semibold text-black mb-1">Report unavailable</p>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              to="/trademark-search"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FFC72C] hover:bg-[#FFBD00] text-black font-semibold"
            >
              Search again <FaArrowRight />
            </Link>
          </div>
        )}

        {report && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <p className="text-gray-700">
                Trademark Search Report for <span className="font-semibold text-black">“{report.query}”</span>
                <span className="ml-2 text-sm text-gray-500">
                  {new Date(report.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </p>
              {report.results?.length > 0 && (
                <button
                  type="button"
                  onClick={download}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FFC72C] hover:bg-[#FFBD00] text-black text-sm font-semibold disabled:opacity-60"
                >
                  <FaFilePdf /> {downloading ? "Preparing PDF…" : "Download report (PDF)"}
                </button>
              )}
            </div>
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            {report.results?.length ? (
              <div className="overflow-x-auto">
                <TrademarkReport
                  ref={reportRef}
                  results={report.results}
                  query={report.query}
                  queryType={report.queryType}
                  classes={report.classNumbers || "All"}
                  total={report.totalCount ?? report.results.length}
                  reportDate={localDate(report.createdAt)}
                  assessment={report.assessment && { ...report.assessment, reportRef: report.reportRef }}
                />
              </div>
            ) : (
              <p className="rounded-2xl bg-white border border-gray-200 py-10 text-center text-gray-600">
                No matching trademarks were found for this search.
              </p>
            )}

            <div
              className="relative overflow-hidden mt-16 rounded-[24px] px-8 md:px-12 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              style={{ background: "radial-gradient(90% 160% at 45% 0%, #3d3f45 0%, #16171a 45%, #000000 100%)" }}
            >
              <h3 className="text-white text-3xl md:text-5xl font-semibold tracking-tight">Ready to Protect Your Brand?</h3>
              <Link
                to={`/services/${TRADEMARK_SERVICE_ID}`}
                className="shrink-0 inline-flex items-center gap-10 pl-6 pr-5 py-3 rounded-full bg-[#FFC72C] hover:bg-[#FFBD00] text-black text-sm font-semibold"
              >
                Get Started <FaArrowRight />
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

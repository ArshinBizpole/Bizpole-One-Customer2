import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaSearch, FaRegCopyright, FaChevronLeft, FaChevronRight, FaArrowRight, FaFilePdf, FaLock, FaHistory, FaChevronDown } from "react-icons/fa";
import { searchTrademarks, getTrademarkSearchHistory, getTrademarkSearchHistoryEntry } from "../api/TrademarkApi";
import { NICE_CLASSES } from "../components/ExixistingCompany/existingCompanyData";
import { LeadCaptureModal, requireVerifiedCustomer } from "../components/ExixistingCompany/FlowRunner";
import TrademarkReport from "../components/Trademark/TrademarkReport";
import { saveElementAsPdf } from "../utils/elementToPdf";
import "../components/newco-theme.css";

const PAGE_SIZE = 10;
const TRADEMARK_SERVICE_ID = 344;

const SEARCH_TYPES = [
  { value: "WORD_MARK", label: "Brand name", placeholder: "e.g. Bizpole" },
  { value: "PROPRIETOR_NAME", label: "Owner", placeholder: "e.g. Bizpole India Pvt Ltd" },
  { value: "APPLICATION_NUMBER", label: "Application no.", placeholder: "e.g. 5123456" },
];

const typeLabel = (value) => SEARCH_TYPES.find((t) => t.value === value)?.label || value;
// Local calendar date as YYYY-MM-DD (the report's date format).
const localDate = (d) => new Date(d).toLocaleDateString("en-CA");
const fileSafe = (s) => String(s || "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "search";

// The off-screen report's images are lazy-loaded, so they never load on their
// own; force them and wait (bounded) before the PDF snapshot.
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

const MASKED_ROW = {
  applicationNumber: "•••••••",
  wordMark: "••••••",
  proprietorName: "•••••• •••••• ••••••",
  classDetail: "•••••••• •••••• ••• •••••••••",
  userDetail: "••••••••",
  image: null,
};

// embedded: shown inside the customer dashboard (/dashboard/bizpoleone/trademark-search)
// rather than as a full website page — tighter spacing, no full-screen height.
export default function TrademarkSearch({ embedded = false }) {
  const navigate = useNavigate();
  const reportRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [type, setType] = useState("WORD_MARK");
  const [query, setQuery] = useState("");
  const [tmClass, setTmClass] = useState("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);
  const [submitted, setSubmitted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Viewing the report needs a verified Customer — same sign-up/OTP modal as the
  // Trademark Registration flow's "Run Public Trademark Search" (FlowRunner's
  // LeadCaptureModal), which also raises a Lead for sales. The gate state is the
  // minimal shape that modal and requireVerifiedCustomer read/write.
  const gate = useRef({ serviceType: "Trademark Registration", flowId: "trademark-search" }).current;
  const [, setGateTick] = useState(0);
  const bumpGate = () => setGateTick((t) => t + 1);
  const [unlocked, setUnlocked] = useState(false);

  // Signed-in customer's saved searches + free-search allowance (server counts).
  const [history, setHistory] = useState({ signedIn: false, items: [], usage: { used: 0, limit: 10 } });
  const limitReached = history.signedIn && history.usage.used >= history.usage.limit;
  const [historyReport, setHistoryReport] = useState(null); // saved search being rendered for its PDF
  const [downloadingId, setDownloadingId] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false); // history list starts collapsed
  const historyReportRef = useRef(null);
  // The search on screen, and whether the server saved it to the history
  // (it only does when the visitor was already signed in).
  const lastSearch = useRef(null);

  const loadHistory = useCallback(async () => {
    if (!localStorage.getItem("token")) return;
    try {
      setHistory(await getTrademarkSearchHistory());
    } catch {
      /* history is a convenience — the search still works without it */
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const markLimitReached = (err) => {
    const usage = err.response?.data?.usage;
    setHistory((h) => ({ ...h, signedIn: true, usage: usage || { used: h.usage.limit, limit: h.usage.limit } }));
  };

  const searchParams = (params, nextPage) => ({
    q: params.q,
    type: params.type,
    classes: params.tmClass ? [params.tmClass] : [],
    limit: PAGE_SIZE,
    offset: nextPage * PAGE_SIZE,
    track: true,
  });

  // After sign-in: a search run while signed out wasn't saved, so run it again
  // now that we know who it is (served from the server cache, no new lookup)
  // to save it and count it. Over the free limit it stays locked.
  const onVerified = async () => {
    const last = lastSearch.current;
    if (!last || last.saved) {
      setUnlocked(true);
      loadHistory();
      return;
    }
    try {
      await searchTrademarks(searchParams(last.params, last.page));
      last.saved = true;
      setUnlocked(true);
    } catch (err) {
      if (err.response?.data?.limitReached) {
        markLimitReached(err);
        setError(err.response.data.message);
      } else {
        setUnlocked(true); // couldn't save it to the history, but they did sign in
      }
    }
    loadHistory();
  };
  const askToSignIn = () => requireVerifiedCustomer(gate, bumpGate, onVerified);

  const activeType = SEARCH_TYPES.find((t) => t.value === type);

  const runSearch = async (params, nextPage) => {
    setLoading(true);
    setError("");
    try {
      const data = await searchTrademarks(searchParams(params, nextPage));
      setResult(data);
      setSubmitted(params);
      setPage(nextPage);
      lastSearch.current = { params, page: nextPage, saved: !!data?.usage };
      if (data?.usage) {
        setHistory((h) => ({ ...h, signedIn: true, usage: { used: data.usage.used, limit: data.usage.limit } }));
        loadHistory();
      }
      if (!unlocked && data?.results?.length) askToSignIn();
    } catch (err) {
      if (err.response?.data?.limitReached) markLimitReached(err);
      setError(err.response?.data?.message || "Could not search trademarks right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Rebuild a saved search's report from its stored results — no new lookup.
  const downloadHistoryReport = async (item) => {
    setDownloadingId(item.id);
    setError("");
    try {
      const entry = await getTrademarkSearchHistoryEntry(item.id);
      setHistoryReport(entry);
      // Let the off-screen report render before snapshotting it.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await waitForImages(historyReportRef.current);
      await saveElementAsPdf(
        historyReportRef.current,
        `Trademark-Search-Report-${fileSafe(entry.query)}-${localDate(entry.createdAt)}`
      );
    } catch {
      setError("Could not download that report. Please try again.");
    } finally {
      setHistoryReport(null);
      setDownloadingId(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setError("Enter at least 2 characters to search.");
      return;
    }
    runSearch({ q, type, tmClass }, 0);
  };

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      await saveElementAsPdf(reportRef.current, `Trademark-Search-Report-${fileSafe(submitted.q)}`);
    } catch {
      setError("Could not generate the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const total = result?.count;
  const results = result?.results || [];
  const hasNext = result?.hasMore;
  const hasPrev = page > 0;

  return (
    <div className={embedded ? "" : "min-h-screen bg-gray-50"}>
      {/* Hero + search */}
      <section
        className={`relative overflow-hidden bg-white border-gray-200 ${
          embedded ? "border rounded-2xl" : "border-b"
        }`}
      >
        <div className="absolute top-0 right-0 w-1/3 h-full bg-yellow-400/10 skew-x-12 transform translate-x-1/2" />
        <div
          className={`relative z-10 max-w-5xl mx-auto px-4 sm:px-6 ${
            embedded ? "py-8 md:py-10" : "py-14 md:py-20"
          }`}
        >
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold mb-4">
              <FaRegCopyright /> Indian Trademark Registry
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-black leading-tight mb-3">
              Free <span className="text-yellow-500">Trademark Search</span>
            </h1>
            <p className="text-gray-600 max-w-2xl mb-8">
              Check whether your brand name is already registered or applied for before you file. Search by brand
              name, owner or application number and narrow it down by class.
            </p>
          </motion.div>

          {limitReached ? (
            <div className="bg-white rounded-2xl shadow-lg border border-yellow-300 p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-lg font-bold text-black">
                  Your {history.usage.limit} free trademark searches have been used
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  You can still download the reports of your past searches below. For more searches and a detailed
                  conflict check, talk to our trademark experts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/services/${TRADEMARK_SERVICE_ID}`)}
                className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white font-medium"
              >
                Talk to a trademark expert <FaArrowRight />
              </button>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 md:p-5">
            <div className="flex flex-wrap gap-2 mb-4">
              {SEARCH_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                    type === t.value
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-300 hover:border-black hover:text-black"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={type === "APPLICATION_NUMBER" ? "number" : "text"}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={activeType.placeholder}
                  maxLength={100}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                />
              </div>
              <select
                value={tmClass}
                onChange={(e) => setTmClass(e.target.value)}
                className="md:w-72 px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="">All classes</option>
                {NICE_CLASSES.map((c) => (
                  <option key={c.no} value={c.no}>
                    Class {c.no} — {c.short}
                  </option>
                ))}
              </select>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={loading}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-semibold shadow-md disabled:opacity-60"
              >
                {loading ? "Searching…" : "Search"}
              </motion.button>
            </div>
            {history.signedIn && (
              <p className="mt-3 text-xs text-gray-500">
                {history.usage.used} of {history.usage.limit} free searches used
              </p>
            )}
          </form>
          )}

          {/* Search history — signed-in customers' saved searches */}
          {history.signedIn && history.items.length > 0 && (
            <div className="mt-6 bg-white rounded-2xl border border-gray-200">
              <button
                type="button"
                onClick={() => setHistoryOpen((o) => !o)}
                aria-expanded={historyOpen}
                className="w-full flex items-center gap-2 px-4 md:px-5 py-4 font-semibold text-black text-left"
              >
                <FaHistory className="text-yellow-500" /> Your search history
                <span className="text-xs font-normal text-gray-500">({history.items.length})</span>
                <FaChevronDown
                  className={`ml-auto text-gray-500 transition-transform ${historyOpen ? "rotate-180" : ""}`}
                />
              </button>
              {historyOpen && (
              <ul className="divide-y divide-gray-100 px-4 md:px-5 pb-2 border-t border-gray-100">
                {history.items.map((item) => (
                  <li key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-black truncate">“{item.query}”</p>
                      <p className="text-xs text-gray-500">
                        {typeLabel(item.queryType)} · {item.classNumbers ? `Class ${item.classNumbers}` : "All classes"} ·{" "}
                        {item.totalCount != null ? `${Number(item.totalCount).toLocaleString("en-IN")} results` : "Results saved"} ·{" "}
                        {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => downloadHistoryReport(item)}
                        disabled={downloadingId !== null}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black text-white text-xs font-medium disabled:opacity-50"
                      >
                        <FaFilePdf /> {downloadingId === item.id ? "Preparing…" : "Download report"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Errors open as a popup instead of inline text. */}
      {error && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="tm-error-title"
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setError("")}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="tm-error-title" className="text-lg font-semibold text-black mb-2">
              {error.includes("free trademark searches")
                ? "Free searches used up"
                : error.startsWith("Enter at least")
                  ? "Check your search"
                  : "Something went wrong"}
            </p>
            <p className="text-sm text-gray-600 mb-6">{error}</p>
            <button
              type="button"
              autoFocus
              onClick={() => setError("")}
              className="w-full px-6 py-2.5 rounded-full bg-yellow-400 text-black font-semibold hover:bg-yellow-500"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Off-screen copy of a saved search's report, rendered only while its
          PDF is being made. */}
      {historyReport && (
        <div aria-hidden="true" style={{ position: "fixed", left: -10000, top: 0, width: 1100 }}>
          <TrademarkReport
            ref={historyReportRef}
            results={historyReport.results}
            query={historyReport.query}
            classes={historyReport.classNumbers || "All"}
            total={historyReport.totalCount ?? historyReport.results.length}
            reportDate={localDate(historyReport.createdAt)}
          />
        </div>
      )}

      {/* Results */}
      <section className={`max-w-6xl mx-auto ${embedded ? "py-6" : "px-4 sm:px-6 py-10"}`}>
        {loading && !result && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white border border-gray-200 animate-pulse" />
            ))}
          </div>
        )}

        {result && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <p className="text-gray-700">
                {total != null ? (
                  <>
                    <span className="font-semibold text-black">{total.toLocaleString("en-IN")}</span> result
                    {total === 1 ? "" : "s"} for{" "}
                  </>
                ) : (
                  "Results for "
                )}
                <span className="font-semibold text-black">“{submitted.q}”</span>
                {submitted.tmClass && <> in Class {submitted.tmClass}</>}
              </p>
              {results.length > 0 && (
                <p className="text-sm text-gray-500">
                  Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + results.length}
                </p>
              )}
            </div>

            {results.length > 0 && !unlocked && !gate.leadGate && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={askToSignIn}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-yellow-400 text-black text-sm font-semibold"
                >
                  <FaLock /> Sign up to view report
                </button>
              </div>
            )}

            {results.length > 0 && unlocked && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleDownload}
                  disabled={downloading || loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white text-sm font-medium disabled:opacity-60"
                >
                  <FaFilePdf /> {downloading ? "Preparing PDF…" : "Download report (PDF)"}
                </button>
              </div>
            )}

            {results.length === 0 ? (
              <div className="rounded-2xl bg-white border border-gray-200 p-10 text-center">
                <p className="text-lg font-semibold text-black mb-1">No matching trademarks found</p>
                <p className="text-gray-600 mb-6">
                  That's a good sign — but a search alone isn't a guarantee. Our experts can do a detailed check and
                  file it for you.
                </p>
                <button
                  onClick={() => navigate(`/services/${TRADEMARK_SERVICE_ID}`)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white font-medium"
                >
                  Register this trademark <FaArrowRight />
                </button>
              </div>
            ) : !unlocked ? (
              // Locked preview: the report's frame with masked rows (no real data
              // in the DOM) behind a sign-in prompt.
              <div className="relative">
                <div aria-hidden="true" className="blur-[3px] select-none pointer-events-none">
                  <TrademarkReport
                    results={results.map((r) => ({ ...MASKED_ROW, status: r.status, classNumber: r.classNumber }))}
                    query={submitted.q}
                    classes={submitted.tmClass || "All"}
                    total={total ?? results.length}
                  />
                </div>
              </div>
            ) : (
              <motion.div
                key={`${submitted.q}-${page}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`transition-opacity ${loading ? "opacity-50" : ""}`}
              >
                <TrademarkReport
                  ref={reportRef}
                  results={results}
                  query={submitted.q}
                  classes={submitted.tmClass || "All"}
                  total={total ?? results.length}
                  startIndex={page * PAGE_SIZE}
                  page={page + 1}
                  pageCount={total != null ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : page + 1}
                />
              </motion.div>
            )}

            {unlocked && (hasPrev || hasNext) && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  disabled={!hasPrev || loading}
                  onClick={() => runSearch(submitted, page - 1)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 bg-white text-sm disabled:opacity-40"
                >
                  <FaChevronLeft /> Previous
                </button>
                <span className="text-sm text-gray-600">Page {page + 1}</span>
                <button
                  disabled={!hasNext || loading}
                  onClick={() => runSearch(submitted, page + 1)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 bg-white text-sm disabled:opacity-40"
                >
                  Next <FaChevronRight />
                </button>
              </div>
            )}

            {results.length > 0 && (
              <div className="mt-10 rounded-2xl bg-black text-white p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <p className="text-xl font-bold mb-1">Found similar marks?</p>
                  <p className="text-gray-300 text-sm">
                    Our trademark experts will assess the conflict risk and file your application.
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/services/${TRADEMARK_SERVICE_ID}`)}
                  className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-yellow-400 text-black font-semibold"
                >
                  Register your trademark <FaArrowRight />
                </button>
              </div>
            )}
          </>
        )}

        {!result && !loading && (
          <p className="text-center text-sm text-gray-500">
            Results come from the Indian Trademark Registry and are for reference only — not legal advice.
          </p>
        )}
      </section>

      {/* newco-theme recolours the modal's blue buttons to brand yellow, as in the
          Trademark Registration flow (NewCompanyFlow wraps FlowRunner the same way). */}
      {gate.leadGate && (
        <div className="newco-theme">
          <LeadCaptureModal
            state={gate}
            bump={bumpGate}
            title="Sign in to view & download your report"
            subtitle="We'll verify your mobile with a code emailed to you. Your Trademark Search Report will also be sent to your email."
          />
        </div>
      )}
    </div>
  );
}

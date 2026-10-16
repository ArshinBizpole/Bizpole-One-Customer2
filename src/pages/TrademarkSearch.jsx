import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaSearch, FaRegCopyright, FaChevronLeft, FaChevronRight, FaArrowRight, FaFilePdf, FaLock } from "react-icons/fa";
import { searchTrademarks } from "../api/TrademarkApi";
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

const MASKED_ROW = {
  applicationNumber: "•••••••",
  wordMark: "••••••",
  proprietorName: "•••••• •••••• ••••••",
  classDetail: "•••••••• •••••• ••• •••••••••",
  userDetail: "••••••••",
  image: null,
};

export default function TrademarkSearch() {
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
  const askToSignIn = () => requireVerifiedCustomer(gate, bumpGate, () => setUnlocked(true));

  const activeType = SEARCH_TYPES.find((t) => t.value === type);

  const runSearch = async (params, nextPage) => {
    setLoading(true);
    setError("");
    try {
      const data = await searchTrademarks({
        q: params.q,
        type: params.type,
        classes: params.tmClass ? [params.tmClass] : [],
        limit: PAGE_SIZE,
        offset: nextPage * PAGE_SIZE,
      });
      setResult(data);
      setSubmitted(params);
      setPage(nextPage);
      if (!unlocked && data?.results?.length) askToSignIn();
    } catch (err) {
      setError(err.response?.data?.message || "Could not search trademarks right now. Please try again.");
    } finally {
      setLoading(false);
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
      const safe = submitted.q.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "search";
      await saveElementAsPdf(reportRef.current, `Trademark-Search-Report-${safe}`);
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
    <div className="min-h-screen bg-gray-50">
      {/* Hero + search */}
      <section className="relative overflow-hidden bg-white border-b border-gray-200">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-yellow-400/10 skew-x-12 transform translate-x-1/2" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-14 md:py-20">
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
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </form>
        </div>
      </section>

      {/* Results */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
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

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaSearch, FaRegCopyright, FaChevronLeft, FaChevronRight, FaArrowRight, FaFilePdf, FaLock, FaImage, FaTimes } from "react-icons/fa";
import {
  searchTrademarks,
  searchTrademarksByImage,
  getTrademarkSearchHistory,
  getTrademarkSearchHistoryEntry,
  getTrademarkAssessment,
  fetchTrademarkImage,
} from "../api/TrademarkApi";
import { NICE_CLASSES } from "../components/ExixistingCompany/existingCompanyData";
import { LeadCaptureModal, requireVerifiedCustomer } from "../components/ExixistingCompany/FlowRunner";
import { FiDatabase, FiZap, FiLock, FiDownload } from "react-icons/fi";
import { HiOutlineShieldCheck } from "react-icons/hi";
import TrademarkReport from "../components/Trademark/TrademarkReport";
import TrademarkHeroArt from "../components/Trademark/TrademarkHeroArt";
import ClassSelect from "../components/Trademark/ClassSelect";
import HistoryMenu from "../components/Trademark/HistoryMenu";
import ServiceDetails from "./ServiceDetails";
import { saveElementAsPdf } from "../utils/elementToPdf";
import "../components/newco-theme.css";

const PAGE_SIZE = 10;
const TRADEMARK_SERVICE_ID = 344;

const SEARCH_TYPES = [
  { value: "WORD_MARK", label: "Brand name", placeholder: "e.g. Bizpole" },
  { value: "PROPRIETOR_NAME", label: "Owner", placeholder: "e.g. Bizpole India Pvt Ltd" },
  { value: "APPLICATION_NUMBER", label: "Application no.", placeholder: "e.g. 5123456" },
  { value: "IMAGE", label: "Logo", placeholder: "Upload your logo (PNG or JPG, up to 2 MB)" },
];

const HIGHLIGHTS = [
  { icon: FiDatabase, title: "Official Database", text: "Data from Indian Trademark Registry", tone: "bg-blue-50 text-blue-600" },
  { icon: HiOutlineShieldCheck, title: "Up to date", text: "Latest trademark records", tone: "bg-emerald-50 text-emerald-600" },
  { icon: FiZap, title: "Fast & Accurate", text: "Get results in seconds", tone: "bg-yellow-50 text-yellow-500" },
  { icon: FiLock, title: "Trusted Information", text: "For reference only", tone: "bg-orange-50 text-orange-500" },
];

const LOGO_TYPES = ["image/png", "image/jpeg"];
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
// Messages about the visitor's own input — the error popup titles these
// "Check your search" rather than "Something went wrong".
const INPUT_ERROR = /^(Enter at least|Choose your logo|Logo must)/;

const typeLabel = (value) =>
  value === "COMPOSITE" ? "Name + logo" : SEARCH_TYPES.find((t) => t.value === value)?.label || value;
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

// PDF page furniture as in the report format: a running header band on pages
// 2+, the confidentiality footer + page numbers on every page. Registry logos
// come through our API so they aren't blank in the PDF.
const pdfOptions = (reportRef) => ({
  resolveImage: (src) => (src.includes("binbash.ai/media/trademarks/") ? fetchTrademarkImage(src) : null),
  runningHeader: { logo: "/Images/image.png", left: "Bizpole One", right: `Trademark Search Report${reportRef ? `  ·  Ref: ${reportRef}` : ""}` },
  footer: "Bizpole One  |  Trademark Search Report  ·  Confidential · Advisory opinion only, not a guarantee of registration",
});

// Searches with a brand name get the probability assessment.
const hasBrandName = (type) => type === "WORD_MARK" || type === "COMPOSITE";

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
  // Dashboard: "Register this trademark" shows the service in place (sidebar
  // stays, Back returns to these results) — the public page opens /services/:id.
  const [showTrademarkService, setShowTrademarkService] = useState(false);
  const openTrademarkService = () => {
    if (!embedded) {
      navigate(`/services/${TRADEMARK_SERVICE_ID}`);
      return;
    }
    setShowTrademarkService(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const [type, setType] = useState("WORD_MARK");
  const [query, setQuery] = useState("");
  // Logo search: the chosen file and a data-URL preview of it.
  const [logo, setLogo] = useState(null); // { file, preview }
  const logoInputRef = useRef(null);
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
  const [viewReport, setViewReport] = useState(null); // saved search open in the "View report" popup
  const [viewingId, setViewingId] = useState(null);
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

  // Probability of registration for the brand-name search on screen. Fetched
  // once per search (not per page) after the report is unlocked; the server
  // caches it and saves it with the history entry.
  const [assessment, setAssessment] = useState(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const hasResults = !!result?.results?.length;
  useEffect(() => {
    setAssessment(null);
    // A name + logo search is assessed on its name.
    if (!unlocked || !hasResults || !hasBrandName(submitted?.type)) return undefined;
    let current = true;
    setAssessmentLoading(true);
    getTrademarkAssessment({ q: submitted.q, classes: submitted.tmClass ? [submitted.tmClass] : [] })
      .then((data) => {
        if (current && !data?.signInRequired) setAssessment(data);
      })
      .catch(() => {
        /* the report still works without the meter */
      })
      .finally(() => {
        if (current) setAssessmentLoading(false);
      });
    return () => {
      current = false;
    };
  }, [unlocked, hasResults, submitted?.q, submitted?.type, submitted?.tmClass]);

  const markLimitReached = (err) => {
    const usage = err.response?.data?.usage;
    setHistory((h) => ({ ...h, signedIn: true, usage: usage || { used: h.usage.limit, limit: h.usage.limit } }));
  };

  // One page of a search; a logo search re-sends its file (the server caches
  // by the image, so paging doesn't cost a new lookup).
  const fetchSearch = (params, nextPage) => {
    const common = {
      classes: params.tmClass ? [params.tmClass] : [],
      limit: PAGE_SIZE,
      offset: nextPage * PAGE_SIZE,
      track: true,
    };
    if (params.type === "IMAGE") return searchTrademarksByImage({ ...common, file: params.file });
    if (params.type === "COMPOSITE") return searchTrademarksByImage({ ...common, file: params.file, q: params.q });
    return searchTrademarks({ ...common, q: params.q, type: params.type });
  };

  const pickLogo = (file) => {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setError("Choose your logo as a PNG or JPG image.");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError("Logo must be 2 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo({ file, preview: reader.result });
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setLogo(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

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
      await fetchSearch(last.params, last.page);
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
  // immediate: an already signed-in customer sees the report at once — the sales
  // Lead is raised in the background rather than holding the report locked.
  const askToSignIn = () => requireVerifiedCustomer(gate, bumpGate, onVerified, { immediate: true });

  const activeType = SEARCH_TYPES.find((t) => t.value === type);

  const runSearch = async (params, nextPage) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchSearch(params, nextPage);
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

  // Open a saved search's report on screen from its stored results — no new lookup.
  const viewHistoryReport = async (item) => {
    setViewingId(item.id);
    setError("");
    try {
      setViewReport(await getTrademarkSearchHistoryEntry(item.id));
    } catch {
      setError("Could not open that report. Please try again.");
    } finally {
      setViewingId(null);
    }
  };

  useEffect(() => {
    if (!viewReport) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setViewReport(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewReport]);

  // Rebuild a saved search's report from its stored results — no new lookup.
  // entry: already fetched (from the View report popup).
  const downloadHistoryReport = async (item, entry) => {
    setDownloadingId(item.id);
    setError("");
    try {
      entry = entry || (await getTrademarkSearchHistoryEntry(item.id));
      setHistoryReport(entry);
      // Let the off-screen report render before snapshotting it.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await waitForImages(historyReportRef.current);
      await saveElementAsPdf(
        historyReportRef.current,
        `Trademark-Search-Report-${fileSafe(entry.query)}-${localDate(entry.createdAt)}`,
        pdfOptions(entry.reportRef)
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
    if (type === "IMAGE") {
      if (!logo) {
        setError("Choose your logo image (PNG or JPG) to search.");
        return;
      }
      runSearch({ q: `Logo: ${logo.file.name}`, type, tmClass, file: logo.file, preview: logo.preview }, 0);
      return;
    }
    const q = query.trim();
    if (q.length < 2) {
      setError("Enter at least 2 characters to search.");
      return;
    }
    // Brand name with a logo attached: both in one search.
    if (type === "WORD_MARK" && logo) {
      runSearch({ q, type: "COMPOSITE", tmClass, file: logo.file, preview: logo.preview }, 0);
      return;
    }
    runSearch({ q, type, tmClass }, 0);
  };

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      await saveElementAsPdf(
        reportRef.current,
        `Trademark-Search-Report-${fileSafe(submitted.q)}`,
        pdfOptions(assessment?.reportRef)
      );
    } catch {
      setError("Could not generate the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const total = result?.count;
  const results = result?.results || [];
  // Name + logo: the logo matches all sit on page 1, after its name matches,
  // so later pages start that many rows further on and pages follow the names.
  const logoExtra = result?.logoCount || 0;
  const startIndex = page * PAGE_SIZE + (page > 0 ? logoExtra : 0);
  const pagedTotal = result?.nameCount ?? total;
  const hasNext = result?.hasMore;
  const hasPrev = page > 0;

  // "History" beside the search bar (and on the free-limit card).
  const historyMenu = (className) => (
    <HistoryMenu
      history={history}
      typeLabel={typeLabel}
      onSignIn={askToSignIn}
      onView={viewHistoryReport}
      onDownload={downloadHistoryReport}
      viewingId={viewingId}
      downloadingId={downloadingId}
      className={className}
    />
  );

  if (embedded && showTrademarkService) {
    return (
      <ServiceDetails
        serviceId={TRADEMARK_SERVICE_ID}
        embedded
        onBack={() => setShowTrademarkService(false)}
      />
    );
  }

  return (
    <div className={embedded ? "" : "min-h-screen bg-gray-50"}>
      {/* Hero + search */}
      <section
        // No overflow-hidden here: it would clip the class dropdown, which opens
        // below the section. Only the decorative layer is clipped.
        className={`relative z-20 ${embedded ? "border border-gray-200 rounded-2xl" : ""}`}
        style={{ background: "linear-gradient(180deg, #FFF6DA 0%, #FFFBEF 45%, #FFFFFF 100%)" }}
      >
        {/* Warm glow behind the illustration + yellow sweeps behind the search bar */}
        <div aria-hidden="true" className={`absolute inset-0 overflow-hidden pointer-events-none ${embedded ? "rounded-2xl" : ""}`}>
        <div
          aria-hidden="true"
          className="absolute -top-24 right-0 w-[60%] h-[120%] pointer-events-none"
          style={{ background: "radial-gradient(closest-side, rgba(255,214,90,0.45), rgba(255,214,90,0) 70%)" }}
        />
        <svg
          aria-hidden="true"
          className="absolute bottom-0 left-0 w-full h-[45%] pointer-events-none"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path d="M0 210 C 320 120, 620 300, 960 190 S 1360 90, 1440 130 L1440 320 L0 320 Z" fill="#FFE9A8" opacity="0.55" />
          <path d="M0 250 C 360 170, 700 330, 1040 230 S 1380 170, 1440 190 L1440 320 L0 320 Z" fill="#FFD966" opacity="0.45" />
          <path d="M0 300 C 400 240, 760 330, 1100 290 S 1400 270, 1440 280 L1440 320 L0 320 Z" fill="#FFFFFF" />
        </svg>
        </div>

        <div
          className={`relative z-10 ${
            // Dashboard: fill the content area (it already pads the page) — no side gutters.
            embedded ? "w-full px-4 sm:px-6 lg:px-8 py-8 md:py-10" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-10 md:pt-12 pb-10"
          }`}
        >
          <div className="relative">
            <TrademarkHeroArt className="hidden lg:block absolute right-0 -top-6 w-[340px] xl:w-[400px]" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center"
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-300 text-yellow-800 text-[11px] font-semibold tracking-wide uppercase mb-8">
                <FaRegCopyright /> Indian Trademark Registry
              </span>
              <div className="w-full lg:max-w-[58%] lg:mr-auto text-center">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-black leading-[1.05] tracking-tight mb-6">
                  Protect your <span className="text-yellow-400">brand.</span>
                  <br />
                  Start with a <span className="text-yellow-400">search.</span>
                </h1>
                <p className="text-gray-600 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                  Check whether your brand name or logo is already registered or applied for before you file in India.
                  Search by brand name, owner, application number or logo and narrow it down by class.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mt-10 lg:mt-12">
            {HIGHLIGHTS.map(({ icon: Icon, title, text, tone }) => (
              <div
                key={title}
                className="flex items-center gap-4 bg-white rounded-2xl px-5 py-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-white"
              >
                <span className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl ${tone}`}>
                  <Icon />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-black">{title}</p>
                  <p className="text-sm text-gray-500 leading-snug">{text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12" />

          {limitReached ? (
            <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg border border-yellow-300 p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-lg font-bold text-black">
                  Your {history.usage.limit} free trademark searches have been used
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  You can still download the reports of your past searches below. For more searches and a detailed
                  conflict check, talk to our trademark experts.
                </p>
              </div>
              <div className="shrink-0 flex flex-wrap gap-3">
                {historyMenu("h-12")}
                <button
                  type="button"
                  onClick={openTrademarkService}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white font-medium"
                >
                  Talk to a trademark expert <FaArrowRight />
                </button>
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="max-w-6xl mx-auto">
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {SEARCH_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                    type === t.value
                      ? "bg-[#111827] text-white border-[#111827]"
                      : "bg-white text-gray-700 border-gray-200 hover:border-black hover:text-black"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              {/* Shared by the Logo tab and Brand name's "Add logo". */}
              <input
                ref={logoInputRef}
                type="file"
                accept={LOGO_TYPES.join(",")}
                className="hidden"
                onChange={(e) => pickLogo(e.target.files?.[0])}
              />
              {type === "IMAGE" ? (
                <div
                  className="relative flex-1 flex items-center gap-3 min-w-0 h-14 px-4 rounded-xl border border-dashed border-gray-300 bg-white shadow-sm hover:border-yellow-400 cursor-pointer"
                  onClick={() => logoInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    pickLogo(e.dataTransfer.files?.[0]);
                  }}
                >
                  {logo ? (
                    <>
                      <img src={logo.preview} alt="Your logo" className="h-8 w-8 object-contain rounded" />
                      <span className="flex-1 truncate text-sm text-black">{logo.file.name}</span>
                      <button
                        type="button"
                        aria-label="Remove logo"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearLogo();
                        }}
                        className="p-1 text-gray-400 hover:text-black"
                      >
                        <FaTimes />
                      </button>
                    </>
                  ) : (
                    <>
                      <FaImage className="text-gray-400 shrink-0" />
                      <span className="truncate text-sm text-gray-400 py-1">{activeType.placeholder}</span>
                    </>
                  )}
                </div>
              ) : (
              <div className="relative flex-1 min-w-0 h-14">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={type === "APPLICATION_NUMBER" ? "number" : "text"}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={activeType.placeholder}
                  maxLength={100}
                  className={`w-full h-full pl-11 ${type === "WORD_MARK" ? "pr-32" : "pr-4"} rounded-xl border border-gray-200 bg-white shadow-sm text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400`}
                />
                {/* Optional logo: brand name + logo are then checked together. */}
                {type === "WORD_MARK" && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {logo ? (
                      <span className="flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-lg bg-yellow-50 border border-yellow-300 max-w-[7.5rem]">
                        <img src={logo.preview} alt="Your logo" className="h-6 w-6 object-contain rounded shrink-0" />
                        <span className="text-xs text-black truncate">+ logo</span>
                        <button
                          type="button"
                          aria-label="Remove logo"
                          onClick={clearLogo}
                          className="p-1 text-gray-400 hover:text-black"
                        >
                          <FaTimes />
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        title="Also check your logo"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:border-black hover:text-black"
                      >
                        <FaImage /> Add logo
                      </button>
                    )}
                  </div>
                )}
              </div>
              )}
              <ClassSelect
                value={tmClass}
                onChange={setTmClass}
                options={NICE_CLASSES.map((c) => ({ value: c.no, label: `Class ${c.no} — ${c.short}` }))}
                className="h-14 md:w-48 shrink-0"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="h-14 md:w-36 shrink-0 px-6 whitespace-nowrap rounded-xl bg-[#FFC72C] hover:bg-[#FFBD00] text-black text-base font-bold shadow-[0_8px_20px_rgba(255,199,44,0.45)] disabled:opacity-60"
              >
                {loading ? "Searching…" : "Search"}
              </motion.button>
              {historyMenu("h-14 md:w-auto shrink-0")}
            </div>
            <div className="mt-3 flex items-center justify-center md:justify-start gap-3 text-xs text-gray-600">
              <span>{history.usage.limit} free searches included</span>
              {history.signedIn && (
                <>
                  <span className="w-24 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <span
                      className="block h-full rounded-full bg-[#FFC72C]"
                      style={{ width: `${Math.min(100, (history.usage.used / history.usage.limit) * 100)}%` }}
                    />
                  </span>
                  <span>
                    {history.usage.used}/{history.usage.limit} used
                  </span>
                </>
              )}
            </div>
          </form>
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
                : INPUT_ERROR.test(error)
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

      {/* A saved search's report, opened from the history list. */}
      {viewReport && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tm-view-title"
          className="fixed inset-0 z-[950] flex items-start justify-center bg-black/50 p-2 sm:p-6 overflow-y-auto overscroll-contain"
          onClick={() => setViewReport(null)}
        >
          <div className="w-full max-w-6xl rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 px-4 md:px-5 py-3 border-b border-gray-200 bg-white rounded-t-2xl">
              <p id="tm-view-title" className="font-semibold text-black truncate min-w-0">
                “{viewReport.query}”
                <span className="ml-2 text-xs font-normal text-gray-500">
                  {new Date(viewReport.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </p>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadHistoryReport(viewReport, viewReport)}
                  disabled={downloadingId !== null}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black text-white text-xs font-medium disabled:opacity-50"
                >
                  <FaFilePdf /> {downloadingId === viewReport.id ? "Preparing…" : "Download report"}
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setViewReport(null)}
                  aria-label="Close report"
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-black"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            <div className="p-2 sm:p-4 overflow-x-auto">
              {viewReport.results?.length ? (
                <TrademarkReport
                  results={viewReport.results}
                  query={viewReport.query}
                  queryType={viewReport.queryType}
                  classes={viewReport.classNumbers || "All"}
                  total={viewReport.totalCount ?? viewReport.results.length}
                  reportDate={localDate(viewReport.createdAt)}
                  assessment={viewReport.assessment && { ...viewReport.assessment, reportRef: viewReport.reportRef }}
                />
              ) : (
                <p className="py-10 text-center text-gray-600">No matching trademarks were found for this search.</p>
              )}
            </div>
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
            queryType={historyReport.queryType}
            classes={historyReport.classNumbers || "All"}
            total={historyReport.totalCount ?? historyReport.results.length}
            reportDate={localDate(historyReport.createdAt)}
            assessment={historyReport.assessment && { ...historyReport.assessment, reportRef: historyReport.reportRef }}
          />
        </div>
      )}

      {/* Results */}
      <section className={embedded ? "w-full py-6" : "max-w-6xl mx-auto px-4 sm:px-6 py-10"}>
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
                {submitted.preview && (
                  <img src={submitted.preview} alt="" className="inline-block align-middle h-8 w-8 object-contain rounded border border-gray-200 bg-white mr-2" />
                )}
                {total != null ? (
                  <>
                    <span className="font-semibold text-black">{total.toLocaleString("en-IN")}</span> result
                    {total === 1 ? "" : "s"} for{" "}
                  </>
                ) : (
                  "Results for "
                )}
                <span className="font-semibold text-black">“{submitted.q}”</span>
                {submitted.type === "COMPOSITE" && <> + your logo</>}
                {submitted.tmClass && <> in Class {submitted.tmClass}</>}
                {submitted.type === "COMPOSITE" && result.nameCount != null && (
                  <span className="text-sm text-gray-500">
                    {" "}({result.nameCount.toLocaleString("en-IN")} by name · {logoExtra} by logo)
                  </span>
                )}
              </p>
              {results.length > 0 && (
                <div className="flex flex-wrap items-center gap-4">
                  <p className="text-sm text-gray-500">
                    Showing {startIndex + 1}–{startIndex + results.length}
                  </p>
                  {!unlocked && !gate.leadGate && (
                    <button
                      onClick={askToSignIn}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FFC72C] hover:bg-[#FFBD00] text-black text-sm font-semibold"
                    >
                      <FaLock /> Sign up to view report
                    </button>
                  )}
                  {unlocked && (
                    <button
                      onClick={handleDownload}
                      disabled={downloading || loading || assessmentLoading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FFC72C] hover:bg-[#FFBD00] text-black text-sm font-medium disabled:opacity-60"
                    >
                      <FiDownload /> {downloading ? "Preparing PDF…" : "Download report (PDF)"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {results.length === 0 ? (
              <div className="rounded-2xl bg-white border border-gray-200 p-10 text-center">
                <p className="text-lg font-semibold text-black mb-1">No matching trademarks found</p>
                <p className="text-gray-600 mb-6">
                  That's a good sign — but a search alone isn't a guarantee. Our experts can do a detailed check and
                  file it for you.
                </p>
                <button
                  onClick={openTrademarkService}
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
                    results={results.map((r) => ({ ...MASKED_ROW, status: r.status, classNumber: r.classNumber, matchedBy: r.matchedBy }))}
                    query={submitted.q}
                    queryType={submitted.type}
                    logoSrc={submitted.preview}
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
                  queryType={submitted.type}
                  logoSrc={submitted.preview}
                  classes={submitted.tmClass || "All"}
                  total={total ?? results.length}
                  startIndex={startIndex}
                  page={page + 1}
                  pageCount={pagedTotal != null ? Math.max(1, Math.ceil(pagedTotal / PAGE_SIZE)) : page + 1}
                  assessment={assessment}
                  assessmentLoading={assessmentLoading}
                />
              </motion.div>
            )}

            {unlocked && (hasPrev || hasNext) && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  disabled={!hasPrev || loading}
                  onClick={() => runSearch(submitted, page - 1)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-800 shadow-sm hover:border-gray-400 disabled:opacity-40"
                >
                  <FaChevronLeft className="text-xs" /> Previous
                </button>
                <span className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs text-gray-600">
                  Page <span className="font-semibold text-gray-900">{page + 1}</span>
                  {pagedTotal != null && <> of {Math.max(1, Math.ceil(pagedTotal / PAGE_SIZE))}</>}
                </span>
                <button
                  disabled={!hasNext || loading}
                  onClick={() => runSearch(submitted, page + 1)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#F5A623] hover:bg-[#EE9A10] text-white text-sm font-semibold shadow-sm disabled:opacity-40"
                >
                  Next <FaChevronRight className="text-xs" />
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

        {(!embedded || results.length > 0) && (
          <div
            className="relative overflow-hidden mt-16 md:mt-24 rounded-[24px] px-8 md:px-12 py-10 md:py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            style={{ background: "radial-gradient(90% 160% at 45% 0%, #3d3f45 0%, #16171a 45%, #000000 100%)" }}
          >
            <h3 className="text-white text-3xl md:text-5xl font-semibold tracking-tight">Ready to Protect Your Brand?</h3>
            <button
              type="button"
              onClick={openTrademarkService}
              className="shrink-0 inline-flex items-center gap-10 pl-6 pr-5 py-3 rounded-full bg-[#FFC72C] hover:bg-[#FFBD00] text-black text-sm font-semibold"
            >
              Get Started <FaArrowRight />
            </button>
          </div>
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

import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent } from "../utils/analytics";
import { metaPixelPage, metaPixelTrack } from "../utils/metaPixel";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaSearch,FaChevronLeft, FaChevronRight, FaArrowRight, FaFilePdf, FaLock, FaImage, FaTimes, FaWhatsapp } from "react-icons/fa";
import {
  searchTrademarks,
  searchTrademarksByImage,
  getTrademarkSearchHistory,
  getTrademarkSearchHistoryEntry,
  getTrademarkAssessment,
  fetchTrademarkImage,
  sendTrademarkReportToWhatsApp,
} from "../api/TrademarkApi";
import { NICE_CLASSES } from "../components/ExixistingCompany/existingCompanyData";
import { LeadCaptureModal, requireVerifiedCustomer } from "../components/ExixistingCompany/FlowRunner";
import { FiDownload } from "react-icons/fi";
import TrademarkReport from "../components/Trademark/TrademarkReport";
import TrademarkHeroArt from "../components/Trademark/TrademarkHeroArt";
import TrademarkLandingSections from "../components/Trademark/TrademarkLandingSections";
import ClassSelect from "../components/Trademark/ClassSelect";
import HistoryMenu from "../components/Trademark/HistoryMenu";
import WhatsAppReportModal from "../components/Trademark/WhatsAppReportModal";
import SigninModal from "../components/Modals/SigninModal";
import ServiceDetails from "./ServiceDetails";
import { saveElementAsPdf } from "../utils/elementToPdf";
import "../components/newco-theme.css";

const PAGE_SIZE = 10;
const TRADEMARK_SERVICE_ID = 344;

const SEARCH_TYPES = [
  // shortPlaceholder: phones, where the long one gets cut off
  { value: "WORD_MARK", label: "Brand name", placeholder: "Enter your brand name (e.g. Bizpole)", shortPlaceholder: "Enter your brand name" },
  { value: "PROPRIETOR_NAME", label: "Owner", placeholder: "e.g. Bizpole India Pvt Ltd" },
  { value: "APPLICATION_NUMBER", label: "Application no.", placeholder: "e.g. 5123456" },
  { value: "IMAGE", label: "Logo", placeholder: "Upload your logo (PNG or JPG, up to 2 MB)", shortPlaceholder: "Upload logo (PNG/JPG, 2 MB)" },
];

const PHONE_QUERY = "(max-width: 639px)";
const useIsPhone = () => {
  const [isPhone, setIsPhone] = useState(() => typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const onChange = (e) => setIsPhone(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isPhone;
};

// Highlight-card icons (same line icons as the static /trademark-search/meta page).
const hlIcon = (children) => {
  const Icon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
  return Icon;
};

const HIGHLIGHTS = [
  {
    icon: hlIcon(<><path d="M3 21l1.65-4.6A8.5 8.5 0 1 1 7.6 19.4z" /><path d="M9 10.5c.5 1.6 1.9 3 3.5 3.5l1.2-1.1 2 .9c-.2 1.3-1.2 2-2.4 1.8-2.9-.5-5.3-2.9-5.8-5.8-.2-1.2.5-2.2 1.8-2.4l.9 2z" /></>),
    title: "Free report on WhatsApp",
    text: "Saved in your chat, not lost in email",
  },
  {
    icon: hlIcon(<><path d="M3.5 17a9 9 0 1 1 17 0" /><path d="M12 14l4-5" /><circle cx="12" cy="14" r="1.5" /></>),
    title: "Approval score",
    text: <>Your approval odds, <span className="whitespace-nowrap">0–100</span></>,
  },
  {
    icon: hlIcon(<path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 11v2" />),
    title: "Sound-alike check",
    text: "Catches names that sound similar",
  },
  {
    icon: hlIcon(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /><path d="M16.5 3.5l1.5 1.5 3-3" /></>),
    title: "Next steps",
    text: "What to fix before you file",
  },
];

// "Brand names checked" counter — same formula as the static page: starts at 200 on
// 20 Nov 2026 (IST) and climbs 10–20 a day. NOTE: computed, not read from real searches.
function brandsCheckedCount() {
  const DAY = 864e5, start = Date.UTC(2026, 10, 20) - 19800000;
  const t = Date.now() - start, days = Math.max(0, Math.floor(t / DAY)), frac = t > 0 ? (t % DAY) / DAY : 0;
  const inc = (i) => 10 + ((Math.imul(i + 7, 2654435761) >>> 0) % 11);
  let v = 200;
  for (let i = 0; i < days; i++) v += inc(i);
  v += Math.floor(inc(days) * frac);
  if (v % 10 === 0) v += 1;
  return v.toLocaleString("en-IN");
}

const LOGO_TYPES = ["image/png", "image/jpeg"];
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
// Messages about the visitor's own input — the error popup titles these
// "Check your search" rather than "Something went wrong".
const INPUT_ERROR = /^(Enter at least|Choose your logo|Logo must)/;

const typeLabel = (value) =>
  value === "COMPOSITE" ? "Name + logo" : SEARCH_TYPES.find((t) => t.value === value)?.label || value;
// Local calendar date as YYYY-MM-DD (the report's date format).
export const localDate = (d) => new Date(d).toLocaleDateString("en-CA");
export const fileSafe = (s) => String(s || "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "search";

// The off-screen report's images are lazy-loaded, so they never load on their
// own; force them and wait (bounded) before the PDF snapshot.
export async function waitForImages(el) {
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
export const pdfOptions = (reportRef) => ({
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
      metaPixelTrack("TMApplyClick", { cta: "search-results" });
      navigate(`/services/${TRADEMARK_SERVICE_ID}`);
      return;
    }
    setShowTrademarkService(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const [type, setType] = useState("WORD_MARK");
  const [query, setQuery] = useState("");
  const isPhone = useIsPhone();
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

  // Meta Pixel (public page only — not the signed-in dashboard copy): retargeting audience
  useEffect(() => {
    if (!embedded) metaPixelPage({ content_name: "Free Trademark Search" });
  }, [embedded]);

  // Probability of registration for the brand-name search on screen. Fetched
  // once per search (not per page) after the report is unlocked; the server
  // caches it and saves it with the history entry.
  const [assessment, setAssessment] = useState(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const hasResults = !!result?.results?.length;
  // Visitors who got the report on WhatsApp aren't signed in, so /assessment
  // would refuse them — the WhatsApp send returns the assessment instead.
  const [waAssessment, setWaAssessment] = useState(null); // { q, tmClass, data }
  useEffect(() => {
    setAssessment(null);
    // A name + logo search is assessed on its name.
    if (!unlocked || !hasResults || !hasBrandName(submitted?.type)) return undefined;
    if (!localStorage.getItem("token")) {
      if (waAssessment && waAssessment.q === submitted.q && waAssessment.tmClass === (submitted.tmClass || "")) {
        setAssessment(waAssessment.data);
      }
      return undefined;
    }
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
  }, [unlocked, hasResults, submitted?.q, submitted?.type, submitted?.tmClass, waAssessment]);

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
      // Over the limit: no popup — the "free searches used" banner replaces the form.
      if (err.response?.data?.limitReached) {
        markLimitReached(err);
      } else {
        setUnlocked(true); // couldn't save it to the history, but they did sign in
      }
    }
    loadHistory();
  };
  // immediate: an already signed-in customer sees the report at once — the sales
  // Lead is raised in the background rather than holding the report locked.
  const askToSignIn = () => requireVerifiedCustomer(gate, bumpGate, onVerified, { immediate: true });

  // Not signed in: instead of sign-up, ask name, mobile, state and language and
  // send the report to their WhatsApp (server saves it for that mobile and
  // raises the Lead). The details are kept for this visit, so their later
  // searches go to WhatsApp without asking again.
  const [waOpen, setWaOpen] = useState(false);
  const [waSignIn, setWaSignIn] = useState(false);
  const [waNotice, setWaNotice] = useState("");
  const waContact = useRef(null);

  const sendToWhatsApp = async (contact, params, firstSend = true) => {
    try {
      const data = await sendTrademarkReportToWhatsApp({ ...contact, params, limit: PAGE_SIZE, firstSend });
      setWaNotice(data.message);
      if (data.assessment) setWaAssessment({ q: params.q, tmClass: params.tmClass || "", data: data.assessment });
    } catch (err) {
      throw new Error(err.response?.data?.message || "Could not send your report right now. Please try again.");
    }
  };

  const submitWhatsAppDetails = async (contact) => {
    await sendToWhatsApp(contact, lastSearch.current.params);
    waContact.current = contact;
    setWaOpen(false);
    setUnlocked(true);
  };

  const askForReport = () => {
    if (localStorage.getItem("token")) askToSignIn();
    else {
      setWaOpen(true);
      trackEvent("whatsapp_report_form_open", { form: "trademark_whatsapp", path: window.location.pathname });
      if (!embedded) metaPixelTrack("TMPopupOpen", { search_type: lastSearch.current?.params?.type });
    }
  };

  const activeType = SEARCH_TYPES.find((t) => t.value === type);
  const placeholder = (isPhone && activeType.shortPlaceholder) || activeType.placeholder;

  const runSearch = async (params, nextPage) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchSearch(params, nextPage);
      if (!nextPage) trackEvent("trademark_search", { search_type: params.type, results: data?.total ?? data?.results?.length ?? 0 });
      if (!nextPage && !embedded) metaPixelTrack("Search", { search_type: params.type, results: data?.total ?? data?.results?.length ?? 0 });
      setResult(data);
      setSubmitted(params);
      setPage(nextPage);
      lastSearch.current = { params, page: nextPage, saved: !!data?.usage };
      if (data?.usage) {
        setHistory((h) => ({ ...h, signedIn: true, usage: { used: data.usage.used, limit: data.usage.limit } }));
        loadHistory();
      }
      if (data?.results?.length && !localStorage.getItem("token") && waContact.current) {
        // A new search (not another page) by a visitor who already gave their details.
        if (nextPage === 0) sendToWhatsApp(waContact.current, params, false).catch((err) => setError(err.message));
      } else if (!unlocked && data?.results?.length) {
        askForReport();
      }
    } catch (err) {
      if (err.response?.data?.limitReached) markLimitReached(err);
      else setError(err.response?.data?.message || "Could not search trademarks right now. Please try again.");
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

  // Arriving from the /trademark-search landing page while signed in
  // (?type=&q=&class=): set the tab/class, fill the box and run that search once.
  // A logo search can't carry its file in a link, so it just opens the Logo tab.
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    const sp = new URLSearchParams(window.location.search);
    const t = SEARCH_TYPES.some((s) => s.value === sp.get("type")) ? sp.get("type") : "WORD_MARK";
    const n = Number(sp.get("class"));
    const cls = Number.isInteger(n) && n >= 1 && n <= 45 ? n : "";
    if (!sp.get("type") && !sp.get("q")) return;
    setType(t);
    setTmClass(cls);
    const q = (sp.get("q") || "").trim().slice(0, 100);
    if (t === "IMAGE" || q.length < 2) return;
    setQuery(q);
    // Only auto-run when our own /trademark-search page sent the visitor here
    // (it sets this one-time, same-tab flag) — a link from anywhere else just
    // prefills, so it can't spend the customer's free searches.
    let fromLanding = false;
    try {
      fromLanding = sessionStorage.getItem("tm_autorun") === q;
      sessionStorage.removeItem("tm_autorun");
    } catch {
      fromLanding = false;
    }
    if (fromLanding) runSearch({ q, type: t, tmClass: cls }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        style={{ backgroundColor: "#FFFBEF" }}
      >
        {/* Background art (India map, skyline, yellow sweeps) + a fade into the
            page below so the results don't start on a hard edge. */}
        <div aria-hidden="true" className={`absolute inset-0 overflow-hidden pointer-events-none ${embedded ? "rounded-2xl" : ""}`}>
          <div
            className="absolute inset-0 bg-no-repeat bg-cover bg-[position:70%_top]"
            style={{ backgroundImage: "url('/Images/trbg.jpeg')" }}
          />
          {!embedded && (
            <div
              className="absolute inset-x-0 bottom-0 h-24"
              style={{ background: "linear-gradient(180deg, rgba(249,250,251,0) 0%, #F9FAFB 100%)" }}
            />
          )}
        </div>

        <div
          className={`relative z-10 ${
            // Dashboard: fill the content area (it already pads the page) — no side gutters.
            // Sizes are in px: the site's root font is 13px, so rem classes render
            // the hero noticeably smaller than the design.
            embedded ? "w-full px-4 sm:px-6 lg:px-8 py-8 md:py-10" : "max-w-[1490px] mx-auto px-4 sm:px-6 pt-5 pb-7"
          }`}
        >
          <div className="relative">
            {/* Pokes past the container's right edge on wide screens, as in the
                design — never past the viewport. */}
            <TrademarkHeroArt
              className="hidden lg:block absolute top-[40px] xl:top-[27px] w-[320px] xl:w-[380px] 2xl:w-[450px]"
              style={{ right: embedded ? 0 : "calc(-1 * min(95px, max(0px, (100vw - 1490px) / 2)))" }}
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col"
            >
              <div className="w-full lg:w-[62%] xl:w-[64%] text-center lg:text-left">
                <p className="inline-flex items-center gap-2 rounded-full border border-[#FDE9A8] bg-[#FFF6D6] py-1.5 pl-3 pr-4 text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.08em] text-[#9A5B06]">
                  <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60 motion-safe:animate-ping" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-600" />
                  </span>
                  <b className="text-[15px] sm:text-[16px] font-extrabold normal-case tracking-normal text-[#0B0B0B] tabular-nums">
                    {brandsCheckedCount()}
                  </b>
                  brand names checked so far
                </p>
                <h1 className="mt-4 text-[40px] sm:text-[54px] lg:text-[58px] xl:text-[66px] font-extrabold text-[#0B0B0B] leading-[1.1] tracking-tight">
                  Brand protection
                  <br />
                  starts with a <span className="text-[#FFC21A]">search.</span>
                </h1>
                <p className="text-gray-600 text-[15px] md:text-[17px] leading-[26px] max-w-[660px] mx-auto lg:mx-0 mt-5 md:mt-6">
                  One free search today can save you a costly rebrand tomorrow. Get your expert report instantly on WhatsApp.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Highlights — hidden on phones so the search box sits right under the intro */}
          <div className="relative hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-[26px] mt-9 xl:pr-[80px]">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="flex flex-col items-start gap-3 bg-white rounded-2xl px-5 xl:px-6 py-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-white"
              >
                <span className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-[#FFF6D6] text-[#F5B400]">
                  <Icon />
                </span>
                <div className="min-w-0">
                  <p className="text-[16px] xl:text-[18px] font-semibold text-black leading-snug">{title}</p>
                  <p className="text-[13.5px] xl:text-[14.5px] text-gray-500 leading-snug mt-0.5">{text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 sm:mt-12 lg:mt-16" />

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
          <form onSubmit={handleSubmit} className="xl:pl-[29px]">
            {/* One row on phones: smaller pills, scrolls sideways if a screen is too narrow */}
            <div className="flex flex-nowrap sm:flex-wrap justify-center-safe gap-1 min-[400px]:gap-1.5 sm:gap-2 mb-6 sm:mb-8 lg:mb-[46px] xl:pr-[8%] overflow-x-auto sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SEARCH_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`shrink-0 whitespace-nowrap h-[34px] sm:h-[37px] px-2.5 min-[400px]:px-3 sm:px-4 rounded-full text-[13px] sm:text-[15px] font-medium border transition ${
                    type === t.value
                      ? "bg-[#111827] text-white border-[#111827]"
                      : "bg-white text-gray-700 border-gray-200 hover:border-black hover:text-black"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Phones: search box / class + History / Search. From md: one row. */}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] md:flex md:flex-row gap-3 md:gap-[15px] text-[17px]">
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
                  className="relative col-span-2 md:flex-1 shrink-0 flex items-center gap-3 min-w-0 h-[56px] md:h-[60px] px-4 sm:px-5 rounded-xl border border-dashed border-gray-300 bg-white shadow-sm hover:border-yellow-400 cursor-pointer"
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
                      <span className="truncate text-sm text-gray-400 py-1">{placeholder}</span>
                    </>
                  )}
                </div>
              ) : (
              <div className="relative col-span-2 md:flex-1 shrink-0 min-w-0 h-[56px] md:h-[60px]">
                {/* md:flex-1 only — flex-1 in the phone column squashes the fixed height */}
                <FaSearch className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="tm-search-q"
                  type={type === "APPLICATION_NUMBER" ? "number" : "text"}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholder}
                  maxLength={100}
                  className={`w-full h-full pl-11 sm:pl-12 ${type === "WORD_MARK" ? (logo ? "pr-[84px] sm:pr-[150px]" : "pr-[60px] sm:pr-[150px]") : "pr-4"} rounded-xl border border-gray-200 bg-white shadow-sm text-[16px] sm:text-[18px] placeholder:text-gray-400 placeholder:text-[15px] sm:placeholder:text-[18px] focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400`}
                />
                {/* Optional logo: brand name + logo are then checked together. */}
                {type === "WORD_MARK" && (
                  <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2">
                    {logo ? (
                      <span className="flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-lg bg-yellow-50 border border-yellow-300 max-w-[7.5rem]">
                        <img src={logo.preview} alt="Your logo" className="h-6 w-6 object-contain rounded shrink-0" />
                        <span className="hidden sm:inline text-xs text-black truncate">+ logo</span>
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
                        aria-label="Add logo"
                        className="inline-flex items-center gap-2 px-3 sm:px-4 h-10 sm:h-9 rounded-lg border border-gray-300 text-[15px] font-medium text-gray-700 hover:border-black hover:text-black"
                      >
                        {/* Icon only on phones so the brand name has room */}
                        <FaImage /> <span className="hidden sm:inline">Add logo</span>
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
                className="h-[50px] md:h-[56px] min-w-0 md:self-center md:w-[170px] xl:w-[226px] shrink-0 [&>button]:text-[15px] md:[&>button]:text-[17px] md:[&>button]:px-5"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                aria-label={loading ? "Searching" : "Search"}
                className="order-last md:order-none col-span-2 h-[52px] md:h-[56px] md:self-center md:w-[110px] xl:w-[131px] shrink-0 px-6 whitespace-nowrap rounded-xl bg-[#FFC72C] hover:bg-[#FFBD00] text-black text-[17px] md:text-[19px] font-bold shadow-[0_8px_20px_rgba(255,199,44,0.45)] inline-flex items-center justify-center disabled:cursor-wait"
              >
                {/* A spinner while searching — "Searching…" doesn't fit the button. */}
                {loading ? (
                  <span className="w-6 h-6 border-[3px] border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  "Search"
                )}
              </motion.button>
              {historyMenu("h-[50px] md:h-[58px] md:self-center md:w-[130px] xl:w-[151px] shrink-0 md:ml-[3px] [&>button]:px-4 md:[&>button]:px-6 [&>button]:text-[15px] md:[&>button]:text-[19px]")}
            </div>
            <div className="mt-4 flex items-center justify-center md:justify-start gap-4 text-[15px] text-gray-700">
              <span>{history.usage.limit} free searches included</span>
              {history.signedIn && (
                <>
                  <span className="w-[120px] h-1.5 rounded-full bg-gray-200 overflow-hidden">
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
              {INPUT_ERROR.test(error) ? "Check your search" : "Something went wrong"}
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
      <section className={embedded ? "w-full py-6" : "max-w-[1364px] mx-auto px-4 sm:px-6 py-10"}>
        {loading && !result && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white border border-gray-200 animate-pulse" />
            ))}
          </div>
        )}

        {result && (
          <>
            <div className={`flex flex-wrap items-center justify-between gap-3 mb-5 ${embedded ? "" : "xl:px-[56px]"}`}>
              <p className="text-gray-700 text-[17px]">
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
                  {!unlocked && !gate.leadGate && !waOpen && (
                    <button
                      onClick={askForReport}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FFC72C] hover:bg-[#FFBD00] text-black text-sm font-semibold"
                    >
                      {localStorage.getItem("token") ? (
                        <>
                          <FaLock /> Sign up to view report
                        </>
                      ) : (
                        <>
                          <FaWhatsapp /> Get report on WhatsApp
                        </>
                      )}
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

            {waNotice && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <FaWhatsapp className="mt-0.5 shrink-0 text-lg text-emerald-600" />
                <p className="flex-1">{waNotice}</p>
                <button type="button" aria-label="Dismiss" onClick={() => setWaNotice("")} className="text-emerald-600 hover:text-emerald-800">
                  <FaTimes />
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

      {/* Landing content (How it works, report, why, CTA, FAQs) — public page only */}
      {!embedded && (
        <TrademarkLandingSections
          onCheck={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            setTimeout(() => document.getElementById("tm-search-q")?.focus({ preventScroll: true }), 450);
          }}
        />
      )}

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

      {waOpen && (
        <WhatsAppReportModal
          initial={waContact.current}
          onSubmit={submitWhatsAppDetails}
          onClose={() => setWaOpen(false)}
          onSignIn={() => {
            setWaOpen(false);
            setWaSignIn(true);
          }}
        />
      )}
      {/* "Already have an account? Sign in" from the WhatsApp form — then the
          usual signed-in path (report unlocked, saved to their history). */}
      {waSignIn && (
        <SigninModal
          onClose={() => setWaSignIn(false)}
          onSuccess={() => {
            setWaSignIn(false);
            askToSignIn();
          }}
        />
      )}
    </div>
  );
}

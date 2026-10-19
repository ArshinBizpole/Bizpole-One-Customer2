import { forwardRef } from "react";
import {
  FiCalendar, FiSearch, FiLayers, FiUser, FiFileText, FiHome, FiCreditCard, FiPhone, FiMail, FiMapPin,
  FiNavigation, FiBriefcase, FiUserCheck, FiCheck,
} from "react-icons/fi";
// Same logo as the site navbar (public/Images/image.png — same origin, so it renders in the PDF too).
const BIZPOLE_ONE_LOGO = "/Images/image.png";
// Trademark search illustration (public/Images/trademark.jpeg).
const TRADEMARK_ART = "/Images/trademark.jpeg";

// Trademark Search Report, laid out like Bizpole's report format (numbered
// sections 1–6, registration meter, signatures) in the brand's white / yellow look. Brand-name searches carry the probability assessment (sections 3–5,
// see the server's trademarkAssessment.service.js); every report ends with the
// registry results as an annexure.

// Status pill colours: live marks green, dead marks red, anything still in the
// registry pipeline amber.
function statusTone(status = "") {
  const s = status.toLowerCase();
  if (/(abandoned|refused|withdrawn|removed|expired|rejected)/.test(s)) return { pill: "bg-red-50 text-red-600 border-red-100", dot: "bg-red-500" };
  if (/registered/.test(s)) return { pill: "bg-emerald-50 text-emerald-600 border-emerald-100", dot: "bg-emerald-500" };
  return { pill: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500" };
}

// Closest-mark similarity pill: identical green, sound-alike amber, others orange.
function similarityTone(similarity = "") {
  const s = similarity.toLowerCase();
  if (/identical/.test(s)) return "bg-emerald-50 text-emerald-600 border-emerald-100";
  if (/sound|phonetic/.test(s)) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-orange-50 text-orange-600 border-orange-100";
}

// "ACME PVT LTD Body Incorporate" → name + entity type, shown on two lines.
const ENTITY_SUFFIX = /\s*(Body Incorporate|Single Firm|Partnership Firm|Proprietorship|Proprietor|Individual|Trust|Society|LLP)\s*$/i;
function splitOwner(owner = "") {
  const m = owner.match(ENTITY_SUFFIX);
  if (!m || m.index === 0) return { name: owner, entity: "" };
  return { name: owner.slice(0, m.index), entity: m[1] };
}

const today = () => new Date().toISOString().slice(0, 10);

// "2026-10-18" → "18-Oct-2026", the report format's date style.
function formatDate(value) {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value || "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="shrink-0 w-9 h-9 rounded-lg bg-[#FDE9A6] text-amber-700 flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        <p className="text-base font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}

function SectionHeader({ number, children, size = "md" }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="shrink-0 w-8 h-8 rounded-full bg-[#FFF1C2] text-amber-700 flex items-center justify-center font-semibold text-sm">
        {number}
      </span>
      <div>
        <h3 className={`${size === "lg" ? "text-2xl" : "text-xl"} font-bold text-gray-900 tracking-tight`}>{children}</h3>
        <div className="w-8 h-[3px] rounded-full bg-yellow-400 mt-1" />
      </div>
    </div>
  );
}

const Card = ({ className = "", children, ...rest }) => (
  <div className={`rounded-2xl border border-gray-100 bg-white shadow-[0_4px_24px_rgba(17,24,39,0.05)] ${className}`} {...rest}>
    {children}
  </div>
);

// ------------------------------------------------------------- meter

// Meter bands: 0–49 low, 50–74 moderate, 75–100 high.
const BANDS = [
  { from: 0, to: 50, color: "#EF4444", light: "#FEE2E2", fill: 30, label: "0 – 49%", title: "Low chance", note: "Strong prior marks exist. Consider a new mark.", pill: "bg-red-50 text-red-600" },
  { from: 50, to: 75, color: "#FBBF24", light: "#FEF3C7", fill: 60, label: "50 – 74%", title: "Moderate chance", note: "Objection possible. File with suggested changes.", pill: "bg-amber-50 text-amber-700" },
  { from: 75, to: 100, color: "#4ADE80", light: "#DCFCE7", fill: 100, label: "75 – 100%", title: "High chance", note: "Mark is largely clear. File at the earliest.", pill: "bg-emerald-50 text-emerald-600" },
];
const bandOf = (v) => BANDS.find((b) => v < b.to) || BANDS[BANDS.length - 1];

const G = { cx: 200, cy: 190, r: 150, w: 36 };
const at = (pct) => {
  const a = Math.PI * (1 - pct / 100);
  return [G.cx + G.r * Math.cos(a), G.cy - G.r * Math.sin(a)];
};
const arc = (from, to) => {
  const [x1, y1] = at(from);
  const [x2, y2] = at(to);
  return `M${x1} ${y1} A${G.r} ${G.r} 0 0 1 ${x2} ${y2}`;
};

function RegistrationMeter({ value }) {
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const band = bandOf(v);
  const pillW = band.title.length * 6.4 + 28;
  return (
    <svg viewBox="0 0 400 250" className="w-full max-w-[380px]" role="img" aria-label={`Registration chance ${v}%`}>
      {/* Red and green ends are rounded; yellow sits flush between them. */}
      <path d={arc(0, 50)} stroke={BANDS[0].color} strokeWidth={G.w} fill="none" strokeLinecap="round" />
      <path d={arc(50, 75)} stroke={BANDS[1].color} strokeWidth={G.w} fill="none" strokeLinecap="butt" />
      <path d={arc(75, 100)} stroke={BANDS[2].color} strokeWidth={G.w} fill="none" strokeLinecap="round" />
      <text x={G.cx} y={G.cy - 72} textAnchor="middle" fontSize="11" fontWeight="600" letterSpacing="0.5" fill="#6B7280">
        REGISTRATION CHANCE
      </text>
      <text x={G.cx} y={G.cy - 18} textAnchor="middle" fontSize="50" fontWeight="800" fill="#111827">{v}%</text>
      <rect x={G.cx - pillW / 2} y={G.cy - 6} width={pillW} height="22" rx="11" fill={band.light} />
      <text x={G.cx} y={G.cy + 9} textAnchor="middle" fontSize="12" fontWeight="500" fill={band.color === "#FBBF24" ? "#B45309" : band.color}>
        {band.title}
      </text>
      <text x={G.cx - G.r} y={G.cy + 42} textAnchor="middle" fontSize="12" fill="#6B7280">0%</text>
      <text x={G.cx + G.r} y={G.cy + 42} textAnchor="middle" fontSize="12" fill="#6B7280">100%</text>
    </svg>
  );
}

// ------------------------------------------------------------- tables

// Soft-yellow header table used inside the report (class-wise, closest marks…).
function ReportTable({ head, align = [], children, minWidth = 640 }) {
  return (
    <div className="rounded-xl border border-[#FBEFC4] overflow-x-auto">
      <table className="w-full text-xs" style={{ minWidth }}>
        <thead>
          <tr className="bg-[#FFF6D1] text-gray-900">
            {head.map((h, i) => (
              <th key={h} className={`px-4 py-3 font-semibold ${align[i] === "center" ? "text-center" : "text-left"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-gray-700 bg-white">{children}</tbody>
      </table>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3.5 py-2.5 rounded-lg bg-[#F8F9FB] border border-gray-100 min-w-0">
      <span className="flex items-center gap-2.5 text-xs font-medium text-gray-800 shrink-0">
        <Icon className="w-4 h-4 text-gray-500" /> {label}
      </span>
      <span className="text-xs text-gray-600 text-right break-words min-w-0">{value || "—"}</span>
    </div>
  );
}

const MARK_TYPES = [
  { key: "word", title: "Word Mark", sub: "Name / text only, any font" },
  { key: "logo", title: "Logo", sub: "Device / symbol only, no text" },
  { key: "composite", title: "Composite", sub: "Name + logo together" },
];

const VERDICTS = [
  { key: "can_apply", title: "Can be applied", sub: "File as searched" },
  { key: "apply_with_changes", title: "Apply with changes", sub: "Modify name / add logo" },
  { key: "not_advisable", title: "Not advisable", sub: "Choose a different mark" },
];
// Selected verdict card: tinted in its own colour.
const VERDICT_ON = {
  can_apply: { card: "bg-emerald-50 border-emerald-300", title: "text-emerald-700", sub: "text-emerald-600" },
  apply_with_changes: { card: "bg-[#FFF8E1] border-yellow-300", title: "text-amber-800", sub: "text-amber-700" },
  not_advisable: { card: "bg-red-50 border-red-200", title: "text-red-600", sub: "text-red-500" },
};

const PRIORITY = {
  must: { label: "Must apply", cls: "text-emerald-600", dot: "bg-emerald-500" },
  recommended: { label: "Recommended", cls: "text-amber-600", dot: "bg-amber-500" },
  optional: { label: "Optional", cls: "text-gray-500", dot: "bg-gray-400" },
};

const chancePill = (c) =>
  c >= 75 ? "bg-emerald-50 text-emerald-600" : c >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600";

// ------------------------------------------------------------- report

/**
 * Printable Trademark Search Report.
 * @param {object[]} results  normalized trademark rows (see trademarkSearch.service.js)
 * @param {string}   query    the searched text
 * @param {string}   queryType  WORD_MARK | PROPRIETOR_NAME | APPLICATION_NUMBER | IMAGE | COMPOSITE (name + logo)
 * @param {string}   logoSrc  uploaded logo (logo and name + logo searches)
 * @param {string}   classes  class filter label, e.g. "30" or "All"
 * @param {number}   total    total matches (falls back to results.length)
 * @param {number}   startIndex  row offset of this page, for the # column
 * @param {object}   assessment  probability of registration + applicant (brand-name searches), or null
 * @param {boolean}  assessmentLoading  placeholder while the assessment is computed
 */
const TrademarkReport = forwardRef(function TrademarkReport(
  {
    results = [], query, queryType = "WORD_MARK", logoSrc = null, classes, total, reportDate = today(),
    startIndex = 0, page = 1, pageCount = 1, assessment = null, assessmentLoading = false,
  },
  ref
) {
  const a = assessment;
  const applicant = a?.applicant;
  const isLogo = queryType === "IMAGE";
  const isComposite = queryType === "COMPOSITE"; // brand name + logo together
  const isMarkSearch = queryType === "WORD_MARK" || isLogo || isComposite;
  const searchDate = formatDate(reportDate);
  const shownQuery = isLogo ? "Logo search" : String(query || "—").replace(/ \+ logo$/i, "");
  const markType = isLogo ? "logo" : isComposite ? "composite" : "word";
  let n = 0;
  const next = () => ++n;

  return (
    <div ref={ref} className="relative overflow-hidden bg-white rounded-2xl shadow-[0_4px_30px_rgba(17,24,39,0.06)] border border-gray-100">
      {/* Decorative corner wash — on screen only: the illustration is a white-backed
          JPEG and the blend that hides its background isn't reproduced in the PDF. */}
      <div data-pdf-hide className="pointer-events-none absolute -top-28 -right-28 w-[440px] h-[560px] rounded-full bg-[#FFE69A]/70" />
      <div data-pdf-hide className="pointer-events-none absolute top-10 right-24 w-40 h-40 rounded-full bg-[#FFF3C9]" />

      {/* Header */}
      <div data-pdf-section className="relative px-6 sm:px-10 pt-8">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <img src={BIZPOLE_ONE_LOGO} alt="Bizpole One" className="h-10 sm:h-12 w-auto" />
            <div className="w-10 h-1 rounded-full bg-yellow-400 mt-8 mb-5" />
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
              Trade Mark Search <span className="text-[#F5B800]">Report</span>
            </h2>
            <p className="mt-3 max-w-xl text-gray-500 text-sm sm:text-base leading-relaxed">
              Pre-filing availability assessment based on the trademark query and class details from the official
              trademark database · India · Trade Marks Act, 1999
            </p>
            {a?.reportRef && (
              <span className="mt-4 inline-block px-3.5 py-1 rounded-full bg-white border border-yellow-300 text-xs text-gray-800">
                Report Ref: <span className="font-semibold">{a.reportRef}</span>
              </span>
            )}
          </div>
          <img src={TRADEMARK_ART} alt="" className="hidden md:block shrink-0 w-40 lg:w-48 h-auto mix-blend-multiply relative" />
        </div>

        <div className="mt-7 lg:max-w-[78%] grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0 sm:divide-x divide-[#F1DE9C] rounded-xl bg-[#FFF5D2] px-4 py-4">
          <div className="sm:pr-5"><InfoItem icon={FiCalendar} label="Report date" value={searchDate} /></div>
          <div className="sm:px-5"><InfoItem icon={FiSearch} label="Search query" value={shownQuery} /></div>
          <div className="sm:pl-5"><InfoItem icon={FiLayers} label="Class(es)" value={classes || "All"} /></div>
        </div>
      </div>

      <div className="relative px-4 sm:px-8 pb-2">
        {/* 1 · Applicant details */}
        {applicant && (
          <div data-pdf-section className="mt-8">
            <Card className="p-5 sm:p-6">
              <SectionHeader number={next()}>Applicant Details</SectionHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
                <DetailRow icon={FiUser} label="Applicant Name" value={applicant.name} />
                <DetailRow icon={FiFileText} label="Applicant Type" value={applicant.applicantType} />
                <DetailRow icon={FiHome} label="Entity" value={applicant.entity} />
                <DetailRow icon={FiCreditCard} label="PAN / CIN" value={applicant.panOrCin} />
                <DetailRow icon={FiPhone} label="Contact Person" value={applicant.contactPerson} />
                <DetailRow icon={FiMail} label="Mobile / Email" value={[applicant.mobile, applicant.email].filter(Boolean).join(" / ")} />
                <DetailRow icon={FiMapPin} label="Address" value={applicant.address} />
                <DetailRow icon={FiNavigation} label="State" value={applicant.state} />
                <DetailRow icon={FiBriefcase} label="Nature of Business" value={applicant.businessNature} />
                <DetailRow icon={FiUserCheck} label="Business Advisor" value={applicant.advisor} />
              </div>
            </Card>
          </div>
        )}

        {/* 2 · Mark searched & mark type */}
        <div data-pdf-section className="mt-10 px-2">
          <SectionHeader number={next()}>{isMarkSearch ? "Mark Searched & Mark Type" : "Search Details"}</SectionHeader>
          <Card className="overflow-hidden grid grid-cols-1 sm:grid-cols-[2fr_1fr]">
            <div
              className="px-6 py-6"
              style={{ background: "linear-gradient(90deg, #FFFFFF 0%, #FFFBEB 45%, #FFF2C6 100%)" }}
            >
              <p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                {queryType === "PROPRIETOR_NAME" ? "Owner searched" : queryType === "APPLICATION_NUMBER" ? "Application no. searched" : "Trademark searched"}
              </p>
              <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight break-words">{shownQuery}</p>
              <p className="mt-4 text-xs text-gray-600 leading-relaxed">
                <span className="font-medium text-gray-900">Class(es) searched:</span>{" "}
                <span className="font-bold text-gray-900">{classes || "All"}</span>
                {a?.meaning && (
                  <>
                    <span className="mx-2 text-gray-300">|</span>
                    <span className="font-medium text-gray-900">Meaning / Language:</span> {a.meaning}
                  </>
                )}
              </p>
            </div>
            <div className="bg-[#F1F5F9] px-6 py-6 flex flex-col">
              <p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">Logo / Device</p>
              <div className="flex-1 flex items-center justify-center py-4">
                {logoSrc ? (
                  <img src={logoSrc} alt="Searched logo" className="h-20 w-auto object-contain" />
                ) : (
                  <p className="text-xs text-gray-500 text-center">Shown only for Logo / Composite searches</p>
                )}
              </div>
            </div>
          </Card>
          {isMarkSearch && (
            <div className="mt-4 mx-auto max-w-2xl grid grid-cols-3 rounded-xl border border-gray-200 overflow-hidden bg-white">
              {MARK_TYPES.map((o, i) => {
                const on = o.key === markType;
                return (
                  <div
                    key={o.key}
                    className={`px-3 py-2.5 text-center ${i ? "border-l border-gray-200" : ""} ${on ? "bg-[#FBBF24]" : ""}`}
                  >
                    <p className="text-sm font-semibold text-gray-900">{o.title}</p>
                    <p className={`text-[10px] mt-0.5 ${on ? "text-gray-800" : "text-gray-500"}`}>{o.sub}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3 · Probability of registration */}
        {assessmentLoading && (
          <div data-pdf-section className="mt-10 px-2">
            <SectionHeader number={next()}>Probability of Registration</SectionHeader>
            <Card className="p-8 flex items-center gap-4 text-sm text-gray-600">
              <span className="w-5 h-5 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
              Analysing similar marks to estimate your chance of registration…
            </Card>
          </div>
        )}
        {a && !assessmentLoading && (
          <>
            <div data-pdf-section className="mt-10 px-2">
              <SectionHeader number={next()}>Probability of Registration</SectionHeader>
              <Card data-pdf-grow className="px-5 sm:px-6 pt-6 pb-5">
                <div className="grid grid-cols-1 md:grid-cols-[1.2fr_auto_1fr] gap-6 items-center">
                  <div className="flex justify-center"><RegistrationMeter value={a.probability} /></div>
                  <div className="hidden md:block w-px self-stretch bg-gray-100 my-6" />
                  <div>
                    <p className="font-semibold text-gray-900 mb-4">How to read the meter</p>
                    <ul className="space-y-4">
                      {[...BANDS].reverse().map((b) => (
                        <li key={b.from} className="flex gap-3">
                          <span
                            className="mt-1 shrink-0 w-10 h-2.5 rounded-full"
                            style={{ background: `linear-gradient(90deg, ${b.color} 0 ${b.fill}%, ${b.light} ${b.fill}% 100%)` }}
                          />
                          <div>
                            <p className="text-xs font-semibold text-gray-900">{b.label} · {b.title}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">{b.note}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="mt-4 px-4 py-2.5 rounded-lg bg-[#F5F7FB] border border-gray-100 text-[11px] text-gray-600">
                  Overall probability that the searched mark will proceed to registration:{" "}
                  <span className="font-bold text-gray-900">{a.probability}%</span>
                  {` · AI-driven assessment of ${a.reviewed ? `${a.reviewed} ` : ""}registry results (similarity, class overlap & distinctiveness).`}
                </p>
              </Card>
            </div>

            {/* 4 · Our suggestion */}
            <div data-pdf-section className="mt-10 px-2">
              <SectionHeader number={next()}>Our Suggestion</SectionHeader>
              <div className="mx-auto max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-3">
                {VERDICTS.map((o) => {
                  const on = o.key === a.verdict ? VERDICT_ON[o.key] : null;
                  return (
                    <div key={o.key} className={`relative rounded-xl border px-4 py-3 ${on ? on.card : "bg-white border-gray-200"}`}>
                      <p className={`text-xs font-bold uppercase tracking-wide ${on ? on.title : "text-gray-800"}`}>{o.title}</p>
                      <p className={`text-[11px] mt-0.5 ${on ? on.sub : "text-gray-500"}`}>{o.sub}</p>
                      {on && <FiCheck className={`absolute top-3 right-3 w-4 h-4 ${on.title}`} />}
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 sm:px-4 space-y-2 text-xs leading-relaxed text-gray-700 max-w-3xl">
                <p><span className="font-semibold text-gray-900">Why: </span>{a.why}</p>
                {a.suggestedChange && <p><span className="font-semibold text-gray-900">Suggested change: </span>{a.suggestedChange}</p>}
              </div>
            </div>

            {a.recommendedClasses?.length > 0 && (
              <div data-pdf-section className="mt-6 px-2">
                <p className="mb-2 font-semibold text-gray-900">Classes you should apply in</p>
                <ReportTable head={["Class", "Covers", "Why this class", "Priority"]}>
                  {a.recommendedClasses.map((c) => {
                    const p = PRIORITY[c.priority] || PRIORITY.optional;
                    return (
                      <tr key={c.classNumber}>
                        <td className="px-4 py-3 font-semibold text-gray-900">{c.classNumber}</td>
                        <td className="px-4 py-3">{c.covers}</td>
                        <td className="px-4 py-3">{c.reason}</td>
                        <td className={`px-4 py-3 font-semibold whitespace-nowrap ${p.cls}`}>
                          <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${p.dot}`} />{p.label}
                        </td>
                      </tr>
                    );
                  })}
                </ReportTable>
                <p className="mt-1.5 text-[11px] text-gray-500">
                  <b>Must apply</b> — core business, file now · <b>Recommended</b> — closely related, protects against copycats ·{" "}
                  <b>Optional</b> — future expansion.
                </p>
              </div>
            )}

            {/* 5 · Class-wise search details + closest marks */}
            <Card className="mt-8 px-4 sm:px-6 py-6">
              <div data-pdf-section>
                <SectionHeader number={next()} size="lg">Class-wise Search Details</SectionHeader>
                {a.classWise?.length > 0 ? (
                  <ReportTable
                    head={["Class", "Description of Goods / Services", "Identical Marks", "Similar Marks", "Chance in Class"]}
                    align={["center", "left", "center", "center", "center"]}
                  >
                    {a.classWise.map((c) => (
                      <tr key={c.classNumber}>
                        <td className="px-4 py-3 font-semibold text-gray-900 text-center">{c.classNumber}</td>
                        <td className="px-4 py-3">{c.title || "—"}</td>
                        <td className="px-4 py-3 text-center">{c.identical}</td>
                        <td className="px-4 py-3 text-center">{c.similar}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${chancePill(c.chance)}`}>
                            {c.chance}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </ReportTable>
                ) : (
                  <p className="text-sm text-gray-600">No identical or similar live marks were found in any class.</p>
                )}
              </div>

              {a.closestMarks?.length > 0 && (
                <div data-pdf-section className="mt-8">
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">Closest marks found</h3>
                  <div className="w-8 h-[3px] rounded-full bg-yellow-400 mt-1 mb-4" />
                  <ReportTable
                    head={["Similar Mark", "App. No.", "Class", "Status", "Owner", "Similarity"]}
                    align={["left", "left", "left", "left", "left", "center"]}
                  >
                    {a.closestMarks.map((m, i) => {
                      const owner = splitOwner(m.proprietorName || "");
                      return (
                        <tr key={`${m.applicationNumber}-${i}`}>
                          <td className="px-4 py-3.5 font-semibold text-gray-900 break-words">{m.wordMark || "(Device mark)"}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap">{m.applicationNumber ?? "—"}</td>
                          <td className="px-4 py-3.5">{m.classNumber ?? "—"}</td>
                          <td className="px-4 py-3.5">
                            {m.status ? (
                              <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-medium whitespace-nowrap ${statusTone(m.status).pill}`}>
                                {m.status}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3.5 max-w-[240px] break-words">
                            <p className="text-[11px] font-semibold uppercase text-gray-800">{owner.name || "—"}</p>
                            {owner.entity && <p className="text-[10px] text-gray-500 mt-0.5">{owner.entity}</p>}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {m.similarity ? (
                              <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-medium whitespace-nowrap ${similarityTone(m.similarity)}`}>
                                {m.similarity}
                              </span>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </ReportTable>
                  <p className="mt-3 text-[10px] text-gray-500">
                    Sources: IP India Trade Marks Registry (word, phonetic &amp; logo search), Well-known Marks list, Trade Marks Journal.
                  </p>
                </div>
              )}
            </Card>
          </>
        )}

        {/* 6 · Disclaimer + sign-off */}
        <div data-pdf-section className="mt-10 px-2 sm:px-4">
          <SectionHeader number={next()} size="lg">Disclaimer</SectionHeader>
          <p className="sm:pl-11 text-xs leading-relaxed text-gray-600">
            This report is an advisory opinion based on records available on the IP India Trade Marks Registry and related public
            databases as on the search date. Applications filed recently, or not yet digitised, and unregistered use of similar
            marks may not appear in the search. The probability shown is Bizpole's professional estimate and not a guarantee; the
            final decision on registration rests with the Registrar of Trade Marks, and third parties may oppose the application.
            Bizpole is not liable for any objection, opposition or infringement claim arising from adoption or use of the mark.
            This report is confidential and intended only for the applicant named above.
          </p>
          <div className="sm:pl-11 mt-6 grid grid-cols-3 gap-6 text-sm">
            {[
              ["Prepared by", "Bizpole One · Trademark Search"],
              ["Reviewed by", "TM Attorney / Agent"],
              ["Date of Issue", searchDate],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="w-8 h-[3px] rounded-full bg-yellow-400 mb-3" />
                <p className="font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-1">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Annexure · registry results */}
        <div data-pdf-section className="mt-12 mb-5 px-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Search Results</h3>
            <div className="w-12 h-1 rounded-full bg-yellow-400 mt-2" />
          </div>
          <span className="px-4 py-1.5 rounded-full bg-[#FFF5D2] border border-yellow-300 text-sm text-gray-900">
            Total Results: <span className="font-bold ml-1">{total ?? results.length}</span>
            {pageCount > 1 && <span className="text-gray-500"> · Page {page} of {pageCount}</span>}
          </span>
        </div>
      </div>

      <div className="relative mx-4 sm:mx-10 rounded-xl border border-gray-100 shadow-[0_4px_20px_rgba(17,24,39,0.06)] overflow-x-auto">
        <table className="w-full min-w-[860px] text-xs">
          <thead>
            <tr className="bg-[#F4C524] text-gray-900 text-left">
              <th className="px-4 py-4 font-semibold w-10">#</th>
              <th className="px-4 py-4 font-semibold">Trademark</th>
              <th className="px-4 py-4 font-semibold">App. No.</th>
              <th className="px-4 py-4 font-semibold">Class</th>
              <th className="px-4 py-4 font-semibold text-center">Status</th>
              <th className="px-4 py-4 font-semibold">Owner</th>
              <th className="px-4 py-4 font-semibold">G&amp;S</th>
              <th className="px-4 py-4 font-semibold">User Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-600 bg-white">
            {results.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                  No matching trademarks found for this query.
                </td>
              </tr>
            ) : (
              results.map((tm, i) => {
                const tone = statusTone(tm.status);
                return (
                  <tr key={`${tm.applicationNumber}-${tm.classNumber}-${i}`}>
                    <td className="px-4 py-5 text-gray-500">{startIndex + i + 1}</td>
                    <td className="px-4 py-5">
                      <div className="w-24 flex flex-col items-center text-center">
                        {tm.image ? (
                          <img src={tm.image} alt={tm.wordMark} className="h-10 w-full object-contain" loading="lazy" />
                        ) : (
                          <span className="text-sm font-bold text-gray-900 break-words">{tm.wordMark || "—"}</span>
                        )}
                        <span className="mt-1 text-[10px] text-gray-700 break-words">{tm.wordMark || "(Device mark)"}</span>
                        {/* Name + logo searches: which of the two found this mark. */}
                        {tm.matchedBy && (
                          <span
                            className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                              tm.matchedBy === "logo" ? "bg-yellow-400 text-gray-900" : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {tm.matchedBy === "logo" ? "Logo match" : "Name match"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap">{tm.applicationNumber ?? "—"}</td>
                    <td className="px-4 py-5">{tm.classNumber ?? "—"}</td>
                    <td className="px-4 py-5 text-center">
                      {tm.status ? (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-medium whitespace-nowrap ${tone.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                          {tm.status}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-5 max-w-[150px] break-words">{tm.proprietorName || "—"}</td>
                    <td className="px-4 py-5 max-w-[260px] break-words">{tm.classDetail || "—"}</td>
                    <td className="px-4 py-5 max-w-[110px] break-words">{tm.userDetail || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* On screen only — the PDF draws this footer on every page. */}
      <div data-pdf-hide className="relative mx-6 sm:mx-16 mt-14 mb-8 pt-6 border-t border-gray-200 flex items-center justify-between gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-3">
          <img src={BIZPOLE_ONE_LOGO} alt="Bizpole One" className="h-6 w-auto" />
          <span className="text-gray-300">|</span>
          <span>Trademark Search Report</span>
        </div>
        <div className="flex items-center gap-3 text-gray-500">
          {pageCount > 1 ? `Page ${page} of ${pageCount}` : "Confidential"}
          <span className="w-7 h-1 rounded-full bg-yellow-400" />
        </div>
      </div>
    </div>
  );
});

export default TrademarkReport;

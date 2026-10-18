import { forwardRef } from "react";
import { FaRegCalendarAlt, FaSearch, FaLayerGroup } from "react-icons/fa";
// Same logo as the site navbar (public/Images/image.png — same origin, so it renders in the PDF too).
const BIZPOLE_ONE_LOGO = "/Images/image.png";
// Trademark search illustration (public/Images/trademark.jpeg).
const TRADEMARK_ART = "/Images/trademark.jpeg";

// Trademark Search Report, laid out like Bizpole's report format (numbered
// sections 1–6, speedometer, signatures) in the brand's white / yellow look. Brand-name searches carry the probability assessment (sections 3–5,
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

const today = () => new Date().toISOString().slice(0, 10);

// "2026-10-18" → "18-Oct-2026", the report format's date style.
function formatDate(value) {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value || "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 min-w-0">
      <span className="shrink-0 w-12 h-12 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}

function SectionHeader({ number, children }) {
  return (
    <div className="mt-8 mb-4 flex items-center gap-3">
      <span className="shrink-0 w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-lg">
        {number}
      </span>
      <div>
        <h3 className="text-2xl font-bold text-gray-900">{children}</h3>
        <div className="w-14 h-1 rounded-full bg-yellow-400 mt-1.5" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------- speedometer

// Meter bands: 0–49 low, 50–74 moderate, 75–100 high.
const BANDS = [
  { from: 0, to: 50, color: "#dc2626", label: "0 – 49%", title: "Low chance", note: "Strong prior marks exist. Consider a new mark." },
  { from: 50, to: 75, color: "#f5b800", label: "50 – 74%", title: "Moderate chance", note: "Objection possible. File with suggested changes." },
  { from: 75, to: 100, color: "#16a34a", label: "75 – 100%", title: "High chance", note: "Mark is largely clear. File at the earliest." },
];

const G = { cx: 200, cy: 200, r: 160, w: 48 };
const at = (pct, r) => {
  const a = Math.PI * (1 - pct / 100);
  return [G.cx + r * Math.cos(a), G.cy - r * Math.sin(a)];
};
function bandPath(from, to) {
  const ri = G.r - G.w;
  const [x1, y1] = at(from, G.r);
  const [x2, y2] = at(to, G.r);
  const [x3, y3] = at(to, ri);
  const [x4, y4] = at(from, ri);
  return `M${x1} ${y1} A${G.r} ${G.r} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${ri} ${ri} 0 0 0 ${x4} ${y4} Z`;
}

function Speedometer({ value }) {
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const [nx, ny] = at(v, G.r - 14);
  return (
    <svg viewBox="-40 0 480 270" className="w-full max-w-[420px]" role="img" aria-label={`Probability of registration ${v}%`}>
      {BANDS.map((b) => <path key={b.from} d={bandPath(b.from, b.to)} fill={b.color} />)}
      {Array.from({ length: 11 }, (_, i) => i * 10).map((t) => {
        const [x1, y1] = at(t, G.r + 8);
        const [x2, y2] = at(t, G.r + (t % 50 === 0 ? 20 : 15));
        return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6b7280" strokeWidth="1.5" />;
      })}
      <text x={G.cx} y={G.cy - G.r - 28} textAnchor="middle" fontSize="13" fill="#4b5563">50%</text>
      <text x={G.cx - G.r - 24} y={G.cy + 5} textAnchor="end" fontSize="13" fill="#4b5563">0%</text>
      <text x={G.cx + G.r + 24} y={G.cy + 5} textAnchor="start" fontSize="13" fill="#4b5563">100%</text>
      <line x1={G.cx} y1={G.cy} x2={nx} y2={ny} stroke="#374151" strokeWidth="5" strokeLinecap="round" />
      <circle cx={G.cx} cy={G.cy} r="15" fill="#facc15" />
      <circle cx={G.cx} cy={G.cy} r="7" fill="#fff" />
      <text x={G.cx} y={G.cy + 60} textAnchor="middle" fontSize="46" fontWeight="800" fill="#111827">{v}%</text>
    </svg>
  );
}

// ------------------------------------------------------------- tables

function ReportTable({ head, children, minWidth = 640 }) {
  return (
    <div className="rounded-xl border border-gray-100 overflow-x-auto">
      <table className="w-full text-xs" style={{ minWidth }}>
        <thead>
          <tr className="bg-yellow-400 text-gray-900 text-left">
            {head.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 text-gray-700 [&>tr:nth-child(even)]:bg-gray-50">{children}</tbody>
      </table>
    </div>
  );
}

function DetailsGrid({ rows }) {
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
    <table className="w-full text-sm">
      <tbody className="divide-y divide-gray-100">
        {rows.map(([l1, v1, l2, v2]) => (
          <tr key={l1} className="divide-x divide-gray-100">
            <th className="w-[17%] px-3 py-2.5 text-left font-semibold text-gray-900 bg-gray-50 align-top">{l1}</th>
            <td className="w-[33%] px-3 py-2.5 text-gray-700 break-words">{v1 || "—"}</td>
            <th className="w-[17%] px-3 py-2.5 text-left font-semibold text-gray-900 bg-gray-50 align-top">{l2}</th>
            <td className="w-[33%] px-3 py-2.5 text-gray-700 break-words">{v2 || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

// Three-way choice row (mark type, our suggestion): the selected cell is filled.
function ChoiceRow({ options, selected, fill = () => "bg-yellow-400 text-gray-900" }) {
  return (
    <div className="grid grid-cols-3 rounded-xl border border-gray-100 overflow-hidden">
      {options.map((o, i) => {
        const on = o.key === selected;
        return (
          <div key={o.key} className={`px-3 py-3 text-center ${i ? "border-l border-gray-100" : ""} ${on ? fill(o.key) : "bg-white text-gray-500"}`}>
            <p className={`text-sm font-bold uppercase inline-flex items-center gap-2 ${on ? "" : "text-gray-800"}`}>
              <span className="w-3.5 h-3.5 border-2 border-current rounded-[3px] inline-flex items-center justify-center text-[10px] leading-none">
                {on && "✓"}
              </span>
              {o.title}
            </p>
            <p className="text-xs mt-0.5">{o.sub}</p>
          </div>
        );
      })}
    </div>
  );
}

const MARK_TYPES = [
  { key: "word", title: "Word mark", sub: "Name / text only, any font" },
  { key: "logo", title: "Logo", sub: "Device / symbol only, no text" },
  { key: "composite", title: "Composite", sub: "Name + logo together" },
];

const VERDICTS = [
  { key: "can_apply", title: "Can be applied", sub: "File as searched" },
  { key: "apply_with_changes", title: "Apply with changes", sub: "Modify name / add logo" },
  { key: "not_advisable", title: "Not advisable", sub: "Choose a different mark" },
];
const VERDICT_FILL = {
  can_apply: "bg-emerald-600 text-white",
  apply_with_changes: "bg-yellow-400 text-gray-900",
  not_advisable: "bg-red-600 text-white",
};

const PRIORITY = {
  must: { label: "Must apply", cls: "text-emerald-600", dot: "bg-emerald-500" },
  recommended: { label: "Recommended", cls: "text-amber-600", dot: "bg-amber-500" },
  optional: { label: "Optional", cls: "text-gray-500", dot: "bg-gray-400" },
};

const chanceTone = (c) => (c >= 75 ? "text-emerald-600" : c >= 50 ? "text-amber-600" : "text-red-600");

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
  let n = 0;
  const next = () => ++n;

  return (
    <div ref={ref} className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Decorative corner wash — on screen only: the illustration is a white-backed
          JPEG and the blend that hides its background isn't reproduced in the PDF. */}
      <div data-pdf-hide className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[520px] rounded-full bg-yellow-100/70" />

      {/* Header */}
      <div data-pdf-section className="relative px-6 sm:px-10 pt-8">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <img src={BIZPOLE_ONE_LOGO} alt="Bizpole One" className="h-14 w-auto" />
            <div className="w-12 h-1 rounded-full bg-yellow-400 mt-3 mb-6" />
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
              Trade Mark Search <span className="text-yellow-400">Report</span>
            </h2>
            <p className="mt-3 max-w-xl text-gray-500 text-sm sm:text-base">
              Pre-filing availability assessment based on the trademark query and class details from the official
              trademark database · India · Trade Marks Act, 1999
            </p>
            {a?.reportRef && (
              <span className="mt-3 inline-block px-3 py-1 rounded-full bg-yellow-50 border border-yellow-300 text-xs text-gray-800">
                Report Ref: <span className="font-semibold">{a.reportRef}</span>
              </span>
            )}
          </div>
          <img src={TRADEMARK_ART} alt="" className="hidden md:block shrink-0 w-56 h-auto mix-blend-multiply" />
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-0 sm:divide-x divide-gray-200 rounded-2xl border border-gray-100 bg-gray-50/80 p-5 sm:p-6">
          <div className="sm:pr-6"><InfoItem icon={FaRegCalendarAlt} label="Report date" value={searchDate} /></div>
          <div className="sm:px-6"><InfoItem icon={FaSearch} label="Search query" value={isLogo ? "Logo search" : String(query || "—").replace(/ \+ logo$/i, "")} /></div>
          <div className="sm:pl-6"><InfoItem icon={FaLayerGroup} label="Class(es)" value={classes || "All"} /></div>
        </div>
      </div>

      <div className="relative px-6 sm:px-10 pb-2">
        {/* 1 · Applicant details */}
        {applicant && (
          <div data-pdf-section>
            <SectionHeader number={next()}>Applicant Details</SectionHeader>
            <DetailsGrid
              rows={[
                ["Applicant Name", applicant.name, "Applicant Type", applicant.applicantType],
                ["Entity", applicant.entity, "PAN / CIN", applicant.panOrCin],
                ["Contact Person", applicant.contactPerson, "Mobile / Email", [applicant.mobile, applicant.email].filter(Boolean).join(" / ")],
                ["Address", applicant.address, "State", applicant.state],
                ["Nature of Business", applicant.businessNature, "Business Advisor", applicant.advisor],
              ]}
            />
          </div>
        )}

        {/* 2 · Mark searched & mark type */}
        <div data-pdf-section>
          <SectionHeader number={next()}>{isMarkSearch ? "Mark Searched & Mark Type" : "Search Details"}</SectionHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 rounded-2xl border-2 border-yellow-300 bg-yellow-50/60 px-5 py-5 text-center">
              <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                {queryType === "PROPRIETOR_NAME" ? "Owner searched" : queryType === "APPLICATION_NUMBER" ? "Application no. searched" : "Trademark searched"}
              </p>
              <p className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900 break-words">
                {isLogo ? "Logo search" : String(query || "—").replace(/ \+ logo$/i, "")}
              </p>
              <p className="mt-3 text-xs text-gray-600">
                Class(es) searched: <span className="font-semibold text-gray-900">{classes || "All"}</span>
                {a?.meaning && <> · Meaning / Language: <span className="font-semibold text-gray-900">{a.meaning}</span></>}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50/80 px-5 py-5 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">Logo / Device</p>
              {logoSrc ? (
                <img src={logoSrc} alt="Searched logo" className="mt-3 h-20 w-auto object-contain" />
              ) : (
                <p className="mt-3 text-xs text-gray-500">Shown only for Logo / Composite searches</p>
              )}
            </div>
          </div>
          {isMarkSearch && (
            <div className="mt-4">
              <ChoiceRow options={MARK_TYPES} selected={isLogo ? "logo" : isComposite ? "composite" : "word"} />
            </div>
          )}
        </div>

        {/* 3 · Probability of registration */}
        {assessmentLoading && (
          <div data-pdf-section>
            <SectionHeader number={next()}>Probability of Registration</SectionHeader>
            <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-8 flex items-center gap-4 text-sm text-gray-600">
              <span className="w-5 h-5 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
              Analysing similar marks to estimate your chance of registration…
            </div>
          </div>
        )}
        {a && !assessmentLoading && (
          <>
            <div data-pdf-section>
              <SectionHeader number={next()}>Probability of Registration</SectionHeader>
              <div data-pdf-grow className="rounded-2xl border border-gray-100 bg-gray-50/80 px-5 py-4 grid grid-cols-1 md:grid-cols-[1.15fr_1fr] gap-6 items-center">
                <div className="flex justify-center"><Speedometer value={a.probability} /></div>
                <div>
                  <p className="font-bold text-gray-900 mb-4">How to read the meter</p>
                  <ul className="space-y-4">
                    {[...BANDS].reverse().map((b) => (
                      <li key={b.from} className="flex gap-3">
                        <span className="mt-0.5 shrink-0 w-4 h-4 rounded-sm" style={{ background: b.color }} />
                        <div>
                          <p className="text-sm font-bold text-gray-900">{b.label} · {b.title}</p>
                          <p className="text-xs text-gray-500">{b.note}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                Overall probability that the searched mark will proceed to registration:{" "}
                <span className="font-bold text-gray-900">{a.probability}%</span>
                {` · AI-driven assessment of ${a.reviewed ? `${a.reviewed} ` : ""}registry results (similarity, class overlap & distinctiveness).`}
              </p>
            </div>

            {/* 4 · Our suggestion */}
            <div data-pdf-section>
              <SectionHeader number={next()}>Our Suggestion</SectionHeader>
              <ChoiceRow options={VERDICTS} selected={a.verdict} fill={(k) => VERDICT_FILL[k]} />
              <div className="mt-3 space-y-1 text-sm text-gray-700">
                <p><span className="font-bold text-gray-900">Why: </span>{a.why}</p>
                {a.suggestedChange && <p><span className="font-bold text-gray-900">Suggested change: </span>{a.suggestedChange}</p>}
              </div>
            </div>

            {a.recommendedClasses?.length > 0 && (
              <div data-pdf-section>
                <p className="mt-5 mb-2 font-bold text-gray-900">Classes you should apply in</p>
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
                <p className="mt-1.5 text-xs text-gray-500">
                  <b>Must apply</b> — core business, file now · <b>Recommended</b> — closely related, protects against copycats ·{" "}
                  <b>Optional</b> — future expansion.
                </p>
              </div>
            )}

            {/* 5 · Class-wise search details */}
            <div data-pdf-section>
              <SectionHeader number={next()}>Class-wise Search Details</SectionHeader>
              {a.classWise?.length > 0 ? (
                <ReportTable head={["Class", "Description of Goods / Services", "Identical Marks", "Similar Marks", "Chance in Class"]}>
                  {a.classWise.map((c) => (
                    <tr key={c.classNumber}>
                      <td className="px-4 py-3 font-semibold text-gray-900">{c.classNumber}</td>
                      <td className="px-4 py-3">{c.title || "—"}</td>
                      <td className="px-4 py-3">{c.identical}</td>
                      <td className="px-4 py-3">{c.similar}</td>
                      <td className={`px-4 py-3 font-bold ${chanceTone(c.chance)}`}>{c.chance}%</td>
                    </tr>
                  ))}
                </ReportTable>
              ) : (
                <p className="text-sm text-gray-600">No identical or similar live marks were found in any class.</p>
              )}
            </div>

            {a.closestMarks?.length > 0 && (
              <div data-pdf-section>
                <p className="mt-5 mb-2 font-bold text-gray-900">Closest marks found</p>
                <ReportTable head={["Similar Mark", "App. No.", "Class", "Status", "Owner", "Similarity"]}>
                  {a.closestMarks.map((m, i) => (
                    <tr key={`${m.applicationNumber}-${i}`}>
                      <td className="px-4 py-3 font-semibold text-gray-900 break-words">{m.wordMark || "(Device mark)"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{m.applicationNumber ?? "—"}</td>
                      <td className="px-4 py-3">{m.classNumber ?? "—"}</td>
                      <td className="px-4 py-3">{m.status || "—"}</td>
                      <td className="px-4 py-3 max-w-[200px] break-words">{m.proprietorName || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{m.similarity}</td>
                    </tr>
                  ))}
                </ReportTable>
                <p className="mt-1.5 text-xs text-gray-500">
                  Sources: IP India Trade Marks Registry (word, phonetic &amp; logo search), Well-known Marks list, Trade Marks Journal.
                </p>
              </div>
            )}
          </>
        )}

        {/* 6 · Disclaimer + sign-off */}
        <div data-pdf-section>
          <SectionHeader number={next()}>Disclaimer</SectionHeader>
          <p className="text-xs leading-relaxed text-gray-600">
            This report is an advisory opinion based on records available on the IP India Trade Marks Registry and related public
            databases as on the search date. Applications filed recently, or not yet digitised, and unregistered use of similar
            marks may not appear in the search. The probability shown is Bizpole's professional estimate and not a guarantee; the
            final decision on registration rests with the Registrar of Trade Marks, and third parties may oppose the application.
            Bizpole is not liable for any objection, opposition or infringement claim arising from adoption or use of the mark.
            This report is confidential and intended only for the applicant named above.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6 text-sm">
            {[
              ["Prepared by", "Bizpole One · Trademark Search"],
              ["Reviewed by", "TM Attorney / Agent"],
              ["Date of Issue", searchDate],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="w-40 h-1 rounded-full bg-yellow-400 mb-2" />
                <p className="font-bold text-gray-900">{label}</p>
                <p className="text-gray-600">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Annexure · registry results */}
        <div data-pdf-section className="mt-10 mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Search Results</h3>
            <p className="text-xs text-gray-500 mt-0.5">Annexure · records found on the trademark registry</p>
            <div className="w-14 h-1 rounded-full bg-yellow-400 mt-2" />
          </div>
          <span className="px-4 py-1.5 rounded-full bg-yellow-50 border border-yellow-300 text-sm text-gray-900">
            Total Results: <span className="font-bold">{total ?? results.length}</span>
            {pageCount > 1 && <> · Page {page} of {pageCount}</>}
          </span>
        </div>
      </div>

      <div className="relative mx-2 sm:mx-4 rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[860px] text-xs">
          <thead>
            <tr className="bg-yellow-400 text-gray-900 text-left">
              <th className="px-4 py-3.5 font-semibold w-10">#</th>
              <th className="px-4 py-3.5 font-semibold">Trademark</th>
              <th className="px-4 py-3.5 font-semibold">App. No.</th>
              <th className="px-4 py-3.5 font-semibold">Class</th>
              <th className="px-4 py-3.5 font-semibold text-center">Status</th>
              <th className="px-4 py-3.5 font-semibold">Owner</th>
              <th className="px-4 py-3.5 font-semibold">G&amp;S</th>
              <th className="px-4 py-3.5 font-semibold">User Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-600">
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
                    <td className="px-4 py-4 text-gray-500">{startIndex + i + 1}</td>
                    <td className="px-4 py-4">
                      <div className="w-24 flex flex-col items-center text-center">
                        {tm.image ? (
                          <img src={tm.image} alt={tm.wordMark} className="h-10 w-full object-contain" loading="lazy" />
                        ) : (
                          <span className="text-base font-bold text-gray-900">{tm.wordMark || "—"}</span>
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
                    <td className="px-4 py-4 whitespace-nowrap">{tm.applicationNumber ?? "—"}</td>
                    <td className="px-4 py-4">{tm.classNumber ?? "—"}</td>
                    <td className="px-4 py-4 text-center">
                      {tm.status ? (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border whitespace-nowrap ${tone.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                          {tm.status}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-4 max-w-[150px] break-words">{tm.proprietorName || "—"}</td>
                    <td className="px-4 py-4 max-w-[260px] break-words">{tm.classDetail || "—"}</td>
                    <td className="px-4 py-4 max-w-[110px] break-words">{tm.userDetail || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* On screen only — the PDF draws this footer on every page. */}
      <div data-pdf-hide className="relative mx-6 sm:mx-10 mt-16 mb-8 pt-6 border-t border-gray-200 flex items-center justify-between gap-4 text-sm text-gray-600">
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

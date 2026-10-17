import { forwardRef } from "react";
import { FaRegCalendarAlt, FaSearch, FaLayerGroup } from "react-icons/fa";
import bizpoleLogo from "../../assets/images/bizpole-logo.png";
import heroImage from "../../assets/images/trademark-report-hero.jpg";

// Status pill colours as in the report design: live marks green, dead marks red,
// anything still in the registry pipeline amber.
function statusTone(status = "") {
  const s = status.toLowerCase();
  if (/(abandoned|refused|withdrawn|removed|expired|rejected)/.test(s)) return { pill: "bg-red-50 text-red-600 border-red-100", dot: "bg-red-500" };
  if (/registered/.test(s)) return { pill: "bg-emerald-50 text-emerald-600 border-emerald-100", dot: "bg-emerald-500" };
  return { pill: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500" };
}

const today = () => new Date().toISOString().slice(0, 10);

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 min-w-0">
      <span className="shrink-0 w-12 h-12 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-lg font-bold text-black truncate">{value}</p>
      </div>
    </div>
  );
}

/**
 * Printable "Trade Mark Search Report" for a MarkSimpl search.
 * @param {object[]} results  normalized trademark rows (see trademarkSearch.service.js)
 * @param {string}   query    the searched text
 * @param {string}   classes  class filter label, e.g. "30" or "All"
 * @param {number}   total    total matches (falls back to results.length)
 * @param {number}   startIndex  row offset of this page, for the # column
 */
const TrademarkReport = forwardRef(function TrademarkReport(
  { results = [], query, classes, total, reportDate = today(), startIndex = 0, page = 1, pageCount = 1 },
  ref
) {
  return (
    <div ref={ref} className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Decorative corner wash */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[520px] rounded-full bg-yellow-100/70" />

      <div className="relative px-6 sm:px-10 pt-8 sm:pt-10">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <img src={bizpoleLogo} alt="Bizpole" className="h-9 w-auto" />
            <div className="w-12 h-1 rounded-full bg-yellow-400 mt-3 mb-6" />
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-black leading-tight">
              Trade Mark Search <span className="text-yellow-400">Report</span>
            </h2>
            <p className="mt-3 max-w-xl text-gray-500 text-sm sm:text-base">
              Search results based on the trademark query and class details from the official trademark database.
            </p>
          </div>
          <img
            src={heroImage}
            alt=""
            className="hidden md:block shrink-0 w-44 h-auto mix-blend-multiply"
          />
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-0 sm:divide-x divide-gray-200 rounded-2xl border border-gray-100 bg-gray-50/80 p-5 sm:p-6">
          <div className="sm:pr-6"><InfoItem icon={FaRegCalendarAlt} label="Report date" value={reportDate} /></div>
          <div className="sm:px-6"><InfoItem icon={FaSearch} label="Search query" value={query || "—"} /></div>
          <div className="sm:pl-6"><InfoItem icon={FaLayerGroup} label="Class(es)" value={classes || "All"} /></div>
        </div>

        <div className="mt-10 mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-2xl font-bold text-black">Search Results</h3>
            <div className="w-14 h-1 rounded-full bg-yellow-400 mt-2" />
          </div>
          <span className="px-4 py-1.5 rounded-full bg-yellow-50 border border-yellow-300 text-sm text-black">
            Total Results: <span className="font-bold">{total ?? results.length}</span>
          </span>
        </div>
      </div>

      <div className="relative mx-2 sm:mx-4 rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[860px] text-xs">
          <thead>
            <tr className="bg-yellow-400 text-black text-left">
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
                    <td className="px-4 py-5 text-gray-500">{startIndex + i + 1}</td>
                    <td className="px-4 py-5">
                      <div className="w-24 flex flex-col items-center text-center">
                        {tm.image ? (
                          <img src={tm.image} alt={tm.wordMark} className="h-10 w-full object-contain" loading="lazy" />
                        ) : (
                          <span className="text-base font-bold text-black">{tm.wordMark || "—"}</span>
                        )}
                        <span className="mt-1 text-[10px] text-gray-700 break-words">{tm.wordMark || "(Device mark)"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap">{tm.applicationNumber ?? "—"}</td>
                    <td className="px-4 py-5">{tm.classNumber ?? "—"}</td>
                    <td className="px-4 py-5 text-center">
                      {tm.status ? (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border whitespace-nowrap ${tone.pill}`}>
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

      <div className="relative mx-6 sm:mx-10 mt-16 mb-8 pt-6 border-t border-gray-200 flex items-center justify-between gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-3">
          <img src={bizpoleLogo} alt="Bizpole" className="h-5 w-auto" />
          <span className="text-gray-300">|</span>
          <span>Trademark Search Report</span>
        </div>
        <div className="flex items-center gap-3 text-gray-500">
          Page {page} of {pageCount}
          <span className="w-7 h-1 rounded-full bg-yellow-400" />
        </div>
      </div>
    </div>
  );
});

export default TrademarkReport;

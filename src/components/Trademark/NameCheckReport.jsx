import { forwardRef } from "react";
import bizpoleLogo from "../../assets/images/bizpole-logo.png";

const VERDICT = {
  available: { label: "Name appears available", tone: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  similar: { label: "Similar names found", tone: "bg-amber-50 border-amber-200 text-amber-800" },
  not_suitable: { label: "Name may not be available", tone: "bg-red-50 border-red-200 text-red-800" },
  unverified: { label: "To be verified by our team", tone: "bg-blue-50 border-blue-200 text-blue-800" },
};

const MatchTag = ({ match }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${match === "exact" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
    {match === "exact" ? "Same name" : "Similar"}
  </span>
);

/**
 * Printable "Business Name Availability Report" for a company-registration
 * name check (MCA company register + trademark registry).
 * @param {string} name    the name checked
 * @param {object} result  { status, note, companies[], trademarks[], checkedAt }
 */
const NameCheckReport = forwardRef(function NameCheckReport({ name, result }, ref) {
  const verdict = VERDICT[result.status] || VERDICT.unverified;
  const companies = result.companies || [];
  const trademarks = result.trademarks || [];
  return (
    <div ref={ref} className="relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[520px] rounded-full bg-yellow-100/70" />

      <div className="relative px-10 pt-10" data-pdf-section>
        <img src={bizpoleLogo} alt="Bizpole" className="h-9 w-auto" />
        <div className="w-12 h-1 rounded-full bg-yellow-400 mt-3 mb-6" />
        <h2 className="text-5xl font-extrabold tracking-tight text-black leading-tight">
          Business Name <span className="text-yellow-400">Availability Report</span>
        </h2>
        <p className="mt-3 max-w-xl text-gray-500">
          Proposed company name checked against the MCA company register and the Indian trademark registry.
        </p>

        <div className="mt-8 grid grid-cols-3 divide-x divide-gray-200 rounded-2xl border border-gray-100 bg-gray-50/80 p-6">
          <div className="pr-6">
            <p className="text-xs uppercase tracking-wide text-gray-500">Report date</p>
            <p className="text-lg font-bold text-black">{result.checkedAt || "—"}</p>
          </div>
          <div className="px-6 col-span-2">
            <p className="text-xs uppercase tracking-wide text-gray-500">Name checked</p>
            <p className="text-lg font-bold text-black break-words">{name}</p>
          </div>
        </div>

        <div className={`mt-6 rounded-2xl border p-5 ${verdict.tone}`}>
          <p className="text-lg font-bold">{verdict.label}</p>
          <p className="text-sm mt-1">{result.note}</p>
        </div>
      </div>

      <Section title="Registered companies (MCA)" count={companies.length}>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-yellow-400 text-black text-left">
              <th className="px-4 py-3 font-semibold">Company name</th>
              <th className="px-4 py-3 font-semibold">CIN</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Incorporated</th>
              <th className="px-4 py-3 font-semibold">State</th>
              <th className="px-4 py-3 font-semibold">Match</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {companies.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No registered company with a same or similar name was found.</td></tr>
            ) : companies.map((c) => (
              <tr key={c.cin || c.name}>
                <td className="px-4 py-3 font-medium text-black">{c.name}</td>
                <td className="px-4 py-3 whitespace-nowrap">{c.cin || "—"}</td>
                <td className="px-4 py-3">{c.status || "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{c.incorporatedAt || "—"}</td>
                <td className="px-4 py-3">{c.state || "—"}</td>
                <td className="px-4 py-3"><MatchTag match={c.match} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Trademarks" count={trademarks.length}>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-yellow-400 text-black text-left">
              <th className="px-4 py-3 font-semibold">Trademark</th>
              <th className="px-4 py-3 font-semibold">App. No.</th>
              <th className="px-4 py-3 font-semibold">Class</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Owner</th>
              <th className="px-4 py-3 font-semibold">Match</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {trademarks.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No live trademark with a same or similar name was found.</td></tr>
            ) : trademarks.map((t, i) => (
              <tr key={`${t.applicationNumber}-${t.classNumber}-${i}`}>
                <td className="px-4 py-3 font-medium text-black">{t.wordMark || "(Device mark)"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{t.applicationNumber ?? "—"}</td>
                <td className="px-4 py-3">{t.classNumber ?? "—"}</td>
                <td className="px-4 py-3">{t.status || "—"}</td>
                <td className="px-4 py-3 max-w-[200px] break-words">{t.proprietorName || "—"}</td>
                <td className="px-4 py-3"><MatchTag match={t.match} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <div className="relative mx-10 mt-12 mb-8 pt-6 border-t border-gray-200 text-xs text-gray-500" data-pdf-section>
        This report is for reference only and is not legal advice. Name approval rests with the Registrar of Companies.
        Our team verifies the name again before filing.
        <div className="mt-3 flex items-center gap-3 text-sm text-gray-600">
          <img src={bizpoleLogo} alt="Bizpole" className="h-5 w-auto" />
          <span className="text-gray-300">|</span>
          <span>Business Name Availability Report</span>
        </div>
      </div>
    </div>
  );
});

function Section({ title, count, children }) {
  return (
    <div className="relative px-10 mt-10">
      <div className="mb-4 flex items-end justify-between" data-pdf-section>
        <div>
          <h3 className="text-2xl font-bold text-black">{title}</h3>
          <div className="w-14 h-1 rounded-full bg-yellow-400 mt-2" />
        </div>
        <span className="px-4 py-1.5 rounded-full bg-yellow-50 border border-yellow-300 text-sm text-black">
          Matches: <span className="font-bold">{count}</span>
        </span>
      </div>
      <div className="rounded-xl border border-gray-100 overflow-hidden">{children}</div>
    </div>
  );
}

export default NameCheckReport;

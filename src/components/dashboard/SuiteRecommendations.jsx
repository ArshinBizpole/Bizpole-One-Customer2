import { useEffect, useState } from "react";
import { BookOpen, Lightbulb, Sparkles, Newspaper, ArrowRight } from "lucide-react";
import useSelectedCompany from "../../hooks/useSelectedCompany";
import { getRecommendations } from "../../api/DashboardApi";

const TAG_COLORS = {
  GST: "bg-blue-100 text-blue-700",
  MCA: "bg-amber-100 text-amber-700",
  EVENT: "bg-green-100 text-green-700",
  NEWS: "bg-gray-100 text-gray-700",
};

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHead = ({ icon: Icon, title }) => (
  <div className="mb-4 flex items-center gap-2.5">
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
      <Icon className="h-4 w-4" />
    </div>
    <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
  </div>
);

const SuiteRecommendations = () => {
  const { companyId } = useSelectedCompany();
  const [recommended, setRecommended] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setRecommended([]);
      setNews([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getRecommendations(companyId).then((res) => {
      if (cancelled) return;
      if (res.success) {
        setRecommended(res.data.recommended || []);
        setNews(res.data.news || []);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return (
    <>
      {/* Promos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Books */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800 to-gray-700 p-5 text-white">
          <BookOpen className="absolute -right-3 -top-3 h-24 w-24 opacity-10" />
          <div className="text-[11px] font-bold uppercase tracking-wide opacity-85">
            Bizpole Books · Accounting
          </div>
          <h4 className="my-2 text-lg font-bold">You're filing GST manually.</h4>
          <p className="mb-4 max-w-md text-[12.5px] leading-relaxed opacity-90">
            Bizpole Books auto-prepares your GST returns, tracks invoices & expenses, and syncs straight
            into your compliance score. Stop juggling spreadsheets.
          </p>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-gray-800">
            Start free trial <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Consult */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-700 to-yellow-400 p-5 text-white">
          <Lightbulb className="absolute -right-3 -top-3 h-24 w-24 opacity-10" />
          <div className="text-[11px] font-bold uppercase tracking-wide opacity-85">
            Bizpole Consult · Advisory
          </div>
          <h4 className="my-2 text-lg font-bold">Grow with expert guidance.</h4>
          <p className="mb-4 max-w-md text-[12.5px] leading-relaxed opacity-90">
            You may benefit from tax-planning & structuring advice. Book a free 30-min consult with a
            Bizpole expert tailored to your numbers.
          </p>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800 px-3.5 py-2 text-xs font-bold text-white">
            Book free consult <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Recommended services + news */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHead icon={Sparkles} title="Services Businesses Like Yours Add" />
          <div className="space-y-2.5">
            {loading && <p className="text-sm text-gray-400">Loading recommendations…</p>}
            {!loading && recommended.length === 0 && (
              <p className="text-sm text-gray-400">You're all set — no new recommendations right now.</p>
            )}
            {recommended.map((r) => (
              <div
                key={r.title}
                className="flex items-center justify-between rounded-xl border border-dashed border-gray-200 p-3"
              >
                <div>
                  <b className="text-[13px] text-gray-800">{r.title}</b>
                  <p className="text-[11px] text-gray-500">{r.sub}</p>
                </div>
                <div className="text-right">
                  <b className="text-[13px] text-yellow-700">{r.price}</b>
                  <small className="block text-[10px] text-gray-400">{r.note}</small>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead icon={Newspaper} title="News & Updates for You" />
          <div>
            {loading && <p className="text-sm text-gray-400">Loading updates…</p>}
            {!loading && news.length === 0 && <p className="text-sm text-gray-400">No updates right now.</p>}
            {news.map((n) => (
              <div key={n.id} className="flex gap-3 border-b border-gray-100 py-2.5 last:border-0">
                <span
                  className={`h-max whitespace-nowrap rounded px-1.5 py-1 text-[9px] font-extrabold ${
                    TAG_COLORS[n.tag] || TAG_COLORS.NEWS
                  }`}
                >
                  {n.tag}
                </span>
                <div>
                  <b className="block text-[13px] text-gray-800">{n.title}</b>
                  <p className="mt-0.5 text-[11px] text-gray-500">{n.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
};

export default SuiteRecommendations;

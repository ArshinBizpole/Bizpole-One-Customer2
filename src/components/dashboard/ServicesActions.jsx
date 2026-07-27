import { useEffect, useState } from "react";
import { Settings, Inbox, ChevronRight } from "lucide-react";
import useSelectedCompany from "../../hooks/useSelectedCompany";
import { getServicesActions, completeAction } from "../../api/DashboardApi";

const severityBar = {
  urgent: "bg-red-600",
  warning: "bg-amber-500",
  info: "bg-blue-600",
};

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHead = ({ icon: Icon, title, link }) => (
  <div className="mb-4 flex items-center justify-between gap-2">
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
    </div>
    {link && (
      <button className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-yellow-700 hover:underline">
        {link} <ChevronRight className="h-3 w-3" />
      </button>
    )}
  </div>
);

const ServicesActions = () => {
  const { companyId } = useSelectedCompany();
  const [services, setServices] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setServices([]);
      setPending([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getServicesActions(companyId).then((res) => {
      if (cancelled) return;
      if (res.success) {
        setServices(res.data.services || []);
        setPending(res.data.pending || []);
      } else {
        setServices([]);
        setPending([]);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const handleResolve = async (actionId) => {
    setPending((prev) => prev.filter((p) => p.id !== actionId));
    await completeAction(actionId);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 animate-pulse">
        <div className="h-56 rounded-2xl bg-white shadow-sm lg:col-span-2" />
        <div className="h-56 rounded-2xl bg-white shadow-sm" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Active services pipeline */}
      <Card className="lg:col-span-2">
        <CardHead icon={Settings} title="Active Services — Live Status" link="All orders" />
        <div>
          {services.length === 0 && (
            <p className="text-sm text-gray-400">No active services right now.</p>
          )}
          {services.map((svc) => (
            <div key={svc.assignmentId} className="border-b border-gray-100 py-3.5 last:border-0">
              <div className="mb-2.5 flex items-center justify-between">
                <b className="text-[13px] text-gray-800">{svc.name}</b>
                <small className="text-[11px] text-gray-500">{svc.meta}</small>
              </div>
              <div className="flex gap-1.5">
                {svc.steps.map((step, i) => {
                  const done = i < svc.stage;
                  const current = i === svc.stage;
                  return (
                    <div key={step} className="flex-1 text-center">
                      <div
                        className={`h-1.5 rounded-full ${
                          done || current ? "bg-yellow-400" : "bg-gray-100"
                        } ${current ? "ring-4 ring-yellow-100" : ""}`}
                      />
                      <small
                        className={`mt-1.5 block text-[9.5px] ${
                          done || current ? "font-semibold text-gray-700" : "text-gray-400"
                        }`}
                      >
                        {step}
                      </small>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Pending actions */}
      <Card>
        <CardHead icon={Inbox} title="We Need From You" />
        <div className="space-y-2.5">
          {pending.length === 0 && (
            <p className="text-[11px] text-gray-400">You're all caught up — nothing pending.</p>
          )}
          {pending.map((p) => (
            <div key={p.id} className="flex items-start gap-3 rounded-xl border border-gray-200 p-3">
              <span className={`w-1 self-stretch rounded ${severityBar[p.severity] || "bg-gray-400"}`} />
              <div className="flex-1">
                <b className="text-[13px] text-gray-800">{p.title}</b>
                <p className="mt-0.5 text-xs text-gray-500">{p.body}</p>
              </div>
              <button
                onClick={() => handleResolve(p.id)}
                className="shrink-0 whitespace-nowrap text-[11px] font-bold text-yellow-700 hover:underline"
              >
                {p.cta} ›
              </button>
            </div>
          ))}
          {pending.length > 0 && (
            <p className="text-[11px] text-gray-400">
              Clearing these keeps your filings on time — fewer back-and-forth emails.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ServicesActions;

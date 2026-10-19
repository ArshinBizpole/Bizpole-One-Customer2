import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FileText, Building2 } from "lucide-react";
import useSelectedCompany from "../../hooks/useSelectedCompany";
import { flowRoute, inProgressApplications } from "../../utils/applicationPrefill";
import { flowProgress } from "../ExixistingCompany/FlowRunner";

// Applications started but not finished (FlowRunner's saved progress in this browser).
const ContinueApplications = () => {
  const navigate = useNavigate();
  const { companyId } = useSelectedCompany();
  const [apps] = useState(() =>
    inProgressApplications().map((app) => ({
      ...app,
      progress: flowProgress(app.flowId, app.stepIndex, app.answers),
    }))
  );

  if (apps.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {apps.map((app, i) => {
        const { path, state } = flowRoute(app.flowId);
        const Icon = i % 2 ? Building2 : FileText;
        const p = app.progress;
        return (
          <div key={app.flowId} className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Continue your application
                  </p>
                  <p className="text-base font-semibold text-gray-900">{app.name}</p>
                  <p className="text-xs text-gray-500">
                    {app.kind} · Step {p ? `${p.step} of ${p.total}` : app.step}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(path, { state: { ...state, companyId } })}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-amber-500"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {p && (
              <div className="mt-5 flex items-center gap-4">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${p.pct}%` }} />
                </div>
                <span className="shrink-0 text-xs text-gray-500">{p.pct}% complete</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ContinueApplications;

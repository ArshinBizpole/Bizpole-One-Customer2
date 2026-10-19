import { Link } from "react-router-dom";
import { CircleCheck, CircleX, CircleAlert, Clock3, CircleDashed, MoreHorizontal } from "lucide-react";
import { toCustomerServiceStatus } from "../../utils/orderStatus";

const STATUS_ICON = {
  "Not Started": <CircleDashed className="h-5 w-5 text-gray-400" />,
  "In Process": <Clock3 className="h-5 w-5 text-sky-500" />,
  "On Hold": <CircleAlert className="h-5 w-5 fill-amber-400 text-white" />,
  Completed: <CircleCheck className="h-5 w-5 fill-green-500 text-white" />,
  Cancelled: <CircleX className="h-5 w-5 fill-red-500 text-white" />,
  Dropped: <CircleX className="h-5 w-5 fill-red-500 text-white" />,
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const RecentServices = ({ services, loading }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-5">
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-lg font-bold text-gray-900">Services</h3>
      <Link
        to="/dashboard/bizpoleone/individual"
        title="View all services"
        className="flex h-8 w-9 items-center justify-center rounded-lg bg-gray-50 text-amber-500 hover:bg-amber-50"
      >
        <MoreHorizontal className="h-5 w-5" />
      </Link>
    </div>

    {loading ? (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 rounded bg-gray-50" />)}
      </div>
    ) : services.length === 0 ? (
      <p className="py-8 text-center text-sm text-gray-400">No services on this company yet.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
              <th className="py-2.5 pr-3 font-medium">Name</th>
              <th className="py-2.5 pr-3 font-medium">Status</th>
              <th className="py-2.5 pr-3 font-medium">Date</th>
              <th className="py-2.5 font-medium">Progress</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => {
              const status = toCustomerServiceStatus(s.status);
              const progress = status === "Completed" ? 100 : s.progress;
              return (
              <tr key={s.assignmentId} className="text-gray-800">
                <td className="py-3 pr-3">
                  <p className="font-medium">{s.name}</p>
                  {s.code && <p className="text-[11px] text-gray-400">{s.code}</p>}
                </td>
                <td className="py-3 pr-3">
                  <span className="flex items-center gap-2 font-semibold">
                    {STATUS_ICON[status]}
                    {status}
                  </span>
                </td>
                <td className="py-3 pr-3 font-semibold">{fmtDate(s.date)}</td>
                <td className="py-3">
                  <div
                    className="flex items-center gap-2"
                    title={s.totalTasks ? `${s.doneTasks} of ${s.totalTasks} tasks done` : "No tasks yet"}
                  >
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[11px] text-gray-500">{progress}%</span>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export default RecentServices;

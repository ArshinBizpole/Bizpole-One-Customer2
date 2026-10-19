import { useEffect, useState } from "react";
import { Users, ScrollText } from "lucide-react";
import { getMyLedger, getMyReferrals } from "../../api/ReferralApi";
import { Card, StatusPill } from "./ReferralUi";
import { formatDate, formatINR, humanize } from "./format";
import Pagination from "../Pagination";

const PAGE_SIZE = 10;

const usePagedRows = (fetcher, role, companyId, refreshKey) => {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ rows: [], total: 0, loading: true, error: "" });

  useEffect(() => {
    setPage(1);
  }, [role, companyId, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: "" }));
    fetcher(role, companyId, { page, limit: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        setState({
          rows: Array.isArray(data?.rows) ? data.rows : [],
          total: Number(data?.total) || 0,
          loading: false,
          error: "",
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ rows: [], total: 0, loading: false, error: err?.message || "Could not load" });
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, role, companyId, page, refreshKey]);

  return { ...state, page, setPage, pages: Math.max(1, Math.ceil(state.total / PAGE_SIZE)) };
};

const Pager = ({ page, pages, setPage, total }) =>
  total > PAGE_SIZE ? (
    <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
      <span>
        Page {page} of {pages} · {total} total
      </span>
      <Pagination page={page} totalPages={pages} onPage={setPage} />
    </div>
  ) : null;

const TableShell = ({ loading, error, empty, head, children }) => {
  if (loading) return <div className="h-24 animate-pulse rounded-xl bg-gray-50" />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (empty) return <p className="text-sm text-gray-400">Nothing here yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-500">
            {head.map((h) => (
              <th key={h} className="px-2 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
};

export const MyReferralsTable = ({ role, companyId, refreshKey }) => {
  const { rows, total, loading, error, page, pages, setPage } = usePagedRows(
    getMyReferrals,
    role,
    companyId,
    refreshKey
  );
  return (
    <Card title="Your referrals" icon={<Users className="h-4 w-4" />}>
      <TableShell
        loading={loading}
        error={error}
        empty={rows.length === 0}
        head={["Client", "Referred on", "Stage", "Order", "Reward", "Reward status"]}
      >
        {rows.map((r) => (
          <tr key={r.attributionId} className="border-b border-gray-50 last:border-0">
            <td className="px-2 py-2 font-medium text-gray-800">{r.clientName || "—"}</td>
            <td className="px-2 py-2 text-gray-600">{formatDate(r.attributedAt)}</td>
            <td className="px-2 py-2">
              <StatusPill value={r.stage} />
            </td>
            <td className="px-2 py-2 text-gray-600">{r.orderCode || "—"}</td>
            <td className="px-2 py-2 text-gray-800">
              {r.rewardAmount === null || r.rewardAmount === undefined ? "—" : formatINR(r.rewardAmount)}
            </td>
            <td className="px-2 py-2">{r.rewardStatus ? <StatusPill value={r.rewardStatus} /> : "—"}</td>
          </tr>
        ))}
      </TableShell>
      <Pager page={page} pages={pages} setPage={setPage} total={total} />
    </Card>
  );
};

export const MyLedgerTable = ({ role, companyId, refreshKey }) => {
  const { rows, total, loading, error, page, pages, setPage } = usePagedRows(
    getMyLedger,
    role,
    companyId,
    refreshKey
  );
  return (
    <Card title="Ledger" icon={<ScrollText className="h-4 w-4" />}>
      <TableShell
        loading={loading}
        error={error}
        empty={rows.length === 0}
        head={["Date", "Entry", "Type", "Amount", "Order", "Note"]}
      >
        {rows.map((r) => {
          const amt = Number(r.amount) || 0;
          return (
            <tr key={r.entryId} className="border-b border-gray-50 last:border-0">
              <td className="px-2 py-2 text-gray-600">{formatDate(r.createdAt)}</td>
              <td className="px-2 py-2 text-gray-800">{humanize(r.entryType)}</td>
              <td className="px-2 py-2 text-gray-600">{humanize(r.kind)}</td>
              <td className={`px-2 py-2 font-semibold ${amt < 0 ? "text-red-600" : "text-gray-800"}`}>
                {formatINR(amt)}
              </td>
              <td className="px-2 py-2 text-gray-600">{r.orderCode || "—"}</td>
              <td className="px-2 py-2 text-gray-500">{r.note || "—"}</td>
            </tr>
          );
        })}
      </TableShell>
      <Pager page={page} pages={pages} setPage={setPage} total={total} />
    </Card>
  );
};

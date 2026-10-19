import React, { useEffect, useRef, useState } from "react";
import Pagination from "../components/Pagination";
import {
  Info,
  X,
  Wallet,
  RotateCcw,
  Package,
  Layers,
  Landmark,
  User,
  CreditCard,
} from "lucide-react";
import { getAllOrdersByCompany } from "../api/Orders/Order";
import {
  getRefundable,
  createCustomerRefund,
  getMyRefunds,
} from "../api/Refund/Refund";

const STATUS_STYLES = {
  Pending: "bg-amber-50 text-amber-700",
  Accepted: "bg-green-50 text-green-700",
  Processing: "bg-blue-50 text-blue-600",
  Processed: "bg-green-500 text-white",
  Rejected: "bg-red-50 text-red-600",
  Failed: "bg-red-50 text-red-600",
};

const PAGE_SIZE = 10;
const REASON_MAX = 500;

const formatAmount = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

// "2025-11-08"
const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const withHash = (code) => (code ? `#${code}` : "-");

// Only orders with money received can be refunded.
const isEligible = (o) => Number(o.ReceivedAmount) > 0;

const emptyBank = { beneficiaryName: "", accountNumber: "", ifsc: "", bankName: "", upiId: "" };

// UPI mark (two arrows) — lucide has no UPI icon.
const UpiIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path d="M5 3l7 9-7 9z" fill="#F7931E" />
    <path d="M12 3l7 9-7 9z" fill="#3FA34D" />
  </svg>
);

// Only shown when a table spills past one page.
const Pager = ({ page, totalPages, total, onPage, noun }) =>
  totalPages <= 1 ? null : (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-t border-gray-100">
      <span className="text-sm text-gray-500">
        Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} {noun}
      </span>
      <Pagination page={page} totalPages={totalPages} onPage={onPage} />
    </div>
  );

const Th = ({ children, className = "" }) => (
  <th className={`px-6 py-4 font-semibold text-gray-600 whitespace-nowrap ${className}`}>{children}</th>
);

const MessageRow = ({ colSpan, children }) => (
  <tr>
    <td colSpan={colSpan} className="px-6 py-10 text-center text-gray-400">{children}</td>
  </tr>
);

const fieldClass =
  "w-full border border-gray-200 rounded-lg pl-11 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400";

const IconInput = ({ icon, ...props }) => (
  <div className="relative">
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">{icon}</span>
    <input {...props} className={fieldClass} />
  </div>
);

const ScopeCard = ({ checked, onChange, icon, title, sub }) => (
  <label
    className={`flex-1 flex items-start gap-3 border rounded-xl p-4 cursor-pointer transition-colors ${checked ? "border-yellow-400 bg-yellow-50" : "border-gray-200 hover:bg-gray-50"}`}
  >
    <input type="radio" name="refundScope" checked={checked} onChange={onChange} className="mt-1 accent-yellow-500" />
    <span className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${checked ? "bg-yellow-100 text-yellow-600" : "bg-gray-100 text-gray-600"}`}>
      {icon}
    </span>
    <span>
      <span className="block text-sm font-semibold text-gray-900">{title}</span>
      <span className="block text-xs text-gray-500 mt-0.5">{sub}</span>
    </span>
  </label>
);

// Profile → Refunds (opened from "Need a refund?" on the Invoice page).
const Refunds = () => {
  const [orders, setOrders] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refundPage, setRefundPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [detailRefund, setDetailRefund] = useState(null);

  const [modalOrder, setModalOrder] = useState(null);
  const [maxRefundable, setMaxRefundable] = useState(0);
  const [scope, setScope] = useState("order"); // "order" | "service"
  const [serviceDetailId, setServiceDetailId] = useState("");
  const [reason, setReason] = useState("");
  const [bank, setBank] = useState(emptyBank);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Only the latest load may update state: on a reload this runs once for the
  // previously stored company and again after the dashboard settles on the
  // real one, and the older response mustn't land last.
  const loadSeq = useRef(0);
  const loadAll = async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    let nextOrders = [];
    let nextRefunds = [];
    try {
      const ordRes = await getAllOrdersByCompany({ page: 1, limit: 200 });
      nextOrders = ordRes.data || ordRes.orders || [];
    } catch {
      nextOrders = [];
    }
    try {
      const refRes = await getMyRefunds({ page: 1, limit: 200 });
      nextRefunds = refRes.data || [];
    } catch {
      nextRefunds = [];
    }
    if (seq !== loadSeq.current) return;
    setOrders(nextOrders);
    setRefunds(nextRefunds);
    setRefundPage(1);
    setOrderPage(1);
    setLoading(false);
  };

  // Refunds and orders are per company (read from storage), so reload them
  // when the company dropdown switches.
  useEffect(() => {
    loadAll();
    window.addEventListener("company-switched", loadAll);
    return () => window.removeEventListener("company-switched", loadAll);
  }, []);

  const eligibleOrders = orders.filter(isEligible);

  const refundPages = Math.max(1, Math.ceil(refunds.length / PAGE_SIZE));
  const curRefundPage = Math.min(refundPage, refundPages);
  const pageRefunds = refunds.slice((curRefundPage - 1) * PAGE_SIZE, curRefundPage * PAGE_SIZE);

  const orderPages = Math.max(1, Math.ceil(eligibleOrders.length / PAGE_SIZE));
  const curOrderPage = Math.min(orderPage, orderPages);
  const pageOrders = eligibleOrders.slice((curOrderPage - 1) * PAGE_SIZE, curOrderPage * PAGE_SIZE);

  // Compute the refundable amount for the chosen scope (whole order / a service).
  const loadRefundable = async (order, scp, svcDetailId) => {
    try {
      const payload =
        scp === "service"
          ? { scope: "service", serviceDetailId: svcDetailId }
          : { scope: "order", orderId: order.OrderID || order.id, quoteId: order.QuoteID };
      const res = await getRefundable(payload);
      setMaxRefundable(res.maxRefundable || 0);
    } catch {
      setMaxRefundable(0);
    }
  };

  const openModal = async (order) => {
    setModalOrder(order);
    setScope("order");
    setServiceDetailId("");
    setReason("");
    setBank(emptyBank);
    setError(null);
    setMaxRefundable(0);
    await loadRefundable(order, "order", "");
  };

  const onScopeChange = (v) => {
    setScope(v);
    setServiceDetailId("");
    setMaxRefundable(0);
    if (v === "order" && modalOrder) loadRefundable(modalOrder, "order", "");
  };

  const onServiceChange = (v) => {
    setServiceDetailId(v);
    setMaxRefundable(0);
    if (v && modalOrder) loadRefundable(modalOrder, "service", v);
  };

  const submit = async () => {
    if (scope === "service" && !serviceDetailId)
      return setError("Please select the service you want a refund for.");
    if (!reason.trim()) return setError("Please tell us why you'd like a refund.");
    if (!maxRefundable || maxRefundable <= 0)
      return setError("There is no refundable amount available for this selection.");
    setError(null);
    setSubmitting(true);
    try {
      const hasBank =
        bank.beneficiaryName || bank.accountNumber || bank.ifsc || bank.bankName || bank.upiId;
      await createCustomerRefund({
        // The customer only raises the request; our team decides the actual
        // amount on approval. We submit the full refundable amount as the request.
        ...(scope === "service"
          ? { scope: "service", serviceDetailId }
          : { scope: "order", orderId: modalOrder.OrderID || modalOrder.id, quoteId: modalOrder.QuoteID }),
        amount: maxRefundable,
        reason,
        ...(hasBank ? { bankDetails: bank } : {}),
      });
      setModalOrder(null);
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to submit refund request.");
    }
    setSubmitting(false);
  };

  const statusPill = (status) => (
    <span className={`inline-block text-sm font-medium px-3 py-1 rounded-full ${STATUS_STYLES[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );

  return (
    <div className="mx-auto px-6 py-10">
      <h1 className="text-3xl font-semibold text-gray-900">Refunds</h1>
      <p className="text-sm text-gray-500 mt-1 mb-8">Request a refund for an order and track its status.</p>

      {/* My refund requests */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">My Refund Requests</h2>
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-10">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th>Request ID</Th>
                <Th>Order ID</Th>
                <Th>Reason</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <MessageRow colSpan={5}>Loading…</MessageRow>
              ) : pageRefunds.length === 0 ? (
                <MessageRow colSpan={5}>No refund requests yet.</MessageRow>
              ) : (
                pageRefunds.map((r) => (
                  <tr
                    key={r.RefundID}
                    onClick={() => setDetailRefund(r)}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 text-gray-900 whitespace-nowrap">{r.RefundCode}</td>
                    <td className="px-6 py-4 text-gray-900 whitespace-nowrap">{withHash(r.OrderCodeId)}</td>
                    <td className="px-6 py-4 text-gray-700 max-w-xs truncate" title={r.Reason}>{r.Reason || "-"}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">{formatAmount(r.RequestedAmount)}</td>
                    <td className="px-6 py-4">{statusPill(r.Status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pager page={curRefundPage} totalPages={refundPages} total={refunds.length} onPage={setRefundPage} noun="requests" />
      </div>

      {/* Orders a refund can be requested on */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Eligible orders</h2>
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th>Order ID</Th>
                <Th>Company</Th>
                <Th>Order Amount</Th>
                <Th>Order Date</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <MessageRow colSpan={5}>Loading…</MessageRow>
              ) : pageOrders.length === 0 ? (
                <MessageRow colSpan={5}>No orders eligible for a refund.</MessageRow>
              ) : (
                pageOrders.map((order, i) => (
                  <tr key={order.OrderPK || order.OrderID || i} className="border-b border-gray-100 last:border-0">
                    <td className="px-6 py-4 text-gray-900 whitespace-nowrap">{withHash(order.OrderID || order.id)}</td>
                    <td className="px-6 py-4 text-gray-700">{order.CompanyName || order.BusinessName || "-"}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">{formatAmount(order.TotalAmount ?? order.totalAmount)}</td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatDate(order.order_date || order.CreatedAt)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openModal(order)}
                        className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-yellow-400 hover:bg-yellow-500 text-gray-900 whitespace-nowrap"
                      >
                        Request Refund
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pager page={curOrderPage} totalPages={orderPages} total={eligibleOrders.length} onPage={setOrderPage} noun="orders" />
      </div>

      <div className="flex items-start gap-4 bg-yellow-50 border border-yellow-200 rounded-2xl px-6 py-5">
        <span className="shrink-0 w-8 h-8 rounded-full bg-yellow-400 text-white flex items-center justify-center">
          <Info className="w-4 h-4" />
        </span>
        <div>
          <div className="text-sm font-semibold text-gray-900">Refund updates will appear here once reviewed.</div>
          <div className="text-sm text-gray-600 mt-0.5">You'll be notified about the status of your refund request.</div>
        </div>
      </div>

      {/* Refund detail */}
      {detailRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDetailRefund(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-gray-900">{detailRefund.RefundCode}</h3>
                {statusPill(detailRefund.Status)}
              </div>
              <button onClick={() => setDetailRefund(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">Order</div>
                  <div className="text-gray-700">{withHash(detailRefund.OrderCodeId)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">Amount</div>
                  <div className="text-gray-900 font-semibold">{formatAmount(detailRefund.RequestedAmount)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">Refund For</div>
                  <div className="text-gray-700">{detailRefund.Scope === "service" ? detailRefund.ItemName || "A service" : "Whole order"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">Requested On</div>
                  <div className="text-gray-700">{formatDate(detailRefund.RequestedOn)}</div>
                </div>
              </div>
              {detailRefund.Reason && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">Reason</div>
                  <div className="text-gray-700 whitespace-pre-line">{detailRefund.Reason}</div>
                </div>
              )}
              {detailRefund.Status === "Rejected" && detailRefund.RejectionReason && (
                <div className="bg-red-50 rounded-lg px-3 py-2">
                  <div className="text-xs font-semibold text-gray-500 mb-1">Rejected</div>
                  <div className="text-red-600">{detailRefund.RejectionReason}</div>
                </div>
              )}
              {detailRefund.Status === "Processed" && (
                <div className="bg-green-50 rounded-lg px-3 py-2 text-green-700">
                  Refunded via {detailRefund.RefundMethod || "-"}
                  {detailRefund.ProcessedOn ? ` on ${formatDate(detailRefund.ProcessedOn)}` : ""}.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Request refund modal */}
      {modalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setModalOrder(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">
            <div className="overflow-y-auto px-7 pt-7 pb-5 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="relative shrink-0 w-14 h-14 rounded-2xl bg-yellow-50 flex items-center justify-center text-gray-900">
                    <Wallet className="w-7 h-7" />
                    <RotateCcw className="w-4 h-4 text-yellow-500 absolute top-2 right-2" />
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Request Refund</h3>
                    <p className="text-sm text-gray-500">Order {withHash(modalOrder.OrderID || modalOrder.id)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalOrder(null)}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-gray-500">
                Tell us why you'd like a refund. Our team will review your request and
                confirm the refund amount.
              </p>

              {/* Refund for */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Refund for <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <ScopeCard
                    checked={scope === "order"}
                    onChange={() => onScopeChange("order")}
                    icon={<Package className="w-5 h-5" />}
                    title="Whole order"
                    sub="Request a refund for the entire order"
                  />
                  <ScopeCard
                    checked={scope === "service"}
                    onChange={() => onScopeChange("service")}
                    icon={<Layers className="w-5 h-5" />}
                    title="A specific service"
                    sub="Request a refund for selected service(s)"
                  />
                </div>
              </div>

              {scope === "service" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Service <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={serviceDetailId}
                    onChange={(e) => onServiceChange(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="">— Select a service —</option>
                    {(modalOrder?.ServiceDetails || []).map((s) => (
                      <option key={s.ServiceDetailID} value={s.ServiceDetailID}>
                        {s.ServiceName || s.ItemName || `Service #${s.ServiceDetailID}`}
                      </option>
                    ))}
                  </select>
                  {(modalOrder?.ServiceDetails || []).length === 0 && (
                    <p className="text-[11px] text-gray-400 mt-1">No individual services found for this order.</p>
                  )}
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
                    maxLength={REASON_MAX}
                    rows={3}
                    placeholder="Why are you requesting a refund?"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 pb-7 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                  />
                  <span className="absolute right-3 bottom-3 text-xs text-gray-400">{reason.length}/{REASON_MAX}</span>
                </div>
              </div>

              {/* Bank details */}
              <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
                <div className="flex items-start gap-4">
                  <span className="shrink-0 w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                    <Landmark className="w-6 h-6" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Bank details (only needed if refunded offline)</div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      If you paid online we will refund to your original payment method automatically. Otherwise, add where to send the money.
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-800 mb-1.5">Account holder name</label>
                  <IconInput
                    icon={<User className="w-5 h-5" />}
                    value={bank.beneficiaryName}
                    onChange={(e) => setBank({ ...bank, beneficiaryName: e.target.value })}
                    placeholder="Enter account holder name"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-800 mb-1.5">Account number</label>
                    <IconInput
                      icon={<CreditCard className="w-5 h-5" />}
                      value={bank.accountNumber}
                      onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })}
                      placeholder="Enter account number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-800 mb-1.5">IFSC</label>
                    <IconInput
                      icon={<Landmark className="w-5 h-5" />}
                      value={bank.ifsc}
                      onChange={(e) => setBank({ ...bank, ifsc: e.target.value })}
                      placeholder="Enter IFSC code"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-800 mb-1.5">Bank name</label>
                    <IconInput
                      icon={<Landmark className="w-5 h-5" />}
                      value={bank.bankName}
                      onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
                      placeholder="Enter bank name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-800 mb-1.5">
                      UPI ID <span className="text-gray-400">(optional)</span>
                    </label>
                    <IconInput
                      icon={<UpiIcon />}
                      value={bank.upiId}
                      onChange={(e) => setBank({ ...bank, upiId: e.target.value })}
                      placeholder="Enter UPI ID"
                    />
                  </div>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>

            <div className="flex justify-end gap-3 px-7 py-5 border-t border-gray-100">
              <button
                onClick={() => setModalOrder(null)}
                className="px-8 py-2.5 text-sm font-semibold text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="px-10 py-2.5 text-sm font-semibold text-gray-900 bg-yellow-400 hover:bg-yellow-500 rounded-xl disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Refunds;

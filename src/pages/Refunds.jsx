import React, { useEffect, useState } from "react";
import { getAllOrdersByCompany } from "../api/Orders/Order";
import {
  getRefundable,
  createCustomerRefund,
  getMyRefunds,
} from "../api/Refund/Refund";

const STATUS_STYLES = {
  Processed: "bg-green-500 text-white",
  Accepted: "bg-green-100 text-green-700",
  Pending: "bg-orange-100 text-orange-700",
  Processing: "bg-blue-100 text-blue-700",
  Rejected: "bg-red-100 text-red-700",
  Failed: "bg-red-100 text-red-700",
};

const Refunds = () => {
  const [orders, setOrders] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOrder, setModalOrder] = useState(null);
  const [maxRefundable, setMaxRefundable] = useState(0);
  const [scope, setScope] = useState("order"); // "order" | "service"
  const [serviceDetailId, setServiceDetailId] = useState("");
  const [reason, setReason] = useState("");
  const [bank, setBank] = useState({ beneficiaryName: "", accountNumber: "", ifsc: "", bankName: "", upiId: "" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const ordRes = await getAllOrdersByCompany({ page: 1, limit: 50 });
      setOrders(ordRes.data || ordRes.orders || []);
    } catch {
      setOrders([]);
    }
    try {
      const refRes = await getMyRefunds({ page: 1, limit: 50 });
      setRefunds(refRes.data || []);
    } catch {
      setRefunds([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

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
    setBank({ beneficiaryName: "", accountNumber: "", ifsc: "", bankName: "", upiId: "" });
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

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Refunds</h1>
      <p className="text-sm text-gray-500 mb-6">Request a refund for an order and track its status.</p>

      {/* My refunds */}
      <h2 className="text-lg font-semibold text-gray-800 mb-3">My Refund Requests</h2>
      {loading ? (
        <div className="text-gray-400 py-6">Loading…</div>
      ) : refunds.length === 0 ? (
        <div className="text-gray-400 py-6">No refund requests yet.</div>
      ) : (
        <div className="space-y-3 mb-8">
          {refunds.map((r) => (
            <div key={r.RefundID} className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-gray-700">{r.RefundCode}</span>
                  <span className={`text-xs font-medium px-3 py-1 rounded-lg ${STATUS_STYLES[r.Status] || "bg-gray-100 text-gray-600"}`}>{r.Status}</span>
                </div>
                <span className="text-lg font-bold text-gray-900">₹{Number(r.RequestedAmount).toLocaleString("en-IN")}</span>
              </div>
              <div className="text-sm text-gray-600">
                {r.Reason && <div><span className="text-gray-400">Reason:</span> {r.Reason}</div>}
                {r.Status === "Rejected" && r.RejectionReason && (
                  <div className="text-red-600"><span className="text-gray-400">Rejected:</span> {r.RejectionReason}</div>
                )}
                {r.Status === "Processed" && (
                  <div className="text-green-700">Refunded via {r.RefundMethod || "—"}{r.ProcessedOn ? ` on ${new Date(r.ProcessedOn).toLocaleDateString()}` : ""}.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Orders to request refund on */}
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Your Orders</h2>
      {orders.length === 0 ? (
        <div className="text-gray-400 py-6">No orders found.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((order, i) => (
            <div key={order.OrderID || order.id || i} className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Order #{order.OrderID || order.id}</div>
                <div className="text-sm text-gray-500">{order.PackageName || order.ItemName || order.CompanyName || ""}</div>
              </div>
              <button
                onClick={() => openModal(order)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-yellow-400 hover:bg-yellow-500 text-gray-900"
              >
                Request Refund
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setModalOrder(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Request Refund · Order #{modalOrder.OrderID || modalOrder.id}</h3>
              <button onClick={() => setModalOrder(null)} className="text-gray-400 hover:text-red-500 text-2xl font-bold leading-none">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-500">
                Tell us why you'd like a refund. Our team will review your request and
                confirm the refund amount.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Refund for *</label>
                <div className="flex gap-3">
                  <label className={`flex-1 flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer ${scope === "order" ? "border-yellow-400 bg-yellow-50" : "border-gray-200"}`}>
                    <input type="radio" name="refundScope" checked={scope === "order"} onChange={() => onScopeChange("order")} />
                    Whole order
                  </label>
                  <label className={`flex-1 flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer ${scope === "service" ? "border-yellow-400 bg-yellow-50" : "border-gray-200"}`}>
                    <input type="radio" name="refundScope" checked={scope === "service"} onChange={() => onScopeChange("service")} />
                    A specific service
                  </label>
                </div>
              </div>

              {scope === "service" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Service *</label>
                  <select
                    value={serviceDetailId}
                    onChange={(e) => onServiceChange(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
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

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Reason *</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Why are you requesting a refund?" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
                <div className="text-xs font-semibold text-gray-700">Bank details (only needed if refunded offline)</div>
                <p className="text-[11px] text-gray-400 -mt-1">If you paid online we refund to your original payment method automatically. Otherwise, add where to send the money.</p>
                <input value={bank.beneficiaryName} onChange={(e) => setBank({ ...bank, beneficiaryName: e.target.value })} placeholder="Account holder name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} placeholder="Account number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                  <input value={bank.ifsc} onChange={(e) => setBank({ ...bank, ifsc: e.target.value })} placeholder="IFSC" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                  <input value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} placeholder="Bank name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                  <input value={bank.upiId} onChange={(e) => setBank({ ...bank, upiId: e.target.value })} placeholder="or UPI ID" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setModalOrder(null)} className="px-5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={submit} disabled={submitting} className="px-5 py-2 text-sm font-semibold text-gray-900 bg-yellow-400 hover:bg-yellow-500 rounded-lg disabled:opacity-60">{submitting ? "Submitting…" : "Submit"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Refunds;

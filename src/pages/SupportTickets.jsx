import React, { useEffect, useState } from "react";
import { getAllOrdersByCompany } from "../api/Orders/Order";
import { createSupportTicket, getMyTickets } from "../api/SupportTickets/SupportTicket";

const STATUS_STYLES = {
  Open: "bg-orange-100 text-orange-700",
  InProgress: "bg-blue-100 text-blue-700",
  Resolved: "bg-green-100 text-green-700",
  Closed: "bg-gray-200 text-gray-700",
};

const STATUS_LABEL = {
  Open: "Open",
  InProgress: "In Progress",
  Resolved: "Resolved",
  Closed: "Closed",
};

const CATEGORIES = [
  { value: "general", label: "General enquiry" },
  { value: "order", label: "Order issue" },
  { value: "payment", label: "Payment / Invoice" },
  { value: "service", label: "Service / Task delay" },
];

const CATEGORY_LABEL = CATEGORIES.reduce((m, c) => ({ ...m, [c.value]: c.label }), {});

const PRIORITIES = ["low", "medium", "high", "urgent"];

const emptyForm = {
  category: "general",
  orderKey: "",
  subject: "",
  description: "",
  priority: "medium",
};

const SupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const tRes = await getMyTickets({ page: 1, limit: 50 });
      setTickets(tRes.data || []);
    } catch {
      setTickets([]);
    }
    try {
      const ordRes = await getAllOrdersByCompany({ page: 1, limit: 50 });
      setOrders(ordRes.data || ordRes.orders || []);
    } catch {
      setOrders([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openModal = () => {
    setForm(emptyForm);
    setError(null);
    setShowModal(true);
  };

  const needsOrder = form.category !== "general";

  const submit = async () => {
    if (!form.subject.trim()) return setError("Please enter a subject.");
    setError(null);
    setSubmitting(true);
    try {
      let orderId = null;
      let quoteId = null;
      if (needsOrder && form.orderKey) {
        const order = orders.find(
          (o) => String(o.OrderID || o.id) === String(form.orderKey)
        );
        if (order) {
          orderId = order.OrderID || order.id;
          quoteId = order.QuoteID;
        }
      }
      await createSupportTicket({
        category: form.category,
        subject: form.subject.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        ...(orderId ? { orderId, quoteId } : {}),
      });
      setShowModal(false);
      await loadAll();
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to submit your ticket."
      );
    }
    setSubmitting(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-900">Support</h1>
        <button
          onClick={openModal}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-yellow-400 hover:bg-yellow-500 text-gray-900"
        >
          Raise a Ticket
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Raise a support request and track its status until it's resolved.
      </p>

      <h2 className="text-lg font-semibold text-gray-800 mb-3">My Support Tickets</h2>
      {loading ? (
        <div className="text-gray-400 py-6">Loading…</div>
      ) : tickets.length === 0 ? (
        <div className="text-gray-400 py-6">
          No support tickets yet. Click “Raise a Ticket” to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div
              key={t.TicketID}
              className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-gray-700">{t.TicketCode}</span>
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-lg ${
                      STATUS_STYLES[t.Status] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {STATUS_LABEL[t.Status] || t.Status}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {CATEGORY_LABEL[t.Category] || t.Category}
                </span>
              </div>
              <div className="font-medium text-gray-900">{t.Subject}</div>
              {t.Description && (
                <div className="text-sm text-gray-600 mt-1">{t.Description}</div>
              )}
              {t.OrderCodeId && (
                <div className="text-xs text-gray-400 mt-1">Order: {t.OrderCodeId}</div>
              )}
              {(t.Status === "Resolved" || t.Status === "Closed") && t.ResolutionNotes && (
                <div className="text-sm text-green-700 mt-2 bg-green-50 rounded-lg px-3 py-2">
                  <span className="text-gray-500">Resolution:</span> {t.ResolutionNotes}
                </div>
              )}
              {t.CreatedAt && (
                <div className="text-xs text-gray-400 mt-2">
                  Raised on {new Date(t.CreatedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Raise a Support Ticket</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-red-500 text-2xl font-bold leading-none"
              >
                &times;
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value, orderKey: "" })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {needsOrder && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Related order {orders.length ? "(optional)" : ""}
                  </label>
                  <select
                    value={form.orderKey}
                    onChange={(e) => setForm({ ...form, orderKey: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="">— Select an order —</option>
                    {orders.map((o, i) => (
                      <option key={o.OrderID || o.id || i} value={o.OrderID || o.id}>
                        Order #{o.OrderID || o.id}
                        {o.PackageName || o.ItemName ? ` · ${o.PackageName || o.ItemName}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Subject *</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Briefly describe the issue"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Details</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  placeholder="Add any details that will help us resolve this faster"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="px-5 py-2 text-sm font-semibold text-gray-900 bg-yellow-400 hover:bg-yellow-500 rounded-lg disabled:opacity-60"
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

export default SupportTickets;

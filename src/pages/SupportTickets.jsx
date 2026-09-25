import React, { useEffect, useState } from "react";
import { getAllOrdersByCompany } from "../api/Orders/Order";
import {
  createSupportTicket,
  getMyTickets,
  getCompanyIdFromStorage,
} from "../api/SupportTickets/SupportTicket";
import { checkCompanyHasQuote } from "../api/Quote";
import { assignCustomer } from "../api/CustomerApi";
import { createLead, createLeadFollowUp } from "../api/LeadApi";
import { insertDeal, createDealFollowUp, getCompanyDetails } from "../api/DealsApi";
import { getServicePriceCurrency } from "../api/ServicesApi";
import { calcGstAmount, fetchFranchiseeGstInfo } from "../utils/gstCalc";
import { getSecureItem } from "../utils/secureStorage";
import ServiceCatalogPicker from "../components/SupportTickets/ServiceCatalogPicker";

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
  { value: "callback", label: "Call back request" },
];

const CATEGORY_LABEL = CATEGORIES.reduce((m, c) => ({ ...m, [c.value]: c.label }), {});

const PRIORITIES = ["low", "medium", "high", "urgent"];

const emptyForm = {
  category: "general",
  orderKey: "",
  subject: "",
  description: "",
  priority: "",
};

const emptyCallbackForm = {
  step2: "", // "new" | "existing"
  preferredDateTime: "",
  note: "",
  name: "",
  mobile: "",
  email: "",
  state: "",
  district: "",
  preferredLanguage: "",
};

const readStoredUser = () => {
  try {
    const raw = getSecureItem("user");
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
};

const SupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // --- Call-back request routing state ---------------------------------
  const [callbackForm, setCallbackForm] = useState(emptyCallbackForm);
  const [hasQuote, setHasQuote] = useState(null); // null = checking, true/false once resolved
  const [checkingQuote, setCheckingQuote] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

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
    const user = readStoredUser();
    setForm(emptyForm);
    setCallbackForm({
      ...emptyCallbackForm,
      name: user ? `${user.FirstName || ""} ${user.LastName || ""}`.trim() : "",
      mobile: user?.Mobile || user?.mobile || "",
      email: user?.Email || user?.email || "",
    });
    setSelectedService(null);
    setHasQuote(null);
    setError(null);
    setShowModal(true);
  };

  const needsOrder = form.category !== "general" && form.category !== "callback";

  const handleCategoryChange = async (value) => {
    setForm({ ...form, category: value, orderKey: "" });
    setCallbackForm((prev) => ({ ...prev, step2: "" }));
    setSelectedService(null);
    setHasQuote(null);
    setError(null);

    if (value !== "callback") return;

    const companyId = getCompanyIdFromStorage();
    if (!companyId) {
      setHasQuote(false);
      return;
    }
    setCheckingQuote(true);
    try {
      const res = await checkCompanyHasQuote(companyId);
      setHasQuote(!!res?.hasQuote);
    } catch {
      // Fail toward "new user" (Lead) — server-side dedup guards against a
      // false-positive duplicate lead if the customer actually has quotes.
      setHasQuote(false);
    }
    setCheckingQuote(false);
  };

  const formatCallbackNote = () => {
    const parts = [];
    if (callbackForm.preferredDateTime) {
      parts.push(`Preferred call-back: ${new Date(callbackForm.preferredDateTime).toLocaleString()}`);
    }
    if (callbackForm.note.trim()) parts.push(callbackForm.note.trim());
    return parts.join(" — ");
  };

  const submitExistingServiceTicket = async () => {
    if (!selectedService) return setError("Please select the service this is about.");
    setSubmitting(true);
    try {
      await createSupportTicket({
        category: "callback",
        subject: `Call back request — ${selectedService.name}`,
        description: formatCallbackNote(),
        priority: "medium",
        orderId: selectedService.orderId,
        quoteId: selectedService.quoteId,
      });
      setShowModal(false);
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to submit your request.");
    }
    setSubmitting(false);
  };

  const submitLead = async () => {
    if (!callbackForm.name.trim()) return setError("Please enter your name.");
    if (!callbackForm.mobile.trim() && !callbackForm.email.trim()) {
      return setError("Please enter a mobile number or email.");
    }
    if (!callbackForm.state.trim()) return setError("Please enter your state.");
    setSubmitting(true);
    try {
      // No employeeId here on purpose — leaving it unset lets the backend's
      // routeLead() resolve an owner itself via the normal Sunday/business-hours
      // gated, cap-aware round robin, instead of force-owning it to whichever
      // agent assignCustomer happens to pick.
      const assignment = await assignCustomer({
        language: callbackForm.preferredLanguage || "English",
        state: callbackForm.state,
        district: callbackForm.district,
      });
      const leadRes = await createLead({
        name: callbackForm.name.trim(),
        state: callbackForm.state,
        mobile: callbackForm.mobile,
        email: callbackForm.email,
        proposed_service: selectedService.name,
        preferred_language: callbackForm.preferredLanguage,
        lead_source: "callback",
        franchiseeId: assignment?.franchiseeId,
      });
      const leadId = leadRes?.lead?.id;
      if (leadId) {
        try {
          await createLeadFollowUp({
            leadId,
            followUpDate: new Date(callbackForm.preferredDateTime).toISOString(),
            remark: callbackForm.note,
          });
        } catch (fuErr) {
          console.error("Lead follow-up scheduling failed (non-fatal):", fuErr);
        }
      }
      setShowModal(false);
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to submit your request.");
    }
    setSubmitting(false);
  };

  const submitDeal = async () => {
    if (!callbackForm.name.trim() || !callbackForm.mobile.trim() || !callbackForm.email.trim()) {
      return setError("Please confirm your name, mobile and email.");
    }
    setSubmitting(true);
    try {
      const companyId = getCompanyIdFromStorage();
      const user = readStoredUser();
      const customerId = user?.CustomerID;
      const company = user?.Companies?.find((c) => String(c.CompanyID) === String(companyId)) || user?.Companies?.[0];

      const companyDetailsRes = await getCompanyDetails(companyId);
      const companyDetails = companyDetailsRes?.data || {};
      const franchiseId = companyDetails.FranchiseID;
      const employeeId = companyDetails.Agents?.[0]?.EmployeeID;
      const stateName = company?.State || companyDetails.State || "";

      const { gstEligible } = await fetchFranchiseeGstInfo(franchiseId);

      let priceLine;
      if (selectedService.dealType === "Individual") {
        const priceRes = await getServicePriceCurrency({ StateName: stateName, ServiceID: selectedService.id });
        const priceObj = priceRes?.data || {};
        const professionalFee = Number(priceObj.ProfessionalFee || 0);
        const vendorFee = Number(priceObj.VendorFee || 0);
        const govtFee = Number(priceObj.GovernmentFee || 0);
        const contractorFee = Number(priceObj.ContractFee || 0);
        const gstAmount = calcGstAmount(professionalFee, vendorFee, gstEligible);
        priceLine = {
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          professionalFee,
          vendorFee,
          contractorFee,
          govtFee,
          gstPct: gstEligible ? 18 : 0,
          total: professionalFee + vendorFee + govtFee + contractorFee + gstAmount,
          serviceCategoryId: selectedService.raw?.CategoryID,
          serviceCategory: selectedService.raw?.CategoryName,
        };
      } else {
        const pkg = selectedService.raw || {};
        const professionalFee = Number(pkg.ProfessionalFeeYearly ?? pkg.ProfessionalFee ?? 0);
        const vendorFee = Number(pkg.VendorFeeYearly ?? pkg.VendorFee ?? 0);
        const govtFee = Number(pkg.GovernmentFeeYearly ?? pkg.GovernmentFee ?? 0);
        const gstAmount = calcGstAmount(professionalFee, vendorFee, gstEligible);
        priceLine = {
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          professionalFee,
          vendorFee,
          contractorFee: 0,
          govtFee,
          gstPct: gstEligible ? 18 : 0,
          total: professionalFee + vendorFee + govtFee + gstAmount,
          packageId: selectedService.id,
          packageName: selectedService.name,
          billingPeriod: "Yearly",
        };
      }

      const dealRes = await insertDeal({
        name: callbackForm.name.trim(),
        state: stateName,
        mobile: callbackForm.mobile,
        email: callbackForm.email,
        franchiseId,
        employeeId,
        sourceOfSale: "callback",
        dealType: selectedService.dealType,
        services: [priceLine],
        CompanyID: companyId,
        CustomerID: customerId,
      });

      const dealId = dealRes?.insertId;
      if (dealId) {
        try {
          await createDealFollowUp({
            dealId,
            followUpDate: new Date(callbackForm.preferredDateTime).toISOString(),
            remark: callbackForm.note,
          });
        } catch (fuErr) {
          console.error("Deal follow-up scheduling failed (non-fatal):", fuErr);
        }
      }
      setShowModal(false);
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to submit your request.");
    }
    setSubmitting(false);
  };

  const submitCallback = async () => {
    if (!callbackForm.step2) {
      return setError("Please tell us if this is about a new or existing service.");
    }
    if (!callbackForm.preferredDateTime) {
      return setError("Please select a preferred call-back date/time.");
    }

    if (callbackForm.step2 === "existing") return submitExistingServiceTicket();

    if (!selectedService) return setError("Please select the service you're interested in.");
    return hasQuote === false ? submitLead() : submitDeal();
  };

  const submit = async () => {
    setError(null);
    if (form.category === "callback") return submitCallback();

    if (!form.subject.trim()) return setError("Please enter a subject.");
    if (!form.priority) return setError("Please select a priority.");
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

  const inputClass =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400";

  const renderContactFields = () => (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label>
        <input
          type="text"
          value={callbackForm.name}
          onChange={(e) => setCallbackForm({ ...callbackForm, name: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Mobile</label>
        <input
          type="text"
          value={callbackForm.mobile}
          onChange={(e) => setCallbackForm({ ...callbackForm, mobile: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
        <input
          type="email"
          value={callbackForm.email}
          onChange={(e) => setCallbackForm({ ...callbackForm, email: e.target.value })}
          className={inputClass}
        />
      </div>
    </div>
  );

  const renderCallbackDateNote = () => (
    <div className="grid grid-cols-1 gap-3">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Preferred call-back date/time *
        </label>
        <input
          type="datetime-local"
          value={callbackForm.preferredDateTime}
          onChange={(e) => setCallbackForm({ ...callbackForm, preferredDateTime: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Note (optional)</label>
        <textarea
          value={callbackForm.note}
          onChange={(e) => setCallbackForm({ ...callbackForm, note: e.target.value })}
          rows={3}
          placeholder="Anything that will help us prepare for the call"
          className={`${inputClass} resize-none`}
        />
      </div>
    </div>
  );

  const renderCallbackFlow = () => {
    if (checkingQuote || hasQuote === null) {
      return <div className="text-sm text-gray-400 py-2">Checking your account…</div>;
    }

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Is this about a new service, or a service you already have? *
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setCallbackForm({ ...callbackForm, step2: "new" });
                setSelectedService(null);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg border ${
                callbackForm.step2 === "new"
                  ? "bg-yellow-400 border-yellow-400 text-gray-900 font-semibold"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              A new service
            </button>
            <button
              type="button"
              onClick={() => {
                setCallbackForm({ ...callbackForm, step2: "existing" });
                setSelectedService(null);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg border ${
                callbackForm.step2 === "existing"
                  ? "bg-yellow-400 border-yellow-400 text-gray-900 font-semibold"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              A service I already have
            </button>
          </div>
        </div>

        {callbackForm.step2 === "existing" && (
          <>
            <ServiceCatalogPicker source="own-orders" onSelect={setSelectedService} />
            {renderCallbackDateNote()}
          </>
        )}

        {callbackForm.step2 === "new" && hasQuote === false && (
          <>
            {renderContactFields()}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">State *</label>
                <input
                  type="text"
                  value={callbackForm.state}
                  onChange={(e) => setCallbackForm({ ...callbackForm, state: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">District</label>
                <input
                  type="text"
                  value={callbackForm.district}
                  onChange={(e) => setCallbackForm({ ...callbackForm, district: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Preferred language</label>
                <input
                  type="text"
                  value={callbackForm.preferredLanguage}
                  onChange={(e) => setCallbackForm({ ...callbackForm, preferredLanguage: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <ServiceCatalogPicker source="catalog" onSelect={setSelectedService} />
            {renderCallbackDateNote()}
          </>
        )}

        {callbackForm.step2 === "new" && hasQuote === true && (
          <>
            {renderContactFields()}
            <ServiceCatalogPicker source="catalog" onSelect={setSelectedService} />
            {renderCallbackDateNote()}
          </>
        )}
      </div>
    );
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
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className={inputClass}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {form.category === "callback" ? (
                renderCallbackFlow()
              ) : (
                <>
                  {needsOrder && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Related order {orders.length ? "(optional)" : ""}
                      </label>
                      <select
                        value={form.orderKey}
                        onChange={(e) => setForm({ ...form, orderKey: e.target.value })}
                        className={inputClass}
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
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Details</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={4}
                      placeholder="Add any details that will help us resolve this faster"
                      className={`${inputClass} resize-none`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Priority *</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">— Select priority —</option>
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

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

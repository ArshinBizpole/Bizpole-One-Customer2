import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Plus } from "lucide-react";
import Pagination from "../components/Pagination";
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
  Open: "bg-blue-50 text-blue-600 border-blue-200",
  InProgress: "bg-amber-50 text-amber-700 border-amber-200",
  Resolved: "bg-green-50 text-green-600 border-green-200",
  Closed: "bg-gray-50 text-gray-600 border-gray-200",
};

const PAGE_SIZE = 10;

// "2025-11-08 09:24 AM"
const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  const h = d.getHours() % 12 || 12;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(h)}:${pad(d.getMinutes())} ${d.getHours() < 12 ? "AM" : "PM"}`;
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

  // --- Ticket list: search / filter / sort / paging (client-side) ---------
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState({ key: "CreatedAt", dir: "desc" });
  const [page, setPage] = useState(1);
  const [detailTicket, setDetailTicket] = useState(null);

  // Only the latest load may update state: on a reload this runs once for the
  // previously stored company and again after the dashboard settles on the
  // real one, and the older response mustn't land last.
  const loadSeq = useRef(0);
  const loadAll = async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    let nextTickets = [];
    let nextOrders = [];
    try {
      const tRes = await getMyTickets({ page: 1, limit: 200 });
      nextTickets = tRes.data || [];
    } catch {
      nextTickets = [];
    }
    try {
      const ordRes = await getAllOrdersByCompany({ page: 1, limit: 50 });
      nextOrders = ordRes.data || ordRes.orders || [];
    } catch {
      nextOrders = [];
    }
    if (seq !== loadSeq.current) return;
    setTickets(nextTickets);
    setOrders(nextOrders);
    setLoading(false);
  };

  // Tickets and orders are per company (both APIs read the selected company
  // from storage), so reload them when the header's company dropdown switches.
  useEffect(() => {
    loadAll();
    window.addEventListener("company-switched", loadAll);
    return () => window.removeEventListener("company-switched", loadAll);
  }, []);

  const categoryLabel = (c) => CATEGORY_LABEL[c] || c || "—";

  const visibleTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = tickets.filter((t) => {
      if (statusFilter && t.Status !== statusFilter) return false;
      if (!q) return true;
      return [t.TicketCode, categoryLabel(t.Category), t.Subject, t.OrderCodeId]
        .some((v) => String(v || "").toLowerCase().includes(q));
    });
    const valueOf = (t) => {
      if (sort.key === "CreatedAt") return new Date(t.CreatedAt).getTime() || 0;
      if (sort.key === "Category") return categoryLabel(t.Category).toLowerCase();
      if (sort.key === "Status") return (STATUS_LABEL[t.Status] || t.Status || "").toLowerCase();
      return String(t[sort.key] || "").toLowerCase();
    };
    return [...filtered].sort((a, b) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      if (va < vb) return sort.dir === "asc" ? -1 : 1;
      if (va > vb) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [tickets, search, statusFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(visibleTickets.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageTickets = visibleTickets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Back to page 1 whenever the result set changes shape
  useEffect(() => setPage(1), [search, statusFilter, tickets]);

  const toggleSort = (key) =>
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

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

  // Follow-up remark for the Lead/Deal. The "Call back request" prefix is what
  // the customer's Calendar (/website/my-callbacks) recognises as theirs.
  const callbackRemark = () =>
    `Call back request — ${selectedService?.name || "New service"}${callbackForm.preferredDateTime ? `. Call at ${new Date(callbackForm.preferredDateTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : ""}${callbackForm.note.trim() ? `. Note: ${callbackForm.note.trim()}` : ""}`;

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
            followUpDate: String(callbackForm.preferredDateTime).split("T")[0],
            followUpTime: String(callbackForm.preferredDateTime).split("T")[1],
            remark: callbackRemark(),
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
            followUpDate: String(callbackForm.preferredDateTime).split("T")[0],
            followUpTime: String(callbackForm.preferredDateTime).split("T")[1],
            remark: callbackRemark(),
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
          // order.OrderID is the display code (e.g. "OR000622"); the ticket's
          // OrderID column is the numeric key, so send OrderPK (same as
          // ServiceCatalogPicker / Companyinvoice).
          orderId = order.OrderPK ?? order.id;
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
    <div className="p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Customer Support</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track all customer support requests</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-yellow-400 hover:bg-yellow-500 text-gray-900 shrink-0"
        >
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      {/* Search + status filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets..."
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
        <div className="relative sm:w-44">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full appearance-none border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <option value="">All Statuses</option>
            {Object.keys(STATUS_LABEL).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Tickets table */}
      {/* Fixed height for PAGE_SIZE rows (h-12 each + header) so the footer
          below always sits in the same spot, however many rows this page has. */}
      <div className="bg-white border border-gray-200 rounded-xl flex flex-col">
        <div className="overflow-x-auto min-h-[528px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="h-12 border-b border-gray-100 text-left text-gray-700">
              {[
                { key: "TicketCode", label: "Ticket ID" },
                { key: "Category", label: "Category" },
                { key: "Status", label: "Status" },
                { key: "Subject", label: "Subject" },
                { key: "CreatedAt", label: "Created At" },
              ].map((col) => (
                <th key={col.key} className="px-5 font-medium whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className="inline-flex items-center gap-1.5 hover:text-gray-900"
                  >
                    {col.label}
                    {sort.key !== col.key ? (
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    ) : sort.dir === "asc" ? (
                      <ArrowUp className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">Loading…</td></tr>
            ) : pageTickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                  {tickets.length === 0
                    ? "No support tickets yet. Click “New Ticket” to create one."
                    : "No tickets match your search."}
                </td>
              </tr>
            ) : (
              pageTickets.map((t) => (
                <tr
                  key={t.TicketID}
                  onClick={() => setDetailTicket(t)}
                  className="h-12 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">{t.TicketCode}</td>
                  <td className="px-5 py-3 text-gray-700 whitespace-nowrap">{categoryLabel(t.Category)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md border ${STATUS_STYLES[t.Status] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                      {STATUS_LABEL[t.Status] || t.Status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-700 max-w-xs truncate" title={t.Subject}>{t.Subject || "—"}</td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(t.CreatedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination — always shown, pinned to the bottom of the card */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">
            {visibleTickets.length === 0
              ? "Showing 0 tickets"
              : `Showing ${(currentPage - 1) * PAGE_SIZE + 1} to ${Math.min(currentPage * PAGE_SIZE, visibleTickets.length)} of ${visibleTickets.length} tickets`}
          </span>
          <Pagination page={currentPage} totalPages={totalPages} onPage={setPage} />
        </div>
      </div>

      {/* Ticket detail */}
      {detailTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDetailTicket(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-gray-900">{detailTicket.TicketCode}</h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${STATUS_STYLES[detailTicket.Status] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                  {STATUS_LABEL[detailTicket.Status] || detailTicket.Status}
                </span>
              </div>
              <button
                onClick={() => setDetailTicket(null)}
                className="text-gray-400 hover:text-red-500 text-2xl font-bold leading-none"
              >
                &times;
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 text-sm">
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">Subject</div>
                <div className="text-gray-900 font-medium">{detailTicket.Subject || "—"}</div>
              </div>
              {detailTicket.Description && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">Details</div>
                  <div className="text-gray-700 whitespace-pre-line">{detailTicket.Description}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">Category</div>
                  <div className="text-gray-700">{categoryLabel(detailTicket.Category)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">Priority</div>
                  <div className="text-gray-700 capitalize">{detailTicket.Priority || "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">Order</div>
                  <div className="text-gray-700">{detailTicket.OrderCodeId || "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">Created At</div>
                  <div className="text-gray-700">{formatDateTime(detailTicket.CreatedAt)}</div>
                </div>
              </div>
              {(detailTicket.Status === "Resolved" || detailTicket.Status === "Closed") && detailTicket.ResolutionNotes && (
                <div className="bg-green-50 rounded-lg px-3 py-2">
                  <div className="text-xs font-semibold text-gray-500 mb-1">
                    Resolution{detailTicket.ResolvedOn ? ` · ${formatDateTime(detailTicket.ResolvedOn)}` : ""}
                  </div>
                  <div className="text-green-700">{detailTicket.ResolutionNotes}</div>
                </div>
              )}
            </div>
          </div>
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

import { getClientBaseUrl } from "../../utils/clientBaseUrl";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Home } from "lucide-react";
import CryptoJS from "crypto-js";
import { getSecureItem, setSecureItem, removeSecureItem } from "../../utils/secureStorage";
import { lookupGstin, lookupGstinsByPan } from "../../api/GstinLookup";
import { assignCustomer } from "../../api/CustomerApi";
import { createLead, createLeadFollowUp, updateApplicationContact, updateApplicationDeal, updateApplicationQuote, saveApplicationAnswers, createCustomerCompany, convertLeadToDeal, createQuoteForApplication, uploadApplicationDocument, removeApplicationDocument } from "../../api/LeadApi";
import { sendApplicationReceivedEmail } from "../../api/CustomerEmailApi";
import { getAllStates } from "../../api/States";
import { runTrademarkSearch, checkBusinessName } from "../../api/TrademarkApi";
import { getAllServiceTypes, getPackagesByServiceType } from "../../api/ServiceType";
import { getCompanyIdFromStorage } from "../../api/SupportTickets/SupportTicket";
import { insertDeal, getCompanyDetails, createDealFollowUp } from "../../api/DealsApi";
import { fetchFranchiseeGstInfo, calcGstAmount, splitGst } from "../../utils/gstCalc";
import { getServiceById, getServicePrice } from "../../api/ServicesApi";
import { loginWithPhone, signupWithPhone, verifyOtp } from "../../api/AuthApi";
import { notifyTokenSet } from "../../utils/authSession";
import { clearReferralToken, getReferralToken } from "../../utils/referralAttribution";
import { signedInContact, belongsToOtherCustomer } from "../../utils/applicationPrefill";
import { districtsFor } from "../../utils/districts";
import SigninModal from "../Modals/SigninModal";
import VoiceSpecifyInput from "./VoiceSpecifyInput";
import KycVerify from "./KycVerify";
import FlowStepGuide from "./FlowStepGuide";
import NameCheckReport from "../Trademark/NameCheckReport";
import { saveElementAsPdf } from "../../utils/elementToPdf";
import { kycBlockingError } from "./kycRules";
import { languagesForState, languageForState } from "../../utils/stateLanguages";
import { DOB_MAX, DOB_ERROR, dobError } from "../../utils/dob";
import { sanitize, PATTERNS } from "../../utils/formValidation";
import { getQuotePaymentStatus } from "../../api/QuotePaymentStatusApi";
import { updateMyCompanyDetails, listCompanyDirectors, addCompanyDirector, updateCompanyDirector, removeCompanyDirector, saveCompanyBank } from "../../api/CompanyChangeApi";
import {
  FLOWS, ownerConfig, ownerBaseFields, newOwner, visibleFields, docItems, docGroups, isMinor,
  fieldError, formatInput, exceedsRange, rangeError, DERIVED_ANSWERS, today, rupee, newApplicationId, ADDON_PRICE, ADDON_SERVICE_ID, STATES, bizTypeFromConstitution,
  recommendBusinessType, suggestedBusinessNames, suggestAlternatives,
  generateBusinessObjective, suggestedNicCodes, tmClassMatches,
  selectedNiceClass, tmRiskLevel, NICE_CLASSES,
  TM_MARK_TYPES, TM_LANGUAGES, newTmMark, tmMarks, tmMarkLabel, tmGovtFee,
} from "./existingCompanyData";
import {
  changeKind, loadCurrent, prefillAnswers, currentRows, changedRows, directorSummary,
  nothingToSave, saveChange, myCompanies, personLabel,
  loadExistingCompanyPrefill, fillExistingCompanyAnswers, ownersFromDirectors,
} from "./companyChangeSave";

const STORAGE_KEY = "existingCompanyFlowState";
// Document uploads: images, PDF and office files only — no videos.
const DOC_ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx";
const DOC_ACCEPT_RE = /\.(pdf|jpe?g|png|docx?|xlsx?)$/i;
// Payment-step option that skips the Quote approval tab for an advisor call instead.
const CALLBACK_METHOD = "Request a Call Back";
// Fields a minor owner/director isn't expected to have in their own name yet —
// their nominee/guardian's matching fields are required instead (see validateStep).
const MINOR_OPTIONAL_FIELDS = ["pan", "email", "mobile"];
// A minor can't legally hold a DIN/DPIN or a Director-type role — narrow the Role
// dropdown to what's actually available to them (e.g. Shareholder, Other).
function rolesFor(cfg, minor) {
  if (!minor || !cfg.hasDIN) return cfg.roles;
  return cfg.roles.filter((r) => !/director|designated partner/i.test(r));
}

function freshState(flowId, initialSet) {
  return {
    flowId,
    serviceType: FLOWS[flowId]?.name || "Service",
    stepIndex: 0,
    confirmed: false,
    answers: { ...(initialSet || {}) },
    // Always start with one visible person, so a flow with an "owners" step never
    // opens on an empty "no one added yet" state — "+ Add another" covers the rest.
    owners: [newOwner()],
    documents: {},
    tmSearch: null,
    nameChecks: {},
    helpChooseOpen: false,
    suggestedNames: null,
    classBrowseOpen: false,
    submitted: null,
    // Lead capture — the first name-check / trademark-search / GSTIN-lookup ("checking
    // procedure") in a flow session opens leadGate and asks for contact details, so we
    // can raise a Lead for this prospect even if they abandon the application before
    // Review/Payment. Captured once per flow session (see requireLead()).
    leadGate: null,
    leadCaptured: false,
    leadContact: null,
    // True once the applicant is a signed-in Customer (OTP verified in
    // LeadCaptureModal, or already signed in) — see requireVerifiedCustomer().
    otpVerified: false,
    // Set once the Directors/Shareholders step is completed and the applicant's
    // Customer + Company records are created (see syncCustomerCompany()).
    customerId: null,
    companyId: null,
    // Set once the Directors/Shareholders step is completed and the Lead is
    // converted to a Deal (see createDealForApplication()) — right after the
    // Customer/Company sync above, well before Documents. The Quote is created
    // later, at Payment, against this same Deal.
    dealId: null,
    // Set once the Quote is created at Payment (see createQuoteForApplicationStep()) —
    // the applicant reviews/approves it, and pays, on the existing Quote page this
    // opens them to (see openQuoteForApproval()).
    quoteId: null,
  };
}

// Gate a "checking procedure" (name check, trademark search, GSTIN lookup) behind a
// one-time contact-details capture per flow session — runs `run` immediately once the
// lead has already been captured, otherwise opens the LeadCaptureModal first.
function requireLead(state, bump, run) {
  if (state.leadCaptured) { run(); return; }
  // Signed-in Customer: they're already known, so show the result on this very
  // click — the Lead is raised in the background rather than making the first
  // click look like it did nothing while createLead is in flight.
  if (leadFromSignedInCustomer(state, bump, run, { immediate: true })) return;
  state.leadGate = { run };
  bump();
}

// States with a background raiseLead() in flight — kept out of the persisted
// state so a reload mid-request can't leave the Lead permanently "in progress".
const leadsInFlight = new WeakSet();

// An already signed-in Customer (e.g. opening a flow from the dashboard) has
// nothing to verify — raise the Lead from their profile and carry on, instead
// of making them re-enter their details and an OTP in LeadCaptureModal.
// Returns false (modal still needed) when their profile is missing a detail.
// `immediate` runs `run` straight away instead of after the Lead is raised.
function leadFromSignedInCustomer(state, bump, run, { immediate = false } = {}) {
  const me = signedInContact();
  if (!me?.name || !me.mobile || !me.email) return false;
  state.customerId = state.customerId || me.customerId;
  state.otpVerified = true;
  if (immediate) {
    if (!leadsInFlight.has(state)) {
      leadsInFlight.add(state);
      raiseLead(state, { ...me, ...(state.leadContact || {}) }).finally(() => { leadsInFlight.delete(state); bump(); });
    }
    run();
    return true;
  }
  raiseLead(state, { ...me, ...(state.leadContact || {}) }).then(() => { bump(); run(); });
  return true;
}

// Stricter than requireLead: the applicant must be a signed-in Customer (mobile
// verified by OTP) before `run` — used where a Customer/Company gets created
// (Trademark's Public Trademark Search). Flows whose Step 1 is the no-OTP
// "leadDetails" form have a Lead by now but no sign-in yet, so this still
// opens LeadCaptureModal, which then only verifies (no second Lead).
// Also used outside the wizard by the standalone Trademark Search page, with a
// minimal state ({ serviceType, flowId }) to gate the search report.
// opts.immediate: a signed-in customer gets `run` straight away and the Lead is
// raised in the background, instead of waiting for it (see leadFromSignedInCustomer).
export function requireVerifiedCustomer(state, bump, run, opts = {}) {
  // otpVerified is saved with the application, but the session it proved can
  // be gone since (logout keeps applications, or the token expired) — without
  // a token the applicant isn't signed in any more, so verify again.
  if (!localStorage.getItem("token")) state.otpVerified = false;
  if (!state.otpVerified) {
    try {
      const raw = getSecureItem("user");
      const user = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (localStorage.getItem("token") && user?.CustomerID) {
        state.customerId = state.customerId || user.CustomerID;
        state.otpVerified = true;
      }
    } catch { /* not signed in */ }
  }
  if (state.otpVerified && state.leadCaptured) { run(); return; }
  if (leadFromSignedInCustomer(state, bump, run, opts)) return;
  state.leadGate = { run };
  bump();
}

// The dashboard's "Select Company" list (DashboardLayout.jsx) reads Companies
// straight off the `user` object cached in storage at sign-in time — before
// this Company existed (sign-in happens at Name Check, step 3; the Company
// isn't created until Owners/Directors, step 7+). Without this, a freshly
// registered company would never appear there. Safe to call repeatedly —
// skips if already present.
function syncCachedUserCompany(companyId, companyName) {
  if (!companyId) return;
  try {
    const raw = getSecureItem("user");
    const user = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!user) return;
    const companies = Array.isArray(user.Companies) ? user.Companies : [];
    const known = companies.find((c) => String(c.CompanyID) === String(companyId));
    if (known) {
      // Renamed after it was created (see resaveCompanyEdits) — keep the cached name current.
      if (!companyName || known.BusinessName === companyName) return;
      known.BusinessName = companyName;
    } else {
      user.Companies = [...companies, { CompanyID: companyId, BusinessName: companyName }];
    }
    setSecureItem("user", JSON.stringify(user));
  } catch (err) {
    console.error("Couldn't update cached user companies (non-fatal):", err);
  }
}

// Same idea for the Quote created at Payment: the dashboard's Quotes card
// (DashboardLayout/QuotesList) reads user.Companies[].Quotes from the cached
// sign-in payload, which predates this Quote. Patch it in and fire the same
// "quotes-updated" event upsertQuote() uses, so it shows up without a re-login.
function syncCachedUserQuote(companyId, companyName, quote) {
  if (!companyId || !quote?.QuoteID) return;
  syncCachedUserCompany(companyId, companyName);
  try {
    const raw = getSecureItem("user");
    const user = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!user) return;
    user.Companies = (user.Companies || []).map((c) => {
      if (String(c.CompanyID) !== String(companyId)) return c;
      const quotes = Array.isArray(c.Quotes) ? c.Quotes : [];
      if (quotes.some((q) => String(q.QuoteID) === String(quote.QuoteID))) return c;
      return { ...c, Quotes: [...quotes, quote] };
    });
    setSecureItem("user", JSON.stringify(user));
    window.dispatchEvent(new Event("quotes-updated"));
  } catch (err) {
    console.error("Couldn't update cached user quotes (non-fatal):", err);
  }
}

// Once the applicant has entered real director/company details (the
// Directors/Shareholders step), create/link their Customer + Company records.
// No deal is created here — that stays gated behind convert-to-deal, once
// service details are known. Non-blocking: failure never stops the applicant
// from continuing, same rationale as lead capture (requireLead above).
// Company/Business name to register under — each flow's own field, since
// only `newco` asks it via the name-check step (nc_target/name1). Falls back
// to that same pair for any flow that doesn't declare companyNameFor, so
// nothing here changes for newco itself.
function resolveCompanyName(flow, A) {
  if (typeof flow?.companyNameFor === "function") return (flow.companyNameFor(A) || "").trim();
  // Existing Company ("ex-*") flows declare no companyNameFor: a new entity's
  // own name field (when the flow registers one) wins, else the existing
  // company they named (ex_name) — so Documents has a Company to key off.
  return (ncTarget(A) || A.gst_bizname || A.msme_name || A.iec_bizname || A.other_bizname || A.ex_name || "").trim();
}
// Address fields' key prefix for this flow's own addressFields() step (e.g.
// "gst" -> gst_addr1/gst_state/..., "msme" -> msme_addr1/msme_state/...).
// `newco`'s own address step is unprefixed (addressFields("", ...)), so the
// default ("") keeps that flow reading the same A.addr1/A.state it always has.
function resolveAddress(flow, A, leadContact) {
  const p = flow?.addressPrefix ? flow.addressPrefix + "_" : "";
  return {
    country: A[p + "country"] || leadContact?.country,
    state: A[p + "state"] || leadContact?.state,
    district: A[p + "district"],
    city: A[p + "city"],
    pincode: A[p + "pincode"],
    addressLine1: A[p + "addr1"],
    addressLine2: A[p + "addr2"],
  };
}

// Customer/Company syncs in flight, per application — a second caller (e.g.
// the Documents gate while the owners step's background sync is still
// running) waits on that same request instead of creating a duplicate.
const syncsInFlight = new WeakMap();
function syncCustomerCompany(state, A, bump, flow) {
  if (syncsInFlight.has(state)) return syncsInFlight.get(state);
  const sync = runCustomerCompanySync(state, A, bump, flow).finally(() => syncsInFlight.delete(state));
  syncsInFlight.set(state, sync);
  return sync;
}
function runCustomerCompanySync(state, A, bump, flow) {
  // Already created by this application — write any later edits to it instead.
  if (state.companyId && state.companySaved) return resaveCompanyEdits(state, A, flow).then(() => bump());
  if (state.companyId || !state.leadContact) return Promise.resolve(); // already synced, or no contact captured yet
  const companyName = resolveCompanyName(flow, A);
  if (!companyName) return Promise.resolve();
  if (state.leadContact.direct && matchExistingCompany(state, companyName)) { bump(); return Promise.resolve(); }
  // Directors/Shareholders entered on this same step — each maps to a
  // company_directors row (see createCustomerAndCompanyOnly on the backend).
  const directors = state.owners.map((o) => ({
    name: o.name || null,
    dob: o.dob || null,
    pan: o.pan || null,
    aadhaar: o.aadhaar || null,
    email: o.email || null,
    mobile: o.mobile || null,
    address: o.address || null,
    role: o.role || null,
    din: o.dinKnown === "Yes" ? o.din : null,
    shareholding: o.shareholding || null,
    capital: o.capital || null,
    isMinor: isMinor(o.dob),
    nominee: isMinor(o.dob) ? o.nominee : null,
  }));
  // PAN / GSTIN aren't part of the create call — saved by resaveCompanyEdits.
  const sentCompany = { ...companyColumnsFor(flow, A, state.leadContact), CompanyPAN: "", GSTNumber: "" };
  return createCustomerCompany({
    leadId: state.leadContact.leadId,
    customer: {
      name: state.leadContact.name,
      mobile: state.leadContact.mobile,
      email: state.leadContact.email,
      country: state.leadContact.country,
      state: state.leadContact.state,
      preferredLanguage: state.leadContact.language,
      existingCustomerId: state.customerId,
    },
    company: {
      name: companyName,
      existingCompanyId: state.companyId,
      // Business Type / Activity steps — closest matching Company columns.
      // Only newco asks these under these exact keys; other flows leave them
      // null, same as ServiceID/StateID fields those flows don't collect.
      constitutionCategory: A.businessType,
      sector: A.activity,
      businessNature: A.activityDesc,
      // AI Business Objective & NIC Code step (newco only).
      nicCode: A.br_nicCode,
      businessObjective: A.br_objective,
      ...resolveAddress(flow, A, state.leadContact),
      directors,
    },
    franchiseeId: state.leadContact.franchiseeId,
  })
    .then(async (res) => {
      state.customerId = res?.data?.customerId || null;
      state.companyId = res?.data?.companyId || null;
      // Auto sign-in — the backend only returns a token when it just created
      // this Customer (the Details step has no OTP).
      if (res?.data?.token) {
        localStorage.setItem("token", res.data.token);
        if (res.data.user) setSecureItem("user", JSON.stringify(res.data.user));
        notifyTokenSet();
      }
      syncCachedUserCompany(state.companyId, companyName);
      // Created here — remember what was saved, so going back and editing
      // updates this Company and its director rows (resaveCompanyEdits).
      if (state.companyId) {
        state.companySaved = sentCompany;
        await mapSavedDirectors(state);
      }
      bump();
    })
    .catch((err) => {
      console.error("Customer/Company sync failed (non-fatal):", err);
    });
}

// The Company columns the apply flow fills when it creates the Company, in the
// shape /company/customer-details/update takes. Compared with what was last
// saved (state.companySaved) so an edit made afterwards — Back, or Review →
// Edit — is written to that same Company row instead of being skipped.
function companyColumnsFor(flow, A, leadContact) {
  const addr = resolveAddress(flow, A, leadContact);
  const cols = {
    BusinessName: resolveCompanyName(flow, A),
    ConstitutionCategory: A.businessType,
    Sector: A.activity,
    BusinessNature: A.activityDesc,
    NICCode: A.br_nicCode,
    BusinessObjective: A.br_objective,
    Country: addr.country,
    State: addr.state,
    District: addr.district,
    City: addr.city,
    PinCode: addr.pincode,
    AddressLine1: addr.addressLine1,
    AddressLine2: addr.addressLine2,
    // PAN Details step; a GSTIN typed in the MSME / IEC lookup box (it also
    // takes a PAN, which isn't a GSTIN).
    CompanyPAN: /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(A.pan_number || "") ? A.pan_number : "",
    GSTNumber: [A.msme_lookup, A.iec_lookup].find((g) => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(g || "")) || "",
  };
  Object.keys(cols).forEach((k) => { cols[k] = String(cols[k] ?? "").trim(); });
  return cols;
}
const flowHasStep = (flow, A, id) => (flow?.steps?.(A) || []).some((s) => s && s.id === id && (!s.showIf || s.showIf(A)));
// Authorized Person step as a company_directors row (Role = designation).
function authDirectorColumns(A) {
  const minor = isMinor(A.auth_dob);
  const n = (k) => (minor ? A["auth_nominee_" + k] : "");
  return normalizeDirector({
    Name: A.auth_name, DOB: A.auth_dob, PAN: A.auth_pan, Email: A.auth_email, Mobile: A.auth_mobile,
    Role: A.auth_designation || "Authorized Signatory", DIN: A.auth_din, IsMinor: minor ? 1 : 0,
    NomineeName: n("name"), NomineeDOB: n("dob"), NomineePAN: n("pan"), NomineeAadhaar: n("aadhaar"),
    NomineeEmail: n("email"), NomineeMobile: n("mobile"), NomineeAddress: n("address"),
  });
}
// Bank Details step in /company/bank/save's shape.
function bankColumnsFor(A, companyName) {
  const cols = {
    AccountHolderName: A.bank_holder || A.pan_name || companyName,
    BankName: A.bank_name,
    Branch: A.bank_branch,
    AccountNumber: A.bank_account,
    IFSC: A.bank_ifsc,
    AccountType: A.bank_type,
  };
  Object.keys(cols).forEach((k) => { cols[k] = String(cols[k] ?? "").trim(); });
  return cols;
}
// One owner (Directors / Shareholders step) as a company_directors row, same
// values runCustomerCompanySync sends when it creates them.
const DIRECTOR_KEYS = ["Name", "DOB", "PAN", "Aadhaar", "Email", "Mobile", "Address", "Role", "DIN", "Shareholding", "Capital", "IsMinor",
  "NomineeName", "NomineeDOB", "NomineePAN", "NomineeAadhaar", "NomineeEmail", "NomineeMobile", "NomineeAddress"];
function directorColumnsFor(o) {
  const minor = isMinor(o.dob);
  const n = (minor && o.nominee) || {};
  return normalizeDirector({
    Name: o.name, DOB: o.dob, PAN: o.pan, Aadhaar: o.aadhaar, Email: o.email, Mobile: o.mobile, Address: o.address,
    Role: o.role, DIN: o.dinKnown === "Yes" ? o.din : "", Shareholding: o.shareholding, Capital: o.capital, IsMinor: minor ? 1 : 0,
    NomineeName: n.name, NomineeDOB: n.dob, NomineePAN: n.pan, NomineeAadhaar: n.aadhaar,
    NomineeEmail: n.email, NomineeMobile: n.mobile, NomineeAddress: n.address,
  });
}
function normalizeDirector(row) {
  const out = {};
  DIRECTOR_KEYS.forEach((k) => {
    const v = row?.[k];
    if (k === "IsMinor") out[k] = Number(v) ? 1 : 0;
    else if ((k === "Shareholding" || k === "Capital") && v !== "" && v != null && !Number.isNaN(Number(v))) out[k] = String(Number(v));
    else out[k] = String(v ?? "").trim();
  });
  return out;
}
const changedColumns = (now, saved) =>
  Object.fromEntries(Object.entries(now).filter(([k, v]) => v !== (saved?.[k] ?? "")));

// Links each owner to the company_directors row created for them (same name +
// PAN, else the next one in creation order) and records the saved values.
async function mapSavedDirectors(state) {
  try {
    const res = await listCompanyDirectors(state.companyId);
    const rows = Array.isArray(res?.data) ? res.data : [];
    const key = (v) => String(v ?? "").trim().toLowerCase();
    const free = [...rows];
    const take = (match) => { const i = free.findIndex(match); return i < 0 ? null : free.splice(i, 1)[0]; };
    const saved = {};
    const unmatched = [];
    state.owners.forEach((o) => {
      const row = take((r) => key(r.Name) === key(o.name) && key(r.PAN) === key(o.pan));
      if (row) { o.__dirId = row.ID; saved[row.ID] = normalizeDirector(row); } else unmatched.push(o);
    });
    unmatched.forEach((o) => {
      const row = take(() => true);
      if (row) { o.__dirId = row.ID; saved[row.ID] = normalizeDirector(row); }
    });
    state.directorsSaved = saved;
  } catch (err) {
    console.error("Couldn't load saved directors (non-fatal):", err);
  }
}

// Writes edits made after this application created the Company: changed
// Company columns, and each owner updated / added / removed on
// company_directors. Only what differs from the last save is sent; a failed
// call keeps the old snapshot, so the next Continue tries it again.
async function resaveCompanyEdits(state, A, flow) {
  const companyId = state.companyId;
  if (!companyId || !localStorage.getItem("token")) return;
  const now = companyColumnsFor(flow, A, state.leadContact);
  const diff = changedColumns(now, state.companySaved);
  if (now.BusinessName && Object.keys(diff).length) {
    try {
      await updateMyCompanyDetails(companyId, diff);
      state.companySaved = { ...state.companySaved, ...diff };
      if (diff.BusinessName) syncCachedUserCompany(companyId, diff.BusinessName);
    } catch (err) {
      console.error("Company update failed (non-fatal):", err);
    }
  }
  if (flowHasStep(flow, A, "bank") && A.bank_account) {
    const bank = bankColumnsFor(A, now.BusinessName);
    const d = changedColumns(bank, state.bankSaved);
    if (Object.keys(d).length) {
      try {
        await saveCompanyBank(companyId, d);
        state.bankSaved = { ...(state.bankSaved || {}), ...d };
      } catch (err) {
        console.error("Bank details save failed (non-fatal):", err);
      }
    }
  }
  if (!state.directorsSaved) await mapSavedDirectors(state);
  const saved = state.directorsSaved;
  if (!saved) return;
  const keep = new Set();
  // Owners from the Directors / Shareholders step, plus the Authorized Person
  // (its row id kept on state.authDirector).
  const people = state.owners.map((o) => ({ ref: o, cols: directorColumnsFor(o) }));
  if (flowHasStep(flow, A, "auth")) {
    state.authDirector = state.authDirector || {};
    people.push({ ref: state.authDirector, cols: authDirectorColumns(A) });
  }
  for (const { ref: o, cols } of people) {
    if (!cols.Name) continue;
    try {
      if (o.__dirId && saved[o.__dirId]) {
        keep.add(String(o.__dirId));
        const d = changedColumns(cols, saved[o.__dirId]);
        if (Object.keys(d).length) {
          await updateCompanyDirector(companyId, o.__dirId, d);
          saved[o.__dirId] = { ...saved[o.__dirId], ...d };
        }
      } else {
        const res = await addCompanyDirector(companyId, cols);
        const id = res?.data?.ID;
        if (id) { o.__dirId = id; saved[id] = cols; keep.add(String(id)); }
      }
    } catch (err) {
      console.error("Director save failed (non-fatal):", err);
    }
  }
  for (const id of Object.keys(saved)) {
    if (keep.has(id)) continue;
    try {
      await removeCompanyDirector(companyId, id);
      delete saved[id];
    } catch (err) {
      console.error("Director remove failed (non-fatal):", err);
    }
  }
}

// Deal-level contact the create call sent: from the Lead for a converted
// deal, from the business address for a direct (existing client) one.
function dealContactFor(flow, A, state) {
  const lc = state.leadContact || {};
  return {
    name: String(lc.name || "").trim(),
    email: String(lc.email || "").trim(),
    mobile: String(lc.mobile || "").replace(/\D/g, "").slice(-10),
    state: String((lc.direct ? resolveAddress(flow, A, lc).state || lc.companyState : lc.state) || "").trim(),
  };
}
const signedInToken = () => !!localStorage.getItem("token");
// 409 = paid / approved on the server: stop trying to change it from here.
const isLocked = (err) => err?.response?.status === 409;

// Deal edits after creation: changed contact, and the service / fee lines
// when the package, add-ons or fees changed.
async function resaveDeal(flow, state, A) {
  const saved = state.dealSaved;
  if (!state.dealId || !saved || saved.locked || !signedInToken()) return;
  await ensureGstInfo(state).catch(() => {});
  await ensureMasterPrices(flow, A, state).catch(() => {});
  const contact = changedColumns(dealContactFor(flow, A, state), saved.contact);
  const ServiceDetails = serviceDetailsFor(flow, A, state);
  const lines = JSON.stringify(ServiceDetails);
  const linesChanged = ServiceDetails.length > 0 && lines !== saved.lines;
  if (!Object.keys(contact).length && !linesChanged) return;
  try {
    await updateApplicationDeal({ dealId: state.dealId, ...contact, ...(linesChanged ? { ServiceDetails } : {}) });
    state.dealSaved = { contact: { ...saved.contact, ...contact }, lines: linesChanged ? lines : saved.lines };
  } catch (err) {
    if (isLocked(err)) state.dealSaved = { ...saved, locked: true };
    else console.error("Deal update failed (non-fatal):", err);
  }
}
// Quote lines replaced while the quote is still unapproved and unpaid.
async function resaveQuote(flow, state, A) {
  if (!state.quoteId || !state.quoteSaved || state.quoteLocked || !signedInToken()) return;
  await ensureGstInfo(state).catch(() => {});
  await ensureMasterPrices(flow, A, state).catch(() => {});
  const ServiceDetails = serviceDetailsFor(flow, A, state);
  const lines = JSON.stringify(ServiceDetails);
  if (!ServiceDetails.length || lines === state.quoteSaved) return;
  try {
    await updateApplicationQuote({ quoteId: state.quoteId, ServiceDetails });
    state.quoteSaved = lines;
  } catch (err) {
    if (isLocked(err)) state.quoteLocked = true;
    else console.error("Quote update failed (non-fatal):", err);
  }
}
// Every answer of the application (application_answers), overwritten as the
// customer edits — most of them (Authorized Person, PAN / bank, trademark,
// MSME, IEC, FSSAI …) have no other place in the database.
async function saveAnswers(flow, state, A) {
  if (!state.leadContact || !signedInToken()) return;
  state.applicationId = state.applicationId || newApplicationId(flow.code);
  const answers = Object.fromEntries(Object.entries(A).filter(([k, v]) => !k.includes("__") && typeof v !== "function"));
  let review = null;
  try {
    review = reviewRows(state.flowId, A, state).map((g) => ({
      title: g.title,
      rows: g.rows.map(([label, value]) => [String(label ?? ""), Array.isArray(value) ? value.join(", ") : String(value ?? "")]),
    }));
  } catch { /* review rows are a convenience — answers are the record */ }
  const payload = {
    applicationId: state.applicationId,
    leadId: state.leadContact.leadId || undefined,
    dealId: state.dealId || undefined,
    companyId: state.companyId || undefined,
    quoteId: state.quoteId || undefined,
    flowId: state.flowId,
    serviceType: state.serviceType,
    answers,
    owners: state.owners.map(({ __dirId, ...o }) => o),
    reviewRows: review,
  };
  const json = JSON.stringify(payload);
  if (json === state.answersSaved) return;
  try {
    await saveApplicationAnswers(payload);
    state.answersSaved = json;
  } catch (err) {
    console.error("Application answers save failed (non-fatal):", err);
  }
}
// Everything already saved for this application, brought up to date with the
// current answers — Company / Directors / Authorized Person / bank, Lead +
// Customer, Deal, Quote, then the full answers. Shared per application so
// overlapping Continues don't send the same change twice.
const resavesInFlight = new WeakMap();
function resaveApplication(flow, state, A) {
  if (resavesInFlight.has(state)) return resavesInFlight.get(state);
  const run = (async () => {
    if (state.companySaved) await syncCustomerCompany(state, A, () => {}, flow);
    await resaveContact(state);
    await resaveDeal(flow, state, A);
    await resaveQuote(flow, state, A);
    await saveAnswers(flow, state, A);
  })().catch((err) => console.error("Application re-save failed (non-fatal):", err))
    .finally(() => resavesInFlight.delete(state));
  resavesInFlight.set(state, run);
  return run;
}

function contentSteps(flowId, A) {
  const flow = FLOWS[flowId];
  if (!flow) return [];
  return flow.steps(A).filter((s) => s && (!s.showIf || s.showIf(A)));
}
// A flow's direct-save mode for these answers: true (Existing Company
// Changes — Review, then Save writes to the company), "advisor" (the last
// step's Send raises a Lead for an advisor call), "redirect" (points
// elsewhere, never submits), or null (normal paid application).
function directSaveMode(flow, A) {
  const d = flow?.directSave;
  return (typeof d === "function" ? d(A || {}) : d) || null;
}
function allSteps(flowId, A) {
  // Direct-save flows have no Packages, Payment, Deal or Quote.
  const mode = directSaveMode(FLOWS[flowId], A);
  if (mode === true) {
    return contentSteps(flowId, A).concat([
      { id: "__review", title: "Review", type: "review" },
      { id: "__success", title: "Saved", type: "success" },
    ]);
  }
  if (mode) return contentSteps(flowId, A).concat([{ id: "__success", title: "Sent", type: "success" }]);
  return contentSteps(flowId, A).concat([
    { id: "__review", title: "Review", type: "review" },
    { id: "__packages", title: "Packages", type: "packages" },
    { id: "__payment", title: "Payment", type: "payment" },
    { id: "__success", title: "Submitted", type: "success" },
  ]);
}

// Saved progress as the flow's own header shows it ("Step x of y", % complete)
// — for listing unfinished applications outside the flow (dashboard).
export function flowProgress(flowId, stepIndex, answers) {
  if (!FLOWS[flowId]) return null;
  const total = allSteps(flowId, answers || {}).length - 1; // success not counted
  const index = Math.min(stepIndex || 0, total - 1);
  return {
    step: Math.min(index + 1, total),
    total,
    pct: total > 1 ? Math.round((index / (total - 1)) * 100) : 0,
  };
}

function validateStep(step, A, state) {
  const errors = {};
  if (step.type === "owners") {
    const cfg = ownerConfig(A);
    const n = state.owners.length;
    if (!n) errors.__owners = `Add at least ${cfg.minCount === 1 ? "1 person" : cfg.minCount + " people"}`;
    // Fewer than the minimum is fine for now — the rest can be added later
    // (OwnersBody shows a reminder instead of blocking Continue).
    else if (cfg.maxCount && n > cfg.maxCount) errors.__owners = `${cfg.label} allows at most ${cfg.maxCount}. Currently: ${n}.`;
    const fields = ownerBaseFields(cfg);
    state.owners.forEach((o, i) => {
      const minor = isMinor(o.dob);
      // Only the first person must be complete now — the others can be filled
      // in later; whatever is entered for them is still format-checked.
      const req = i === 0;
      fields.forEach((f) => {
        // A minor often has no PAN/email/mobile of their own yet — their nominee/
        // guardian's details (validated separately below) cover that instead.
        const relaxed = minor && MINOR_OPTIONAL_FIELDS.includes(f.k);
        const e = fieldError({ required: req && !relaxed, pattern: f.pattern }, o[f.k]);
        if (e) errors["owner" + i + "_" + f.k] = e;
      });
      const roleErr = fieldError({ required: req }, o.role);
      if (roleErr) errors["owner" + i + "_role"] = roleErr;
      // A minor can't legally hold a DIN/DPIN, so don't ask.
      if (cfg.hasDIN && !minor) {
        const dk = fieldError({ required: req }, o.dinKnown);
        if (dk) errors["owner" + i + "_dinKnown"] = dk;
        if (o.dinKnown === "Yes") {
          const de = fieldError({ required: req }, o.din);
          if (de) errors["owner" + i + "_din"] = de;
        }
      }
      if (cfg.shareholding) {
        const se = fieldError({ required: req }, o.shareholding);
        if (se) errors["owner" + i + "_shareholding"] = se;
      }
      if (cfg.capital) {
        const ce = fieldError({ required: req }, o.capital);
        if (ce) errors["owner" + i + "_capital"] = ce;
      }
      if (minor) {
        fields.forEach((f) => {
          const e = fieldError({ required: req, pattern: f.pattern }, (o.nominee || {})[f.k]);
          if (e) errors["owner" + i + "_nominee_" + f.k] = e;
        });
      }
    });
    // A PAN that's filled in must pass verification (valid, name and DOB
    // match) before Continue; Director 1's Aadhaar must pass the OTP check.
    // A nominee's PAN is checked like any other; their Aadhaar is optional.
    state.owners.forEach((o, i) => {
      const nominee = o.nominee || {};
      const checks = [
        ["owner" + i + "_pan", "pan", o.pan, o.pan__kyc, { name: o.name, dob: o.dob }],
        ...(i === 0 ? [["owner" + i + "_aadhaar", "aadhaar", o.aadhaar, o.aadhaar__kyc, {}]] : []),
        ...(isMinor(o.dob) ? [["owner" + i + "_nominee_pan", "pan", nominee.pan, nominee.pan__kyc, { name: nominee.name, dob: nominee.dob }]] : []),
      ];
      checks.forEach(([key, kind, value, result, ctx]) => {
        if (errors[key]) return;
        const e = kycBlockingError(kind, value, result, ctx);
        if (e) errors[key] = e;
      });
    });
    // Date of birth can't be in the future, for the owner
    // and their nominee alike.
    state.owners.forEach((o, i) => {
      if (o.dob && o.dob > DOB_MAX) errors["owner" + i + "_dob"] = DOB_ERROR;
      const nd = (o.nominee || {}).dob;
      if (isMinor(o.dob) && nd && nd > DOB_MAX) errors["owner" + i + "_nominee_dob"] = DOB_ERROR;
    });
    // Each director/partner needs their own mobile number.
    const seenMobile = {};
    state.owners.forEach((o, i) => {
      const m = String(o.mobile || "").replace(/\D/g, "").slice(-10);
      if (m.length !== 10) return;
      if (seenMobile[m] != null) {
        errors["owner" + i + "_mobile"] = `This mobile number is already used for ${state.owners[seenMobile[m]].name || cfg.label.split(" / ")[0] + " " + (seenMobile[m] + 1)}. Each person needs a unique mobile number.`;
      } else seenMobile[m] = i;
    });
    if (cfg.shareholding && n) {
      const total = Math.round(state.owners.reduce((sum, o) => sum + (Number(o.shareholding) || 0), 0) * 100) / 100;
      // Exactly 100% once everyone's share is entered; until then (details
      // still to be added later) just don't let it exceed 100%.
      const allEntered = n >= cfg.minCount && state.owners.every((o) => String(o.shareholding || "").trim() !== "");
      if (allEntered ? total !== 100 : total > 100) errors.__shareholding = `Shareholding must total 100%. Current total: ${total}%.`;
    }
  } else if (step.type === "docs") {
    const items = docItems(step, A, state);
    const any = items.some((it) => state.documents[it]);
    if (!any) errors.__docs = "Upload at least one document to continue";
    // Every logo application needs its own artwork (see tmLogoDocLabel).
    const missingLogo = items.find((it) => it.startsWith("Logo Artwork") && !state.documents[it]);
    if (missingLogo) {
      errors.__docs = `Logo artwork is required for each logo you're registering — upload "${missingLogo}" to continue`;
    }
    const msmeItem = "MSME / Startup Certificate";
    if (items.includes(msmeItem) && !state.documents[msmeItem]) {
      errors.__docs = "MSME / Startup certificate is required since you said you have MSME (Udyam) or Startup India registration — upload it to continue";
    }
  } else if (step.type === "changeCompany") {
    if (!signedInContact()) errors.__company = "Sign in to change your company's details";
    else if (!A.ex_company_id) errors.__company = "Choose the company you want to change";
  } else if (step.type === "goToChange") {
    errors.__goToChange = "Use the Existing Company Changes options to update your company";
  } else if (step.type === "leadDetails") {
    const lf = state.leadForm || {};
    if (!(lf.name || "").trim()) errors.lead_name = "Please enter your name.";
    else if (!PATTERNS.personName.test(lf.name.trim())) errors.lead_name = "Name can contain only letters, spaces, dots and apostrophes.";
    if (!/^[6-9]\d{9}$/.test((lf.mobile || "").trim())) errors.lead_mobile = "Please enter a valid 10-digit mobile number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((lf.email || "").trim())) errors.lead_email = "Please enter a valid email.";
    if (!(lf.country || "").trim()) errors.lead_country = "Please enter your country.";
    if (!lf.state) errors.lead_state = "Please select your state.";
    if (!lf.language) errors.lead_language = "Please select your preferred language.";
  } else if (step.type === "objective") {
    if (!String(A.br_objective || "").trim()) errors.br_objective = "Please enter the business objective to continue";
    if (!A.br_nicCode) errors.br_nicCode = "Select a NIC code to continue";
  } else if (step.type === "tmMarks") {
    if (!Array.isArray(A.tm_marks) || !A.tm_marks.length) errors.__marks = "Add at least one mark to register";
    const seen = {};
    (A.tm_marks || []).forEach((m, i) => {
      const req = (k, ok = true) => { if (ok && fieldError({ required: true }, m[k])) errors[`mark${i}_${k}`] = "This field is required"; };
      req("type");
      // A logo may have no words in it; word marks and taglines are the words.
      req("text", m.type !== "Logo");
      req("language");
      req("inUse");
      req("useSince", m.inUse === "Yes");
      req("applied");
      req("appNo", m.applied === "Yes");
      if (m.useSince && m.useSince > new Date().toISOString().slice(0, 10)) errors[`mark${i}_useSince`] = "Date can't be in the future";
      // Same words = one word mark: brand/company/product name all share it.
      const key = m.type !== "Logo" && (m.text || "").trim().toLowerCase();
      if (key) {
        if (seen[key] != null) errors[`mark${i}_text`] = `Same as application ${seen[key] + 1} — the same words are covered by one application`;
        else seen[key] = i;
      }
    });
  } else if (step.type === "tmSearch") {
    // The owner fields on this step (what the Company is created from) are
    // checked too — see TmSearchBody.
    validateFields(step, A, errors);
    if (!tmSearchIsCurrent(A, state)) errors.__search = "Run the public trademark search to continue";
  } else {
    validateFields(step, A, errors);
    // Business Name: the chosen name must have been checked (MCA + trademark).
    if (step.id === "name" && A.hasName === "Yes" && !errors.name1 && !nameCheckIsCurrent(A, state)) {
      errors.__namecheck = "Check name availability to continue";
    }
    if (step.id === "proceed" && A.tm_proceed === "No, I want to choose a different name") {
      errors.tm_proceed = "Go back and update the trademark name, or select 'Yes, proceed' to continue.";
    }
  }
  return errors;
}

function validateFields(step, A, errors) {
  visibleFields(step, A).forEach((f) => {
    if (f.type === "note" || !f.k) return;
    // `required` can be a function of the answers so far (e.g. relaxed for a minor
    // whose nominee covers their PAN/email/mobile instead) — resolve it here.
    const required = typeof f.required === "function" ? f.required(A) : f.required;
    const e = fieldError({ ...f, required }, A[f.k]);
    if (e) errors[f.k] = e;
    // A Date of Birth can't be in the current year or later.
    if (!e && f.dob && dobError(A[f.k])) errors[f.k] = DOB_ERROR;
    // An amount has to sit inside the bracket chosen alongside it.
    if (!e && rangeError(f, A, A[f.k])) errors[f.k] = rangeError(f, A, A[f.k]);
    // A call-back time has to be in the future.
    if (!e && f.type === "datetime-local" && A[f.k] && new Date(A[f.k]) <= new Date()) {
      errors[f.k] = "Please choose a date and time in the future";
    }
    // A PAN / Aadhaar typed into any box must pass verification before
    // Continue — except a nominee's Aadhaar, which stays optional.
    if (!e && (f.pattern === "pan" || (f.pattern === "aadhaar" && !/nominee/i.test(f.k)))) {
      const ctx = { name: f.kyc?.name ? A[f.kyc.name] : "", dob: f.kyc?.dob ? A[f.kyc.dob] : "" };
      const ke = kycBlockingError(f.pattern, A[f.k], A[f.k + "__kyc"], ctx);
      if (ke) errors[f.k] = ke;
    }
    if (A[f.k] === "Other" && f.type === "cards" && f.otherText !== false) {
      const oe = fieldError({ required: true }, A[f.k + "__other"]);
      if (oe) errors[f.k + "__other"] = "Please specify";
    }
  });
  // Preferred Names 2/3 are alternatives — repeating an earlier one adds nothing.
  ["name2", "name3"].forEach((k, i) => {
    const v = (A[k] || "").trim().toLowerCase();
    const earlier = ["name1", "name2"].slice(0, i + 1).map((e) => (A[e] || "").trim().toLowerCase());
    if (v && !errors[k] && visibleFields(step, A).some((f) => f.k === k) && earlier.includes(v)) {
      errors[k] = "Enter a different name from your earlier choices";
    }
  });
  return errors;
}

// Proposed names on the Business Name step, de-duplicated, in order.
function proposedNames(A) {
  return [A.name1, A.name2, A.name3]
    .map((n) => (n || "").trim())
    .filter((n, i, all) => n && all.findIndex((m) => m.toLowerCase() === n.toLowerCase()) === i);
}
// The name being checked: the one picked among the proposed names, else Name 1
// (a pick that was since edited away no longer counts).
function ncTarget(A) {
  const names = proposedNames(A);
  const picked = (A.nc_target || "").trim();
  return names.find((n) => n.toLowerCase() === picked.toLowerCase()) || names[0] || "";
}

// 2–3 proposed names and the applicant hasn't confirmed the one being checked.
function needsNameConfirm(A) {
  if (A.hasName !== "Yes" || proposedNames(A).length < 2) return false;
  return (A.nc_confirmed || "").trim().toLowerCase() !== ncTarget(A).toLowerCase();
}

// Only a live MCA + trademark check counts. Applications saved before that
// existed hold simulated results (no `source`), so those names get checked again.
function nameCheckIsCurrent(A, state) {
  const key = ncTarget(A).toLowerCase();
  const entry = key ? state.nameChecks[key] : null;
  return entry?.source === "live" ? entry : null;
}
function tmSearchIsCurrent(A, state) {
  return A.tm_searchDone === "Yes" && state.tmSearch && state.tmSearch.for === (A.tm_name || "").trim().toLowerCase();
}

/* ---------------------------------------------------------------------------
   Small presentational bits
--------------------------------------------------------------------------- */
function Note({ variant = "info", title, body, list }) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-900",
    warn: "bg-amber-50 border-amber-200 text-amber-900",
    ok: "bg-green-50 border-green-200 text-green-900",
    err: "bg-red-50 border-red-200 text-red-900",
  };
  return (
    <div className={`rounded-lg border p-3 text-sm ${styles[variant] || styles.info}`}>
      {title && <b className="block mb-1">{title}</b>}
      {body && <div>{body}</div>}
      {list && (
        <ul className="mt-2 ml-4 list-disc space-y-1">
          {list.map(([name, why]) => (
            <li key={name}><b>{name}</b> — {why}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
function ErrorText({ msg }) {
  if (!msg) return null;
  return <p className="text-red-600 text-xs mt-1">⚠ {msg}</p>;
}
function ReqMark({ f, A }) {
  const required = typeof f.required === "function" ? f.required(A) : f.required;
  if (required !== false) return <span className="text-red-500 ml-0.5">*</span>;
  // "(Optional)" tag — hidden by default, shown by newco-theme.css.
  return /optional/i.test(f.label || f.q || "") ? null : <span className="flow-optional hidden ml-1 font-medium text-gray-400">(Optional)</span>;
}
function OptionButton({ selected, square, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-2.5 text-left w-full rounded-lg border px-3.5 py-3 text-sm transition ${
        selected ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <span className={`mt-0.5 flex-none w-4 h-4 border-2 flex items-center justify-center ${square ? "rounded" : "rounded-full"} ${selected ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}>
        {selected && <span className="text-white text-[9px]">✓</span>}
      </span>
      <span className="font-medium">{children}</span>
    </button>
  );
}
const inputCls = (bad) =>
  `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 ${
    bad ? "border-red-400 bg-red-50" : "border-gray-200"
  }`;
const isIndia = (country) => !country || String(country).trim().toLowerCase() === "india";
// Indian mobile: a fixed "+91" in front, and only the 10 digits kept in the
// value (what validation and the backend expect) — pasting "+91 98…" or
// "098…" drops the prefix. Other countries get a plain number box.
function MobileInput({ value, onChange, className, placeholder, india = true }) {
  const clean = (v) => {
    let d = String(v || "").replace(/\D/g, "");
    if (india && d.length > 10) d = d.replace(/^(91|0)/, "");
    return d.slice(0, 10);
  };
  const input = (
    <input type="tel" inputMode="numeric" className={india ? `${className} rounded-l-none` : className}
      value={value || ""} onChange={(e) => onChange(clean(e.target.value))} placeholder={placeholder} />
  );
  if (!india) return input;
  return (
    <div className="flex">
      <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-sm text-gray-600">+91</span>
      {input}
    </div>
  );
}
// The contact forms' State list comes from /states — if that request fails,
// fall back to the static list rather than an empty dropdown.
const withStaticStates = (rows) =>
  rows?.length ? rows : STATES.filter((s) => s !== "Other").map((s) => ({ state_name: s }));

// variant="newco": the New Company wizard's three-panel layout (step rail,
// step card, FlowStepGuide) — the Existing Company flow keeps the default.
export default function FlowRunner({ flowId, initialSet, onExit, onComplete, onSkip, homeLabel, nextLabel, variant }) {
  const nc = variant === "newco";
  // Namespaced per flowId — this same FlowRunner backs every entry in FLOWS
  // (New Company, GST, Trademark, MSME, IEC, Existing Company, ...). A single
  // shared key here would let starting/resuming one flow silently wipe
  // whatever progress was saved for a different one.
  const storageKey = `${STORAGE_KEY}_${flowId}`;
  const appRef = useRef(null);
  const resumedRef = useRef(false);
  if (appRef.current === null) {
    const saved = getSecureItem(storageKey);
    // A direct-save flow backs several menu options (one per change_what) —
    // only resume the one just picked, and never one that was already saved.
    const otherOption = directSaveMode(FLOWS[flowId], saved?.answers) &&
      (saved?.submitted || (initialSet?.change_what && saved?.answers?.change_what !== initialSet.change_what));
    const resume = !!saved && saved.flowId === flowId && !belongsToOtherCustomer(saved) && !otherOption;
    appRef.current = resume ? saved : freshState(flowId, initialSet);
    resumedRef.current = resume;
    // An open sign-in modal gets saved too, minus its callback — never reopen
    // a stale one on load (the effect below decides if one is needed).
    if (resume) { appRef.current.leadGate = null; appRef.current.signIn = null; }
    // "Submitting…" only means a request is in flight in this page — one saved
    // mid-request (reload, closed tab) must not leave Pay / Call Back disabled.
    if (resume) appRef.current.__paying = false;
    // Progress now survives logout (clearStorageKeepingApplications) — stamp
    // whose it is, so another Customer on this browser never resumes it.
    if (!appRef.current.ownerCustomerId) appRef.current.ownerCustomerId = signedInContact()?.customerId || null;
  }
  const [, rerender] = useReducer((c) => c + 1, 0);
  const errorsRef = useRef({});
  // "Request a Call" (Packages) / "Request a Call Back" (Payment) open this
  // form for the preferred call-back date & time before anything is submitted.
  const [callbackFormOpen, setCallbackFormOpen] = useState(false);
  // A call-back already submitted at this stage (Packages / Payment): clicking
  // Request a Call again there only tells the customer so — it never raises a
  // second one. Another stage can still raise its own.
  const [callbackNoticeOpen, setCallbackNoticeOpen] = useState(false);
  // Business Name with 2–3 proposed names: Continue first asks which one the
  // applicant is going with.
  const [confirmNameOpen, setConfirmNameOpen] = useState(false);
  const openCallback = () => (state.callbacksDone?.[step.type] ? setCallbackNoticeOpen(true) : setCallbackFormOpen(true));
  // Every "State" pick field (business address, GST location, existing-GST
  // state) falls back to the static STATES list, but that list is only ever
  // as complete/correctly-spelled as we remember to keep it — a name that
  // doesn't exactly match `indiastates.state_name` (case, missing UT, future
  // DB addition) silently breaks the Quote's StateID resolution down the
  // line (null StateID -> empty bulk service-price lookup at Payment/OTP).
  // Fetching the real list once and swapping it in removes that whole class
  // of mismatch — same source of truth the admin/associate side already uses.
  const [liveStateNames, setLiveStateNames] = useState(null);
  const [leadSaving, setLeadSaving] = useState(false);
  useEffect(() => {
    getAllStates()
      .then((rows) => {
        const names = Array.isArray(rows) ? rows.map((r) => r.state_name).filter(Boolean) : [];
        if (names.length) setLiveStateNames(names);
      })
      .catch(() => {}); // static STATES list stays as the fallback
  }, []);

  function persist() {
    setSecureItem(storageKey, appRef.current);
  }
  function bump() {
    persist();
    rerender();
  }
  // Reopening a saved application whose applicant had signed in, but whose
  // session has since ended (logout keeps applications; tokens expire after a
  // day) — ask them to verify again straight away, rather than letting them
  // carry on signed out until something that needs a session fails.
  useEffect(() => {
    const s = appRef.current;
    if (!resumedRef.current || s.submitted || localStorage.getItem("token")) return;
    if (!s.otpVerified && !s.customerId) return;
    s.otpVerified = false;
    s.signIn = { welcomeBack: true };
    bump();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function setAnswer(k, v) {
    const answers = appRef.current.answers;
    answers[k] = v;
    delete errorsRef.current[k];
    Object.entries(DERIVED_ANSWERS).forEach(([dk, calc]) => {
      if (dk === k) return;
      const dv = calc(answers);
      if (answers[dk] !== dv) { answers[dk] = dv; delete errorsRef.current[dk]; }
    });
    bump();
  }

  const state = appRef.current;
  const A = state.answers;
  const flow = FLOWS[flowId];

  const steps = useMemo(() => allSteps(flowId, A), [flowId, JSON.stringify(A), state.owners.length, JSON.stringify(state.documents)]);
  // Fields with a default (e.g. Country = India) start filled in.
  steps.forEach((s) => (s.fields || []).forEach((f) => {
    if (f.def != null && !A[f.k]) A[f.k] = f.def;
  }));
  const stepIndex = Math.min(state.stepIndex, steps.length - 1);
  const step = steps[stepIndex];
  // Furthest step reached so far — the sidebar can jump forward up to it.
  if (!(state.maxStepIndex >= stepIndex)) state.maxStepIndex = stepIndex;
  // ...or further, to any step whose earlier steps are all already filled in
  // (validateStep passes). This stops at a step whose Continue does real work
  // (Lead / Customer / Company / Deal creation) unless it was already passed, so
  // that work is never skipped, and never runs into Payment unreached.
  let reachedIndex = state.maxStepIndex;
  for (let j = 0; j < steps.length - 2; j++) {
    const s = steps[j];
    if (j >= state.maxStepIndex) {
      const doesWork = s.type === "leadDetails" || s.type === "owners" ||
        [flow?.convertAtStep, flow?.customerAtStep, flow?.dealAtStep].includes(s.id);
      if (doesWork || steps[j + 1].type === "payment") break;
    }
    const errors = validateStep(s, A, state);
    if (s.type === "review" && !state.confirmed) break;
    if (Object.keys(errors).length) break;
    reachedIndex = Math.max(reachedIndex, j + 1);
  }
  reachedIndex = Math.min(reachedIndex, steps.length - 2);
  const total = steps.length - 1; // success not counted
  const shown = Math.min(stepIndex + 1, total);
  const pct = total > 1 ? Math.round((Math.min(stepIndex, total - 1) / (total - 1)) * 100) : 0;
  // From the moment Documents is reached (uploads optional for this), let the
  // applicant jump straight to the dashboard (onSkip) instead of
  // grinding through Documents, Additional Registrations, Review and Payment
  // right now — they can always come back and finish this application later.
  // Every step before Documents is already guaranteed valid by this point,
  // since goNext() never advances past a step that fails validateStep().
  const docsIndex = steps.findIndex((s) => s.type === "docs");
  const canSkipToDashboard = !!onSkip && docsIndex !== -1 && stepIndex >= docsIndex;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stepIndex]);

  // Direct-save flows: load what's on record for the chosen company + option
  // once (state.changeCurrent, keyed by both), prefilling the answers so the
  // customer only edits what changes. Review diffs against this same record.
  const directMode = directSaveMode(flow, A);
  const changeKey = directMode === true && A.ex_company_id && A.change_what ? `${A.ex_company_id}:${A.change_what}` : null;
  useEffect(() => {
    if (!changeKey || changeKind(A.change_what) === "other") return;
    const cur = state.changeCurrent;
    if (cur && cur.key === changeKey && (cur.loading || cur.data)) return;
    state.changeCurrent = { key: changeKey, loading: true };
    bump();
    loadCurrent(A.change_what, A.ex_company_id)
      .then((data) => {
        if (state.changeCurrent?.key !== changeKey) return;
        prefillAnswers(A.change_what, data, A);
        state.changeCurrent = { key: changeKey, data };
      })
      .catch((err) => {
        if (state.changeCurrent?.key !== changeKey) return;
        state.changeCurrent = { key: changeKey, error: err.message || "Couldn't load your current details" };
      })
      .finally(bump);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changeKey, state.changeCurrent?.retry]);
  const changeCurrent = changeKey && state.changeCurrent?.key === changeKey ? state.changeCurrent : null;
  const changeReady = !changeKey || changeKind(A.change_what) === "other" || !!changeCurrent?.data;

  // "Register another company" → related to an existing company: fill the
  // Existing Company step from the signed-in customer's selected company
  // (only fields still empty), once per company. Its directors are kept for
  // the Owners step below.
  const prefillInFlight = useRef(false);
  useEffect(() => {
    if (!flow?.prefillExisting || A.ex_brandNew !== "No" || !signedInContact()) return;
    const companyId = getCompanyIdFromStorage();
    if (!companyId || prefillInFlight.current) return;
    if (state.exPrefill && String(state.exPrefill.companyId) === String(companyId)) return;
    prefillInFlight.current = true;
    loadExistingCompanyPrefill(companyId)
      .then(({ record, directors }) => {
        fillExistingCompanyAnswers(A, record);
        state.exPrefill = { companyId, directors };
      })
      .finally(() => { prefillInFlight.current = false; bump(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [A.ex_brandNew]);

  // Same owners (or some in common) → start the Owners step with the existing
  // company's directors, if the customer hasn't entered anyone yet. Once only.
  useEffect(() => {
    if (step?.type !== "owners" || !flow?.prefillExisting) return;
    const p = state.exPrefill;
    if (!p?.directors?.length || p.ownersFilled) return;
    if (!["Same owners/directors", "Some owners/directors are common"].includes(A.ex_relation)) return;
    const blank = (v) => (v && typeof v === "object" ? Object.values(v).every(blank) : !String(v ?? "").trim());
    p.ownersFilled = true;
    if (state.owners.length <= 1 && state.owners.every(blank)) {
      state.owners = ownersFromDirectors(p.directors, ownerConfig(A).roles || [], newOwner);
    }
    bump();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.type, state.exPrefill]);

  // Review's Save for a direct-save flow — writes the change, then shows Saved.
  function saveDirectChange() {
    if (leadSaving) return;
    const problem = nothingToSave(A.change_what, A, changeCurrent?.data);
    if (problem) { errorsRef.current = { __save: problem }; bump(); return; }
    setLeadSaving(true);
    saveChange(A.change_what, A, changeCurrent?.data, A.ex_company_id)
      .then((result) => {
        errorsRef.current = {};
        state.submitted = { direct: true, ...result, change: A.change_what, date: today() };
        state.stepIndex = steps.length - 1;
        bump();
      })
      .catch((err) => {
        errorsRef.current = { __save: err.message || "Couldn't save your changes. Please try again." };
        bump();
      })
      .finally(() => setLeadSaving(false));
  }

  // "Talk to an Advisor" (ex-business, "I'm not sure") — raises a Lead with
  // the customer's question as a follow-up for the advisor. No Review,
  // Packages, Payment, Deal or Quote.
  function sendAdvisorRequest() {
    if (leadSaving) return;
    setLeadSaving(true);
    raiseAdvisorLead(state, A)
      .then(() => {
        errorsRef.current = {};
        state.submitted = {
          direct: true,
          title: "Request Sent",
          message: `Thanks! A business advisor will call you ${A.ex_callbackAt ? `on ${new Date(A.ex_callbackAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : "within one working day"} with a recommendation.`,
          change: "Talk to an Advisor",
          label: "Request",
          company: A.ex_name,
          date: today(),
        };
        state.stepIndex = steps.length - 1;
        bump();
      })
      .catch((err) => {
        errorsRef.current = { __save: err.message || "Couldn't send your request. Please try again." };
        bump();
      })
      .finally(() => setLeadSaving(false));
  }

  // Once the applicant has closed a sign-in popup (LeadCaptureModal or
  // SigninModal) without signing in, every later move — Continue, Back, the
  // sidebar, Review & Approve / Call Back — asks them to sign in (OTP) first,
  // and only goes ahead once they have. Otherwise they could finish the whole
  // application signed out, and token-dependent steps (e.g. the application
  // received email) would silently skip.
  function needsSignIn() {
    if (!state.signInDismissed) return false;
    if (localStorage.getItem("token")) { state.signInDismissed = false; return false; }
    return true;
  }
  // The re-ask is the plain site Sign In (mobile/email + OTP, SigninModal) —
  // its "Sign up" link switches to the in-flow sign-up form (LeadCaptureModal)
  // for an applicant who has no account yet.
  function withSignIn(run) {
    if (!needsSignIn()) { run(); return; }
    const then = () => { state.signInDismissed = false; run(); };
    state.signIn = {
      then,
      signup: () => { state.signIn = null; requireVerifiedCustomer(state, bump, then); },
    };
    bump();
  }
  function goNext() {
    if (needsSignIn()) { withSignIn(goNext); return; }
    const errors = validateStep(step, A, state);
    if (step.type === "review" && !state.confirmed) errors.__confirm = "Please confirm before proceeding";
    // More than one proposed name and none confirmed yet: ask which one first
    // (once the name fields themselves are valid).
    if (step.id === "name" && needsNameConfirm(A) && Object.keys(errors).every((k) => k === "__namecheck")) {
      errorsRef.current = {};
      setConfirmNameOpen(true);
      return;
    }
    if (Object.keys(errors).length) {
      errorsRef.current = errors;
      bump();
      return;
    }
    errorsRef.current = {};
    // Company already created by this application — save any edits made
    // since (in the background; the step's own sync below shares the request).
    // Anything already saved for this application (Company, Directors, Lead,
    // Customer, Deal, Quote, answers) takes the edits made since — in the
    // background; the step's own create calls below are unaffected.
    resaveApplication(flow, state, A).then(() => bump());
    if (directMode === "advisor" && step.id === "advice") { sendAdvisorRequest(); return; }
    if (directMode) {
      if (step.type === "review") { saveDirectChange(); return; }
      if (step.id === "new" && !changeReady) {
        errorsRef.current = { __save: changeCurrent?.error ? "Your current details didn't load — retry above before continuing." : "Still loading your current details…" };
        bump();
        return;
      }
      advance();
      return;
    }
    // Details step — no OTP; Continue itself raises the Lead from the entered
    // details, then advances once that's done (Customer/Company sync below
    // needs leadContact.leadId).
    if (step.type === "leadDetails") {
      if (leadSaving) return;
      setLeadSaving(true);
      captureLeadDetails(state).finally(() => {
        setLeadSaving(false);
        state.stepIndex = Math.min(state.stepIndex + 1, steps.length - 1);
        bump();
      });
      return;
    }
    // Deal creation needs the Customer/Company this same step just synced (for
    // existingCustomerId/existingCompanyId) — chain it after that sync resolves,
    // rather than waiting for Documents, so a Deal already exists well before
    // the applicant gets there. syncCustomerCompany() returns undefined (not a
    // promise) whenever the Customer/Company was already synced on an earlier
    // pass through this step — that's not a failure, so still attempt the Deal
    // afterward either way; createDealForApplication() has its own guard against
    // creating a second one.
    //
    // newco has a dedicated "owners" step to key this off. GST/Trademark/MSME/
    // IEC (flow.autoLeadGate — see the lead-gate effect below) have no such
    // step, so attempt this after every step instead: both calls no-op until
    // resolveCompanyName(flow, A) actually has something (that flow's own name
    // field), so this just fires as soon as it's available, whichever step
    // that turns out to be for each flow.
    //
    // flow.convertAtStep (e.g. GST's Business Location) narrows this to one
    // step: Customer → Company → Deal run in order there, and Continue waits
    // for them (that's also where the applicant gets signed in).
    //
    // flow.customerAtStep / dealAtStep (e.g. MSME) split that into stages
    // instead: Customer → Company (+ auto sign-up) at one step, the Deal at a
    // later one — each awaited before advancing. The Quote stays with the
    // Payment step's "Review & Approve Quote" button (doPay). Each call is
    // guarded, so revisiting a step never creates a duplicate; the Deal step
    // re-attempts the Customer/Company sync first in case that earlier
    // attempt failed.
    if (flow.customerAtStep || flow.dealAtStep) {
      let work = null;
      if (step.id === flow.customerAtStep) {
        work = () => syncCustomerCompany(state, A, bump, flow);
      } else if (step.id === flow.dealAtStep) {
        work = () => syncCustomerCompany(state, A, bump, flow).then(() => createDealForApplication(flow, state, A, bump));
      }
      if (work) {
        if (leadSaving) return;
        setLeadSaving(true);
        work().finally(() => {
          setLeadSaving(false);
          advance();
        });
        return;
      }
    } else if (flow.convertAtStep) {
      if (step.id === flow.convertAtStep) {
        if (leadSaving) return;
        setLeadSaving(true);
        syncCustomerCompany(state, A, bump, flow)
          .then(() => createDealForApplication(flow, state, A, bump))
          .finally(() => {
            setLeadSaving(false);
            advance();
          });
        return;
      }
    } else if (step.type === "owners" || flow.autoLeadGate) {
      syncCustomerCompany(state, A, bump, flow).then(() => createDealForApplication(flow, state, A, bump));
    }
    advance();
  }
  // Move on to the next step. Every application is a Deal before Documents
  // (uploads are keyed by its Lead / Company, and sales should see it even if
  // the applicant stops there), so landing on Documents first makes sure the
  // Lead → Customer/Company → Deal all exist and waits for them — most
  // Existing Company flows have no checking procedure / Details step to raise
  // a Lead earlier, and the owners step's sync above runs in the background.
  // A signed-in Customer is captured from their profile; anyone else gets the
  // sign-up modal (closing it just leaves them on this step). Failures are
  // non-fatal — the Payment step retries the Deal.
  // Entering "Authorized Person": assume the applicant from the Details tab is
  // that person and copy their name/email/mobile in (see syncAuthFromContact —
  // a value the user typed themselves is kept). PAN
  // comes from the signed-in customer's profile; failing that, a proprietor's
  // GSTIN carries their own PAN, so for a Sole Proprietorship the PAN (and
  // designation) are filled from it.
  function prefillAuthPerson() {
    if (steps[state.stepIndex + 1]?.id !== "auth") return;
    const contact = state.leadContact || state.leadForm || signedInContact() || {};
    const proprietor =
      /proprietor/i.test(A.gst_biztype || A.businessType || "") || A.pan_type === "Individual";
    const profilePan = signedInContact()?.pan || "";
    syncAuthFromContact(state, contact);
    const fill = {
      auth_pan: /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(profilePan) ? profilePan : proprietor ? A.pan_number : "",
      ...(proprietor && { auth_designation: "Proprietor" }),
    };
    Object.entries(fill).forEach(([k, v]) => {
      if (v && !String(A[k] || "").trim()) setAnswer(k, String(v).trim());
    });
  }

  function advance() {
    prefillAuthPerson();
    const toNext = () => {
      state.stepIndex = Math.min(state.stepIndex + 1, steps.length - 1);
      bump();
    };
    if (steps[state.stepIndex + 1]?.type !== "docs" || state.dealId) {
      toNext();
      return;
    }
    const syncThenNext = () => {
      setLeadSaving(true);
      syncCustomerCompany(state, A, bump, flow)
        .then(() => createDealForApplication(flow, state, A, bump))
        .finally(() => {
          setLeadSaving(false);
          toNext();
        });
    };
    if (state.leadCaptured) { syncThenNext(); return; }
    setLeadSaving(true);
    if (leadFromSignedInCustomer(state, bump, () => { setLeadSaving(false); syncThenNext(); })) return;
    setLeadSaving(false);
    state.leadGate = { run: syncThenNext, reason: "documents" };
    bump();
  }
  // Discard this application from any step. Once a Deal exists it can't be
  // cancelled from here any more — just leave the flow, keeping its answers
  // to resume.
  function cancelApplication() {
    if (state.dealId) { onExit(); return; }
    if (window.confirm("Leave this application? Your answers on this application will be discarded.")) {
      removeSecureItem(storageKey);
      onExit();
    }
  }
  // The dashboard is sign-in only — auto sign-in only happens for a brand-new
  // Customer, so an applicant whose mobile already had an account would just
  // bounce to the home page. Verify them first (OTP), then go.
  function skipToDashboard() {
    if (localStorage.getItem("token")) { requireVerifiedCustomer(state, bump, () => onSkip()); return; }
    state.otpVerified = false;
    state.signIn = { then: () => onSkip() };
    bump();
  }
  // Standard site Sign In (SigninModal) for a returning applicant — their
  // Customer account already exists, so it's a plain OTP login, prefilled.
  function finishSignIn(tokenData) {
    const next = state.signIn?.then;
    const user = tokenData?.user;
    // The signed-in account owns the application from here (a resumed
    // application can carry a stale customerId from an earlier session).
    if (user?.CustomerID) state.customerId = user.CustomerID;
    state.otpVerified = true;
    state.signIn = null;
    bump();
    next && next();
  }
  function goBack() {
    if (stepIndex === 0) { cancelApplication(); return; }
    if (needsSignIn()) { withSignIn(goBack); return; }
    errorsRef.current = {};
    state.stepIndex -= 1;
    bump();
  }
  // Sidebar navigation: back to any earlier step, or forward to any step the
  // applicant already reached (state.maxStepIndex) — but only if every step in
  // between still passes validateStep(), so an edit made after going back can't
  // be skipped past. Those steps' Continue side effects already ran (and are
  // guarded against duplicates), so nothing else needs re-running.
  function jumpTo(i) {
    if (i === stepIndex) return;
    if (needsSignIn()) { withSignIn(() => jumpTo(i)); return; }
    if (i > stepIndex) {
      if (i > reachedIndex) return;
      for (let j = stepIndex; j < i; j++) {
        const errors = validateStep(steps[j], A, state);
        if (steps[j].type === "review" && !state.confirmed) errors.__confirm = "Please confirm before proceeding";
        if (Object.keys(errors).length) {
          state.stepIndex = j;
          errorsRef.current = errors;
          bump();
          return;
        }
      }
    }
    errorsRef.current = {};
    state.stepIndex = i;
    bump();
  }
  // The Submitted screen is shown as soon as the (mocked) payment "completes",
  // regardless of whether the real Lead → Deal → Quote conversion behind it
  // actually succeeded (createDealForApplication / createQuoteForApplicationStep
  // fail non-blockingly, by design). If it didn't, send the applicant back to
  // Payment to retry — their answers/owners/documents are untouched, only
  // stepIndex and the stale `submitted` flag reset, so nothing needs re-entering.
  // "Application Submitted" only after the quote is really paid. While the
  // customer is on Payment with a quote (they opened it to pay in another tab),
  // check now, whenever they come back to this tab, and every 15s. Also corrects
  // applications saved by the old flow, which jumped to the success screen as
  // soon as the quote tab opened: if that quote isn't paid, back to Payment.
  const checkingPaymentRef = useRef(false);
  const unconfirmedSuccess =
    step?.type === "success" && !!state.submitted &&
    !state.submitted.callback && !state.submitted.direct && !state.submitted.paid;
  const shouldCheckPayment =
    !!state.quoteId && !!state.companyId && (step?.type === "payment" || unconfirmedSuccess);
  async function checkQuotePayment() {
    const s = appRef.current;
    if (checkingPaymentRef.current) return;
    checkingPaymentRef.current = true;
    try {
      const { paid, received } = await getQuotePaymentStatus({ companyId: s.companyId, quoteId: s.quoteId });
      const all = allSteps(s.flowId, s.answers);
      if (paid) {
        if (s.submitted?.paid) return;
        s.submitted = {
          id: s.applicationId, service: s.serviceType, date: today(),
          amount: rupee(received || 0), paid: true,
        };
        s.awaitingPayment = null;
        s.stepIndex = all.length - 1;
        bump();
      } else if (s.submitted && !s.submitted.callback && !s.submitted.direct && !s.submitted.paid) {
        const idx = all.findIndex((t) => t.type === "payment");
        if (idx === -1) return;
        s.submitted = null;
        s.awaitingPayment = s.awaitingPayment || { quoteId: s.quoteId };
        s.stepIndex = idx;
        bump();
      }
    } catch {
      // Couldn't reach the server — leave the screen as it is, retry later.
    } finally {
      checkingPaymentRef.current = false;
    }
  }
  useEffect(() => {
    if (!shouldCheckPayment) return;
    checkQuotePayment();
    const onVisible = () => document.visibilityState === "visible" && checkQuotePayment();
    const timer = setInterval(() => document.visibilityState === "visible" && checkQuotePayment(), 15000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldCheckPayment, state.quoteId]);

  function retryPayment() {
    const idx = steps.findIndex((s) => s.type === "payment");
    if (idx === -1) return;
    state.submitted = null;
    state.stepIndex = idx;
    bump();
  }

  if (!flow) return null;

  return (
    <div className={`${nc ? "max-w-[1400px]" : "max-w-6xl"} mx-auto px-4 sm:px-6 py-8`}>
      {state.leadGate && <LeadCaptureModal state={state} bump={bump} />}
      {state.signIn && !state.leadGate && (
        <SigninModal
          initialValue={state.leadContact?.mobile || ""}
          onSuccess={finishSignIn}
          onClose={() => { state.signIn = null; state.signInDismissed = true; bump(); }}
          onSignup={state.signIn.signup}
        />
      )}
      {nc ? (
        <nav className="flex items-center gap-2.5 text-xs text-gray-500 mb-5 flex-wrap">
          <Link to="/" aria-label="Home" className="text-gray-400 hover:text-gray-700"><Home className="w-3.5 h-3.5" fill="currentColor" /></Link>
          <span className="text-gray-400">&gt;</span>
          <button onClick={onExit} className="hover:text-gray-800">{homeLabel || "Register your business"}</button>
          <span className="text-gray-400">&gt;</span>
          <span className="font-semibold text-[#0E9F8A]">{state.serviceType}</span>
        </nav>
      ) : (
      <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-4 flex-wrap">
        {/* Back to the requests menu — progress stays saved, so picking this
            service again resumes it. */}
        <button onClick={onExit} className="hover:text-blue-600 hover:underline">{homeLabel || "Existing Company"}</button>
        <span>›</span>
        <span className="text-gray-800 font-medium">{state.serviceType}</span>
      </nav>
      )}

      {step.type === "success" && state.submitted?.direct ? (
        <ChangeSavedScreen state={state} storageKey={storageKey} onExit={onExit} onDashboard={onSkip} />
      ) : step.type === "success" ? (
        <SuccessScreen state={state} onExit={onExit} onComplete={onComplete} nextLabel={nextLabel} onRetryPayment={retryPayment} />
      ) : (
        <div className={`grid grid-cols-1 lg:grid-cols-[264px_1fr] gap-6 items-start${nc ? " xl:grid-cols-[264px_1fr_264px]" : ""}`}>
          {nc ? (
          <aside className="lg:sticky lg:top-6">
            <div className={`${CARD_NC} p-5 lg:min-h-[74vh] flex flex-col`}>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">{state.serviceType}</h3>
              <div className="mt-3 rounded-lg bg-[#FFF7E0] px-3 py-1.5 text-xs font-medium text-[#B7791F]">{flow.kind || "New Company"}</div>
              <div className="mt-5">
                <div className="flex justify-between text-xs text-gray-700 mb-1.5">
                  <span>Step {shown} of {total}</span><span className="text-gray-500">{pct}%</span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#F5C518] rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <ul className="mt-5 space-y-1 hidden lg:block flex-1">
                {steps.slice(0, -1).map((s, i) => { const current = i === stepIndex; const canJump = !current && i <= reachedIndex; const done = canJump && i < reachedIndex; return (
                  <li key={s.id}>
                    <button type="button" disabled={!canJump} onClick={() => jumpTo(i)}
                      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left text-[13px] transition ${
                        current ? "bg-[#FFF7E0] text-gray-900 font-semibold" : canJump ? "text-gray-800 hover:bg-gray-50" : "text-gray-400 cursor-default"
                      }`}>
                      <span className={`flex-none w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] ${
                        done ? "bg-[#22C55E] text-white" : current ? "bg-[#F5C518] text-gray-900 font-bold" : canJump ? "border border-gray-300 text-gray-600" : "border border-gray-200 text-gray-400"
                      }`}>
                        {done ? <Check className="w-3 h-3" strokeWidth={3.5} /> : i + 1}
                      </span>
                      <span>{s.title}</span>
                    </button>
                  </li>
                ); })}
              </ul>
              {!state.dealId && (
                <button onClick={cancelApplication} className="mt-4 w-full text-xs text-gray-400 hover:text-red-600 py-1.5">✕ Cancel application</button>
              )}
            </div>
          </aside>
          ) : (
          <aside className="lg:sticky lg:top-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="font-semibold text-gray-800">{state.serviceType}</div>
              <span className="inline-block mt-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                {flow.kind || "Existing Company"}
              </span>
              <div className="mt-4">
                <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                  <span>Step {shown} of {total}</span><span>{pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <ul className="mt-4 space-y-0.5 hidden lg:block">
                {steps.slice(0, -1).map((s, i) => { const canJump = i !== stepIndex && i <= reachedIndex; const done = canJump && i < reachedIndex; return (
                  <li key={s.id} className={`flex items-center gap-2.5 py-1.5 text-sm ${i === stepIndex ? "text-blue-700 font-semibold" : canJump ? "text-gray-800" : "text-gray-400"}`}>
                    <span className={`flex-none w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                      done ? "bg-green-500 border-green-500 text-white" : i === stepIndex ? "border-blue-500 text-blue-600" : "border-gray-200"
                    }`}>
                      {done ? "✓" : i + 1}
                    </span>
                    {canJump ? (
                      <button onClick={() => jumpTo(i)} className="hover:underline text-left">{s.title}</button>
                    ) : <span>{s.title}</span>}
                  </li>
                ); })}
              </ul>
              {!state.dealId && (
                <button onClick={cancelApplication} className="mt-4 w-full text-xs text-gray-400 hover:text-red-600 py-1.5">✕ Cancel application</button>
              )}
            </div>
          </aside>
          )}

          <div className={nc ? `${CARD_NC} p-6 sm:p-7 lg:min-h-[74vh] flex flex-col` : "bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-6"}>
            {nc ? (
              <div className="mb-4">
                <div className="text-[10px] font-semibold tracking-wider uppercase text-[#E8A317]">Step {shown} of {total}</div>
                <h2 className="text-xl font-bold text-gray-900 mt-1">{step.title}</h2>
              </div>
            ) : (
            <div className="mb-5">
              <div className="text-xs font-bold tracking-wide uppercase text-blue-600">Step {shown} of {total}</div>
              <h2 className="text-xl font-semibold text-gray-900 mt-1">{step.title}</h2>
            </div>
            )}

            {step.type === "leadDetails" && <LeadDetailsBody state={state} errors={errorsRef.current} bump={bump} />}
            {step.type === "changeCompany" && <ChangeCompanyBody A={A} state={state} errors={errorsRef.current} setAnswer={setAnswer} bump={bump} />}
            {step.type === "goToChange" && <GoToChangeBody onExit={onExit} />}
            {step.type === "review" && directMode && <ChangeReviewBody A={A} state={state} current={changeCurrent?.data} errors={errorsRef.current} onConfirm={(v) => { state.confirmed = v; bump(); }} onJump={jumpTo} steps={steps} />}
            {step.type === "review" && !directMode && <ReviewBody flowId={flowId} A={A} state={state} errors={errorsRef.current} onConfirm={(v) => { state.confirmed = v; bump(); }} onJump={jumpTo} />}
            {step.type === "packages" && <PackagesBody A={A} state={state} bump={bump} onPay={goNext} onCallback={() => withSignIn(openCallback)} onBack={goBack} />}
            {step.type === "payment" && <PaymentBody flow={flow} A={A} state={state} bump={bump} onPay={() => withSignIn(() => doPay(flow, state, bump))} onCallback={() => withSignIn(openCallback)} onBack={goBack} />}
            {callbackFormOpen && (
              <CallbackRequestModal
                onClose={() => setCallbackFormOpen(false)}
                onSubmit={(request) => {
                  setCallbackFormOpen(false);
                  doCallback(flow, state, bump, request, step.type);
                }}
              />
            )}
            {confirmNameOpen && (
              <ConfirmNameModal
                A={A}
                state={state}
                onClose={() => setConfirmNameOpen(false)}
                onConfirm={(name) => {
                  setConfirmNameOpen(false);
                  setAnswer("nc_target", name);
                  setAnswer("nc_confirmed", name);
                  if (nameCheckIsCurrent(A, state)) {
                    goNext();
                  } else {
                    // Not checked yet: check it now; Continue again once the result is in.
                    state.autoNameCheck = name;
                    bump();
                  }
                }}
              />
            )}
            {callbackNoticeOpen && (
              <CallbackAlreadyRequestedModal callAt={state.callbacksDone?.[step.type]?.callAt} onClose={() => setCallbackNoticeOpen(false)} />
            )}
            {step.type === "owners" && <OwnersBody A={A} state={state} errors={errorsRef.current} bump={bump} />}
            {step.type === "docs" && <DocsBody step={step} A={A} state={state} errors={errorsRef.current} bump={bump} />}
            {step.type === "objective" && <ObjectiveBody A={A} errors={errorsRef.current} setAnswer={setAnswer} />}
            {step.type === "aiClassFinder" && <AiClassFinderBody A={A} setAnswer={setAnswer} state={state} bump={bump} />}
            {step.type === "tmClassConfirm" && <TmClassConfirmBody A={A} onChangeClass={() => { state.stepIndex = steps.findIndex((s) => s.id === "recommend"); bump(); }} />}
            {step.type === "tmSearch" && <TmSearchBody flow={flow} step={step} A={A} state={state} errors={errorsRef.current} setAnswer={setAnswer} bump={bump} liveStateNames={liveStateNames} />}
            {step.type === "tmResults" && <TmResultsBody A={A} state={state} />}
            {step.type === "tmMarks" && <TmMarksBody flow={flow} A={A} state={state} errors={errorsRef.current} setAnswer={setAnswer} bump={bump} />}
            {!step.type && <FieldsBody step={step} A={A} errors={errorsRef.current} setAnswer={setAnswer} state={state} bump={bump} liveStateNames={liveStateNames} />}
            {!step.type && directMode && <ErrorText msg={errorsRef.current.__save} />}
            {/* Business Name: name availability (MCA + trademark) is checked
                right here, under the proposed names. */}
            {step.id === "name" && A.hasName === "Yes" && (
              <NameCheckBody A={A} state={state} errors={errorsRef.current} setAnswer={setAnswer} bump={bump} />
            )}

            {step.type !== "payment" && step.type !== "packages" && nc && (
              <div className="flex items-center justify-between gap-3 mt-auto pt-7">
                <div className="pt-4 w-full flex items-center justify-between gap-3 border-t border-gray-100">
                  <button onClick={goBack} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <div className="flex items-center gap-3">
                    {canSkipToDashboard && (
                      <button onClick={skipToDashboard} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50">
                        Skip for now — go to dashboard
                      </button>
                    )}
                    <button onClick={goNext} disabled={leadSaving} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold text-gray-900 bg-[#F5C518] hover:bg-[#EAB90C] disabled:bg-gray-100 disabled:text-gray-400">
                      {leadSaving ? "Saving…" : directMode === "advisor" && step.id === "advice" ? "Send Request" : step.type === "review" ? (directMode ? (changeKind(A.change_what) === "other" ? "Send Request" : "Save Changes") : "Proceed to Payment") : "Continue"}
                      {!leadSaving && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {step.type !== "payment" && step.type !== "packages" && !nc && (
              <div className="flex items-center justify-between gap-3 mt-7 pt-5 border-t border-gray-100">
                <button onClick={goBack} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50">← Back</button>
                <div className="flex items-center gap-3">
                  {canSkipToDashboard && (
                    <button onClick={skipToDashboard} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-50">
                      Skip for now — go to dashboard
                    </button>
                  )}
                  <button onClick={goNext} disabled={leadSaving} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60">
                    {leadSaving ? "Saving…" : directMode === "advisor" && step.id === "advice" ? "Send Request" : step.type === "review" ? (directMode ? (changeKind(A.change_what) === "other" ? "Send Request" : "Save Changes") : "Proceed to Payment →") : "Continue →"}
                  </button>
                </div>
              </div>
            )}
          </div>
          {nc && <FlowStepGuide step={step} />}
        </div>
      )}
    </div>
  );
}
const CARD_NC = "bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(16,24,40,0.06)]";

// Service-details breakdown (professional fee, addons, govt fee, GST) shared
// by both the Deal (fees not sent, just needed for context) and the Quote —
// recomputed each time since addons on later steps (e.g. Additional
// Registrations) can still change it right up to Payment.
function serviceDetailsFor(flow, A, state) {
  // One entry per line (main service + each addon), each carrying its own GST
  // and CGST/SGST/IGST split — see feeLines(). serviceId is the real
  // ServiceMaster ServiceID when one exists (see existingCompanyData.js), so
  // the Quote's saved line item can be priced/approved on the Quote review page.
  return feeLines(flow, A, state).lines.map((l) => ({
    serviceName: l.name,
    serviceId: l.serviceId,
    professionalFee: l.professionalFee,
    governmentFee: l.governmentFee,
    gstAmount: l.gstAmount,
    cgst: l.cgst,
    sgst: l.sgst,
    igst: l.igst,
    total: l.total,
  }));
}

// Once the applicant completes the Owners/Directors step (right after
// syncCustomerCompany creates the Customer/Company above), convert the Lead
// to a Deal — well before Documents, so a Deal already exists by the time
// they get there. The Quote (with the final fee breakdown) is still created
// later, at Payment, against this same Deal. Non-blocking: a failure here is
// logged but never stops the applicant from continuing, same rationale as
// lead capture. Also called as a fallback from createQuoteForApplicationStep
// in case this first attempt didn't happen (e.g. Owners/Directors was somehow
// skipped) or failed.
// ServiceDetails must be included: the backend rejects a zero-value deal.
// Only the base service fee is known this early (add-ons picked on the later
// Additional Registrations step aren't reflected yet) — the Quote at Payment
// carries the final, authoritative figures.
// Deal creations in flight, per application — e.g. the owners step's
// background attempt and the before-Documents one (see FlowRunner's advance())
// share one request rather than creating two Deals.
const dealsInFlight = new WeakMap();
function createDealForApplication(flow, state, A, bump) {
  if (dealsInFlight.has(state)) return dealsInFlight.get(state);
  const deal = runCreateDeal(flow, state, A, bump).finally(() => dealsInFlight.delete(state));
  dealsInFlight.set(state, deal);
  return deal;
}
async function runCreateDeal(flow, state, A, bump) {
  if (state.dealId || !state.leadContact) return; // already converted, or no lead captured
  const companyName = resolveCompanyName(flow, A);
  // No name yet (e.g. a flow with no owners step — GST/Trademark/MSME/IEC —
  // attempts this generically after every step, before its own name field is
  // filled in). Nothing to convert to yet; the Payment-step fallback retries
  // once one exists.
  if (!companyName) return;
  await ensureGstInfo(state).catch(() => {});
  await ensureMasterPrices(flow, A, state).catch(() => {});
  const ServiceDetails = serviceDetailsFor(flow, A, state);
  if (state.leadContact.direct) return createDirectDeal(flow, state, A, bump, companyName, ServiceDetails);
  try {
    const dealRes = await convertLeadToDeal({
      leadId: state.leadContact.leadId,
      customer: {
        name: state.leadContact.name,
        mobile: state.leadContact.mobile,
        email: state.leadContact.email,
        country: state.leadContact.country,
        state: state.leadContact.state,
        preferredLanguage: state.leadContact.language,
        existingCustomerId: state.customerId,
      },
      company: {
        name: companyName,
        existingCompanyId: state.companyId,
        // Country is NOT NULL with no default on the backend's company table —
        // must be sent even when the company doesn't exist yet here (e.g. if
        // syncCustomerCompany hasn't created it for some reason).
        ...resolveAddress(flow, A, state.leadContact),
      },
      franchiseeId: state.leadContact.franchiseeId,
      employeeId: state.leadContact.employeeId,
      isIndividual: 1,
      ServiceDetails,
      followUpRemark: flow.dealNoteFor?.(A) || undefined,
    });
    state.dealId = dealRes?.data?.dealId || null;
    state.customerId = dealRes?.data?.customerId || state.customerId;
    state.companyId = dealRes?.data?.companyId || state.companyId;
    if (state.dealId) state.dealSaved = { contact: dealContactFor(flow, A, state), lines: JSON.stringify(ServiceDetails) };
    syncCachedUserCompany(state.companyId, companyName);
    bump();
  } catch (err) {
    console.error("Convert-to-deal failed (non-fatal):", err);
  }
}

// Existing client (see captureExistingCustomer): no Lead to convert — create
// the Deal directly against their Customer + Company, the same /insert the
// portal's call-back flow uses for existing clients.
async function createDirectDeal(flow, state, A, bump, companyName, ServiceDetails) {
  await syncCustomerCompany(state, A, bump, flow);
  if (!state.companyId) return; // Company couldn't be matched/created; Payment retries
  const lc = state.leadContact;
  try {
    const dealRes = await insertDeal({
      name: lc.name,
      state: resolveAddress(flow, A, lc).state || lc.companyState,
      mobile: lc.mobile,
      email: lc.email,
      franchiseId: lc.franchiseeId,
      employeeId: lc.employeeId,
      sourceOfSale: "Website",
      dealType: "Individual",
      services: ServiceDetails.map((s) => ({
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        professionalFee: s.professionalFee,
        vendorFee: 0,
        contractorFee: 0,
        govtFee: s.governmentFee,
        gstPct: Number(s.gstAmount) > 0 ? 18 : 0,
        total: s.total,
      })),
      CompanyID: state.companyId,
      CustomerID: state.customerId,
      followUpRemark: flow.dealNoteFor?.(A) || undefined,
    });
    state.dealId = dealRes?.dealId || dealRes?.insertId || null;
    if (state.dealId) state.dealSaved = { contact: dealContactFor(flow, A, state), lines: JSON.stringify(ServiceDetails) };
    syncCachedUserCompany(state.companyId, companyName);
    bump();
  } catch (err) {
    console.error("Direct deal failed (non-fatal):", err);
  }
}

// Once the applicant reaches Payment, the real service details are finally
// settled — save the fee breakdown as a real Quote (QuoteStatus "Quote
// Created") against the Deal from createDealForApplication, BEFORE the
// (mocked) payment below runs. Falls back to creating the Deal first if it
// somehow hasn't happened yet (e.g. Documents step was skipped). Guarded to
// run only once, same as createDealForApplication.
async function createQuoteForApplicationStep(flow, state, A) {
  // Already quoted — bring the Deal / Quote up to date with any edits instead.
  if (state.quoteId) { await resaveApplication(flow, state, A); return; }
  if (!state.leadContact) return; // no lead captured
  if (!state.dealId) await createDealForApplication(flow, state, A, () => {});
  else await resaveDeal(flow, state, A);
  if (!state.dealId) return;
  const companyName = resolveCompanyName(flow, A);
  await ensureGstInfo(state).catch(() => {});
  await ensureMasterPrices(flow, A, state).catch(() => {});
  const ServiceDetails = serviceDetailsFor(flow, A, state);
  try {
    const quoteRes = await createQuoteForApplication({
      leadId: state.leadContact.leadId,
      dealId: state.dealId,
      customerId: state.customerId,
      companyId: state.companyId,
      customerName: state.leadContact.name,
      companyName,
      franchiseeId: state.leadContact.franchiseeId,
      employeeId: state.leadContact.employeeId,
      isIndividual: 1,
      ServiceDetails,
    });
    state.quoteId = quoteRes?.data?.QuoteID || null;
    if (state.quoteId) state.quoteSaved = JSON.stringify(ServiceDetails);
    saveAnswers(flow, state, A);
    // "Application received" email (separate customer email service) — same
    // Application ID the success screen shows (see doPay / doCallback). Not
    // awaited: the email must never hold up the application.
    sendApplicationReceivedEmail({
      quoteId: state.quoteId,
      applicationId: state.applicationId,
      serviceType: state.serviceType,
      callback: !!state.callbackRequested,
      // Requests whose deliverable is itself an email (Trademark status report,
      // Udyam certificate) — the email tells them what's coming and where.
      requestType: A.ex_tm_need || A.ex_msme_need || null,
      deliverableEmail:
        (A.ex_tm_need === "Trademark Status" && A.tm_contactEmail) ||
        (A.ex_msme_need === "Download Certificate" && A.msme_email) ||
        null,
    });
    syncCachedUserQuote(state.companyId, companyName, {
      QuoteID: state.quoteId,
      CompanyID: state.companyId,
      CustomerID: state.customerId,
      QuoteStatus: 1, // "Quote Created" — same as the backend sets
      PackageName: state.serviceType,
      ServiceDetails: ServiceDetails.map((s) => ({ ...s, Total: s.total })),
      CreatedDate: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Create-quote failed (non-fatal):", err);
  }
}

// Opens the same customer-facing Quote review page the rest of the app already
// links to (QuotesList.jsx, DashboardLayout.jsx, etc. — the "saved-preview"
// link, opened in a new tab so the applicant's FlowRunner tab stays put) —
// same encrypted-QuoteID link, same secret. That page already has everything
// a payment step here would otherwise have to duplicate: showing the quote,
// Accept Terms & Conditions, Approve (its own OTP verification, keyed to the
// QuoteID) or Decline with a reason, and — on approval — the real Easebuzz
// payment link via this same backend's /initiate endpoint. Nothing left for
// FlowRunner to do once the Quote exists.
//
// `tab` is an already-open window (see doPay) — the Quote itself is only
// known after an async createQuoteForApplicationStep() call, and calling
// window.open() only after an await gets silently popup-blocked by most
// browsers (it's no longer seen as a direct result of the click). Opening a
// blank tab synchronously in the click handler, then navigating it here once
// the Quote exists, avoids that.
function quoteApprovalUrl(quoteId) {
  const secret = import.meta.env.VITE_QUOTE_LINK_SECRET || "q3!9fKs7@pLzXr84$nmYtB!cVZdQ3";
  const encrypted = CryptoJS.AES.encrypt(String(quoteId), secret).toString();
  return `${getClientBaseUrl()}/quotes/saved-preview/${encodeURIComponent(encrypted)}`;
}
function openQuoteForApproval(state, tab) {
  if (!state.quoteId) {
    if (tab && !tab.closed) tab.close();
    return;
  }
  const url = quoteApprovalUrl(state.quoteId);
  if (tab && !tab.closed) {
    tab.location.href = url;
  } else {
    // Fallback (e.g. the synchronous open above was itself blocked) — best
    // effort, may still get blocked since we're past the click by now.
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

// A package picked at Packages gets its own Package Deal + Package Quote for
// the same Company / Customer, next to the registration's Individual ones — a
// Quote is either Individual or one Package, and a Deal holds one live quote
// (same as the CRM). Created once per package (state.packageDeal /
// state.packageQuote, saved with the application). Non-fatal: if it fails the
// registration still goes ahead, and a follow-up on its Deal tells the team
// to add the package by hand.
async function createPackageForApplication(flow, state, A) {
  const pkg = A.selectedPackage;
  if (!pkg?.id || !Array.isArray(pkg.lines) || pkg.lines.length === 0) return;
  if (state.packageQuote?.packageId === pkg.id) return; // already quoted
  if (!state.dealId || !state.companyId || !state.leadContact) return;
  const lc = state.leadContact;
  try {
    let dealId = state.packageDeal?.packageId === pkg.id ? state.packageDeal.dealId : null;
    if (!dealId) {
      const dealRes = await insertDeal({
        name: lc.name,
        state: resolveAddress(flow, A, lc).state || lc.companyState,
        mobile: lc.mobile,
        email: lc.email,
        franchiseId: lc.franchiseeId,
        employeeId: lc.employeeId,
        sourceOfSale: "Website",
        dealType: "Package",
        packageId: pkg.id,
        packageName: pkg.name,
        billingPeriod: "Yearly",
        services: pkg.lines.map((l) => ({
          serviceId: l.serviceId,
          serviceName: l.serviceName,
          professionalFee: l.professionalFee,
          vendorFee: l.vendorFee,
          contractorFee: 0,
          govtFee: l.govtFee,
          gstPct: 18,
          total: l.total,
          packageId: pkg.id,
          packageName: pkg.name,
          billingPeriod: "Yearly",
          dealType: "Package",
        })),
        CompanyID: state.companyId,
        CustomerID: state.customerId,
      });
      dealId = dealRes?.dealId || dealRes?.insertId || null;
      if (!dealId) throw new Error("Package deal was not created");
      state.packageDeal = { packageId: pkg.id, dealId };
    }
    const quoteRes = await createQuoteForApplication({
      dealId,
      customerId: state.customerId,
      companyId: state.companyId,
      customerName: lc.name,
      companyName: resolveCompanyName(flow, A),
      franchiseeId: lc.franchiseeId,
      employeeId: lc.employeeId,
      packageId: pkg.id,
      packageName: pkg.name,
      ServiceDetails: pkg.lines.map((l) => ({
        serviceId: l.serviceId,
        serviceName: l.serviceName,
        professionalFee: l.professionalFee,
        vendorFee: l.vendorFee,
        governmentFee: l.govtFee,
        gstAmount: 0,
        total: l.total,
      })),
    });
    const quoteId = quoteRes?.data?.QuoteID || null;
    if (!quoteId) throw new Error("Package quote was not created");
    state.packageQuote = { packageId: pkg.id, quoteId, dealId, name: pkg.name, amount: pkg.price };
  } catch (err) {
    console.error("Package deal/quote failed (non-fatal):", err);
    if (state.packageFailNoted === pkg.id) return;
    state.packageFailNoted = pkg.id;
    createDealFollowUp({
      dealId: state.dealId,
      followUpDate: toLocalInput(new Date()).slice(0, 10),
      remark: `Customer selected the package ${pkg.name} (${rupee(pkg.price)} / year) on the website, but its package deal/quote could not be created automatically — please create it.`,
    }).catch((e) => console.error("Package follow-up failed:", e));
  }
}

async function doPay(flow, state, bump) {
  state.__paying = true;
  bump();
  // Opened synchronously, still inside the click's call stack — see
  // openQuoteForApproval() for why this can't wait until after the Quote
  // creation call below.
  const approvalTab = window.open("", "_blank");
  state.applicationId = state.applicationId || newApplicationId(flow.code);
  try {
    await createQuoteForApplicationStep(flow, state, state.answers);
  } catch (err) {
    // Don't leave the buttons stuck on "Submitting…".
    console.error("Quote creation failed:", err);
    approvalTab?.close();
    state.__paying = false;
    bump();
    return;
  }
  openQuoteForApproval(state, approvalTab);
  await createPackageForApplication(flow, state, state.answers);
  await ensureGovtFeeFlag(flow, state.answers, state).catch(() => {});
  const f = feeLines(flow, state.answers, state); // after the quote, so GST info is loaded
  // Stay on Payment: opening the quote is not paying it. FlowRunner's payment
  // check (checkQuotePayment) moves to "Application Submitted" only once the
  // payment has actually succeeded.
  state.awaitingPayment = { quoteId: state.quoteId, amount: rupee(f.total) };
  state.__paying = false;
  bump();
}

// "Request a Call" (Packages) / "Request a Call Back" (Payment), submitted from
// CallbackRequestModal — same Quote as doPay (so the advisor has the exact fee
// breakdown in front of them), but instead of opening it for approval, put a
// follow-up on the Deal / Lead at the customer's preferred time. No support
// ticket — those are only raised from the Customer support page.
async function doCallback(flow, state, bump, request = {}, stage = "") {
  if (state.__paying) return;
  state.__paying = true;
  bump();
  state.applicationId = state.applicationId || newApplicationId(flow.code);
  state.callbackRequested = true;
  try {
    await createQuoteForApplicationStep(flow, state, state.answers);
  } catch (err) {
    // Don't leave the buttons stuck on "Submitting…".
    console.error("Quote creation failed:", err);
    state.callbackRequested = false; // nothing was submitted — they may try again
    state.__paying = false;
    bump();
    return;
  }
  await createPackageForApplication(flow, state, state.answers);
  await ensureGovtFeeFlag(flow, state.answers, state).catch(() => {});
  const f = feeLines(flow, state.answers, state); // after the quote, so GST info is loaded
  // Put the call on the advisor's follow-up list (CRM → Follow-ups, and the
  // Deal / Lead Follow-up tab) at the time the customer picked — on the
  // application's Deal, or its Lead before a Deal exists.
  if (request.preferredAt) {
    // datetime-local gives "YYYY-MM-DDTHH:MM" in the customer's own time: the
    // date goes in followup_date (a DATE), the time in followup_time.
    const [followUpDate, followUpTime] = String(request.preferredAt).split("T");
    const pkg = state.answers.selectedPackage;
    const callAt = new Date(request.preferredAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    const remark = `Call back request — ${state.serviceType}. Call at ${callAt} (quote total ${rupee(f.total)})${pkg ? `. Interested package: ${pkg.name} (${rupee(pkg.price)} / year${state.packageQuote?.packageId === pkg.id ? ", separate package quote created" : ""})` : ""}${request.note ? `. Note: ${request.note}` : ""}`;
    try {
      if (state.dealId) await createDealFollowUp({ dealId: state.dealId, followUpDate, followUpTime, remark });
      else if (state.leadContact?.leadId) await createLeadFollowUp({ leadId: state.leadContact.leadId, followUpDate, followUpTime, remark });
    } catch (err) {
      console.error("Call back follow-up scheduling failed (non-fatal):", err);
    }
  }
  state.submitted = {
    id: state.applicationId, service: state.serviceType, date: today(), amount: rupee(f.total), callback: true,
    callAt: request.preferredAt ? new Date(request.preferredAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "",
  };
  // Saved with the application per stage, so a second click at the same stage
  // (even after a reload) only says it's already been requested.
  state.callbacksDone = { ...state.callbacksDone, [stage]: { callAt: state.submitted.callAt } };
  state.__paying = false;
  state.stepIndex = allSteps(state.flowId, state.answers).length - 1;
  bump();
}

/* ---------------------------------------------------------------------------
   Details — literal Step 1 for flows with no natural "checking procedure" to
   gate a lead-capture modal behind (GST/Trademark/MSME/IEC — see
   flow.autoLeadGate). Just a contact-details form, no OTP/sign-in: the
   fields live on state.leadForm, validateStep() checks them, and the
   wizard's own "Continue →" raises the Lead (captureLeadDetails) and moves on.
--------------------------------------------------------------------------- */
// Raises the Lead from a contact form (Details step or LeadCaptureModal).
// Franchisee assignment is best-effort: /assignCustomer 404s when no
// franchisee matches the state/language, and that must not stop the Lead
// itself — createLead routes an owner on its own when franchiseeId is absent.
async function raiseLead(state, form) {
  // An existing client needs no Lead — their Deal is created directly (see
  // createDealForApplication), same as the portal's call-back flow does.
  if (await captureExistingCustomer(state, form)) { state.contactSaved = contactFieldsOf(form); return; }
  let franchiseeId = null;
  try {
    const assignment = await assignCustomer({ language: form.language, state: form.state, district: form.state });
    franchiseeId = assignment?.franchiseeId || null;
  } catch (err) {
    console.warn("Franchisee assignment failed (non-fatal, lead still created):", err);
  }
  try {
    const res = await createLead({
      name: form.name.trim(),
      state: form.state,
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      proposed_service: state.serviceType,
      preferred_language: form.language,
      lead_source: `startbusiness-${state.flowId}`,
      ...(franchiseeId ? { franchiseeId } : {}),
    });
    state.leadContact = {
      ...form,
      leadId: res?.lead?.id || null,
      franchiseeId,
      employeeId: res?.assignedEmployeeId || null,
    };
  } catch (err) {
    // 409 isDuplicate: this mobile already has a Lead (always true for a
    // returning, signed-in customer) — continue the application on that one.
    const dup = err?.response?.status === 409 && err.response.data?.isDuplicate ? err.response.data : null;
    if (!dup) console.error("Lead capture failed (non-fatal):", err);
    state.leadContact = { ...form, leadId: dup?.existingLeadId || null, franchiseeId, employeeId: null };
  }
  state.leadCaptured = true;
  state.contactSaved = contactFieldsOf(form);
}

// "Your details" as saved on the Lead / Customer — compared with the current
// contact so a later correction is written to them (resaveContact).
function contactFieldsOf(c) {
  return {
    name: String(c?.name || "").trim(),
    email: String(c?.email || "").trim(),
    mobile: String(c?.mobile || "").replace(/\D/g, "").slice(-10),
    state: String(c?.state || "").trim(),
    language: String(c?.language || "").trim(),
  };
}
// Sends only the changed details; needs the customer's sign-in (the Lead is
// updated once they have one). A failure keeps the old snapshot, so the next
// Continue tries again.
async function resaveContact(state) {
  if (!state.contactSaved || !state.leadContact || !localStorage.getItem("token")) return;
  const diff = changedColumns(contactFieldsOf(state.leadContact), state.contactSaved);
  if (!Object.keys(diff).length) return;
  try {
    await updateApplicationContact({ leadId: state.leadContact.leadId || undefined, ...diff });
    state.contactSaved = { ...state.contactSaved, ...diff };
  } catch (err) {
    console.error("Contact details update failed (non-fatal):", err);
  }
}

// "Talk to an Advisor" Lead — same franchisee assignment + createLead as
// raiseLead, but always a Lead (even for an existing client) and carrying the
// customer's question as `followup_remark`, which the server saves as a
// pending follow-up for the Lead's owner. A mobile that already has a Lead
// (409) is fine: the server attached the follow-up to that Lead instead.
async function raiseAdvisorLead(state, A) {
  const language = String(A.ex_language || "").toLowerCase();
  let franchiseeId = null;
  try {
    const assignment = await assignCustomer({ language, state: A.ex_state, district: A.ex_state });
    franchiseeId = assignment?.franchiseeId || null;
  } catch (err) {
    console.warn("Franchisee assignment failed (non-fatal, lead still created):", err);
  }
  const callAt = A.ex_callbackAt ? `\nCall at: ${new Date(A.ex_callbackAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : "";
  const remark = `Talk to an Advisor — ${String(A.ex_name || "").trim()}\nWants to: ${String(A.ex_query || "").trim()}${callAt}`;
  try {
    const res = await createLead({
      name: String(A.ex_contact || "").trim(),
      mobile: String(A.ex_mobile || "").trim(),
      email: String(A.ex_email || "").trim(),
      state: A.ex_state,
      preferred_language: language,
      proposed_service: state.serviceType,
      lead_source: `startbusiness-${state.flowId}`,
      ...(franchiseeId ? { franchiseeId } : {}),
      followup_remark: remark,
      // The advisor's follow-up is due at the time the customer picked.
      // "YYYY-MM-DDTHH:MM" in the customer's time → date + time of the follow-up.
      ...(A.ex_callbackAt ? { followup_date: String(A.ex_callbackAt).split("T")[0], followup_time: String(A.ex_callbackAt).split("T")[1] } : {}),
    });
    state.advisorLeadId = res?.lead?.id || null;
  } catch (err) {
    const data = err?.response?.data;
    if (err?.response?.status === 409 && data?.isDuplicate) {
      state.advisorLeadId = data.existingLeadId || null;
      return;
    }
    throw new Error(data?.error || data?.message || "Couldn't send your request. Please try again.");
  }
}

// The signed-in Customer's cached `user` payload — but only for an existing
// client, i.e. one who already has a Company with us. A brand-new sign-up
// (no Companies yet) still goes through the Lead → Deal path.
function existingCustomerAccount() {
  if (!localStorage.getItem("token")) return null;
  try {
    const raw = getSecureItem("user");
    const user = typeof raw === "string" ? JSON.parse(raw) : raw;
    return user?.CustomerID && user.Companies?.length ? user : null;
  } catch {
    return null;
  }
}

// Existing client: skip createLead and take the franchisee/employee their
// account is already assigned to (from their selected Company — same lookup
// as the portal's call-back Deal, SupportTickets.jsx submitDeal). /insert needs
// both, so without them this returns false and the Lead path runs instead.
async function captureExistingCustomer(state, form) {
  const user = existingCustomerAccount();
  if (!user) return false;
  const selectedId = getCompanyIdFromStorage();
  const company = user.Companies.find((c) => String(c.CompanyID) === String(selectedId)) || user.Companies[0];
  let franchiseeId = null;
  let employeeId = null;
  let companyState = company?.State || "";
  try {
    const details = (await getCompanyDetails(company.CompanyID))?.data || {};
    franchiseeId = details.FranchiseID || null;
    employeeId = details.Agents?.[0]?.EmployeeID || null;
    companyState = companyState || details.State || "";
  } catch (err) {
    console.error("Existing customer's company lookup failed, raising a Lead instead:", err);
  }
  if (!franchiseeId || !employeeId) return false;
  state.customerId = user.CustomerID;
  state.leadContact = { ...form, leadId: null, franchiseeId, employeeId, direct: true, companyState };
  state.leadCaptured = true;
  return true;
}

// Existing client's Company for this application: one they already have with
// the same name is reused as-is; anything else (e.g. registering another
// company) is created under their existing Customer, with no Lead.
// Names compared loosely — case, punctuation and "Pvt"/"Ltd" spellings aside —
// so "ABC Pvt. Ltd" typed in the flow still finds their "ABC Private Limited".
function companyNameKey(name) {
  return String(name || "").toLowerCase()
    .replace(/\bpvt\b/g, "private").replace(/\bltd\b/g, "limited")
    .replace(/[^a-z0-9]/g, "");
}
function matchExistingCompany(state, companyName) {
  const user = existingCustomerAccount();
  const name = companyNameKey(companyName);
  const match = (user?.Companies || []).find((c) => companyNameKey(c.BusinessName || c.CompanyName) === name);
  if (match) state.companyId = match.CompanyID;
  return !!match;
}

// Authorized Person name / email / mobile follow the applicant's contact
// details until the user types their own: a box that is empty, or still holds
// the value last copied in (state.authAutofill), takes the current contact
// value — so correcting "Your details" later corrects the Authorized Person too.
function syncAuthFromContact(state, contact) {
  const A = state.answers;
  const auto = { ...(state.authAutofill || {}) };
  const fill = {
    auth_name: contact?.name,
    auth_email: contact?.email,
    auth_mobile: String(contact?.mobile || "").replace(/\D/g, "").slice(-10),
  };
  Object.entries(fill).forEach(([k, v]) => {
    const val = String(v || "").trim();
    const cur = String(A[k] || "").trim();
    if (!val || (cur && cur !== auto[k])) return;
    A[k] = val;
    auto[k] = val;
  });
  state.authAutofill = auto;
}

async function captureLeadDetails(state) {
  const form = state.leadForm;
  // Already raised on an earlier pass — just keep the contact details current.
  // A pass whose createLead failed (leadId null) retries instead.
  if (state.leadCaptured && (state.leadContact?.leadId || state.leadContact?.direct)) {
    state.leadContact = { ...state.leadContact, ...form };
    syncAuthFromContact(state, state.leadContact);
    resaveContact(state);
    return;
  }
  try {
    const raw = getSecureItem("user");
    const user = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (user?.CustomerID) state.customerId = user.CustomerID;
  } catch { /* not signed in — fine */ }
  await raiseLead(state, form);
}

function LeadDetailsBody({ state, errors, bump }) {
  const [states, setStates] = useState([]);
  if (!state.leadForm) {
    // Prefill from the signed-in Customer's profile when there's no earlier entry.
    // State falls back to the one picked on the service page (answers.leadState,
    // passed in by ServiceDetails' "Proceed to Quote").
    const src = state.leadContact || signedInContact() || {};
    state.leadForm = { name: src.name || "", mobile: src.mobile || "", email: src.email || "", country: "India", state: src.state || state.answers?.leadState || "", language: src.language || "" };
  }
  const form = state.leadForm;

  useEffect(() => {
    getAllStates().then(setStates).catch(() => setStates([]));
  }, []);

  function set(k, v) {
    form[k] = v;
    delete errors["lead_" + k];
    // Preferred Language follows the State (stateLanguages.js).
    if (k === "state") {
      form.language = languageForState(v, form.language).toLowerCase();
      if (form.language) delete errors.lead_language;
    }
    bump();
  }

  return (
    <div className="max-w-md space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name<span className="text-red-500 ml-0.5">*</span></label>
        <input className={inputCls(errors.lead_name)} value={form.name} onChange={(e) => set("name", sanitize.personName(e.target.value))} placeholder="Your full name" />
        <ErrorText msg={errors.lead_name} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile<span className="text-red-500 ml-0.5">*</span></label>
        <MobileInput
          className={inputCls(errors.lead_mobile)}
          value={form.mobile}
          onChange={(v) => set("mobile", v)}
          india={isIndia(form.country)}
          placeholder="10-digit mobile number"
        />
        <ErrorText msg={errors.lead_mobile} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email<span className="text-red-500 ml-0.5">*</span></label>
        <input className={inputCls(errors.lead_email)} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
        <ErrorText msg={errors.lead_email} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Country<span className="text-red-500 ml-0.5">*</span></label>
        <input className={inputCls(errors.lead_country) + " bg-gray-100 cursor-not-allowed"} value="India" readOnly tabIndex={-1} />
        <ErrorText msg={errors.lead_country} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">State<span className="text-red-500 ml-0.5">*</span></label>
        <select className={inputCls(errors.lead_state)} value={form.state} onChange={(e) => set("state", e.target.value)}>
          <option value="">Select State</option>
          {withStaticStates(states).map((s) => <option key={s.id || s.state_code || s.state_name} value={s.state_name}>{s.state_name}</option>)}
        </select>
        <ErrorText msg={errors.lead_state} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Language<span className="text-red-500 ml-0.5">*</span></label>
        <select className={inputCls(errors.lead_language)} value={form.language} onChange={(e) => set("language", e.target.value)}>
          <option value="">Select Language</option>
          {languagesForState(form.state).map((l) => <option key={l} value={l.toLowerCase()}>{l}</option>)}
        </select>
        <ErrorText msg={errors.lead_language} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Lead capture gate — shown once per flow session the first time the applicant
   runs a "checking procedure" (name check / trademark search / GSTIN lookup).
   Now a real sign-in, not just a form: the applicant verifies their mobile via
   an emailed OTP (the website's existing login/signup — loginWithPhone() if
   they already have an account, signupWithPhone() if this is their first —
   both send the OTP by email, see AuthApi.js) before the check runs, so their
   details are saved against a real, logged-in Customer account (not just an
   anonymous Lead) from this very first step. A Lead is still raised the same
   as before, for sales/CRM tracking, once sign-in succeeds. Whatever check the
   applicant was trying to run resumes automatically right after.
--------------------------------------------------------------------------- */
// title/subtitle override the details form's heading (e.g. the Trademark Search page).
export function LeadCaptureModal({ state, bump, title, subtitle }) {
  const [states, setStates] = useState([]);
  // Already entered on a "leadDetails" Step 1 (Lead raised, just not verified
  // yet) — prefill from it and go straight to the details form to confirm.
  const lc = state.leadContact || signedInContact();
  const [form, setForm] = useState({
    name: lc?.name || "", mobile: lc?.mobile || "", email: lc?.email || "",
    country: "India", state: lc?.state || "", language: lc?.language || "",
  });
  // phase: "details" (contact form) -> "otp" (verify code) -> "done" (auto-continues).
  // Opens straight on the form — no separate "why sign up" screen first.
  const [phase, setPhase] = useState("details");
  const [accountMode, setAccountMode] = useState("login"); // "login" (existing account) | "signup" (first time)
  const [submitting, setSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const [otpValues, setOtpValues] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(30);
  // "Already have an account? Sign in" swaps this form for the site Sign In.
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    getAllStates().then(setStates).catch(() => setStates([]));
  }, []);

  useEffect(() => {
    if (phase !== "otp" || timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [phase, timer]);

  // Once sign-in + Lead capture are both done, resume automatically — no extra
  // click needed, same spirit as "after sign-in, proceed where it stopped".
  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => finish(), 900);
    return () => clearTimeout(t);
  }, [phase]);

  function set(k, v) {
    // Preferred Language follows the State (stateLanguages.js).
    setForm((f) => (k === "state"
      ? { ...f, state: v, language: languageForState(v, f.language).toLowerCase() }
      : { ...f, [k]: v }));
  }

  function finish() {
    const run = state.leadGate?.run;
    state.leadGate = null;
    bump();
    run && run();
  }

  function closeModal() {
    state.leadGate = null;
    // Closed without signing in — FlowRunner's needsSignIn() asks again on the
    // next Continue / Back / sidebar move.
    if (!localStorage.getItem("token")) state.signInDismissed = true;
    bump();
  }

  async function submitDetails(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Please enter your name.");
    if (!PATTERNS.personName.test(form.name.trim())) return setError("Name can contain only letters, spaces, dots and apostrophes.");
    if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) return setError("Please enter a valid 10-digit mobile number.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError("Please enter a valid email — we'll send your verification code there.");
    if (!form.country.trim()) return setError("Please enter your country.");
    if (!form.state) return setError("Please select your state.");
    if (!form.language) return setError("Please select your preferred language.");
    setError("");
    setSubmitting(true);
    try {
      // Try signing in first (in case they already have an account from an
      // earlier application) — only fall back to creating one if this mobile
      // number genuinely isn't on file yet.
      let mode = "login";
      try {
        await loginWithPhone(form.mobile.trim());
      } catch (err) {
        if (/not found/i.test(err?.message || "")) {
          mode = "signup";
          // Referral scan token (if any) rides along so the server can attribute the signup.
          await signupWithPhone(form.name.trim(), form.email.trim(), form.mobile.trim(), getReferralToken(), form.state, form.language);
        } else {
          throw err;
        }
      }
      setAccountMode(mode);
      setOtpValues(["", "", "", ""]);
      setTimer(30);
      setPhase("otp");
    } catch (err) {
      const msg = err?.message || "Couldn't send a verification code. Please check your details and try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // Signed in through the site Sign In — re-run the gate, which now finds the
  // token and raises the Lead from the signed-in account before continuing.
  function finishSignIn() {
    const run = state.leadGate?.run;
    state.leadGate = null;
    requireVerifiedCustomer(state, bump, () => run && run());
  }

  // Raises the Lead the same way the form used to (for sales/CRM tracking),
  // now attributed to the just-verified Customer account. Non-blocking, same
  // rationale as elsewhere: sign-in already succeeded, so a failure here
  // (routing/CRM hiccup) shouldn't strand the applicant on this modal.
  async function completeLeadCapture(user) {
    if (user?.CustomerID) state.customerId = user.CustomerID;
    state.otpVerified = true;
    // Lead already raised by the no-OTP Details step — keep it, just refresh
    // the contact details in case they were corrected here.
    if (state.leadCaptured && (state.leadContact?.leadId || state.leadContact?.direct)) {
      state.leadContact = { ...state.leadContact, ...form };
      syncAuthFromContact(state, state.leadContact);
      resaveContact(state);
      setPhase("done");
      return;
    }
    await raiseLead(state, form);
    setPhase("done");
  }

  async function handleOtpChange(index, value) {
    if (value.length > 1) return;
    const next = [...otpValues];
    next[index] = value;
    setOtpValues(next);
    if (value && index < 3) document.getElementById(`gate-otp-${index + 1}`)?.focus();
    if (index === 3 && value && next.every((v) => v.length === 1)) {
      setIsVerifying(true);
      setError("");
      try {
        const tokenData = await verifyOtp(form.mobile.trim(), next.join(""));
        if (tokenData?.token) {
          localStorage.setItem("token", tokenData.token);
          notifyTokenSet();
          if (accountMode === "signup") clearReferralToken();
        }
        if (tokenData?.user) setSecureItem("user", JSON.stringify(tokenData.user));
        await completeLeadCapture(tokenData?.user);
      } catch (err) {
        setError(err?.message || "That code didn't match. Please try again.");
        setOtpValues(["", "", "", ""]);
        document.getElementById("gate-otp-0")?.focus();
      } finally {
        setIsVerifying(false);
      }
    }
  }

  // The account now exists either way (login found it, or signup just created
  // it) — always resend via login, since a second signupWithPhone() call would
  // hit the backend's "account already exists" guard.
  async function handleResend() {
    if (timer > 0) return;
    setError("");
    try {
      await loginWithPhone(form.mobile.trim());
      setTimer(30);
    } catch (err) {
      setError(err?.message || "Couldn't resend the code.");
    }
  }

  if (showSignIn) {
    return (
      <SigninModal
        initialValue={form.mobile}
        onSuccess={finishSignIn}
        onClose={closeModal}
        onSignup={() => setShowSignIn(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <button
          type="button"
          onClick={closeModal}
          aria-label="Close"
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          &times;
        </button>
        {phase === "done" && (
          <Note variant="ok" title="Signed in!" body="Continuing with your check now." />
        )}
        {phase === "otp" && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Verify it's you</h3>
            <p className="text-xs text-gray-500 mb-4">
              {accountMode === "login" ? "Welcome back — " : ""}We've sent a 4-digit code to <b>{form.email}</b> and <b>+91 {form.mobile}</b>.
            </p>
            <div className="flex gap-3 justify-center mb-3">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  id={`gate-otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otpValues[i]}
                  disabled={isVerifying}
                  onChange={(e) => handleOtpChange(i, e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !otpValues[i] && i > 0) document.getElementById(`gate-otp-${i - 1}`)?.focus();
                  }}
                  className="w-12 h-12 text-center text-lg font-semibold border-2 border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none"
                />
              ))}
            </div>
            {isVerifying && <p className="text-xs text-blue-600 text-center mb-2">Verifying…</p>}
            <ErrorText msg={error} />
            <p className="text-xs text-gray-500 text-center mt-3">
              {timer > 0 ? (
                `Resend code in 00:${String(timer).padStart(2, "0")}`
              ) : (
                <button type="button" onClick={handleResend} className="text-blue-600 font-semibold hover:underline">Resend code</button>
              )}
            </p>
            <button
              type="button"
              onClick={() => { setPhase("details"); setOtpValues(["", "", "", ""]); setError(""); }}
              className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600"
            >
              ← Use a different number
            </button>
          </div>
        )}
        {phase === "details" && (
          <form onSubmit={submitDetails}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {title || (state.leadGate?.reason === "documents" ? "Sign up to upload your documents" : "Sign in to check that…")}
            </h3>
            <p className="text-xs text-gray-500 mb-4">{subtitle || "We'll verify your mobile with a code emailed to you, so your application is saved to your own account."}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name<span className="text-red-500 ml-0.5">*</span></label>
                <input className={inputCls()} value={form.name} onChange={(e) => set("name", sanitize.personName(e.target.value))} placeholder="Your full name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile<span className="text-red-500 ml-0.5">*</span></label>
                <MobileInput
                  className={inputCls()}
                  value={form.mobile}
                  onChange={(v) => set("mobile", v)}
                  india={isIndia(form.country)}
                  placeholder="10-digit mobile number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email<span className="text-red-500 ml-0.5">*</span></label>
                <input className={inputCls()} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country<span className="text-red-500 ml-0.5">*</span></label>
                <input className={inputCls() + " bg-gray-100 cursor-not-allowed"} value="India" readOnly tabIndex={-1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State<span className="text-red-500 ml-0.5">*</span></label>
                <select className={inputCls()} value={form.state} onChange={(e) => set("state", e.target.value)}>
                  <option value="">Select State</option>
                  {withStaticStates(states).map((s) => <option key={s.id || s.state_code || s.state_name} value={s.state_name}>{s.state_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Language<span className="text-red-500 ml-0.5">*</span></label>
                <select className={inputCls()} value={form.language} onChange={(e) => set("language", e.target.value)}>
                  <option value="">Select Language</option>
                  {languagesForState(form.state).map((l) => <option key={l} value={l.toLowerCase()}>{l}</option>)}
                </select>
              </div>
            </div>
            <ErrorText msg={error} />
            <button type="submit" disabled={submitting} className="mt-4 w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">
              {submitting ? "Signing up…" : "Sign Up"}
            </button>
            <p className="mt-3 text-xs text-gray-500 text-center">
              Already have an account?{" "}
              <button type="button" onClick={() => setShowSignIn(true)} className="text-blue-600 font-semibold hover:underline">
                Sign in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Generic field-list body
--------------------------------------------------------------------------- */
function FieldsBody({ step, A, errors, setAnswer, state, bump, liveStateNames }) {
  const fields = visibleFields(step, A);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map((f, i) => (
        <div key={f.k || i} className={f.full || ["cards", "checks", "note", "textarea", "helpChoose", "suggestNames", "tmRisk"].includes(f.type) ? "sm:col-span-2" : ""}>
          <Field f={f} A={A} errors={errors} setAnswer={setAnswer} state={state} bump={bump} liveStateNames={liveStateNames} />
        </div>
      ))}
    </div>
  );
}

function Field({ f, A, errors, setAnswer, state, bump, liveStateNames }) {
  if (f.type === "helpChoose") return <HelpChoose A={A} setAnswer={setAnswer} state={state} bump={bump} />;
  if (f.type === "suggestNames") return <SuggestNames A={A} setAnswer={setAnswer} state={state} bump={bump} />;
  if (f.type === "tmRisk") return <TmRiskNote A={A} state={state} />;
  if (f.type === "gstinLookup") return <GstinLookupField f={f} A={A} errors={errors} setAnswer={setAnswer} state={state} bump={bump} />;
  if (f.type === "currentRecord") return <CurrentRecordNote A={A} state={state} bump={bump} />;
  if (f.type === "personPick") return <PersonPickField f={f} A={A} errors={errors} setAnswer={setAnswer} state={state} />;
  if (f.type === "note") {
    const content = f.render ? f.render(A) : null;
    if (f.plainLabel) return <div className="font-semibold text-sm text-gray-800">{f.render(A)}</div>;
    if (!content) return null;
    return <Note {...content} />;
  }
  if (f.type === "cards" || f.type === "checks") {
    const multi = f.type === "checks";
    const cur = multi ? (Array.isArray(A[f.k]) ? A[f.k] : []) : A[f.k];
    const cols = f.cols || (f.opts.length > 4 ? 3 : 2);
    return (
      <div>
        <div className="font-semibold text-sm text-gray-800 mb-2">{f.q || f.label}<ReqMark f={f} A={A} /></div>
        {f.hint && <p className="text-xs text-gray-500 mb-2">{f.hint}</p>}
        <div className={`grid gap-2 grid-cols-1 sm:grid-cols-${Math.min(cols, 3)}${f.opts.length === 2 ? " yn-grid" : ""}`}>
          {f.opts.map((o) => {
            const sel = multi ? cur.includes(o) : cur === o;
            return (
              <OptionButton key={o} selected={sel} square={multi} onClick={() => {
                if (multi) setAnswer(f.k, sel ? cur.filter((x) => x !== o) : [...cur, o]);
                else setAnswer(f.k, o);
              }}>{o}</OptionButton>
            );
          })}
        </div>
        <ErrorText msg={errors[f.k]} />
        {!multi && cur === "Other" && f.otherText !== false && (
          <div className="mt-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Please specify<span className="text-red-500">*</span></label>
            <VoiceSpecifyInput className={inputCls(errors[f.k + "__other"])} value={A[f.k + "__other"] || ""} onChange={(v) => setAnswer(f.k + "__other", v)} placeholder="Tell us more" />
            <ErrorText msg={errors[f.k + "__other"]} />
          </div>
        )}
        {multi && cur.includes("Other") && (
          <div className="mt-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Please specify the other service</label>
            <input className={inputCls()} value={A[f.k + "__other"] || ""} onChange={(e) => setAnswer(f.k + "__other", e.target.value)} placeholder="Tell us more" />
          </div>
        )}
      </div>
    );
  }
  if (f.type === "select") {
    // Every State picker (business address, GST location, existing-GST state)
    // shares the exact STATES array reference — swap in the live, DB-backed
    // list once it's loaded so the saved value is guaranteed to match
    // `indiastates.state_name` (see liveStateNames fetch in FlowRunner).
    const baseOpts = typeof f.opts === "function" ? f.opts(A) : f.opts;
    const opts = baseOpts === STATES && liveStateNames?.length ? [...liveStateNames, "Other"] : baseOpts;
    // A fixed pick (Country = India) can't be changed or cleared.
    if (f.fixed) {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}<ReqMark f={f} A={A} /></label>
          <input className={inputCls(errors[f.k]) + " bg-gray-100 cursor-not-allowed"} value={A[f.k] || f.def} readOnly tabIndex={-1} />
        </div>
      );
    }
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}<ReqMark f={f} A={A} /></label>
        {f.hint && <p className="text-xs text-gray-500 mb-1">{f.hint}</p>}
        <select className={inputCls(errors[f.k])} value={A[f.k] || ""} onChange={(e) => {
          if (f.clears && e.target.value !== A[f.k]) setAnswer(f.clears, "");
          // A State that also picks the Preferred Language (stateLanguages.js).
          if (f.language) setAnswer(f.language, languageForState(e.target.value, A[f.language]));
          setAnswer(f.k, e.target.value);
        }}>
          <option value="">Select…</option>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ErrorText msg={errors[f.k]} />
      </div>
    );
  }
  if (f.type === "district") {
    // Options from the chosen State (same statesAndDistricts.json as
    // AddCompanyModal); free text when the State isn't in that list ("Other").
    const stateName = A[f.stateKey];
    const districts = districtsFor(stateName);
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}<ReqMark f={f} A={A} /></label>
        {districts.length ? (
          <select className={inputCls(errors[f.k])} value={A[f.k] || ""} onChange={(e) => setAnswer(f.k, e.target.value)}>
            <option value="">Select…</option>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        ) : (
          <input className={inputCls(errors[f.k])} value={A[f.k] || ""} onChange={(e) => setAnswer(f.k, e.target.value)}
            disabled={!stateName} placeholder={stateName ? "Enter district" : "Select a state first"} />
        )}
        <ErrorText msg={errors[f.k]} />
      </div>
    );
  }
  if (f.pattern === "mobile") {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}<ReqMark f={f} A={A} /></label>
        {f.hint && <p className="text-xs text-gray-500 mb-1">{f.hint}</p>}
        <MobileInput className={inputCls(errors[f.k])} value={A[f.k]} onChange={(v) => setAnswer(f.k, v)} placeholder={f.ph || ""} />
        <ErrorText msg={errors[f.k]} />
      </div>
    );
  }
  if (f.type === "textarea") {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}<ReqMark f={f} A={A} /></label>
        {f.hint && <p className="text-xs text-gray-500 mb-1">{f.hint}</p>}
        <textarea rows={3} className={inputCls(errors[f.k])} value={A[f.k] || ""} onChange={(e) => setAnswer(f.k, e.target.value)} placeholder={f.ph || ""} />
        <ErrorText msg={errors[f.k]} />
      </div>
    );
  }
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}<ReqMark f={f} A={A} /></label>
      {f.hint && <p className="text-xs text-gray-500 mb-1">{f.hint}</p>}
      <input type={f.type === "text" ? "text" : f.type} max={f.dob ? DOB_MAX : undefined} className={inputCls(errors[f.k]) + (f.readOnly ? " bg-gray-100 cursor-not-allowed" : "")} readOnly={!!f.readOnly} value={A[f.k] || ""} onChange={(e) => { const v = formatInput(f.pattern, e.target.value); if (!exceedsRange(f, A, v)) setAnswer(f.k, v); }} placeholder={f.ph || ""} />
      <ErrorText msg={errors[f.k]} />
      {(f.pattern === "pan" || f.pattern === "aadhaar") && (
        <KycVerify
          kind={f.pattern}
          value={A[f.k]}
          context={() => ({ name: f.kyc?.name ? A[f.kyc.name] : "", dob: f.kyc?.dob ? A[f.kyc.dob] : "" })}
          result={A[f.k + "__kyc"]}
          setResult={(r) => setAnswer(f.k + "__kyc", r)}
          onFill={(d) => fillFromAadhaar(f.kyc?.fill, d, (k) => A[k], setAnswer)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   GSTIN / PAN lookup — once a well-formed GSTIN (or PAN) is typed or pasted,
   fetches the registration from the server-side GST verification proxy and
   fills the answers named in the field's `fill` config (see gstLookupField in
   existingCompanyData.js), so we don't ask for details we can look up.
--------------------------------------------------------------------------- */
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

function GstinLookupField({ f, A, errors, setAnswer, state, bump }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | pick | error
  const [message, setMessage] = useState("");
  const [found, setFound] = useState(null);
  const [panMatches, setPanMatches] = useState([]);
  const value = A[f.k] || "";
  const cfg = f.fill || {};
  const panOnly = cfg.accept === "pan";
  // A box that stores a GSTIN gets the GSTIN a PAN resolves to; a PAN box or
  // an optional helper box keeps what was typed.
  const storesGstin = f.pattern === "gstin";

  async function runLookup(gstin) {
    setStatus("loading");
    setMessage("");
    try {
      const details = await lookupGstin(gstin);
      if (!details) throw new Error("not found");
      applyDetails(details, gstin);
    } catch {
      if (cfg.status) setAnswer("gst_verifiedStatus", "");
      setStatus("error");
      setMessage("Couldn't verify that GSTIN right now — you can still continue and our team will confirm it manually.");
    }
  }

  // A PAN: find its GSTINs in the applicant's state (Details tab, this flow's
  // own state/address State, or the signed-in profile). One match is applied
  // straight away; several are listed for the customer to pick.
  async function runPanLookup(pan) {
    const stateName =
      state.leadForm?.state || state.leadContact?.state ||
      (cfg.state && A[cfg.state]) || (cfg.address != null && A[addressKey("state")]) ||
      A.ex_state || signedInContact()?.state || "";
    const stateCode = GST_STATE_CODES[stateName];
    if (!stateCode) {
      setStatus("error");
      setMessage(panOnly
        ? "Select your state first to look this PAN up — or just continue and fill the details in."
        : "Select your state in the Details step to search by PAN, or enter the 15-character GSTIN.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const list = await lookupGstinsByPan(pan, stateCode);
      if (list.length === 1) {
        if (storesGstin) setAnswer(f.k, list[0].gstin);
        applyDetails(list[0], list[0].gstin);
      } else if (list.length > 1) {
        setPanMatches(list);
        setStatus("pick");
      } else {
        setStatus("error");
        setMessage(`No GST registration found for this PAN in ${stateName}.${panOnly ? "" : " Enter the GSTIN if you have one."}`);
      }
    } catch {
      setStatus("error");
      setMessage("Couldn't search that PAN right now — you can still continue and fill the details in.");
    }
  }

  function pickPanMatch(details) {
    setPanMatches([]);
    if (storesGstin) setAnswer(f.k, details.gstin);
    applyDetails(details, details.gstin);
  }

  const addressKey = (part) => (cfg.address ? `${cfg.address}_${part}` : part);
  // Only fields the customer left empty.
  const fillEmpty = (k, v) => {
    if (k && v && !String(A[k] || "").trim()) setAnswer(k, String(v).trim());
  };

  function applyDetails(details, gstin) {
    if (cfg.name) {
      if (cfg.overwriteName && details.legalName) setAnswer(cfg.name, details.legalName);
      else fillEmpty(cfg.name, details.legalName);
    }
    if (cfg.trade) {
      if (cfg.overwriteName && details.tradeName) setAnswer(cfg.trade, details.tradeName);
      else fillEmpty(cfg.trade, details.tradeName);
    }
    if (cfg.biztype) fillEmpty(cfg.biztype, bizTypeFromConstitution(details.constitution));
    const stateName = STATES.find((s) => s.toLowerCase() === String(details.addressParts?.state || "").trim().toLowerCase());
    if (cfg.state) fillEmpty(cfg.state, stateName);
    if (cfg.regDate) {
      // GSTN gives dd/mm/yyyy; date inputs want yyyy-mm-dd.
      const m = String(details.registrationDate || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m) fillEmpty(cfg.regDate, `${m[3]}-${m[2]}-${m[1]}`);
    }
    if (cfg.status && details.status) {
      setAnswer("gst_regState", details.status);
      setAnswer("gst_verifiedStatus", details.status);
    }
    if (cfg.address != null) prefillAddress(details.addressParts, stateName);
    if (cfg.pan) prefillPan(details, gstin);
    setFound(details);
    setStatus("done");
  }

  // Fills this flow's address step (addressFields(cfg.address)).
  function prefillAddress(parts, stateName) {
    if (!parts) return;
    fillEmpty(addressKey("addr1"), parts.line1);
    fillEmpty(addressKey("addr2"), parts.line2);
    fillEmpty(addressKey("city"), parts.city);
    fillEmpty(addressKey("pincode"), parts.pincode);
    if (stateName) {
      fillEmpty(addressKey("country"), "India");
      fillEmpty(addressKey("state"), stateName);
      fillEmpty(addressKey("district"), parts.district);
    }
  }

  // Fills the PAN Details step (panStep) — the PAN is characters 3–12 of the
  // GSTIN, the name is GST's legal name, the holder type follows the GST
  // constitution.
  function prefillPan(details, gstin) {
    const ctb = String(details.constitution || "").toLowerCase();
    const type =
      /company/.test(ctb) ? "Company"
      : /llp|limited liability/.test(ctb) ? "LLP"
      : /partnership/.test(ctb) ? "Partnership Firm"
      : /proprietor/.test(ctb) ? "Individual"
      : /trust|society/.test(ctb) ? "Trust / Society"
      : "";
    fillEmpty("pan_number", details.pan || gstin.slice(2, 12));
    fillEmpty("pan_name", formatInput("panName", details.legalName));
    fillEmpty("pan_type", type);
  }

  // Typed or pasted: spaces, dashes etc. (common in copied numbers) are
  // dropped. A full GSTIN looks itself up; a full PAN searches its GSTINs.
  function onChange(e) {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, panOnly ? 10 : 15);
    setAnswer(f.k, v);
    if (cfg.status) setAnswer("gst_verifiedStatus", "");
    setStatus("idle");
    setMessage("");
    setFound(null);
    setPanMatches([]);
    if (!panOnly && GSTIN_RE.test(v)) requireLead(state, bump, () => runLookup(v));
    else if (PAN_RE.test(v)) requireLead(state, bump, () => runPanLookup(v));
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}<ReqMark f={f} A={A} /></label>
      <div className="relative">
        <input
          className={inputCls(errors[f.k])}
          value={value}
          onChange={onChange}
          placeholder={f.ph || ""}
        />
        {status === "loading" && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Verifying…</span>
        )}
      </div>
      {f.hint && <p className="text-xs text-gray-500 mt-1">{f.hint}</p>}
      <ErrorText msg={errors[f.k]} />
      {status === "done" && found && (
        <div className="mt-2 text-xs rounded-lg border border-green-200 bg-green-50 text-green-800 px-3 py-2">
          ✓ Verified — <b>{found.legalName || found.tradeName}</b>
          {found.gstin && found.gstin !== value ? ` · ${found.gstin}` : ""}
          {found.status ? ` · ${found.status}` : ""}
        </div>
      )}
      {status === "error" && (
        <div className="mt-2 text-xs rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2">{message}</div>
      )}
      {status === "pick" && panMatches.length > 0 && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-white p-2 space-y-1">
          <p className="text-xs text-gray-600 px-1">This PAN has more than one GST registration — pick yours:</p>
          {panMatches.map((m) => (
            <button
              key={m.gstin}
              type="button"
              onClick={() => pickPanMatch(m)}
              className="w-full text-left text-xs rounded-md border border-gray-200 px-3 py-2 hover:bg-yellow-50 hover:border-yellow-300"
            >
              <b>{m.gstin}</b> · {m.tradeName || m.legalName}{m.status ? ` · ${m.status}` : ""}
              {m.addressParts?.city ? <span className="text-gray-500"> · {m.addressParts.city}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// After an Aadhaar OTP check: copies the Aadhaar name / DOB / gender / address
// into the fields named in `map` ({ name, dob, gender, address } → answer
// keys), only where the customer left them empty.
function fillFromAadhaar(map, d, get, set) {
  if (!map || !d) return;
  const vals = { name: d.name, dob: d.dob, gender: d.gender, address: d.address };
  Object.entries(map).forEach(([part, key]) => {
    const v = vals[part];
    if (key && v && !String(get(key) || "").trim()) set(key, String(v).trim());
  });
}

// GST state codes (first 2 digits of a GSTIN), keyed by STATES spelling.
const GST_STATE_CODES = {
  "Jammu and Kashmir": "01", "Himachal Pradesh": "02", "Punjab": "03", "Chandigarh": "04",
  "Uttarakhand": "05", "Haryana": "06", "Delhi": "07", "Rajasthan": "08", "Uttar Pradesh": "09",
  "Bihar": "10", "Sikkim": "11", "Arunachal Pradesh": "12", "Nagaland": "13", "Manipur": "14",
  "Mizoram": "15", "Tripura": "16", "Meghalaya": "17", "Assam": "18", "West Bengal": "19",
  "Jharkhand": "20", "Odisha": "21", "Chhattisgarh": "22", "Madhya Pradesh": "23", "Gujarat": "24",
  "Dadra and Nagar Haveli and Daman and Diu": "26", "Maharashtra": "27", "Karnataka": "29",
  "Goa": "30", "Lakshadweep": "31", "Kerala": "32", "Tamil Nadu": "33", "Puducherry": "34",
  "Andaman and Nicobar Islands": "35", "Telangana": "36", "Andhra Pradesh": "37", "Ladakh": "38",
};

/* ---------------------------------------------------------------------------
   Owners / Directors repeater
--------------------------------------------------------------------------- */
function OwnersBody({ A, state, errors, bump }) {
  const cfg = ownerConfig(A);
  const fields = ownerBaseFields(cfg);
  const n = state.owners.length;
  const capReached = !!(cfg.maxCount && n >= cfg.maxCount);
  const primaryLabel = cfg.label.split(" / ")[0];
  const round2 = (x) => Math.round(x * 100) / 100;
  const shareTotal = round2(state.owners.reduce((sum, o) => sum + (Number(o.shareholding) || 0), 0));
  const capitalTotal = state.owners.reduce((sum, o) => sum + (Number(o.capital) || 0), 0);
  // What's left of the 100% once everyone else's share is counted — a box
  // can't be typed past it (lower someone else first to give this one more).
  const shareLeft = (i) => round2(100 - state.owners.reduce((sum, o, j) => (j === i ? sum : sum + (Number(o.shareholding) || 0)), 0));
  function setShareholding(i, raw) {
    const v = raw.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").replace(/(\.\d{2})\d+$/, "$1");
    if (v !== "" && Number(v) > shareLeft(i)) return;
    setOwnerField(i, "shareholding", v);
  }

  // The count error from the last Continue is stale once a card is added/removed.
  function addOwner() { if (!capReached) { state.owners.push(newOwner()); delete errors.__owners; bump(); } }
  function removeOwner(i) { state.owners.splice(i, 1); delete errors.__owners; bump(); }
  function setOwnerField(i, k, v) { state.owners[i][k] = v; bump(); }
  function setOwnerNomineeField(i, k, v) {
    if (!state.owners[i].nominee) state.owners[i].nominee = {};
    state.owners[i].nominee[k] = v;
    bump();
  }

  return (
    <div>
      <div className="mb-4">
        <div className="font-semibold text-sm text-gray-800">{cfg.label}</div>
        <p className="text-xs text-gray-500 mt-1">{cfg.hint}</p>
        <ErrorText msg={errors.__owners} />
        {n > 0 && n < cfg.minCount && (
          <p className="text-xs text-amber-700 mt-1">{cfg.label} needs at least {cfg.minCount} — you can continue now and add the remaining {cfg.minCount - n} later.</p>
        )}
      </div>

      <div className="space-y-4">
        {state.owners.map((o, i) => {
          const minor = isMinor(o.dob);
          // Only the first person is required now; the rest can be filled in later.
          const star = i === 0 ? <span className="text-red-500">*</span> : null;
          return (
          <div key={i} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <div className="flex items-center justify-between mb-3">
              <b className="flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                {o.name || `${primaryLabel} ${i + 1}`}
              </b>
              {cfg.maxCount !== 1 && n > 1 && <button onClick={() => removeOwner(i)} className="text-xs text-red-500 hover:underline">Remove</button>}
            </div>
            {i > 0 && <p className="text-xs text-gray-500 -mt-1 mb-3">You can add these details now or later — only the first {primaryLabel.toLowerCase()} must be complete to continue.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fields.map((f) => {
                const optional = minor && MINOR_OPTIONAL_FIELDS.includes(f.k);
                return (
                  <div key={f.k} className={f.full ? "sm:col-span-2" : ""}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}{!optional && star}{optional && <span className="text-gray-400 font-normal"> (optional)</span>}</label>
                    {f.pattern === "mobile" ? (
                      <MobileInput className={inputCls(errors["owner" + i + "_" + f.k])} value={o[f.k]} placeholder={f.ph || ""}
                        onChange={(v) => setOwnerField(i, f.k, v)} />
                    ) : (
                      <input type={f.type} max={f.type === "date" ? DOB_MAX : undefined} className={inputCls(errors["owner" + i + "_" + f.k])} value={o[f.k] || ""} placeholder={f.ph || ""}
                        onChange={(e) => setOwnerField(i, f.k, formatInput(f.pattern, e.target.value))} />
                    )}
                    <ErrorText msg={errors["owner" + i + "_" + f.k]} />
                    {(f.pattern === "pan" || f.pattern === "aadhaar") && (
                      <KycVerify
                        kind={f.pattern}
                        value={o[f.k]}
                        context={() => ({ name: o.name, dob: o.dob })}
                        result={o[f.k + "__kyc"]}
                        setResult={(r) => setOwnerField(i, f.k + "__kyc", r)}
                        onFill={(d) => fillFromAadhaar({ name: "name", dob: "dob", address: "address" }, d, (k) => o[k], (k, v) => setOwnerField(i, k, v))}
                      />
                    )}
                  </div>
                );
              })}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role{star}</label>
                <select className={inputCls(errors["owner" + i + "_role"])} value={o.role || ""} onChange={(e) => setOwnerField(i, "role", e.target.value)}>
                  <option value="">Select…</option>
                  {rolesFor(cfg, minor).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <ErrorText msg={errors["owner" + i + "_role"]} />
                {minor && cfg.hasDIN && <p className="text-[11px] text-gray-400 mt-1">Director-type roles are hidden — a minor can't hold a DIN.</p>}
              </div>
              {cfg.hasDIN && !minor && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Do you already have a {cfg.dinLabel}?{star}</label>
                  <select className={inputCls(errors["owner" + i + "_dinKnown"])} value={o.dinKnown || ""} onChange={(e) => setOwnerField(i, "dinKnown", e.target.value)}>
                    <option value="">Select…</option>
                    {["Yes", "No", "Not Sure"].map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                  <ErrorText msg={errors["owner" + i + "_dinKnown"]} />
                </div>
              )}
              {cfg.hasDIN && !minor && o.dinKnown === "Yes" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{cfg.dinLabel}{star}</label>
                  <input className={inputCls(errors["owner" + i + "_din"])} value={o.din || ""} onChange={(e) => setOwnerField(i, "din", e.target.value)} placeholder="e.g. 08123456" />
                  <ErrorText msg={errors["owner" + i + "_din"]} />
                </div>
              )}
              {cfg.shareholding && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Shareholding %{star}</label>
                  <input type="text" inputMode="decimal" className={inputCls(errors["owner" + i + "_shareholding"])} value={o.shareholding || ""} onChange={(e) => setShareholding(i, e.target.value)} placeholder="e.g. 50" />
                  <p className="text-xs text-gray-500 mt-1">Max {Math.max(0, shareLeft(i))}% left</p>
                  <ErrorText msg={errors["owner" + i + "_shareholding"]} />
                </div>
              )}
              {cfg.capital && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Capital Contribution (₹){star}</label>
                  <input type="number" min="0" className={inputCls(errors["owner" + i + "_capital"])} value={o.capital || ""} onChange={(e) => setOwnerField(i, "capital", formatInput("digits", e.target.value))} placeholder="e.g. 50000" />
                  <ErrorText msg={errors["owner" + i + "_capital"]} />
                </div>
              )}
            </div>

            {minor && (
              <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                <Note variant="warn" body={<><b>{o.name || `${primaryLabel} ${i + 1}`}</b> is under 18 — a nominee/guardian's details are required for them.</>} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {fields.map((f) => (
                    <div key={"nom_" + f.k} className={f.full ? "sm:col-span-2" : ""}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nominee {f.label}{star}</label>
                      {f.pattern === "mobile" ? (
                        <MobileInput className={inputCls(errors["owner" + i + "_nominee_" + f.k])} value={(o.nominee || {})[f.k]} placeholder={f.ph || ""}
                          onChange={(v) => setOwnerNomineeField(i, f.k, v)} />
                      ) : (
                        <input type={f.type} max={f.type === "date" ? DOB_MAX : undefined} className={inputCls(errors["owner" + i + "_nominee_" + f.k])} value={(o.nominee || {})[f.k] || ""} placeholder={f.ph || ""}
                          onChange={(e) => setOwnerNomineeField(i, f.k, formatInput(f.pattern, e.target.value))} />
                      )}
                      {(f.pattern === "pan" || f.pattern === "aadhaar") && (
                        <KycVerify
                          kind={f.pattern}
                          value={(o.nominee || {})[f.k]}
                          context={() => ({ name: (o.nominee || {}).name, dob: (o.nominee || {}).dob })}
                          result={(o.nominee || {})[f.k + "__kyc"]}
                          setResult={(r) => setOwnerNomineeField(i, f.k + "__kyc", r)}
                          onFill={(d) => fillFromAadhaar({ name: "name", dob: "dob", address: "address" }, d, (k) => (o.nominee || {})[k], (k, v) => setOwnerNomineeField(i, k, v))}
                        />
                      )}
                      <ErrorText msg={errors["owner" + i + "_nominee_" + f.k]} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>

      {!capReached && (
        <button onClick={addOwner} className="w-full mt-3 py-2.5 rounded-lg border border-dashed border-blue-300 text-blue-600 text-sm font-medium hover:bg-blue-50">
          + Add another {primaryLabel.toLowerCase()}
        </button>
      )}
      {cfg.shareholding && n > 0 && (
        <>
          <div className="mt-3"><Note variant="info" body={<>Total shareholding: <b>{shareTotal}%</b> (must total 100%)</>} /></div>
          <ErrorText msg={errors.__shareholding} />
        </>
      )}
      {cfg.capital && n > 0 && (
        <div className="mt-3"><Note variant="info" body={<>Total capital: <b>{rupee(capitalTotal)}</b></>} /></div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Documents
--------------------------------------------------------------------------- */
function DocsBody({ step, A, state, errors, bump }) {
  const groups = docGroups(step, A, state);
  const items = groups.flatMap((g) => g.items);
  const count = items.filter((it) => state.documents[it]).length;
  const [uploading, setUploading] = useState({});
  const [uploadError, setUploadError] = useState({});

  async function attach(it, file) {
    if (!file) return;
    if (file.type.startsWith("video/") || !DOC_ACCEPT_RE.test(file.name)) {
      setUploadError((e) => ({ ...e, [it]: "Videos are not allowed. Upload PDF, JPG, PNG, DOC, DOCX, XLS or XLSX." }));
      return;
    }
    setUploadError((e) => ({ ...e, [it]: "" }));
    setUploading((u) => ({ ...u, [it]: true }));
    try {
      const sizeKb = Math.max(1, Math.round(file.size / 1024));
      const size = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
      const res = await uploadApplicationDocument({
        file,
        leadId: state.leadContact?.leadId,
        companyId: state.companyId,
        docLabel: it,
      });
      state.documents[it] = { name: file.name, size, url: res?.data?.url || null };
      bump();
    } catch (err) {
      console.error("Document upload failed:", err);
      setUploadError((e) => ({ ...e, [it]: "Upload failed. Please try again." }));
    } finally {
      setUploading((u) => ({ ...u, [it]: false }));
    }
  }
  function remove(it) {
    delete state.documents[it];
    bump();
    // Existing clients' uploads are keyed by companyId instead (no Lead).
    if (state.leadContact?.leadId || state.companyId) {
      removeApplicationDocument({ leadId: state.leadContact?.leadId, companyId: state.companyId, docLabel: it }).catch((err) => {
        console.error("Document remove failed (non-fatal):", err);
      });
    }
  }
  return (
    <div>
      <Note variant="info" body={<><b>{count} of {items.length}</b> document{items.length === 1 ? "" : "s"} attached.</>} />
      {groups.map((g, gi) => (
        <div key={g.title || gi} className={gi > 0 ? "mt-5" : "mt-4"}>
          {g.title && (
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">{gi + 1}</span>
              <b className="text-sm text-gray-800">{g.title}</b>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {g.items.map((it) => {
              const d = state.documents[it];
              const isUploading = !!uploading[it];
              const label = g.title ? it.split(" – ")[0] : it;
              return (
                <label key={it} className={`flex items-start gap-3 rounded-xl border-2 border-dashed p-4 transition ${isUploading ? "cursor-wait opacity-70" : "cursor-pointer"} ${d ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-blue-300"}`}>
                  <span className={`flex-none w-9 h-9 rounded-lg border flex items-center justify-center ${d ? "text-green-600 border-green-200 bg-white" : "text-blue-500 border-gray-200 bg-white"}`}>
                    {isUploading ? "…" : d ? "✓" : "⬆"}
                  </span>
                  <span className="flex-1 min-w-0">
                    <b className="block text-sm">{label}</b>
                    {isUploading ? (
                      <span className="block text-xs text-blue-600 mt-0.5">Uploading…</span>
                    ) : d ? (
                      <>
                        <span className="block text-xs text-green-700 font-medium mt-0.5 truncate">{d.name} · {d.size}</span>
                        <button type="button" onClick={(e) => { e.preventDefault(); remove(it); }} className="text-xs text-gray-500 hover:text-red-600 mt-1">↺ Replace / remove</button>
                      </>
                    ) : (
                      <span className="block text-xs text-gray-400 mt-0.5">Click to browse · PDF, JPG, PNG, DOC, XLS up to 5 MB (no videos)</span>
                    )}
                    {uploadError[it] && <span className="block text-xs text-red-600 mt-0.5">⚠ {uploadError[it]}</span>}
                  </span>
                  <input type="file" className="hidden" accept={DOC_ACCEPT} disabled={isUploading} onChange={(e) => { attach(it, e.target.files?.[0]); e.target.value = ""; }} />
                </label>
              );
            })}
          </div>
        </div>
      ))}
      <ErrorText msg={errors.__docs} />
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Help Me Choose (business type recommender) — rendered as a card field
--------------------------------------------------------------------------- */
const HC_QUESTIONS = [
  { k: "hc_owners", label: "How many owners will the business have?", opts: ["Just me", "2 or more"] },
  { k: "hc_liability", label: "Do you want to limit your personal liability?", opts: ["Yes, limit my liability", "No preference"] },
  { k: "hc_investment", label: "Do you plan to raise outside investment / funding?", opts: ["Yes", "No"] },
  { k: "hc_legal", label: "Do you need the business to have a separate legal identity from you?", opts: ["Yes", "No, keep it simple"] },
];
const HC_TAGLINES = {
  "Sole Proprietorship": "Simple & quick to start on your own",
  "One Person Company (OPC)": "Solo ownership with limited liability",
  "Partnership Firm": "Easy setup for business with partners",
  "Limited Liability Partnership (LLP)": "Safer for partnership with protection",
  "Private Limited Company": "Best for growth and raising investment",
};

function HelpChoose({ A, setAnswer, state, bump }) {
  return (
    <>
      <button type="button" onClick={() => { state.helpChooseOpen = true; bump(); }} className="text-sm font-semibold text-blue-600 hover:underline">🧭 Not sure which one to choose? Help Me Choose</button>
      {state.helpChooseOpen && <HelpChooseModal A={A} setAnswer={setAnswer} onClose={() => { state.helpChooseOpen = false; bump(); }} />}
    </>
  );
}

function HelpChooseModal({ A, setAnswer, onClose }) {
  const [phase, setPhase] = useState("quiz"); // quiz → result
  const [step, setStep] = useState(0);

  const q = HC_QUESTIONS[step];
  const isLast = step === HC_QUESTIONS.length - 1;
  const rec = recommendBusinessType(A);

  function pick(o) {
    setAnswer(q.k, o);
    if (!isLast) setTimeout(() => setStep((s) => Math.min(s + 1, HC_QUESTIONS.length - 1)), 250);
  }
  function submit() {
    if (!A[q.k] || !rec) return;
    setPhase("result");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <style>{`
        @keyframes hc-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>

      <div className="relative w-full max-w-md min-h-[330px] bg-[#FDFDFD] rounded-[28px] shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 pt-4 pb-2 border-b border-gray-200">
          <div className="w-32 h-2.5 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full rounded-full bg-[#F2CB2E] transition-all duration-300" style={{ width: phase === "result" ? "100%" : `${((step + 1) / HC_QUESTIONS.length) * 100}%` }} />
          </div>
        </div>

        {phase === "quiz" ? (
          <div key={step} className="flex-1 flex flex-col items-center px-6 pt-8 pb-6" style={{ animation: "hc-in .3s ease-out" }}>
            <h3 className="text-xl text-gray-900 text-center leading-snug max-w-xs">{q.label}</h3>
            <div className="w-full max-w-[300px] mt-6 flex flex-col gap-3">
              {q.opts.map((o, i) => {
                const on = A[q.k] === o;
                return (
                  <button key={o} type="button" onClick={() => pick(o)}
                    className={`flex items-center gap-4 px-4 py-4 rounded-md text-left text-sm font-semibold text-gray-900 transition-colors ${on ? "bg-[#FFF3C4] ring-1 ring-[#F2CB2E]" : i === 0 ? "bg-[#FFFCEE] hover:bg-[#FFF6D6]" : "bg-gray-100 hover:bg-gray-200"}`}>
                    <span className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${on ? "border-gray-900" : "border-gray-500"}`}>
                      {on && <span className="w-2 h-2 rounded-full bg-gray-900" />}
                    </span>
                    {o}
                  </button>
                );
              })}
            </div>
            {isLast && (
              <button type="button" onClick={submit} disabled={!A[q.k]}
                className="mt-5 px-6 py-1.5 rounded-full bg-[#F2CB2E] text-xs font-semibold text-gray-900 disabled:opacity-50">Submit</button>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center" style={{ animation: "hc-in .3s ease-out" }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "radial-gradient(circle, rgba(242,203,46,.25), transparent 70%)" }}>
              <svg viewBox="0 0 24 24" className="w-9 h-9" fill="none" stroke="#F2CB2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </div>
            <div className="mt-1 text-3xl text-[#F2CB2E]">{rec}</div>
            <div className="mt-3 text-lg text-gray-900">Great !</div>
            <div className="mt-1 text-lg text-gray-900 max-w-[260px] leading-relaxed">{HC_TAGLINES[rec]}</div>
            <p className="mt-2 text-xs text-gray-500 max-w-[280px]">Our advisor will verify the appropriate structure before filing.</p>
            <button type="button" onClick={() => { setAnswer("businessType", rec); onClose(); }} className="mt-4 px-6 py-1.5 rounded-full bg-[#F2CB2E] text-xs font-semibold text-gray-900">✓ Use This Structure</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestNames({ A, setAnswer, state, bump }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <b className="text-sm">No name yet? That's fine.</b>
      <p className="text-sm mt-1">Tell us a couple of words about your business (optional) and we'll suggest some names, or continue and decide later.</p>
      <input className="w-full mt-2 rounded-lg border border-gray-200 px-3 py-2 text-sm" value={A.ns_hint || ""} onChange={(e) => setAnswer("ns_hint", e.target.value)} placeholder="e.g. organic food products" />
      <button type="button" onClick={() => { state.suggestedNames = suggestedBusinessNames(A); bump(); }} className="mt-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-semibold">✨ Suggest Business Names</button>
      {state.suggestedNames && (
        <div className="flex flex-col gap-2 mt-3">
          {state.suggestedNames.map((n) => (
            <button key={n} type="button" onClick={() => { setAnswer("hasName", "Yes"); setAnswer("name1", n); }}
              className="flex justify-between items-center px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm">
              <span>{n}</span><span className="text-blue-600 text-xs">Use this name</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Name Availability Check step
--------------------------------------------------------------------------- */
// Continue on Business Name with 2–3 proposed names: "Which name are you going
// with?" — each name shows its availability if it's been checked.
const NAME_STATUS_LABEL = {
  available: ["Available", "text-emerald-700"],
  similar: ["Similar names found", "text-amber-700"],
  not_suitable: ["May not be available", "text-red-700"],
  unverified: ["To be verified by our team", "text-blue-700"],
};
function ConfirmNameModal({ A, state, onClose, onConfirm }) {
  const names = proposedNames(A);
  const [picked, setPicked] = useState(ncTarget(A));
  const statusOf = (n) => {
    const r = state.nameChecks[n.toLowerCase()];
    return r?.source === "live" ? NAME_STATUS_LABEL[r.status] : null;
  };
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="confirm-name-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p id="confirm-name-title" className="text-lg font-semibold text-gray-900">Which name are you going with?</p>
        <p className="text-sm text-gray-500 mt-1 mb-4">We'll register your company under the name you confirm. Our team keeps your other choices as back-ups.</p>
        <div className="flex flex-col gap-2">
          {names.map((n, i) => {
            const status = statusOf(n);
            return (
              <label key={n} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${picked === n ? "border-[#F5C518] bg-yellow-50" : "border-gray-200"}`}>
                <input type="radio" name="confirm-name" className="mt-1 accent-[#E8A317]" checked={picked === n} onChange={() => setPicked(n)} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900 break-words">{n}</span>
                  <span className="block text-xs text-gray-500">
                    Preference {i + 1} ·{" "}
                    {status ? <span className={status[1]}>{status[0]}</span> : "Not checked yet — we'll check it now"}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={() => picked && onConfirm(picked)} disabled={!picked}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[#F5C518] hover:bg-[#EAB90C] text-sm font-semibold text-gray-900 disabled:opacity-60">
            Confirm name
          </button>
        </div>
      </div>
    </div>
  );
}

// The registry matches behind a name-check verdict: companies from the MCA
// register and live trademarks, exact matches first.
function NameCheckMatches({ companies = [], trademarks = [] }) {
  if (!companies.length && !trademarks.length) return null;
  const Tag = ({ match }) => (
    <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${match === "exact" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
      {match === "exact" ? "Same name" : "Similar"}
    </span>
  );
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {companies.length > 0 && (
        <div className="rounded-lg border border-gray-200 p-3">
          <p className="text-xs font-semibold text-gray-700 mb-2">Registered companies (MCA)</p>
          <ul className="space-y-2">
            {companies.map((c) => (
              <li key={c.cin || c.name} className="text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-gray-900">{c.name}</span>
                  <Tag match={c.match} />
                </div>
                <div className="text-gray-500">
                  {[c.status, c.cin, c.incorporatedAt && `since ${c.incorporatedAt.slice(0, 4)}`, c.state].filter(Boolean).join(" · ")}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {trademarks.length > 0 && (
        <div className="rounded-lg border border-gray-200 p-3">
          <p className="text-xs font-semibold text-gray-700 mb-2">Trademarks</p>
          <ul className="space-y-2">
            {trademarks.map((t, i) => (
              <li key={`${t.applicationNumber}-${t.classNumber}-${i}`} className="text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-gray-900">{t.wordMark || "(Device mark)"}</span>
                  <Tag match={t.match} />
                </div>
                <div className="text-gray-500">
                  {[t.status, t.classNumber != null && `Class ${t.classNumber}`, t.proprietorName].filter(Boolean).join(" · ")}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Shown on the Business Name step under the proposed names: checks the picked
// name (Name 1 by default) against the MCA register and trademarks.
function NameCheckBody({ A, state, errors, setAnswer, bump }) {
  const names = proposedNames(A);
  const target = ncTarget(A);
  const result = nameCheckIsCurrent(A, state);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reportFor, setReportFor] = useState(null); // { name, result } rendered off-screen for the PDF
  const reportRef = useRef(null);
  // The PDF is only offered to a signed-up applicant (a saved result can
  // outlive the session it was checked in).
  const signedIn = !!localStorage.getItem("token") && state.otpVerified;

  async function downloadReport() {
    if (!result || downloading) return;
    setDownloading(true);
    setReportFor({ name: target, result });
    try {
      // Let the off-screen report render and its logo load before the snapshot.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const imgs = Array.from(reportRef.current?.querySelectorAll("img") || []);
      await Promise.all(imgs.map((img) => (img.complete ? null : new Promise((res) => { img.onload = img.onerror = res; setTimeout(res, 4000); }))));
      const safe = target.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "name";
      await saveElementAsPdf(reportRef.current, `Business-Name-Report-${safe}`);
    } catch {
      window.alert("Could not generate the report. Please try again.");
    } finally {
      setReportFor(null);
      setDownloading(false);
    }
  }

  // A name confirmed in the "Which name are you going with?" popup that hasn't
  // been checked yet is checked straight away (FlowRunner sets autoNameCheck).
  useEffect(() => {
    if (!state.autoNameCheck || checking) return;
    const n = state.autoNameCheck;
    state.autoNameCheck = null;
    runCheck(n);
  });

  function runCheck(nameArg) {
    const name = (typeof nameArg === "string" ? nameArg : ncTarget(A)).trim();
    if (!name || checking) return;
    // Sign-in gate: the check only runs — and its result only shows — once the
    // applicant has signed up / signed in with OTP (the server also refuses it
    // without a customer session).
    requireVerifiedCustomer(state, bump, async () => {
      const key = name.toLowerCase();
      setChecking(true);
      try {
        const res = await checkBusinessName(name);
        if (res?.signInRequired) {
          // Session gone (e.g. token expired): verify again, then re-run.
          state.otpVerified = false;
          state.leadGate = { run: () => runCheck(name) };
          return;
        }
        state.nameChecks[key] = {
          ...res,
          alternatives: res.status === "available" ? undefined : suggestAlternatives(name),
          source: "live",
          checkedAt: today(),
        };
      } catch {
        // Registry unreachable: don't block the application — the team checks
        // the name with the Registrar before filing anyway.
        state.nameChecks[key] = {
          status: "unverified",
          note: "We couldn't reach the company and trademark registers just now. You can continue — our team will check this name before filing.",
          companies: [],
          trademarks: [],
          source: "live",
          checkedAt: today(),
        };
      } finally {
        setChecking(false);
        bump();
      }
    });
  }
  return (
    <div className="mt-5">
      {names.length > 1 && (
        <>
          <p className="text-xs text-gray-500 mb-1.5">Name to check:</p>
          <div className="flex gap-2 flex-wrap mb-1">
            {names.map((n) => (
              <button key={n} type="button" onClick={() => setAnswer("nc_target", n)} className={`px-3 py-1.5 rounded-lg border text-sm ${target === n ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>{n}</button>
            ))}
          </div>
        </>
      )}
      <button type="button" onClick={() => runCheck()} disabled={checking || !target} className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">{checking ? "Checking MCA & trademark registers…" : result ? "Check Again" : "Check Availability"}</button>
      <ErrorText msg={errors.__namecheck} />
      {result && (
        <div className="mt-4">
          {result.status === "available" && <Note variant="ok" title="Name appears available" body={result.note + " This is subject to final approval by the Registrar / competent authority."} />}
          {result.status === "similar" && <Note variant="warn" title="Similar name found" body={result.note} />}
          {result.status === "not_suitable" && <Note variant="err" title="Name may not be available / suitable" body={result.note} />}
          {result.status === "unverified" && <Note variant="info" title="Couldn't check right now" body={result.note} />}
          <NameCheckMatches companies={result.companies} trademarks={result.trademarks} />
          {signedIn && result.status !== "unverified" && (
            <button type="button" onClick={downloadReport} disabled={downloading}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-800 hover:border-gray-500 disabled:opacity-60">
              {downloading ? "Preparing PDF…" : "Download report (PDF)"}
            </button>
          )}
          {result.alternatives && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Suggested alternatives — click one to use it as Name 1 and check it:</p>
              <div className="flex gap-2 flex-wrap">
                {result.alternatives.map((a) => (
                  <button key={a} type="button" disabled={checking}
                    onClick={() => { setAnswer("name1", a); setAnswer("nc_target", a); runCheck(a); }}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-60">{a}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {reportFor && (
        <div aria-hidden="true" style={{ position: "fixed", left: -10000, top: 0, width: 1100 }}>
          <NameCheckReport ref={reportRef} name={reportFor.name} result={reportFor.result} />
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   AI Business Objective & NIC Code step
--------------------------------------------------------------------------- */
function ObjectiveBody({ A, errors, setAnswer }) {
  if (!A.activityDesc) return <Note variant="warn" body="Go back and describe your business activity first — we'll turn it into a professional objective here." />;
  if (!A.br_objective) A.br_objective = generateBusinessObjective(A);
  const list = suggestedNicCodes(A);
  if (!A.br_nicCode && list.length) A.br_nicCode = list[0].code;
  return (
    <div>
      <div className="font-semibold text-sm text-gray-800">AI-generated business objective</div>
      <p className="text-xs text-gray-500 mb-2">Based on what you told us in the previous step. Edit freely, or regenerate from scratch.</p>
      <textarea rows={4} className={inputCls()} value={A.br_objective} onChange={(e) => setAnswer("br_objective", e.target.value)} />
      <div className="flex gap-2 flex-wrap mt-2">
        <button type="button" onClick={() => setAnswer("br_objective", generateBusinessObjective(A))} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold">Rephrase Again</button>
      </div>
      <ErrorText msg={errors.br_objective} />
      <div className="font-semibold text-sm text-gray-800 mt-5">Suggested NIC Code</div>
      <p className="text-xs text-gray-500 mb-2">Pick the code that best matches your business activity — our team verifies this before filing.</p>
      <div className="flex flex-col gap-2">
        {list.map((c) => (
          <OptionButton key={c.code} selected={A.br_nicCode === c.code} onClick={() => setAnswer("br_nicCode", c.code)}>
            NIC {c.code}<span className="block font-normal text-xs text-gray-500 mt-0.5">{c.desc}</span>
          </OptionButton>
        ))}
      </div>
      <ErrorText msg={errors.br_nicCode} />
      <div className="mt-3"><Note variant="info" body="Our team will verify the business objective and NIC code before filing." /></div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Trademark: AI class finder, confirm, search, results, risk
--------------------------------------------------------------------------- */
function AiClassFinderBody({ A, setAnswer, state, bump }) {
  const isTrading = A.tm_nature === "Trading";
  const matches = tmClassMatches(A);
  const filteredEmpty = !isTrading && !((A.tm_products || "") + (A.tm_aiQuery || "")).trim();
  if (matches.length && !A.tm_class) A.tm_class = `Class ${matches[0].no} — ${matches[0].short}`;
  const goods = NICE_CLASSES.filter((c) => c.no <= 34);
  const services = NICE_CLASSES.filter((c) => c.no >= 35);
  const ClassChip = (c) => {
    const label = `Class ${c.no} — ${c.short}`;
    const sel = A.tm_class === label;
    return (
      <button key={c.no} type="button" title={c.desc} onClick={() => setAnswer("tm_class", label)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${sel ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200"}`}>
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${sel ? "bg-blue-500 text-white" : "bg-gray-100"}`}>{c.no}</span>
        {c.short}
      </button>
    );
  };
  return (
    <div>
      {!isTrading && (
        <textarea rows={3} className={inputCls()} value={A.tm_aiQuery || ""} onChange={(e) => setAnswer("tm_aiQuery", e.target.value)}
          placeholder="e.g. We manufacture and export organic cotton bedsheets and pillow covers" />
      )}
      <div className="mt-3">
        {filteredEmpty ? (
          <p className="text-xs text-gray-500">Start typing above — matching trademark classes will appear here automatically.</p>
        ) : matches.length === 0 ? (
          <Note variant="warn" body="We couldn't confidently match a class from that description. Add more detail, or browse and pick a class manually below — our attorney will confirm the right class before filing." />
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-2">Top matches for your description — click one to set it as your trademark class.</p>
            <div className="flex flex-col gap-2">
              {matches.map((m, i) => {
                const label = `Class ${m.no} — ${m.short}`;
                const sel = A.tm_class === label;
                return (
                  <OptionButton key={m.no} selected={sel} onClick={() => setAnswer("tm_class", label)}>
                    {label}
                    <span className="block font-normal text-xs text-gray-500 mt-0.5">{m.desc}</span>
                    <span className="inline-flex gap-1.5 mt-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{m.no <= 34 ? "Goods (1–34)" : "Service (35–45)"}</span>
                      {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Best match</span>}
                    </span>
                  </OptionButton>
                );
              })}
            </div>
          </>
        )}
      </div>
      <div className="mt-4">
        <button type="button" onClick={() => { state.classBrowseOpen = !state.classBrowseOpen; bump(); }} className="text-sm font-semibold text-gray-600 hover:underline">
          ☰ {state.classBrowseOpen ? "Hide full class list" : "Or browse the class list manually"}
        </button>
        {state.classBrowseOpen && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 font-semibold mb-1.5">Goods — Classes 1–34</p>
            <div className="flex flex-wrap gap-2">{goods.map(ClassChip)}</div>
            <p className="text-xs text-gray-500 font-semibold mt-4 mb-1.5">Services — Classes 35–45</p>
            <div className="flex flex-wrap gap-2">{services.map(ClassChip)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
function TmClassConfirmBody({ A, onChangeClass }) {
  const cls = selectedNiceClass(A);
  if (!A.tm_class) return <Note variant="warn" body={<>No class selected yet. <button onClick={onChangeClass} className="underline font-semibold">Go back and pick a class</button></>} />;
  return (
    <div>
      <p className="font-semibold text-sm text-gray-800 mb-2">Your selected trademark class:</p>
      <div className="inline-block p-3 border-2 border-blue-500 rounded-lg">
        <b className="text-blue-700">{A.tm_class}</b>
        {cls && <p className="text-xs text-gray-500 mt-1 max-w-md">{cls.desc}</p>}
      </div>
      <p className="text-xs text-gray-500 mt-2">This is the class you picked using the AI Trademark Class Finder. Our trademark attorney validates the final class before filing.</p>
      <button onClick={onChangeClass} className="mt-2 text-sm text-blue-600 hover:underline">← Change class</button>
    </div>
  );
}
// Running the search is where the applicant signs up (OTP) and their Customer +
// Company get created — so the owner fields on this step (what the Company is
// named/typed from) must be filled in first. Continue from this step then
// converts the Lead to a Deal (flow.convertAtStep, see goNext()).
function TmSearchBody({ flow, step, A, state, errors, setAnswer, bump, liveStateNames }) {
  const isCurrent = tmSearchIsCurrent(A, state);
  const [saving, setSaving] = useState(false);
  function run() {
    const name = (A.tm_name || "").trim();
    if (!name || saving) return;
    const fieldErrors = validateFields(step, A, {});
    Object.keys(errors).forEach((k) => delete errors[k]);
    if (Object.keys(fieldErrors).length) {
      Object.assign(errors, fieldErrors);
      bump();
      return;
    }
    requireVerifiedCustomer(state, bump, () => {
      setSaving(true);
      syncCustomerCompany(state, A, bump, flow)
        .catch(() => {})
        .then(() => runTrademarkSearch(name, A.tm_class).then(
          (results) => ({ results, failed: false }),
          // Don't block the application on a registry outage — the attorney
          // runs the search before filing anyway (see TmResultsBody).
          () => ({ results: [], failed: true })
        ))
        .then(({ results, failed }) => {
          state.tmSearch = { for: name.toLowerCase(), results, failed, at: today() };
          A.tm_searchDone = "Yes";
        })
        .finally(() => {
          setSaving(false);
          bump();
        });
    });
  }
  return (
    <div>
      <FieldsBody step={step} A={A} errors={errors} setAnswer={setAnswer} state={state} bump={bump} liveStateNames={liveStateNames} />
      <p className="text-sm text-gray-700 mt-5 mb-3">We'll check the public register for identical or similar marks to <b>{A.tm_name || "your trademark"}</b> in {A.tm_class || "the selected class"}.</p>
      <button type="button" onClick={run} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">🔍 {saving ? "Searching the register…" : isCurrent ? "Run search again" : "Run Public Trademark Search"}</button>
      {isCurrent && (
        <div className="mt-4 space-y-3">
          <div className="font-semibold text-sm text-gray-800">Search Results</div>
          <TmResultsBody A={A} state={state} />
          <TmRiskNote A={A} state={state} />
        </div>
      )}
      <ErrorText msg={errors.__search} />
    </div>
  );
}
function TmResultsBody({ A, state }) {
  const isCurrent = tmSearchIsCurrent(A, state);
  if (!isCurrent) return <Note variant="warn" body="Please run the public trademark search in the previous step to see results here." />;
  if (state.tmSearch?.failed) return <Note variant="warn" body="We couldn't reach the trademark register just now. You can try again, or continue — our trademark attorney will run a full search before filing." />;
  const r = state.tmSearch?.results || [];
  if (!r.length) return <Note variant="ok" body={`No identical or closely similar trademarks found in the public register for "${A.tm_name || ""}" in ${A.tm_class || "the selected class"}.`} />;
  return (
    <div>
      <Note variant="warn" body={`${r.length} potentially similar trademark(s) found in the public register. Review them before proceeding.`} />
      <div className="overflow-x-auto mt-3 border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr><th className="text-left px-3 py-2">Trademark</th><th className="text-left px-3 py-2">Class</th><th className="text-left px-3 py-2">Status</th><th className="text-left px-3 py-2">Similarity</th><th className="text-left px-3 py-2">Owner</th></tr>
          </thead>
          <tbody>
            {r.map((x, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-3 py-2">{x.mark}</td><td className="px-3 py-2">{x.class}</td><td className="px-3 py-2">{x.status}</td><td className="px-3 py-2">{x.similarity}</td><td className="px-3 py-2">{x.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// TmRisk rendered inline as a "note"-like field via Field() switch — handled below in FieldsBody via special type
function TmRiskNote({ A, state }) {
  const isCurrent = tmSearchIsCurrent(A, state);
  if (!isCurrent) return <Note variant="warn" body="Please run the public trademark search first to see the assessment." />;
  if (state.tmSearch?.failed) return null;
  const risk = tmRiskLevel(state.tmSearch?.results || []);
  return <Note variant={risk.variant === "ok" ? "ok" : "warn"} title={`Risk level: ${risk.level}`} body={risk.note} />;
}

/* ---------------------------------------------------------------------------
   Trademark Details — one card per mark, each filed as its own application
   (see tmMarks in existingCompanyData.js for why).
--------------------------------------------------------------------------- */
function Pills({ value, opts, onChange, bad }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-lg border text-sm ${value === o ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold" : bad ? "border-red-400 bg-red-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

const TM_TEXT_LABEL = { "Word mark": "Words to register", Logo: "Words in the logo (if any)", Tagline: "Tagline" };

function TmMarksBody({ flow, A, state, errors, setAnswer, bump }) {
  // First visit: start from the name already searched, as the one word mark.
  if (!Array.isArray(A.tm_marks) || !A.tm_marks.length) A.tm_marks = tmMarks(A);
  const marks = A.tm_marks;
  if (!state.tmMarkSearch) state.tmMarkSearch = {};
  const searched = (A.tm_name || "").trim().toLowerCase();
  const perApp = (flow.serviceLines?.(A) || [])[0];
  // Professional fee from the price master for the applicant's state (see
  // ensureMasterPrices); the flow's figure only when there's no price row.
  const perAppFee = perApp ? pricedLine(flow.serviceId, state, perApp.professionalFee, 0)[0] : 0;
  const govt = tmGovtFee(A);
  useEffect(() => {
    ensureMasterPrices(flow, A, state).then(bump).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function clearMarkErrors(i) {
    Object.keys(errors).forEach((k) => { if (i == null ? k.startsWith("mark") : k.startsWith(`mark${i}_`)) delete errors[k]; });
  }
  function setField(i, k, v) {
    clearMarkErrors(i);
    setAnswer("tm_marks", marks.map((m, j) => (j === i ? { ...m, [k]: v } : m)));
  }
  function add(type) {
    delete errors.__marks;
    setAnswer("tm_marks", [...marks, newTmMark(type)]);
  }
  function remove(i) {
    clearMarkErrors(); // indices shift
    setAnswer("tm_marks", marks.filter((_, j) => j !== i));
  }
  const [searching, setSearching] = useState({}); // key -> true while in flight
  const [searchFailed, setSearchFailed] = useState({}); // key -> true if the register was unreachable
  function search(text) {
    const key = text.trim().toLowerCase();
    if (searching[key]) return;
    setSearching((s) => ({ ...s, [key]: true }));
    setSearchFailed((s) => ({ ...s, [key]: false }));
    runTrademarkSearch(text.trim(), A.tm_class)
      .then((results) => { state.tmMarkSearch[key] = results; })
      .catch(() => setSearchFailed((s) => ({ ...s, [key]: true })))
      .finally(() => {
        setSearching((s) => ({ ...s, [key]: false }));
        bump();
      });
  }
  const err = (i, k) => errors[`mark${i}_${k}`];

  return (
    <div>
      <Note variant="info" title="One application per mark"
        body="The Trademark Registry protects exactly what is filed, so each word mark, each logo and each tagline is a separate application. If your brand, company and product names are the same words, that's still just one word mark." />
      <ErrorText msg={errors.__marks} />

      <div className="space-y-4 mt-4">
        {marks.map((m, i) => {
          const key = (m.text || "").trim().toLowerCase();
          const results = key && key !== searched ? state.tmMarkSearch[key] : null;
          const risk = results && tmRiskLevel(results);
          return (
            <div key={i} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
              <div className="flex items-center justify-between mb-3">
                <b className="flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  Application {i + 1} — {tmMarkLabel(m, i)}
                </b>
                {marks.length > 1 && <button type="button" onClick={() => remove(i)} className="text-xs text-red-500 hover:underline">Remove</button>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type of mark<span className="text-red-500">*</span></label>
                  <Pills value={m.type} opts={TM_MARK_TYPES} onChange={(v) => setField(i, "type", v)} bad={err(i, "type")} />
                  <ErrorText msg={err(i, "type")} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {TM_TEXT_LABEL[m.type] || "Mark"}
                    {m.type === "Logo" ? <span className="text-gray-400 font-normal"> (optional)</span> : <span className="text-red-500">*</span>}
                  </label>
                  <input className={inputCls(err(i, "text"))} value={m.text} onChange={(e) => setField(i, "text", e.target.value)}
                    placeholder={m.type === "Tagline" ? "e.g. Start. Run. Grow." : m.type === "Logo" ? "e.g. BIZPOLE (leave blank for a symbol-only logo)" : "e.g. Bizpole"} />
                  <ErrorText msg={err(i, "text")} />
                  {m.type === "Logo" ? (
                    <p className="text-xs text-gray-500 mt-1">Upload this logo in the Documents step. Logos can't be searched by text — our attorney checks for similar logos before filing.</p>
                  ) : key && key === searched ? (
                    <p className="text-xs text-green-700 mt-1">✓ Searched in the Public Trademark Search step.</p>
                  ) : key ? (
                    <div className="mt-2">
                      <button type="button" onClick={() => search(m.text)} disabled={searching[key]} className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-60">🔍 {searching[key] ? "Searching…" : results ? "Search again" : "Run public search for this mark"}</button>
                      {searchFailed[key] && <p className="text-xs text-amber-700 mt-1">Couldn't reach the trademark register — try again, or our attorney will check this mark before filing.</p>}
                      {risk &&<div className="mt-2"><Note variant={risk.variant === "ok" ? "ok" : "warn"} title={`${results.length} similar mark(s) — risk: ${risk.level}`} body={risk.note} /></div>}
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Language / script<span className="text-red-500">*</span></label>
                  <select className={inputCls(err(i, "language"))} value={m.language} onChange={(e) => setField(i, "language", e.target.value)}>
                    <option value="">Select…</option>
                    {TM_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <ErrorText msg={err(i, "language")} />
                </div>
                <div />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Already being used?<span className="text-red-500">*</span></label>
                  <Pills value={m.inUse} opts={["Yes", "No"]} onChange={(v) => setField(i, "inUse", v)} bad={err(i, "inUse")} />
                  <ErrorText msg={err(i, "inUse")} />
                </div>
                {m.inUse === "Yes" ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">In use since<span className="text-red-500">*</span></label>
                    <input type="date" className={inputCls(err(i, "useSince"))} value={m.useSince} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setField(i, "useSince", e.target.value)} />
                    <ErrorText msg={err(i, "useSince")} />
                  </div>
                ) : <div />}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Filed for this mark before?<span className="text-red-500">*</span></label>
                  <Pills value={m.applied} opts={["Yes", "No"]} onChange={(v) => setField(i, "applied", v)} bad={err(i, "applied")} />
                  <ErrorText msg={err(i, "applied")} />
                </div>
                {m.applied === "Yes" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Previous application number<span className="text-red-500">*</span></label>
                    <input className={inputCls(err(i, "appNo"))} value={m.appNo} onChange={(e) => setField(i, "appNo", e.target.value)} />
                    <ErrorText msg={err(i, "appNo")} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {TM_MARK_TYPES.map((t) => (
          <button key={t} type="button" onClick={() => add(t)} className="px-3 py-2 rounded-lg border border-dashed border-blue-300 text-sm font-semibold text-blue-600 hover:bg-blue-50">
            + Add {t.toLowerCase()}
          </button>
        ))}
      </div>

      {perApp && (
        <div className="mt-4">
          <Note variant="info" title={`You're filing ${marks.length} application${marks.length === 1 ? "" : "s"}`}
            body={`Each application: ${rupee(perAppFee)} professional fee + ${rupee(govt)} government fee (+ GST on the professional fee).${govt > 4500 ? " The ₹9,000 government fee applies to a company/LLP/partnership without MSME (Udyam) or Startup India registration." : ""}`} />
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Review / Payment / Success
--------------------------------------------------------------------------- */
function reviewRows(flowId, A, state) {
  const steps = contentSteps(flowId, A);
  const groups = [];
  steps.forEach((s, i) => {
    if (s.id === "recommend" || s.id === "search") return;
    const rows = [];
    if (s.type === "owners") {
      const cfg = ownerConfig(A);
      state.owners.forEach((o, oi) => {
        const extra = [];
        if (cfg.shareholding && o.shareholding) extra.push(o.shareholding + "% shareholding");
        if (cfg.capital && o.capital) extra.push("₹" + o.capital + " capital");
        if (cfg.hasDIN && o.dinKnown === "Yes" && o.din) extra.push("DIN " + o.din);
        rows.push([s.title + " " + (oi + 1), [o.name, o.role, o.pan, o.email, o.mobile, ...extra].filter(Boolean).join(" · ") || "—"]);
        if (isMinor(o.dob) && o.nominee) {
          const nom = o.nominee;
          rows.push(["Nominee for " + (o.name || "owner " + (oi + 1)), [nom.name, nom.pan, nom.email, nom.mobile].filter(Boolean).join(" · ") || "—"]);
        }
      });
      if (!rows.length) rows.push([s.title, "None added"]);
    } else if (s.type === "objective") {
      rows.push(["Business objective", A.br_objective || "—"]);
      rows.push(["NIC Code", A.br_nicCode || "Not selected"]);
    } else if (s.type === "docs") {
      const items = docItems(s, A, state);
      items.forEach((it) => { if (state.documents[it]) rows.push([it, state.documents[it].name]); });
      if (!rows.length) rows.push(["Documents", "No documents attached"]);
    } else if (s.type === "tmMarks") {
      tmMarks(A).forEach((m, mi) => {
        const use = m.inUse === "Yes" ? `in use since ${m.useSince || "—"}` : "not yet in use";
        const filed = m.applied === "Yes" ? `filed before (${m.appNo || "—"})` : null;
        rows.push([`Application ${mi + 1}`, [tmMarkLabel(m, mi), m.language, use, filed].filter(Boolean).join(" · ")]);
      });
    } else if (s.id === "class") {
      rows.push(["Trademark class", A.tm_class || "Not selected yet"]);
    } else if (s.id === "results") {
      if (!tmSearchIsCurrent(A, state)) rows.push(["Public trademark search", "Not run yet"]);
      else if (state.tmSearch?.failed) rows.push(["Public trademark search", "Register unavailable — attorney will search before filing"]);
      else {
        const r = state.tmSearch?.results || [];
        rows.push(["Public trademark search", r.length ? `${r.length} potentially similar trademark(s) found` : "No identical or closely similar trademarks found"]);
      }
    } else {
      visibleFields(s, A).forEach((f) => {
        if (f.type === "note" || !f.k) return;
        let v = A[f.k];
        if (Array.isArray(v)) v = v.join(", ");
        if (v == null || String(v).trim() === "") return;
        if (A[f.k] === "Other" && A[f.k + "__other"]) v = "Other — " + A[f.k + "__other"];
        rows.push([f.label || f.q, v]);
      });
      // Business Name: the name-availability result checked on that step.
      if (s.id === "name" && A.hasName === "Yes") {
        const r = nameCheckIsCurrent(A, state);
        const statusLabel = r ? { available: "Available", similar: "Similar name found", not_suitable: "May not be suitable", unverified: "To be verified by our team" }[r.status] : "Not checked yet";
        rows.push(["Name checked", ncTarget(A) || "—"]);
        rows.push(["Availability status", statusLabel]);
      }
      if (!rows.length) rows.push(["—", "Nothing entered"]);
    }
    groups.push({ title: s.title, index: i, rows });
  });
  return groups;
}
function ReviewBody({ flowId, A, state, errors, onConfirm, onJump }) {
  const g = reviewRows(flowId, A, state);
  const applicant = [
    ["Name", A.auth_name || A.msme_applicant || A.tm_ownerName || (state.owners[0] && state.owners[0].name) || A.ex_contact || "—"],
    ["Email", A.auth_email || A.msme_email || A.tm_ownerEmail || A.br_contactEmail || (state.owners[0] && state.owners[0].email) || "—"],
    ["Phone", A.auth_mobile || A.msme_mobile || A.tm_ownerMobile || A.br_contactMobile || A.ex_mobile || (state.owners[0] && state.owners[0].mobile) || "—"],
  ];
  const addons = Array.isArray(A.additionalServices) ? A.additionalServices : [];
  const flow = FLOWS[flowId];
  const Section = ({ title, rows, editIndex }) => (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <b className="text-sm">{title}</b>
        {editIndex != null && <button onClick={() => onJump(editIndex)} className="text-xs text-blue-600 hover:underline">✎ Edit</button>}
      </div>
      <dl className="px-4 py-1">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[minmax(120px,38%)_1fr] gap-3 py-2 border-b border-dashed border-gray-100 last:border-0 text-sm">
            <dt className="text-gray-500">{r[0]}</dt><dd className="font-medium break-words">{r[1]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
  return (
    <div>
      <h3 className="text-base font-semibold mb-3">Application Summary</h3>
      <Section title="Service Information" rows={[["Service Name", state.serviceType], ["Application Type", flow.kind || "Existing Company"], ["Prepared On", today()]]} />
      <Section title="Applicant Information" rows={applicant} />
      {g.map((x) => <Section key={x.index} title={x.title} rows={x.rows} editIndex={x.index} />)}
      <Section title="Additional Services" rows={addons.length ? addons.map((a) => [a, rupee(pricedLine(ADDON_SERVICE_ID[a] || null, state, ADDON_PRICE[a] || 999, 0)[0])]) : [["Selected Services", "None selected"]]} />
      <label className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4 cursor-pointer">
        <input type="checkbox" className="mt-0.5 w-4 h-4 accent-blue-600" checked={state.confirmed} onChange={(e) => onConfirm(e.target.checked)} />
        <span className="text-sm font-medium">I confirm that the information provided is correct and that I am authorised to submit this application.</span>
      </label>
      <ErrorText msg={errors.__confirm} />
    </div>
  );
}

// State-wise prices from the price master (ServicePriceCurrencyMaster, the same
// source the Services pages and staff quotes use), keyed "serviceId:stateId".
// flow.price / flow.govt and ADDON_PRICE are only a fallback for a service
// with no price row for the applicant's state. Session-only cache, so a resumed
// application always re-reads current prices.
const masterPriceCache = new Map();
let stateIdsByName = null; // lower-cased state_name -> StateID, loaded once
async function loadStateIds() {
  if (stateIdsByName) return stateIdsByName;
  const rows = await getAllStates();
  const map = new Map();
  (Array.isArray(rows) ? rows : []).forEach((r) => {
    const name = String(r.state_name || "").trim().toLowerCase();
    const id = r.id ?? r.StateID;
    if (name && id != null) map.set(name, id);
  });
  if (map.size) stateIdsByName = map;
  return map;
}
const applicantStateId = (state) => {
  const name = String(state?.leadContact?.state || "").trim().toLowerCase();
  return name && stateIdsByName ? stateIdsByName.get(name) ?? null : null;
};
// { professionalFee, governmentFee } for this service in the applicant's state,
// or null when the master has no price (caller falls back).
function masterPriceFor(serviceId, state) {
  const stateId = applicantStateId(state);
  if (!serviceId || stateId == null) return null;
  return masterPriceCache.get(`${serviceId}:${stateId}`) || null;
}
// Load master prices for the main service and every add-on with a ServiceID.
async function ensureMasterPrices(flow, A, state) {
  await loadStateIds();
  const stateId = applicantStateId(state);
  if (stateId == null) return;
  const mainId = typeof flow.serviceIdFor === "function" ? flow.serviceIdFor(A) : flow.serviceId || null;
  const addons = Array.isArray(A?.additionalServices) ? A.additionalServices : [];
  const ids = [...new Set([mainId, ...addons.map((a) => ADDON_SERVICE_ID[a])].filter(Boolean))];
  await Promise.all(ids.map(async (sid) => {
    const key = `${sid}:${stateId}`;
    if (masterPriceCache.has(key)) return;
    const res = await getServicePrice({ ServiceId: sid, StateId: stateId }).catch(() => null);
    const row = res?.success ? res.data : null;
    if (!row) return;
    // Vendor / contract fees are folded into the professional fee (they're
    // GST-able too). The bulk API already zeroes GovernmentFee when the client
    // pays it directly and reports it as ClientPaidGovtFee — add it back: the
    // quote line carries the full govt. fee and the server strips it itself.
    masterPriceCache.set(key, {
      professionalFee: (Number(row.ProfessionalFee) || 0) + (Number(row.VendorFee) || 0) + (Number(row.ContractFee) || 0),
      governmentFee: (Number(row.GovernmentFee) || 0) + (Number(row.ClientPaidGovtFee) || 0),
    });
  }));
}
// Price used for a line: master price when known, else the flow's fallback.
const pricedLine = (serviceId, state, fallbackProfessional, fallbackGovt) => {
  const m = masterPriceFor(serviceId, state);
  return m ? [m.professionalFee, m.governmentFee] : [fallbackProfessional, fallbackGovt];
};

// Fee breakdown, with GST worked out the same way as every other quote in the
// app (utils/gstCalc.js): per line, 18% of professional (+ vendor) fee — never
// on government fees — only when the franchisee is GST-registered and not on
// the Composition scheme, split CGST+SGST for a same-state customer, else IGST.
// state.gstInfo comes from ensureGstInfo(); until it's loaded (Payment step
// display only) GST is shown as applicable — quote creation always awaits it.
function feeLines(flow, A, state) {
  const gstEligible = state?.gstInfo ? state.gstInfo.gstEligible : true;
  const sellerState = state?.gstInfo?.state || "";
  const buyerState = state?.leadContact?.state || "";
  const line = (name, serviceId, professionalFee, governmentFee) => {
    const gstAmount = calcGstAmount(professionalFee, 0, gstEligible);
    const { cgst, sgst, igst } = splitGst(gstAmount, sellerState, buyerState);
    return { name, serviceId, professionalFee, governmentFee, gstAmount, cgst, sgst, igst, total: professionalFee + governmentFee + gstAmount };
  };
  const serviceId = typeof flow.serviceIdFor === "function" ? flow.serviceIdFor(A) : flow.serviceId || null;
  const addons = Array.isArray(A.additionalServices) ? A.additionalServices : [];
  const [mainProfessional, mainGovt] = pricedLine(serviceId, state, flow.price, flow.govt);
  const lines = [
    line(state?.serviceType || flow.name, serviceId, mainProfessional, mainGovt),
    ...addons.map((a) => {
      const addonId = ADDON_SERVICE_ID[a] || null;
      const [professional, govt] = pricedLine(addonId, state, ADDON_PRICE[a] || 999, 0);
      return line(a, addonId, professional, govt);
    }),
  ];
  const sum = (k) => lines.reduce((s, l) => s + l[k], 0);
  const addonLines = lines.slice(1).map((l) => [l.name, l.professionalFee]);
  // Client pays this service's govt. fee directly (ServiceMaster
  // IsGovtFeePaidByClient, same as the staff Quote/Deal screens) → it's not
  // billed, so it's left out of the total. The lines still carry it: the
  // server strips it from the Quote/Deal itself and records it as
  // ClientPaidGovtFee — zeroing it here too would lose that amount.
  const clientPaidGovt = serviceId && state?.govtPaidByClient?.[serviceId] ? Number(mainGovt) || 0 : 0;
  return {
    lines,
    service: mainProfessional,
    addonLines,
    addonTotal: addonLines.reduce((s, l) => s + l[1], 0),
    govt: mainGovt - clientPaidGovt,
    clientPaidGovt,
    gst: sum("gstAmount"),
    cgst: sum("cgst"),
    sgst: sum("sgst"),
    igst: sum("igst"),
    gstEligible,
    total: sum("total") - clientPaidGovt,
  };
}

// Load (once) whether this application's franchisee charges GST, and its state
// for the CGST/SGST vs IGST split — see feeLines().
async function ensureGstInfo(state) {
  const franchiseeId = state.leadContact?.franchiseeId;
  if (state.gstInfo || !franchiseeId) return;
  state.gstInfo = await fetchFranchiseeGstInfo(franchiseeId);
}

// Load (once per service) whether the client pays the main service's govt.
// fee directly — ServiceMaster.IsGovtFeePaidByClient, see feeLines(). Kept by
// ServiceID since the main service can change with the answers (business type).
async function ensureGovtFeeFlag(flow, A, state) {
  const serviceId = typeof flow.serviceIdFor === "function" ? flow.serviceIdFor(A) : flow.serviceId || null;
  if (!serviceId) return;
  if (state.govtPaidByClient && serviceId in state.govtPaidByClient) return;
  const res = await getServiceById({ ServiceId: serviceId });
  state.govtPaidByClient = { ...state.govtPaidByClient, [serviceId]: Number(res?.data?.IsGovtFeePaidByClient) === 1 };
}

// Two ways to finish: pay online (the quote page offers UPI / card / net
// banking / wallet) or ask an advisor to call back.
const PAY_ONLINE_METHOD = "Proceed to Payment";
const PAY_METHODS = [
  [PAY_ONLINE_METHOD, "Review your quote and pay online — UPI, card, net banking or wallet"],
  [CALLBACK_METHOD, "Our advisor will call you to go over the quote and payment"],
];

/* ---------------------------------------------------------------------------
   Packages — between Review and Payment. Offers the subscription packages
   (same backend data as the Subscription "Package Plans" page) for the
   business type chosen here, matched by name against ServiceType, then lets
   the applicant either go on to Payment or request a call instead.
--------------------------------------------------------------------------- */
const normName = (s) => String(s || "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");

// A package's yearly quote lines, built the way the CRM's package quote builds
// them (QuoteModal, Yearly): whole rupees, Total = TotalFeeYearly (GST already
// in it), ProfessionalFee = Total - Vendor - Govt. The govt. fee goes as is —
// the server strips it for client-paid services, same as the registration.
function packageLines(p) {
  return (p.services || []).map((s) => {
    const vendorFee = Math.round(Number(s.VendorFeeYearly)) || 0;
    const govtFee = Math.round(Number(s.GovernmentFeeYearly)) || 0;
    const origTotal = Number(s.TotalFeeYearly);
    const total = Math.round(Number.isFinite(origTotal) && origTotal > 0 ? origTotal : (Number(s.ProfessionalFeeYearly) || 0) + vendorFee + govtFee);
    return { serviceId: s.ServiceID || s.serviceId || null, serviceName: s.ServiceName || "", professionalFee: total - vendorFee - govtFee, vendorFee, govtFee, total };
  });
}
// What the package quote will total — the sum of its lines; the master's
// YearlyMRP only when the package has no priced services.
function packageYearlyTotal(p, lines = packageLines(p)) {
  const sum = lines.reduce((s, l) => s + l.total, 0);
  return sum > 0 ? sum : Number(p.YearlyMRP || p.price || 0);
}

function PackagesBody({ A, state, bump, onPay, onCallback, onBack }) {
  const [plans, setPlans] = useState(null); // null = loading
  const wanted = A.businessType || state.serviceType;
  useEffect(() => {
    let alive = true;
    getAllServiceTypes()
      .then((types) => {
        const w = normName(wanted);
        const match = (types || []).find((t) => {
          const n = normName(t.Service_Name || t.service_name);
          return n && w && (n === w || n.includes(w) || w.includes(n));
        });
        return match ? getPackagesByServiceType(match.Id || match.id) : [];
      })
      .then((p) => { if (alive) setPlans(p || []); })
      .catch(() => { if (alive) setPlans([]); });
    return () => { alive = false; };
  }, [wanted]);

  const selectedId = A.selectedPackage?.id;
  function pick(p) {
    const id = p.PackageID || p.id;
    const lines = packageLines(p);
    A.selectedPackage = selectedId === id ? null : { id, name: p.PackageName || p.name, price: packageYearlyTotal(p, lines), lines };
    bump();
  }

  return (
    <div>
      <h3 className="text-base font-semibold">We have packages for you</h3>
      <p className="text-sm text-gray-500 mt-1 mb-4">Bundle your {state.serviceType} with a package — or skip this and go straight to payment.</p>
      {plans === null ? (
        <p className="text-sm text-gray-400 py-6 text-center">Loading packages…</p>
      ) : plans.length === 0 ? (
        <Note variant="info" body="No packages are available for this registration right now. You can continue to payment or request a call." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {plans.map((p, i) => {
            const id = p.PackageID || p.id;
            const on = selectedId === id;
            return (
              <button key={id || i} type="button" onClick={() => pick(p)}
                className={`text-left border-2 rounded-xl p-4 transition ${on ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-200"}`}>
                <div className="flex items-start justify-between gap-2">
                  <b className="text-sm">{p.PackageName || p.name}</b>
                  <span className={`flex-none w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] ${on ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300"}`}>{on ? "✓" : ""}</span>
                </div>
                <div className="text-lg font-bold mt-1">{rupee(packageYearlyTotal(p))}<span className="text-xs font-normal text-gray-500"> / year</span></div>
                {(p.Description || p.description) && <p className="text-xs text-gray-500 mt-1">{p.Description || p.description}</p>}
                {p.services?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {p.services.map((s, si) => <li key={s.ID || si} className="text-xs text-gray-700">✓ {s.ServiceName}</li>)}
                  </ul>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-6 border-t border-gray-100 pt-5">
        <h3 className="text-base font-semibold mb-3">Would you like to pay and continue, or request a call?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={onPay} className="py-3 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700">💳 Pay &amp; Continue →</button>
          <button onClick={onCallback} disabled={state.__paying} className="py-3 rounded-lg border-2 border-blue-500 text-blue-700 font-semibold text-sm disabled:opacity-60">
            {state.__paying ? "Submitting…" : "Request a Call"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Requesting a call saves your quote — one of our advisors will call you. Nothing is charged now.</p>
        <button onClick={onBack} className="w-full mt-3 py-2.5 rounded-lg text-gray-500 text-sm font-semibold hover:bg-gray-50">← Back</button>
      </div>
    </div>
  );
}

// yyyy-mm-ddThh:mm for a datetime-local input, in local time.
const toLocalInput = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/* ---------------------------------------------------------------------------
   Call-back request form — preferred date & time (required, not in the past)
   and an optional note. Submitting hands { preferredAt, note } to doCallback.
--------------------------------------------------------------------------- */
/* ---------------------------------------------------------------------------
   Shown instead of the form when a call-back was already submitted at this
   stage of the application.
--------------------------------------------------------------------------- */
function CallbackAlreadyRequestedModal({ callAt, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 text-center">
        <button type="button" onClick={onClose} aria-label="Close"
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none">
          &times;
        </button>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Call back already requested</h3>
        <p className="text-sm text-gray-600">
          You've already submitted a call-back request at this stage.
          {callAt ? <> Our advisor will call you on <b>{callAt}</b>.</> : " Our advisor will call you shortly."}
        </p>
        <button type="button" onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold text-sm">
          OK
        </button>
      </div>
    </div>
  );
}

function CallbackRequestModal({ onClose, onSubmit }) {
  const [preferredAt, setPreferredAt] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const now = new Date();
  const selected = preferredAt ? new Date(preferredAt) : null;
  const [viewMonth, setViewMonth] = useState(() => selected ? new Date(selected.getFullYear(), selected.getMonth(), 1) : new Date(now.getFullYear(), now.getMonth(), 1));
  const [pickerOpen, setPickerOpen] = useState(true);
  const monthStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const firstWeekday = monthStart.getDay();
  const hour24 = selected?.getHours() ?? (now.getHours() % 12 || 12);
  const hour12 = hour24 % 12 || 12;
  const minute = selected?.getMinutes() ?? now.getMinutes();
  const period = hour24 >= 12 ? "PM" : "AM";

  function updateTime({ hour = hour12, minute: nextMinute = minute, period: nextPeriod = period } = {}) {
    const date = selected || new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0);
    let h = Number(hour) % 12;
    if (nextPeriod === "PM") h += 12;
    date.setHours(h, Number(nextMinute), 0, 0);
    setPreferredAt(toLocalInput(date));
    setError("");
  }

  function chooseDate(day) {
    const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day, selected?.getHours() ?? now.getHours(), selected?.getMinutes() ?? now.getMinutes());
    if (date < now) return;
    setPreferredAt(toLocalInput(date));
    setError("");
  }

  const dateLabel = selected ? `${String(selected.getDate()).padStart(2, "0")}-${String(selected.getMonth() + 1).padStart(2, "0")}-${selected.getFullYear()} ${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}` : "Select date and time";

  function submit() {
    if (!preferredAt) return setError("Please choose a date and time for the call.");
    if (new Date(preferredAt) <= new Date()) return setError("Please choose a date and time in the future.");
    onSubmit({ preferredAt, note: note.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl p-5 sm:p-6">
        <button type="button" onClick={onClose} aria-label="Close"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none">
          &times;
        </button>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tell us when to call you.</h3>
        <label className="block text-xs font-medium text-gray-700 mb-1">Preferred date &amp; time<span className="text-red-500">*</span></label>
        <button type="button" onClick={() => setPickerOpen(!pickerOpen)} className="w-full flex items-center justify-between border border-gray-300 rounded-[11px] px-3 py-2 text-sm text-left hover:border-blue-400">
          <span className={selected ? "text-gray-900" : "text-gray-400"}>{dateLabel}</span><svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0">
            <path d="M4.06331 3.39665V0.72998M9.39665 3.39665V0.72998M3.39665 6.06331H10.0633M2.06331 12.73H11.3966C12.1325 12.73 12.73 12.1325 12.73 11.3966V3.39665C12.73 2.66076 12.1325 2.06331 11.3966 2.06331H2.06331C1.32743 2.06331 0.72998 2.66076 0.72998 3.39665V11.3966C0.72998 12.1325 1.32743 12.73 2.06331 12.73L4.06331 3.39665" stroke="#F3C625" strokeWidth="1.45957" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {pickerOpen && <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_1.12fr] gap-3 rounded-xl border border-gray-100 p-3">
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-2">
              <button type="button" aria-label="Previous month" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} className="px-2 text-gray-500 hover:text-gray-900">‹</button>
              <span className="text-xs font-semibold">{viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
              <button type="button" aria-label="Next month" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} className="px-2 text-gray-500 hover:text-gray-900">›</button>
            </div>
            <div className="grid grid-cols-7 text-center text-[9px] text-gray-400 mb-1">{"Su Mo Tu We Th Fr Sa".split(" ").map((d) => <span key={d}>{d}</span>)}</div>
            <div className="grid grid-cols-7 gap-y-1 text-center">{Array.from({ length: firstWeekday + daysInMonth }, (_, i) => {
              const day = i - firstWeekday + 1;
              if (day < 1) return <span key={`blank-${i}`} />;
              const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
              const disabled = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const isSelected = selected && selected.getFullYear() === date.getFullYear() && selected.getMonth() === date.getMonth() && selected.getDate() === day;
              const isToday = now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth() && now.getDate() === day;
              return <button key={day} type="button" disabled={disabled} onClick={() => chooseDate(day)} className={`mx-auto h-6 w-6 rounded-full text-[10px] ${isSelected ? "bg-amber-400 text-gray-900 font-bold" : isToday ? "bg-amber-100 text-gray-800" : "text-gray-700 hover:bg-gray-100"} disabled:text-gray-300`}>{day}</button>;
            })}</div>
            <div className="flex justify-between mt-2 text-[10px]"><button type="button" onClick={() => { setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1)); chooseDate(now.getDate()); }} className="rounded-full bg-amber-100 px-3 py-1 text-gray-700">Today</button><button type="button" onClick={() => { setPreferredAt(""); setError(""); }} className="text-gray-500 hover:text-gray-800">Clear</button></div>
          </div>
          <div className="grid grid-cols-3 gap-2 min-h-[190px]">
            {[Array.from({ length: 12 }, (_, i) => i + 1), Array.from({ length: 60 }, (_, i) => i), ["AM", "PM"]].map((options, col) => <div key={col} className="max-h-[190px] overflow-y-auto rounded-lg bg-gray-50 p-1 space-y-0.5">{options.map((option) => {
              const active = col === 0 ? Number(option) === hour12 : col === 1 ? Number(option) === minute : option === period;
              return <button key={option} type="button" onClick={() => updateTime(col === 0 ? { hour: option } : col === 1 ? { minute: option } : { period: option })} className={`w-full rounded px-1 py-1 text-[10px] ${active ? "bg-amber-300 font-semibold text-gray-900" : "text-gray-600 hover:bg-white"}`}>{col === 1 ? String(option).padStart(2, "0") : option}</button>;
            })}</div>)}
          </div>
        </div>}

        <label className="block text-xs font-medium text-gray-700 mt-3 mb-1">Note (optional)</label>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything you'd like the advisor to know" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />

        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

        <div className="flex gap-3 mt-4">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={submit}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700">
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentBody({ flow, A, state, bump, onPay, onCallback, onBack }) {
  useEffect(() => {
    if (!state.gstInfo) ensureGstInfo(state).then(bump).catch(() => {});
    ensureGovtFeeFlag(flow, A, state).then(bump).catch(() => {});
    ensureMasterPrices(flow, A, state).then(bump).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const f = feeLines(flow, A, state);
  // Anything other than a call back (incl. drafts saved with the old UPI /
  // card / wallet choices) is the online-payment path.
  const wantsCallback = A.payMethod === CALLBACK_METHOD;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
      <div className="border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold mb-2">Fee summary</h3>
        <div className="text-xs font-bold uppercase text-blue-600 mt-3 mb-1">Service charges</div>
        <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span>{state.serviceType} — professional fee</span><b>{rupee(f.service)}</b></div>
        {f.addonLines.length > 0 && <div className="text-xs font-bold uppercase text-blue-600 mt-3 mb-1">Additional services</div>}
        {f.addonLines.map(([name, amt]) => (
          <div key={name} className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span>{name}</span><b>{rupee(amt)}</b></div>
        ))}
        <div className="text-xs font-bold uppercase text-blue-600 mt-3 mb-1">Government fees</div>
        {f.clientPaidGovt > 0 ? (
          // Same as the staff Quote/Deal screens: billed at ₹0, "₹X paid by client".
          <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"
            title="Government fee is paid by you directly at the time of service and is not included in this total">
            <span>Statutory / filing fees<span className="block text-xs text-amber-600">{rupee(f.clientPaidGovt)} directly paid by you at the time of service — not included in this total</span></span>
            <b>{rupee(0)}</b>
          </div>
        ) : (
          <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span>Statutory / filing fees{f.govt ? "" : " (none for this service)"}</span><b>{rupee(f.govt)}</b></div>
        )}
        <div className="text-xs font-bold uppercase text-blue-600 mt-3 mb-1">Taxes</div>
        {!f.gstEligible ? (
          <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span>GST (not applicable)</span><b>{rupee(0)}</b></div>
        ) : f.igst > 0 ? (
          <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span>IGST @ 18% on professional fees</span><b>{rupee(f.igst)}</b></div>
        ) : f.cgst + f.sgst > 0 ? (
          <>
            <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span>CGST @ 9% on professional fees</span><b>{rupee(f.cgst)}</b></div>
            <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span>SGST @ 9% on professional fees</span><b>{rupee(f.sgst)}</b></div>
          </>
        ) : (
          <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span>GST @ 18% on professional fees</span><b>{rupee(f.gst)}</b></div>
        )}
        <div className="flex justify-between text-base font-bold pt-3"><span>Total Amount</span><span>{rupee(f.total)}</span></div>
        <p className="text-xs text-gray-400 mt-3">🔒 You'll review and approve this quote (with OTP verification) before any payment is taken.</p>
        {A.selectedPackage && (
          // The package is its own Package quote (createPackageForApplication),
          // never part of the registration total above.
          <div className="mt-4 border-t border-gray-200 pt-3">
            <div className="text-xs font-bold uppercase text-blue-600 mb-1">Package — separate quote</div>
            {(A.selectedPackage.lines || []).map((l, i) => (
              <div key={l.serviceId || i} className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span>{l.serviceName}</span><b>{rupee(l.total)}</b></div>
            ))}
            <div className="flex justify-between text-base font-bold pt-3"><span>{A.selectedPackage.name} (yearly)</span><span>{rupee(A.selectedPackage.price)}</span></div>
            <p className="text-xs text-gray-400 mt-1">Billed as a separate package quote, payable in full.</p>
            {state.packageQuote?.packageId === A.selectedPackage.id && (
              <button type="button" onClick={() => window.open(quoteApprovalUrl(state.packageQuote.quoteId), "_blank", "noopener,noreferrer")}
                className="w-full mt-3 py-2.5 rounded-lg border-2 border-blue-500 text-blue-700 font-semibold text-sm">
                Review &amp; Approve Package Quote →
              </button>
            )}
          </div>
        )}
      </div>
      <div className="border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold mb-3">Payment method</h3>
        <div className="flex flex-col gap-2">
          {PAY_METHODS.map(([m, sub]) => (
            <OptionButton key={m} selected={(wantsCallback ? CALLBACK_METHOD : PAY_ONLINE_METHOD) === m} onClick={() => { A.payMethod = m; bump(); }}>
              {m}<span className="block font-normal text-xs text-gray-500">{sub}</span>
            </OptionButton>
          ))}
        </div>
        {wantsCallback ? (
          <>
            <div className="mt-4"><Note variant="info" body="We'll save your quote and one of our advisors will call you shortly. Nothing is charged now." /></div>
            <button onClick={onCallback} disabled={state.__paying} className="w-full mt-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm disabled:opacity-60">
              {state.__paying ? "Submitting…" : "Request a Call Back →"}
            </button>
          </>
        ) : (
          <>
            {state.awaitingPayment ? (
              <div className="mt-4"><Note variant="warn" body="Waiting for your payment. Your quote is open in a new tab — approve it and complete the payment there. This page moves to “Application Submitted” automatically once the payment succeeds." /></div>
            ) : (
              <div className="mt-4"><Note variant="info" body="Opens your quote in a new tab to accept, verify, and choose how to pay. A GST invoice is emailed as soon as the payment succeeds." /></div>
            )}
            <button onClick={onPay} disabled={state.__paying} className="w-full mt-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm disabled:opacity-60">
              {state.__paying ? "Opening…" : state.awaitingPayment ? "🔒 Open Quote to Pay →" : "🔒 Review & Approve Quote →"}
            </button>
          </>
        )}
        <button onClick={onBack} className="w-full mt-2 py-2.5 rounded-lg text-gray-500 text-sm font-semibold hover:bg-gray-50">Back</button>
      </div>
    </div>
  );
}

function SuccessScreen({ state, onExit, onComplete, nextLabel, onRetryPayment }) {
  const s = state.submitted || {};
  const storageKey = `${STORAGE_KEY}_${state.flowId}`;
  // A lead was captured (so a real Deal + Quote should exist) but the
  // conversion never went through — surface that instead of a false success,
  // and let the applicant retry from Payment without losing what they filled in.
  const conversionFailed = !!state.leadContact && (!state.dealId || !state.quoteId);
  if (conversionFailed) {
    return (
      <div className="max-w-xl mx-auto text-center bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 text-3xl flex items-center justify-center mx-auto mb-4">⚠</div>
        <h1 className="text-2xl font-bold text-gray-900">We couldn't process your application</h1>
        <p className="text-gray-500 mt-2">
          Something went wrong while setting up your payment. Nothing was charged — your answers are all still saved, so you can retry without re-entering anything.
        </p>
        <div className="flex justify-center mt-6">
          <button onClick={onRetryPayment} className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold">
            ↺ Retry Payment
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-xl mx-auto text-center bg-white border border-gray-200 rounded-xl shadow-sm p-8">
      <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 text-3xl flex items-center justify-center mx-auto mb-4">✓</div>
      <h1 className="text-2xl font-bold text-gray-900">{s.callback ? "Call Back Requested" : "Application Submitted Successfully"}</h1>
      <p className="text-gray-500 mt-2">
        {s.callback
          ? `Thanks! Your application and quote are saved. One of our advisors will call you ${s.callAt ? `on ${s.callAt}` : "shortly"} to go over the quote and help you with payment.`
          : "Your application has been received and is being processed. We've emailed a confirmation with your next steps."}
      </p>
      <div className="text-left border border-gray-200 rounded-lg p-4 mt-5">
        <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span className="text-gray-500">Service</span><b>{s.service || state.serviceType}</b></div>
        <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span className="text-gray-500">Application ID</span><b className="font-mono">{s.id || ""}</b></div>
        <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span className="text-gray-500">Submission Date</span><b>{s.date || today()}</b></div>
        {s.callAt && <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span className="text-gray-500">Call Back On</span><b>{s.callAt}</b></div>}
        <div className="flex justify-between text-sm py-2"><span className="text-gray-500">{s.callback ? "Quote Amount" : "Amount Paid"}</span><b>{s.amount || ""}</b></div>
        {state.packageQuote && (
          <div className="flex justify-between text-sm py-2 border-t border-dashed border-gray-100"><span className="text-gray-500">Package quote — {state.packageQuote.name}</span><b>{rupee(state.packageQuote.amount)} / year</b></div>
        )}
      </div>
      {state.packageQuote && (
        <button type="button" onClick={() => window.open(quoteApprovalUrl(state.packageQuote.quoteId), "_blank", "noopener,noreferrer")}
          className="mt-4 px-5 py-2.5 rounded-lg border-2 border-blue-500 text-blue-700 text-sm font-semibold">
          Review &amp; Approve Package Quote →
        </button>
      )}
      {onComplete ? (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={onRetryPayment} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50">← Back</button>
          {/* Doesn't clear storage: real payment/approval now happens on the Quote
              page in the other tab, not synchronously here — the applicant may
              still need to come back and finish it, so this application stays
              recoverable until they explicitly start a new one. */}
          <button onClick={() => onComplete({ ...s, companyId: state.companyId })} className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold">
            {nextLabel || "Continue →"}
          </button>
        </div>
      ) : (
        <div className="flex gap-3 justify-center flex-wrap mt-6">
          <button onClick={() => { removeSecureItem(storageKey); onExit(); }} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">+ Start Another Application</button>
          <button onClick={onExit} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Back to Requests</button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Existing Company Changes (FLOWS["ex-change"], directSave) — pick the
   company, see what's on record, review the differences, save. The save
   itself lives in companyChangeSave.js.
--------------------------------------------------------------------------- */
function companyName(c) {
  return c?.BusinessName || c?.CompanyName || `Company #${c?.CompanyID}`;
}

function ChangeCompanyBody({ A, state, errors, setAnswer, bump }) {
  const me = signedInContact();
  const companies = me ? myCompanies() : [];
  // Default to the company selected on the dashboard (or the only one).
  useEffect(() => {
    if (!me || !companies.length) return;
    if (companies.some((c) => String(c.CompanyID) === String(A.ex_company_id))) return;
    const preferred = getCompanyIdFromStorage();
    const pick = companies.find((c) => String(c.CompanyID) === String(preferred)) || companies[0];
    setAnswer("ex_company_id", pick.CompanyID);
  });

  if (!me) {
    return (
      <div className="space-y-3">
        <Note variant="info" title="Sign in to continue" body="Changes are saved straight to your company's record, so we need to know it's you." />
        <button type="button" onClick={() => { state.signIn = { then: () => {} }; bump(); }} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700">Sign in</button>
        <ErrorText msg={errors.__company} />
      </div>
    );
  }
  if (!companies.length) {
    return (
      <div>
        <Note variant="warn" title="No company found on your account" body="Add your company from the dashboard first, then come back to change its details." />
        <ErrorText msg={errors.__company} />
      </div>
    );
  }
  return (
    <div>
      <div className="font-semibold text-sm text-gray-800 mb-2">Which company do you want to change?<span className="text-red-500 ml-0.5">*</span></div>
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
        {companies.map((c) => (
          <OptionButton key={c.CompanyID} selected={String(c.CompanyID) === String(A.ex_company_id)} onClick={() => setAnswer("ex_company_id", c.CompanyID)}>
            {companyName(c)}
          </OptionButton>
        ))}
      </div>
      <ErrorText msg={errors.__company} />
    </div>
  );
}

// "Register another company → Change/update my existing business" now points
// here: changes save directly from the Existing Company Changes options.
function GoToChangeBody({ onExit }) {
  return (
    <div className="space-y-3">
      <Note variant="info" title="Changes are saved directly now" body="To change your business name, address, activity, owners, contact or bank details, pick the matching option under Existing Company Changes. Your changes are saved to your company straight away — no application or payment needed." />
      <button type="button" onClick={onExit} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700">Open Existing Company Changes</button>
    </div>
  );
}

function changeCurrentFor(A, state) {
  const key = `${A.ex_company_id}:${A.change_what}`;
  return state.changeCurrent?.key === key ? state.changeCurrent : null;
}

function CurrentRecordNote({ A, state, bump }) {
  const cur = changeCurrentFor(A, state);
  const kind = changeKind(A.change_what);
  if (!cur || cur.loading || (!cur.data && !cur.error)) return <Note variant="info" body="Loading your current details…" />;
  if (cur.error) {
    return (
      <div className="space-y-2">
        <Note variant="err" title="Couldn't load your current details" body={cur.error} />
        <button type="button" onClick={() => { state.changeCurrent = { key: cur.key, retry: (cur.retry || 0) + 1 }; bump(); }} className="text-sm font-semibold text-blue-600 hover:underline">↺ Retry</button>
      </div>
    );
  }
  const rows = currentRows(A.change_what, cur.data);
  if (!rows.length) {
    const body = kind === "directors" ? "No owners, directors or partners are on record yet — you can add one below."
      : kind === "bank" ? "No bank account is on record yet — enter it below." : "No details are on record yet — enter them below.";
    return <Note variant="info" body={body} />;
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
      <b className="block mb-1 text-gray-800">Currently on record</b>
      <dl>
        {rows.map(([label, value], i) => (
          <div key={i} className="grid grid-cols-[minmax(120px,38%)_1fr] gap-3 py-1">
            <dt className="text-gray-500">{label}</dt><dd className="font-medium break-words">{value}</dd>
          </div>
        ))}
      </dl>
      {kind !== "directors" && <p className="text-xs text-gray-500 mt-2">Edit the fields below — only what you change will be saved.</p>}
    </div>
  );
}

function PersonPickField({ f, A, errors, setAnswer, state }) {
  const people = changeCurrentFor(A, state)?.data?.people || [];
  if (!people.length) {
    return (
      <div>
        <Note variant="warn" body="No one is on record yet, so there's no one to remove or change. Choose Add instead." />
        <ErrorText msg={errors[f.k]} />
      </div>
    );
  }
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}<ReqMark f={f} A={A} /></label>
      <select className={inputCls(errors[f.k])} value={A[f.k] || ""} onChange={(e) => setAnswer(f.k, e.target.value)}>
        <option value="">Select…</option>
        {people.map((p) => <option key={p.ID} value={String(p.ID)}>{personLabel(p)}</option>)}
      </select>
      <ErrorText msg={errors[f.k]} />
    </div>
  );
}

const reviewRowCls = "grid grid-cols-[minmax(120px,38%)_1fr] gap-3 py-2 border-b border-dashed border-gray-100 last:border-0";

function ChangeReviewBody({ A, state, current, errors, onConfirm, onJump, steps }) {
  const kind = changeKind(A.change_what);
  const company = myCompanies().find((c) => String(c.CompanyID) === String(A.ex_company_id));
  const editIndex = steps.findIndex((s) => s.id === "new");
  const changes = kind === "company" || kind === "bank" ? changedRows(A.change_what, A, current) : [];
  return (
    <div>
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200"><b className="text-sm">Change</b></div>
        <dl className="px-4 py-1 text-sm">
          <div className={reviewRowCls}><dt className="text-gray-500">Company</dt><dd className="font-medium">{company ? companyName(company) : "—"}</dd></div>
          <div className={reviewRowCls}><dt className="text-gray-500">What</dt><dd className="font-medium">{A.change_what}</dd></div>
        </dl>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <b className="text-sm">{kind === "other" ? "Your request" : "What will change"}</b>
          {editIndex !== -1 && <button onClick={() => onJump(editIndex)} className="text-xs text-blue-600 hover:underline">✎ Edit</button>}
        </div>
        <div className="px-4 py-2 text-sm">
          {(kind === "company" || kind === "bank") && (changes.length ? (
            <table className="w-full">
              <thead><tr className="text-left text-xs text-gray-500"><th className="py-1.5 font-medium">Field</th><th className="py-1.5 font-medium">From</th><th className="py-1.5 font-medium">To</th></tr></thead>
              <tbody>
                {changes.map(([label, from, to]) => (
                  <tr key={label} className="border-t border-dashed border-gray-100 align-top">
                    <td className="py-2 pr-3 text-gray-500">{label}</td>
                    <td className="py-2 pr-3 text-gray-400 line-through break-words">{from || "—"}</td>
                    <td className="py-2 font-medium break-words">{to || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="py-2 text-gray-500">Nothing has changed yet.</p>)}
          {kind === "directors" && (
            <dl>
              {directorSummary(A, current).map(([label, value], i) => (
                <div key={i} className={reviewRowCls}><dt className="text-gray-500">{label}</dt><dd className="font-medium break-words">{value || "—"}</dd></div>
              ))}
            </dl>
          )}
          {kind === "other" && (
            <dl>
              <div className={reviewRowCls}><dt className="text-gray-500">Requested change</dt><dd className="font-medium whitespace-pre-wrap break-words">{A.new_other || "—"}</dd></div>
              <div className={reviewRowCls}><dt className="text-gray-500">On record now</dt><dd className="font-medium whitespace-pre-wrap break-words">{A.cur_other || "—"}</dd></div>
            </dl>
          )}
        </div>
      </div>

      {kind !== "other" && (
        <Note variant="info" body="This updates your company's details with us straight away. It doesn't file anything with government registries — if your change needs a filing, your advisor can help." />
      )}
      <label className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4 cursor-pointer">
        <input type="checkbox" className="mt-0.5 w-4 h-4 accent-blue-600" checked={state.confirmed} onChange={(e) => onConfirm(e.target.checked)} />
        <span className="text-sm font-medium">I confirm these details are correct and that I am authorised to change them for this company.</span>
      </label>
      <ErrorText msg={errors.__confirm} />
      <ErrorText msg={errors.__save} />
    </div>
  );
}

function ChangeSavedScreen({ state, storageKey, onExit, onDashboard }) {
  const s = state.submitted || {};
  // Saved — nothing left to resume.
  useEffect(() => { removeSecureItem(storageKey); }, [storageKey]);
  const company = s.company ? { BusinessName: s.company } : myCompanies().find((c) => String(c.CompanyID) === String(state.answers.ex_company_id));
  return (
    <div className="max-w-xl mx-auto text-center bg-white border border-gray-200 rounded-xl shadow-sm p-8">
      <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 text-3xl flex items-center justify-center mx-auto mb-4">✓</div>
      <h1 className="text-2xl font-bold text-gray-900">{s.title || "Saved"}</h1>
      <p className="text-gray-500 mt-2">{s.message}</p>
      <div className="text-left border border-gray-200 rounded-lg p-4 mt-5">
        <div className="flex justify-between gap-3 text-sm py-2 border-b border-dashed border-gray-100"><span className="text-gray-500">Company</span><b className="text-right">{company ? companyName(company) : "—"}</b></div>
        <div className="flex justify-between gap-3 text-sm py-2 border-b border-dashed border-gray-100"><span className="text-gray-500">{s.label || "Change"}</span><b>{s.change}</b></div>
        <div className="flex justify-between gap-3 text-sm py-2"><span className="text-gray-500">Date</span><b>{s.date || today()}</b></div>
      </div>
      <div className="flex gap-3 justify-center flex-wrap mt-6">
        <button onClick={onExit} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">Make Another Change</button>
        {onDashboard && <button onClick={onDashboard} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Go to Dashboard</button>}
      </div>
    </div>
  );
}

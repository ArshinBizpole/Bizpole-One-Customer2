import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import CryptoJS from "crypto-js";
import { getSecureItem, setSecureItem, removeSecureItem } from "../../utils/secureStorage";
import { lookupGstin } from "../../api/GstinLookup";
import { assignCustomer } from "../../api/CustomerApi";
import { createLead, createCustomerCompany, convertLeadToDeal, createQuoteForApplication, uploadApplicationDocument, removeApplicationDocument } from "../../api/LeadApi";
import { sendApplicationReceivedEmail } from "../../api/CustomerEmailApi";
import { getAllStates } from "../../api/States";
import { getAllServiceTypes, getPackagesByServiceType } from "../../api/ServiceType";
import { createSupportTicket, getCompanyIdFromStorage } from "../../api/SupportTickets/SupportTicket";
import { insertDeal, getCompanyDetails } from "../../api/DealsApi";
import { fetchFranchiseeGstInfo, calcGstAmount, splitGst } from "../../utils/gstCalc";
import { loginWithPhone, signupWithPhone, verifyOtp } from "../../api/AuthApi";
import { notifyTokenSet } from "../../utils/authSession";
import { signedInContact, belongsToOtherCustomer } from "../../utils/applicationPrefill";
import { districtsFor } from "../../utils/districts";
import SigninModal from "../Modals/SigninModal";
import VoiceSpecifyInput from "./VoiceSpecifyInput";
import {
  FLOWS, ownerConfig, ownerBaseFields, newOwner, visibleFields, docItems, docGroups, isMinor,
  fieldError, today, rupee, newApplicationId, ADDON_PRICE, ADDON_SERVICE_ID, STATES,
  recommendBusinessType, suggestedBusinessNames, runNameCheckSim,
  generateBusinessObjective, suggestedNicCodes, tmClassMatches,
  selectedNiceClass, runTrademarkSearchSim, tmRiskLevel, NICE_CLASSES,
  TM_MARK_TYPES, TM_LANGUAGES, newTmMark, tmMarks, tmMarkLabel, tmGovtFee,
} from "./existingCompanyData";
import {
  changeKind, loadCurrent, prefillAnswers, currentRows, changedRows, directorSummary,
  nothingToSave, saveChange, myCompanies, personLabel,
  loadExistingCompanyPrefill, fillExistingCompanyAnswers, ownersFromDirectors,
} from "./companyChangeSave";

const STORAGE_KEY = "existingCompanyFlowState";
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
function requireVerifiedCustomer(state, bump, run) {
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
  if (leadFromSignedInCustomer(state, bump, run)) return;
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
    if (companies.some((c) => String(c.CompanyID) === String(companyId))) return;
    user.Companies = [...companies, { CompanyID: companyId, BusinessName: companyName }];
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
  return (A.nc_target || A.name1 || A.gst_bizname || A.msme_name || A.iec_bizname || A.other_bizname || A.ex_name || "").trim();
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
    .then((res) => {
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
      bump();
    })
    .catch((err) => {
      console.error("Customer/Company sync failed (non-fatal):", err);
    });
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

// Latest allowed date of birth: 31 Dec of last year (yyyy-mm-dd, compared as a string).
const DOB_MAX = `${new Date().getFullYear() - 1}-12-31`;
const DOB_ERROR = `Date of birth must be before ${new Date().getFullYear()}.`;
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
    // Date of birth can't fall in the current year (or later), for the owner
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
      const total = state.owners.reduce((sum, o) => sum + (Number(o.shareholding) || 0), 0);
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
    if (!/^[6-9]\d{9}$/.test((lf.mobile || "").trim())) errors.lead_mobile = "Please enter a valid 10-digit mobile number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((lf.email || "").trim())) errors.lead_email = "Please enter a valid email.";
    if (!(lf.country || "").trim()) errors.lead_country = "Please enter your country.";
    if (!lf.state) errors.lead_state = "Please select your state.";
    if (!lf.language) errors.lead_language = "Please select your preferred language.";
  } else if (step.type === "namecheck") {
    if (!nameCheckIsCurrent(A, state)) errors.__namecheck = "Check name availability to continue";
  } else if (step.type === "objective") {
    if (A.br_objectiveAccepted !== "Yes") errors.br_objective = "Please review and accept the business objective to continue";
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

function nameCheckIsCurrent(A, state) {
  const key = (A.nc_target || "").trim().toLowerCase();
  return key ? state.nameChecks[key] || null : null;
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
  return required === false ? null : <span className="text-red-500 ml-0.5">*</span>;
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

export default function FlowRunner({ flowId, initialSet, onExit, onComplete, onSkip, homeLabel, nextLabel }) {
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
    // Progress now survives logout (clearStorageKeepingApplications) — stamp
    // whose it is, so another Customer on this browser never resumes it.
    if (!appRef.current.ownerCustomerId) appRef.current.ownerCustomerId = signedInContact()?.customerId || null;
  }
  const [, rerender] = useReducer((c) => c + 1, 0);
  const errorsRef = useRef({});
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
    appRef.current.answers[k] = v;
    delete errorsRef.current[k];
    bump();
  }

  const state = appRef.current;
  const A = state.answers;
  const flow = FLOWS[flowId];

  const steps = useMemo(() => allSteps(flowId, A), [flowId, JSON.stringify(A), state.owners.length, JSON.stringify(state.documents)]);
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
          message: "Thanks! A business advisor will call you within one working day with a recommendation.",
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
    if (Object.keys(errors).length) {
      errorsRef.current = errors;
      bump();
      return;
    }
    errorsRef.current = {};
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
  function advance() {
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
  function retryPayment() {
    const idx = steps.findIndex((s) => s.type === "payment");
    if (idx === -1) return;
    state.submitted = null;
    state.stepIndex = idx;
    bump();
  }

  if (!flow) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {state.leadGate && <LeadCaptureModal state={state} bump={bump} />}
      {state.signIn && !state.leadGate && (
        <SigninModal
          initialValue={state.leadContact?.mobile || ""}
          onSuccess={finishSignIn}
          onClose={() => { state.signIn = null; state.signInDismissed = true; bump(); }}
          onSignup={state.signIn.signup}
        />
      )}
      <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-4 flex-wrap">
        {/* Back to the requests menu — progress stays saved, so picking this
            service again resumes it. */}
        <button onClick={onExit} className="hover:text-blue-600 hover:underline">{homeLabel || "Existing Company"}</button>
        <span>›</span>
        <span className="text-gray-800 font-medium">{state.serviceType}</span>
      </nav>

      {step.type === "success" && state.submitted?.direct ? (
        <ChangeSavedScreen state={state} storageKey={storageKey} onExit={onExit} onDashboard={onSkip} />
      ) : step.type === "success" ? (
        <SuccessScreen state={state} onExit={onExit} onComplete={onComplete} nextLabel={nextLabel} onRetryPayment={retryPayment} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[264px_1fr] gap-6 items-start">
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

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-6">
            <div className="mb-5">
              <div className="text-xs font-bold tracking-wide uppercase text-blue-600">Step {shown} of {total}</div>
              <h2 className="text-xl font-semibold text-gray-900 mt-1">{step.title}</h2>
            </div>

            {step.type === "leadDetails" && <LeadDetailsBody state={state} errors={errorsRef.current} bump={bump} />}
            {step.type === "changeCompany" && <ChangeCompanyBody A={A} state={state} errors={errorsRef.current} setAnswer={setAnswer} bump={bump} />}
            {step.type === "goToChange" && <GoToChangeBody onExit={onExit} />}
            {step.type === "review" && directMode && <ChangeReviewBody A={A} state={state} current={changeCurrent?.data} errors={errorsRef.current} onConfirm={(v) => { state.confirmed = v; bump(); }} onJump={jumpTo} steps={steps} />}
            {step.type === "review" && !directMode && <ReviewBody flowId={flowId} A={A} state={state} errors={errorsRef.current} onConfirm={(v) => { state.confirmed = v; bump(); }} onJump={jumpTo} />}
            {step.type === "packages" && <PackagesBody A={A} state={state} bump={bump} onPay={goNext} onCallback={() => withSignIn(() => doCallback(flow, state, bump))} onBack={goBack} />}
            {step.type === "payment" && <PaymentBody flow={flow} A={A} state={state} bump={bump} onPay={() => withSignIn(() => doPay(flow, state, bump))} onCallback={() => withSignIn(() => doCallback(flow, state, bump))} onBack={goBack} />}
            {step.type === "owners" && <OwnersBody A={A} state={state} errors={errorsRef.current} bump={bump} />}
            {step.type === "docs" && <DocsBody step={step} A={A} state={state} errors={errorsRef.current} bump={bump} />}
            {step.type === "namecheck" && <NameCheckBody A={A} state={state} errors={errorsRef.current} setAnswer={setAnswer} bump={bump} />}
            {step.type === "objective" && <ObjectiveBody A={A} errors={errorsRef.current} setAnswer={setAnswer} />}
            {step.type === "aiClassFinder" && <AiClassFinderBody A={A} setAnswer={setAnswer} state={state} bump={bump} />}
            {step.type === "tmClassConfirm" && <TmClassConfirmBody A={A} onChangeClass={() => { state.stepIndex = steps.findIndex((s) => s.id === "recommend"); bump(); }} />}
            {step.type === "tmSearch" && <TmSearchBody flow={flow} step={step} A={A} state={state} errors={errorsRef.current} setAnswer={setAnswer} bump={bump} liveStateNames={liveStateNames} />}
            {step.type === "tmResults" && <TmResultsBody A={A} state={state} />}
            {step.type === "tmMarks" && <TmMarksBody flow={flow} A={A} state={state} errors={errorsRef.current} setAnswer={setAnswer} bump={bump} />}
            {!step.type && <FieldsBody step={step} A={A} errors={errorsRef.current} setAnswer={setAnswer} state={state} bump={bump} liveStateNames={liveStateNames} />}
            {!step.type && directMode && <ErrorText msg={errorsRef.current.__save} />}

            {step.type !== "payment" && step.type !== "packages" && (
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
        </div>
      )}
    </div>
  );
}

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
  if (state.quoteId || !state.leadContact) return; // already quoted, or no lead captured
  if (!state.dealId) await createDealForApplication(flow, state, A, () => {});
  if (!state.dealId) return;
  const companyName = resolveCompanyName(flow, A);
  await ensureGstInfo(state).catch(() => {});
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
function openQuoteForApproval(state, tab) {
  if (!state.quoteId) {
    if (tab && !tab.closed) tab.close();
    return;
  }
  const secret = import.meta.env.VITE_QUOTE_LINK_SECRET || "q3!9fKs7@pLzXr84$nmYtB!cVZdQ3";
  const encrypted = CryptoJS.AES.encrypt(String(state.quoteId), secret).toString();
  const url = `${import.meta.env.VITE_CLIENT_BASE_URL}/quotes/saved-preview/${encodeURIComponent(encrypted)}`;
  if (tab && !tab.closed) {
    tab.location.href = url;
  } else {
    // Fallback (e.g. the synchronous open above was itself blocked) — best
    // effort, may still get blocked since we're past the click by now.
    window.open(url, "_blank", "noopener,noreferrer");
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
  await createQuoteForApplicationStep(flow, state, state.answers);
  openQuoteForApproval(state, approvalTab);
  const f = feeLines(flow, state.answers, state); // after the quote, so GST info is loaded
  setTimeout(() => {
    const id = state.applicationId;
    state.submitted = { id, service: state.serviceType, date: today(), amount: rupee(f.total) };
    state.__paying = false;
    state.stepIndex = allSteps(state.flowId, state.answers).length - 1;
    bump();
  }, 1100);
}

// "Request a Call Back" payment option — same Quote as doPay (so the advisor
// has the exact fee breakdown in front of them), but instead of opening it
// for approval, raise a "callback" support ticket against it for the team to
// follow up on. The ticket is non-fatal: the Quote itself (on the Deal) is
// already enough for sales to pick this up.
async function doCallback(flow, state, bump) {
  if (state.__paying) return;
  state.__paying = true;
  bump();
  state.applicationId = state.applicationId || newApplicationId(flow.code);
  state.callbackRequested = true;
  await createQuoteForApplicationStep(flow, state, state.answers);
  const f = feeLines(flow, state.answers, state); // after the quote, so GST info is loaded
  if (state.quoteId || state.companyId) {
    try {
      await createSupportTicket({
        category: "callback",
        subject: `Call back request — ${state.serviceType}`,
        description: `Requested from the ${state.serviceType} application (quote total ${rupee(f.total)})${state.answers.selectedPackage ? `. Interested package: ${state.answers.selectedPackage.name} (${rupee(state.answers.selectedPackage.price)})` : ""}.`,
        priority: "medium",
        quoteId: state.quoteId,
        ...(state.companyId ? { companyId: state.companyId } : {}),
      });
    } catch (err) {
      console.error("Call back ticket failed (non-fatal):", err);
    }
  }
  state.submitted = { id: state.applicationId, service: state.serviceType, date: today(), amount: rupee(f.total), callback: true };
  state.__paying = false;
  state.stepIndex = allSteps(state.flowId, state.answers).length - 1;
  bump();
}

const LEAD_LANGUAGES = [
  { label: "English", value: "english" }, { label: "Hindi", value: "hindi" },
  { label: "Marathi", value: "marathi" }, { label: "Tamil", value: "tamil" },
  { label: "Telugu", value: "telugu" }, { label: "Gujarati", value: "gujarati" },
  { label: "Bengali", value: "bengali" }, { label: "Kannada", value: "kannada" },
  { label: "Malayalam", value: "malayalam" },
];

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
  if (await captureExistingCustomer(state, form)) return;
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
  const remark = `Talk to an Advisor — ${String(A.ex_name || "").trim()}\nWants to: ${String(A.ex_query || "").trim()}`;
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

async function captureLeadDetails(state) {
  const form = state.leadForm;
  // Already raised on an earlier pass — just keep the contact details current.
  // A pass whose createLead failed (leadId null) retries instead.
  if (state.leadCaptured && (state.leadContact?.leadId || state.leadContact?.direct)) {
    state.leadContact = { ...state.leadContact, ...form };
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
    state.leadForm = { name: src.name || "", mobile: src.mobile || "", email: src.email || "", country: src.country || "India", state: src.state || state.answers?.leadState || "", language: src.language || "" };
  }
  const form = state.leadForm;

  useEffect(() => {
    getAllStates().then(setStates).catch(() => setStates([]));
  }, []);

  function set(k, v) {
    form[k] = v;
    delete errors["lead_" + k];
    bump();
  }

  return (
    <div className="max-w-md space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name<span className="text-red-500 ml-0.5">*</span></label>
        <input className={inputCls(errors.lead_name)} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your full name" />
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
        <input className={inputCls(errors.lead_country)} value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="India" />
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
          {LEAD_LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
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
function LeadCaptureModal({ state, bump }) {
  const [states, setStates] = useState([]);
  // Already entered on a "leadDetails" Step 1 (Lead raised, just not verified
  // yet) — prefill from it and go straight to the details form to confirm.
  const lc = state.leadContact || signedInContact();
  const [form, setForm] = useState({
    name: lc?.name || "", mobile: lc?.mobile || "", email: lc?.email || "",
    country: lc?.country || "India", state: lc?.state || "", language: lc?.language || "",
  });
  // phase: "intro" (why sign up) -> "details" (contact form) -> "otp" (verify code) -> "done" (auto-continues)
  const [phase, setPhase] = useState(lc ? "details" : "intro");
  const [accountMode, setAccountMode] = useState("login"); // "login" (existing account) | "signup" (first time)
  const [submitting, setSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  // True when sign-up hit "account already exists" — e.g. the email is already
  // registered under a different mobile number. Surfaces a Sign In link instead
  // of just leaving them stuck on a dead-end error.
  const [accountExists, setAccountExists] = useState(false);
  const [otpValues, setOtpValues] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(30);

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
    setForm((f) => ({ ...f, [k]: v }));
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
    if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) return setError("Please enter a valid 10-digit mobile number.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError("Please enter a valid email — we'll send your verification code there.");
    if (!form.country.trim()) return setError("Please enter your country.");
    if (!form.state) return setError("Please select your state.");
    if (!form.language) return setError("Please select your preferred language.");
    setError("");
    setAccountExists(false);
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
          await signupWithPhone(form.name.trim(), form.email.trim(), form.mobile.trim());
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
      // Signup hit the backend's "Mobile OR Email already registered" guard —
      // most likely this email is already on file under a different mobile
      // number. Offer a way to switch to signing in instead of a dead end.
      setAccountExists(/already exists/i.test(msg));
    } finally {
      setSubmitting(false);
    }
  }

  // Lets them retry as a sign-in: clears the mobile field (their existing
  // account may be under a different number than the one just tried) and
  // keeps name/email filled in.
  function switchToSignIn() {
    setError("");
    setAccountExists(false);
    set("mobile", "");
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
        {phase === "intro" && (
          <div>
            {state.leadGate?.reason === "documents" ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Sign up to upload your documents</h3>
                <p className="text-sm text-gray-600 mb-5">
                  Your documents are saved securely to your account — quick mobile verification, and your application stays saved too.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Sign up to view your results</h3>
                <p className="text-sm text-gray-600 mb-5">
                  Sign up to see your result — quick mobile verification, and your application stays saved to your account.
                </p>
              </>
            )}
            <button
              type="button"
              onClick={() => setPhase("details")}
              className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold"
            >
              Sign Up
            </button>
          </div>
        )}
        {phase === "done" && (
          <Note variant="ok" title="Signed in!" body="Continuing with your check now." />
        )}
        {phase === "otp" && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Verify it's you</h3>
            <p className="text-xs text-gray-500 mb-4">
              {accountMode === "login" ? "Welcome back — " : ""}We've emailed a 4-digit code to <b>{form.email}</b>.
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
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Sign in to check that…</h3>
            <p className="text-xs text-gray-500 mb-4">We'll verify your mobile with a code emailed to you, so your application is saved to your own account.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name<span className="text-red-500 ml-0.5">*</span></label>
                <input className={inputCls()} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your full name" />
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
                <input className={inputCls()} value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="India" />
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
                  {LEAD_LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>
            <ErrorText msg={error} />
            {accountExists && (
              <button type="button" onClick={switchToSignIn} className="mt-1 text-xs text-blue-600 font-semibold hover:underline">
                Already have an account? Sign in instead
              </button>
            )}
            <button type="submit" disabled={submitting} className="mt-4 w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">
              {submitting ? "Signing up…" : "Sign Up"}
            </button>
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
        <div className={`grid gap-2 grid-cols-1 sm:grid-cols-${Math.min(cols, 3)}`}>
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
    const opts = f.opts === STATES && liveStateNames?.length ? [...liveStateNames, "Other"] : f.opts;
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}<ReqMark f={f} A={A} /></label>
        {f.hint && <p className="text-xs text-gray-500 mb-1">{f.hint}</p>}
        <select className={inputCls(errors[f.k])} value={A[f.k] || ""} onChange={(e) => {
          if (f.clears && e.target.value !== A[f.k]) setAnswer(f.clears, "");
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
      <input type={f.type === "text" ? "text" : f.type} className={inputCls(errors[f.k])} value={A[f.k] || ""} onChange={(e) => setAnswer(f.k, e.target.value)} placeholder={f.ph || ""} />
      <ErrorText msg={errors[f.k]} />
    </div>
  );
}

/* ---------------------------------------------------------------------------
   GSTIN lookup — auto-fetches legal name / trade name / status from the
   server-side GST verification proxy once a well-formed 15-char GSTIN is typed,
   so we don't ask the customer for details we can already look up ourselves.
--------------------------------------------------------------------------- */
function GstinLookupField({ f, A, errors, setAnswer, state, bump }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [message, setMessage] = useState("");
  const value = A[f.k] || "";

  async function runLookup(gstin) {
    setStatus("loading");
    setMessage("");
    try {
      const details = await lookupGstin(gstin);
      if (!details) throw new Error("not found");
      setAnswer("gst_bizname", details.legalName || A.gst_bizname || "");
      if (details.tradeName) setAnswer("gst_tradename", details.tradeName);
      if (details.status) {
        setAnswer("gst_regState", details.status);
        setAnswer("gst_verifiedStatus", details.status);
      }
      setStatus("done");
    } catch {
      setAnswer("gst_verifiedStatus", "");
      setStatus("error");
      setMessage("Couldn't verify that GSTIN right now — you can still continue and our team will confirm it manually.");
    }
  }

  function onChange(e) {
    const v = e.target.value.toUpperCase();
    setAnswer(f.k, v);
    setAnswer("gst_verifiedStatus", "");
    setStatus("idle");
    setMessage("");
    if (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/.test(v)) requireLead(state, bump, () => runLookup(v));
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}<ReqMark f={f} A={A} /></label>
      <div className="relative">
        <input
          className={inputCls(errors[f.k])}
          value={value}
          maxLength={15}
          onChange={onChange}
          placeholder={f.ph || ""}
        />
        {status === "loading" && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Verifying…</span>
        )}
      </div>
      <ErrorText msg={errors[f.k]} />
      {status === "done" && A.gst_bizname && (
        <div className="mt-2 text-xs rounded-lg border border-green-200 bg-green-50 text-green-800 px-3 py-2">
          ✓ Verified — <b>{A.gst_bizname}</b>{A.gst_verifiedStatus ? ` · ${A.gst_verifiedStatus}` : ""}
        </div>
      )}
      {status === "error" && (
        <div className="mt-2 text-xs rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2">{message}</div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Owners / Directors repeater
--------------------------------------------------------------------------- */
function OwnersBody({ A, state, errors, bump }) {
  const cfg = ownerConfig(A);
  const fields = ownerBaseFields(cfg);
  const n = state.owners.length;
  const capReached = !!(cfg.maxCount && n >= cfg.maxCount);
  const primaryLabel = cfg.label.split(" / ")[0];
  const shareTotal = state.owners.reduce((sum, o) => sum + (Number(o.shareholding) || 0), 0);

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
                        onChange={(e) => setOwnerField(i, f.k, e.target.value)} />
                    )}
                    <ErrorText msg={errors["owner" + i + "_" + f.k]} />
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
                  <input type="number" min="0" max="100" className={inputCls(errors["owner" + i + "_shareholding"])} value={o.shareholding || ""} onChange={(e) => setOwnerField(i, "shareholding", e.target.value)} placeholder="e.g. 50" />
                  <ErrorText msg={errors["owner" + i + "_shareholding"]} />
                </div>
              )}
              {cfg.capital && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Capital Contribution (₹){star}</label>
                  <input type="number" min="0" className={inputCls(errors["owner" + i + "_capital"])} value={o.capital || ""} onChange={(e) => setOwnerField(i, "capital", e.target.value)} placeholder="e.g. 50000" />
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
                          onChange={(e) => setOwnerNomineeField(i, f.k, e.target.value)} />
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
                      <span className="block text-xs text-gray-400 mt-0.5">Click to browse · PDF, JPG, PNG up to 5 MB</span>
                    )}
                    {uploadError[it] && <span className="block text-xs text-red-600 mt-0.5">⚠ {uploadError[it]}</span>}
                  </span>
                  <input type="file" className="hidden" disabled={isUploading} onChange={(e) => attach(it, e.target.files?.[0])} />
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
function NameCheckBody({ A, state, errors, setAnswer, bump }) {
  const names = [A.name1, A.name2, A.name3].map((n) => (n || "").trim()).filter((n, i, all) => n && all.findIndex((m) => m.toLowerCase() === n.toLowerCase()) === i);
  const result = nameCheckIsCurrent(A, state);
  function runCheck() {
    const name = (A.nc_target || "").trim();
    if (!name) return;
    // Sign-in gate: the result itself (available / similar / taken) only shows
    // once the applicant has verified their mobile — see requireLead().
    requireLead(state, bump, () => {
      const key = name.toLowerCase();
      state.nameChecks[key] = runNameCheckSim(name);
      bump();
    });
  }
  if (!A.nc_target && names.length) A.nc_target = names[0];
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-800 mb-1">Proposed Name</label>
      <input className={inputCls()} value={A.nc_target || ""} onChange={(e) => setAnswer("nc_target", e.target.value)} placeholder="Enter the name to check" />
      {names.length > 1 && (
        <div className="flex gap-2 flex-wrap mt-2">
          {names.map((n) => (
            <button key={n} type="button" onClick={() => setAnswer("nc_target", n)} className={`px-3 py-1.5 rounded-lg border text-sm ${A.nc_target === n ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>{n}</button>
          ))}
        </div>
      )}
      <button type="button" onClick={runCheck} className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">🔍 {result ? "Check Again" : "Check Availability"}</button>
      <ErrorText msg={errors.__namecheck} />
      {result && (
        <div className="mt-4">
          {result.status === "available" && <Note variant="ok" title="Name appears available" body={result.note + " This is subject to final approval by the Registrar / competent authority."} />}
          {result.status === "similar" && <Note variant="warn" title="Similar name found" body={result.note} />}
          {result.status === "not_suitable" && <Note variant="err" title="Name may not be available / suitable" body={result.note} />}
          {result.alternatives && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Suggested alternatives — click one to check it:</p>
              <div className="flex gap-2 flex-wrap">
                {result.alternatives.map((a) => (
                  <button key={a} type="button" onClick={() => setAnswer("nc_target", a)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm">{a}</button>
                ))}
              </div>
            </div>
          )}
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
  const accepted = A.br_objectiveAccepted === "Yes";
  const list = suggestedNicCodes(A);
  if (!A.br_nicCode && list.length) A.br_nicCode = list[0].code;
  return (
    <div>
      <div className="font-semibold text-sm text-gray-800">AI-generated business objective</div>
      <p className="text-xs text-gray-500 mb-2">Based on what you told us in the previous step. Edit freely, or regenerate from scratch.</p>
      <textarea rows={4} className={inputCls()} value={A.br_objective} onChange={(e) => setAnswer("br_objective", e.target.value)} />
      <div className="flex gap-2 flex-wrap mt-2">
        <button type="button" onClick={() => setAnswer("br_objective", generateBusinessObjective(A))} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold">✨ Rephrase Again</button>
        <button type="button" onClick={() => setAnswer("br_objectiveAccepted", accepted ? "No" : "Yes")}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${accepted ? "bg-blue-50 text-blue-700" : "bg-blue-600 text-white"}`}>
          ✓ {accepted ? "Objective Accepted" : "Accept Objective"}
        </button>
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
      syncCustomerCompany(state, A, bump, flow).finally(() => {
        const results = runTrademarkSearchSim(name, A.tm_class);
        state.tmSearch = { for: name.toLowerCase(), results, at: today() };
        A.tm_searchDone = "Yes";
        setSaving(false);
        bump();
      });
    });
  }
  return (
    <div>
      <FieldsBody step={step} A={A} errors={errors} setAnswer={setAnswer} state={state} bump={bump} liveStateNames={liveStateNames} />
      <p className="text-sm text-gray-700 mt-5 mb-3">We'll check the public register for identical or similar marks to <b>{A.tm_name || "your trademark"}</b> in {A.tm_class || "the selected class"}.</p>
      <button type="button" onClick={run} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">🔍 {saving ? "Saving your details…" : isCurrent ? "Run search again" : "Run Public Trademark Search"}</button>
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
  const govt = tmGovtFee(A);

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
  function search(text) {
    state.tmMarkSearch[text.trim().toLowerCase()] = runTrademarkSearchSim(text.trim(), A.tm_class);
    bump();
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
                      <button type="button" onClick={() => search(m.text)} className="text-xs font-semibold text-blue-600 hover:underline">🔍 {results ? "Search again" : "Run public search for this mark"}</button>
                      {risk && <div className="mt-2"><Note variant={risk.variant === "ok" ? "ok" : "warn"} title={`${results.length} similar mark(s) — risk: ${risk.level}`} body={risk.note} /></div>}
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
            body={`Each application: ${rupee(perApp.professionalFee)} professional fee + ${rupee(govt)} government fee (+ GST on the professional fee).${govt > 4500 ? " The ₹9,000 government fee applies to a company/LLP/partnership without MSME (Udyam) or Startup India registration." : ""}`} />
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
    } else if (s.type === "namecheck") {
      const r = nameCheckIsCurrent(A, state);
      const statusLabel = r ? { available: "Available", similar: "Similar name found", not_suitable: "May not be suitable" }[r.status] : "Not checked yet";
      rows.push(["Proposed name", A.nc_target || "—"]);
      rows.push(["Availability status", statusLabel]);
    } else if (s.type === "objective") {
      rows.push(["Business objective", A.br_objectiveAccepted === "Yes" ? (A.br_objective || "—") : "Not yet accepted"]);
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
      <Section title="Additional Services" rows={addons.length ? addons.map((a) => [a, rupee(ADDON_PRICE[a] || 999)]) : [["Selected Services", "None selected"]]} />
      <label className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4 cursor-pointer">
        <input type="checkbox" className="mt-0.5 w-4 h-4 accent-blue-600" checked={state.confirmed} onChange={(e) => onConfirm(e.target.checked)} />
        <span className="text-sm font-medium">I confirm that the information provided is correct and that I am authorised to submit this application.</span>
      </label>
      <ErrorText msg={errors.__confirm} />
    </div>
  );
}

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
  const lines = [
    line(state?.serviceType || flow.name, serviceId, flow.price, flow.govt),
    ...addons.map((a) => line(a, ADDON_SERVICE_ID[a] || null, ADDON_PRICE[a] || 999, 0)),
  ];
  const sum = (k) => lines.reduce((s, l) => s + l[k], 0);
  const addonLines = lines.slice(1).map((l) => [l.name, l.professionalFee]);
  return {
    lines,
    service: flow.price,
    addonLines,
    addonTotal: addonLines.reduce((s, l) => s + l[1], 0),
    govt: flow.govt,
    gst: sum("gstAmount"),
    cgst: sum("cgst"),
    sgst: sum("sgst"),
    igst: sum("igst"),
    gstEligible,
    total: sum("total"),
  };
}

// Load (once) whether this application's franchisee charges GST, and its state
// for the CGST/SGST vs IGST split — see feeLines().
async function ensureGstInfo(state) {
  const franchiseeId = state.leadContact?.franchiseeId;
  if (state.gstInfo || !franchiseeId) return;
  state.gstInfo = await fetchFranchiseeGstInfo(franchiseeId);
}
const PAY_METHODS = [
  ["UPI / QR", "Instant confirmation"],
  ["Credit or Debit Card", "Visa, Mastercard, RuPay"],
  ["Net Banking", "All major banks"],
  ["Wallet", "Paytm, PhonePe, Amazon Pay"],
  [CALLBACK_METHOD, "Our advisor will call you to go over the quote and payment"],
];

/* ---------------------------------------------------------------------------
   Packages — between Review and Payment. Offers the subscription packages
   (same backend data as the Subscription "Package Plans" page) for the
   business type chosen here, matched by name against ServiceType, then lets
   the applicant either go on to Payment or request a call instead.
--------------------------------------------------------------------------- */
const normName = (s) => String(s || "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");
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
    A.selectedPackage = selectedId === id ? null : { id, name: p.PackageName || p.name, price: Number(p.YearlyMRP || p.price || 0) };
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
                <div className="text-lg font-bold mt-1">{rupee(Number(p.YearlyMRP || p.price || 0))}<span className="text-xs font-normal text-gray-500"> / year</span></div>
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
            {state.__paying ? "Submitting…" : "📞 Request a Call"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Requesting a call saves your quote — one of our advisors will call you. Nothing is charged now.</p>
        <button onClick={onBack} className="w-full mt-3 py-2.5 rounded-lg text-gray-500 text-sm font-semibold hover:bg-gray-50">← Back</button>
      </div>
    </div>
  );
}

function PaymentBody({ flow, A, state, bump, onPay, onCallback, onBack }) {
  useEffect(() => {
    if (!state.gstInfo) ensureGstInfo(state).then(bump).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const f = feeLines(flow, A, state);
  const wantsCallback = A.payMethod === CALLBACK_METHOD;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
      <div className="border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold mb-2">Fee summary</h3>
        {A.selectedPackage && <div className="mb-3"><Note variant="info" body={`Package selected: ${A.selectedPackage.name} (${rupee(A.selectedPackage.price)} / year). Our team will add it to your quote — it isn't included in the total below.`} /></div>}
        <div className="text-xs font-bold uppercase text-blue-600 mt-3 mb-1">Service charges</div>
        <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span>{state.serviceType} — professional fee</span><b>{rupee(f.service)}</b></div>
        {f.addonLines.length > 0 && <div className="text-xs font-bold uppercase text-blue-600 mt-3 mb-1">Additional services</div>}
        {f.addonLines.map(([name, amt]) => (
          <div key={name} className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span>{name}</span><b>{rupee(amt)}</b></div>
        ))}
        <div className="text-xs font-bold uppercase text-blue-600 mt-3 mb-1">Government fees</div>
        <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span>Statutory / filing fees{f.govt ? "" : " (none for this service)"}</span><b>{rupee(f.govt)}</b></div>
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
      </div>
      <div className="border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold mb-3">Payment method</h3>
        <div className="flex flex-col gap-2">
          {PAY_METHODS.map(([m, sub]) => (
            <OptionButton key={m} selected={(A.payMethod || "UPI / QR") === m} onClick={() => { A.payMethod = m; bump(); }}>
              {m}<span className="block font-normal text-xs text-gray-500">{sub}</span>
            </OptionButton>
          ))}
        </div>
        {wantsCallback ? (
          <>
            <div className="mt-4"><Note variant="info" body="We'll save your quote and one of our advisors will call you shortly. Nothing is charged now." /></div>
            <button onClick={onCallback} disabled={state.__paying} className="w-full mt-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm disabled:opacity-60">
              {state.__paying ? "Submitting…" : "📞 Request a Call Back →"}
            </button>
          </>
        ) : (
          <>
            <div className="mt-4"><Note variant="info" body="Opens your quote in a new tab to accept, verify, and choose how to pay. A GST invoice is emailed as soon as the payment succeeds." /></div>
            <button onClick={onPay} className="w-full mt-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm">🔒 Review &amp; Approve Quote →</button>
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
          ? "Thanks! Your application and quote are saved. One of our advisors will call you shortly to go over the quote and help you with payment."
          : "Your application has been received and is being processed. We've emailed a confirmation with your next steps."}
      </p>
      <div className="text-left border border-gray-200 rounded-lg p-4 mt-5">
        <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span className="text-gray-500">Service</span><b>{s.service || state.serviceType}</b></div>
        <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span className="text-gray-500">Application ID</span><b className="font-mono">{s.id || ""}</b></div>
        <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span className="text-gray-500">Submission Date</span><b>{s.date || today()}</b></div>
        <div className="flex justify-between text-sm py-2"><span className="text-gray-500">{s.callback ? "Quote Amount" : "Amount Paid"}</span><b>{s.amount || ""}</b></div>
      </div>
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

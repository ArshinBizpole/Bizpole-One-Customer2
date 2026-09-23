import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import CryptoJS from "crypto-js";
import { getSecureItem, setSecureItem, removeSecureItem } from "../../utils/secureStorage";
import { lookupGstin } from "../../api/GstinLookup";
import { assignCustomer } from "../../api/CustomerApi";
import { createLead, createCustomerCompany, convertLeadToDeal, createQuoteForApplication, uploadApplicationDocument, removeApplicationDocument } from "../../api/LeadApi";
import { getAllStates } from "../../api/States";
import { loginWithPhone, signupWithPhone, verifyOtp } from "../../api/AuthApi";
import { notifyTokenSet } from "../../utils/authSession";
import {
  FLOWS, ownerConfig, ownerBaseFields, newOwner, visibleFields, docItems, docGroups, isMinor,
  fieldError, today, rupee, newApplicationId, ADDON_PRICE,
  recommendBusinessType, suggestedBusinessNames, runNameCheckSim,
  generateBusinessObjective, suggestedNicCodes, tmClassMatches,
  selectedNiceClass, runTrademarkSearchSim, tmRiskLevel, NICE_CLASSES,
} from "./existingCompanyData";

const STORAGE_KEY = "existingCompanyFlowState";
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

// Once the applicant has entered real director/company details (the
// Directors/Shareholders step), create/link their Customer + Company records.
// No deal is created here — that stays gated behind convert-to-deal, once
// service details are known. Non-blocking: failure never stops the applicant
// from continuing, same rationale as lead capture (requireLead above).
function syncCustomerCompany(state, A, bump) {
  if (state.companyId || !state.leadContact) return; // already synced, or no contact captured yet
  const companyName = (A.nc_target || A.name1 || "").trim();
  if (!companyName) return;
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
  createCustomerCompany({
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
      constitutionCategory: A.businessType,
      sector: A.activity,
      businessNature: A.activityDesc,
      // AI Business Objective & NIC Code step.
      nicCode: A.br_nicCode,
      businessObjective: A.br_objective,
      // Business Address step (addressFields("", ...) — unprefixed keys).
      country: A.country || state.leadContact.country,
      state: A.state || state.leadContact.state,
      district: A.district,
      city: A.city,
      pincode: A.pincode,
      addressLine1: A.addr1,
      addressLine2: A.addr2,
      directors,
    },
    franchiseeId: state.leadContact.franchiseeId,
  })
    .then((res) => {
      state.customerId = res?.data?.customerId || null;
      state.companyId = res?.data?.companyId || null;
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
function allSteps(flowId, A) {
  return contentSteps(flowId, A).concat([
    { id: "__review", title: "Review", type: "review" },
    { id: "__payment", title: "Payment", type: "payment" },
    { id: "__success", title: "Submitted", type: "success" },
  ]);
}

function validateStep(step, A, state) {
  const errors = {};
  if (step.type === "owners") {
    const cfg = ownerConfig(A);
    const n = state.owners.length;
    if (!n) errors.__owners = `Add at least ${cfg.minCount === 1 ? "1 person" : cfg.minCount + " people"}`;
    else if (n < cfg.minCount) errors.__owners = `${cfg.label} needs at least ${cfg.minCount} ${cfg.minCount === 1 ? "person" : "people"}. Currently: ${n}.`;
    else if (cfg.maxCount && n > cfg.maxCount) errors.__owners = `${cfg.label} allows at most ${cfg.maxCount}. Currently: ${n}.`;
    const fields = ownerBaseFields(cfg);
    state.owners.forEach((o, i) => {
      const minor = isMinor(o.dob);
      fields.forEach((f) => {
        // A minor often has no PAN/email/mobile of their own yet — their nominee/
        // guardian's details (validated separately below) cover that instead.
        const relaxed = minor && MINOR_OPTIONAL_FIELDS.includes(f.k);
        const e = fieldError({ required: !relaxed, pattern: f.pattern }, o[f.k]);
        if (e) errors["owner" + i + "_" + f.k] = e;
      });
      const roleErr = fieldError({ required: true }, o.role);
      if (roleErr) errors["owner" + i + "_role"] = roleErr;
      // A minor can't legally hold a DIN/DPIN, so don't ask.
      if (cfg.hasDIN && !minor) {
        const dk = fieldError({ required: true }, o.dinKnown);
        if (dk) errors["owner" + i + "_dinKnown"] = dk;
        if (o.dinKnown === "Yes") {
          const de = fieldError({ required: true }, o.din);
          if (de) errors["owner" + i + "_din"] = de;
        }
      }
      if (cfg.shareholding) {
        const se = fieldError({ required: true }, o.shareholding);
        if (se) errors["owner" + i + "_shareholding"] = se;
      }
      if (cfg.capital) {
        const ce = fieldError({ required: true }, o.capital);
        if (ce) errors["owner" + i + "_capital"] = ce;
      }
      if (minor) {
        fields.forEach((f) => {
          const e = fieldError({ required: true, pattern: f.pattern }, (o.nominee || {})[f.k]);
          if (e) errors["owner" + i + "_nominee_" + f.k] = e;
        });
      }
    });
    if (cfg.shareholding && n) {
      const total = state.owners.reduce((sum, o) => sum + (Number(o.shareholding) || 0), 0);
      if (total !== 100) errors.__shareholding = `Shareholding must total 100%. Current total: ${total}%.`;
    }
  } else if (step.type === "docs") {
    const items = docItems(step, A, state);
    const any = items.some((it) => state.documents[it]);
    if (!any) errors.__docs = "Upload at least one document to continue";
    const logoItem = "Logo Artwork (PNG / JPG)";
    if (items.includes(logoItem) && !state.documents[logoItem]) {
      errors.__docs = 'Logo artwork is required since you selected "Logo" to protect — upload it to continue';
    }
    const msmeItem = "MSME / Startup Certificate";
    if (items.includes(msmeItem) && !state.documents[msmeItem]) {
      errors.__docs = "MSME / Startup certificate is required since you said you have MSME (Udyam) or Startup India registration — upload it to continue";
    }
  } else if (step.type === "namecheck") {
    if (!nameCheckIsCurrent(A, state)) errors.__namecheck = "Check name availability to continue";
  } else if (step.type === "objective") {
    if (A.br_objectiveAccepted !== "Yes") errors.br_objective = "Please review and accept the business objective to continue";
    if (!A.br_nicCode) errors.br_nicCode = "Select a NIC code to continue";
  } else if (step.type === "tmSearch") {
    if (!tmSearchIsCurrent(A, state)) errors.__search = "Run the public trademark search to continue";
  } else {
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
    if (step.id === "proceed" && A.tm_proceed === "No, I want to choose a different name") {
      errors.tm_proceed = "Go back and update the trademark name, or select 'Yes, proceed' to continue.";
    }
  }
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

export default function FlowRunner({ flowId, initialSet, onExit, onComplete, homeLabel, nextLabel }) {
  // Namespaced per flowId — this same FlowRunner backs every entry in FLOWS
  // (New Company, GST, Trademark, MSME, IEC, Existing Company, ...). A single
  // shared key here would let starting/resuming one flow silently wipe
  // whatever progress was saved for a different one.
  const storageKey = `${STORAGE_KEY}_${flowId}`;
  const appRef = useRef(null);
  if (appRef.current === null) {
    const saved = getSecureItem(storageKey);
    appRef.current = saved && saved.flowId === flowId ? saved : freshState(flowId, initialSet);
  }
  const [, rerender] = useReducer((c) => c + 1, 0);
  const errorsRef = useRef({});

  function persist() {
    setSecureItem(storageKey, appRef.current);
  }
  function bump() {
    persist();
    rerender();
  }
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
  const total = steps.length - 1; // success not counted
  const shown = Math.min(stepIndex + 1, total);
  const pct = total > 1 ? Math.round((Math.min(stepIndex, total - 1) / (total - 1)) * 100) : 0;
  // Once Documents is actually completed (not just reached — the required
  // document(s) must be uploaded), let the applicant jump straight to account
  // setup / the dashboard instead of grinding through Additional Registrations,
  // Review and Payment right now — they can always come back and finish this
  // application later. Every step before Documents is already guaranteed valid
  // by this point, since goNext() never advances past a step that fails
  // validateStep() — Documents itself is the one step the "Skip" button could
  // otherwise bypass without ever being validated.
  const docsIndex = steps.findIndex((s) => s.type === "docs");
  const docsStep = docsIndex !== -1 ? steps[docsIndex] : null;
  const docsComplete = !!docsStep && !validateStep(docsStep, A, state).__docs;
  const canSkipToDashboard = !!onComplete && docsIndex !== -1 && stepIndex >= docsIndex && docsComplete;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stepIndex]);

  function goNext() {
    const errors = validateStep(step, A, state);
    if (step.type === "review" && !state.confirmed) errors.__confirm = "Please confirm before proceeding";
    if (Object.keys(errors).length) {
      errorsRef.current = errors;
      bump();
      return;
    }
    errorsRef.current = {};
    if (step.type === "owners") {
      // Deal creation needs the Customer/Company this same step just synced (for
      // existingCustomerId/existingCompanyId) — chain it after that sync resolves,
      // rather than waiting for Documents, so a Deal already exists well before
      // the applicant gets there. syncCustomerCompany() returns undefined (not a
      // promise) whenever the Customer/Company was already synced on an earlier
      // pass through this step — that's not a failure, so still attempt the Deal
      // afterward either way; createDealForApplication() has its own guard against
      // creating a second one.
      const synced = syncCustomerCompany(state, A, bump);
      const afterSync = synced && typeof synced.then === "function" ? synced : Promise.resolve();
      afterSync.then(() => createDealForApplication(flow, state, A, bump));
    }
    state.stepIndex = Math.min(state.stepIndex + 1, steps.length - 1);
    bump();
  }
  function goBack() {
    if (stepIndex === 0) {
      if (window.confirm("Leave this application? Your answers on this application will be discarded.")) {
        removeSecureItem(storageKey);
        onExit();
      }
      return;
    }
    errorsRef.current = {};
    state.stepIndex -= 1;
    bump();
  }
  function jumpTo(i) {
    if (i < stepIndex) {
      state.stepIndex = i;
      bump();
    }
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
      <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-4 flex-wrap">
        <button onClick={goBack} className="hover:text-blue-600 hover:underline">{homeLabel || "Existing Company"}</button>
        <span>›</span>
        <span className="text-gray-800 font-medium">{state.serviceType}</span>
      </nav>

      {step.type === "success" ? (
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
                {steps.slice(0, -1).map((s, i) => (
                  <li key={s.id} className={`flex items-center gap-2.5 py-1.5 text-sm ${i === stepIndex ? "text-blue-700 font-semibold" : i < stepIndex ? "text-gray-800" : "text-gray-400"}`}>
                    <span className={`flex-none w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                      i < stepIndex ? "bg-green-500 border-green-500 text-white" : i === stepIndex ? "border-blue-500 text-blue-600" : "border-gray-200"
                    }`}>
                      {i < stepIndex ? "✓" : i + 1}
                    </span>
                    {i < stepIndex ? (
                      <button onClick={() => jumpTo(i)} className="hover:underline text-left">{s.title}</button>
                    ) : <span>{s.title}</span>}
                  </li>
                ))}
              </ul>
              <button onClick={goBack} className="mt-4 w-full text-xs text-gray-400 hover:text-red-600 py-1.5">✕ Cancel application</button>
            </div>
          </aside>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-6">
            <div className="mb-5">
              <div className="text-xs font-bold tracking-wide uppercase text-blue-600">Step {shown} of {total}</div>
              <h2 className="text-xl font-semibold text-gray-900 mt-1">{step.title}</h2>
            </div>

            {step.type === "review" && <ReviewBody flowId={flowId} A={A} state={state} errors={errorsRef.current} onConfirm={(v) => { state.confirmed = v; bump(); }} onJump={jumpTo} />}
            {step.type === "payment" && <PaymentBody flow={flow} A={A} state={state} bump={bump} onPay={() => doPay(flow, state, bump)} onBack={goBack} />}
            {step.type === "owners" && <OwnersBody A={A} state={state} errors={errorsRef.current} bump={bump} />}
            {step.type === "docs" && <DocsBody step={step} A={A} state={state} errors={errorsRef.current} bump={bump} />}
            {step.type === "namecheck" && <NameCheckBody A={A} state={state} errors={errorsRef.current} setAnswer={setAnswer} bump={bump} />}
            {step.type === "objective" && <ObjectiveBody A={A} errors={errorsRef.current} setAnswer={setAnswer} />}
            {step.type === "aiClassFinder" && <AiClassFinderBody A={A} setAnswer={setAnswer} state={state} bump={bump} />}
            {step.type === "tmClassConfirm" && <TmClassConfirmBody A={A} onChangeClass={() => { state.stepIndex = steps.findIndex((s) => s.id === "recommend"); bump(); }} />}
            {step.type === "tmSearch" && <TmSearchBody A={A} state={state} errors={errorsRef.current} setAnswer={setAnswer} bump={bump} />}
            {step.type === "tmResults" && <TmResultsBody A={A} state={state} />}
            {!step.type && <FieldsBody step={step} A={A} errors={errorsRef.current} setAnswer={setAnswer} state={state} bump={bump} />}

            {step.type !== "payment" && (
              <div className="flex items-center justify-between gap-3 mt-7 pt-5 border-t border-gray-100">
                <button onClick={goBack} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50">← Back</button>
                <div className="flex items-center gap-3">
                  {canSkipToDashboard && (
                    <button onClick={() => onComplete()} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-50">
                      Skip for now — set up your account
                    </button>
                  )}
                  <button onClick={goNext} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700">
                    {step.type === "review" ? "Proceed to Payment →" : "Continue →"}
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
  const f = feeLines(flow, A);
  const addons = Array.isArray(A.additionalServices) ? A.additionalServices : [];
  // Real ServiceMaster ServiceID for this line, when one exists (see
  // existingCompanyData.js) — needed so the Quote's saved line item can
  // actually be priced/approved on the Quote review page later, instead of
  // getting ServiceID: null (and, from there, no matching pricing at all).
  const serviceId = typeof flow.serviceIdFor === "function" ? flow.serviceIdFor(A) : flow.serviceId || null;
  return [
    {
      serviceName: state.serviceType,
      serviceId,
      professionalFee: f.service,
      governmentFee: f.govt,
      gstAmount: f.gst,
      total: f.service + f.govt + f.gst,
    },
    ...addons.map((name) => ({
      serviceName: name,
      professionalFee: ADDON_PRICE[name] || 999,
      governmentFee: 0,
      gstAmount: 0,
      total: ADDON_PRICE[name] || 999,
    })),
  ];
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
async function createDealForApplication(flow, state, A, bump) {
  if (state.dealId || !state.leadContact) return; // already converted, or no lead captured
  const companyName = (A.nc_target || A.name1 || "").trim();
  const ServiceDetails = serviceDetailsFor(flow, A, state);
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
        country: A.country || state.leadContact.country,
        state: A.state || state.leadContact.state,
      },
      franchiseeId: state.leadContact.franchiseeId,
      employeeId: state.leadContact.employeeId,
      isIndividual: 1,
      ServiceDetails,
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
  const companyName = (A.nc_target || A.name1 || "").trim();
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
  const f = feeLines(flow, state.answers);
  state.__paying = true;
  bump();
  // Opened synchronously, still inside the click's call stack — see
  // openQuoteForApproval() for why this can't wait until after the Quote
  // creation call below.
  const approvalTab = window.open("", "_blank");
  await createQuoteForApplicationStep(flow, state, state.answers);
  openQuoteForApproval(state, approvalTab);
  setTimeout(() => {
    const id = newApplicationId(flow.code);
    state.submitted = { id, service: state.serviceType, date: today(), amount: rupee(f.total) };
    state.__paying = false;
    state.stepIndex = allSteps(state.flowId, state.answers).length - 1;
    bump();
  }, 1100);
}

const LEAD_LANGUAGES = [
  { label: "English", value: "english" }, { label: "Hindi", value: "hindi" },
  { label: "Marathi", value: "marathi" }, { label: "Tamil", value: "tamil" },
  { label: "Telugu", value: "telugu" }, { label: "Gujarati", value: "gujarati" },
  { label: "Bengali", value: "bengali" }, { label: "Kannada", value: "kannada" },
  { label: "Malayalam", value: "malayalam" },
];

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
  const [form, setForm] = useState({ name: "", mobile: "", email: "", country: "India", state: "", language: "" });
  // phase: "intro" (why sign up) -> "details" (contact form) -> "otp" (verify code) -> "done" (auto-continues)
  const [phase, setPhase] = useState("intro");
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
    try {
      const assignment = await assignCustomer({ language: form.language, state: form.state, district: form.state });
      const res = await createLead({
        name: form.name.trim(),
        state: form.state,
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        proposed_service: state.serviceType,
        preferred_language: form.language,
        lead_source: `startbusiness-${state.flowId}`,
        franchiseeId: assignment?.franchiseeId,
      });
      state.leadContact = {
        ...form,
        leadId: res?.lead?.id || null,
        franchiseeId: assignment?.franchiseeId || null,
        employeeId: res?.assignedEmployeeId || null,
      };
    } catch (err) {
      console.error("Lead capture failed (non-fatal — already signed in):", err);
      state.leadContact = { ...form, leadId: null, franchiseeId: null, employeeId: null };
    }
    state.leadCaptured = true;
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
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Sign up to view your results</h3>
            <p className="text-sm text-gray-600 mb-5">
              Sign up to see your result — quick mobile verification, and your application stays saved to your account.
            </p>
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
                <input
                  className={inputCls()}
                  value={form.mobile}
                  onChange={(e) => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
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
                  {states.map((s) => <option key={s.id || s.state_code || s.state_name} value={s.state_name}>{s.state_name}</option>)}
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
function FieldsBody({ step, A, errors, setAnswer, state, bump }) {
  const fields = visibleFields(step, A);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map((f, i) => (
        <div key={f.k || i} className={f.full || ["cards", "checks", "note", "textarea", "helpChoose", "suggestNames", "tmRisk"].includes(f.type) ? "sm:col-span-2" : ""}>
          <Field f={f} A={A} errors={errors} setAnswer={setAnswer} state={state} bump={bump} />
        </div>
      ))}
    </div>
  );
}

function Field({ f, A, errors, setAnswer, state, bump }) {
  if (f.type === "helpChoose") return <HelpChoose A={A} setAnswer={setAnswer} state={state} bump={bump} />;
  if (f.type === "suggestNames") return <SuggestNames A={A} setAnswer={setAnswer} state={state} bump={bump} />;
  if (f.type === "tmRisk") return <TmRiskNote A={A} state={state} />;
  if (f.type === "gstinLookup") return <GstinLookupField f={f} A={A} errors={errors} setAnswer={setAnswer} state={state} bump={bump} />;
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
            <input className={inputCls(errors[f.k + "__other"])} value={A[f.k + "__other"] || ""} onChange={(e) => setAnswer(f.k + "__other", e.target.value)} placeholder="Tell us more" />
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
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}<ReqMark f={f} A={A} /></label>
        {f.hint && <p className="text-xs text-gray-500 mb-1">{f.hint}</p>}
        <select className={inputCls(errors[f.k])} value={A[f.k] || ""} onChange={(e) => setAnswer(f.k, e.target.value)}>
          <option value="">Select…</option>
          {f.opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
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

  function addOwner() { if (!capReached) { state.owners.push(newOwner()); bump(); } }
  function removeOwner(i) { state.owners.splice(i, 1); bump(); }
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
      </div>

      <div className="space-y-4">
        {state.owners.map((o, i) => {
          const minor = isMinor(o.dob);
          return (
          <div key={i} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <div className="flex items-center justify-between mb-3">
              <b className="flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                {o.name || `${primaryLabel} ${i + 1}`}
              </b>
              {cfg.maxCount !== 1 && n > 1 && <button onClick={() => removeOwner(i)} className="text-xs text-red-500 hover:underline">Remove</button>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fields.map((f) => {
                const optional = minor && MINOR_OPTIONAL_FIELDS.includes(f.k);
                return (
                  <div key={f.k} className={f.full ? "sm:col-span-2" : ""}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}{!optional && <span className="text-red-500">*</span>}{optional && <span className="text-gray-400 font-normal"> (optional)</span>}</label>
                    <input type={f.type} className={inputCls(errors["owner" + i + "_" + f.k])} value={o[f.k] || ""} placeholder={f.ph || ""}
                      onChange={(e) => setOwnerField(i, f.k, e.target.value)} />
                    <ErrorText msg={errors["owner" + i + "_" + f.k]} />
                  </div>
                );
              })}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role<span className="text-red-500">*</span></label>
                <select className={inputCls(errors["owner" + i + "_role"])} value={o.role || ""} onChange={(e) => setOwnerField(i, "role", e.target.value)}>
                  <option value="">Select…</option>
                  {rolesFor(cfg, minor).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <ErrorText msg={errors["owner" + i + "_role"]} />
                {minor && cfg.hasDIN && <p className="text-[11px] text-gray-400 mt-1">Director-type roles are hidden — a minor can't hold a DIN.</p>}
              </div>
              {cfg.hasDIN && !minor && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Do you already have a {cfg.dinLabel}?<span className="text-red-500">*</span></label>
                  <select className={inputCls(errors["owner" + i + "_dinKnown"])} value={o.dinKnown || ""} onChange={(e) => setOwnerField(i, "dinKnown", e.target.value)}>
                    <option value="">Select…</option>
                    {["Yes", "No", "Not Sure"].map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                  <ErrorText msg={errors["owner" + i + "_dinKnown"]} />
                </div>
              )}
              {cfg.hasDIN && !minor && o.dinKnown === "Yes" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{cfg.dinLabel}<span className="text-red-500">*</span></label>
                  <input className={inputCls(errors["owner" + i + "_din"])} value={o.din || ""} onChange={(e) => setOwnerField(i, "din", e.target.value)} placeholder="e.g. 08123456" />
                  <ErrorText msg={errors["owner" + i + "_din"]} />
                </div>
              )}
              {cfg.shareholding && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Shareholding %<span className="text-red-500">*</span></label>
                  <input type="number" min="0" max="100" className={inputCls(errors["owner" + i + "_shareholding"])} value={o.shareholding || ""} onChange={(e) => setOwnerField(i, "shareholding", e.target.value)} placeholder="e.g. 50" />
                  <ErrorText msg={errors["owner" + i + "_shareholding"]} />
                </div>
              )}
              {cfg.capital && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Capital Contribution (₹)<span className="text-red-500">*</span></label>
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
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nominee {f.label}<span className="text-red-500">*</span></label>
                      <input type={f.type} className={inputCls(errors["owner" + i + "_nominee_" + f.k])} value={(o.nominee || {})[f.k] || ""} placeholder={f.ph || ""}
                        onChange={(e) => setOwnerNomineeField(i, f.k, e.target.value)} />
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
    if (state.leadContact?.leadId) {
      removeApplicationDocument({ leadId: state.leadContact.leadId, docLabel: it }).catch((err) => {
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
function HelpChoose({ A, setAnswer, state, bump }) {
  if (!state.helpChooseOpen) {
    return <button type="button" onClick={() => { state.helpChooseOpen = true; bump(); }} className="text-sm font-semibold text-blue-600 hover:underline">🧭 Not sure which one to choose? Help Me Choose</button>;
  }
  const rec = recommendBusinessType(A);
  const Q = ({ k, label, opts }) => (
    <div className="mt-3">
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="flex gap-2 flex-wrap mt-1.5">
        {opts.map((o) => (
          <button key={o} type="button" onClick={() => setAnswer(k, o)}
            className={`px-3 py-1.5 rounded-lg border text-sm ${A[k] === o ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200"}`}>{o}</button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <b className="text-sm">Help Me Choose</b> — answer a few quick questions and we'll recommend a suitable structure.
      <Q k="hc_owners" label="How many owners will the business have?" opts={["Just me", "2 or more"]} />
      <Q k="hc_liability" label="Do you want to limit your personal liability?" opts={["Yes, limit my liability", "No preference"]} />
      <Q k="hc_investment" label="Do you plan to raise outside investment / funding?" opts={["Yes", "No"]} />
      <Q k="hc_legal" label="Do you need the business to have a separate legal identity from you?" opts={["Yes", "No, keep it simple"]} />
      {rec && (
        <div className="mt-3 p-3 bg-white border-2 border-blue-500 rounded-lg">
          <b className="text-blue-700">Recommended: {rec}</b>
          <p className="text-xs text-gray-500 mt-1">Based on your answers. Our advisor will verify the appropriate structure before filing.</p>
          <button type="button" onClick={() => setAnswer("businessType", rec)} className="mt-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold">✓ Use This Structure</button>
        </div>
      )}
      <button type="button" onClick={() => { state.helpChooseOpen = false; bump(); }} className="mt-3 text-sm text-gray-500 hover:underline">Close</button>
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
  const names = [A.name1, A.name2, A.name3].filter((n) => n && n.trim());
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
function TmSearchBody({ A, state, errors, bump }) {
  const isCurrent = tmSearchIsCurrent(A, state);
  function run() {
    const name = (A.tm_name || "").trim();
    if (!name) return;
    requireLead(state, bump, () => {
      const results = runTrademarkSearchSim(name, A.tm_class);
      state.tmSearch = { for: name.toLowerCase(), results, at: today() };
      A.tm_searchDone = "Yes";
      bump();
    });
  }
  return (
    <div>
      <p className="text-sm text-gray-700 mb-3">We'll check the public register for identical or similar marks to <b>{A.tm_name || "your trademark"}</b> in {A.tm_class || "the selected class"}.</p>
      <button type="button" onClick={run} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">🔍 {isCurrent ? "Run search again" : "Run Public Trademark Search"}</button>
      {isCurrent && <div className="mt-3"><Note variant="info" body="Search completed. Continue to view the results." /></div>}
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
      <Note variant="warn" body={`${r.length} potentially similar trademark(s) found in the public register. Review the assessment on the next step.`} />
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

function feeLines(flow, A) {
  const addons = Array.isArray(A.additionalServices) ? A.additionalServices : [];
  const addonLines = addons.map((a) => [a, ADDON_PRICE[a] || 999]);
  const service = flow.price;
  const addonTotal = addonLines.reduce((s, l) => s + l[1], 0);
  const govt = flow.govt;
  const sub = service + addonTotal + govt;
  const gst = Math.round((service + addonTotal) * 0.18);
  return { service, addonLines, addonTotal, govt, gst, total: sub + gst };
}
function PaymentBody({ flow, A, state, bump, onPay, onBack }) {
  const f = feeLines(flow, A);
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
        <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span>Statutory / filing fees{f.govt ? "" : " (none for this service)"}</span><b>{rupee(f.govt)}</b></div>
        <div className="text-xs font-bold uppercase text-blue-600 mt-3 mb-1">Taxes</div>
        <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span>GST @ 18% on professional fees</span><b>{rupee(f.gst)}</b></div>
        <div className="flex justify-between text-base font-bold pt-3"><span>Total Amount</span><span>{rupee(f.total)}</span></div>
        <p className="text-xs text-gray-400 mt-3">🔒 You'll review and approve this quote (with OTP verification) before any payment is taken.</p>
      </div>
      <div className="border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold mb-3">Payment method</h3>
        <div className="flex flex-col gap-2">
          {["UPI / QR", "Credit or Debit Card", "Net Banking", "Wallet"].map((m, i) => (
            <OptionButton key={m} selected={(A.payMethod || "UPI / QR") === m} onClick={() => { A.payMethod = m; bump(); }}>
              {m}<span className="block font-normal text-xs text-gray-500">{["Instant confirmation", "Visa, Mastercard, RuPay", "All major banks", "Paytm, PhonePe, Amazon Pay"][i]}</span>
            </OptionButton>
          ))}
        </div>
        <div className="mt-4"><Note variant="info" body="Opens your quote in a new tab to accept, verify, and choose how to pay. A GST invoice is emailed as soon as the payment succeeds." /></div>
        <button onClick={onPay} className="w-full mt-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm">🔒 Review &amp; Approve Quote →</button>
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
      <h1 className="text-2xl font-bold text-gray-900">Application Submitted Successfully</h1>
      <p className="text-gray-500 mt-2">Your application has been received and is being processed. We've emailed a confirmation with your next steps.</p>
      <div className="text-left border border-gray-200 rounded-lg p-4 mt-5">
        <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span className="text-gray-500">Service</span><b>{s.service || state.serviceType}</b></div>
        <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span className="text-gray-500">Application ID</span><b className="font-mono">{s.id || ""}</b></div>
        <div className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100"><span className="text-gray-500">Submission Date</span><b>{s.date || today()}</b></div>
        <div className="flex justify-between text-sm py-2"><span className="text-gray-500">Amount Paid</span><b>{s.amount || ""}</b></div>
      </div>
      {onComplete ? (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={onRetryPayment} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50">← Back</button>
          {/* Doesn't clear storage: real payment/approval now happens on the Quote
              page in the other tab, not synchronously here — the applicant may
              still need to come back and finish it, so this application stays
              recoverable until they explicitly start a new one. */}
          <button onClick={() => onComplete(s)} className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold">
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

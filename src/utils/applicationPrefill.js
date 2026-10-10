import { getSecureItem } from "./secureStorage";
import { FLOWS, STATES, BIZ_TYPES, LEAD_LANGUAGES } from "../components/ExixistingCompany/existingCompanyData";

// Same prefix FlowRunner saves each flow's progress under (`${STORAGE_KEY}_${flowId}`).
const FLOW_STATE_PREFIX = "existingCompanyFlowState_";

function readUser() {
  try {
    const raw = getSecureItem("user");
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

// Contact details of the signed-in Customer (a website `token` + the cached
// `user` payload), or null when nobody is signed in. Used to prefill the
// application flows' contact forms and to skip their sign-up/OTP modal.
export function signedInContact() {
  if (!localStorage.getItem("token")) return null;
  const user = readUser();
  if (!user?.CustomerID) return null;
  return {
    customerId: user.CustomerID,
    name: `${user.FirstName || ""} ${user.LastName || ""}`.trim(),
    mobile: String(user.Mobile || user.mobile || "").replace(/\D/g, "").slice(-10),
    email: user.Email || user.email || "",
    country: user.Country || "India",
    state: STATES.includes(user.State) ? user.State : "",
    language: user.PreferredLanguage || user.Language || "",
  };
}

// The cached Company row for `companyId`, off the signed-in `user` payload.
export function cachedCompany(companyId) {
  if (!companyId) return null;
  const user = readUser();
  return (user?.Companies || []).find((c) => String(c.CompanyID) === String(companyId)) || null;
}

// Existing Company flow answers (the shared `ex_*` keys every ex-* flow uses)
// prefilled from a Company the customer already has, plus their own contact.
// Only fields we actually have are set — the rest stay blank for them to fill.
export function existingCompanyAnswers(company, contact) {
  const A = {};
  const put = (k, v) => { if (v !== undefined && v !== null && String(v).trim() !== "") A[k] = String(v).trim(); };
  if (company) {
    put("ex_name", company.BusinessName || company.CompanyName);
    put("ex_regno", company.CIN);
    put("ex_gstin", company.GSTNumber);
    if (STATES.includes(company.State)) A.ex_state = company.State;
    const cat = String(company.ConstitutionCategory || "").toLowerCase();
    const biz = cat && BIZ_TYPES.find((t) => t !== "Other" && t.toLowerCase().startsWith(cat.split(/[\s(]/)[0]));
    if (biz) A.ex_biztype = biz;
  }
  if (contact) {
    put("ex_contact", contact.name);
    put("ex_mobile", contact.mobile);
    put("ex_email", contact.email);
    if (!A.ex_state && STATES.includes(contact.state)) A.ex_state = contact.state;
    const lang = LEAD_LANGUAGES.find((l) => l.toLowerCase() === String(contact.language || "").trim().toLowerCase());
    if (lang) A.ex_language = lang;
  }
  return A;
}

// Where to reopen a flow: New Company flows live under /startbusiness/apply,
// the Existing Company ("ex-*") ones under /existing-companies.
export function flowRoute(flowId) {
  return flowId.startsWith("ex-")
    ? { path: "/existing-companies", state: { resumeFlow: flowId } }
    : { path: "/startbusiness/apply", state: { flowId, from: "dashboard" } };
}

// Saved progress started by a different signed-in Customer than the current
// one (shared browser) — never resumed or listed for this one.
export function belongsToOtherCustomer(saved) {
  const owner = saved?.ownerCustomerId || saved?.customerId;
  const me = signedInContact()?.customerId;
  return !!(owner && me && String(owner) !== String(me));
}

// Logout: end the session but keep unfinished applications' saved progress, so
// signing back in can continue them (a plain localStorage.clear() wiped them).
export function clearStorageKeepingApplications() {
  const keep = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(FLOW_STATE_PREFIX)) keep.push([key, localStorage.getItem(key)]);
  }
  localStorage.clear();
  keep.forEach(([k, v]) => localStorage.setItem(k, v));
}

// Applications started but not yet submitted, from FlowRunner's saved progress.
export function inProgressApplications() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(FLOW_STATE_PREFIX)) continue;
    const saved = getSecureItem(key);
    const flowId = key.slice(FLOW_STATE_PREFIX.length);
    if (!saved || typeof saved !== "object" || saved.submitted || !FLOWS[flowId]) continue;
    if (belongsToOtherCustomer(saved)) continue;
    const touched = saved.stepIndex > 0 || Object.keys(saved.answers || {}).length > 0;
    if (!touched) continue;
    out.push({ flowId, name: FLOWS[flowId].name, kind: FLOWS[flowId].kind, step: (saved.stepIndex || 0) + 1 });
  }
  return out;
}

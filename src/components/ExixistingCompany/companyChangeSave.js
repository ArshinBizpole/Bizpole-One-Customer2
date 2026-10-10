// Direct-save logic for the "Existing Company Changes" options (FLOWS["ex-change"]).
// Each option saves straight to the customer's own company record — no Deal,
// Quote, documents or payment. Only fields that actually differ from what's on
// record are sent.
import {
  getMyCompanyDetails, updateMyCompanyDetails,
  listCompanyDirectors, addCompanyDirector, updateCompanyDirector, removeCompanyDirector,
  getCompanyBank, saveCompanyBank, createCompanyChangeRequest,
} from "../../api/CompanyChangeApi";
import { getSecureItem, setSecureItem } from "../../utils/secureStorage";
import { ACTIVITIES, BIZ_TYPES, STATES } from "./existingCompanyData";

// Which record each option edits.
export function changeKind(what) {
  if (what === "Owner / Director" || what === "Partner") return "directors";
  if (what === "Bank Details") return "bank";
  if (what === "Other") return "other";
  return "company";
}

// Answer key → Company / bank column, with the label shown on Review.
const COMPANY_FIELDS = {
  "Business Name": [["new_name1", "BusinessName", "Business name"]],
  "Business Address": [
    ["new_addr1", "AddressLine1", "Address line 1"],
    ["new_addr2", "AddressLine2", "Address line 2"],
    ["new_country", "Country", "Country"],
    ["new_state", "State", "State"],
    ["new_district", "District", "District"],
    ["new_city", "City", "City / Town"],
    ["new_pincode", "PinCode", "Pincode"],
  ],
  "Business Activity": [
    ["new_activity", "Sector", "Primary activity"],
    ["new_activityDesc", "BusinessNature", "Activity description"],
  ],
  "Contact Details": [
    ["new_email", "CompanyEmail", "Company email"],
    ["new_mobile", "CompanyMobile", "Company mobile"],
  ],
  "Company Structure": [["new_structure", "ConstitutionCategory", "Business structure"]],
};
COMPANY_FIELDS["Registered Office"] = COMPANY_FIELDS["Business Address"];

const BANK_FIELDS = [
  ["bank_holder", "AccountHolderName", "Account holder name"],
  ["bank_name", "BankName", "Bank name"],
  ["bank_branch", "Branch", "Branch"],
  ["bank_account", "AccountNumber", "Account number"],
  ["bank_ifsc", "IFSC", "IFSC code"],
  ["bank_type", "AccountType", "Account type"],
];

const norm = (v) => String(v == null ? "" : v).trim();
const same = (a, b) => norm(a).toLowerCase() === norm(b).toLowerCase();

// Stored ConstitutionCategory → the Business Type option it corresponds to
// (same matching as applicationPrefill's existingCompanyAnswers).
function bizTypeFor(category) {
  const cat = norm(category).toLowerCase();
  if (!cat) return "";
  return BIZ_TYPES.find((t) => t !== "Other" && t.toLowerCase().startsWith(cat.split(/[\s(]/)[0])) || "";
}

// What a "cards" answer of "Other" means: the text typed under it.
function answerValue(A, key) {
  if (key === "new_activity" && A.new_activity === "Other") return norm(A.new_activity__other);
  return norm(A[key]);
}

// Current value of a column, in the same shape as the answer it's compared to.
function recordValue(column, record) {
  const v = record ? record[column] : "";
  if (column === "ConstitutionCategory") return bizTypeFor(v) || norm(v);
  return norm(v);
}

export function fieldsFor(what) {
  const kind = changeKind(what);
  if (kind === "company") return COMPANY_FIELDS[what] || [];
  if (kind === "bank") return BANK_FIELDS;
  return [];
}

// Load what's on record for this option. Returns { record } for company/bank
// and { people } for directors; "other" has nothing to load.
export async function loadCurrent(what, companyId) {
  const kind = changeKind(what);
  if (kind === "company") return { record: (await getMyCompanyDetails(companyId))?.data || {} };
  if (kind === "bank") return { record: (await getCompanyBank(companyId))?.data || null };
  if (kind === "directors") return { people: (await listCompanyDirectors(companyId))?.data || [] };
  return {};
}

// Fill the option's answers from what's on record, so the customer only edits
// what changes. Overwrites — called once per (company, option) load.
export function prefillAnswers(what, current, A) {
  const record = current?.record;
  if (!record) return;
  fieldsFor(what).forEach(([key, column]) => {
    let v = record[column];
    if (column === "ConstitutionCategory") v = bizTypeFor(v);
    if (column === "State" && !STATES.includes(v)) v = "";
    if (column === "Country" && v !== "India") v = v ? "" : "India";
    if (column === "Sector" && v && !ACTIVITIES.includes(v)) {
      A.new_activity = "Other";
      A.new_activity__other = norm(v);
      return;
    }
    A[key] = norm(v);
  });
}

// Rows shown in the "Currently on record" box.
export function currentRows(what, current) {
  const kind = changeKind(what);
  if (kind === "directors") {
    return (current?.people || []).map((p) => [p.Role || "Person", p.Name || "—"]);
  }
  const record = current?.record;
  if (!record) return [];
  return fieldsFor(what).map(([, column, label]) => [label, recordValue(column, record) || "—"]);
}

// [label, from, to] for every field that differs from what's on record.
export function changedRows(what, A, current) {
  const record = current?.record || null;
  return fieldsFor(what)
    .map(([key, column, label]) => [label, recordValue(column, record), answerValue(A, key)])
    .filter(([, from, to]) => !same(from, to) && !(from === "" && to === ""));
}

function changedColumns(what, A, current) {
  const record = current?.record || null;
  const out = {};
  fieldsFor(what).forEach(([key, column]) => {
    const to = answerValue(A, key);
    if (!same(recordValue(column, record), to)) out[column] = to;
  });
  return out;
}

export function personLabel(p) {
  return p ? `${p.Name || "Unnamed"}${p.Role ? ` (${p.Role})` : ""}` : "";
}

// What the directors/partners change will do, in words, for Review.
export function directorSummary(A, current) {
  const people = current?.people || [];
  const old = people.find((p) => String(p.ID) === String(A.chg_person));
  const incoming = `${norm(A.new_person)}${A.new_role ? ` (${A.new_role})` : ""}`;
  switch (A.change_action) {
    case "Add": return [["Add", incoming]];
    case "Remove": return [["Remove", personLabel(old)]];
    case "Replace": return [["Remove", personLabel(old)], ["Add", incoming]];
    case "Change role / designation": return [["Person", personLabel(old)], ["New role", A.new_role || "—"]];
    default: return [];
  }
}

// Something to save? Returns an error message, or "" when there is.
export function nothingToSave(what, A, current) {
  const kind = changeKind(what);
  if (kind === "company" || kind === "bank") {
    return changedRows(what, A, current).length ? "" : "You haven't changed anything yet — go back and update the details you want to change.";
  }
  if (kind === "directors" && A.change_action === "Change role / designation") {
    const old = (current?.people || []).find((p) => String(p.ID) === String(A.chg_person));
    if (old && same(old.Role, A.new_role)) return "That person already has this role — pick a different role.";
  }
  return "";
}

// The signed-in customer's cached companies (stale names after a rename are
// patched by patchCachedCompany below).
export function myCompanies() {
  try {
    const raw = getSecureItem("user");
    const user = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(user?.Companies) ? user.Companies : [];
  } catch {
    return [];
  }
}

// Keep the cached company (dashboard switcher, prefill) in step with a save.
function patchCachedCompany(companyId, data) {
  if (!data) return;
  try {
    const raw = getSecureItem("user");
    const user = typeof raw === "string" ? JSON.parse(raw) : raw;
    const c = (user?.Companies || []).find((x) => String(x.CompanyID) === String(companyId));
    if (!c) return;
    Object.keys(data).forEach((k) => { if (k !== "CompanyID") c[k] = data[k]; });
    if (data.BusinessName && "CompanyName" in c) c.CompanyName = data.BusinessName;
    setSecureItem("user", JSON.stringify(user));
  } catch { /* cache only — the save itself already succeeded */ }
}

// Save the change. Resolves to { title, message } for the success screen.
export async function saveChange(what, A, current, companyId) {
  const kind = changeKind(what);

  if (kind === "company") {
    const res = await updateMyCompanyDetails(companyId, changedColumns(what, A, current));
    patchCachedCompany(companyId, res?.data);
    return { title: "Details Updated", message: `Your ${what.toLowerCase()} has been updated on your company record.` };
  }

  if (kind === "bank") {
    const fields = changedColumns(what, A, current);
    await saveCompanyBank(companyId, fields);
    return { title: "Bank Details Updated", message: "Your bank details have been saved on your company record." };
  }

  if (kind === "directors") {
    const incoming = () => ({
      Name: norm(A.new_person),
      PAN: norm(A.new_personPan).toUpperCase() || undefined,
      Email: norm(A.new_personEmail) || undefined,
      Role: A.new_role || undefined,
    });
    const who = what === "Partner" ? "partners" : "owners / directors";
    if (A.change_action === "Add") {
      await addCompanyDirector(companyId, incoming());
    } else if (A.change_action === "Remove") {
      await removeCompanyDirector(companyId, A.chg_person);
    } else if (A.change_action === "Replace") {
      // Add first: if it fails, the outgoing person is still on record.
      await addCompanyDirector(companyId, incoming());
      await removeCompanyDirector(companyId, A.chg_person);
    } else if (A.change_action === "Change role / designation") {
      await updateCompanyDirector(companyId, A.chg_person, { Role: A.new_role });
    } else {
      throw new Error("Choose what you want to do");
    }
    return { title: "Details Updated", message: `Your company's ${who} have been updated.` };
  }

  const details = [
    `Requested change: ${norm(A.new_other)}`,
    norm(A.cur_other) && `Current position: ${norm(A.cur_other)}`,
  ].filter(Boolean).join("\n");
  await createCompanyChangeRequest(companyId, details, "Other");
  return { title: "Request Sent", message: "Our team will review your request and get in touch with you." };
}

/* ---------------------------------------------------------------------------
   "Register another company" (FLOWS["ex-business"], prefillExisting): fill the
   Existing Company step — and, when the owners are shared, the Owners step —
   from the signed-in customer's selected company.
--------------------------------------------------------------------------- */
export async function loadExistingCompanyPrefill(companyId) {
  const [details, directors] = await Promise.all([
    getMyCompanyDetails(companyId).catch(() => null),
    listCompanyDirectors(companyId).catch(() => null),
  ]);
  return { record: details?.data || null, directors: directors?.data || [] };
}

// Only fills fields the customer hasn't filled in themselves.
export function fillExistingCompanyAnswers(A, record) {
  if (!record) return;
  const put = (k, v) => {
    const val = norm(v);
    if (val && !norm(A[k])) A[k] = val;
  };
  put("ex_name", record.BusinessName);
  put("ex_regno", record.CIN);
  put("ex_biztype", bizTypeFor(record.ConstitutionCategory));
  put("ex_addr1", record.AddressLine1);
  put("ex_addr2", record.AddressLine2);
  if (record.Country === "India") put("ex_country", "India");
  if (STATES.includes(record.State)) put("ex_state", record.State);
  put("ex_district", record.District);
  put("ex_city", record.City);
  put("ex_pincode", record.PinCode);
}

// company_directors rows → the Owners step's owner objects. Shareholding and
// capital are left blank: they're for the new company, not the existing one.
export function ownersFromDirectors(directors, roles, blankOwner) {
  return directors.map((d) => {
    const o = blankOwner();
    o.name = norm(d.Name);
    o.dob = norm(d.DOB);
    o.pan = norm(d.PAN).toUpperCase();
    o.aadhaar = norm(d.Aadhaar);
    o.email = norm(d.Email);
    o.mobile = norm(d.Mobile).replace(/\D/g, "").slice(-10);
    o.address = norm(d.Address);
    o.role = roles.includes(d.Role) ? d.Role : "";
    if (norm(d.DIN)) { o.dinKnown = "Yes"; o.din = norm(d.DIN); }
    o.nominee = {
      name: norm(d.NomineeName), dob: norm(d.NomineeDOB), pan: norm(d.NomineePAN).toUpperCase(),
      aadhaar: norm(d.NomineeAadhaar), email: norm(d.NomineeEmail),
      mobile: norm(d.NomineeMobile).replace(/\D/g, "").slice(-10), address: norm(d.NomineeAddress),
    };
    return o;
  });
}

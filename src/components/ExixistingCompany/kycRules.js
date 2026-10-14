// PAN / Aadhaar verification rules shared by KycVerify (the box under each
// number) and FlowRunner's validateStep (which blocks Continue).

// TEMPORARILY OFF for testing the rest of the flows (Sandbox wallet has no
// credits) — set back to true to make PAN / Aadhaar verification block Continue
// again. Keep in step with KYC_REQUIRED in the server's kycRecord.service.js.
export const KYC_REQUIRED = false;

export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const AADHAAR_RE = /^[2-9][0-9]{11}$/;

export const normalizeNumber = (kind, value) =>
  kind === "pan" ? String(value || "").trim().toUpperCase() : String(value || "").replace(/\D/g, "");
// A PAN's name / DOB match is relative to the name and DOB it was checked
// with, so a result only counts while those are unchanged.
export const normalizeName = (name) => String(name || "").trim().replace(/\s+/g, " ").toUpperCase();
export const normalizeDob = (dob) => String(dob || "").slice(0, 10);

/** The stored result, when it belongs to this number (and, for a PAN, this name/DOB). */
export function currentKycResult(kind, value, result, ctx = {}) {
  if (!result || result.number !== normalizeNumber(kind, value)) return null;
  if (kind === "pan" && (result.checkedName !== normalizeName(ctx.name) || result.checkedDob !== normalizeDob(ctx.dob))) return null;
  return result;
}

/**
 * Error that blocks Continue for a PAN / Aadhaar box, or "" when it may go on.
 * Only a complete number is checked here — an empty or badly formatted one is
 * already reported by the field's own required / format check.
 */
export function kycBlockingError(kind, value, result, ctx = {}) {
  if (!KYC_REQUIRED) return "";
  const number = normalizeNumber(kind, value);
  if (!(kind === "pan" ? PAN_RE.test(number) : AADHAAR_RE.test(number))) return "";
  const done = currentKycResult(kind, value, result, ctx);
  if (done?.passed) return "";
  if (done) return "This PAN didn't pass verification — check the PAN, name and date of birth, then verify again";
  return kind === "pan" ? "Verify this PAN to continue" : "Verify this Aadhaar with OTP to continue";
}

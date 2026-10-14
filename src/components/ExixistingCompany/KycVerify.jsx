import { useEffect, useState } from "react";
import { verifyPan, sendAadhaarOtp, verifyAadhaarOtp, kycStatus } from "../../api/KycApi";
import { PAN_RE, AADHAAR_RE, normalizeNumber, normalizeName, normalizeDob, currentKycResult } from "./kycRules";

/* ---------------------------------------------------------------------------
   PAN / Aadhaar verification, shown under any PAN or Aadhaar box once a
   complete number is typed. Where it's required, Continue stays blocked until
   it passes (see kycBlockingError, used by FlowRunner's validateStep).
     PAN:     consent → Verify → valid / name & DOB match / Aadhaar linked.
              Passes when valid, the name matches and (when a DOB is asked)
              the DOB matches; "Aadhaar not linked" is only a warning.
     Aadhaar: consent → Send OTP → enter OTP → verified; name, DOB, gender,
              address from Aadhaar are handed to `onFill` (fills empty fields).
   A number the server already recorded as verified (same name/DOB for a PAN)
   is accepted straight away, with no new check.
   `result` / `setResult` persist the outcome alongside the answer. `context()`
   gives { name, dob } of the person, sent with a PAN for the name/DOB match.
--------------------------------------------------------------------------- */
export default function KycVerify({ kind, value, context, result, setResult, onFill }) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refId, setRefId] = useState("");
  const [otp, setOtp] = useState("");

  const number = normalizeNumber(kind, value);
  const complete = kind === "pan" ? PAN_RE.test(number) : AADHAAR_RE.test(number);
  const ctx = context?.() || {};
  const checkedName = normalizeName(ctx.name);
  const checkedDob = normalizeDob(ctx.dob);
  const done = currentKycResult(kind, value, result, ctx);

  // Already verified before (on any application)? Then accept it without a
  // new — paid — check.
  useEffect(() => {
    if (!complete || done || (kind === "pan" && !checkedName)) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await kycStatus(kind === "pan" ? { pan: number, name: ctx.name, dob: ctx.dob } : { aadhaar: number });
      if (cancelled || !res?.success || !res.data?.verified) return;
      setResult(kind === "pan"
        ? { number, at: Date.now(), checkedName, checkedDob, valid: true, nameMatch: true, dobMatch: checkedDob ? true : null, aadhaarLinked: res.data.aadhaarLinked, passed: true, reused: true }
        : { number, at: Date.now(), valid: true, passed: true, reused: true, masked: `XXXX XXXX ${number.slice(-4)}` });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, number, complete, !!done, checkedName, checkedDob]);

  if (!complete) return null;

  async function runPan() {
    setBusy(true);
    setError("");
    const res = await verifyPan({ pan: number, name: ctx.name, dob: ctx.dob });
    setBusy(false);
    if (!res?.success) return setError(res?.message || "Couldn't verify this PAN.");
    setResult({ number, at: Date.now(), checkedName, checkedDob, ...res.data });
  }

  async function sendOtp() {
    setBusy(true);
    setError("");
    const res = await sendAadhaarOtp(number);
    setBusy(false);
    if (!res?.success) return setError(res?.message || "Couldn't send the OTP.");
    setRefId(res.data.referenceId);
    setOtp("");
  }

  async function checkOtp() {
    setBusy(true);
    setError("");
    const res = await verifyAadhaarOtp(refId, otp);
    setBusy(false);
    if (!res?.success) return setError(res?.message || "The OTP is incorrect or has expired.");
    const d = res.data || {};
    // Keep only what's needed to show the result — never the full Aadhaar.
    setResult({ number, at: Date.now(), valid: true, passed: true, name: d.name, masked: `XXXX XXXX ${number.slice(-4)}` });
    setRefId("");
    onFill?.(d);
  }

  if (done) {
    if (kind === "aadhaar") {
      return (
        <div className="mt-2 text-xs rounded-lg border border-green-200 bg-green-50 text-green-800 px-3 py-2">
          ✓ Aadhaar verified{done.name ? <> — <b>{done.name}</b></> : done.reused ? " earlier" : ""}
        </div>
      );
    }
    const failed = !done.passed;
    const bits = [
      done.valid ? `PAN ${String(done.status || "valid").toLowerCase()}` : `PAN ${String(done.status || "not valid").toLowerCase()}`,
      done.nameMatch === true ? "name matches" : done.nameMatch === false ? "name does not match PAN records" : "",
      done.dobMatch === true ? "date of birth matches" : done.dobMatch === false ? "date of birth does not match" : "",
      done.reused ? "verified earlier" : "",
    ].filter(Boolean);
    return (
      <div className={`mt-2 text-xs rounded-lg border px-3 py-2 ${failed ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-800"}`}>
        {failed ? "✕ " : "✓ "}{bits.join(" · ")}
        {failed && (
          <>
            <span className="block mt-1">Correct the PAN, name or date of birth, then verify again to continue.</span>
            <button type="button" onClick={() => setResult(null)} className="mt-1 underline font-semibold">Check again</button>
          </>
        )}
        {done.aadhaarLinked === false && (
          <span className="block mt-1 text-amber-700">⚠ Aadhaar is not linked to this PAN.</span>
        )}
      </div>
    );
  }

  const label = kind === "pan"
    ? "I agree to verify this PAN with the Income Tax Department's records."
    : "I agree to verify this Aadhaar with UIDAI using an OTP sent to its linked mobile.";

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 space-y-2">
      <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
        <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>{label}</span>
      </label>

      {kind === "pan" && (
        <button type="button" disabled={!consent || busy} onClick={runPan}
          className="text-xs font-semibold px-3 py-1.5 rounded-md bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50">
          {busy ? "Verifying…" : "Verify PAN"}
        </button>
      )}

      {kind === "aadhaar" && !refId && (
        <button type="button" disabled={!consent || busy} onClick={sendOtp}
          className="text-xs font-semibold px-3 py-1.5 rounded-md bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50">
          {busy ? "Sending OTP…" : "Verify with OTP"}
        </button>
      )}

      {kind === "aadhaar" && refId && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-600">OTP sent to the Aadhaar-linked mobile:</span>
          <input inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="6-digit OTP" className="w-28 border border-gray-300 rounded-md px-2 py-1 text-sm" />
          <button type="button" disabled={otp.length !== 6 || busy} onClick={checkOtp}
            className="text-xs font-semibold px-3 py-1.5 rounded-md bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50">
            {busy ? "Verifying…" : "Verify OTP"}
          </button>
          <button type="button" disabled={busy} onClick={sendOtp} className="text-xs underline text-gray-600">Resend</button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

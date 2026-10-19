import { useEffect, useRef, useState } from "react";
import { verifyPan, startAadhaarDigilocker, aadhaarDigilockerResult, kycStatus } from "../../api/KycApi";
import { PAN_RE, AADHAAR_RE, normalizeNumber, normalizeName, normalizeDob, currentKycResult } from "./kycRules";

/* ---------------------------------------------------------------------------
   PAN / Aadhaar verification, shown under any PAN or Aadhaar box once a
   complete number is typed. Where it's required, Continue stays blocked until
   it passes (see kycBlockingError, used by FlowRunner's validateStep).
     PAN:     consent → Verify → valid / name & DOB match / Aadhaar linked.
              Passes when valid, the name matches and (when a DOB is asked)
              the DOB matches; "Aadhaar not linked" is only a warning.
     Aadhaar: consent → Verify with DigiLocker (popup: sign in, share Aadhaar)
              → verified; name, DOB, gender, address from Aadhaar are handed
              to `onFill` (fills empty fields). UIDAI discontinued the
              OTP-based OKYC, so DigiLocker is the only Aadhaar route.
   A number the server already recorded as verified (same name/DOB for a PAN)
   is accepted straight away, with no new check.
   `result` / `setResult` persist the outcome alongside the answer. `context()`
   gives { name, dob } of the person, sent with a PAN for the name/DOB match.
--------------------------------------------------------------------------- */
export default function KycVerify({ kind, value, context, result, setResult, onFill }) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(false); // DigiLocker popup open
  const pollRef = useRef(null);
  const popupRef = useRef(null);

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

  // Stop polling / close the popup if the box unmounts mid-flow.
  useEffect(() => () => {
    clearInterval(pollRef.current);
    try { popupRef.current?.close(); } catch { /* cross-origin — ignore */ }
  }, []);

  if (!complete) return null;

  async function runPan() {
    setBusy(true);
    setError("");
    const res = await verifyPan({ pan: number, name: ctx.name, dob: ctx.dob });
    setBusy(false);
    if (!res?.success) return setError(res?.message || "Couldn't verify this PAN.");
    setResult({ number, at: Date.now(), checkedName, checkedDob, ...res.data });
  }

  function stopDigilocker() {
    clearInterval(pollRef.current);
    pollRef.current = null;
    try { popupRef.current?.close(); } catch { /* ignore */ }
    popupRef.current = null;
    setWaiting(false);
  }

  async function runDigilocker() {
    // Open the window synchronously (inside the click) so popup blockers allow it.
    const popup = window.open("about:blank", "bizpole-digilocker", "width=520,height=720");
    setBusy(true);
    setError("");
    const res = await startAadhaarDigilocker(number);
    setBusy(false);
    if (!res?.success) {
      popup?.close();
      return setError(res?.message || "Couldn't start DigiLocker.");
    }
    const { sessionId, url } = res.data;
    if (popup) popup.location.href = url;
    else window.open(url, "bizpole-digilocker");
    popupRef.current = popup;
    setWaiting(true);

    const startedAt = Date.now();
    let inFlight = false;
    pollRef.current = setInterval(async () => {
      if (inFlight) return;
      if (Date.now() - startedAt > 15 * 60 * 1000) {
        stopDigilocker();
        return setError("DigiLocker timed out. Please try again.");
      }
      inFlight = true;
      const r = await aadhaarDigilockerResult(sessionId);
      inFlight = false;
      if (!pollRef.current) return; // cancelled meanwhile
      if (r?.success && r.data?.status === "pending") {
        // Popup closed without finishing → give up after one last check.
        if (popupRef.current && popupRef.current.closed) {
          stopDigilocker();
          setError("DigiLocker was closed before your Aadhaar was shared.");
        }
        return;
      }
      stopDigilocker();
      if (!r?.success) return setError(r?.message || "Couldn't verify your Aadhaar with DigiLocker.");
      const d = r.data || {};
      // Keep only what's needed to show the result — never the full Aadhaar.
      setResult({ number, at: Date.now(), valid: true, passed: true, name: d.name, via: "digilocker", masked: `XXXX XXXX ${number.slice(-4)}` });
      onFill?.(d);
    }, 4000);
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
        {/* Aadhaar seeding status from the PAN check (Yes/No only — the Aadhaar number itself is never returned). */}
        {done.aadhaarLinked === true && (
          <span className="block mt-1 text-green-800">✓ Aadhaar seeding status: <b>Linked</b> to this PAN</span>
        )}
        {done.aadhaarLinked === false && (
          <span className="block mt-1 text-amber-700">⚠ Aadhaar seeding status: <b>Not linked</b> to this PAN</span>
        )}
        {done.aadhaarLinked == null && done.valid && (
          <span className="block mt-1 text-gray-500">Aadhaar seeding status: not available</span>
        )}
      </div>
    );
  }

  const label = kind === "pan"
    ? "I agree to verify this PAN with the Income Tax Department's records."
    : "I agree to share my Aadhaar from DigiLocker to verify it.";

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

      {kind === "aadhaar" && !waiting && (
        <button type="button" disabled={!consent || busy} onClick={runDigilocker}
          className="text-xs font-semibold px-3 py-1.5 rounded-md bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50">
          {busy ? "Opening DigiLocker…" : "Verify with DigiLocker"}
        </button>
      )}

      {kind === "aadhaar" && waiting && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />
          <span>Sign in to DigiLocker in the window that opened and share your Aadhaar…</span>
          <button type="button" onClick={stopDigilocker} className="underline">Cancel</button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

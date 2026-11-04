import { useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { getAllStates } from "../../api/States";
import { STATES } from "../ExixistingCompany/existingCompanyData";
import { sanitize, PATTERNS } from "../../utils/formValidation";

// Trademark Search page, visitor not signed in: name, mobile and state (the
// server sets their preferred language from the state) — then the report goes
// to their WhatsApp. No email / OTP. onSubmit(contact) does the send and throws an
// Error with a message to show on failure.

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400";

export default function WhatsAppReportModal({ initial, onSubmit, onClose, onSignIn }) {
  const [states, setStates] = useState([]);
  const [form, setForm] = useState({
    name: initial?.name || "",
    mobile: initial?.mobile || "",
    state: initial?.state || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getAllStates().then(setStates).catch(() => setStates([]));
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const stateNames = states.length ? states.map((s) => s.state_name) : STATES.filter((s) => s !== "Other");

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return setError("Please enter your name.");
    if (!PATTERNS.personName.test(name)) return setError("Name can contain only letters, spaces, dots and apostrophes.");
    if (!/^[6-9]\d{9}$/.test(form.mobile)) return setError("Please enter a valid 10-digit WhatsApp number.");
    if (!form.state) return setError("Please select your state.");
    setError("");
    setSubmitting(true);
    try {
      await onSubmit({ ...form, name });
    } catch (err) {
      setError(err?.message || "Could not send your report right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tm-wa-title"
        className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          &times;
        </button>
        <form onSubmit={submit}>
          <h3 id="tm-wa-title" className="text-lg font-semibold text-gray-900 mb-1">
            Get your report on WhatsApp
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Tell us where to send it — your Trademark Search Report will be sent to your WhatsApp number.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => set("name", sanitize.personName(e.target.value))}
                placeholder="Your full name"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp number<span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-sm text-gray-600">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  className={`${inputCls} rounded-l-none`}
                  value={form.mobile}
                  onChange={(e) => {
                    let d = e.target.value.replace(/\D/g, "");
                    if (d.length > 10) d = d.replace(/^(91|0)/, "");
                    set("mobile", d.slice(0, 10));
                  }}
                  placeholder="10-digit mobile number"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State<span className="text-red-500 ml-0.5">*</span>
              </label>
              <select className={inputCls} value={form.state} onChange={(e) => set("state", e.target.value)}>
                <option value="">Select State</option>
                {stateNames.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#FFC72C] hover:bg-[#FFBD00] text-black text-sm font-semibold disabled:opacity-60"
          >
            <FaWhatsapp className="text-base" /> {submitting ? "Sending…" : "Send report to WhatsApp"}
          </button>
          {onSignIn && (
            <p className="mt-3 text-xs text-gray-500 text-center">
              Already have an account?{" "}
              <button type="button" onClick={onSignIn} className="text-yellow-700 font-semibold hover:underline">
                Sign in
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

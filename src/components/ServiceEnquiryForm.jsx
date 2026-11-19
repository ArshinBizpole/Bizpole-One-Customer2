import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaArrowRight, FaCheck, FaPhoneAlt, FaTimes } from "react-icons/fa";
import StateSelect from "./StateSelect";
import { createLead } from "../api/LeadApi";
import { assignCustomer } from "../api/CustomerApi";
import { getSecureItem } from "../utils/secureStorage";
import { languagesForState, languageForState } from "../utils/stateLanguages";

// "Talk to an Expert" call-back form on a service's details page. Raises a
// customer-portal Lead for this service, the same way the Existing Company
// flow's "Talk to an Advisor" does: best-effort franchisee assignment, then
// createLead with the customer's note as a pending follow-up for the owner.
// A mobile that already has a Lead (409) still counts as sent — the server
// attaches the follow-up to that Lead instead.
// Shown as a popup from the details page's "Request a Call Back" button.
//   serviceName: proposed service
//   states / stateId / onStateChange / statesLoading: the page's state picker —
//     the form's State field shares it, so picking one here updates the price too
//   onClose(): close the popup
const ServiceEnquiryForm = ({ serviceName, states = [], stateId, onStateChange, statesLoading, onClose }) => {
  const stateName = states.find((s) => String(s.id ?? s.StateID) === String(stateId))?.state_name || "";
  const user = getSecureItem("user") || {};
  const [form, setForm] = useState(() => ({
    name: [user.FirstName, user.LastName].filter(Boolean).join(" "),
    mobile: String(user.Mobile || user.MobileNumber || "").replace(/\D/g, "").slice(-10),
    email: user.Email || "",
    language: "",
    message: "",
  }));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Preferred language follows the picked state (its main language by default).
  useEffect(() => {
    if (stateName) setForm((f) => ({ ...f, language: languageForState(stateName, f.language) }));
  }, [stateName]);

  const set = (key) => (e) => {
    let value = e.target.value;
    if (key === "mobile") {
      // Keep digits, drop a +91 / 0 prefix, cap at 10.
      let d = value.replace(/\D/g, "");
      if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
      else if (d.length > 10 && d.startsWith("0")) d = d.slice(1);
      value = d.slice(0, 10);
    }
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((er) => ({ ...er, [key]: undefined, state: undefined }));
    setSubmitError("");
  };

  const validate = () => {
    const er = {};
    if (!form.name.trim()) er.name = "Please enter your name.";
    if (!/^[6-9]\d{9}$/.test(form.mobile)) er.mobile = "Enter a valid 10-digit mobile number.";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) er.email = "Enter a valid email address.";
    if (!stateName) er.state = "Please select your state.";
    return er;
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) return;
    setSubmitting(true);
    setSubmitError("");
    const language = form.language || languageForState(stateName, "") || "English";
    let franchiseeId = null;
    try {
      const assignment = await assignCustomer({ language: language.toLowerCase(), state: stateName, district: stateName });
      franchiseeId = assignment?.franchiseeId || null;
    } catch (err) {
      console.warn("Franchisee assignment failed (non-fatal, lead still created):", err);
    }
    const remark = [
      `Service enquiry — ${serviceName}`,
      form.message.trim() && `Message: ${form.message.trim()}`,
    ].filter(Boolean).join("\n");
    try {
      await createLead({
        name: form.name.trim(),
        mobile: form.mobile,
        email: form.email.trim(),
        state: stateName,
        preferred_language: language,
        proposed_service: serviceName,
        lead_source: "service-details",
        ...(franchiseeId ? { franchiseeId } : {}),
        followup_remark: remark,
      });
      setSent(true);
    } catch (err) {
      const data = err?.response?.data;
      if (err?.response?.status === 409 && data?.isDuplicate) {
        setSent(true);
      } else {
        setSubmitError(data?.error || data?.message || "Couldn't send your request. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (key) =>
    `w-full px-4 py-3 rounded-xl border bg-white text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-[#f7d761] focus:ring-1 focus:ring-[#f7d761] ${errors[key] ? "border-red-400" : "border-gray-200"}`;
  const languages = languagesForState(stateName);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900">Request a Call Back</h2>
          {!sent && (
            <p className="text-sm text-gray-500 mt-1">
              Have a question about {serviceName}? Leave your details and our expert will call you back.
            </p>
          )}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 shrink-0 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
          <FaTimes size={13} />
        </button>
      </div>

      <div>
        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-4 py-2"
            >
              <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <FaCheck className="text-green-600" size={16} />
              </div>
              <div>
                <p className="font-bold text-gray-900">Thanks, {form.name.trim().split(" ")[0]}! We've got your request.</p>
                <p className="text-sm text-gray-600 mt-1">
                  A {serviceName} expert will call you on <span className="font-semibold">{form.mobile}</span> shortly.
                </p>
                <button type="button" onClick={onClose} className="mt-4 px-5 py-2.5 rounded-xl bg-[#FBC02D] hover:bg-[#F9B81B] text-gray-900 text-sm font-bold">
                  Done
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={submit} noValidate initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input className={inputCls("name")} placeholder="Your name *" value={form.name} onChange={set("name")} autoComplete="name" />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">+91</span>
                    <input className={`${inputCls("mobile")} pl-12`} placeholder="Mobile number *" value={form.mobile} onChange={set("mobile")} inputMode="numeric" autoComplete="tel-national" />
                  </div>
                  {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>}
                </div>
                <div className="sm:col-span-2">
                  <StateSelect
                    states={states}
                    value={stateId}
                    onChange={(id) => { setErrors((er) => ({ ...er, state: undefined })); onStateChange(id); }}
                    loading={statesLoading}
                    placeholder="Select your state *"
                  />
                  {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
                </div>
                <div>
                  <input className={inputCls("email")} placeholder="Email (optional)" value={form.email} onChange={set("email")} type="email" autoComplete="email" />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>
                <div>
                  <select className={`${inputCls("language")} ${form.language ? "" : "text-gray-400"}`} value={form.language} onChange={set("language")}>
                    <option value="">Preferred language</option>
                    {languages.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <textarea className={`${inputCls("message")} resize-none`} rows={3} placeholder="Your question (optional)" value={form.message} onChange={set("message")} maxLength={1000} />
                </div>
              </div>

              {submitError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mt-3">{submitError}</p>}

              <motion.button
                type="submit"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={submitting}
                className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gray-900 hover:bg-black text-white font-bold text-sm transition-colors disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <FaPhoneAlt size={12} />
                    <span>Request a Call Back</span>
                    <FaArrowRight className="text-xs" />
                  </>
                )}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ServiceEnquiryForm;

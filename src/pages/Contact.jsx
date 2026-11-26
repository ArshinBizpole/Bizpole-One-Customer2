import { useEffect, useRef, useState } from "react";
import { FaPhoneAlt, FaEnvelope, FaWhatsapp, FaCheck, FaArrowRight, FaShieldAlt } from "react-icons/fa";
import { languageForState } from "../utils/stateLanguages";
import { metaPixelPage, metaPixelTrack } from "../utils/metaPixel";

// Contact Us page (/contact). Same lead flow as the static landing pages
// (public/gst-registration etc.): details → SMS OTP (/mobile-otp/send) → the
// public website-lead API, which checks the OTP and creates the CRM lead (or
// adds a follow-up to the existing lead for that mobile). State is required:
// a lead with no state and no language lands in the holding pool.
// Uses fetch, not axiosInstance: a logged-in customer's token must not be
// sent here, and a 4xx from this public API must never log them out.

const BASE = import.meta.env.VITE_API_BASE_URL || "";
// Public by design (protection = CORS allowlist + per-IP limit + honeypot + OTP), same key as the landing pages
const API_KEY = "ad5c04dcf7248dc0fdc8efdf78f1c1f5b77da7a2aaefa926";
const ATTR_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"];

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

// label → CRM service name (matched to a ServiceID on the server); null = no service, label goes in the message
const TOPICS = [
  ["Company Registration", "Private Limited Company Registration"],
  ["LLP Registration", "LLP Registration"],
  ["GST Registration", "GST Registration"],
  ["Trademark Registration", "Trademark Registration"],
  ["Compliance & Filings", null],
  ["Something else / Not sure", null],
];

async function post(path, data, headers) {
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: JSON.stringify(data),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
}

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 placeholder-gray-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 aria-[invalid=true]:border-red-400";

export default function Contact() {
  const [step, setStep] = useState("form"); // form | otp | done
  const [f, setF] = useState({ name: "", mobile: "", state: "", topic: "", message: "", company_website: "" });
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState({ field: "", text: "" });
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0); // resend countdown
  const cardRef = useRef(null);
  const otpRef = useRef(null);

  useEffect(() => {
    document.title = "Contact Us | Bizpole";
    metaPixelPage({ content_name: "Contact Us", content_category: "Contact" });
  }, []);
  useEffect(() => {
    if (left <= 0) return undefined;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; } // no jump on page load
    if (step === "otp") otpRef.current?.focus({ preventScroll: true });
    const r = cardRef.current?.getBoundingClientRect();
    if (r && (r.top < 70 || r.top > window.innerHeight * 0.6)) cardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const set = (k) => (e) => {
    let v = e.target.value;
    if (k === "mobile") {
      // keep digits, drop a +91 / 0 prefix, cap at 10 (no maxlength: it would cut a pasted "+91 …")
      let d = v.replace(/\D/g, "");
      if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
      else if (d.length > 10 && d.startsWith("0")) d = d.slice(1);
      v = d.slice(0, 10);
    }
    setF((p) => ({ ...p, [k]: v }));
    setErr({ field: "", text: "" });
  };

  const sendOtp = async () => {
    const res = await post("/mobile-otp/send", { mobile: f.mobile, purpose: "contact-page" });
    if (!res.ok) {
      const e = new Error(res.j?.message || "Could not send the code. Please try again.");
      e.retryAfter = res.j?.retryAfter;
      throw e;
    }
    setLeft(res.j?.resendAfter || 30);
  };

  const submitDetails = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return setErr({ field: "name", text: "Please enter your full name." });
    if (!/^[6-9]\d{9}$/.test(f.mobile)) return setErr({ field: "mobile", text: "Please enter a valid 10-digit mobile number." });
    if (!f.state) return setErr({ field: "state", text: "Please select your state." });
    if (f.company_website) return setStep("done"); // honeypot: pretend success, send nothing
    setBusy(true);
    try {
      await sendOtp();
      setOtp("");
      setStep("otp");
    } catch (x) {
      if (x.retryAfter) { setLeft(x.retryAfter); setStep("otp"); return; } // earlier code still valid
      setErr({ field: "", text: x.message && x.message !== "Failed to fetch" ? x.message : "Network error. Please check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async (code) => {
    if (busy) return;
    if (!/^\d{4}$/.test(code)) return setErr({ field: "otp", text: "Please enter the 4-digit code." });
    const qs = new URLSearchParams(window.location.search);
    let attr = {};
    try { attr = JSON.parse(sessionStorage.getItem("lp_attr") || "{}"); } catch { /* private mode */ }
    ATTR_KEYS.forEach((k) => { if (qs.get(k)) attr[k] = qs.get(k); });
    const topic = TOPICS.find((t) => t[0] === f.topic);
    const body = {
      ...attr,
      name: f.name.trim(),
      mobile: f.mobile,
      otp: code,
      state: f.state,
      service: topic?.[1] || undefined,
      preferred_language: languageForState(f.state) || undefined,
      form_name: "contact-page",
      site: "bizpole.io",
      message: [f.topic ? "Topic: " + f.topic : "", f.message.trim()].filter(Boolean).join(" | "),
      page_url: attr.landing || window.location.href,
      referrer: attr.referrer || document.referrer,
    };
    setBusy(true);
    try {
      const res = await post("/lead-generation/website-lead", body, { "x-api-key": API_KEY });
      if (!res.ok) {
        setErr({ field: "otp", text: res.status === 429 ? "Too many attempts. Please try again in a few minutes." : res.j?.message || "Something went wrong. Please try again." });
        otpRef.current?.select();
        return;
      }
      setLeft(0);
      setStep("done");
      try { sessionStorage.removeItem("lp_attr"); } catch { /* ignore */ }
      try { (window.dataLayer = window.dataLayer || []).push({ event: "lead_submit", form: "contact-page", topic: f.topic }); } catch { /* ignore */ }
      metaPixelTrack("Lead", { content_name: "Contact Us", content_category: "Contact", topic: f.topic || undefined }, "contact-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8));
    } catch {
      setErr({ field: "otp", text: "Network error. Please check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    try { await sendOtp(); setOtp(""); setErr({ field: "", text: "" }); otpRef.current?.focus(); }
    catch (x) { setErr({ field: "otp", text: x.message }); }
    finally { setBusy(false); }
  };

  const errBox = err.text ? (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{err.text}</p>
  ) : null;

  return (
    <main className="bg-[#fffdf6]">
      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-10 md:pt-16 lg:grid-cols-[1fr_minmax(0,460px)] lg:gap-x-14 lg:gap-y-0">
        {/* Left: intro (phones: then the form, then the contact options) */}
        <div className="order-1 lg:col-start-1 lg:row-start-1">
          <span className="inline-block rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-yellow-800">Contact Us</span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-black md:text-5xl">
            Let's talk about <span className="text-yellow-500">your business.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-gray-600">
            Registration, GST, trademark or compliance — share a few details and a Bizpole expert will call you back.
          </p>
        </div>

        <div className="order-3 lg:col-start-1 lg:row-start-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:mt-8">
            <a href="tel:+919539995533" className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-yellow-300">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-yellow-100 text-yellow-700"><FaPhoneAlt /></span>
              <span><span className="block text-xs text-gray-500">Call us</span><span className="font-semibold text-gray-900">+91 95399 95533</span></span>
            </a>
            <a href="mailto:info@bizpole.in" className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-yellow-300">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-yellow-100 text-yellow-700"><FaEnvelope /></span>
              <span><span className="block text-xs text-gray-500">Email</span><span className="font-semibold text-gray-900">info@bizpole.in</span></span>
            </a>
            <a href="https://wa.me/919539995533" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-yellow-300 sm:col-span-2">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-green-100 text-green-700"><FaWhatsapp size={20} /></span>
              <span><span className="block text-xs text-gray-500">WhatsApp</span><span className="font-semibold text-gray-900">Chat with our team</span></span>
            </a>
          </div>

          <h2 className="mt-10 text-lg font-bold text-black">What happens next?</h2>
          <ol className="mt-4 space-y-4">
            {[
              ["Share your details", "Tell us what you need — it takes under a minute."],
              ["Verify your mobile", "A quick one-time code so our expert can reach the right number."],
              ["Get a call back", "A Bizpole expert who speaks your language will contact you."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-yellow-400 text-sm font-bold text-black">{i + 1}</span>
                <span><span className="block font-semibold text-gray-900">{t}</span><span className="text-sm text-gray-600">{d}</span></span>
              </li>
            ))}
          </ol>
        </div>

        {/* Right: form card */}
        <div ref={cardRef} id="contact-form" className="order-2 scroll-mt-24 self-start rounded-3xl lg:col-start-2 lg:row-span-2 lg:row-start-1 border border-gray-100 bg-white p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] md:p-8">
          {step === "form" && (
            <form onSubmit={submitDetails} noValidate className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-black">Request a call back</h2>
                <p className="mt-1 text-sm text-gray-500">Share your details and our team will connect with you.</p>
              </div>
              <input className={inputCls} placeholder="Full name *" autoComplete="name" value={f.name} onChange={set("name")} aria-invalid={err.field === "name"} aria-label="Full name" />
              <div className="flex">
                <span className="grid place-items-center rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 px-3 text-[15px] text-gray-600">+91</span>
                <input className={inputCls + " rounded-l-none"} placeholder="Mobile number *" type="tel" inputMode="numeric" autoComplete="tel-national" value={f.mobile} onChange={set("mobile")} aria-invalid={err.field === "mobile"} aria-label="Mobile number" />
              </div>
              <select className={inputCls} value={f.state} onChange={set("state")} aria-invalid={err.field === "state"} aria-label="State" autoComplete="address-level1">
                <option value="" disabled>State *</option>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select className={inputCls} value={f.topic} onChange={set("topic")} aria-label="What do you need help with?">
                <option value="">What do you need help with?</option>
                {TOPICS.map(([t]) => <option key={t}>{t}</option>)}
              </select>
              <textarea className={inputCls + " min-h-[96px] resize-y"} placeholder="Message (optional)" value={f.message} onChange={set("message")} aria-label="Message" />
              {/* honeypot: hidden from people, bots fill it */}
              <input type="text" name="company_website" tabIndex={-1} autoComplete="off" value={f.company_website} onChange={set("company_website")} aria-hidden="true"
                style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", opacity: 0 }} />
              {errBox}
              <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-yellow-400 px-6 py-3.5 font-semibold text-black shadow-[0_6px_24px_rgba(250,204,21,0.45)] transition hover:bg-yellow-500 disabled:opacity-60">
                {busy ? "Sending code…" : <>Send Enquiry <FaArrowRight /></>}
              </button>
              <p className="flex items-start gap-2 text-xs text-gray-500"><FaShieldAlt className="mt-0.5 shrink-0" /><span>We'll verify your number with a one-time code. By sending, you agree to our <a href="/privacy-policy" className="underline">privacy policy</a>.</span></p>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={(e) => { e.preventDefault(); submitOtp(otp); }} noValidate className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-black">Verify your mobile</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Enter the 4-digit code sent to <span className="font-semibold text-gray-800">+91 {f.mobile.slice(0, 5)} {f.mobile.slice(5)}</span>{" "}
                  <button type="button" className="font-semibold text-yellow-700 underline" onClick={() => { setStep("form"); setErr({ field: "", text: "" }); }}>Edit</button>
                </p>
              </div>
              <input ref={otpRef} id="contact-otp" className={inputCls + " text-center text-2xl tracking-[0.6em]"} inputMode="numeric" autoComplete="one-time-code" placeholder="••••" value={otp} aria-label="4-digit code" aria-invalid={err.field === "otp"}
                onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 4); setOtp(v); setErr({ field: "", text: "" }); if (v.length === 4) submitOtp(v); }} />
              {errBox}
              <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-yellow-400 px-6 py-3.5 font-semibold text-black transition hover:bg-yellow-500 disabled:opacity-60">
                {busy ? "Verifying…" : "Verify & Send Enquiry"}
              </button>
              <p className="text-center text-sm text-gray-500">
                {left > 0 ? <>Resend code in {left}s</> : <button type="button" onClick={resend} disabled={busy} className="font-semibold text-yellow-700 underline">Resend code</button>}
              </p>
            </form>
          )}

          {step === "done" && (
            <div className="py-6 text-center" role="status">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-100 text-green-600"><FaCheck size={22} /></span>
              <h2 className="mt-4 text-2xl font-bold text-black">Thank you{f.name ? ", " + f.name.trim().split(/\s+/)[0] : ""}!</h2>
              <p className="mt-2 text-gray-600">We've received your enquiry. A Bizpole expert will call you shortly.</p>
              <button type="button" className="mt-6 text-sm font-semibold text-yellow-700 underline"
                onClick={() => { setF({ name: "", mobile: "", state: "", topic: "", message: "", company_website: "" }); setOtp(""); setStep("form"); }}>
                Send another enquiry
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

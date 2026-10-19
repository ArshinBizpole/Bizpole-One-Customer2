import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, Share2, Wallet, ShieldCheck } from "lucide-react";
import {
  affiliateRequestOtp,
  affiliateSignup,
  affiliateVerifyOtp,
  getProgramme,
} from "../../api/ReferralApi";
import { hasValidAffiliateSession, setAffiliateSession } from "../../utils/affiliateSession";
import { InlineMessage, PrimaryButton } from "../../components/referrals/ReferralUi";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^[6-9][0-9]{9}$/;

const inputCls =
  "mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-300";

const steps = [
  { icon: <Share2 className="h-5 w-5" />, title: "Share", text: "Get your own link and QR code to share with businesses you know." },
  { icon: <QrCode className="h-5 w-5" />, title: "They sign up", text: "Anyone who signs up through your link is tracked to you." },
  { icon: <Wallet className="h-5 w-5" />, title: "You earn", text: "Earn commission on their first order once it is fully paid." },
  { icon: <ShieldCheck className="h-5 w-5" />, title: "Get paid", text: "Complete KYC once and receive payouts straight to your bank." },
];

const AffiliateLanding = () => {
  const navigate = useNavigate();
  const [programme, setProgramme] = useState(null);
  const [programmeLoading, setProgrammeLoading] = useState(true);
  const [mode, setMode] = useState("signup"); // signup | login
  const [step, setStep] = useState("form"); // form | otp
  const [form, setForm] = useState({ name: "", mobile: "", email: "", acceptTerms: false, website: "" });
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    if (hasValidAffiliateSession()) {
      navigate("/affiliate/dashboard", { replace: true });
      return;
    }
    let cancelled = false;
    getProgramme()
      .then((p) => !cancelled && setProgramme(p || null))
      .catch(() => !cancelled && setProgramme(null))
      .finally(() => !cancelled && setProgrammeLoading(false));
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const signupOpen = programme?.affiliateSignupOpen === true;

  const onChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const switchMode = (m) => {
    setMode(m);
    setStep("form");
    setOtp("");
    setError("");
    setInfo("");
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    const email = form.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return setError("Enter a valid email address.");
    if (mode === "signup") {
      if (form.name.trim().length < 2) return setError("Enter your full name.");
      if (!MOBILE_RE.test(form.mobile.trim())) return setError("Enter a valid 10-digit mobile number.");
      if (!form.acceptTerms) return setError("Please accept the affiliate terms to continue.");
    }
    setBusy(true);
    try {
      const res =
        mode === "signup"
          ? await affiliateSignup({
              name: form.name.trim(),
              mobile: form.mobile.trim(),
              email,
              acceptTerms: true,
              website: form.website, // honeypot — real users never fill it
            })
          : await affiliateRequestOtp(email);
      setInfo(res?.message || `We've sent a one-time code to ${email}.`);
      setStep("otp");
    } catch (err) {
      setError(
        err?.status === 403 && mode === "signup"
          ? "Affiliate sign-ups are currently closed."
          : err?.message || "Could not send the code. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setError("");
    const code = otp.trim();
    if (!/^[0-9]{4,8}$/.test(code)) return setError("Enter the code from your email.");
    setBusy(true);
    try {
      const data = await affiliateVerifyOtp(form.email.trim().toLowerCase(), code);
      if (!data?.token) throw new Error("Verification failed. Please try again.");
      setAffiliateSession(data.token, data.user);
      navigate("/affiliate/dashboard", { replace: true });
    } catch (err) {
      setError(err?.message || "Invalid or expired code.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await affiliateRequestOtp(form.email.trim().toLowerCase());
      setInfo(res?.message || "A new code has been sent.");
    } catch (err) {
      setError(err?.message || "Could not resend the code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-gray-50">
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 md:py-16 lg:grid-cols-2">
        {/* Programme explainer */}
        <div>
          <span className="inline-block rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">
            Bizpole Affiliate Programme
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-gray-900 md:text-4xl">
            Refer businesses to Bizpole. <span className="text-[#E0A800]">Earn on every first order.</span>
          </h1>
          <p className="mt-3 max-w-lg text-gray-600">
            No investment, no targets. Share your personal link or QR code with founders, shop owners
            and professionals who need registrations, licences or compliance help.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {steps.map((s) => (
              <div key={s.title} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-100 text-yellow-700">
                  {s.icon}
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-800">{s.title}</p>
                <p className="text-xs text-gray-500">{s.text}</p>
              </div>
            ))}
          </div>
          {programme?.scanWindowDays ? (
            <p className="mt-4 text-xs text-gray-500">
              A referral is credited to you if the business signs up within {programme.scanWindowDays} days
              of opening your link.
            </p>
          ) : null}
        </div>

        {/* Signup / login */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 grid grid-cols-2 rounded-xl bg-gray-100 p-1 text-sm font-semibold">
            {["signup", "login"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`rounded-lg py-2 ${mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
              >
                {m === "signup" ? "Become an affiliate" : "Affiliate login"}
              </button>
            ))}
          </div>

          {mode === "signup" && !programmeLoading && !signupOpen ? (
            <InlineMessage tone="warn">
              Affiliate sign-ups are currently closed. Already an affiliate? Use the login tab.
            </InlineMessage>
          ) : step === "form" ? (
            <form onSubmit={submitForm} noValidate className="relative space-y-3">
              {mode === "signup" && (
                <>
                  <label className="block">
                    <span className="text-xs font-semibold text-gray-600">Full name</span>
                    <input name="name" value={form.name} onChange={onChange} className={inputCls} autoComplete="name" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-gray-600">Mobile number</span>
                    <input
                      name="mobile"
                      value={form.mobile}
                      onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                      className={inputCls}
                      inputMode="numeric"
                      autoComplete="tel-national"
                    />
                  </label>
                </>
              )}
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Email</span>
                <input name="email" type="email" value={form.email} onChange={onChange} className={inputCls} autoComplete="email" />
              </label>

              {/* Honeypot: off-screen, must stay empty. */}
              <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
                <label>
                  Website
                  <input name="website" value={form.website} onChange={onChange} tabIndex={-1} autoComplete="off" />
                </label>
              </div>

              {mode === "signup" && (
                <div>
                  <label className="flex items-start gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      name="acceptTerms"
                      checked={form.acceptTerms}
                      onChange={onChange}
                      className="mt-0.5 h-4 w-4 accent-yellow-500"
                    />
                    <span>
                      I accept the{" "}
                      <button type="button" onClick={() => setShowTerms((v) => !v)} className="font-semibold text-yellow-700 underline">
                        affiliate terms{programme?.termsVersion ? ` (v${programme.termsVersion})` : ""}
                      </button>
                    </span>
                  </label>
                  {showTerms && (
                    <div className="mt-2 max-h-48 overflow-y-auto whitespace-pre-line rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
                      {programme?.termsText || "Terms are not available right now."}
                    </div>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              <PrimaryButton type="submit" disabled={busy} className="w-full py-2.5">
                {busy ? "Please wait…" : mode === "signup" ? "Sign up & get code" : "Send login code"}
              </PrimaryButton>
            </form>
          ) : (
            <form onSubmit={verify} noValidate className="space-y-3">
              {info && <InlineMessage tone="success">{info}</InlineMessage>}
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Enter the code sent to {form.email}</span>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  className={`${inputCls} text-center text-lg tracking-[0.4em]`}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <PrimaryButton type="submit" disabled={busy} className="w-full py-2.5">
                {busy ? "Verifying…" : "Verify & continue"}
              </PrimaryButton>
              <div className="flex justify-between text-xs">
                <button type="button" onClick={() => switchMode(mode)} className="text-gray-500 hover:underline">
                  Change email
                </button>
                <button type="button" onClick={resend} disabled={busy} className="font-semibold text-yellow-700 hover:underline">
                  Resend code
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};

export default AffiliateLanding;

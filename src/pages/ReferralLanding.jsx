import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { resolveReferralCode } from "../api/ReferralApi";
import { storeReferralScan } from "../utils/referralAttribution";

// Public landing for referral links and QR scans: /r/:code  (QR adds ?c=q).
// Must be fast on mobile (NFR-03) and must never stand between a visitor and signup
// (NFR-04): an invalid code or a failed/slow API just continues to the normal home page
// without any error (FR-17).
const ReferralLanding = () => {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [referral, setReferral] = useState(null);

  const isQr = searchParams.get("c") === "q";

  useEffect(() => {
    let cancelled = false;
    const fallThrough = () => {
      if (!cancelled) navigate("/", { replace: true });
    };
    if (!code) {
      fallThrough();
      return undefined;
    }
    resolveReferralCode(code, { isQr, timeout: 5000 })
      .then((data) => {
        if (cancelled) return;
        if (data?.valid && data.scanToken) {
          storeReferralScan({ scanToken: data.scanToken, expiresAt: data.expiresAt });
          setReferral(data);
        } else {
          fallThrough();
        }
      })
      .catch(fallThrough);
    return () => {
      cancelled = true;
    };
  }, [code, isQr, navigate]);

  if (!referral) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-yellow-200 border-t-[#FFC42A]" />
      </div>
    );
  }

  const name = referral.referrer?.name;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <img src="/Images/image.png" alt="Bizpole" className="h-9" />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-dashed border-yellow-400 bg-white p-6 text-center shadow-sm">
          <span className="inline-block rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">
            You&apos;ve been referred
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-gray-900">
            {name ? `Referred by ${name}` : "Welcome to Bizpole"}
          </h1>
          {referral.benefitText && (
            <p className="mt-3 rounded-xl bg-yellow-50 px-4 py-3 text-sm font-semibold text-gray-800">
              {referral.benefitText}
            </p>
          )}
          <p className="mt-3 text-sm text-gray-600">
            Company registration, GST, licences and compliance — handled end to end by Bizpole experts.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => navigate("/startbusiness")}
              className="w-full rounded-xl bg-[#FFC42A] px-4 py-3 text-sm font-bold text-gray-900 hover:bg-yellow-400"
            >
              Start your business
            </button>
            <button
              type="button"
              onClick={() => navigate("/", { replace: true, state: { openSignupModal: true } })}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Create an account
            </button>
          </div>
          <p className="mt-4 text-[11px] text-gray-400">
            Referral benefits apply to your first order only.
          </p>
        </div>
      </main>
    </div>
  );
};

export default ReferralLanding;

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserRound, MessageCircle, Phone, Mail, Gift, ArrowRight } from "lucide-react";
import useSelectedCompany from "../../hooks/useSelectedCompany";
import { getRelationshipReferral } from "../../api/DashboardApi";
import { getReferralMe } from "../../api/ReferralApi";
import { CopyButton } from "../referrals/ReferralLinkCard";
import { SHOW_CUSTOMER_REFER_AND_EARN } from "../../utils/featureFlags";

const RelationshipReferral = () => {
  const { companyId } = useSelectedCompany();
  const [rm, setRm] = useState(null);
  const [programme, setProgramme] = useState(null); // GET /referrals/me payload, or null
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setRm(null);
      setProgramme(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    // Referral terms/code now come from the programme API (GET /referrals/me); the old
    // relationship-referral payload is only used for the relationship manager. Either call
    // failing just hides its half — never the whole card.
    Promise.allSettled([
      getRelationshipReferral(companyId),
      SHOW_CUSTOMER_REFER_AND_EARN ? getReferralMe("customer", companyId) : Promise.resolve(null),
    ]).then(([rmRes, refRes]) => {
      if (cancelled) return;
      const rmData = rmRes.status === "fulfilled" ? rmRes.value : null;
      setRm(rmData?.success ? rmData.data?.relationshipManager || null : null);
      setProgramme(refRes.status === "fulfilled" ? refRes.value || null : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const referrer = programme?.programmeEnabled ? programme.referrer : null;
  const terms = programme?.terms || {};

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 animate-pulse">
        <div className="h-40 rounded-3xl bg-amber-50/60" />
        {SHOW_CUSTOMER_REFER_AND_EARN && <div className="h-40 rounded-2xl bg-yellow-50" />}
      </div>
    );
  }

  const digits = String(rm?.phone || "").replace(/\D/g, "");
  const whatsapp = digits ? `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}` : null;

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Relationship manager */}
      <div className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/70 p-5 md:p-7">
        {rm ? (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="flex flex-1 items-center gap-5">
              <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full border-[3px] border-amber-400 bg-amber-100 text-2xl font-extrabold text-amber-700">
                {rm.initials || <UserRound className="h-8 w-8" />}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Your Relationship Manager
                </p>
                <p className="text-xl font-bold text-gray-900">{rm.name}</p>
                <p className="text-sm font-medium text-gray-700">Relationship Manager</p>
                <p className="mt-1 max-w-xs text-sm text-gray-400">
                  Your dedicated partner for all compliance and filing support.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:w-72">
              {rm.phone && (
                <a href={`tel:${rm.phone}`} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-500">
                    <Phone className="h-4 w-4" />
                  </span>
                  <span>
                    <b className="block text-sm text-gray-900">{rm.phone}</b>
                    <small className="text-xs text-gray-400">Mon – Sat, 10:00 AM – 7:00 PM</small>
                  </span>
                </a>
              )}
              {rm.email && (
                <a href={`mailto:${rm.email}`} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <b className="block truncate text-sm text-gray-900">{rm.email}</b>
                    <small className="text-xs text-gray-400">Email your RM</small>
                  </span>
                </a>
              )}
            </div>

            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 lg:self-center"
              >
                <MessageCircle className="h-4 w-4" /> Chat Now <ArrowRight className="h-4 w-4" />
              </a>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <UserRound className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Your Relationship Manager
              </p>
              <p className="text-sm text-gray-500">No relationship manager assigned yet.</p>
            </div>
          </div>
        )}
      </div>

      {/* Referral */}
      {SHOW_CUSTOMER_REFER_AND_EARN && (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-yellow-400 bg-yellow-50 p-5 text-center">
        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-100 text-yellow-700">
          <Gift className="h-5 w-5" />
        </div>
        {referrer ? (
          <>
            <h4 className="text-base font-bold text-gray-800">Refer a business to Bizpole</h4>
            <div className="mx-auto my-2 max-w-sm space-y-1 text-xs text-gray-600">
              {terms.discountText && <p>They get: {terms.discountText}</p>}
              {terms.rewardText && <p>You get: {terms.rewardText}</p>}
              <p className="text-[11px] text-gray-500">Applies to the referred client&apos;s first order only.</p>
            </div>
            {referrer.code && (
              <div className="inline-flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2 font-extrabold tracking-wide text-gray-800">
                {referrer.code}
                <CopyButton text={referrer.link || referrer.code} label="Copy link" />
              </div>
            )}
            <Link
              to="/dashboard/bizpoleone/referrals"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-yellow-800 hover:underline"
            >
              QR code, stats &amp; credit <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
        ) : (
          <>
            <h4 className="text-base font-bold text-gray-800">Refer &amp; Earn</h4>
            <p className="mx-auto my-2 max-w-sm text-xs text-gray-600">
              Referral rewards aren&apos;t available for this account right now.
            </p>
          </>
        )}
      </div>
      )}
    </div>
  );
};

export default RelationshipReferral;

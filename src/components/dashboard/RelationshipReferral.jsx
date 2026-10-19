import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserRound, MessageCircle, Phone, CalendarPlus, Gift, ArrowRight } from "lucide-react";
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

  const gridCls = SHOW_CUSTOMER_REFER_AND_EARN ? "grid grid-cols-1 gap-4 lg:grid-cols-2" : "grid grid-cols-1 gap-4";

  if (loading) {
    return (
      <div className={`${gridCls} animate-pulse`}>
        <div className="h-48 rounded-2xl bg-white shadow-sm" />
        {SHOW_CUSTOMER_REFER_AND_EARN && <div className="h-48 rounded-2xl bg-yellow-50" />}
      </div>
    );
  }

  return (
    <div className={gridCls}>
      {/* Relationship manager */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
            <UserRound className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">Your Relationship Manager</h3>
        </div>

        {rm ? (
          <>
            <div className="flex items-center gap-3.5">
              <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-yellow-100 text-lg font-extrabold text-yellow-700">
                {rm.initials || "—"}
              </div>
              <div>
                <b className="text-sm text-gray-800">{rm.name}</b>
                <p className="text-xs text-gray-500">Dedicated RM · Mon–Sat, 10am–7pm</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-yellow-400 px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-yellow-500">
                <MessageCircle className="h-3.5 w-3.5" /> Chat
              </button>
              <a
                href={rm.phone ? `tel:${rm.phone}` : undefined}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
              <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                <CalendarPlus className="h-3.5 w-3.5" /> Book meeting
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400">No relationship manager assigned yet.</p>
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

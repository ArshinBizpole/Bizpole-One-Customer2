import { useCallback, useEffect, useState } from "react";
import { getReferralMe } from "../../api/ReferralApi";
import ReferralQrCard from "./ReferralQrCard";
import ReferralLinkCard from "./ReferralLinkCard";
import { CreditPanel, EarningsPanel, ReferralFunnel, ReferralTerms } from "./ReferralPanels";
import { MyLedgerTable, MyReferralsTable } from "./ReferralTables";
import KycForm from "./KycForm";
import { InlineMessage, SecondaryButton } from "./ReferralUi";

const STATUS_BANNER = {
  pending: {
    tone: "warn",
    text: "Your referral account is awaiting approval — your QR code and link will work once approved.",
  },
  suspended: {
    tone: "error",
    text: "Your referral account is suspended. New scans are not being counted. Please contact Bizpole support.",
  },
  rejected: {
    tone: "error",
    text: "Your referral account application was not approved. Please contact Bizpole support for details.",
  },
};

// One view for all three referrer kinds. `role` picks the session token; customers also
// need `companyId`. Cash referrers (partner / affiliate) see earnings + KYC; customers see
// account credit.
const ReferralProgrammeView = ({ role, companyId, title = "Refer & Earn" }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const needsCompany = role === "customer";

  const load = useCallback(() => {
    if (needsCompany && !companyId) {
      setLoading(false);
      setData(null);
      return () => {};
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    getReferralMe(role, companyId)
      .then((d) => {
        if (!cancelled) setData(d || null);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Could not load your referral details.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role, companyId, needsCompany]);

  useEffect(() => load(), [load, refreshKey]);

  const header = (
    <div className="mb-4">
      <h1 className="text-xl font-bold text-gray-900 md:text-2xl">{title}</h1>
      <p className="text-sm text-gray-500">
        Share your link or QR code. When someone you refer places their first order with Bizpole,
        you both benefit.
      </p>
    </div>
  );

  if (needsCompany && !companyId) {
    return (
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        {header}
        <InlineMessage>Select a company to see its referral details.</InlineMessage>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        {header}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-56 animate-pulse rounded-2xl bg-white shadow-sm" />
          <div className="h-56 animate-pulse rounded-2xl bg-white shadow-sm" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-6xl space-y-3 p-4 md:p-6">
        {header}
        <InlineMessage tone="error">{error}</InlineMessage>
        <SecondaryButton onClick={() => setRefreshKey((k) => k + 1)}>Try again</SecondaryButton>
      </div>
    );
  }

  if (!data?.programmeEnabled || !data?.referrer) {
    return (
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        {header}
        <InlineMessage>The referral programme is not available for your account right now.</InlineMessage>
      </div>
    );
  }

  const { referrer, terms, funnel, earnings, credit } = data;
  const isCash = role === "partner" || role === "affiliate";
  const banner = STATUS_BANNER[referrer.status];

  const kyc = isCash ? (
    <KycForm
      role={role}
      kycStatus={referrer.kycStatus}
      kycNote={referrer.kycNote}
      bank={referrer.bank}
      onSubmitted={() => setRefreshKey((k) => k + 1)}
    />
  ) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      {header}
      {banner && <InlineMessage tone={banner.tone}>{banner.text}</InlineMessage>}

      {/* KYC sits near the top (prominent while it still needs action — payouts are blocked
          without it). Kept in one position so it does not remount after a submit. */}
      {kyc}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReferralLinkCard link={referrer.link} code={referrer.code} discountText={terms?.discountText} />
        <ReferralQrCard
          role={role}
          companyId={companyId}
          code={referrer.code}
          inactive={referrer.status !== "active"}
        />
      </div>

      <ReferralTerms terms={terms} kind={isCash ? "commission" : "credit"} />
      <ReferralFunnel funnel={funnel} />

      {isCash ? <EarningsPanel earnings={earnings} /> : <CreditPanel credit={credit} />}

      <MyReferralsTable role={role} companyId={companyId} refreshKey={refreshKey} />
      <MyLedgerTable role={role} companyId={companyId} refreshKey={refreshKey} />
    </div>
  );
};

export default ReferralProgrammeView;

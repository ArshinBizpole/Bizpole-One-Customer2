import { BarChart3, FileText, Wallet, Gift } from "lucide-react";
import { Card, Stat } from "./ReferralUi";
import { formatDate, formatINR } from "./format";

export const ReferralFunnel = ({ funnel }) => {
  const f = funnel || {};
  const steps = [
    { label: "Scans / clicks", value: f.scans ?? 0, hint: `${f.qrScans ?? 0} QR · ${f.linkScans ?? 0} link` },
    { label: "Sign-ups", value: f.signups ?? 0 },
    { label: "Leads", value: f.leads ?? 0 },
    { label: "Deals", value: f.deals ?? 0 },
    { label: "Orders", value: f.orders ?? 0 },
  ];
  return (
    <Card title="Your referral funnel" icon={<BarChart3 className="h-4 w-4" />}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {steps.map((s) => (
          <Stat key={s.label} label={s.label} value={Number(s.value).toLocaleString("en-IN")} hint={s.hint} />
        ))}
      </div>
    </Card>
  );
};

export const ReferralTerms = ({ terms, kind }) => {
  const t = terms || {};
  const notes = Array.isArray(t.notes) ? t.notes : [];
  return (
    <Card title="How it works" icon={<FileText className="h-4 w-4" />}>
      <ul className="space-y-2 text-sm text-gray-700">
        {t.discountText && (
          <li>
            <span className="font-semibold text-gray-800">Your referral gets: </span>
            {t.discountText}
          </li>
        )}
        {t.rewardText && (
          <li>
            <span className="font-semibold text-gray-800">You get: </span>
            {t.rewardText}
          </li>
        )}
        {t.firstOrderOnly !== false && (
          <li>Rewards apply to the referred client&apos;s first order only.</li>
        )}
        {kind === "credit" && (
          <li>
            Referral credit can only be used against your own future Bizpole services. It is not
            cash and cannot be transferred.
          </li>
        )}
        {kind === "commission" && (
          <li>
            Commission becomes withdrawable once the referred order is fully paid, and is paid out
            after approval and KYC verification (TDS applies as per law).
          </li>
        )}
        {notes.map((n, i) => (
          <li key={i} className="text-gray-600">
            {n}
          </li>
        ))}
      </ul>
    </Card>
  );
};

// FR-34: earned, withdrawable, approved, in payout and paid are shown separately — never
// summed into one "balance" the referrer might mistake for cash available today.
export const EarningsPanel = ({ earnings }) => {
  if (!earnings) return null;
  const e = earnings;
  return (
    <Card title="Your earnings" icon={<Wallet className="h-4 w-4" />}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Earned" value={formatINR(e.earned)} hint="Order placed, not yet fully paid" />
        <Stat label="Withdrawable" value={formatINR(e.withdrawable)} hint="Order fully paid, awaiting approval" highlight />
        <Stat label="Approved" value={formatINR(e.approved)} hint="Approved, queued for next payout" />
        <Stat label="In payout" value={formatINR(e.inPayout)} hint="Being transferred to your bank" />
        <Stat label="Paid" value={formatINR(e.paid)} hint="Transferred to you" />
        <Stat label="Reversed" value={formatINR(e.reversed)} hint="Cancelled / refunded orders" />
      </div>
    </Card>
  );
};

export const CreditPanel = ({ credit }) => {
  if (!credit) return null;
  const c = credit;
  const expiring = Array.isArray(c.expiringSoon) ? c.expiringSoon : [];
  return (
    <Card title="Your referral credit" icon={<Gift className="h-4 w-4" />}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Available" value={formatINR(c.available)} highlight />
        <Stat label="Credited" value={formatINR(c.credited)} />
        <Stat label="Redeemed" value={formatINR(c.redeemed)} />
        <Stat label="Reversed" value={formatINR(c.reversed)} />
      </div>
      {expiring.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">Expiring soon</p>
          <ul className="mt-1 space-y-0.5 text-xs text-amber-900">
            {expiring.map((x, i) => (
              <li key={i}>
                {formatINR(x.amount)} on {formatDate(x.expiresAt)}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-xs text-gray-500">
        Credit can only be used against your own future Bizpole services — ask your relationship
        manager to apply it to a quote. It is not cash, cannot be withdrawn and is not transferable.
      </p>
    </Card>
  );
};

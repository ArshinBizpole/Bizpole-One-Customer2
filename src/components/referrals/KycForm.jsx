import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { submitMyKyc } from "../../api/ReferralApi";
import { Card, InlineMessage, PrimaryButton, StatusPill } from "./ReferralUi";

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const ACCOUNT_RE = /^[0-9]{9,18}$/;

const KYC_EDITABLE = ["requested", "not_submitted", "rejected"];

const mask = (value, visible = 4) => {
  if (!value) return "—";
  const s = String(value);
  if (s.length <= visible) return s;
  return `${"•".repeat(Math.min(8, s.length - visible))}${s.slice(-visible)}`;
};

const empty = {
  panNumber: "",
  accountHolderName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifsc: "",
  bankName: "",
};

const validate = (f) => {
  const errors = {};
  if (!PAN_RE.test(f.panNumber)) errors.panNumber = "Enter a valid PAN (e.g. ABCDE1234F)";
  if (f.accountHolderName.trim().length < 2) errors.accountHolderName = "Enter the name as per bank records";
  if (!ACCOUNT_RE.test(f.accountNumber)) errors.accountNumber = "Account number should be 9–18 digits";
  if (f.confirmAccountNumber !== f.accountNumber) errors.confirmAccountNumber = "Account numbers do not match";
  if (!IFSC_RE.test(f.ifsc)) errors.ifsc = "Enter a valid IFSC (e.g. HDFC0001234)";
  if (f.bankName.trim().length < 2) errors.bankName = "Enter your bank name";
  return errors;
};

const Field = ({ label, name, value, onChange, error, ...props }) => (
  <label className="block">
    <span className="text-xs font-semibold text-gray-600">{label}</span>
    <input
      name={name}
      value={value}
      onChange={onChange}
      className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-300 ${
        error ? "border-red-300" : "border-gray-200"
      }`}
      {...props}
    />
    {error && <span className="mt-0.5 block text-[11px] text-red-600">{error}</span>}
  </label>
);

const ReadOnlyRow = ({ label, value }) => (
  <div className="flex justify-between gap-3 border-b border-gray-50 py-1.5 text-sm last:border-0">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-800">{value || "—"}</span>
  </div>
);

// Bank details are only ever displayed masked. `bank` is optional — GET /referrals/me does
// not return bank fields today, so after a fresh submit we show what was just entered, masked.
const KycForm = ({ role, kycStatus, kycNote, bank, onSubmitted }) => {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [submitted, setSubmitted] = useState(null);

  const status = submitted ? "submitted" : kycStatus || "not_submitted";
  const editable = KYC_EDITABLE.includes(status);

  const onChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;
    if (name === "panNumber" || name === "ifsc") value = value.toUpperCase().replace(/\s/g, "");
    if (name === "accountNumber" || name === "confirmAccountNumber") value = value.replace(/\D/g, "");
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    setServerError("");
    try {
      await submitMyKyc(role, {
        panNumber: form.panNumber,
        accountHolderName: form.accountHolderName.trim(),
        accountNumber: form.accountNumber,
        ifsc: form.ifsc,
        bankName: form.bankName.trim(),
      });
      setSubmitted({
        pan: mask(form.panNumber),
        accountHolderName: form.accountHolderName.trim(),
        accountNumber: mask(form.accountNumber),
        ifsc: form.ifsc,
        bankName: form.bankName.trim(),
      });
      setForm(empty);
      onSubmitted?.();
    } catch (err) {
      setServerError(err?.message || "Could not submit your details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const shown = submitted || {
    pan: bank?.panMasked || bank?.pan,
    accountHolderName: bank?.accountHolderName,
    accountNumber: bank?.accountNumberMasked,
    ifsc: bank?.ifsc,
    bankName: bank?.bankName,
  };

  return (
    <Card
      title="KYC & bank details"
      icon={<ShieldCheck className="h-4 w-4" />}
      action={<StatusPill value={status} />}
      className={editable ? "border-yellow-300 ring-1 ring-yellow-200" : ""}
    >
      {editable ? (
        <form onSubmit={onSubmit} noValidate className="space-y-3">
          <InlineMessage tone={status === "rejected" ? "error" : "warn"}>
            {status === "rejected"
              ? "Your KYC details were not accepted. Please check and submit them again."
              : "Add your PAN and bank details so we can pay your commission. Payouts cannot be released without verified KYC."}
            {kycNote && <span className="mt-1 block text-xs opacity-90">Note: {kycNote}</span>}
          </InlineMessage>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="PAN" name="panNumber" value={form.panNumber} onChange={onChange} error={errors.panNumber} maxLength={10} autoComplete="off" placeholder="ABCDE1234F" />
            <Field label="Account holder name" name="accountHolderName" value={form.accountHolderName} onChange={onChange} error={errors.accountHolderName} autoComplete="name" />
            <Field label="Account number" name="accountNumber" value={form.accountNumber} onChange={onChange} error={errors.accountNumber} inputMode="numeric" autoComplete="off" maxLength={18} />
            <Field
              label="Confirm account number"
              name="confirmAccountNumber"
              value={form.confirmAccountNumber}
              onChange={onChange}
              error={errors.confirmAccountNumber}
              inputMode="numeric"
              autoComplete="off"
              maxLength={18}
              onPaste={(e) => e.preventDefault()}
            />
            <Field label="IFSC" name="ifsc" value={form.ifsc} onChange={onChange} error={errors.ifsc} maxLength={11} autoComplete="off" placeholder="HDFC0001234" />
            <Field label="Bank name" name="bankName" value={form.bankName} onChange={onChange} error={errors.bankName} />
          </div>
          {serverError && <p className="text-sm text-red-600">{serverError}</p>}
          <PrimaryButton type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Submitting…" : "Submit for verification"}
          </PrimaryButton>
        </form>
      ) : (
        <div>
          <p className="mb-2 text-xs text-gray-600">
            {status === "verified"
              ? "Your KYC is verified. Payouts go to the account below."
              : "Your details are under review. We'll let you know once they are verified."}
          </p>
          <ReadOnlyRow label="PAN" value={shown.pan} />
          <ReadOnlyRow label="Account holder" value={shown.accountHolderName} />
          <ReadOnlyRow label="Account number" value={shown.accountNumber} />
          <ReadOnlyRow label="IFSC" value={shown.ifsc} />
          <ReadOnlyRow label="Bank" value={shown.bankName} />
        </div>
      )}
    </Card>
  );
};

export default KycForm;

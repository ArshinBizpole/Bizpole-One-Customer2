import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import CryptoJS from "crypto-js";
import { loadQuoteCheckout, previewQuoteCheckoutCode, redeemOfferOnQuote } from "../api/OfferApi";
import { getClientBaseUrl } from "../utils/clientBaseUrl";

// Dashboard → Quotes → View on an open quote: the quote's amounts and offers
// first (same as the apply flow's Payment step), then the quote opens for
// approval and payment. A picked offer is only a preview until "Review &
// Approve Quote" — then it is recorded once on the quote (redeemOfferOnQuote)
// before the quote opens, so the quote and the payment show the discount.

const rupee = (n) =>
  `₹${(Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const quoteApprovalUrl = (quoteId) => {
  const secret = import.meta.env.VITE_QUOTE_LINK_SECRET || "q3!9fKs7@pLzXr84$nmYtB!cVZdQ3";
  const encrypted = CryptoJS.AES.encrypt(String(quoteId), secret).toString();
  return `${getClientBaseUrl()}/quotes/saved-preview/${encodeURIComponent(encrypted)}`;
};

const offerLabel = (o) =>
  o.type === "PERCENTAGE" ? `${o.value}% off${o.maxDiscount ? ` (up to ${rupee(o.maxDiscount)})` : ""}` : `${rupee(o.value)} off`;

// The fee parts of one quote line that are actually charged.
const lineParts = (l) =>
  [
    ["Professional fee", l.professionalFee],
    ["Vendor fee", l.vendorFee],
    ["Government fee", l.govtFee],
    ["Contractor fee", l.contractorFee],
    ["GST", l.gst],
  ].filter(([, v]) => Number(v) > 0);

const QuoteCheckout = () => {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState(null); // { code, discount, finalAmount } — preview only
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [offerError, setOfferError] = useState(null);
  const [opening, setOpening] = useState(false);

  const load = async () => {
    const res = await loadQuoteCheckout(Number(quoteId));
    setData(res);
    setLoading(false);
    if (!res?.open) setPicked(null);
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [quoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = async (promoCode) => {
    const value = String(promoCode || "").trim();
    if (!value || checking) return;
    setChecking(true);
    const r = await previewQuoteCheckoutCode(Number(quoteId), value);
    setChecking(false);
    if (r?.valid) {
      setPicked({ code: r.code || value, discount: Number(r.discount) || 0, finalAmount: Number(r.finalAmount) || 0 });
      setOfferError(null);
      setCode("");
    } else {
      setOfferError(r?.message || "This offer can't be applied");
    }
  };
  const remove = () => {
    setPicked(null);
    setOfferError(null);
  };

  const openQuote = async () => {
    if (opening) return;
    setOpening(true);
    // Opened inside the click so the browser doesn't block it as a pop-up.
    const tab = window.open("", "_blank");
    if (picked?.code && data?.open) {
      const r = await redeemOfferOnQuote(Number(quoteId), picked.code);
      if (!r?.valid) {
        tab?.close();
        setPicked(null);
        setOfferError(r?.message || "This offer can't be applied");
        setOpening(false);
        load();
        return;
      }
    }
    const url = quoteApprovalUrl(quoteId);
    if (tab && !tab.closed) tab.location.href = url;
    else window.open(url, "_blank");
    setPicked(null);
    await load();
    setOpening(false);
  };

  if (loading) {
    return <div className="p-10 text-center text-sm text-gray-400">Loading quote…</div>;
  }
  if (!data) {
    return (
      <div className="mx-auto max-w-xl p-10 text-center">
        <p className="text-sm text-gray-500">Couldn't load this quote. Please go back and try again.</p>
        <button type="button" onClick={() => navigate("/dashboard/bizpoleone")} className="mt-4 text-sm font-semibold text-amber-600">
          ← Back to dashboard
        </button>
      </div>
    );
  }

  const { applied, open, lines, total, offers = [] } = data;
  const offer = applied || (open ? picked : null);
  const discount = offer ? Math.min(Number(offer.discount) || 0, total) : 0;
  // Once an offer is recorded the lines already carry it — the total is net.
  const payable = applied ? total : total - discount;
  const usable = offers.filter((o) => o.valid);
  const locked = offers.filter((o) => !o.valid);
  const pickedCode = String(picked?.code || "").toLowerCase();

  return (
    <div className="flex min-h-full w-full flex-col gap-6 md:p-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/dashboard/bizpoleone")}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Quote {data.quote?.code}</h1>
          <p className="text-sm text-gray-500 md:text-base">Check the amount and apply an offer before you approve.</p>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-8">
          <h3 className="mb-2 text-lg font-semibold md:text-xl">Fee summary</h3>
          {lines.map((l, i) => (
            <div key={i} className="mt-5">
              <div className="mb-1 text-sm font-bold uppercase tracking-wide text-amber-600">{l.name}</div>
              {lineParts(l).map(([label, v]) => (
                <div key={label} className="flex justify-between border-b border-dashed border-gray-100 py-3 text-base">
                  <span>{label}</span>
                  <b>{rupee(v)}</b>
                </div>
              ))}
            </div>
          ))}
          {offer && (
            <>
              <div className="mb-1 mt-5 text-sm font-bold uppercase tracking-wide text-amber-600">Offer</div>
              <div className="flex justify-between border-b border-dashed border-gray-100 py-3 text-base text-green-700">
                <span>Discount ({offer.code})</span>
                <b>− {rupee(discount)}</b>
              </div>
            </>
          )}
          <div className="mt-auto flex justify-between border-t border-gray-200 pt-5 text-xl font-bold md:text-2xl">
            <span>Total Amount</span>
            <span>{rupee(payable)}</span>
          </div>
          <p className="mt-3 text-sm text-gray-400">
            🔒 You'll review and approve this quote (with OTP verification) before any payment is taken.
          </p>
        </div>

        <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-8">
          <h3 className="mb-4 text-lg font-semibold md:text-xl">Offers</h3>
          {applied ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-base">
              <b className="text-green-700">Offer {applied.code} applied</b>
              <span className="mt-1 block text-sm text-green-700">You save {rupee(applied.discount)} on this quote.</span>
            </div>
          ) : !open ? (
            <p className="text-base text-gray-500">Offers can't be applied — this quote is already approved or paid.</p>
          ) : (
            <div>
              {usable.map((o) => {
                const isPicked = pickedCode === String(o.code).toLowerCase();
                return (
                  <button
                    key={o.id ?? o.code}
                    type="button"
                    disabled={checking || opening}
                    onClick={() => (isPicked ? remove() : apply(o.code))}
                    className={`mb-3 w-full rounded-xl border px-4 py-3 text-left text-base ${isPicked ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-amber-400"}`}
                  >
                    <span className="flex justify-between gap-2">
                      <b className="font-mono">{o.code}</b>
                      <span className="font-semibold text-green-700">{offerLabel(o)}</span>
                    </span>
                    {o.name && <span className="block text-sm text-gray-500">{o.name}</span>}
                    <span className="mt-1 block text-sm text-amber-600">{isPicked ? "Applied — tap to remove" : "Tap to apply"}</span>
                  </button>
                );
              })}
              {locked.map((o) => (
                <div key={o.id ?? o.code} className="mb-3 rounded-xl border border-dashed border-gray-200 px-4 py-3 text-base text-gray-400">
                  <span className="flex justify-between gap-2">
                    <b className="font-mono">{o.code}</b>
                    <span>{offerLabel(o)}</span>
                  </span>
                  {o.reason && <span className="block text-sm">{o.reason}</span>}
                </div>
              ))}
              {usable.length === 0 && locked.length === 0 && (
                <p className="mb-3 text-sm text-gray-400">No offers available right now — you can still enter a code.</p>
              )}
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") apply(code);
                  }}
                  placeholder="Have a code?"
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-3 text-base uppercase focus:border-amber-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => apply(code)}
                  disabled={!code.trim() || checking || opening}
                  className="rounded-xl border-2 border-amber-400 px-5 py-3 text-base font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                >
                  {checking ? "Checking…" : "Apply"}
                </button>
              </div>
              {picked?.code && !usable.some((o) => String(o.code).toLowerCase() === pickedCode) && (
                <div className="mt-3 flex items-center justify-between text-sm text-green-700">
                  <span>Code {picked.code} applied — you save {rupee(picked.discount)}</span>
                  <button type="button" onClick={remove} className="underline">
                    Remove
                  </button>
                </div>
              )}
              {offerError && <div className="mt-3 text-sm text-red-600">{offerError}</div>}
            </div>
          )}

          {/* Keeps a gap above the note when the offers fill the card. */}
          <div className="h-6 shrink-0" />
          <div className="mt-auto rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
            Opens your quote in a new tab to accept, verify, and choose how to pay. A GST invoice is emailed as soon as the
            payment succeeds.
          </div>
          <button
            type="button"
            onClick={openQuote}
            disabled={opening}
            className="mt-5 w-full rounded-xl bg-amber-400 py-4 text-base font-semibold md:text-lg text-gray-900 shadow-sm hover:bg-amber-500 disabled:opacity-60"
          >
            {opening ? "Opening…" : open ? "🔒 Review & Approve Quote →" : "Open Quote →"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard/bizpoleone")}
            className="mt-2 w-full rounded-xl py-3 text-base font-semibold text-gray-500 hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteCheckout;

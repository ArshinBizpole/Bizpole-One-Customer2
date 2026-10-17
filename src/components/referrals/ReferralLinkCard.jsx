import { useState } from "react";
import { Link2, Copy, Check, MessageCircle } from "lucide-react";
import { Card } from "./ReferralUi";

const buildShareText = (link, discountText) =>
  [
    "I use Bizpole for my business registrations and compliance.",
    discountText ? `Sign up with my link and get ${discountText}:` : "Sign up with my link:",
    link,
  ].join(" ");

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers without the async clipboard API.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
};

export const CopyButton = ({ text, label = "Copy", className = "" }) => {
  const [state, setState] = useState("idle");
  const onClick = async () => {
    const ok = await copyText(text);
    setState(ok ? "copied" : "failed");
    setTimeout(() => setState("idle"), 1500);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!text}
      className={`inline-flex items-center gap-1 text-xs font-semibold text-yellow-700 hover:underline disabled:opacity-50 ${className}`}
    >
      {state === "copied" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </button>
  );
};

const ReferralLinkCard = ({ link, code, discountText }) => {
  const whatsappHref = link
    ? `https://wa.me/?text=${encodeURIComponent(buildShareText(link, discountText))}`
    : undefined;

  return (
    <Card title="Your referral link" icon={<Link2 className="h-4 w-4" />}>
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-sm text-gray-800" title={link}>
          {link || "—"}
        </span>
        <CopyButton text={link} />
      </div>
      {code && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
          Referral code
          <span className="rounded-lg border border-dashed border-yellow-400 bg-yellow-50 px-2 py-0.5 font-extrabold tracking-wide text-gray-800">
            {code}
          </span>
          <CopyButton text={code} />
        </div>
      )}
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 sm:w-auto ${
          link ? "" : "pointer-events-none opacity-50"
        }`}
      >
        <MessageCircle className="h-4 w-4" /> Share on WhatsApp
      </a>
    </Card>
  );
};

export default ReferralLinkCard;

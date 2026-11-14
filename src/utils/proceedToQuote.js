import { toast } from "react-toastify";
import CryptoJS from "crypto-js";
import { upsertQuote } from "../api/Quote";
import { getSecureItem } from "./secureStorage";
import { fetchFranchiseeGstInfo, calcGstAmount, splitGst } from "./gstCalc";
import { getClientBaseUrl } from "./clientBaseUrl";

export const buildQuotePreviewUrl = (quoteId) => {
  const secret = import.meta.env.VITE_QUOTE_LINK_SECRET || "q3!9fKs7@pLzXr84$nmYtB!cVZdQ3";
  const encrypted = CryptoJS.AES.encrypt(String(quoteId), secret).toString();
  return `${getClientBaseUrl()}/quotes/saved-preview/${encodeURIComponent(encrypted)}`;
};

/**
 * "Proceed to Quote": creates a draft quote for every service in the cart and
 * opens its preview in a new tab. Must be called directly from a click handler
 * (after the sign-in check) so the browser doesn't block the new tab.
 * `services` is used to look up service names; falls back to AllServicesCache.
 */
// A cart entry carries a real price only when it came from the price master
// for the selected state — a missing price is stored as {} (Services page) or
// the zero placeholder flagged priceMissing (ServiceDetails).
const PRICE_KEYS = ["ProfessionalFee", "VendorFee", "GovernmentFee", "GovtFee", "ContractFee", "ContractorFee"];
const hasPrice = (p) =>
  !!p && !p.priceMissing && PRICE_KEYS.some((k) => p[k] !== undefined && p[k] !== null && p[k] !== "");

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Shown in the new tab while the quote is created and the preview loads, so
// the customer sees what's happening instead of an empty tab.
const loadingPageHtml = (serviceNames) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Preparing your quotation…</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;background:#f7f7f8;color:#1f2937;font-family:Poppins,system-ui,-apple-system,"Segoe UI",sans-serif}
  .wrap{min-height:100%;display:flex;align-items:center;justify-content:center;padding:16px}
  .card{width:100%;max-width:420px;background:#fff;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,.08);padding:32px 28px;text-align:center}
  .spinner{width:56px;height:56px;margin:0 auto 20px;border-radius:50%;border:5px solid #fdf3c7;border-top-color:#F3C625;animation:spin .9s linear infinite}
  h1{font-size:20px;margin:0 0 6px}
  p.sub{font-size:13px;color:#6b7280;margin:0 0 22px}
  ul.svc{list-style:none;margin:0 0 22px;padding:12px 14px;background:#fffbea;border:1px solid #fdeaa0;border-radius:12px;text-align:left}
  ul.svc li{font-size:13px;font-weight:600;padding:4px 0}
  ul.svc li:before{content:"\\2713";color:#d4a800;margin-right:8px}
  ol.steps{list-style:none;margin:0;padding:0;text-align:left}
  ol.steps li{display:flex;align-items:center;gap:10px;font-size:13px;color:#9ca3af;padding:6px 0;animation:on .4s forwards}
  ol.steps li span{width:18px;height:18px;border-radius:50%;border:2px solid #e5e7eb;flex-shrink:0;animation:dot .4s forwards}
  ol.steps li:nth-child(1),ol.steps li:nth-child(1) span{animation-delay:.2s}
  ol.steps li:nth-child(2),ol.steps li:nth-child(2) span{animation-delay:1.4s}
  ol.steps li:nth-child(3),ol.steps li:nth-child(3) span{animation-delay:2.8s}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes on{to{color:#1f2937}}
  @keyframes dot{to{border-color:#F3C625;background:#F3C625}}
</style></head>
<body><div class="wrap"><div class="card">
  <div class="spinner"></div>
  <h1>Preparing your quotation</h1>
  <p class="sub">This usually takes a few seconds. Please keep this tab open.</p>
  ${serviceNames.length ? `<ul class="svc">${serviceNames.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>` : ""}
  <ol class="steps">
    <li><span></span>Saving your selected services</li>
    <li><span></span>Calculating fees and GST</li>
    <li><span></span>Opening your quotation</li>
  </ol>
</div></div></body></html>`;

/** Returns the new QuoteID once the quote is created, otherwise null. */
export async function proceedToQuote({ cart, services = [] }) {
  // No made-up prices: if any selected service has no price for the chosen
  // state, tell the customer which and create no quote (checked before the
  // tab opens, so no blank tab is left behind).
  const unpriced = Object.keys(cart || {}).filter((sid) => !hasPrice(cart[sid]));
  if (unpriced.length) {
    let cache = [];
    try { cache = JSON.parse(localStorage.getItem("AllServicesCache") || "[]"); } catch { cache = []; }
    const nameOf = (sid) =>
      cart[sid]?.ServiceName ||
      services.find((s) => String(s.ServiceID) === String(sid))?.ServiceName ||
      cache.find((s) => String(s.ServiceID) === String(sid))?.ServiceName ||
      `Service #${sid}`;
    toast.error(`Price isn't available yet for ${unpriced.map(nameOf).join(", ")} in your state. Remove it from your selection or contact us for a quote.`);
    return null;
  }

  // Open the tab synchronously, tied to this click, so the browser
  // doesn't block it — then redirect it once the quote is ready below.
  const previewTab = window.open("", "_blank");
  if (previewTab) {
    let cache = [];
    try { cache = JSON.parse(localStorage.getItem("AllServicesCache") || "[]"); } catch { cache = []; }
    const serviceNames = Object.keys(cart || {})
      .map((sid) =>
        cart[sid]?.ServiceName ||
        services.find((s) => String(s.ServiceID) === String(sid))?.ServiceName ||
        cache.find((s) => String(s.ServiceID) === String(sid))?.ServiceName)
      .filter(Boolean);
    previewTab.document.open();
    previewTab.document.write(loadingPageHtml(serviceNames));
    previewTab.document.close();
  }
  try {
    const user = getSecureItem("user");
    const selectedCompany = getSecureItem("selectedCompany");
    const franchiseeId = user?.FranchiseeId || user?.FranchiseeID || 1;
    const employeeId = user?.EmployeeID || 9;
    const employeeName = user?.FirstName || "admin";
    const customerId = user?.CustomerID || 2;
    const customerName = user?.FirstName ? `${user.FirstName} ${user.LastName || ''}`.trim() : "John Doe";
    const stateName = selectedCompany?.State || "";
    const companyName = selectedCompany?.CompanyName || "";
    const companyId = selectedCompany?.CompanyID || null;

    const selectedServiceIds = Object.keys(cart).map(Number);
    const { gstEligible, state: franchiseeState } = await fetchFranchiseeGstInfo(franchiseeId);
    const serviceDetails = selectedServiceIds.map(sid => {
      let svc = services.find(s => s.ServiceID === sid);
      if (!svc) {
        try {
          const allCache = JSON.parse(localStorage.getItem("AllServicesCache") || "[]");
          svc = allCache.find(s => s.ServiceID === sid);
        } catch (error) { console.error("Error fetching services:", error); }
      }
      const price = cart[sid] || {};
      // Every entry here has a real price (checked above) — a fee the price
      // master leaves out is simply 0, never a made-up default.
      const professionalFee = Number(price.ProfessionalFee ?? 0);
      const vendorFee = Number(price.VendorFee ?? 0);
      const govtFee = Number(price.GovernmentFee ?? price.GovtFee ?? 0);
      const contractorFee = Number(price.ContractFee ?? price.ContractorFee ?? 0);
      const discount = Number(price.Discount ?? 0);
      const rounding = Number(price.Rounding ?? 0);
      const gstAmount = calcGstAmount(professionalFee, vendorFee, gstEligible);
      const { cgst, sgst, igst } = splitGst(gstAmount, franchiseeState, stateName);
      const total = professionalFee + vendorFee + govtFee + contractorFee - discount + gstAmount;
      const advanceAmount = Math.ceil(total * 0.3);
      return {
        ServiceID: svc?.ServiceID,
        ItemName: svc?.ServiceName,
        ProfessionalFee: professionalFee,
        VendorFee: vendorFee,
        GovtFee: govtFee,
        ContractorFee: contractorFee,
        GSTPercent: gstEligible ? 18 : 0,
        GstAmount: gstAmount,
        CGST: cgst,
        SGST: sgst,
        IGST: igst,
        Discount: discount,
        Rounding: rounding,
        Total: total,
        AdvanceAmount: advanceAmount,
        IsManual: 0,
        IsIndividual: 1
      };
    });

    const selectedServicePrices = {};
    selectedServiceIds.forEach(sid => {
      selectedServicePrices[sid] = cart[sid] || {};
    });

    const payload = {
      IsIndividual: 1,
      IsMonthly: 0,
      FranchiseeID: franchiseeId,
      SelectedCompany: { CompanyID: companyId, CompanyName: companyName, State: stateName },
      SelectedCustomer: { CustomerID: customerId, CustomerName: customerName },
      QuoteCRE: { EmployeeID: employeeId, EmployeeName: employeeName },
      SourceOfSale: "Website",
      StateService: stateName,
      Remarks: "Generated from services page",
      QuoteStatus: "Draft",
      IsDirect: 1,
      ServiceDetails: serviceDetails,
      SelectedServices: selectedServiceIds,
      SelectedServicePrices: selectedServicePrices,
      MailQuoteCustomers: [{ CustomerID: customerId, CustomerName: customerName, Email: user?.Email || "" }],
      PaymentType: 0,
      EmployeeID: employeeId
    };

    payload.is_manual = 0;
    const data = await upsertQuote(payload);
    const quoteId = data?.QuoteID;
    toast.success("Requested quote");
    if (quoteId) {
      const url = buildQuotePreviewUrl(quoteId);
      if (previewTab) {
        previewTab.location.href = url;
      } else {
        window.open(url, "_blank");
      }
      return quoteId;
    }
    if (previewTab) previewTab.close();
    return null;
  } catch (err) {
    if (previewTab) previewTab.close();
    console.error("Error creating quote from cart:", err);
    toast.error(err?.response?.data?.message || "Failed to create quote. Please try again.");
    return null;
  }
}

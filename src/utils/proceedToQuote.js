import { toast } from "react-toastify";
import CryptoJS from "crypto-js";
import { upsertQuote } from "../api/Quote";
import { getSecureItem } from "./secureStorage";
import { fetchFranchiseeGstInfo, calcGstAmount, splitGst } from "./gstCalc";

export const buildQuotePreviewUrl = (quoteId) => {
  const secret = import.meta.env.VITE_QUOTE_LINK_SECRET || "q3!9fKs7@pLzXr84$nmYtB!cVZdQ3";
  const encrypted = CryptoJS.AES.encrypt(String(quoteId), secret).toString();
  return `${import.meta.env.VITE_CLIENT_BASE_URL}/quotes/saved-preview/${encodeURIComponent(encrypted)}`;
};

/**
 * "Proceed to Quote": creates a draft quote for every service in the cart and
 * opens its preview in a new tab. Must be called directly from a click handler
 * (after the sign-in check) so the browser doesn't block the new tab.
 * `services` is used to look up service names; falls back to AllServicesCache.
 */
export async function proceedToQuote({ cart, services = [] }) {
  // Open the tab synchronously, tied to this click, so the browser
  // doesn't block it — then redirect it once the quote is ready below.
  const previewTab = window.open("", "_blank");
  if (previewTab) {
    previewTab.document.write(
      '<title>Loading your quote…</title><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;color:#666">Loading your quote…</body>'
    );
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
      const professionalFee = Number(price.ProfessionalFee ?? 100);
      const vendorFee = Number(price.VendorFee ?? 100);
      const govtFee = Number(price.GovernmentFee ?? 100);
      const contractorFee = Number(price.ContractFee ?? 100);
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
    } else if (previewTab) {
      previewTab.close();
    }
  } catch (err) {
    if (previewTab) previewTab.close();
    console.error("Error creating quote from cart:", err);
    toast.error(err?.response?.data?.message || "Failed to create quote. Please try again.");
  }
}

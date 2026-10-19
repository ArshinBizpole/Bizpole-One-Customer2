import { resolveGstSplit } from "./gstSplit";

// One place that turns an invoiceforservice row (+ the issuing franchisee) into
// everything the customer invoice prints, so the on-screen preview
// (InvoicePreview.jsx) and the downloaded PDF (invoicePdf.js) can't drift apart.
//
// Each invoiceforservice row is ONE service line with its own frozen figures
// (ServiceNameSnapshot, ProfessionalFee, VendorFee, GstAmount, InvoiceValue …).
// Rows without those figures (older invoices) fall back to the order's service
// details as before.

const clean = (v) => {
  const s = String(v ?? "").trim();
  return !s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined" ? "" : s;
};
const num = (v) => parseFloat(v) || 0;
const round2 = (n) => Math.round(n * 100) / 100;
const hasValue = (v) => v !== null && v !== undefined && v !== "";

// A rate worked back from a rupee-rounded GST amount is slightly off (270 / 1499 =
// 18.01%), so snap it to the nearest GST slab when it's that close.
const GST_SLABS = [0.25, 3, 5, 12, 18, 28, 40];
const toGstSlab = (pct) => {
  const slab = GST_SLABS.reduce((best, s) => (Math.abs(s - pct) < Math.abs(best - pct) ? s : best));
  return Math.abs(slab - pct) <= 0.5 ? slab : round2(pct);
};

const parseSnapshot = (snap) => {
  if (!snap) return null;
  if (typeof snap === "object") return snap;
  try {
    return JSON.parse(snap);
  } catch {
    return null;
  }
};

// "Line 1", "Line 2", "District, State - PIN"
const addressLines = (a) => {
  if (!a) return [];
  const pin = clean(a.PinCode);
  const place = [clean(a.District), clean(a.State)].filter(Boolean).join(", ");
  const line1 = clean(a.AddressLine1);
  // Some records repeat line 1 in line 2 — print it once.
  const line2 = clean(a.AddressLine2) === line1 ? "" : clean(a.AddressLine2);
  return [line1, line2, [place, pin].filter(Boolean).join(" - ")].filter(Boolean);
};

const hasStreetAddress = (a) => !!(a && (clean(a.AddressLine1) || clean(a.AddressLine2) || clean(a.PinCode)));

export const buildInvoiceView = (invoice, franchiseeDetails, { billToName: billToOverride } = {}) => {
  const snapshot = parseSnapshot(invoice.PartySnapshot);
  const seller = snapshot?.seller || {};
  const buyer = snapshot?.buyer || {};
  const company = invoice.billTo?.company || null;
  const customer = invoice.billTo?.customer || null;

  // ---- FROM (issuing franchisee) ------------------------------------------
  const fromName = franchiseeDetails?.DisplayName || franchiseeDetails?.FranchiseeName
    || seller.DisplayName || invoice.FranchiseeName || "Bizpole";
  const from = franchiseeDetails || (snapshot?.seller ? seller : null);
  const fromLines = from
    ? [
        clean(from.AddressLine1),
        clean(from.AddressLine2),
        [from.City, from.State, from.Pincode].map(clean).filter(Boolean).join(", "),
      ].filter(Boolean)
    : [
        "2ND FLOOR, FALCON COMPLEX, OPP HPCL PETROL BUNK, NURANI",
        "Palakkad City, Palakkad - 678014, Kerala, India",
      ];
  const sellerCin = franchiseeDetails?.CIN || seller.CIN || "U70200KL2023PTC083967";
  const sellerPan = franchiseeDetails?.PAN || seller.PAN || "AAMCB0068L";
  const sellerGstin = franchiseeDetails?.GSTNumber || seller.GSTNumber || "32AAMCB0068L1ZN";
  // The franchisee as frozen at issue decides the tax heads; live record as fallback.
  const supplierState = clean(seller.State) || clean(franchiseeDetails?.State);
  const supplierGstin = clean(seller.GSTNumber) || clean(franchiseeDetails?.GSTNumber);

  // ---- BILL TO (company the quote was raised to; contact person under it) --
  const billToName = clean(company?.BusinessName) || clean(billToOverride)
    || clean(invoice.CompanyName) || clean(invoice.PrimaryCustomer) || "Customer";
  const contactName = [customer?.FirstName, customer?.LastName].map(clean).filter(Boolean).join(" ")
    || clean(invoice.customerName) || clean(invoice.PrimaryCustomer);
  // Company address first; the contact's own address only if the company has none.
  const billToLines = hasStreetAddress(company) ? addressLines(company)
    : hasStreetAddress(customer) ? addressLines(customer)
    : addressLines(company || customer);
  const recipientGstin = clean(company?.GSTNumber) || clean(buyer.company?.GSTNumber);
  const recipientPan = clean(company?.CompanyPAN) || clean(buyer.company?.CompanyPAN);
  const billToPhone = clean(company?.CompanyMobile) || clean(customer?.Mobile);
  const billToEmail = clean(company?.CompanyEmail) || clean(customer?.Email);

  // Place of supply is the RECIPIENT's state (company's, else the contact's) —
  // same rule as the CRM invoice — not the state the service was quoted for.
  const placeOfSupply = clean(company?.State) || clean(customer?.State)
    || clean(buyer.company?.CompanyState) || clean(buyer.customer?.CustomerState)
    || clean(invoice.state);

  // ---- Service lines + totals ---------------------------------------------
  let lines;
  let total;
  let gst;
  let gstBase;
  let gstPercent = null;
  let due;
  let rounding = 0;

  if (hasValue(invoice.ProfessionalFee) || hasValue(invoice.GstAmount)) {
    // This invoice's own service line.
    const prof = num(invoice.ProfessionalFee);
    const vendor = num(invoice.VendorFee);
    const contractor = num(invoice.ContractorFee);
    const govt = num(invoice.GovtFee);
    const discount = num(invoice.Discount);
    gst = num(invoice.GstAmount);
    total = num(invoice.InvoiceValue) || round2(prof + vendor + contractor - discount + gst + govt);
    const matched = (invoice.serviceDetails || []).find(
      (s) => String(s.ServiceDetailID) === String(invoice.ServiceDetailID)
    );
    lines = [{
      name: clean(invoice.ServiceNameSnapshot) || clean(matched?.ItemName) || clean(matched?.ServiceName) || "Service",
      code: clean(matched?.ServiceCode),
      rate: prof + vendor + contractor,
      discount,
      tax: gst,
      govtFee: govt,
      total,
    }];
    gstBase = prof + vendor;
    if (hasValue(matched?.GSTPercent)) gstPercent = num(matched.GSTPercent);
    // An invoice is only issued once its service line is fully paid.
    due = 0;
    rounding = round2(total - (prof + vendor + contractor - discount + gst + govt));
  } else {
    // Older rows without per-line figures: the order's services, as before.
    const services = Array.isArray(invoice.serviceDetails) ? invoice.serviceDetails : [];
    total = invoice.amounts?.total || num(invoice.OrderValue || invoice.InvoiceValue || invoice.InvoiceTotal);
    gst = invoice.amounts?.gst || 0;
    lines = services.length
      ? services.map((s) => ({
          name: clean(s.ItemName) || clean(s.ServiceName) || "Service",
          code: clean(s.ServiceCode),
          rate: num(s.ProfessionalFee) + num(s.VendorFee) + num(s.ContractorFee),
          discount: num(s.Discount),
          tax: num(s.GstAmount),
          govtFee: num(s.GovtFee),
          total: num(s.Total),
        }))
      : [{ name: "Service", code: "", rate: total - gst, discount: 0, tax: gst, govtFee: 0, total }];
    gstBase = services.reduce((sum, s) => sum + num(s.ProfessionalFee) + num(s.VendorFee), 0);
    const pctSvc = services.find((s) => num(s.GSTPercent) > 0);
    if (pctSvc) gstPercent = num(pctSvc.GSTPercent);
    due = invoice.amounts?.pending ?? 0;
    rounding = services.reduce((sum, s) => sum + num(s.Rounding), 0);
  }

  if (gstPercent === null && gst > 0 && gstBase > 0) gstPercent = toGstSlab((gst / gstBase) * 100);
  const subtotal = round2(total - gst);

  const taxSplit = resolveGstSplit({
    supplierState,
    recipientState: placeOfSupply,
    supplierGstin,
    recipientGstin,
    gstAmount: gst,
    gstPercent,
  });

  return {
    fromName, fromLines, sellerCin, sellerPan, sellerGstin,
    billToName, contactName, billToLines, recipientGstin, recipientPan, billToPhone, billToEmail,
    placeOfSupply,
    invoiceCode: invoice.InvoiceCode || invoice.invoiceCode || "-",
    invoiceDate: invoice.InvoiceDate || invoice.invoiceDate,
    poNumber: invoice.quoteCodeId || invoice.InvoiceCode || "-",
    lines, subtotal, gst, taxLines: taxSplit.lines, rounding, total, due,
  };
};

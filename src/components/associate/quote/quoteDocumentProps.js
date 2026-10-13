/**
 * Builds <QuoteDocument> props from a /getQuoteById payload.
 *
 * PORT of the computations in the admin page
 * Bizpole-One-Client/src/Layouts/SuperAdmin/pages/Quotes/componet/QuoteProposal.tsx
 * (formatDate, "Computed values", "Seller", "Buyer" and the <QuoteDocument>
 * props it renders). Keep the two in sync — every field, fallback and total
 * here must match what admin feeds the same document.
 */

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB");
};

export function buildQuoteDocumentProps(quote) {
  // ── Computed values ───────────────────────────────────────────────────────────
  const services = Array.isArray(quote?.ServiceDetails) ? quote.ServiceDetails : [];

  const lines = services.map((service) => ({
    serviceName: service.ItemName || "Service",
    rate:
      (Number(service.ProfessionalFee) || 0) +
      (Number(service.VendorFee) || 0) +
      (Number(service.ContractorFee) || 0) +
      (Number(service.GovtFee) || 0),
    total: Number(service.Total) || 0,
  }));

  const subTotal        = lines.reduce((sum, l) => sum + (Number(l.rate)  || 0), 0);
  const grandTotal      = lines.reduce((sum, l) => sum + (Number(l.total) || 0), 0);
  const advanceTotal    = services.reduce((sum, s) => sum + (Number(s.AdvanceAmount) || 0), 0);
  const remainingAmount = grandTotal - advanceTotal;
  const discount        = services.reduce((sum, s) => sum + (Number(s.Discount)     || 0), 0);
  const gstAmount       = services.reduce((sum, s) => sum + (Number(s.GstAmount)    || 0), 0);

  // ── Seller (from franchiseeDetails embedded in API response) ─────────────────
  const fd = quote?.franchiseeDetails;
  const seller = fd
    ? {
        name: fd.DisplayName || fd.FranchiseeName || "",
        addressLines: [
          fd.AddressLine1 || "",
          fd.AddressLine2 || "",
          [fd.City, fd.State, fd.Country].filter(Boolean).join(", "),
          fd.Pincode ? `Pincode: ${fd.Pincode}` : "",
        ].filter(Boolean),
        phone:   fd.Phone      || "",
        email:   fd.Email      || "",
        website: fd.Website    || "",
        cin:     fd.CIN        || "",
        pan:     fd.PAN        || "",
        gstin:   fd.GSTNumber  || "",
      }
    : { name: "" };

  const buyer = {
    name: quote?.CustomerName || "Customer Name",
    addressLines: quote?.CompanyName ? [quote.CompanyName] : undefined,
  };

  return {
    seller,
    buyer,
    quoteDate: formatDate(quote?.QuoteDate),
    quoteNumber: quote?.QuoteCodeId || "",
    lines,
    subTotal,
    discount,
    advanceTotal,
    grandTotal,
    remainingAmount,
    gstAmount,
  };
}

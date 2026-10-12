/**
 * Quote document — PORT of the admin component
 * Bizpole-One-Client/src/Layouts/SuperAdmin/pages/Quotes/componet/QuoteDocument.tsx
 * (the "QUOTATION" sheet admin staff download from /quotes/:id/proposal).
 * It must stay in sync with that file so an associate's quote looks exactly
 * like the admin's: same structure, classes, inline styles, colours, fields
 * and fallbacks. Only deviations: TypeScript types removed, and the two
 * images admin serves from its /public folder (/Vector.png, /Frame2.png) are
 * bundled copies imported from src/assets/images.
 *
 * Props are built from a /getQuoteById payload by buildQuoteDocumentProps
 * (./quoteDocumentProps.js, a port of admin QuoteProposal.tsx's computations).
 */
import quoteBackgroundVector from "../../../assets/images/quote-background-vector.png";
import quoteLogoFrame from "../../../assets/images/quote-logo-frame.png";

const fmt = (n) => {
  const num = typeof n === "string" ? parseFloat(n) : n;
  return (num || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
};

const QuoteDocument = ({
  id,
  seller = {},
  buyer,
  quoteDate,
  quoteNumber,
  lines,
  subTotal,
  discount = 0,
  advanceTotal,
  grandTotal,
  remainingAmount,
  gstAmount = 0,
}) => {
  // Layout-critical styling is expressed inline (not via Tailwind grid/gap/space-y)
  // because html2canvas 1.4.1 does not reliably render CSS grid, flex `gap`, or
  // `space-y` margins — those utilities silently collapse in the exported PDF.
  const row = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  };
  const labelCell = { color: "#374151", marginRight: 4 };
  const valueCell = { fontWeight: 600, color: "#111827" };

  return (
    <div
      id={id}
      className="printSection mx-auto bg-white border-2 print:rounded-none print:shadow-none print:ring-0"
      style={{
        width: "210mm",
        minHeight: "150mm",
        padding: 40,
        boxSizing: "border-box",
        backgroundImage: `url('${quoteBackgroundVector}')`,
        backgroundSize: "150%",
        backgroundPosition: "center",
      }}
    >
      {/* Header */}
      <div style={{ ...row, marginBottom: 32 }}>
        <h1 className="text-4xl font-bold tracking-wider" style={{ color: "#F3C625", margin: 0 }}>
          QUOTATION
        </h1>
        <img
          src={quoteLogoFrame}
          alt="Bizpole Logo"
          crossOrigin="anonymous"
          style={{ height: 64, width: "auto", objectFit: "contain" }}
        />
      </div>

      {/* Seller / Buyer */}
      <div data-pdf-section style={{ borderTop: "2px solid #e5e7eb", marginBottom: 32, padding: "16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          {/* Seller */}
          <div style={{ width: "60%" }}>
            {seller.name && (
              <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 4 }}>{seller.name}</div>
            )}
            {seller.addressLines?.map((line, i) =>
              line ? (
                <div key={i} style={{ fontSize: 14, color: "#374151", marginBottom: 2 }}>{line}</div>
              ) : null,
            )}
            {seller.phone && (
              <div style={{ fontSize: 14, color: "#374151", marginBottom: 2 }}>Mobile: {seller.phone}</div>
            )}
            {seller.email && (
              <div style={{ fontSize: 14, color: "#374151", marginBottom: 2 }}>Email: {seller.email}</div>
            )}
            {seller.website && (
              <div style={{ fontSize: 14, color: "#374151", marginBottom: 2 }}>Website: {seller.website}</div>
            )}
            {(seller.gstin || seller.cin || seller.pan) && (
              <div style={{ backgroundColor: "#fef9c3", padding: "2px 4px", marginTop: 4, display: "inline-block" }}>
                {seller.gstin && (
                  <div style={{ fontSize: 14, color: "#374151" }}>GSTIN: {seller.gstin}</div>
                )}
                {seller.cin && (
                  <div style={{ fontSize: 14, color: "#374151" }}>CIN: {seller.cin}</div>
                )}
                {seller.pan && (
                  <div style={{ fontSize: 14, color: "#374151" }}>PAN: {seller.pan}</div>
                )}
              </div>
            )}
          </div>

          {/* Buyer */}
          <div style={{ width: "40%", textAlign: "right" }}>
            <div style={{ color: "#1f2937", fontSize: 14, marginBottom: 4 }}>Bill To</div>
            <div style={{ color: "#111827", fontWeight: 700 }}>{buyer.name}</div>
            {buyer.addressLines?.map((line, i) => (
              <div key={i} style={{ fontSize: 14, color: "#374151", marginTop: 2 }}>{line}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Quote Meta — yellow box */}
      <div
        data-pdf-section
        style={{ display: "flex", justifyContent: "space-between", marginBottom: 32, fontSize: 14, backgroundColor: "#fef9c3", padding: 16, borderRadius: 6, width: "100%", boxSizing: "border-box" }}
      >
        <div style={{ width: "48%" }}>
          <div style={{ ...row, marginBottom: 16 }}>
            <span style={labelCell}>Date :</span>
            <span style={valueCell}>{quoteDate}</span>
          </div>
          <div style={{ ...row, marginBottom: 16 }}>
            <span style={labelCell}>Quote Number :</span>
            <span style={valueCell}>{quoteNumber}</span>
          </div>
          <div style={row}>
            <span style={labelCell}>Quote Total Amount:</span>
            <span style={valueCell}>₹ {fmt(grandTotal)}</span>
          </div>
        </div>
        <div style={{ width: "48%" }}>
          <div style={{ ...row, marginBottom: 16 }}>
            <span style={labelCell}>P.O/S.O Number :</span>
            <span style={valueCell}>{quoteNumber}</span>
          </div>
          <div style={{ ...row, marginBottom: 16 }}>
            <span style={labelCell}>P.O/S.O Date :</span>
            <span style={valueCell}>{quoteDate}</span>
          </div>
          <div style={row}>
            <span style={labelCell}>Quote Due Amount:</span>
            <span style={valueCell}>₹{fmt(remainingAmount)}</span>
          </div>
        </div>
      </div>

      <div style={{ height: 1, width: "100%", backgroundColor: "#e5e5e5", margin: "32px 0" }} />

      {/* Services Table */}
      <div data-pdf-section style={{ marginBottom: 32, borderRadius: 6, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#F3C625", color: "#000" }}>
              <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600 }}>Service</th>
              <th style={{ textAlign: "right", padding: "12px 16px", fontWeight: 600 }}>Rate</th>
              <th style={{ textAlign: "right", padding: "12px 16px", fontWeight: 600 }}>Service Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "12px 16px", color: "#111827" }}>{line.serviceName}</td>
                <td style={{ padding: "12px 16px", textAlign: "right", color: "#111827" }}>₹{fmt(line.rate)}</td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#111827" }}>₹{fmt(line.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div data-pdf-section style={{ display: "flex", justifyContent: "flex-end", marginBottom: 32 }}>
        <div style={{ width: 384, fontSize: 14 }}>
          <div style={{ ...row, marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: "#374151" }}>Subtotal</span>
            <span style={{ fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>₹{fmt(subTotal)}</span>
          </div>
          {discount !== 0 && (
            <div style={{ ...row, marginBottom: 8 }}>
              <span style={{ fontWeight: 600, color: "#374151" }}>Discount</span>
              <span style={{ fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>₹{fmt(discount)}</span>
            </div>
          )}
          <div style={{ ...row, marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: "#374151" }}>Advance</span>
            <span style={{ fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>₹{fmt(advanceTotal)}</span>
          </div>
          <div style={{ borderTop: "1px solid #d1d5db", paddingTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 18, fontWeight: 700 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#374151" }}>Total Amount</span>
                {gstAmount > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 400, color: "#6b7280" }}>(Incl. All Taxes)</span>
                )}
              </div>
              <span style={{ color: "#111827" }}>₹{fmt(grandTotal)}</span>
            </div>
          </div>
          <div style={{ ...row, marginTop: 8 }}>
            <span style={{ fontWeight: 600, color: "#374151" }}>Remaining Amount</span>
            <span style={{ fontWeight: 600, color: "#111827" }}>₹{fmt(remainingAmount)}</span>
          </div>
        </div>
      </div>

      {/* Signature + Thank You */}
      <div data-pdf-section style={{ height: 1, width: "100%", backgroundColor: "#9ca3af" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 32, marginBottom: 32 }}>
        <div>
          <div style={{ width: 192, height: 1, backgroundColor: "#9ca3af" }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginTop: 16 }}>CONTRACTOR SIGNATURE</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 16, color: "#F3C625" }}>
            THANK YOU!
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteDocument;

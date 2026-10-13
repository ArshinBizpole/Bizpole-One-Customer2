import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};

// Draws the Bizpole invoice directly with jsPDF (no DOM screenshot), so it can't fail on
// unsupported CSS (Tailwind gradients/oklch colors break html2canvas). Shared by the
// customer invoice page and the associate order page.
//   invoice: { InvoiceCode, InvoiceDate, OrderID, CompanyName, PrimaryCustomer, customerName,
//              state, quoteCodeId, FranchiseeName, serviceDetails[], amounts: { total, gst, pending } }
//   franchiseeDetails: issuing franchisee (DisplayName, address, CIN/PAN/GST) or null
export const generateInvoicePdf = (invoice, franchiseeDetails, { billToName: billToOverride } = {}) => {
  const amber = [230, 168, 43];
  const red = [220, 38, 38];
  const dark = [17, 24, 39];
  const gray = [107, 114, 128];
  const lightGray = [156, 163, 175];

  const money = (amount) => {
    const num = parseFloat(amount) || 0;
    return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const total = invoice.amounts?.total
    || parseFloat(invoice.OrderValue || invoice.InvoiceValue || invoice.InvoiceTotal || 0);
  const gst = invoice.amounts?.gst || 0;
  const subtotal = total - gst;
  const dueAmount = invoice.amounts?.pending ?? 0;
  const services = Array.isArray(invoice.serviceDetails) ? invoice.serviceDetails : [];
  const rounding = services.reduce((sum, s) => sum + (parseFloat(s.Rounding) || 0), 0);
  const gstPercent = services.find((s) => parseFloat(s.GSTPercent) > 0)?.GSTPercent;

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 55;

  // Header — "INVOICE" (amber) left, "Bizpole" wordmark + tagline right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(...amber);
  doc.text("INVOICE", marginX, y);

  doc.setFontSize(20);
  const logoParts = [
    { text: "Bizpo", color: dark },
    { text: "1", color: red },
    { text: "e", color: dark },
  ];
  const logoWidth = logoParts.reduce((w, p) => w + doc.getTextWidth(p.text), 0);
  let lx = pageWidth - marginX - logoWidth;
  logoParts.forEach((p) => {
    doc.setTextColor(...p.color);
    doc.text(p.text, lx, y - 6);
    lx += doc.getTextWidth(p.text);
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const tagParts = [
    { text: "Start. ", color: amber },
    { text: "Run. ", color: red },
    { text: "Grow.", color: dark },
  ];
  const tagWidth = tagParts.reduce((w, p) => w + doc.getTextWidth(p.text), 0);
  let tx = pageWidth - marginX - tagWidth;
  tagParts.forEach((p) => {
    doc.setTextColor(...p.color);
    doc.text(p.text, tx, y + 8);
    tx += doc.getTextWidth(p.text);
  });

  y += 20;
  doc.setDrawColor(...amber);
  doc.setLineWidth(1.5);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 30;

  // FROM (left) — issuing franchisee, looked up by the order's FranchiseeID
  const clean = (v) => (v && v !== "null" && v !== "undefined") ? String(v).trim() : "";
  const fromName = franchiseeDetails?.DisplayName || franchiseeDetails?.FranchiseeName
    || invoice.FranchiseeName || "Bizpole";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...dark);
  doc.text(fromName, marginX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  const fromLines = franchiseeDetails
    ? [
        [franchiseeDetails.AddressLine1].filter(clean).map(clean).join(""),
        [franchiseeDetails.AddressLine2].filter(clean).map(clean).join(""),
        [franchiseeDetails.City, franchiseeDetails.State, franchiseeDetails.Pincode].filter(clean).map(clean).join(", "),
      ].filter(Boolean)
    : [
        "2ND FLOOR, FALCON COMPLEX, OPP HPCL PETROL BUNK, NURANI",
        "Palakkad City, Palakkad - 678014, Kerala, India",
      ];
  let leftY = y + 15;
  fromLines.forEach((line) => {
    doc.text(line, marginX, leftY);
    leftY += 13;
  });

  // BILL TO (right, right-aligned)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...lightGray);
  doc.text("BILL TO:", pageWidth - marginX, y - 11, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...dark);
  const billToName = billToOverride || invoice.CompanyName || invoice.PrimaryCustomer || "Customer";
  const billToLines = doc.splitTextToSize(billToName, 220);
  let rightY = y + 4;
  billToLines.forEach((line) => {
    doc.text(line, pageWidth - marginX, rightY, { align: "right" });
    rightY += 14;
  });
  const contactName = invoice.customerName || invoice.PrimaryCustomer;
  if (contactName && contactName !== billToName) {
    doc.setFontSize(10);
    doc.text(contactName, pageWidth - marginX, rightY, { align: "right" });
    rightY += 14;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  if (invoice.state) {
    doc.text(invoice.state, pageWidth - marginX, rightY, { align: "right" });
    rightY += 14;
  }
  doc.setTextColor(...lightGray);
  doc.text(`Place of Supply: ${invoice.state || "-"}`, pageWidth - marginX, rightY, { align: "right" });
  rightY += 13;

  y = Math.max(leftY, rightY) + 15;

  // CIN / PAN / GST box (light amber background)
  const boxH = 52;
  doc.setFillColor(255, 247, 224);
  doc.setDrawColor(...amber);
  doc.setLineWidth(0.75);
  doc.rect(marginX, y, 340, boxH, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let by = y + 17;
  [
    ["CIN:", franchiseeDetails?.CIN || "U70200KL2023PTC083967"],
    ["PAN:", franchiseeDetails?.PAN || "AAMCB0068L"],
    ["GST:", franchiseeDetails?.GSTNumber || "32AAMCB0068L1ZN"],
  ].forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(label, marginX + 10, by);
    doc.setFont("helvetica", "normal");
    doc.text(value, marginX + 40, by);
    by += 13;
  });

  y += boxH + 20;
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(1);
  doc.line(marginX, y, pageWidth - marginX, y);

  // Info band (light amber background) — 6 columns
  const bandH = 46;
  doc.setFillColor(255, 247, 224);
  doc.rect(marginX, y, pageWidth - marginX * 2, bandH, "F");
  const infoCols = [
    { label: "INVOICE NUMBER", value: invoice.InvoiceCode || invoice.invoiceCode || "-" },
    { label: "INVOICE DATE", value: formatDate(invoice.InvoiceDate || invoice.invoiceDate) },
    { label: "P.O. / S.O. NO.", value: invoice.quoteCodeId || invoice.InvoiceCode || "-" },
    { label: "P.O. / S.O. DATE", value: formatDate(invoice.InvoiceDate || invoice.invoiceDate) },
    { label: "INVOICE TOTAL", value: money(total) },
    { label: "DUE AMOUNT", value: money(dueAmount) },
  ];
  const colWidth = (pageWidth - marginX * 2) / infoCols.length;
  infoCols.forEach((col, i) => {
    const x = marginX + i * colWidth + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...amber);
    doc.text(col.label, x, y + 18);
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.text(String(col.value), x, y + 34);
  });
  y += bandH + 20;

  // Items table
  const rows = services.length
    ? services.map((s) => {
        const rate = (parseFloat(s.ProfessionalFee) || 0) + (parseFloat(s.VendorFee) || 0) + (parseFloat(s.ContractorFee) || 0);
        return [
          `${s.ItemName || s.ServiceName || "Service"}${s.ServiceCode ? `\nHSN/SAC: ${s.ServiceCode}` : ""}`,
          money(rate),
          money(s.Discount),
          money(s.GstAmount),
          money(s.GovtFee),
          money(s.Total),
        ];
      })
    : [["Service", money(subtotal), money(0), money(gst), money(0), money(total)]];

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Service", "Rate", "Discount", "Tax", "Govt. Fee", "Service Total"]],
    body: rows,
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9, textColor: dark, cellPadding: 8 },
    headStyles: { fillColor: amber, textColor: dark, fontStyle: "bold" },
    columnStyles: {
      1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" },
      4: { halign: "right" }, 5: { halign: "right", fontStyle: "bold" },
    },
  });

  y = doc.lastAutoTable.finalY + 30;

  // Totals block (right-aligned, unboxed)
  const boxWidth = 240;
  const boxX = pageWidth - marginX - boxWidth;
  const totalsRows = [["Sub Total", money(subtotal)], ["GST Amount", money(gst)]];
  if (gstPercent) totalsRows.push([`IGST (${parseFloat(gstPercent).toFixed(2)}%)`, money(gst)]);
  totalsRows.push(["Rounding", money(rounding)]);

  doc.setFontSize(10);
  totalsRows.forEach(([label, value], i) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);
    doc.text(label, boxX, y);
    doc.setTextColor(...dark);
    doc.text(value, boxX + boxWidth, y, { align: "right" });
    if (i === totalsRows.length - 1) {
      doc.setDrawColor(180, 180, 180);
      doc.line(boxX, y + 6, boxX + boxWidth, y + 6);
    }
    y += 20;
  });
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...dark);
  doc.text("Total Amount", boxX, y);
  doc.text(money(total), boxX + boxWidth, y, { align: "right" });

  y += 70;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(...amber);
  doc.text("THANK YOU!", pageWidth / 2, y, { align: "center" });

  // Invoice codes look like "F52/IN000282" — a "/" is not allowed in a file name
  doc.save(`invoice-${String(invoice?.InvoiceCode || invoice?.OrderID || 'download').replace(/[\\/:*?"<>|]+/g, '-')}.pdf`);
};

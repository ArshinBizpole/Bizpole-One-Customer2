import jsPDF from "jspdf";
import bizpoleLogo from "../assets/images/bizpole-logo.png";

// Same date style as the admin receipt (e.g. "10 Oct 2026")
export const formatReceiptDate = (date) => {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

// Rows shown in the "PAYMENT DETAILS" box — shared by the on-screen receipt and the PDF
export const receiptDetailRows = (data) => [
  ["Receipt ID:", data.ReceiptCode || data.ReceiptNumber || String(data.PaymentID || "—")],
  ["Payment Date:", formatReceiptDate(data.TransactionDate)],
  ["Payment Mode:", data.PaymentMethod || data.PaymentMode || data.Mode || "—"],
  ["Transaction ID:", data.TransactionID || "—"],
  ["Advance Payment:", data.IsAdvancePayment ? "Yes" : "No"],
];

// Stored numbers sometimes already include the country code ("917418852366")
const withCountryCode = (phone) => {
  const digits = String(phone || "").replace(/D/g, "");
  if (!digits) return "";
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return `+91 ${local}`;
};

export const receiptSellerLines = (data) => {
  const address =
    [data.FranchiseeAddressLine1, data.FranchiseeAddressLine2].filter(Boolean).join(", ") ||
    [data.FranchiseeCity, data.FranchiseeState, data.FranchiseeCountry].filter(Boolean).join(", ");
  return {
    title: data.FranchiseeCity || data.FranchiseeName || "",
    address,
    phone: withCountryCode(data.FranchiseePhone),
    email: data.FranchiseeEmail || "",
    gst: data.FranchiseeGST ? `GST: ${data.FranchiseeGST}` : "",
  };
};

export const receiptBillTo = (data) => ({
  name: data.CompanyName || data.CustomerName || "—",
  lines: [data.CompanyAddressLine1, data.CompanyAddressLine2, data.CompanyState || data.CustomerState].filter(Boolean),
  phone: withCountryCode(data.CompanyMobile || data.CustomerMobile),
  email: data.CompanyEmail || data.CustomerEmail || "",
  placeOfSupply: data.FranchiseePlaceOfSupply ? `Place of Supply : ${data.FranchiseePlaceOfSupply}` : "",
});

const loadImageDataUrl = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

// Payment receipt PDF matching the admin's receipt (components/PaymentReceiptModal.tsx in the
// admin app): title + franchisee, logo, seller / bill-to, PAYMENT DETAILS box, amount, THANK YOU.
// `data` is the /receipt-by-payment/:paymentId payload.
export const generateReceiptPdf = async (data) => {
  const navy = [11, 25, 54];
  const amber = [245, 165, 36];
  const gray = [75, 85, 99];
  const lightGray = [107, 114, 128];
  const border = [229, 231, 235];
  const blue = [37, 99, 235];
  const green = [21, 128, 61];

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const mx = 18;
  const right = pageW - mx;
  let y = 26;

  // Title + franchisee name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...navy);
  doc.text("Receipt", mx, y);
  doc.setFontSize(10);
  doc.setTextColor(...amber);
  doc.text(data.DisplayName || data.FranchiseeName || "Bizpole Business Acumen Pvt Ltd", mx, y + 7);

  // Logo (top right)
  const logo = await loadImageDataUrl(bizpoleLogo);
  if (logo) {
    const h = 12;
    const w = (logo.w / logo.h) * h;
    doc.addImage(logo.dataUrl, "PNG", right - w, y - 10, w, h);
  }

  // Seller (left) / Bill to (right)
  y += 20;
  const seller = receiptSellerLines(data);
  const bill = receiptBillTo(data);
  let ly = y;
  doc.setFontSize(10);
  if (seller.title) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(seller.title, mx, ly);
    ly += 5;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...gray);
  [seller.address, seller.phone, seller.email].filter(Boolean).forEach((line) => {
    doc.splitTextToSize(line, 80).forEach((l) => { doc.text(l, mx, ly); ly += 4.2; });
  });
  if (seller.gst) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(seller.gst, mx, ly + 1);
    ly += 5;
  }

  let ry = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text("Bill to:", right, ry, { align: "right" });
  ry += 5;
  doc.setTextColor(...blue);
  doc.splitTextToSize(bill.name, 80).forEach((l) => { doc.text(l, right, ry, { align: "right" }); ry += 5; });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...gray);
  [...bill.lines, bill.phone, bill.email, bill.placeOfSupply].filter(Boolean).forEach((line) => {
    doc.splitTextToSize(line, 80).forEach((l) => { doc.text(l, right, ry, { align: "right" }); ry += 4.2; });
  });

  // PAYMENT DETAILS box
  y = Math.max(ly, ry) + 10;
  const boxW = pageW - mx * 2;
  const rowH = 10;
  const rows = receiptDetailRows(data);
  const boxH = 11 + rows.length * rowH + 13;
  doc.setDrawColor(...border);
  doc.setLineWidth(0.3);
  doc.roundedRect(mx, y, boxW, boxH, 3, 3, "S");

  doc.setFillColor(248, 250, 252);
  doc.rect(mx + 0.2, y + 0.2, boxW - 0.4, 10.6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("PAYMENT DETAILS", pageW / 2, y + 7, { align: "center", charSpace: 0.6 });
  doc.line(mx, y + 11, mx + boxW, y + 11);

  let rowY = y + 11;
  rows.forEach(([label, value], i) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...lightGray);
    doc.text(label, mx + 7, rowY + 6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...navy);
    doc.text(String(value), right - 7, rowY + 6.5, { align: "right" });
    rowY += rowH;
    if (i < rows.length - 1) {
      doc.setDrawColor(243, 244, 246);
      doc.line(mx + 0.2, rowY, mx + boxW - 0.2, rowY);
    }
  });

  // Payment amount strip
  doc.setFillColor(248, 253, 249);
  doc.rect(mx + 0.2, rowY + 0.2, boxW - 0.4, 12.6, "F");
  doc.setDrawColor(...border);
  doc.line(mx, rowY, mx + boxW, rowY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...navy);
  doc.text("Payment Amount", mx + 7, rowY + 8);
  doc.setFontSize(13);
  doc.setTextColor(...green);
  doc.text(Number(data.TotalAmount || 0).toFixed(2), right - 7, rowY + 8.5, { align: "right" });

  // Footer
  doc.setFontSize(22);
  doc.setTextColor(...navy);
  doc.text("THANK YOU!", pageW / 2, y + boxH + 28, { align: "center", charSpace: 2 });

  // Same file name pattern as the admin download
  doc.save(`Receipt_${String(data.PaymentID || data.ReceiptCode || "download").replace(/[\\/:*?"<>|]+/g, "-")}.pdf`);
};

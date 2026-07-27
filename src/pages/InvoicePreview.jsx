import React, { useContext, useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { getCompanyInvoices, getFranchiseeById } from "../api/Companyinvoice";
import { getSecureItem } from "../utils/secureStorage";
import { ProfileCompanyContext } from "./ProfileLayout";
import CryptoJS from "crypto-js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion } from "framer-motion";
import { 
  FiDownload, 
  FiArrowLeft, 
  FiPrinter,
  FiMail,
  FiFileText,
  FiAlertCircle
} from "react-icons/fi";

const InvoicePreview = () => {
  const { encrypted } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedCompanyName } = useContext(ProfileCompanyContext);
  const [invoice, setInvoice] = useState(location.state?.invoiceData || null);
  const [loading, setLoading] = useState(!location.state?.invoiceData);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [franchiseeDetails, setFranchiseeDetails] = useState(null);

  // Decrypt the encrypted orderId
  const decryptOrderId = () => {
    if (!encrypted) {
      console.error("Encrypted orderId is missing.");
      return null;
    }
    try {
      const secret = import.meta.env.VITE_QUOTE_LINK_SECRET || "default_secret";
      const bytes = CryptoJS.AES.decrypt(decodeURIComponent(encrypted), secret);
      const decryptedOrderId = bytes.toString(CryptoJS.enc.Utf8);
      return decryptedOrderId || encrypted;
    } catch (error) {
      console.error("Error decrypting orderId:", error);
      return encrypted;
    }
  };

  const orderId = decryptOrderId();

  // Reset and refetch when company is switched from the dropdown
  useEffect(() => {
    const handler = () => {
      setInvoice(null);
      setError(null);
      setLoading(true);
    };
    window.addEventListener("company-switched", handler);
    return () => window.removeEventListener("company-switched", handler);
  }, []);

  useEffect(() => {
    // If we already have invoice data from state, no need to fetch
    if (invoice) {
      setLoading(false);
      return;
    }

    if (!orderId) {
      setError("Order ID is missing.");
      setLoading(false);
      return;
    }

    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const selectedCompany = getSecureItem("selectedCompany");
        const companyId = selectedCompany?.CompanyID;
        
        if (!companyId) {
          throw new Error("No company selected. Please select a company first.");
        }

        const response = await getCompanyInvoices({ 
          companyId, 
          limit: 50, 
          page: 1 
        });

        if (response.success && Array.isArray(response.data)) {
          const found = response.data.find(inv => 
            String(inv.OrderID) === String(orderId) || 
            String(inv.id) === String(orderId)
          );
          
          if (found) {
            setInvoice(found);
          } else {
            setError("Invoice not found for the specified order.");
          }
        } else {
          setError("Failed to fetch invoices.");
        }
      } catch (err) {
        console.error("Error fetching invoice:", err);
        setError(err.message || "Failed to fetch invoice. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [orderId, invoice]);

  // The invoice's "FROM" issuer is the franchisee that owns the order (invoice.franchiseeId,
  // set from Quote.FranchiseeID in Invoiceprofile.jsx), not a fixed "Bizpole" — different
  // customers can belong to different franchisees.
  useEffect(() => {
    const franchiseeId = invoice?.franchiseeId || invoice?.FranchiseeID;
    if (!franchiseeId) {
      setFranchiseeDetails(null);
      return;
    }
    getFranchiseeById(franchiseeId).then(setFranchiseeDetails);
  }, [invoice?.franchiseeId, invoice?.FranchiseeID]);

  // Draws the invoice directly with jsPDF (no DOM screenshot), so it can't fail on
  // unsupported CSS (Tailwind gradients/oklch colors break html2canvas), matching the
  // fixed "Bizpole" invoice template layout regardless of on-screen styling.
  const handleDownloadPDF = () => {
    if (!invoice) return;
    setDownloading(true);
    try {
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
      const billToName = selectedCompanyName || invoice.CompanyName || invoice.PrimaryCustomer || "Customer";
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

      doc.save(`invoice-${invoice?.InvoiceCode || invoice?.OrderID || 'download'}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // Auto-trigger the download when opened via the "Download PDF" button in Invoiceprofile.jsx,
  // so the user doesn't have to click Download again on this page.
  const autoDownloadTriggered = useRef(false);
  useEffect(() => {
    if (!loading && invoice && location.state?.autoDownload && !autoDownloadTriggered.current) {
      autoDownloadTriggered.current = true;
      handleDownloadPDF();
    }
  }, [loading, invoice]);

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    // Implement email functionality
    window.location.href = `mailto:?subject=Invoice ${invoice?.InvoiceCode}&body=Please find the invoice details attached.`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  const calculateTax = (amount, rate = 9) => {
    const numAmount = parseFloat(amount) || 0;
    return (numAmount * rate) / 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-yellow-50">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 text-lg">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-yellow-50 p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center border-2 border-red-100"
        >
          <FiAlertCircle className="w-20 h-20 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Invoice</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition-all"
          >
            <FiArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </motion.div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-yellow-50 p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center border-2 border-yellow-100"
        >
          <FiFileText className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Invoice Found</h2>
          <p className="text-gray-600 mb-6">The requested invoice could not be found.</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition-all"
          >
            <FiArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </motion.div>
      </div>
    );
  }

  // Total is GST-inclusive (that's what the API/InvoiceValue gives us). GST is the real
  // GstAmount summed off QuoteServiceDetails (via invoice.amounts.gst, passed via navigation
  // state from Invoiceprofile.jsx) when available. Subtotal is the difference: Total - GST —
  // never computed independently — so Subtotal + GST always reconciles exactly back to Total.
  const total = invoice.amounts?.total
    || parseFloat(invoice.OrderValue || invoice.InvoiceValue || invoice.InvoiceTotal || 0);
  const gst = invoice.amounts?.gst || 0;
  const subtotal = total - gst;

  // Same figures the jsPDF download draws (handleDownloadPDF above), so the on-screen
  // preview matches the actual downloaded PDF instead of showing a different mock layout.
  const services = Array.isArray(invoice.serviceDetails) ? invoice.serviceDetails : [];
  const dueAmount = invoice.amounts?.pending ?? 0;
  const rounding = services.reduce((sum, s) => sum + (parseFloat(s.Rounding) || 0), 0);
  const gstPercent = services.find((s) => parseFloat(s.GSTPercent) > 0)?.GSTPercent;
  const billToName = selectedCompanyName || invoice.CompanyName || invoice.companyName || invoice.PrimaryCustomer || 'Customer';
  const contactName = invoice.customerName || invoice.PrimaryCustomer;

  // Same franchisee lookup used by handleDownloadPDF, so the on-screen FROM block matches
  // the downloaded PDF instead of a fixed "Bizpole" address.
  const clean = (v) => (v && v !== "null" && v !== "undefined") ? String(v).trim() : "";
  const fromName = franchiseeDetails?.DisplayName || franchiseeDetails?.FranchiseeName
    || invoice.FranchiseeName || "Bizpole";
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
  const cin = franchiseeDetails?.CIN || "U70200KL2023PTC083967";
  const pan = franchiseeDetails?.PAN || "AAMCB0068L";
  const gstNumber = franchiseeDetails?.GSTNumber || "32AAMCB0068L1ZN";

  const formatMoney = (amount) => {
    const num = parseFloat(amount) || 0;
    return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Action Bar */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap justify-between items-center gap-4 mb-6"
        >
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all border-2 border-yellow-100"
          >
            <FiArrowLeft className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-gray-700">Back</span>
          </button>

          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all border-2 border-yellow-100"
            >
              <FiPrinter className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-gray-700">Print</span>
            </button>
            
            <button
              onClick={handleSendEmail}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all border-2 border-yellow-100"
            >
              <FiMail className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-gray-700">Email</span>
            </button>
            
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="download-btn inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <FiDownload className="w-4 h-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Invoice Content */}
        <motion.div
          id="invoice-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border-2 border-yellow-100 print:shadow-none print:border-none"
        >
          {/* Header — mirrors handleDownloadPDF: amber "INVOICE" left, Bizpo1e wordmark + tagline right */}
          <div className="flex justify-between items-start pb-6 mb-6 border-b-2 border-[#E6A82B]">
            <h1 className="text-4xl font-bold text-[#E6A82B]">INVOICE</h1>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                Bizpo<span className="text-[#DC2626]">1</span>e
              </p>
              <p className="text-[10px] font-bold tracking-wide mt-0.5">
                <span className="text-[#E6A82B]">Start. </span>
                <span className="text-[#DC2626]">Run. </span>
                <span className="text-gray-900">Grow.</span>
              </p>
            </div>
          </div>

          {/* FROM / BILL TO */}
          <div className="flex justify-between items-start gap-8 mb-6">
            <div>
              <p className="font-bold text-gray-900">{fromName}</p>
              {fromLines.map((line, i) => (
                <p key={i} className="text-sm text-gray-500 mt-1 first:mt-1">{line}</p>
              ))}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-400">BILL TO:</p>
              <p className="font-bold text-gray-900 mt-1">{billToName}</p>
              {contactName && contactName !== billToName && (
                <p className="text-sm font-medium text-gray-700">{contactName}</p>
              )}
              {invoice.state && <p className="text-sm text-gray-500">{invoice.state}</p>}
              <p className="text-xs text-gray-400">Place of Supply: {invoice.state || "-"}</p>
            </div>
          </div>

          {/* CIN / PAN / GST box */}
          <div className="inline-block bg-[#FFF7E0] border border-[#E6A82B] rounded px-4 py-3 mb-6 text-sm">
            <p><span className="font-bold text-gray-900">CIN:</span> <span className="text-gray-700">{cin}</span></p>
            <p><span className="font-bold text-gray-900">PAN:</span> <span className="text-gray-700">{pan}</span></p>
            <p><span className="font-bold text-gray-900">GST:</span> <span className="text-gray-700">{gstNumber}</span></p>
          </div>

          <div className="border-t border-gray-200" />

          {/* Info band */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 bg-[#FFF7E0] p-5 mb-6">
            {[
              { label: "INVOICE NUMBER", value: invoice.InvoiceCode || invoice.invoiceCode || "-" },
              { label: "INVOICE DATE", value: formatDate(invoice.InvoiceDate || invoice.invoiceDate) },
              { label: "P.O. / S.O. NO.", value: invoice.quoteCodeId || invoice.InvoiceCode || "-" },
              { label: "P.O. / S.O. DATE", value: formatDate(invoice.InvoiceDate || invoice.invoiceDate) },
              { label: "INVOICE TOTAL", value: formatMoney(total) },
              { label: "DUE AMOUNT", value: formatMoney(dueAmount) },
            ].map((col) => (
              <div key={col.label}>
                <p className="text-[10px] font-bold text-[#E6A82B] tracking-wide">{col.label}</p>
                <p className="text-sm font-bold text-gray-900 mt-1">{col.value}</p>
              </div>
            ))}
          </div>

          {/* Items Table */}
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#E6A82B]">
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Service</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-900">Rate</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-900">Discount</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-900">Tax</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-900">Govt. Fee</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-900">Service Total</th>
                </tr>
              </thead>
              <tbody>
                {(services.length
                  ? services
                  : [{ ItemName: "Service", ProfessionalFee: subtotal, Discount: 0, GstAmount: gst, GovtFee: 0, Total: total }]
                ).map((s, i) => {
                  const rate = (parseFloat(s.ProfessionalFee) || 0) + (parseFloat(s.VendorFee) || 0) + (parseFloat(s.ContractorFee) || 0);
                  return (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 px-4 text-gray-700">
                        {s.ItemName || s.ServiceName || "Service"}
                        {s.ServiceCode && <span className="block text-xs text-gray-400">HSN/SAC: {s.ServiceCode}</span>}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">{formatMoney(rate)}</td>
                      <td className="py-3 px-4 text-right text-gray-700">{formatMoney(s.Discount)}</td>
                      <td className="py-3 px-4 text-right text-gray-700">{formatMoney(s.GstAmount)}</td>
                      <td className="py-3 px-4 text-right text-gray-700">{formatMoney(s.GovtFee)}</td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">{formatMoney(s.Total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-full md:w-80 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Sub Total</span>
                <span className="text-gray-900">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">GST Amount</span>
                <span className="text-gray-900">{formatMoney(gst)}</span>
              </div>
              {gstPercent && (
                <div className="flex justify-between">
                  <span className="text-gray-500">IGST ({parseFloat(gstPercent).toFixed(2)}%)</span>
                  <span className="text-gray-900">{formatMoney(gst)}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-gray-300 pb-2">
                <span className="text-gray-500">Rounding</span>
                <span className="text-gray-900">{formatMoney(rounding)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-bold text-gray-900">Total Amount</span>
                <span className="font-bold text-gray-900">{formatMoney(total)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-4xl font-bold text-[#E6A82B] text-center mb-2">THANK YOU!</p>
        </motion.div>

        {/* Print Styles */}
        <style jsx>{`
          @media print {
            body { background: white; }
            .print\\:shadow-none { box-shadow: none; }
            .print\\:border-none { border: none; }
            button { display: none; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default InvoicePreview;
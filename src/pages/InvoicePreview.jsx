import React, { useContext, useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { getCompanyInvoices, getFranchiseeById, sendInvoiceLinkEmail } from "../api/Companyinvoice";
import { getSecureItem } from "../utils/secureStorage";
import { signedInContact } from "../utils/applicationPrefill";
import { ProfileCompanyContext } from "./ProfileLayout";
import CryptoJS from "crypto-js";
import { generateInvoicePdf } from "../utils/invoicePdf";
import { buildInvoiceView } from "../utils/invoiceView";
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
  const [emailStatus, setEmailStatus] = useState("idle"); // idle | sending | sent | error
  const [emailMessage, setEmailMessage] = useState("");

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
      generateInvoicePdf(invoice, franchiseeDetails, { billToName: selectedCompanyName });
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

  // The customer's email as frozen on the invoice (PartySnapshot.buyer), falling
  // back to the company's email and then the signed-in customer's own.
  const invoiceRecipientEmail = () => {
    let snap = invoice?.PartySnapshot;
    if (typeof snap === "string") {
      try { snap = JSON.parse(snap); } catch { snap = null; }
    }
    return (
      snap?.buyer?.customer?.Email ||
      snap?.buyer?.company?.CompanyEmail ||
      signedInContact()?.email ||
      ""
    ).trim();
  };

  const handleSendEmail = async () => {
    if (emailStatus === "sending") return;
    const email = invoiceRecipientEmail();
    if (!email) {
      setEmailStatus("error");
      setEmailMessage("No email address found for this invoice.");
      return;
    }
    setEmailStatus("sending");
    setEmailMessage("");
    const link = `${window.location.origin}/profile/invoice-preview/${encrypted}`;
    const res = await sendInvoiceLinkEmail({ email, link });
    if (res?.success) {
      setEmailStatus("sent");
      setEmailMessage(`Invoice link sent to ${email}`);
    } else {
      setEmailStatus("error");
      setEmailMessage(res?.message || "Couldn't send the email. Please try again.");
    }
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

  // Same builder the jsPDF download uses (utils/invoiceView.js), so the on-screen
  // preview and the downloaded PDF always show identical figures.
  const v = buildInvoiceView(invoice, franchiseeDetails, { billToName: selectedCompanyName });

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
              disabled={emailStatus === "sending"}
              title={emailMessage || "Email me a link to this invoice"}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all border-2 border-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiMail className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-gray-700">
                {emailStatus === "sending" ? "Sending…" : emailStatus === "sent" ? "Sent ✓" : "Email"}
              </span>
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

        {emailMessage && (
          <div className={`mb-4 text-sm text-right print:hidden ${emailStatus === "error" ? "text-red-600" : "text-green-700"}`}>
            {emailMessage}
          </div>
        )}

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
              <p className="font-bold text-gray-900">{v.fromName}</p>
              {v.fromLines.map((line, i) => (
                <p key={i} className="text-sm text-gray-500 mt-1 first:mt-1">{line}</p>
              ))}
            </div>
            <div className="text-right flex-shrink-0 max-w-xs">
              <p className="text-xs text-gray-400">BILL TO:</p>
              <p className="font-bold text-gray-900 mt-1">{v.billToName}</p>
              {v.contactName && v.contactName !== v.billToName && (
                <p className="text-sm font-medium text-gray-700">{v.contactName}</p>
              )}
              {[...v.billToLines, v.billToPhone, v.billToEmail].filter(Boolean).map((line, i) => (
                <p key={i} className="text-sm text-gray-500">{line}</p>
              ))}
              {v.recipientGstin && <p className="text-sm text-gray-700 mt-1"><span className="font-bold">GSTIN:</span> {v.recipientGstin}</p>}
              {v.recipientPan && <p className="text-sm text-gray-700"><span className="font-bold">PAN:</span> {v.recipientPan}</p>}
              <p className="text-xs text-gray-400 mt-1">Place of Supply: {v.placeOfSupply || "-"}</p>
            </div>
          </div>

          {/* CIN / PAN / GST box */}
          <div className="inline-block bg-[#FFF7E0] border border-[#E6A82B] rounded px-4 py-3 mb-6 text-sm">
            <p><span className="font-bold text-gray-900">CIN:</span> <span className="text-gray-700">{v.sellerCin}</span></p>
            <p><span className="font-bold text-gray-900">PAN:</span> <span className="text-gray-700">{v.sellerPan}</span></p>
            <p><span className="font-bold text-gray-900">GST:</span> <span className="text-gray-700">{v.sellerGstin}</span></p>
          </div>

          <div className="border-t border-gray-200" />

          {/* Info band */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 bg-[#FFF7E0] p-5 mb-6">
            {[
              { label: "INVOICE NUMBER", value: v.invoiceCode },
              { label: "INVOICE DATE", value: formatDate(v.invoiceDate) },
              { label: "P.O. / S.O. NO.", value: v.poNumber },
              { label: "P.O. / S.O. DATE", value: formatDate(v.invoiceDate) },
              { label: "INVOICE TOTAL", value: formatMoney(v.total) },
              { label: "DUE AMOUNT", value: formatMoney(v.due) },
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
                {v.lines.map((l, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 px-4 text-gray-700">
                      {l.name}
                      {l.code && <span className="block text-xs text-gray-400">HSN/SAC: {l.code}</span>}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">{formatMoney(l.rate)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{formatMoney(l.discount)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{formatMoney(l.tax)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{formatMoney(l.govtFee)}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">{formatMoney(l.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-full md:w-80 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Sub Total</span>
                <span className="text-gray-900">{formatMoney(v.subtotal)}</span>
              </div>
              {v.taxLines.map((t) => (
                <div key={t.label} className="flex justify-between">
                  <span className="text-gray-500">{t.label}</span>
                  <span className="text-gray-900">{formatMoney(t.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between border-b border-gray-300 pb-2">
                <span className="text-gray-500">Rounding</span>
                <span className="text-gray-900">{formatMoney(v.rounding)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-bold text-gray-900">Total Amount</span>
                <span className="font-bold text-gray-900">{formatMoney(v.total)}</span>
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
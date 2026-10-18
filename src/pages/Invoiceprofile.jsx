import { useState, useEffect, useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFileText,
  FiChevronRight,
  FiPlus,
  FiMinus,
  FiX,
  FiAlertCircle,
  FiDownload,

} from 'react-icons/fi';
import { getCompanyInvoices, getCompanyOrders } from '../api/Companyinvoice';
import { getCompanyIdFromStorage } from '../api/Orders/Order';
import CryptoJS from "crypto-js";
import { ProfileCompanyContext } from './ProfileLayout';
import useSelectedCompany from '../hooks/useSelectedCompany';
import { useNavigate } from 'react-router-dom';

const INVOICES_PER_PAGE = 10;

// Remember the open tab and invoice page across a trip to the invoice preview
// and back. The page is stored with its company so a company switch starts at 1.
const INVOICE_VIEW_KEY = 'invoiceProfileView';
const readInvoiceView = () => {
  try {
    return JSON.parse(window.sessionStorage.getItem(INVOICE_VIEW_KEY)) || {};
  } catch {
    return {};
  }
};
const writeInvoiceView = (patch) => {
  try {
    window.sessionStorage.setItem(INVOICE_VIEW_KEY, JSON.stringify({ ...readInvoiceView(), ...patch }));
  } catch {
    // storage unavailable — the page just won't be remembered
  }
};

// showRefundLink: set true when this page is rendered outside the Profile section
// (e.g. the dashboard's "Billing and Invoice" tab), where a subtle way to reach
// Refunds is needed since Refunds no longer has its own sidebar entry there.
const InvoiceProfile = ({ showRefundLink = false }) => {
  const navigate = useNavigate();
  // Outside the Profile section there's no ProfileCompanyContext.Provider, so fall
  // back to the dashboard's selected company (useSelectedCompany re-reads it on
  // "company-switched", so switching companies in the header reloads invoices).
  const { selectedCompanyId: contextCompanyId } = useContext(ProfileCompanyContext) || {};
  const { companyId: dashboardCompanyId } = useSelectedCompany();
  const selectedCompanyId = contextCompanyId || dashboardCompanyId || getCompanyIdFromStorage();
  const [activeTab, setActiveTab] = useState(() => readInvoiceView().tab || 'overview');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showFullInvoice, setShowFullInvoice] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalAmount: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    overdueInvoices: 0
  });

  useEffect(() => {
    // Close the previous company's invoice panel on a company switch.
    setSelectedInvoice(null);
    const saved = readInvoiceView();
    setCurrentPage(saved.companyId === String(selectedCompanyId) ? saved.page || 1 : 1);
    if (selectedCompanyId) {
      fetchInvoices(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    writeInvoiceView({ tab: activeTab });
  }, [activeTab]);

  useEffect(() => {
    if (selectedCompanyId) writeInvoiceView({ companyId: String(selectedCompanyId), page: currentPage });
  }, [selectedCompanyId, currentPage]);

  // Sum the real GST/Advance/Total figures straight off an order's ServiceDetails line items —
  // Subtotal is derived later as Total minus this real GST amount (not computed independently),
  // so Subtotal + GST always reconciles exactly to Total.
  const aggregateOrderAmounts = (order) => {
    const services = Array.isArray(order?.ServiceDetails) ? order.ServiceDetails : [];
    return services.reduce(
      (acc, s) => {
        acc.gst += parseFloat(s.GstAmount) || 0;
        acc.advance += parseFloat(s.AdvanceAmount) || 0;
        acc.pending += parseFloat(s.PendingAmount) || 0;
        acc.total += parseFloat(s.Total) || 0;
        return acc;
      },
      { gst: 0, advance: 0, pending: 0, total: 0 }
    );
  };

  // Only the latest fetch may update state — on a reload the first fetch can be
  // for the previously stored company, and its response mustn't land last.
  const fetchSeq = useRef(0);
  const fetchInvoices = async (companyId) => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    setError(null);
    try {
      const [response, ordersRes] = await Promise.all([
        getCompanyInvoices({ companyId, limit: 50, page: 1 }),
        getCompanyOrders({ companyId, limit: 50, page: 1 }),
      ]);
      if (seq !== fetchSeq.current) return;

      if (response.success && Array.isArray(response.data)) {
        // o.OrderID is the display code (e.g. "OR000588"); invoice.OrderID from
        // invoiceforservice is numeric, so key this map by the numeric OrderPK instead.
        const ordersByOrderId = new Map(
          (Array.isArray(ordersRes?.data) ? ordersRes.data : []).map((o) => [String(o.OrderPK ?? o.OrderID), o])
        );
        const enriched = response.data.map((inv) => {
          const order = ordersByOrderId.get(String(inv.OrderID));
          return order
            ? {
                ...inv,
                amounts: aggregateOrderAmounts(order),
                serviceDetails: order.ServiceDetails || [],
                quoteCodeId: order.QuoteCodeId,
                customerName: order.CustomerName,
                state: order.StateService,
                franchiseeId: order.FranchiseeID,
              }
            : inv;
        });
        setInvoices(enriched);
        calculateStats(enriched);
      } else {
        setInvoices([]);
        calculateStats([]);
      }
    } catch (err) {
      if (seq !== fetchSeq.current) return;
      console.error("Error fetching invoices:", err);
      setError(err.message || "Failed to fetch invoices. Please try again.");
      setInvoices([]);
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  };

  const calculateStats = (invoiceData) => {
    const totalInvoices = invoiceData.length;
    const totalAmount = invoiceData.reduce((sum, inv) => {
      const amount = parseFloat(inv.InvoiceValue || inv.OrderValue || inv.InvoiceTotal || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const paidInvoices = invoiceData.filter(inv =>
      inv.InvoiceStatus?.toLowerCase() === 'paid' ||
      inv.Status?.toLowerCase() === 'paid'
    ).length;

    const pendingInvoices = invoiceData.filter(inv =>
      inv.InvoiceStatus?.toLowerCase() === 'pending' ||
      inv.Status?.toLowerCase() === 'pending' ||
      inv.InvoiceStatus?.toLowerCase() === 'upcoming' ||
      inv.Status?.toLowerCase() === 'upcoming'
    ).length;

    const overdueInvoices = invoiceData.filter(inv =>
      inv.InvoiceStatus?.toLowerCase() === 'overdue' ||
      inv.Status?.toLowerCase() === 'overdue'
    ).length;

    setStats({
      totalInvoices,
      totalAmount,
      paidInvoices,
      pendingInvoices,
      overdueInvoices
    });
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowFullInvoice(false);
  };

  const handleOpenFullPreview = (invoice) => {
    try {
      const secret = import.meta.env.VITE_QUOTE_LINK_SECRET || "default_secret";
      const orderId = invoice.OrderID || invoice.id;

      if (!orderId) {
        console.error("No Order ID found for invoice");
        return;
      }

      const encryptedOrderId = encodeURIComponent(
        CryptoJS.AES.encrypt(String(orderId), secret).toString()
      );

      navigate(`/profile/invoice-preview/${encryptedOrderId}`, {
        state: { invoiceData: invoice }
      });
    } catch (error) {
      console.error("Error encrypting order ID:", error);
    }
  };

  const faqs = [
    {
      question: 'How are seats billed?',
      answer: 'Seats are billed monthly based on your subscription plan. You can add or remove seats at any time.'
    },
    {
      question: 'What are available seats?',
      answer: 'Available seats are the number of users that can access your account. Additional seats can be purchased as needed.'
    },
    {
      question: 'When will I receive my invoice?',
      answer: 'Invoices are generated on the 1st of each month and are due by the 8th of the same month.'
    },
  ];

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0.00';
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '₹0.00';

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
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

  const getStatusBadge = (status) => {
    const normalized = status?.toLowerCase();
    const styles = {
      paid: 'bg-green-50 text-green-700',
      pending: 'bg-yellow-50 text-yellow-700',
      upcoming: 'bg-yellow-50 text-yellow-700',
      overdue: 'bg-red-50 text-red-700',
      cancelled: 'bg-gray-100 text-gray-600',
    };
    return styles[normalized] || 'bg-gray-100 text-gray-600';
  };

  const getNextInvoice = () => {
    if (!invoices.length) return null;

    const now = new Date();
    const futureInvoices = invoices
      .filter(inv => {
        const invDate = new Date(inv.InvoiceDate || inv.OrderDate);
        return invDate > now && inv.InvoiceStatus?.toLowerCase() !== 'paid';
      })
      .sort((a, b) => new Date(a.InvoiceDate) - new Date(b.InvoiceDate));

    return futureInvoices[0] || invoices[0];
  };

  const nextInvoice = getNextInvoice();

  // Total is GST-inclusive (that's what the API/InvoiceValue gives us). GST is the real
  // GstAmount summed off QuoteServiceDetails (via invoice.amounts.gst) when available.
  // Subtotal is the difference: Total - GST — never computed independently — so
  // Subtotal + GST always reconciles exactly back to Total.
  const getInvoiceBreakdown = (invoice) => {
    const total = invoice?.amounts?.total
      || parseFloat(invoice?.InvoiceValue || invoice?.OrderValue || invoice?.InvoiceTotal || 0) || 0;
    const gst = invoice?.amounts?.gst || 0;
    const subtotal = total - gst;
    return { subtotal, gst, total };
  };

  const selectedInvoiceBreakdown = selectedInvoice ? getInvoiceBreakdown(selectedInvoice) : null;

  // Client-side pagination over the already-loaded invoices, 10 per page.
  const totalPages = Math.max(1, Math.ceil(invoices.length / INVOICES_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * INVOICES_PER_PAGE;
  const pagedInvoices = invoices.slice(pageStart, pageStart + INVOICES_PER_PAGE);

  return (
    <div>
      <div className="mx-auto px-1 sm:px-4 md:px-6 py-4 md:py-10">
        {/* Heading */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Invoice</h1>
          {showRefundLink && (
            <button
              onClick={() => navigate('/dashboard/bizpoleone/refunds')}
              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
            >
              Need a refund?
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-gray-200 mb-6 md:mb-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'invoices', label: 'Invoices' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative pb-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="invoiceTabUnderline"
                  className="absolute left-0 right-0 -bottom-px h-[2px] bg-yellow-400"
                />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Next invoice card */}
              <div className="border border-gray-200 rounded-xl p-4 sm:p-6">
                {nextInvoice ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm text-gray-500">Next monthly invoice</h3>
                      <button
                        onClick={() => handleOpenFullPreview(nextInvoice)}
                        className="text-xs font-medium text-gray-700 border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors"
                      >
                        Preview
                      </button>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-4">
                      <span className="text-2xl sm:text-3xl font-semibold text-gray-900">
                        {formatCurrency(nextInvoice.InvoiceValue || nextInvoice.OrderValue || nextInvoice.InvoiceTotal)}
                      </span>
                      <span className="text-sm text-gray-400">
                        due {formatDate(nextInvoice.InvoiceDate || nextInvoice.OrderDate)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleOpenFullPreview(nextInvoice)}
                      className="w-full flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100 hover:text-gray-700 transition-colors"
                    >
                      <span>
                        {formatCurrency(nextInvoice.InvoiceValue || nextInvoice.OrderValue || nextInvoice.InvoiceTotal)} for 1 monthly seat
                      </span>
                      <FiChevronRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[160px] text-center">
                    <FiFileText className="w-8 h-8 text-gray-300 mb-3" />
                    <span className="text-gray-500 text-sm">No upcoming invoices</span>
                  </div>
                )}
              </div>

              {/* Plan card */}
              <div className="border border-gray-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-yellow-400 rounded-sm inline-block" />
                    <h3 className="text-sm font-medium text-gray-900">You're on the Plus plan</h3>
                  </div>
                  <button className="text-xs font-medium text-gray-500 hover:text-gray-700 underline">
                    View plans
                  </button>
                </div>
                <div className="divide-y divide-gray-100">
                  {faqs.slice(0, 2).map((faq, index) => (
                    <div key={index}>
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full flex items-center justify-between py-3 text-left"
                      >
                        <span className="text-sm text-gray-700">{faq.question}</span>
                        {expandedFaq === index ? (
                          <FiMinus className="w-4 h-4 text-gray-400" />
                        ) : (
                          <FiPlus className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <AnimatePresence>
                        {expandedFaq === index && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className="text-sm text-gray-500 pb-3">{faq.answer}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'invoices' && (
            <motion.div
              key="invoices"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-6" style={{ alignItems: 'flex-start' }}
            >
              {/* Table */}
              <div className={`border border-gray-200 rounded-xl overflow-clip transition-all ${selectedInvoice ? 'w-full lg:flex-1' : 'w-full'}`}>
                {loading ? (
                  <div className="p-12 text-center">
                    <div className="inline-block w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-sm text-gray-500">Loading invoices...</p>
                  </div>
                ) : error ? (
                  <div className="p-12 text-center">
                    <FiAlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                    <p className="text-sm text-red-600 mb-3">{error}</p>
                    <button
                      onClick={fetchInvoices}
                      className="text-xs font-medium text-gray-700 border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50"
                    >
                      Retry
                    </button>
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="p-12 text-center">
                    <FiFileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No invoices found</p>
                  </div>
                ) : (
                  <>
                  {/* Phones: one card per invoice instead of the 4-column table */}
                  <ul className="sm:hidden divide-y divide-gray-100">
                    {pagedInvoices.map((invoice, index) => {
                      const isSelected = selectedInvoice === invoice;
                      const status = invoice.InvoiceStatus || invoice.Status || 'Unknown';
                      return (
                        <li
                          key={invoice.InvoiceID || invoice.id || index}
                          onClick={() => handleViewInvoice(invoice)}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-yellow-50/60' : 'active:bg-gray-50'}`}
                        >
                          <FiFileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {invoice.InvoiceCode || invoice.invoiceCode || 'Monthly invoice'}
                            </p>
                            <p className={`text-xs ${status.toLowerCase() === 'upcoming' || status.toLowerCase() === 'pending' ? 'text-yellow-600 font-medium' : 'text-gray-500'}`}>
                              {formatDate(invoice.InvoiceDate || invoice.invoiceDate)}
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusBadge(status)}`}>
                            {status}
                          </span>
                          <FiChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </li>
                      );
                    })}
                  </ul>
                  <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Due date</th>
                        <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Description</th>
                        <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Status</th>
                        <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedInvoices.map((invoice, index) => {
                        const isSelected = selectedInvoice === invoice;
                        const status = invoice.InvoiceStatus || invoice.Status || 'Unknown';
                        return (
                          <tr
                            key={invoice.InvoiceID || invoice.id || index}
                            onClick={() => handleViewInvoice(invoice)}
                            className={`border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${isSelected ? 'bg-yellow-50/60' : 'hover:bg-gray-50'
                              }`}
                          >
                            <td className={`py-3.5 px-5 ${status.toLowerCase() === 'upcoming' || status.toLowerCase() === 'pending' ? 'text-yellow-600 font-medium' : 'text-gray-700'}`}>
                              {formatDate(invoice.InvoiceDate || invoice.invoiceDate)}
                            </td>
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-2 text-gray-700">
                                <FiFileText className="w-4 h-4 text-gray-400" />
                                {invoice.InvoiceCode || invoice.invoiceCode || 'Monthly invoice'}
                              </div>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(status)}`}>
                                {status}
                              </span>
                            </td>
                            <td className="py-3.5 px-5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewInvoice(invoice);
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors"
                              >
                               
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                  </>
                )}
                {!loading && !error && invoices.length > INVOICES_PER_PAGE && (
                  <div className="sticky bottom-0 z-10 bg-white flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      Showing {pageStart + 1}–{Math.min(pageStart + INVOICES_PER_PAGE, invoices.length)} of {invoices.length}
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(safePage - 1)}
                        disabled={safePage === 1}
                        className="text-xs font-medium text-gray-700 border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        Previous
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`text-xs font-medium rounded-md w-8 py-1.5 transition-colors ${page === safePage
                            ? 'bg-yellow-400 text-gray-900'
                            : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(safePage + 1)}
                        disabled={safePage === totalPages}
                        className="text-xs font-medium text-gray-700 border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Detail panel */}
              <AnimatePresence>
                {selectedInvoice && (
                  <motion.div
                    key="invoice-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedInvoice(null)}
                    className="lg:hidden fixed inset-0 z-40 bg-black/40"
                  />
                )}
                {selectedInvoice && (
                  <motion.div
                    key="invoice-panel"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.2 }}
                    // Below lg it's a bottom sheet over the list; lg+ the side panel.
                    className="flex flex-col bg-white border border-gray-200 p-5 sm:p-6
                      fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl
                      lg:static lg:z-auto lg:max-h-none lg:overflow-visible lg:rounded-xl lg:w-[320px] lg:flex-shrink-0 lg:min-h-[600px]"
                  >
                    <div className="flex items-start justify-between mb-5 pb-5 border-b border-gray-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-900">
                            Monthly invoice
                          </h3>
                          {showFullInvoice && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedInvoice.InvoiceStatus || selectedInvoice.Status)}`}>
                              {selectedInvoice.InvoiceStatus || selectedInvoice.Status || 'Unknown'}
                            </span>
                          )}
                        </div>
                        {showFullInvoice && (
                          <p className="text-xs text-gray-400 mt-1">
                            Invoice date: {formatDate(selectedInvoice.InvoiceDate || selectedInvoice.OrderDate)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedInvoice(null)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-5 pb-5 border-b border-gray-200">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Due date</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(selectedInvoice.InvoiceDate || selectedInvoice.OrderDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Status</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedInvoice.InvoiceStatus || selectedInvoice.Status || 'Unknown'}
                        </p>
                      </div>
                      {showFullInvoice && (
                        <>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Invoice number</p>
                            <p className="text-sm font-medium text-gray-900">
                              {selectedInvoice.InvoiceNumber || selectedInvoice.InvoiceCode || '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Payment method</p>
                            <p className="text-sm font-medium text-gray-900">
                              {selectedInvoice.PaymentMethod || '-'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="mb-5 pb-5 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {showFullInvoice ? 'Renewing monthly seats' : 'Renewing monthly'}
                      </p>
                      <p className="text-xs text-gray-400">
                        Assigned monthly {showFullInvoice ? 'seats that renewed' : 'that will renew'} for {formatDate(selectedInvoice.InvoiceDate || selectedInvoice.OrderDate)}
                      </p>
                    </div>

                    {!showFullInvoice && (
                      <div className="space-y-2 mb-5 pb-5 border-b border-gray-200 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="text-gray-900">
                            {formatCurrency(selectedInvoiceBreakdown.subtotal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">GST Amount</span>
                          <span className="text-gray-900">{formatCurrency(selectedInvoiceBreakdown.gst)}</span>
                        </div>
                      </div>
                    )}

                    {!showFullInvoice ? (
                      <>
                        <div className="flex items-center justify-between mb-5">
                          <span className="text-sm font-medium text-gray-900">Total (incl. GST)</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(selectedInvoiceBreakdown.total)}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#E4ECFF]">
                          <FiAlertCircle className="w-4 h-4 text-[#1E2746] mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-[#1E2746]">
                            Upgrade to an annual plan for a{' '}
                            <span className="underline cursor-pointer">20% discount</span>
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2 mb-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="text-gray-900">
                            {formatCurrency(selectedInvoiceBreakdown.subtotal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">GST Amount</span>
                          <span className="text-gray-900">{formatCurrency(selectedInvoiceBreakdown.gst)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                          <span className="text-sm font-medium text-gray-900">Total</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(selectedInvoiceBreakdown.total)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex-1"  />

                    {!showFullInvoice ? (
                      <button
                        onClick={() => setShowFullInvoice(true)}
                        className="w-full border border-gray-300 rounded-md py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mt-6"
                      >
                        Manage
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenFullPreview(selectedInvoice)}
                        className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-md py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mt-6"
                      >
                        <FiDownload className="w-4 h-4" />
                        Download PDF
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default InvoiceProfile;
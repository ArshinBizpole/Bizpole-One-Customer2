import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import { getInvoiceDetails } from '../api/Companyinvoice';
import { motion } from 'framer-motion';
import {
  Download,
  MessageCircle,
  Calendar,
  Clock,
  FileText,
  CreditCard,
  XCircle,
  Wrench,
  ListChecks,
  Package,
  CheckCircle2,
  IndianRupee,
  ClipboardList,
  AlertCircle
} from 'lucide-react';

// Order status list — matches the mapping used in MyIndividualservices.jsx
export const orderStatusList = [
  { value: 1, label: 'Not Started' },
  { value: 2, label: 'Action Required' },
  { value: 3, label: 'In Process' },
  { value: 4, label: 'Completed' },
  { value: 5, label: 'On Hold' },
  { value: 6, label: 'Dropped' },
  { value: 7, label: 'Cancelled' },
  { value: 8, label: 'Expired' },
];

// Status chip styling — mirrors StatusChip in MyIndividualservices.jsx
const statusChipConfig = {
  1: { icon: Clock, label: 'Not Started', color: 'text-gray-500', bg: 'bg-gray-50' },
  2: { icon: AlertCircle, label: 'Action Required', color: 'text-orange-600', bg: 'bg-orange-50' },
  3: { icon: CheckCircle2, label: 'In Process', color: 'text-blue-600', bg: 'bg-blue-50' },
  4: { icon: CheckCircle2, label: 'Completed', color: 'text-green-600', bg: 'bg-green-50' },
  5: { icon: AlertCircle, label: 'On Hold', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  6: { icon: XCircle, label: 'Dropped', color: 'text-gray-500', bg: 'bg-gray-50' },
  7: { icon: XCircle, label: 'Cancelled', color: 'text-red-500', bg: 'bg-red-50' },
  8: { icon: XCircle, label: 'Expired', color: 'text-red-600', bg: 'bg-red-50' },
};

const MyOrderDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get order data from navigation state
  const order = location.state?.order || {};
  const IsIndividual = location.state?.IsIndividual || 0;

  const isIndividualService = IsIndividual === 1; // Check if it's individual service

  // Timeline steps by status value
  const getTimelineSteps = (statusValue) => {
    const steps = [
      { stage: 'Order Placed', key: 1 },
      { stage: 'Processing Started', key: 2 },
      { stage: 'In Progress', key: 3 },
      { stage: 'Completed', key: 4 },
    ];

    let completedIdx = 0;
    if (statusValue === 1) completedIdx = 0;      // Not Started
    else if (statusValue === 2) completedIdx = 1; // Action Required
    else if (statusValue === 3) completedIdx = 2; // In Process
    else if (statusValue === 4) completedIdx = 3; // Completed
    else if (statusValue === 5) completedIdx = 2; // On Hold -> stalled mid-progress
    else if (statusValue === 6) completedIdx = 1; // Dropped
    else if (statusValue === 7) completedIdx = 0; // Cancelled
    else if (statusValue === 8) completedIdx = 0; // Expired

    return steps.map((step, idx) => ({
      ...step,
      completed: idx <= completedIdx,
      date: idx <= completedIdx && (order.CreatedAt || order.CreatedDate)
        ? new Date(order.CreatedAt || order.CreatedDate).toLocaleDateString()
        : 'N/A',
    }));
  };

  const getOrderItems = () => {
    if (Array.isArray(order.ServiceDetails) && order.ServiceDetails.length > 0) {
      return order.ServiceDetails.map((service, index) => ({
        id: index,
        name: service.ServiceName || service.ItemName || `Service ${index + 1}`,
        status: service.StatusRemark || 'Pending',
        price: `₹${service.Total || 'N/A'}`,
        total: parseFloat(service.Total) || 0,
        description: service.Description || '',
        ServiceDetailsID: service.ServiceDetailsID || service.ServiceDetailID || service.ID || null,
        PendingAmount: service.PendingAmount ? parseFloat(service.PendingAmount) : (service.PendingAmount === 0 ? 0 : (service.Total && service.AdvanceAmount ? parseFloat(service.Total) - parseFloat(service.AdvanceAmount) : 0)),
        AdvanceAmount: service.AdvanceAmount ? parseFloat(service.AdvanceAmount) : 0
      }));
    }
    // fallback for legacy/other order types
    if (isIndividualService) {
      return [{
        id: 0,
        name: order.ServiceName || order.ItemName || 'Individual Service',
        status: order.OrderStatus || order.Status,
        price: `₹${order.TotalAmount || order.Price || 'N/A'}`,
        total: order.TotalAmount || order.Price || 0,
        description: order.ServiceDescription || 'Service details will be provided by our team.',
        ServiceDetailsID: order.ServiceDetailsID || order.ServiceDetailID || null,
        PendingAmount: order.PendingAmount ? parseFloat(order.PendingAmount) : 0,
        AdvanceAmount: order.AdvanceAmount ? parseFloat(order.AdvanceAmount) : 0
      }];
    }
    if (Array.isArray(order.Items) && order.Items.length > 0) {
      return order.Items.map((item, index) => ({
        id: index,
        name: item.name || `Item ${index + 1}`,
        status: item.status || 'Pending',
        price: item.price || '₹N/A',
        total: 0,
        description: item.description || '',
        ServiceDetailsID: item.ServiceDetailsID || item.ServiceDetailID || null,
        PendingAmount: item.PendingAmount ? parseFloat(item.PendingAmount) : 0,
        AdvanceAmount: item.AdvanceAmount ? parseFloat(item.AdvanceAmount) : 0
      }));
    }
    return [];
  };

  const orderItems = getOrderItems();
  const timelineSteps = getTimelineSteps(order.OrderStatus || order.Status);

  // Helper to get status label from value
  const getOrderStatusLabel = (statusValue) => {
    const found = orderStatusList.find((s) => s.value === statusValue);
    return found ? found.label : (order.OrderStatus || order.Status || 'Unknown');
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  const cardVariants = {
    hover: { y: -3, transition: { type: 'spring', stiffness: 300 } }
  };

  // State for selected service and its tasks
  const [selectedService, setSelectedService] = useState(null);
  const [serviceTasks, setServiceTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState(null);

  const itemsAdvanceAmount = orderItems.reduce((sum, item) => sum + (item.AdvanceAmount ? Number(item.AdvanceAmount) : 0), 0);
  const itemsPendingAmount = orderItems.reduce((sum, item) => sum + (item.PendingAmount ? Number(item.PendingAmount) : 0), 0);
  // Orders.ReceivedAmount / Orders.PendingAmount are the source of truth; the per-service
  // Advance/Pending fields above are legacy fallbacks for orders that predate those columns.
  const totalAdvanceAmount = order.ReceivedAmount != null ? Number(order.ReceivedAmount) : itemsAdvanceAmount;
  const totalPendingAmount = order.PendingAmount != null ? Number(order.PendingAmount) : itemsPendingAmount;

  // Opens the same quote saved-preview/approval page used elsewhere (QuotesList.jsx,
  // ComplianceDashboard.jsx) so the customer can pay the balance from the quote itself.
  const handlePayBalance = (orderObj) => {
    if (!orderObj.QuoteID) return;
    const secret = import.meta.env.VITE_QUOTE_LINK_SECRET || 'q3!9fKs7@pLzXr84$nmYtB!cVZdQ3';
    const encrypted = CryptoJS.AES.encrypt(String(orderObj.QuoteID), secret).toString();
    const url = `${import.meta.env.VITE_CLIENT_BASE_URL}/quotes/saved-preview/${encodeURIComponent(encrypted)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Orders.TotalAmount is the source of truth; summing per-service `Total` is a
  // legacy fallback that can miss GST/Gov fee components and drift from the real total.
  const totalAmount = order.TotalAmount != null
    ? Number(order.TotalAmount)
    : order.totalAmount != null
      ? Number(order.totalAmount)
      : orderItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const hasPendingAmount = totalPendingAmount > 0;

  // order.OrderID here can be the OrderCodeId string (e.g. "OR0000123") rather than the
  // raw numeric primary key — extract the trailing digits so lookups against numeric
  // OrderID columns (invoiceforservice) get the real ID instead of MySQL coercing a
  // non-numeric string like "OR0000123" down to 0.
  const getNumericOrderId = (value) => {
    if (value == null) return null;
    const match = String(value).match(/(\d+)\s*$/);
    return match ? Number(match[1]) : null;
  };

  // Opens the same invoice preview/PDF flow used in Invoiceprofile.jsx — encrypts the
  // OrderID into the route param and hands the invoice data through navigation state.
  // The real invoice number lives in `invoiceforservice.InvoiceCode` (keyed by OrderID),
  // not on Quote/Orders, so it's fetched via the same getInvoiceDetails API Invoiceprofile.jsx uses.
  const handleDownloadInvoice = async () => {
    const numericOrderId = getNumericOrderId(order.OrderID);
    if (!numericOrderId) return;
    try {
      const detailsRes = await getInvoiceDetails([numericOrderId]);
      const invoiceRows = Array.isArray(detailsRes?.data) ? detailsRes.data : [];
      const invoiceRow = invoiceRows.find((r) => r.ServiceDetailID == null) || invoiceRows[0] || null;

      const secret = import.meta.env.VITE_QUOTE_LINK_SECRET || 'default_secret';
      const encryptedOrderId = encodeURIComponent(
        CryptoJS.AES.encrypt(String(numericOrderId), secret).toString()
      );
      const services = Array.isArray(order.ServiceDetails) ? order.ServiceDetails : [];
      const gst = services.reduce((sum, s) => sum + (parseFloat(s.GstAmount) || 0), 0);
      const invoiceData = {
        OrderID: numericOrderId,
        InvoiceCode: invoiceRow?.InvoiceCode || order.QuoteIDCode || order.OrderCodeId,
        InvoiceDate: invoiceRow?.InvoiceDate || order.CreatedAt || order.order_date,
        CompanyName: invoiceRow?.CompanyName || order.CompanyName,
        PrimaryCustomer: invoiceRow?.PrimaryCustomer || order.PrimaryCustomer,
        customerName: order.CustomerName,
        state: order.StateService || order.State,
        franchiseeId: order.FranchiseeID,
        FranchiseeName: order.FranchiseeName,
        quoteCodeId: order.QuoteIDCode,
        serviceDetails: services,
        amounts: {
          total: totalAmount,
          gst,
          advance: totalAdvanceAmount,
          pending: totalPendingAmount,
        },
      };
      navigate(`/profile/invoice-preview/${encryptedOrderId}`, { state: { invoiceData } });
    } catch (error) {
      console.error('Error opening invoice preview:', error);
    }
  };

  const goToTasks = (item) => {
    if (!item?.ServiceDetailsID) return;
    navigate('/dashboard/bizpoleone/tasks', { state: { serviceId: item.ServiceDetailsID, service: item } });
  };

  if (!order || !order.OrderID) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center p-4"
      >
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-800 mb-2">No Order Found</h3>
          <p className="text-gray-600 mb-6">Please go back and select an order to view details.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-amber-400 text-black rounded-full hover:bg-amber-500 transition font-medium"
          >
            Go Back
          </button>
        </div>
      </motion.div>
    );
  }

  if (isIndividualService) {
    const item = orderItems[0] || {};
    const statusValue = order.OrderStatus || order.Status;
    const statusLabel = getOrderStatusLabel(statusValue);
    const chip = statusChipConfig[statusValue] || { icon: AlertCircle, label: 'Unknown', color: 'text-gray-500', bg: 'bg-gray-50' };
    const StatusIcon = chip.icon;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gray-50"
      >
        <div className="max-w-5xl mx-auto p-4 md:p-6">
          {/* Header */}
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">
            Order Details
          </h1>

          {/* Back to Orders */}
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to Orders
          </button>

          {/* Title Card */}
          <motion.div
            variants={cardVariants}
            whileHover="hover"
            className="bg-white rounded-2xl border border-gray-200 p-5 mb-4"
          >
            <div className="flex items-start justify-between gap-3 ">
              <h2 className="text-lg font-semibold text-gray-900">
                {order.ServiceName || order.ItemName || 'Individual Service'}
              </h2>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${chip.color} ${chip.bg}`}>
                <StatusIcon size={12} />
                {statusLabel}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {item.description || order.ServiceDescription || 'Service details will be provided by our team.'}
            </p>
          </motion.div>


          {/* Order Information Card */}
          <motion.div
            variants={cardVariants}
            whileHover="hover"
            className="bg-white rounded-2xl  border border-gray-200 p-5 mb-4"
          >
            {/* Order Information */}
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Order ID</p>
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-gray-400" />
                  {order.OrderID}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Order Date</p>
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {order.CreatedAt || order.CreatedDate
                    ? new Date(order.CreatedAt || order.CreatedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'N/A'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Est. Completion</p>
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {order.EstCompletionDate
                    ? new Date(order.EstCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'N/A'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Amount Paid</p>
                <p className="text-sm font-semibold text-gray-900">
                  ₹{totalAdvanceAmount.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mt-3">
              <p className="text-xs text-gray-400 mb-1">Status</p>
              <p className="text-sm font-semibold text-gray-900">{statusLabel}</p>
            </div>

            {/* Order Timeline */}
            <div className="border-t border-gray-200 mt-5 pt-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Timeline</h3>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {timelineSteps.map((step, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    className="relative flex items-start pb-6 last:pb-0"
                  >
                    {index !== timelineSteps.length - 1 && (
                      <div className={`absolute left-[5px] top-3 w-0.5 h-full ${step.completed ? 'bg-amber-300' : 'bg-gray-200'}`} />
                    )}
                    <span className={`relative z-10 w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${step.completed ? 'bg-amber-400' : 'bg-gray-200'}`} />
                    <div className="ml-4">
                      <p className={`text-sm font-medium ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.stage}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{step.date}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-200 mt-5 pt-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 bg-amber-400 text-black px-6 py-2.5 rounded-full text-sm font-medium hover:bg-amber-500 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  Contact Support
                </button>
                <button
                  onClick={handleDownloadInvoice}
                  className="flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Invoice
                </button>
                <button
                  onClick={() => goToTasks(item)}
                  className="flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <ClipboardList className="w-4 h-4" />
                  Task
                </button>
                {hasPendingAmount && (
                  <button
                    onClick={() => handlePayBalance(order)}
                    className="flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    Pay Balance
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-4 md:p-8 bg-gray-50/50"
    >
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-6"
        >
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
            Order Details
          </h1>
        </motion.div>
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Orders
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Package Card */}
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-start gap-4 pb-5 mb-5 border-b border-gray-100">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  {isIndividualService
                    ? <Wrench className="w-6 h-6 text-amber-600" />
                    : <Package className="w-6 h-6 text-amber-600" />}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {order.PackageName || order.PackageTitle || order.ServiceName || order.ItemName || 'Unnamed Package'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {Array.isArray(order.ServiceDetails) && order.ServiceDetails.length > 0
                      ? 'This order includes the following individual services.'
                      : isIndividualService
                        ? 'Individual service order with dedicated support.'
                        : 'This package includes various business services and solutions tailored to your needs.'
                    }
                  </p>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {isIndividualService ? 'Service Details' : 'Package Items'}
              </h3>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {orderItems.map((item, index) => (
                  <motion.div
                    key={item.id ?? index}
                    variants={itemVariants}
                    onClick={() => goToTasks(item)}
                    className={`flex items-center justify-between p-4 bg-gray-50 rounded-xl transition-colors cursor-pointer hover:bg-amber-50 border ${selectedService && selectedService.id === item.id ? 'border-amber-300' : 'border-transparent'}`}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-amber-400 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">{item.status}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {item.price}
                    </span>
                  </motion.div>
                ))}

                {selectedService && (
                  <div className="mt-4 bg-white rounded-xl border border-amber-100 p-5">
                    <h4 className="text-sm font-semibold mb-3 text-amber-700 flex items-center gap-2">
                      <ListChecks className="w-4 h-4" />
                      Tasks for {selectedService.name}
                    </h4>
                    {tasksLoading ? (
                      <div className="text-gray-400 text-sm py-3">Loading tasks...</div>
                    ) : tasksError ? (
                      <div className="text-red-500 text-sm py-3">{tasksError}</div>
                    ) : serviceTasks.length === 0 ? (
                      <div className="text-gray-400 text-sm py-3">No tasks found for this service.</div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {serviceTasks.map((task) => (
                          <li key={task.ID} className="py-2.5 flex flex-col md:flex-row md:items-center md:justify-between">
                            <div>
                              <span className="font-medium text-gray-900 text-sm">{task.TaskName}</span>
                              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{task.status}</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1 md:mt-0">
                              {task.AssignedAt ? new Date(task.AssignedAt).toLocaleDateString() : 'N/A'}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>

            {/* Timeline Card */}
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <h3 className="text-sm font-semibold text-gray-700 mb-5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Order Timeline
              </h3>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {timelineSteps.map((step, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    className="relative flex items-start pb-6 last:pb-0"
                  >
                    {index !== timelineSteps.length - 1 && (
                      <div className={`absolute left-[5px] top-3 w-0.5 h-full ${step.completed ? 'bg-amber-300' : 'bg-gray-200'}`} />
                    )}
                    <span className={`relative z-10 w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${step.completed ? 'bg-amber-400' : 'bg-gray-200'}`} />
                    <div className="ml-4">
                      <p className={`text-sm font-medium ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.stage}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{step.date}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Order Summary Card */}
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Order ID</p>
                    <p className="text-sm font-semibold text-gray-900">{order.OrderID}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Ordered On</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {order.CreatedAt || order.CreatedDate
                        ? new Date(order.CreatedAt || order.CreatedDate).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                    <IndianRupee className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Total Amount</p>
                    <p className="text-sm font-semibold text-gray-900">₹{totalAmount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Status</span>
                    <span className="font-medium text-gray-900">
                      {getOrderStatusLabel(order.OrderStatus || order.Status)}
                    </span>
                  </div>
                  {totalAdvanceAmount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Advance Paid</span>
                      <span className="font-medium text-green-600">₹{totalAdvanceAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Pending Amount</span>
                    <span className="font-medium text-red-500">₹{totalPendingAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Actions Card */}
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Actions</h3>
              <motion.div
                className="space-y-3"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDownloadInvoice}
                  className="w-full flex items-center justify-center gap-2 bg-amber-400 text-black px-6 py-2.5 rounded-full text-sm font-medium hover:bg-amber-500 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Invoice
                </motion.button>

                {hasPendingAmount ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
                    onClick={() => handlePayBalance(order)}
                  >
                    <CreditCard className="w-4 h-4" />
                    Pay Balance
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contact Support
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/dashboard/bizpoleone/tasks')}
                  className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <ClipboardList className="w-4 h-4" />
                  Task
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MyOrderDetails;
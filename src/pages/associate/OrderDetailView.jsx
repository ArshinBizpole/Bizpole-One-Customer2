import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Loader2, Activity, FileText, IndianRupee,
    AlertCircle, ListChecks,
    FolderOpen, Receipt, FileStack, LayoutDashboard,
    Download, X,
} from 'lucide-react';
import { getOrderById } from '../../api/Orders/Order';
import { format } from 'date-fns';
import { getAssociateReceiptDetails, getInvoicesForService, getReceiptsForOrder } from '../../api/AssociateApi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toCustomerServiceStatus } from '../../utils/orderStatus';

const OrderDetailView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Summary');
    const [activeFileSubTab, setActiveFileSubTab] = useState('Permanent Files');
    const [invoices, setInvoices] = useState([]);
    const [invoiceLoading, setInvoiceLoading] = useState(false);

    // Receipt Tab State
    const [receipts, setReceipts] = useState([]);
    const [receiptsLoading, setReceiptsLoading] = useState(false);

    // Receipt Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const tabs = [
        { name: 'Summary', icon: LayoutDashboard },
        { name: 'Services', icon: ListChecks },
        // { name: 'Files', icon: FolderOpen },
        { name: 'Receipts', icon: Receipt },
        { name: 'Invoice', icon: FileStack },
        // { name: 'Notes', icon: FileText },
        // { name: 'Event Logs', icon: History },
        // { name: 'Tasks', icon: ListChecks },
        // { name: 'Chat', icon: MessageSquare },
    ];

    useEffect(() => {
        const fetchOrderDetails = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const response = await getOrderById(id);
                console.log("Order Details", { response });

                if (response.success) {
                    const apiData = response.data;

                    setOrder({
                        ...apiData.order,
                        ServiceDetails: apiData.services || [],
                        quote: apiData.quote || {},
                        totals: apiData.totals || {}
                    });
                }
            } catch (err) {
                console.error("fetchOrderDetails error", err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrderDetails();
    }, [id]);


    console.log("WWWW", { receipts });





    const fetchReceipts = useCallback(async () => {
        if (!order) return;

        setReceiptsLoading(true);

        try {
            const response = await getReceiptsForOrder(order.QuoteID);

            if (response.success) {
                setReceipts(response?.payments || []);
            } else {
                setReceipts([]);
            }
        } catch (err) {
            console.error("fetchReceipts error", err);
            setReceipts([]);
        } finally {
            setReceiptsLoading(false);
        }

    }, [order]);


    const fetchInvoices = useCallback(async () => {
        if (!order) return;

        setInvoiceLoading(true);

        try {
            const response = await getInvoicesForService({
                quoteId: order.QuoteID,
                orderId: order.OrderID
            });

            if (response.success) {
                setInvoices(response.data || []);
            } else {
                setInvoices([]);
            }

        } catch (error) {
            console.error("fetchInvoices error", error);
            setInvoices([]);
        } finally {
            setInvoiceLoading(false);
        }

    }, [order]);


    useEffect(() => {
        if (!order) return;

        switch (activeTab) {
            case 'Receipts':
                fetchReceipts();
                break;

            case 'Invoice':
                fetchInvoices();
                break;

            default:
                break;
        }

    }, [activeTab, order, fetchReceipts, fetchInvoices]);


    const handleViewReceipt = async (paymentId) => {
        setDetailLoading(true);
        setModalOpen(true);
        try {
            const response = await getAssociateReceiptDetails(paymentId);
            if (response.success) {
                setSelectedReceipt(response.data);
            }
        } catch (error) {
            console.error("Error fetching details:", error);
        } finally {
            setDetailLoading(false);
        }
    };

    const downloadPDF = async (receiptData = null) => {
        const data = receiptData || selectedReceipt;
        if (!data) return;

        let fullData = data;
        if (!data.services) {
            try {
                const res = await getAssociateReceiptDetails(data.PaymentID);
                if (res.success) fullData = res.data;
            } catch (e) {
                console.error("Error fetching full details for PDF", e);
                return;
            }
        }


        const doc = new jsPDF();
        doc.setFillColor(255, 193, 7);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text("PAYMENT RECEIPT", 14, 20);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text("Official Transaction Record", 14, 28);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text(`Receipt ID: ${fullData.PaymentID}`, 14, 50);

        const startY = 60;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("TRANSACTION ID", 14, startY);
        doc.text("TRANSACTION DATE", 110, startY);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(fullData.TransactionID || "N/A", 14, startY + 6);
        doc.text(fullData.TransactionDate ? format(new Date(fullData.TransactionDate), "dd/MM/yyyy") : (fullData.PaymentDate ? format(new Date(fullData.PaymentDate), "dd/MM/yyyy") : "N/A"), 110, startY + 6);

        const row2Y = startY + 20;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("PAYMENT STATUS", 14, row2Y);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text((fullData.PaymentStatus || "").toUpperCase(), 14, row2Y + 6);
        doc.setFont('helvetica', 'normal');

        const row3Y = row2Y + 20;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("REMARKS", 14, row3Y);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(fullData.Remarks || "No remarks provided", 14, row3Y + 6);

        const tableY = row3Y + 20;
        doc.setFontSize(14);
        doc.setTextColor(245, 158, 11);
        doc.text("Service Breakdown", 14, tableY);
        doc.line(14, tableY + 2, 14, tableY + 6);

        const tableColumn = ["Service", "Vendor Fee", "Professional Fee", "Contractor Fee"];
        const tableRows = [];

        if (fullData.services && fullData.services.length > 0) {
            fullData.services.forEach(service => {
                tableRows.push([
                    service.ServiceName || `Service ID: ${service.ServiceID}`,
                    `Rs. ${parseFloat(service.VendorFee || 0).toFixed(2)}`,
                    `Rs. ${parseFloat(service.ProfessionalFee || 0).toFixed(2)}`,
                    `Rs. ${parseFloat(service.ContractorFee || 0).toFixed(2)}`,
                ]);
            });
        } else {
            tableRows.push([
                "Service Details",
                `Rs. ${parseFloat(fullData.VendorFee || 0).toFixed(2)}`,
                `Rs. ${parseFloat(fullData.ProfessionalFee || fullData.ProfFee || 0).toFixed(2)}`,
                `Rs. ${parseFloat(fullData.ContractorFee || 0).toFixed(2)}`,
            ]);
        }

        autoTable(doc, {
            startY: tableY + 10,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [249, 250, 251], textColor: [100, 100, 100], fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 6 },
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Amount: Rs. ${parseFloat(fullData.TotalAmount || 0).toFixed(2)}`, 140, finalY, { align: 'right' });

        doc.save(`Receipt_${fullData.PaymentID}.pdf`);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-[#4b49ac]" />
                <p className="text-slate-500 font-medium tracking-tight">Accessing order records...</p>
            </div>
        );
    }


    console.log("Full Data:", order);


    if (!order) {
        return (
            <div className="p-12 text-center">
                <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Order Not Found</h2>
                    <p className="text-slate-500 mb-6 font-medium">The order you are looking for could not be found or you don't have access.</p>
                    <button
                        onClick={() => navigate('/associate/orders')}
                        className="px-6 py-2 bg-[#4b49ac] text-white rounded-xl font-bold hover:bg-[#3f3da0] transition-colors"
                    >
                        Return to Orders
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50/50 min-h-screen">
            {/* Header & Sticky Tabs */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                <div className="max-w-[1600px] mx-auto p-4 lg:px-8">
                    <div className="mb-6 flex items-center justify-between">
                        <button
                            onClick={() => navigate('/associate/orders')}
                            className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 hover:bg-slate-200 transition-colors"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            Back to Orders
                        </button>
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${order.OrderStatus === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                {order.OrderStatus || 'In Progress'}
                            </span>
                            <span className="text-slate-400 font-bold text-xs">{order.OrderCodeId}</span>
                        </div>
                    </div>

                    <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-transparent">
                        {tabs.map((tab) => (
                            <button
                                key={tab.name}
                                onClick={() => setActiveTab(tab.name)}
                                className={`flex items-center gap-2 px-6 py-3 text-[12px] font-bold transition-all whitespace-nowrap border-b-2 ${activeTab === tab.name
                                    ? 'text-slate-900 border-yellow-400 bg-yellow-50/10'
                                    : 'text-slate-400 border-transparent hover:text-slate-600'
                                    }`}
                            >
                                {tab.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="max-w-[1600px] mx-auto p-6 lg:px-8">
                {activeTab === 'Summary' ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* 1. Basic Information */}
                        <InfoCard icon={<FileText className="w-4 h-4" />} title="Basic Information">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                <DataItem label="Order ID" value={order.OrderCodeId} />
                                <DataItem label="Order Date" value={order.quote?.RealOrderCreatedAt ? format(new Date(order.quote?.RealOrderCreatedAt), 'dd MMM yyyy HH:mm:ss') : '--'} />
                                <DataItem label="Order Status" value={toCustomerServiceStatus(order.OrderStatus)} />
                                <DataItem label="Order Source" value={order.SourceOfSale || 'Associate'} />
                                <DataItem label="Company Name" value={order.CompanyName} isBold />
                                <DataItem label="Customer Name" value={order.CustomerName} isBold />
                                <DataItem label="Order CRE" value={order.QuoteCRE_EmployeeName || 'admin'} />
                            </div>
                        </InfoCard>

                        {/* 2. Financial Summary */}
                        <InfoCard icon={<IndianRupee className="w-4 h-4" />} title="Pricing Information">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                {/* <PriceItem label="Professional Fee" value={order.totals?.ProfessionalFee || 0} />
                                <PriceItem label="Vendor Fee" value={order.totals?.VendorFee || 0} />
                                <PriceItem label="Contractor Fee" value={order.totals?.ContractorFee || 0} />
                                <PriceItem label="Govt. Fee" value={order.totals?.GovFee || 0} />
                                <PriceItem label="GST Amount" value={order.totals?.GST || 0} />
                                <PriceItem label="Discount Applied" value={order.Discount || 0} /> */}
                                <PriceItem label="Order Value" value={order.TotalAmount || 0} isTotal />
                                <PriceItem label="Amount Received" value={order.ReceivedAmount || 0} />
                                <PriceItem label="Amount Pending" value={order.PendingAmount || 0} />
                            </div>
                        </InfoCard>

                        {/* Summary View specific sections can be added here if needed */}
                    </div>
                ) : activeTab === 'Services' ? (
                    <div className="animate-in fade-in duration-500">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <ListChecks className="w-4 h-4 text-[#4b49ac]" />
                                    Service Summary ({order.ServiceDetails?.length || 0})
                                </h3>
                                {/* <button className="text-[10px] font-bold text-[#4b49ac] hover:underline">VIEW ALL SERVICES</button> */}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-[11px]">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100 uppercase tracking-tighter font-bold text-slate-400">
                                            <th className="px-6 py-3">Service Name</th>
                                            <th className="px-6 py-3 text-right">Total Amount</th>
                                            <th className="px-6 py-3 text-right">Advance Amount</th>
                                            <th className="px-6 py-3 text-right">Pending Amount</th>
                                            <th className="px-6 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 text-[12px]">
                                        {(order.ServiceDetails || []).map((service, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                                <td className="px-6 py-4 font-semibold text-slate-700">{service.ServiceName}</td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-700">₹{parseFloat(service.Total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-right text-slate-600 font-medium">₹{parseFloat(service.AdvanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-right text-red-600 font-bold">₹{parseFloat(service.PendingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 font-black text-[9px]">
                                                    <span className={`px-2 py-1 rounded-full uppercase ${service.StatusRemark === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                                                        service.StatusRemark === 'In Progress' ? 'bg-blue-50 text-blue-600' :
                                                            'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {toCustomerServiceStatus(service.StatusRemark)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'Receipts' ? (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in zoom-in duration-300 overflow-hidden">
                        {receiptsLoading ? (
                            <div className="px-6 py-12 text-center text-slate-400">
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin text-[#4b49ac]" />
                                    <span>Loading receipts...</span>
                                </div>
                            </div>
                        ) : receipts.length === 0 ? (
                            <div className="px-6 py-12 text-center text-slate-400">
                                No receipts found for this order.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-[10px] whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-400 tracking-wider">
                                            <th className="px-4 py-4 text-center">S.No</th>
                                            <th className="px-4 py-4">Receipt No</th>
                                            <th className="px-4 py-4">Transaction Date</th>
                                            <th className="px-4 py-4">Transaction ID</th>
                                            <th className="px-4 py-4">Order ID</th>
                                            <th className="px-4 py-4">Company Name</th>
                                            {/* <th className="px-4 py-4">Company CIN</th> */}
                                            <th className="px-4 py-4">Mode</th>
                                            <th className="px-4 py-4">Amount Paid</th>
                                            <th className="px-4 py-4">Receipt Status</th>
                                            <th className="px-4 py-4">Verification Status</th>
                                            <th className="px-4 py-4">Allocation Status</th>
                                            <th className="px-4 py-4">Advance</th>
                                            <th className="px-4 py-4 text-center">Document</th>
                                            <th className="px-4 py-4">Initiated By</th>
                                            <th className="px-4 py-4">Initiated On</th>
                                            <th className="px-4 py-4">Payment Link Status</th>
                                            {/* <th className="px-4 py-4">Payment Link Expiry</th> */}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {receipts.map((receipt, index) => (
                                            <tr key={receipt.PaymentID} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 text-center text-slate-500">{index + 1}</td>
                                                <td className="px-4 py-3 font-semibold text-slate-700 cursor-pointer hover:text-blue-600" onClick={() => handleViewReceipt(receipt.PaymentID)}>
                                                    {receipt.PaymentID}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">
                                                    {receipt.TransactionDate ? format(new Date(receipt.TransactionDate), "yyyy-MM-dd HH:mm:ss") : (receipt.PaymentDate ? format(new Date(receipt.PaymentDate), "yyyy-MM-dd HH:mm:ss") : "-")}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">{receipt.TransactionID || "-"}</td>
                                                <td className="px-4 py-3 text-slate-600">{receipt.QuoteCode || receipt.QuoteID || "-"}</td>
                                                <td className="px-4 py-3 text-slate-700 font-medium">{receipt.CompanyName || "-"}</td>
                                                {/* <td className="px-4 py-3 text-slate-500">{receipt.CIN || "-"}</td> */}
                                                <td className="px-4 py-3 text-slate-600">{receipt.PaymentMethod || "Razorpay"}</td>
                                                <td className="px-4 py-3 font-bold text-slate-800">₹{parseFloat(receipt.TotalAmount || 0).toFixed(2)}</td>
                                                <td className="px-4 py-3 text-slate-600 capitalize">{receipt.PaymentStatus || "pending"}</td>
                                                <td className="px-4 py-3">
                                                    {/* IsVerified is 1 because API filters it, so always Verified */}
                                                    <span className="text-emerald-600 font-medium">Verified</span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">{receipt.AllocationStatus || "Standard"}</td>
                                                <td className="px-4 py-3 text-slate-600">{receipt.IsAdvance ? "Yes" : "No"}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); downloadPDF(receipt); }}
                                                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                                                        title="Download Receipt"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">{receipt.CreatedByName || "-"}</td>
                                                <td className="px-4 py-3 text-slate-500">
                                                    {receipt.CreatedAt ? format(new Date(receipt.CreatedAt), "yyyy-MM-dd HH:mm:ss") : "-"}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">{receipt.PaymentLinkStatus || "Manual"}</td>
                                                {/* <td className="px-4 py-3 text-slate-500">{receipt.LinkExpiry || "-"}</td> */}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : activeTab === 'Invoice' ? (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-700">
                                Invoices for Order: {order?.OrderCodeId}
                            </h3>
                        </div>

                        {invoiceLoading ? (
                            <div className="px-6 py-12 text-center text-slate-400">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#4b49ac]" />
                                <p className="mt-2">Loading invoices...</p>
                            </div>
                        ) : invoices.length === 0 ? (
                            <div className="px-6 py-12 text-center text-slate-400">
                                No invoices found for this order.
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider">
                                                <th className="px-6 py-4">S.No</th>
                                                <th className="px-6 py-4">Invoice ID</th>
                                                <th className="px-6 py-4">Invoice Date</th>
                                                <th className="px-6 py-4">Invoice Value</th>
                                                <th className="px-6 py-4">Service Name</th>
                                                <th className="px-6 py-4">Cancellation Reason</th>
                                                <th className="px-6 py-4 text-center">Actions</th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-200">
                                            {invoices.map((invoice, index) => (
                                                <tr key={invoice.InvoiceID} className="hover:bg-slate-50 transition-colors">

                                                    <td className="px-6 py-4 text-slate-600">
                                                        {index + 1}
                                                    </td>

                                                    <td className="px-6 py-4 font-semibold text-slate-800">
                                                        {invoice.InvoiceCode || "-"}
                                                    </td>

                                                    <td className="px-6 py-4 text-slate-600">
                                                        {invoice.InvoiceDate
                                                            ? format(new Date(invoice.InvoiceDate), "M/d/yyyy")
                                                            : "-"}
                                                    </td>

                                                    <td className="px-6 py-4 font-medium text-slate-800">
                                                        ₹{Number(invoice.InvoiceValue || 0).toLocaleString('en-IN', {
                                                            minimumFractionDigits: 2
                                                        })}
                                                    </td>

                                                    <td className="px-6 py-4 text-slate-600">
                                                        {invoice?.serviceDetail?.ItemName || "-"}
                                                    </td>

                                                    <td className="px-6 py-4 text-slate-600">
                                                        {invoice.CancellationReason || "-"}
                                                    </td>

                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            className="text-slate-500 hover:text-blue-600 transition-colors"
                                                            title="Download Invoice"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                    </td>

                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-3 border-t border-slate-200 text-xs text-slate-500 text-center">
                                    Showing {invoices.length} invoice{invoices.length !== 1 && "s"}
                                </div>
                            </>
                        )}
                    </div>

                ) : activeTab === 'Files' ? (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in duration-500 min-h-[600px] overflow-hidden">
                        {/* Tab Content Header */}
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30">
                            <h2 className="text-xl font-bold text-slate-900 mb-6">Files</h2>

                            {/* File Sub Tabs */}
                            <div className="flex gap-2 p-1 bg-slate-100/50 rounded-2xl w-fit">
                                {['Permanent Files', 'Service Files', 'Form Files'].map(subTab => (
                                    <button
                                        key={subTab}
                                        onClick={() => setActiveFileSubTab(subTab)}
                                        className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeFileSubTab === subTab
                                            ? 'bg-yellow-400 text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                                            }`}
                                    >
                                        {subTab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* File Sections */}
                        <div className="p-8 space-y-8">
                            {activeFileSubTab === 'Permanent Files' ? (
                                <>
                                    <FileSection title="Collectables" files={[]} />
                                    <FileSection title="Task Related" files={[]} />
                                    <FileSection title="Deliverables" files={[]} />
                                </>
                            ) : (
                                <div className="py-20 text-center">
                                    <FolderOpen className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                    <p className="text-slate-400 font-medium tracking-tight">No {activeFileSubTab.toLowerCase()} found for this order.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'Tasks' ? (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in duration-500 min-h-[500px] overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30">
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Process Tasks</h2>
                            <p className="text-xs text-slate-500 font-medium">Track the completion status of various service steps</p>
                        </div>
                        <div className="p-8">
                            <div className="space-y-4">
                                {(order.ServiceDetails || []).map((service, sIdx) => (
                                    <div key={sIdx} className="border border-slate-100 rounded-2xl p-6 bg-slate-50/20">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-slate-800">{service.ServiceName}</h3>
                                            <span className="text-[10px] bg-[#4b49ac]/10 text-[#4b49ac] px-3 py-1 rounded-full font-black uppercase">{toCustomerServiceStatus(service.ServiceStatus)}</span>
                                        </div>
                                        <div className="space-y-3">
                                            {/* Static tasks for now until dynamic task data is available */}
                                            <TaskItem title="Customer Onboarding" status="Completed" date="12 Oct 2023" />
                                            <TaskItem title="Document Collection" status="Completed" date="14 Oct 2023" />
                                            <TaskItem title="Initial Verification" status="In Progress" />
                                            <TaskItem title="Final Submission" status="Pending" />
                                        </div>
                                    </div>
                                ))}
                                {(!order.ServiceDetails || order.ServiceDetails.length === 0) && (
                                    <div className="py-20 text-center text-slate-400">
                                        No active tasks found for this order.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'Notes' ? (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in duration-500 min-h-[500px]">
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-1">Order Notes</h2>
                                <p className="text-xs text-slate-500 font-medium">Internal communications and status updates</p>
                            </div>
                            <button className="bg-[#4b49ac] text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-[#3f3e91] transition-all shadow-sm">
                                ADD NOTE
                            </button>
                        </div>
                        <div className="p-8">
                            <div className="space-y-6">
                                <div className="py-20 text-center text-slate-400">
                                    <FileText className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                    No notes documented yet.
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-16 text-center animate-in fade-in duration-500">
                        <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 mb-1">{activeTab} Section</h3>
                        <p className="text-slate-400 text-sm font-medium">Real-time data for this section is being aggregated.</p>
                    </div>
                )}
            </div>

            {/* Receipt Modal */}
            {
                modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            {/* Header */}
                            <div className="bg-[#fbbf24] p-6 flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-white uppercase tracking-wide">Payment Receipts</h2>
                                    <p className="text-white/90 text-sm mt-1">Official Transaction Record</p>
                                </div>
                                <button
                                    onClick={() => setModalOpen(false)}
                                    className="text-white/80 hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 max-h-[70vh] overflow-y-auto">
                                {detailLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-[#fbbf24]" />
                                        <p className="mt-2 text-slate-500">Loading details...</p>
                                    </div>
                                ) : selectedReceipt ? (
                                    <div className="space-y-6">
                                        <div className="text-sm text-slate-500">
                                            Receipt ID: {selectedReceipt.PaymentID}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg">
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Transaction ID</p>
                                                <div className="bg-white border border-slate-200 rounded px-3 py-2 text-sm font-medium text-slate-700">
                                                    {selectedReceipt.TransactionID || "N/A"}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Transaction Date</p>
                                                <div className="font-bold text-lg text-slate-800">
                                                    {selectedReceipt.TransactionDate
                                                        ? format(new Date(selectedReceipt.TransactionDate), "M/d/yyyy")
                                                        : (selectedReceipt.PaymentDate ? format(new Date(selectedReceipt.PaymentDate), "M/d/yyyy") : "N/A")}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Payment Status</p>
                                                <div className="font-bold text-lg text-slate-900 capitalize">
                                                    {selectedReceipt.PaymentStatus}
                                                </div>
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Remarks</p>
                                                <div className="bg-white border border-slate-200 rounded px-3 py-2 text-sm text-slate-600">
                                                    {selectedReceipt.Remarks || "No remarks"}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Service Breakdown */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-1 h-4 bg-[#d97706] rounded-full"></div>
                                                <h3 className="text-sm font-bold text-slate-700">Service Breakdown</h3>
                                            </div>

                                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="bg-slate-50 border-b border-slate-200">
                                                        <tr>
                                                            <th className="px-4 py-3 font-semibold text-slate-500 uppercase">Service</th>
                                                            <th className="px-4 py-3 font-semibold text-slate-500 uppercase text-right">Vendor Fee</th>
                                                            <th className="px-4 py-3 font-semibold text-slate-500 uppercase text-right">Professional Fee</th>
                                                            <th className="px-4 py-3 font-semibold text-slate-500 uppercase text-right">Contractor Fee</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {selectedReceipt.services && selectedReceipt.services.length > 0 ? (
                                                            selectedReceipt.services.map((svc, idx) => (
                                                                <tr key={idx}>
                                                                    <td className="px-4 py-3 text-slate-700 font-medium">
                                                                        {svc.ServiceName || `Service ID: ${svc.ServiceID}`}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-slate-600">₹{parseFloat(svc.VendorFee || 0).toFixed(2)}</td>
                                                                    <td className="px-4 py-3 text-right text-slate-600">₹{parseFloat(svc.ProfessionalFee || 0).toFixed(2)}</td>
                                                                    <td className="px-4 py-3 text-right text-slate-600">₹{parseFloat(svc.ContractorFee || 0).toFixed(2)}</td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td className="px-4 py-3 text-slate-700 font-medium">Service Details</td>
                                                                <td className="px-4 py-3 text-right text-slate-600">₹{parseFloat(selectedReceipt.VendorFee || 0).toFixed(2)}</td>
                                                                <td className="px-4 py-3 text-right text-slate-600">₹{parseFloat(selectedReceipt.ProfessionalFee || selectedReceipt.ProfFee || 0).toFixed(2)}</td>
                                                                <td className="px-4 py-3 text-right text-slate-600">₹{parseFloat(selectedReceipt.ContractorFee || 0).toFixed(2)}</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-center text-slate-500">No details available</p>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                                <button
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => downloadPDF()}
                                    className="px-4 py-2 bg-[#fbbf24] hover:bg-[#f59e0b] text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Download PDF
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
};

const InfoCard = ({ icon, title, children }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2.5">
            <span className="text-[#4b49ac]">{icon}</span>
            <h3 className="text-[11px] font-black text-slate-800 tracking-tight uppercase tracking-widest">{title}</h3>
        </div>
        <div className="p-7 flex-1">
            {children}
        </div>
    </div>
);

const DataItem = ({ label, value, isLink, isBold }) => (
    <div className="space-y-1">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className={`text-[12px] ${isBold ? 'font-bold' : 'font-medium'} ${isLink ? 'text-blue-500 cursor-pointer hover:underline' : 'text-slate-600'}`}>
            {value}
        </p>
    </div>
);

const PriceItem = ({ label, value, isTotal }) => (
    <div className="space-y-1">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className={`text-[12px] font-bold ${isTotal ? 'text-emerald-600 text-[14px]' : 'text-slate-700'}`}>
            ₹{Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </p>
    </div>
);

const FileSection = ({ title, files = [] }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-white border-b border-slate-50">
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        </div>
        <div className="p-6">
            {files.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* File items would go here */}
                </div>
            ) : (
                <div className="py-4">
                    <p className="text-xs text-slate-400 font-medium">No files</p>
                </div>
            )}
        </div>
    </div>
);

const TaskItem = ({ title, status, date }) => (
    <div className="flex items-center justify-between py-3 px-4 bg-white border border-slate-50 rounded-xl">
        <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${status === 'Completed' ? 'bg-emerald-500' :
                status === 'In Progress' ? 'bg-blue-500' : 'bg-slate-200'
                }`}></div>
            <span className="text-[12px] font-bold text-slate-700">{title}</span>
        </div>
        <div className="flex items-center gap-4">
            {date && <span className="text-[10px] text-slate-400 font-medium">{date}</span>}
            <span className={`text-[9px] font-black uppercase tracking-tighter ${status === 'Completed' ? 'text-emerald-500' :
                status === 'In Progress' ? 'text-blue-500' : 'text-slate-400'
                }`}>{status}</span>
        </div>
    </div>
);

export default OrderDetailView;

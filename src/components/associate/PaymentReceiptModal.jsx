import { useEffect, useState } from 'react';
import { X, Phone, Mail, Loader2, Download } from 'lucide-react';
import { fetchReceiptByPayment } from '../../api/AssociateApi';
import bizpoleLogo from '../../assets/images/bizpole-logo.png';
import { generateReceiptPdf, receiptDetailRows, receiptSellerLines, receiptBillTo } from '../../utils/receiptPdf';

// Same layout as the admin's PaymentReceiptModal (Bizpole-One-Client/src/components/PaymentReceiptModal.tsx)
const PaymentReceiptModal = ({ paymentId, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetchReceiptByPayment(paymentId)
            .then((d) => { if (!cancelled) setData(d); })
            .catch((e) => { if (!cancelled) setError(e.response?.data?.message || e.message || 'Failed to load receipt.'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [paymentId]);

    const handleDownload = async () => {
        if (!data) return;
        setDownloading(true);
        try {
            await generateReceiptPdf(data);
        } catch (err) {
            console.error('Receipt PDF error', err);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    const seller = data ? receiptSellerLines(data) : null;
    const bill = data ? receiptBillTo(data) : null;

    return (
        <div className="fixed inset-0 z-[9999] flex justify-center p-4 bg-black/50 overflow-y-auto" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative my-auto overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <button
                    className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1.5 transition-colors"
                    onClick={onClose}
                    aria-label="Close"
                >
                    <X size={20} />
                </button>

                {loading && (
                    <div className="p-16 flex flex-col items-center gap-3 text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
                        <span className="text-sm">Loading receipt...</span>
                    </div>
                )}
                {error && <div className="p-16 text-center text-red-500">{error}</div>}

                {!loading && !error && data && (
                    <>
                        <div className="p-8 md:p-12 bg-white">
                            {/* Header: Receipt title + Logo */}
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h1 className="text-4xl font-extrabold text-[#0B1936] tracking-tight">Receipt</h1>
                                    <p className="text-sm font-bold text-[#F5A524] mt-1">
                                        {data.DisplayName || data.FranchiseeName || 'Bizpole Business Acumen Pvt Ltd'}
                                    </p>
                                </div>
                                <img src={bizpoleLogo} alt="Bizpole" className="h-12 object-contain shrink-0" />
                            </div>

                            {/* Seller (left) + Bill To (right) */}
                            <div className="flex justify-between items-start gap-6">
                                <div className="text-xs text-gray-600 space-y-0.5 max-w-[300px] break-words">
                                    {seller.title && <p className="font-bold text-gray-900 text-sm">{seller.title}</p>}
                                    {seller.address && <p>{seller.address}</p>}
                                    {seller.phone && <p className="flex items-center gap-1"><Phone size={12} className="text-black" /> {seller.phone}</p>}
                                    {seller.email && <p className="flex items-center gap-1"><Mail size={12} /> {seller.email}</p>}
                                    {seller.gst && <p className="font-bold text-gray-900 mt-1">{seller.gst}</p>}
                                </div>

                                <div className="text-right text-xs text-gray-600 space-y-0.5 max-w-[300px] break-words">
                                    <p className="font-bold text-gray-900 text-sm">Bill to:</p>
                                    <p className="font-bold text-blue-600 text-sm">{bill.name}</p>
                                    {bill.lines.map((line) => <p key={line}>{line}</p>)}
                                    {bill.phone && <p className="flex items-center justify-end gap-1"><Phone size={12} className="text-red-500" /> {bill.phone}</p>}
                                    {bill.email && <p className="flex items-center justify-end gap-1"><Mail size={12} className="text-violet-600" /> {bill.email}</p>}
                                    {bill.placeOfSupply && <p className="mt-1">{bill.placeOfSupply}</p>}
                                </div>
                            </div>

                            {/* Payment Details box */}
                            <div className="mt-8 border border-gray-200 rounded-xl overflow-hidden">
                                <div className="py-3 border-b border-gray-200 text-center bg-[#F8FAFC] flex items-center justify-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5A524" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                    <h2 className="font-bold text-slate-700 tracking-widest text-xs uppercase">PAYMENT DETAILS</h2>
                                </div>
                                <div className="divide-y divide-gray-100 bg-white">
                                    {receiptDetailRows(data).map(([label, value]) => (
                                        <div key={label} className="flex justify-between items-center px-6 py-3">
                                            <span className="text-gray-500 text-sm font-medium">{label}</span>
                                            <span className="font-bold text-[#0B1936] text-sm">{value}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center px-6 py-4 bg-[#F8FDF9] border-t border-gray-200">
                                    <span className="font-bold text-[#0B1936] text-sm">Payment Amount</span>
                                    <span className="font-extrabold text-[#15803D] text-lg">{Number(data.TotalAmount || 0).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="text-center mt-12 mb-2">
                                <p className="text-3xl font-extrabold tracking-[0.2em] text-[#0B1936]">THANK YOU!</p>
                            </div>
                        </div>

                        <div className="bg-[#F8FAFC] px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                            <button
                                className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-semibold text-sm"
                                onClick={onClose}
                            >
                                Close
                            </button>
                            <button
                                className="px-6 py-2 bg-[#F5C324] text-slate-900 rounded-xl hover:bg-yellow-500 transition-colors font-bold text-sm shadow-sm flex items-center gap-2 disabled:opacity-60"
                                onClick={handleDownload}
                                disabled={downloading}
                            >
                                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                Download
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PaymentReceiptModal;

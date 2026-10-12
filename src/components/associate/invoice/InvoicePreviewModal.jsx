import { useRef } from "react";
import { FaTimes, FaPrint, FaDownload } from "react-icons/fa";
import Invoice from "./Invoice";

/**
 * Full-screen invoice preview — port of the admin's
 * Bizpole-One-Client/src/Layouts/SuperAdmin/pages/Orders/components/tab/InvoicePreviewModal.tsx.
 * Keep in sync with it.
 *
 * Props:
 *   invoice         — the invoice to show; null/undefined closes the viewer.
 *   servicePayments — service lines for the document body.
 *   franchisee      — supplier details; falls back to the invoice's own.
 *   onClose
 *
 * Callers that need to download WITHOUT opening the viewer should render
 * <Invoice> off-screen themselves and call download() on it.
 */
const InvoicePreviewModal = ({
    invoice,
    servicePayments = [],
    franchisee,
    onClose,
}) => {
    const invoiceRef = useRef(null);

    if (!invoice) return null;

    return (
        // bg-black/70: Tailwind v4 equivalent of admin's (v3) `bg-black bg-opacity-70`.
        <div className="fixed inset-0 bg-black/70 flex flex-col z-[9999]">
            {/* Top action bar */}
            <div className="flex items-center justify-between px-6 py-3 bg-gray-800 text-white shrink-0">
                <span className="text-sm font-semibold tracking-wide">
                    Invoice Preview
                    {invoice?.InvoiceCode ? ` — ${invoice.InvoiceCode}` : ""}
                </span>
                <div className="flex items-center gap-3">
                    <button
                        className="flex items-center gap-2 px-4 py-1.5 bg-white text-gray-800 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
                        // Print opens the print dialog on the invoice alone
                        onClick={() => invoiceRef.current?.print()}
                    >
                        <FaPrint size={13} /> Print
                    </button>
                    <button
                        className="flex items-center gap-2 px-4 py-1.5 bg-yellow-400 text-gray-900 rounded text-sm font-medium hover:bg-yellow-300 transition-colors"
                        onClick={() => invoiceRef.current?.download()}
                    >
                        <FaDownload size={13} /> Save as PDF
                    </button>
                    <button
                        className="ml-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full p-1.5 transition-colors"
                        onClick={onClose}
                        aria-label="Close invoice preview"
                    >
                        <FaTimes size={16} />
                    </button>
                </div>
            </div>

            {/* Scrollable gray canvas area */}
            <div className="flex-1 overflow-y-auto bg-gray-600 py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <Invoice
                        ref={invoiceRef}
                        selectedInvoice={invoice}
                        servicePayments={servicePayments}
                        franchisee={franchisee ?? invoice?.franchisee ?? null}
                    />
                </div>
            </div>
        </div>
    );
};

export default InvoicePreviewModal;

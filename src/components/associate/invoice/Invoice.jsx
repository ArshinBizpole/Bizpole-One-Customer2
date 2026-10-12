/**
 * Invoice document — PORT of the admin component
 * Bizpole-One-Client/src/Layouts/SuperAdmin/pages/Orders/components/tab/Invoice.tsx.
 * It must stay in sync with that file so an associate's invoice looks exactly
 * like the admin's: same structure, inline styles, colours, fields and
 * fallbacks. Only deviations: TypeScript types removed, and the supplier
 * (franchisee) comes from the `franchisee` prop or the invoice's own
 * `franchisee` object (/getinvoiceforservice) instead of being fetched via
 * localStorage.selectedFranchiseeId, which the associate app does not have.
 */
import {
    useRef, useEffect, useState, useCallback,
    forwardRef, useImperativeHandle,
} from "react";
import { buildInvoicePrintDocument, invoiceFileTitle } from "../../../utils/invoicePrintDocument";
import { saveHtmlAsPdf } from "../../../utils/htmlToPdf";
import bizpoleLogo from "../../../assets/images/bizpole-logo.png";
import { resolveGstSplit } from "../../../utils/gstSplit";

/**
 * Party names, addresses and service descriptions are printed in capitals.
 * Applied as a CSS transform rather than uppercasing the data. Deliberately
 * NOT applied to emails, websites or phone numbers.
 */
const UPPER = { textTransform: "uppercase" };

const INVOICE_WIDTH = 794;   // A4 at 96 dpi
const INVOICE_MIN_H = 1123;  // A4 height at 96 dpi

const Invoice = forwardRef(
    ({ selectedInvoice, servicePayments = [], franchisee: franchiseeProp }, ref) => {
        const wrapperRef = useRef(null);
        const invoiceRef = useRef(null);
        const [scale, setScale] = useState(1);
        const [containerH, setContainerH] = useState(INVOICE_MIN_H);

        /* ── Normalise data ── */
        let services = [];
        let inv = {};
        if (Array.isArray(selectedInvoice)) {
            services = selectedInvoice.map(i => i.serviceDetail ?? i);
            inv = selectedInvoice[0] ?? {};
        } else if (servicePayments.length > 0) {
            services = servicePayments.map(s => s.serviceDetail ?? s);
            inv = selectedInvoice ?? {};
        } else if (selectedInvoice?.serviceDetail) {
            services = [selectedInvoice.serviceDetail];
            inv = selectedInvoice;
        } else {
            inv = selectedInvoice ?? {};
        }

        /* Legacy rows predate the status column and carry NULL/blank — those are
           active, matching how the server normalises the same value. */
        const isCancelled = String(inv?.InvoiceStatus || "").trim().toLowerCase() === "cancelled";

        /* ── Franchisee (supplier) ──
           Admin fetches it by localStorage.selectedFranchiseeId when no prop is
           passed; the associate app has no such id, so fall back to the
           invoice's own `franchisee` (snapshot seller, else live franchisee). */
        const franchiseeDetails = franchiseeProp ?? inv?.franchisee ?? null;

        /* ── Scale to fit wrapper ── */
        const recompute = useCallback(() => {
            if (!wrapperRef.current || !invoiceRef.current) return;
            const available = wrapperRef.current.clientWidth;
            const s = Math.min(1, available / INVOICE_WIDTH);
            setScale(s);
            const naturalH = Math.max(invoiceRef.current.scrollHeight, INVOICE_MIN_H);
            setContainerH(naturalH * s);
        }, []);

        useEffect(() => { const t = setTimeout(recompute, 100); return () => clearTimeout(t); },
            [recompute, franchiseeDetails, services.length]);
        useEffect(() => {
            window.addEventListener("resize", recompute);
            return () => window.removeEventListener("resize", recompute);
        }, [recompute]);

        const fmt = (v) => v != null && v !== '' ? `₹${Number(v).toFixed(2)}` : null;

        // Group address into 3 logical lines to keep the layout stable in PDF
        const clean = (v) => (v && v !== "null" && v !== "undefined") ? String(v).trim() : "";
        const addrLines = [
            [franchiseeDetails?.AddressLine1].filter(clean).map(clean).join(""),
            [franchiseeDetails?.AddressLine2].filter(clean).map(clean).join(""),
            [franchiseeDetails?.City, franchiseeDetails?.State, franchiseeDetails?.Pincode].filter(clean).map(clean).join(", "),
        ].filter(Boolean);

        /**
         * The recipient's state — the place of supply, and the value the CGST+SGST
         * vs IGST decision turns on. The company's state wins over the contact's.
         */
        const recipientState = clean(inv?.company?.CompanyState) || clean(inv?.customer?.CustomerState);

        /**
         * Always zero — and that is correct, not a placeholder. An invoice is only
         * ever issued once its service line is FULLY paid, so nothing can be
         * outstanding against it. Do NOT derive this from `inv.payments` (that is
         * the QUOTE's payment history across every service).
         */
        const dueAmount = 0;

        const fmtDate = (d) => {
            // Guard falsy values BEFORE constructing: new Date(null) and new Date(0)
            // are both valid dates that render as 01/01/1970.
            if (d === null || d === undefined || d === "" || d === 0) return "—";
            try {
                const x = new Date(d);
                if (isNaN(x.getTime())) return "—";
                // Anything at or before the epoch is a missing value, not a real date.
                if (x.getFullYear() <= 1970) return "—";
                return x.toLocaleDateString("en-GB");
            } catch { return "—"; }
        };

        /* ── Print / save as PDF (exposed via ref) ──
         *
         * The invoice is handed to the BROWSER'S OWN print engine rather than
         * rasterised. The document is copied into a hidden same-origin iframe so
         * only the invoice is printed, never the surrounding app.
         *
         * NOTE: this opens the print dialog, where the user picks "Save as PDF".
         * There is no silent file download.
         */
        const print = useCallback(async () => {
            if (!invoiceRef.current) return;

            // This is the saved file's name: the print dialog offers the document
            // title as the filename. Sanitised because invoice codes carry a slash.
            const fileTitle = invoiceFileTitle(inv?.InvoiceCode);

            const iframe = document.createElement("iframe");
            // Off-screen rather than display:none — a display:none iframe does not
            // lay out, so it has nothing to print.
            iframe.setAttribute("aria-hidden", "true");
            iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";

            // srcdoc rather than document.write: same-origin, inherits this page's
            // base URL so the bundled logo still resolves.
            iframe.srcdoc = buildInvoicePrintDocument({
                bodyHtml: invoiceRef.current.outerHTML,
                baseHref: document.baseURI,
                title: fileTitle,
            });

            // Resolve once the iframe has loaded, or after a timeout.
            await new Promise((resolve) => {
                let settled = false;
                const done = () => {
                    if (settled) return;
                    settled = true;
                    resolve();
                };
                iframe.addEventListener("load", () => setTimeout(done, 200), { once: true });
                setTimeout(done, 2000);
                document.body.appendChild(iframe);
            });

            // Chrome does not consistently take the filename from the IFRAME's
            // title — swap the top-level title for the duration of the dialog.
            const previousTitle = document.title;
            document.title = fileTitle;

            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } finally {
                // Removing it immediately cancels the dialog in some browsers, so the
                // cleanup waits for afterprint, with a timeout fallback.
                const cleanup = () => {
                    document.title = previousTitle;
                    iframe.remove();
                };
                iframe.contentWindow?.addEventListener("afterprint", cleanup, { once: true });
                setTimeout(cleanup, 60000);
            }
        }, [inv?.InvoiceCode]);

        /* ── Download: saves the PDF file directly (no print dialog) ── */
        const download = useCallback(async () => {
            if (!invoiceRef.current) return;
            await saveHtmlAsPdf({
                html: buildInvoicePrintDocument({
                    bodyHtml: invoiceRef.current.outerHTML,
                    baseHref: document.baseURI,
                    title: invoiceFileTitle(inv?.InvoiceCode),
                }),
                selector: "#invoice-print-root",
                fileName: invoiceFileTitle(inv?.InvoiceCode),
                marginPt: 0, // the invoice carries its own 44px side padding
                widthPx: 900,
                breakSelector: "tr",
            });
        }, [inv?.InvoiceCode]);

        useImperativeHandle(ref, () => ({ download, print }), [download, print]);

        /* ── Inline style helper ── */
        const td = (x) => ({ padding: "9px 14px", fontSize: 12, color: "#1F2937", ...x });

        /* ── Render ── */
        return (
            <div ref={wrapperRef} className="w-full">
                {/* Outer box holds the correct visual height so parent layout is correct */}
                <div style={{ position: "relative", width: "100%", height: containerH }}>
                    {/* This div is always 794 px wide and CSS-scaled down */}
                    <div
                        ref={invoiceRef}
                        style={{
                            position: "absolute", top: 0, left: 0,
                            width: INVOICE_WIDTH, minHeight: INVOICE_MIN_H,
                            transformOrigin: "top left",
                            transform: `scale(${scale})`,
                            background: "#fff",
                            fontFamily: "Helvetica, Arial, sans-serif",
                        }}
                    >
                        {/* ── CANCELLED WATERMARK ──
                            A real DOM element (not a pseudo-element) so it is carried
                            over by outerHTML into the print document too. */}
                        {isCancelled && (
                            <div
                                style={{
                                    position: "absolute", inset: 0, zIndex: 10,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    pointerEvents: "none",
                                }}
                            >
                                <div
                                    style={{
                                        transform: "rotate(-30deg)",
                                        border: "10px solid rgba(220, 38, 38, 0.28)",
                                        borderRadius: 16,
                                        padding: "18px 56px",
                                        fontSize: 84,
                                        fontWeight: 900,
                                        letterSpacing: 8,
                                        color: "rgba(220, 38, 38, 0.28)",
                                        fontFamily: "Helvetica, Arial, sans-serif",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    CANCELLED
                                </div>
                            </div>
                        )}

                        {/* ── HEADER ── */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "30px 44px 22px", borderBottom: "2px solid #F5C442" }}>
                            <h1 style={{ fontSize: 54, fontWeight: 900, color: "#F5C442", margin: 0, lineHeight: 1 }}>INVOICE</h1>
                            <img src={bizpoleLogo} alt="Bizpole" style={{ height: 52, objectFit: "contain" }} />
                        </div>

                        {/* The reason is part of the document, not just the list. */}
                        {isCancelled && (
                            <div style={{ padding: "10px 44px", background: "#FEF2F2", borderBottom: "1px solid #FECACA", fontSize: 12, color: "#991B1B" }}>
                                <strong>This invoice has been cancelled.</strong>
                                {inv?.CancellationReason ? ` Reason: ${inv.CancellationReason}` : ""}
                            </div>
                        )}

                        {/* ── FROM / BILL TO ── */}
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "22px 44px", borderBottom: "1px solid #E5E7EB", gap: 32 }}>
                            <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.7, textAlign: "left", flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                                <p style={{ fontWeight: 700, fontSize: 10, color: "#9CA3AF", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.08em" }}>From:</p>
                                <p style={{ ...UPPER, fontWeight: 800, fontSize: 16, margin: "0 0 2px", color: "#111827" }}>{franchiseeDetails?.DisplayName || franchiseeDetails?.FranchiseeName || "—"}</p>
                                {addrLines.map((line, i) => <p key={i} style={{ ...UPPER, margin: 0 }}>{line}</p>)}
                                {franchiseeDetails?.Phone && <p style={{ margin: 0 }}>{franchiseeDetails.Phone}</p>}
                                {franchiseeDetails?.Email && <p style={{ margin: 0 }}>{franchiseeDetails.Email}</p>}
                                {franchiseeDetails?.Website && <p style={{ margin: 0 }}>{franchiseeDetails.Website}</p>}
                                {(franchiseeDetails?.CIN || franchiseeDetails?.PAN || franchiseeDetails?.GSTNumber) && (
                                    // inline-block so the box hugs its contents.
                                    <div style={{ display: "inline-block", marginTop: 10, background: "#FEFCE8", border: "1px solid #FDE68A", borderRadius: 4, padding: "7px 12px", fontSize: 11 }}>
                                        {franchiseeDetails?.CIN && <p style={{ margin: 0 }}><strong>CIN:</strong> {franchiseeDetails.CIN}</p>}
                                        {franchiseeDetails?.PAN && <p style={{ margin: 0 }}><strong>PAN:</strong> {franchiseeDetails.PAN}</p>}
                                        {franchiseeDetails?.GSTNumber && <p style={{ margin: 0 }}><strong>GST:</strong> {franchiseeDetails.GSTNumber}</p>}
                                    </div>
                                )}
                            </div>

                            <div style={{ textAlign: "right", fontSize: 12, color: "#374151", lineHeight: 1.7, flexShrink: 0, maxWidth: 240, wordBreak: "break-word" }}>
                                <p style={{ fontWeight: 700, fontSize: 10, color: "#9CA3AF", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Bill to:</p>
                                <p style={{ ...UPPER, fontWeight: 800, fontSize: 16, margin: "0 0 2px", color: "#111827" }}>{inv?.company?.BusinessName || inv?.CustomerName || "—"}</p>
                                {inv?.customer && (
                                    <p style={{ ...UPPER, margin: 0, color: "#374151", fontWeight: 600 }}>
                                        {[inv.customer.FirstName, inv.customer.LastName].filter(Boolean).join(" ") || "—"}
                                    </p>
                                )}
                                {(inv?.company?.CompanyState || inv?.customer?.CustomerState) && (
                                    <p style={{ ...UPPER, margin: 0, color: "#6B7280" }}>{inv.company?.CompanyState || inv.customer?.CustomerState}</p>
                                )}
                                {(inv?.company?.CompanyMobile || inv?.customer?.Mobile) && (
                                    <p style={{ margin: 0 }}>{inv.company?.CompanyMobile || inv.customer?.Mobile}</p>
                                )}
                                {(inv?.company?.CompanyEmail || inv?.customer?.Email) && (
                                    <p style={{ margin: 0 }}>{inv.company?.CompanyEmail || inv.customer?.Email}</p>
                                )}
                                {/* Buyer's GSTIN — only when the customer's company has one. */}
                                {clean(inv?.company?.GSTNumber) && (
                                    <p style={{ margin: "6px 0 0", fontSize: 11, color: "#374151" }}>
                                        <strong>GSTIN:</strong> {clean(inv.company.GSTNumber)}
                                    </p>
                                )}
                                {clean(inv?.company?.CompanyPAN) && (
                                    <p style={{ margin: 0, fontSize: 11, color: "#374151" }}>
                                        <strong>PAN:</strong> {clean(inv.company.CompanyPAN)}
                                    </p>
                                )}
                                {/* Place of supply is the RECIPIENT's location, not the supplier's. */}
                                <p style={{ margin: "6px 0 0", color: "#9CA3AF", fontSize: 11 }}>
                                    Place of Supply: <span style={UPPER}>{recipientState || "—"}</span>
                                </p>
                            </div>
                        </div>

                        {/* ── INVOICE META ── */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", margin: "18px 44px", overflow: "hidden", background: "#FEFCE8" }}>
                            {[
                                { label: "Invoice Number", value: inv?.InvoiceCode || "—" },
                                { label: "Invoice Date", value: fmtDate(inv?.InvoiceDate) },
                                { label: "P.O. / S.O. No.", value: inv?.QuoteCodeId || inv?.QuoteCode || inv?.OrderCode || inv?.OrderID || "—" },
                                { label: "P.O. / S.O. Date", value: fmtDate(inv?.OrderDate) },
                                { label: "Invoice Total", value: inv?.InvoiceValue != null ? `₹${Number(inv.InvoiceValue).toFixed(2)}` : "—" },
                                // Always ₹0.00 — see the dueAmount note above.
                                { label: "Due Amount", value: `₹${dueAmount.toFixed(2)}` },
                            ].map(({ label, value }, i) => (
                                <div key={i} style={{ padding: "10px 14px", borderLeft: i === 0 ? "none" : "1px solid #FDE68A", minWidth: 0 }}>
                                    <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</p>
                                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#1F2937", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</p>
                                </div>
                            ))}
                        </div>

                        {/* ── SERVICES TABLE ── */}
                        {(() => {
                            const hasGst = services.some(s => s.GstAmount != null && Number(s.GstAmount) !== 0);
                            const colCount = hasGst ? 6 : 5;
                            // The per-line tax column is named for the head actually being charged.
                            const lineTaxLabel =
                                resolveGstSplit({
                                    supplierState: franchiseeDetails?.State,
                                    recipientState,
                                    supplierGstin: franchiseeDetails?.GSTNumber,
                                    recipientGstin: inv?.company?.GSTNumber,
                                    gstAmount: 1, // presence only — we want the mode, not an amount
                                }).mode === "inter"
                                    ? "IGST"
                                    : "CGST + SGST";
                            const headers = ["Service", "Rate", "Discount", ...(hasGst ? [lineTaxLabel] : []), "Govt. Fee", "Service Total"];
                            // Money columns are right-aligned; only the Service name stays left.
                            const alignFor = (i) => (i === 0 ? "left" : "right");
                            return (
                                <div style={{ margin: "0 44px" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, border: "1px solid #E5E7EB", borderRadius: 6, overflow: "hidden" }}>
                                        <thead>
                                            <tr style={{ background: "#FCD34D" }}>
                                                {headers.map((h, i) => (
                                                    <th key={i} style={{ padding: "10px 14px", textAlign: alignFor(i), fontWeight: 700, fontSize: 11, color: "#1F2937", borderBottom: "2px solid #F59E0B", whiteSpace: "nowrap" }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {services.length > 0 ? services.map((s, i) => (
                                                <tr key={s.ServiceDetailID || i} style={{ background: i % 2 === 0 ? "#fff" : "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                                                    <td style={td()}>
                                                        <div style={{ ...UPPER, fontWeight: 600 }}>{s.ItemName || "—"}</div>
                                                        <div style={{ fontSize: 10, color: "#9CA3AF" }}>HSN/SAC: {s.ServiceID || s.HSN || "—"}</div>
                                                    </td>
                                                    <td style={td({ textAlign: "right" })}>{fmt(s.ServiceRate ?? s.ProfessionalFee) ?? "—"}</td>
                                                    <td style={td({ textAlign: "right" })}>{fmt(s.Discount) ?? "—"}</td>
                                                    {hasGst && <td style={td({ textAlign: "right" })}>{fmt(s.GstAmount) ?? "—"}</td>}
                                                    <td style={td({ textAlign: "right" })}>{fmt(s.GovtFee ?? s.Govtfee) ?? "—"}</td>
                                                    <td style={td({ fontWeight: 700, textAlign: "right" })}>{fmt(s.Total) ?? "—"}</td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan={colCount} style={{ padding: 24, textAlign: "center", color: "#9CA3AF" }}>No service details found.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}

                        {/* ── TOTALS + PAYMENTS ── */}
                        {(() => {
                            const s0 = services[0] ?? {};
                            // Sum across every line rather than reading services[0].
                            const sumOf = (key) =>
                                services.reduce((acc, s) => acc + (Number(s?.[key]) || 0), 0);

                            const subTotal = services.length ? sumOf("SubTotal") : (inv?.SubTotal ?? null);
                            const rounding = s0.Rounding ?? inv?.Rounding ?? null;
                            const invoiceVal = inv?.InvoiceValue ?? null;

                            // The rate is only shown when every line carries the same one.
                            const rates = Array.from(
                                new Set(services.map((s) => Number(s?.GSTPercent)).filter((n) => Number.isFinite(n) && n !== 0)),
                            );
                            const uniformRate = rates.length === 1 ? rates[0] : null;

                            const gst = resolveGstSplit({
                                supplierState: franchiseeDetails?.State,
                                recipientState: recipientState,
                                supplierGstin: franchiseeDetails?.GSTNumber,
                                recipientGstin: inv?.company?.GSTNumber,
                                gstAmount: services.length ? sumOf("GstAmount") : (inv?.GstAmount ?? null),
                                gstPercent: uniformRate,
                            });

                            const taxRow = (label, val) => (
                                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #E5E7EB", fontSize: 12, color: "#374151" }}>
                                    <span>{label}</span>
                                    <span>{fmt(val)}</span>
                                </div>
                            );

                            return (
                                // paddingRight matches the services table's cell padding so the
                                // figures land on the same right edge as the Service Total column.
                                <div style={{ display: "flex", justifyContent: "flex-end", margin: "22px 44px 0" }}>
                                    <div style={{ width: 340, paddingRight: 14 }}>
                                        {/* Sub Total */}
                                        {subTotal != null && Number(subTotal) !== 0 && (
                                            <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #E5E7EB", fontSize: 13 }}>
                                                <span style={{ fontWeight: 600, color: "#374151" }}>Sub Total</span>
                                                <span>{fmt(subTotal)}</span>
                                            </div>
                                        )}

                                        {/* Tax heads — CGST+SGST intra-state, IGST inter-state, never both. */}
                                        {gst.lines.map((line) => taxRow(line.label, line.amount))}

                                        {/* Rounding — only when it is actually non-zero. */}
                                        {rounding != null && Number(rounding) !== 0 && (
                                            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #E5E7EB", fontSize: 12, color: "#6B7280" }}>
                                                <span>Rounding</span><span>{fmt(rounding)}</span>
                                            </div>
                                        )}
                                        {/* Invoice Total */}
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "2px solid #1F2937", fontWeight: 800, fontSize: 15 }}>
                                            <span>Total Amount</span>
                                            <span>{invoiceVal != null ? `₹${Number(invoiceVal).toFixed(2)}` : "—"}</span>
                                        </div>
                                        {/* Amount paid — equal to the total (invoice only issued once fully paid). */}
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #E5E7EB", fontSize: 12, color: "#15803D" }}>
                                            <span style={{ fontWeight: 600 }}>Amount Paid</span>
                                            <span style={{ fontWeight: 600 }}>{invoiceVal != null ? `₹${Number(invoiceVal).toFixed(2)}` : "—"}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: 12, color: "#374151" }}>
                                            <span style={{ fontWeight: 600 }}>Balance Due</span>
                                            <span style={{ fontWeight: 700 }}>₹{dueAmount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* ── THANK YOU ── */}
                        <div style={{ textAlign: "center", padding: "50px 0 44px" }}>
                            <p style={{ fontSize: 40, fontWeight: 900, color: "#F5C442", margin: 0, letterSpacing: "0.06em" }}>THANK YOU!</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

Invoice.displayName = "Invoice";
export default Invoice;

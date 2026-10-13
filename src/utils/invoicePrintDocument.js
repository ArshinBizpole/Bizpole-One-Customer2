/**
 * Builds the HTML document the invoice print iframe is loaded with.
 *
 * Port of the admin app's utils/invoicePrintDocument.ts (Bizpole-One-Client) —
 * keep the two in sync. Types removed; output is identical.
 *
 * The invoice is handed to the browser's own print engine rather than
 * rasterised: pagination, font rendering and colour are the browser's job, the
 * output is real text, and nothing is ever cropped.
 *
 * Kept free of the DOM; the iframe plumbing lives at the call site.
 */

/** A4 width at 96 dpi, matching the on-screen document. */
export const INVOICE_PRINT_WIDTH_PX = 794;

/** Escape text destined for markup (the title is interpolated into <title>). */
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * The filename the saved PDF gets.
 *
 * The print dialog offers the document's <title> as the filename, so this
 * function IS the naming rule. Invoice codes are shaped `F81/IN006612`, and no
 * operating system allows "/" in a filename. Every character Windows rejects
 * is mapped to "-", runs are collapsed, and trailing dots and spaces are
 * stripped. Falls back to "Invoice" rather than an empty string.
 */
export function invoiceFileTitle(invoiceCode) {
    const cleaned = String(invoiceCode ?? "")
        .trim()
        .replace(/[/\\:*?"<>|]+/g, "-")
        .replace(/-+/g, "-")
        // Leading/trailing separators are an artefact of the replacement above.
        .replace(/^[-\s]+|[-\s.]+$/g, "");

    return cleaned || "Invoice";
}

/**
 * @param {{ bodyHtml: string, baseHref?: string, title?: string }} args
 *   bodyHtml — outerHTML of the invoice node (inline styles travel with it);
 *   baseHref — base URL for relative asset URLs (the bundled logo);
 *   title    — document title, offered by Save-as-PDF as the filename.
 */
export function buildInvoicePrintDocument({
    bodyHtml,
    baseHref,
    title = "Invoice",
}) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
${baseHref ? `<base href="${escapeHtml(baseHref)}">` : ""}
<title>${escapeHtml(title)}</title>
<style>
  /* The document carries its own 44px side padding; a page margin on top of
     that pushed the content off the printable area. */
  @page { size: A4; margin: 0; }

  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    font-family: Helvetica, Arial, sans-serif;
    /* Chrome and Edge drop background colours when printing unless this is
       set — every yellow band on the invoice would otherwise print white. */
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* The node handed to us is the LIVE preview node: absolutely positioned
     inside a wrapper and CSS-scaled to fit the screen. Carried over unchanged
     it prints collapsed or shrunken, so its positioning is undone here rather
     than by mutating the element the user is still looking at. */
  #invoice-print-root > * {
    position: static !important;
    top: auto !important;
    left: auto !important;
    transform: none !important;
    width: ${INVOICE_PRINT_WIDTH_PX}px !important;
    min-height: 0 !important;
    margin: 0 !important;
  }

  #invoice-print-root {
    width: ${INVOICE_PRINT_WIDTH_PX}px;
    margin: 0 auto;
  }

  /* Pagination. The bitmap pipeline cut wherever the page happened to end,
     which is how a table row or the totals block ended up sliced in half. */
  tr, img { break-inside: avoid; page-break-inside: avoid; }
  table { break-inside: auto; }
  thead { display: table-header-group; }
</style>
</head>
<body>
<div id="invoice-print-root">${bodyHtml}</div>
</body>
</html>`;
}

/**
 * Builds the HTML document the quote print iframe is loaded with, and prints it.
 *
 * Admin (Bizpole-One-Client QuoteProposal.tsx handleDownload) rasterises the
 * on-screen QuoteDocument with html2canvas and slices it onto A4 pages with
 * jsPDF. This app does not ship html2canvas, so — like the invoice
 * (utils/invoicePrintDocument.js) — the same markup is handed to the browser's
 * own print engine in a hidden iframe instead, and the user picks
 * "Save as PDF" in the print dialog. Output is real text rather than a bitmap.
 *
 * The page geometry mirrors admin's PDF: A4, 20pt margins, the 210mm-wide
 * document scaled down to the 555.28pt printable width, and page breaks kept
 * off the document's [data-pdf-section] blocks (admin snaps its slices to
 * those same section starts).
 *
 * The document is rendered outside the app's stylesheet (this app is on
 * Tailwind v4, admin on v3, and their defaults differ — e.g. v4's `border-2`
 * is currentColor, v3's is gray-200), so the handful of Tailwind v3 utilities
 * and preflight rules QuoteDocument relies on are reproduced below.
 */

/** A4 width in pt, admin's jsPDF page width. */
const A4_W_PT = 595.28;
/** Admin's jsPDF page margin, in pt. */
const MARGIN_PT = 20;
/** Admin scales the 210mm document to the printable width; so do we. */
const DOCUMENT_ZOOM = (A4_W_PT - 2 * MARGIN_PT) / A4_W_PT;

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * The filename the saved PDF gets (the print dialog offers the document's
 * <title>). Characters no filesystem accepts are mapped to "-". Admin always
 * saves "quotation.pdf"; the quote number is used here so downloads of
 * different quotes do not overwrite each other, with "quotation" as fallback.
 */
export function quoteFileTitle(quoteNumber) {
    const cleaned = String(quoteNumber ?? "")
        .trim()
        .replace(/[/\\:*?"<>|]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^[-\s]+|[-\s.]+$/g, "");

    return cleaned ? `quotation-${cleaned}` : "quotation";
}

/**
 * @param {{ bodyHtml: string, baseHref?: string, title?: string }} args
 *   bodyHtml — outerHTML of the rendered QuoteDocument;
 *   baseHref — base URL for the bundled image URLs;
 *   title    — document title, offered by Save-as-PDF as the filename.
 */
export function buildQuotePrintDocument({ bodyHtml, baseHref, title = "quotation" }) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
${baseHref ? `<base href="${escapeHtml(baseHref)}">` : ""}
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap">
<style>
  @page { size: A4; margin: ${MARGIN_PT}pt; }

  /* Tailwind v3 preflight, as the admin document is rendered under it. */
  *, ::before, ::after {
    box-sizing: border-box;
    border-width: 0;
    border-style: solid;
    border-color: #e5e7eb;
  }
  html {
    line-height: 1.5;
    -webkit-text-size-adjust: 100%;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    /* Admin's body font (src/index.css). */
    font-family: "Poppins", "Inter", Arial, sans-serif;
    /* Keep the yellow bands and header row — browsers drop backgrounds when
       printing unless told otherwise. */
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body { line-height: inherit; }
  h1 { font-size: inherit; font-weight: inherit; margin: 0; }
  table { text-indent: 0; border-color: inherit; border-collapse: collapse; }
  th { font-weight: inherit; }
  img { display: block; vertical-align: middle; max-width: 100%; height: auto; }

  /* Tailwind v3 utilities used by QuoteDocument. */
  .mx-auto { margin-left: auto; margin-right: auto; }
  .bg-white { background-color: #fff; }
  .border-2 { border-width: 2px; }
  .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
  .font-bold { font-weight: 700; }
  .tracking-wider { letter-spacing: 0.05em; }

  #quote-print-root { zoom: ${DOCUMENT_ZOOM.toFixed(5)}; }

  /* Pagination: admin never cuts through a [data-pdf-section]. */
  [data-pdf-section], tr, img { break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; }
</style>
</head>
<body>
<div id="quote-print-root">${bodyHtml}</div>
</body>
</html>`;
}

/**
 * Loads the document into a hidden same-origin iframe and opens the print
 * dialog for it, so only the quote is printed, never the surrounding app.
 * Resolves once print() returns (i.e. the dialog has been dealt with in
 * browsers where print() blocks).
 */
export async function printQuoteDocument({ bodyHtml, title }) {
    const iframe = document.createElement("iframe");
    // Off-screen rather than display:none — a display:none iframe does not lay
    // out, so it has nothing to print.
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    iframe.srcdoc = buildQuotePrintDocument({ bodyHtml, baseHref: document.baseURI, title });

    // Resolve once the iframe (stylesheet and images) has loaded, or after a timeout.
    await new Promise((resolve) => {
        let settled = false;
        const done = () => {
            if (settled) return;
            settled = true;
            resolve();
        };
        iframe.addEventListener("load", () => setTimeout(done, 200), { once: true });
        setTimeout(done, 4000);
        document.body.appendChild(iframe);
    });

    // Web fonts load lazily; wait for Poppins so the PDF is not set in a fallback.
    try {
        const fonts = iframe.contentDocument?.fonts;
        if (fonts?.ready) {
            await Promise.race([fonts.ready, new Promise((r) => setTimeout(r, 3000))]);
        }
    } catch {
        // Font readiness is best effort.
    }

    // Chrome does not consistently take the filename from the IFRAME's title —
    // swap the top-level title for the duration of the dialog.
    const previousTitle = document.title;
    document.title = title;

    try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
    } finally {
        // Removing it immediately cancels the dialog in some browsers, so the
        // cleanup waits for afterprint, with a timeout fallback.
        let cleaned = false;
        const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            document.title = previousTitle;
            iframe.remove();
        };
        iframe.contentWindow?.addEventListener("afterprint", cleanup, { once: true });
        setTimeout(cleanup, 60000);
    }
}

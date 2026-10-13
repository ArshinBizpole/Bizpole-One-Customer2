import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import QuoteDocument from "./QuoteDocument";
import { buildQuoteDocumentProps } from "./quoteDocumentProps";
import { buildQuotePrintDocument, quoteFileTitle } from "../../../utils/quotePrintDocument";
import { saveHtmlAsPdf } from "../../../utils/htmlToPdf";

/**
 * Downloads a quote as the same QUOTATION document admin produces
 * (admin: /quotes/:id/proposal → Download).
 *
 * Renders the ported <QuoteDocument> off-screen from a /getQuoteById payload,
 * takes its markup, and saves it as a PDF file.
 *
 * @param {object} quote — the `data` object returned by GET /getQuoteById/:QuoteID
 */
export async function downloadQuote(quote) {
    const container = document.createElement("div");
    container.setAttribute("aria-hidden", "true");
    container.style.cssText = "position:fixed;left:-10000px;top:0;pointer-events:none";
    document.body.appendChild(container);

    const root = createRoot(container);
    let bodyHtml = "";
    try {
        flushSync(() => {
            root.render(<QuoteDocument id="quotation-card" {...buildQuoteDocumentProps(quote)} />);
        });
        bodyHtml = container.firstElementChild?.outerHTML || "";
    } finally {
        root.unmount();
        container.remove();
    }

    if (!bodyHtml) throw new Error("Quote document did not render");

    // Saved straight to a file (no print dialog), the same way admin's Download does
    const fileName = quoteFileTitle(quote?.QuoteCodeId);
    await saveHtmlAsPdf({
        html: buildQuotePrintDocument({ bodyHtml, baseHref: document.baseURI, title: fileName }),
        selector: "#quotation-card",
        fileName,
        marginPt: 20,
        widthPx: 900,
        breakSelector: "[data-pdf-section]",
        fontFamilies: ["Poppins"],
    });
}

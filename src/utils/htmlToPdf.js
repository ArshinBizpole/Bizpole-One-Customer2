import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

// Saves a self-contained HTML document as a PDF file — no print dialog.
//
// Same method as the admin's quote download (QuoteProposal.tsx → handleDownload):
// render at 2x with html2canvas, then cut the bitmap into A4 pages, snapping each
// cut to the start of a section so nothing is sliced in half, and save with jsPDF.
//
// The document is loaded into an isolated off-screen iframe (the same HTML the
// print path uses), so it renders with the admin's fonts/base styles rather than
// this app's Tailwind v4 CSS. html2canvas-pro is used instead of html2canvas
// because it understands the oklch() colours Tailwind v4 emits.

const A4_W_PT = 595.28;
const A4_H_PT = 841.89;
const SCALE = 2;

const waitForLoad = (iframe) =>
    new Promise((resolve) => {
        let settled = false;
        const done = () => { if (!settled) { settled = true; resolve(); } };
        iframe.addEventListener("load", done, { once: true });
        setTimeout(done, 5000);
    });

const waitForAssets = async (doc, fontFamilies) => {
    // Web fonts load lazily: ask for each family explicitly, otherwise the capture
    // can run with a fallback font (wrong look, uneven word spacing).
    try {
        await Promise.race([
            Promise.all(fontFamilies.flatMap((f) => [400, 600, 700].map((w) => doc.fonts.load(`${w} 16px "${f}"`)))),
            new Promise((r) => setTimeout(r, 6000)),
        ]);
        await doc.fonts?.ready;
    } catch { /* fonts are optional */ }
    await Promise.all(
        Array.from(doc.images).map((img) =>
            img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; setTimeout(r, 5000); })
        )
    );
};

/**
 * @param {object} opts
 * @param {string} opts.html            full HTML document (e.g. from buildQuotePrintDocument)
 * @param {string} opts.selector        element inside it to capture
 * @param {string} opts.fileName        file name to save (".pdf" is added if missing)
 * @param {number} [opts.marginPt=20]   page margin in pt (0 when the document has its own padding)
 * @param {number} [opts.widthPx=900]   viewport width for the off-screen render
 * @param {string} [opts.breakSelector] elements whose top edge is a safe place to cut a page
 * @param {string[]} [opts.fontFamilies] web fonts the document uses, loaded before capture
 */
export async function saveHtmlAsPdf({
    html,
    selector,
    fileName,
    marginPt = 20,
    widthPx = 900,
    breakSelector = "[data-pdf-section], tr",
    fontFamilies = [],
}) {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    // Laid out (not display:none) but out of sight
    iframe.style.cssText = `position:fixed;left:-20000px;top:0;width:${widthPx}px;height:2000px;border:0;opacity:0;pointer-events:none`;
    iframe.srcdoc = html;
    const loaded = waitForLoad(iframe);
    document.body.appendChild(iframe);

    try {
        await loaded;
        const doc = iframe.contentDocument;
        await waitForAssets(doc, fontFamilies);

        const target = doc.querySelector(selector);
        if (!target) throw new Error(`Nothing to capture (${selector})`);
        // The print stylesheet may shrink the document with CSS zoom, which
        // html2canvas does not handle — capture at natural size; jsPDF scales it.
        let el = target;
        while (el && el !== doc.body) { el.style.zoom = "1"; el = el.parentElement; }

        const imgWPt = A4_W_PT - 2 * marginPt;
        const usableHPt = A4_H_PT - 2 * marginPt;

        const top = target.getBoundingClientRect().top;
        const breaksCss = Array.from(target.querySelectorAll(breakSelector))
            .map((n) => n.getBoundingClientRect().top - top);

        const canvas = await html2canvas(target, {
            scale: SCALE,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#ffffff",
            imageTimeout: 15000,
            windowWidth: widthPx,
        });

        const breaksPx = breaksCss.map((y) => Math.round(y * SCALE));
        const ptPerPx = imgWPt / canvas.width;
        const usableHPx = Math.round(usableHPt / ptPerPx);

        const slices = [];
        let start = 0;
        while (start < canvas.height) {
            const hardEnd = start + usableHPx;
            if (hardEnd >= canvas.height) { slices.push([start, canvas.height]); break; }
            const safeEnd = breaksPx.filter((b) => b > start && b <= hardEnd).pop();
            const end = safeEnd ?? hardEnd;
            slices.push([start, end]);
            start = end;
        }

        const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
        slices.forEach(([s, e], i) => {
            if (i > 0) pdf.addPage();
            const slice = document.createElement("canvas");
            slice.width = canvas.width;
            slice.height = e - s;
            slice.getContext("2d").drawImage(canvas, 0, s, canvas.width, e - s, 0, 0, canvas.width, e - s);
            pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", marginPt, marginPt, imgWPt, (e - s) * ptPerPx);
        });

        pdf.save(/\.pdf$/i.test(fileName) ? fileName : `${fileName}.pdf`);
    } finally {
        iframe.remove();
    }
}

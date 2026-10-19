import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

const A4_W_PT = 595.28;
const A4_H_PT = 841.89;
const SCALE = 2;

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

// Cross-origin images without CORS headers come out blank in html2canvas;
// resolveImage(src) can return a same-origin data URL for them instead.
async function inlineImages(element, resolveImage) {
  const map = new Map();
  if (!resolveImage) return map;
  const srcs = [...new Set(Array.from(element.querySelectorAll("img")).map((img) => img.src))]
    .filter((src) => /^https?:/i.test(src) && new URL(src).origin !== window.location.origin);
  await Promise.all(
    srcs.map(async (src) => {
      try {
        const out = await resolveImage(src);
        if (out) map.set(src, out instanceof Blob ? await blobToDataUrl(out) : out);
      } catch {
        /* leave it — the row still shows the mark's name */
      }
    })
  );
  return map;
}

// A same-origin image as { dataUrl, ratio } (width / height) for jsPDF, or null.
async function loadImage(src) {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const dataUrl = await blobToDataUrl(await res.blob());
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    return { dataUrl, ratio: img.naturalWidth / img.naturalHeight };
  } catch {
    return null;
  }
}

// Split [0, height) into pages no taller than firstH / restH, ending each page
// at the last allowed break that fits; a forced break always ends a page.
function paginate(height, breaks, forced, firstH, restH) {
  const pages = [];
  let start = 0;
  while (start < height) {
    const limit = pages.length ? restH : firstH;
    const hardEnd = start + limit;
    const f = forced.find((b) => b > start && b <= Math.min(hardEnd, height));
    if (f) { pages.push({ start, end: f, limit, forced: true }); start = f; continue; }
    if (hardEnd >= height) { pages.push({ start, end: height, limit, last: true }); break; }
    const end = breaks.filter((b) => b > start && b <= hardEnd).pop() ?? hardEnd;
    pages.push({ start, end, limit });
    start = end;
  }
  return pages;
}

/**
 * Saves an on-screen element as an A4 PDF. The element is re-laid out at a fixed
 * desktop width in html2canvas's clone, so wide tables aren't clipped on phones,
 * then sliced into pages at row boundaries (tr / [data-pdf-section]).
 *  - [data-pdf-break] always starts a new page
 *  - [data-pdf-hide] is left out of the PDF
 *  - [data-pdf-grow] is stretched to fill the blank space left at the bottom of
 *    its page (when the next section doesn't fit), so the page ends flush
 *
 * Options:
 *  - resolveImage(src)  → data URL / Blob for cross-origin images (see inlineImages)
 *  - runningHeader      → { logo?, left, right } drawn as a band on pages 2+;
 *                         logo (same-origin image URL) replaces the left text
 *  - footer             → text drawn on every page, with "Page n of N"
 */
export async function saveElementAsPdf(
  element,
  fileName,
  { widthPx = 1100, marginPt = 0, resolveImage, runningHeader, footer } = {}
) {
  const marker = `pdf-${Date.now()}`;
  element.setAttribute("data-pdf-capture", marker);

  const imgWPt = A4_W_PT - 2 * marginPt;
  // Room for the running header (pages 2+) and the footer (every page).
  const headerPt = runningHeader ? 46 : marginPt;
  const footerPt = footer ? 36 : marginPt;
  const firstTopPt = marginPt;
  const cssPerPt = widthPx / imgWPt;
  const firstHCss = (A4_H_PT - firstTopPt - footerPt) * cssPerPt;
  const restHCss = (A4_H_PT - headerPt - footerPt) * cssPerPt;

  try {
    const images = await inlineImages(element, resolveImage);
    const headerLogo = runningHeader?.logo ? await loadImage(runningHeader.logo) : null;
    let breaksCss = [];
    let forcedCss = [];
    const canvas = await html2canvas(element, {
      scale: SCALE,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: widthPx,
      onclone: (doc) => {
        const el = doc.querySelector(`[data-pdf-capture="${marker}"]`);
        if (!el) return;
        el.style.width = `${widthPx}px`;
        el.style.borderRadius = "0";
        el.style.boxShadow = "none";
        el.style.border = "none";
        el.querySelectorAll("[data-pdf-hide]").forEach((n) => { n.style.display = "none"; });
        el.querySelectorAll(".overflow-x-auto").forEach((n) => { n.style.overflow = "visible"; });
        el.querySelectorAll("img").forEach((img) => {
          const inline = images.get(img.src);
          if (inline) img.src = inline;
        });

        const measure = () => {
          const top = el.getBoundingClientRect().top;
          // Page breaks go between sections or table rows — not above a
          // table's header row or its first data row, so a heading / column
          // header is never left alone at the bottom of a page.
          breaksCss = Array.from(el.querySelectorAll("tr, [data-pdf-section]"))
            .filter((n) => !(n.tagName === "TR" && (n.parentElement?.tagName === "THEAD" || !n.previousElementSibling)))
            .map((n) => n.getBoundingClientRect().top - top);
          forcedCss = Array.from(el.querySelectorAll("[data-pdf-break]"))
            .map((n) => n.getBoundingClientRect().top - top);
          return top;
        };

        let top = measure();
        el.querySelectorAll("[data-pdf-grow]").forEach((g) => {
          const rect = g.getBoundingClientRect();
          const gTop = rect.top - top;
          const gBottom = rect.bottom - top;
          const page = paginate(el.scrollHeight, breaksCss, forcedCss, firstHCss, restHCss)
            .find((p) => gTop >= p.start && gTop < p.end);
          if (!page || page.last || page.forced || gBottom > page.end) return;
          const gap = page.start + page.limit - page.end - 4;
          if (gap <= 8 || gap > page.limit * 0.4) return;
          g.style.minHeight = `${rect.height + gap}px`;
          g.style.alignContent = "center";
          top = measure();
        });
      },
    });

    const breaksPx = breaksCss.map((y) => Math.round(y * SCALE));
    const forcedPx = forcedCss.map((y) => Math.round(y * SCALE));
    const slices = paginate(canvas.height, breaksPx, forcedPx, Math.round(firstHCss * SCALE), Math.round(restHCss * SCALE))
      .map((p) => [p.start, p.end]);
    const ptPerPx = imgWPt / canvas.width;

    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    slices.forEach(([s, e], i) => {
      if (i > 0) pdf.addPage();
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = e - s;
      slice.getContext("2d").drawImage(canvas, 0, s, canvas.width, e - s, 0, 0, canvas.width, e - s);
      const topPt = i === 0 ? firstTopPt : headerPt;
      pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", marginPt, topPt, imgWPt, (e - s) * ptPerPx);

      // Brand white / yellow page furniture (no dark bands).
      if (runningHeader && i > 0) {
        pdf.setFillColor(254, 249, 195); // yellow-100
        pdf.rect(0, 0, A4_W_PT, 30, "F");
        pdf.setFillColor(250, 204, 21); // yellow-400
        pdf.rect(0, 30, A4_W_PT, 2.5, "F");
        if (headerLogo) {
          const h = 22;
          const format = headerLogo.dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
          // Fixed alias: the logo is embedded once and reused on every page.
          pdf.addImage(headerLogo.dataUrl, format, 36, 4, h * headerLogo.ratio, h, "running-header-logo", "FAST");
        } else {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(10);
          pdf.setTextColor(17, 24, 39);
          pdf.text(runningHeader.left || "", 36, 19);
        }
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(75, 85, 99);
        pdf.text(runningHeader.right || "", A4_W_PT - 36, 19, { align: "right" });
      }
      if (footer) {
        const y = A4_H_PT - 18;
        pdf.setDrawColor(229, 231, 235);
        pdf.line(36, y - 12, A4_W_PT - 36, y - 12);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(107, 114, 128);
        pdf.text(footer, 36, y);
        pdf.text(`Page ${i + 1} of ${slices.length}`, A4_W_PT - 58, y, { align: "right" });
        pdf.setFillColor(250, 204, 21);
        pdf.roundedRect(A4_W_PT - 52, y - 4, 16, 3, 1.5, 1.5, "F");
      }
    });
    pdf.save(/\.pdf$/i.test(fileName) ? fileName : `${fileName}.pdf`);
  } finally {
    element.removeAttribute("data-pdf-capture");
  }
}

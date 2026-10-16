import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

const A4_W_PT = 595.28;
const A4_H_PT = 841.89;
const SCALE = 2;

// Saves an on-screen element as an A4 PDF. The element is re-laid out at a fixed
// desktop width in html2canvas's clone, so wide tables aren't clipped on phones,
// then sliced into pages at row boundaries (tr / [data-pdf-section]).
export async function saveElementAsPdf(element, fileName, { widthPx = 1100, marginPt = 0 } = {}) {
  const marker = `pdf-${Date.now()}`;
  element.setAttribute("data-pdf-capture", marker);
  try {
    let breaksCss = [];
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
        el.querySelectorAll(".overflow-x-auto").forEach((n) => { n.style.overflow = "visible"; });
        const top = el.getBoundingClientRect().top;
        breaksCss = Array.from(el.querySelectorAll("tr, [data-pdf-section]"))
          .map((n) => n.getBoundingClientRect().top - top);
      },
    });

    const imgWPt = A4_W_PT - 2 * marginPt;
    const ptPerPx = imgWPt / canvas.width;
    const usableHPx = Math.round((A4_H_PT - 2 * marginPt) / ptPerPx);
    const breaksPx = breaksCss.map((y) => Math.round(y * SCALE));

    const slices = [];
    let start = 0;
    while (start < canvas.height) {
      const hardEnd = start + usableHPx;
      if (hardEnd >= canvas.height) { slices.push([start, canvas.height]); break; }
      const end = breaksPx.filter((b) => b > start && b <= hardEnd).pop() ?? hardEnd;
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
    element.removeAttribute("data-pdf-capture");
  }
}

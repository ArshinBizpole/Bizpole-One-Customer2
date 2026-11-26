// Meta (Facebook/Instagram) Pixel on the React pages /trademark-search and /contact
// — retargeting audiences + ad conversions. Not on /trademark-report: its URL carries
// the report's access token, and the pixel sends the page URL to Meta.
//
// The pixel code itself is the shared public/lp/meta-pixel.js (also used by the
// static trademark landing pages): ID from VITE_META_PIXEL_ID, fires on the live
// site only (?pixel_test=1 to try it elsewhere). It is loaded the first time a
// trademark page opens, never on other routes.

const PIXEL_ID = String(import.meta.env.VITE_META_PIXEL_ID || "").trim();
let loaded = false;

const queue = () => (window.bpPixelQ = window.bpPixelQ || []);

// A trademark page opened: load the pixel (its first load sends PageView itself;
// later SPA navigations between trademark pages send one here), then ViewContent.
export function metaPixelPage(viewContent) {
  if (!/^\d{6,20}$/.test(PIXEL_ID)) return;
  try {
    if (!loaded) {
      loaded = true;
      const s = document.createElement("script");
      s.src = "/lp/meta-pixel.js";
      s.async = true;
      document.head.appendChild(s);
    } else {
      queue().push(["PageView"]);
    }
    if (viewContent) queue().push(["ViewContent", { content_category: "Trademark", ...viewContent }]);
  } catch {
    // tracking must never break the page
  }
}

// An event on a trademark page: Meta standard names (Search, Lead, …) go as
// standard events, anything else as custom. eventId de-dups a later server send.
export function metaPixelTrack(event, params = {}, eventId) {
  if (!loaded) return;
  try {
    queue().push([event, { content_category: "Trademark", ...params }, eventId]);
  } catch {
    // tracking must never break the page
  }
}

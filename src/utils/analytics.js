// Google Analytics 4 events (the tag itself is in index.html and only loads on
// the live bizpole.io site — elsewhere window.gtag is absent and this no-ops).
// Page views are sent from App.jsx on each route change (GA's own is off).
// WhatsApp (no OTP): whatsapp_report_form_open, whatsapp_report_sent,
// whatsapp_report_failed, generate_lead (lead_source "trademark_whatsapp") —
// see api/TrademarkApi.js; login (method "whatsapp_link") — api/AuthApi.js.
export const trackEvent = (name, params = {}) => {
  try {
    if (typeof window.gtag === "function") window.gtag("event", name, params);
  } catch {
    // analytics must never break the page
  }
};

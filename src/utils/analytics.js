// Google Analytics 4 events (the tag itself is in index.html and only loads on
// the live bizpole.io site — elsewhere window.gtag is absent and this no-ops).
// Page views need no call here: GA4 counts the app's route changes itself.
export const trackEvent = (name, params = {}) => {
  try {
    if (typeof window.gtag === "function") window.gtag("event", name, params);
  } catch {
    // analytics must never break the page
  }
};

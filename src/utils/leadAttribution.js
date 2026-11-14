// Ad-click attribution (which channel brought this visitor) for the Leads the
// portal creates: sign-up, trademark search, start-business / call-back.
//
// First touch: the first landing URL that carries ad tags (utm_*, fbclid,
// gclid) is kept for 30 days and never replaced by a later visit. Untagged
// (organic) visits store nothing — the server then sources the Lead as
// "Website". The server decides the source; the browser only reports the tags.

const KEY = "leadAttribution";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"];

const read = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || "null");
    if (stored && Date.now() - stored.ts < TTL_MS) return stored;
    localStorage.removeItem(KEY);
  } catch {
    // storage unavailable or corrupt — attribution is best-effort
  }
  return null;
};

// Called once on app load, before the router can rewrite the URL.
export const captureLeadAttribution = () => {
  if (read()) return;
  const query = new URLSearchParams(window.location.search);
  const tags = {};
  PARAMS.forEach((p) => {
    const v = query.get(p);
    if (v) tags[p] = v.slice(0, 200);
  });
  if (!Object.keys(tags).length) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({
      ...tags,
      landing: window.location.pathname.slice(0, 200),
      referrer: document.referrer.slice(0, 200),
      ts: Date.now(),
    }));
  } catch {
    // storage unavailable (private mode etc.)
  }
};

// The stored first touch, or null for an organic visitor.
export const getLeadAttribution = () => read();

// Source of sale for a Deal / Quote the portal creates directly (existing
// clients skip the Lead). Same rule as the server's portalLeadSource.
const META_UTM_SOURCES = ["fb", "facebook", "ig", "instagram", "meta", "an", "msg", "messenger"];
export const portalSourceOfSale = () => {
  const a = read();
  if (a && (a.fbclid || META_UTM_SOURCES.includes(String(a.utm_source || "").trim().toLowerCase()))) {
    return "Facebook/Instagram";
  }
  return "Website";
};

import axiosInstance from "./axiosInstance";

// Proxies through our own backend (Bizpole-One-Server: src/routes/gstinRoutes.js),
// which holds the third-party GST-verification provider's API key server-side —
// the browser never sees it.
//
// Every successful lookup is also kept in localStorage for CACHE_DAYS, so the
// same GSTIN / PAN searched again in this browser is filled from there instead
// of costing another paid provider call. Failures are never cached.
const CACHE_KEY = "gstinLookupCache";
const CACHE_DAYS = 30;

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function cached(key) {
  const entry = readCache()[key];
  if (!entry || Date.now() - entry.savedAt > CACHE_DAYS * 24 * 60 * 60 * 1000) return null;
  return entry.data;
}

function remember(key, data) {
  try {
    const cache = readCache();
    const cutoff = Date.now() - CACHE_DAYS * 24 * 60 * 60 * 1000;
    Object.keys(cache).forEach((k) => { if (!cache[k] || cache[k].savedAt < cutoff) delete cache[k]; });
    cache[key] = { savedAt: Date.now(), data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full / blocked — the lookup still works, just uncached.
  }
}

export const lookupGstin = async (gstin) => {
  const key = `gstin:${gstin}`;
  const hit = cached(key);
  if (hit) return hit;
  const res = await axiosInstance.get(`/api/gstin/${gstin}`);
  const data = res.data?.data || null;
  if (data) remember(key, data);
  return data;
};

// Every GSTIN (with details) a PAN holds in one state — `stateCode` is the
// 2-digit GST state code (e.g. "32" Kerala).
export const lookupGstinsByPan = async (pan, stateCode) => {
  const key = `pan:${pan}:${stateCode}`;
  const hit = cached(key);
  if (hit) return hit;
  const res = await axiosInstance.get(`/api/gstin/pan/${pan}`, { params: { state: stateCode } });
  const list = res.data?.data || [];
  if (list.length) {
    remember(key, list);
    // Each GSTIN found is a full record too — a later GSTIN search reuses it.
    list.forEach((d) => d?.gstin && remember(`gstin:${d.gstin}`, d));
  }
  return list;
};

export default { lookupGstin, lookupGstinsByPan };

import { getTokenExpiryMs } from "./jwt";

// Keys that represent the logged-in session — cleared on logout/expiry.
// (Deliberately excludes the referral scan token — referralScanToken/ExpiresAt, see
// utils/referralAttribution — which must survive a logged-out session until signup, and the
// separate affiliate session — see utils/affiliateSession. The legacy "PartnerID" key is no
// longer used at all; it is purged on app load.)
const SESSION_KEYS = [
  "token",
  "partnerToken",
  "user",
  "partnerUser",
  "selectedCompany",
  "CompanyId",
  "onboardingStep",
];

export const clearSession = () => {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  notifySessionCleared();
};

// Call right after storing a fresh token so useAutoLogout re-arms its expiry timer
// immediately, instead of waiting for the next full page load.
export const notifyTokenSet = () => {
  window.dispatchEvent(new Event("auth-token-set"));
};

// Fired from clearSession() so components that already checked localStorage once on
// mount (e.g. Navbar) can react immediately instead of showing stale logged-in UI
// until the next hard refresh.
export const notifySessionCleared = () => {
  window.dispatchEvent(new Event("auth-session-cleared"));
};

export const getActiveToken = () =>
  localStorage.getItem("token") || localStorage.getItem("partnerToken");

// null means "no token, or token has no exp claim" — nothing to enforce.
export const getSessionExpiryMs = () => {
  const token = getActiveToken();
  if (!token) return null;
  return getTokenExpiryMs(token);
};

export const isSessionExpired = () => {
  const expiry = getSessionExpiryMs();
  if (expiry === null) return false;
  return Date.now() >= expiry;
};

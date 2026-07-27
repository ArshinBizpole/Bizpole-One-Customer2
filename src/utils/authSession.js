import { getTokenExpiryMs } from "./jwt";

// Keys that represent the logged-in session — cleared on logout/expiry.
// (Deliberately excludes things like "PartnerID" referral attribution, which should
// survive a logged-out session.)
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
};

// Call right after storing a fresh token so useAutoLogout re-arms its expiry timer
// immediately, instead of waiting for the next full page load.
export const notifyTokenSet = () => {
  window.dispatchEvent(new Event("auth-token-set"));
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

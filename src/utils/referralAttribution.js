// Referral attribution storage (Referral & Affiliate Programme).
//
// A referral is proven by a short-lived, server-signed scan token obtained from
// GET /referrals/public/resolve/:code (or POST /referrals/public/legacy). The browser only
// ever stores that opaque token and hands it back as `referralToken` on signup; it never
// stores or sends a referrer id itself (the old `PartnerID` → AssociateID path was spoofable
// and is ignored by the server for anonymous browsers).

const TOKEN_KEY = "referralScanToken";
const EXPIRES_KEY = "referralScanExpiresAt";
const LEGACY_KEYS = ["PartnerID"];

const safeGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeRemove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // storage unavailable — nothing to clear
  }
};

export const storeReferralScan = ({ scanToken, expiresAt } = {}) => {
  if (!scanToken) return;
  try {
    localStorage.setItem(TOKEN_KEY, scanToken);
    if (expiresAt) localStorage.setItem(EXPIRES_KEY, expiresAt);
    else localStorage.removeItem(EXPIRES_KEY);
  } catch {
    // storage unavailable (private mode etc.) — attribution is best-effort
  }
};

export const clearReferralToken = () => {
  safeRemove(TOKEN_KEY);
  safeRemove(EXPIRES_KEY);
};

// Returns the stored scan token, or null if none / expired (an expired one is purged).
export const getReferralToken = () => {
  const token = safeGet(TOKEN_KEY);
  if (!token) return null;
  const expiresAt = safeGet(EXPIRES_KEY);
  if (expiresAt) {
    const ms = Date.parse(expiresAt);
    if (!Number.isNaN(ms) && Date.now() >= ms) {
      clearReferralToken();
      return null;
    }
  }
  return token;
};

// Spread into a signup body: `{ ...referralTokenField() }` → `{ referralToken }` or `{}`.
export const referralTokenField = () => {
  const referralToken = getReferralToken();
  return referralToken ? { referralToken } : {};
};

// Stale pre-programme keys (e.g. PartnerID copied from any ?ref=) must die on load.
export const purgeLegacyReferralKeys = () => {
  LEGACY_KEYS.forEach(safeRemove);
};

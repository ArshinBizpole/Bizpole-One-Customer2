import { getSecureItem, setSecureItem } from "./secureStorage";
import { getTokenExpiryMs } from "./jwt";

// Affiliate session is deliberately separate from the customer (`token`) and partner
// (`partnerToken`) sessions: clearing one never touches the others.
const TOKEN_KEY = "affiliateToken";
const USER_KEY = "affiliateUser";
export const AFFILIATE_SESSION_CLEARED = "affiliate-session-cleared";

export const getAffiliateToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getAffiliateUser = () => getSecureItem(USER_KEY);

export const setAffiliateSession = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  if (user) setSecureItem(USER_KEY, user);
};

export const clearAffiliateSession = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(AFFILIATE_SESSION_CLEARED));
};

// True when an affiliate token exists and has not passed its `exp` claim.
export const hasValidAffiliateSession = () => {
  const token = getAffiliateToken();
  if (!token) return false;
  const exp = getTokenExpiryMs(token);
  if (exp !== null && Date.now() >= exp) {
    clearAffiliateSession();
    return false;
  }
  return true;
};

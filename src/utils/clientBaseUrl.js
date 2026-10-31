// Base address of the admin app that serves client-facing pages such as
// /quotes/saved-preview/:id.
//
// Order of precedence:
//   1. VITE_CLIENT_BASE_URL from .env (baked in at build/dev-start time)
//   2. ?clientBase=<url> in the current page's address — remembered for the
//      browser session so it survives navigating between pages
//   3. the test site
//
// These links are sent to clients, so a value from the URL is only accepted for
// Bizpole domains or localhost — otherwise a crafted link could make an associate
// share links pointing at someone else's site.

const PARAM = "clientBase";
const STORAGE_KEY = "clientBaseUrl";
const DEFAULT_BASE = "https://admin.bizpole.io";
const ALLOWED_HOST = /(^|\.)bizpole\.io$|(^|\.)bizpoleindia\.in$|^localhost$|^127\.0\.0\.1$/i;

// Any valid http(s) address → its origin; anything else (missing, blank, malformed) → null
const toOrigin = (value) => {
    if (!value || !String(value).trim()) return null;
    try {
        const url = new URL(String(value).trim());
        return /^https?:$/.test(url.protocol) ? url.origin : null;
    } catch {
        return null;
    }
};

// Same, but only for Bizpole domains or localhost — used for values taken from the URL
const toAllowedOrigin = (value) => {
    const origin = toOrigin(value);
    return origin && ALLOWED_HOST.test(new URL(origin).hostname) ? origin : null;
};

const fromUrlParam = () => {
    try {
        const fromQuery = toAllowedOrigin(new URLSearchParams(window.location.search).get(PARAM));
        if (fromQuery) {
            sessionStorage.setItem(STORAGE_KEY, fromQuery);
            return fromQuery;
        }
        return toAllowedOrigin(sessionStorage.getItem(STORAGE_KEY));
    } catch {
        return null; // storage can be blocked (private mode etc.)
    }
};

// The env value is trusted config, so it's used as long as it's a valid address;
// the URL parameter is only consulted when the env value is missing or invalid
export const getClientBaseUrl = () =>
    toOrigin(import.meta.env.VITE_CLIENT_BASE_URL) || fromUrlParam() || DEFAULT_BASE;

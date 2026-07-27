// Minimal JWT payload decode — no signature verification (that's the server's job via
// authMiddleware.js). Only used client-side to read the `exp` claim so the app can react
// to session expiry without waiting for an API call to fail.
export const decodeJwtPayload = (token) => {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

// Returns the token's expiry as an epoch-ms timestamp, or null if absent/unparseable.
export const getTokenExpiryMs = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000;
};

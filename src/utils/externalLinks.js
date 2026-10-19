// Journl (Bizpole Books) is its own site — opened in a new tab, not inside the
// portal. Set VITE_JOURNL_URL per environment (live vs test).
export const JOURNL_URL = import.meta.env.VITE_JOURNL_URL || "https://test.bizpolebooks.com/";

export const openExternal = (url) => window.open(url, "_blank", "noopener,noreferrer");

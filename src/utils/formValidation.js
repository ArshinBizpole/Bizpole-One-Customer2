// Shared input rules for the associate signup and Create Deal forms.

export const PATTERNS = {
    personName: /^[A-Za-z][A-Za-z .']*$/,
    mobile: /^[6-9]\d{9}$/, // Indian mobile numbers start with 6-9
    email: /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/,
    country: /^[A-Za-z][A-Za-z .-]*$/,
    indiaPin: /^[1-9]\d{5}$/,
    postal: /^[A-Za-z0-9][A-Za-z0-9 -]{2,9}$/,
    gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
};

export const isIndia = (country) => !country?.trim() || country.trim().toLowerCase() === "india";

// Older records hold numbers like "+91 97582 41256" or "09758241256" — reduce
// them to the 10-digit form before checking or trimming to length
export const normalizeMobile = (v) => {
    let d = String(v || "").replace(/\D/g, "");
    if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
    else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
    return d;
};

// Strip characters a field of this kind can never contain, as the user types
export const sanitize = {
    personName: (v) => v.replace(/[^A-Za-z .']/g, "").slice(0, 100),
    mobile: (v) => normalizeMobile(v).slice(0, 10),
    email: (v) => v.replace(/\s/g, "").slice(0, 100),
    country: (v) => v.replace(/[^A-Za-z .-]/g, "").slice(0, 56),
    postal: (v, country) => (isIndia(country)
        ? v.replace(/\D/g, "").slice(0, 6)
        : v.replace(/[^A-Za-z0-9 -]/g, "").slice(0, 10)),
    gstin: (v) => v.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15),
    text: (max) => (v) => v.slice(0, max),
};

// Each validator returns an error message, or "" when the value is fine.
// `required` controls whether an empty value is an error.
export const validate = {
    // Last names are often a single initial ("Arun A"), so callers can pass min: 1
    personName: (v, { required = false, label = "Name", min = 2 } = {}) => {
        const s = (v || "").trim();
        if (!s) return required ? `${label} is required` : "";
        if (s.length < min) return `${label} must be at least ${min} characters`;
        return PATTERNS.personName.test(s) ? "" : `${label} can contain only letters, spaces, dots and apostrophes`;
    },
    mobile: (v, { required = false } = {}) => {
        if (!String(v || "").trim()) return required ? "Mobile number is required" : "";
        return PATTERNS.mobile.test(normalizeMobile(v)) ? "" : "Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9";
    },
    email: (v, { required = false } = {}) => {
        const s = (v || "").trim();
        if (!s) return required ? "Email is required" : "";
        return PATTERNS.email.test(s) ? "" : "Please enter a valid email address";
    },
    country: (v) => {
        const s = (v || "").trim();
        if (!s) return "";
        return s.length >= 2 && PATTERNS.country.test(s) ? "" : "Enter a valid country name (letters only)";
    },
    postal: (v, country) => {
        const s = (v || "").trim();
        if (!s) return "";
        if (isIndia(country)) return PATTERNS.indiaPin.test(s) ? "" : "Enter a valid 6-digit PIN code";
        return PATTERNS.postal.test(s) ? "" : "Enter a valid postal / ZIP code";
    },
    gstin: (v) => {
        const s = (v || "").trim();
        if (!s) return "";
        return PATTERNS.gstin.test(s) ? "" : "Enter a valid 15-character GSTIN (e.g. 32ABCDE1234F1Z5)";
    },
};

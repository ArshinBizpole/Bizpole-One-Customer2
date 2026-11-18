import axios from "axios";

// Offers on the apply-flow Payment step (server: routes/Customer/customerOfferRoutes.js,
// backed by the Bizpole Offer Module). Like CustomerSearchApi, deliberately not
// axiosInstance: that client force-logs-out on 401/403, and an offer request
// must never end the customer's session. Every call fails soft — offers never
// block payment.
const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL, timeout: 15000 });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Offers for these apply-flow lines; valid ones are usable now, the rest
// carry a `reason` (e.g. a minimum amount).
export const fetchAvailableOffers = async (ServiceDetails) => {
  try {
    const res = await client.post("/website/offers/available", { ServiceDetails });
    return Array.isArray(res.data?.data) ? res.data.data : [];
  } catch {
    return [];
  }
};

// Preview only — nothing is recorded. → { valid, discount, finalAmount, message }
export const previewOfferCode = async (ServiceDetails, promoCode) => {
  try {
    const res = await client.post("/website/offers/preview", { ServiceDetails, promoCode });
    return res.data || { valid: false, message: "Offers are unavailable right now" };
  } catch {
    return { valid: false, message: "Offers are unavailable right now" };
  }
};

// Dashboard quote checkout (pages/QuoteCheckout.jsx): a saved quote's lines,
// total, applied offer and available offers. → the server's body, or null.
export const loadQuoteCheckout = async (quoteId) => {
  try {
    const res = await client.post("/website/quote-checkout/load", { quoteId });
    return res.data?.success ? res.data : null;
  } catch {
    return null;
  }
};

// Preview a code on a saved quote — nothing is recorded.
export const previewQuoteCheckoutCode = async (quoteId, promoCode) => {
  try {
    const res = await client.post("/website/quote-checkout/preview", { quoteId, promoCode });
    return res.data || { valid: false, message: "Offers are unavailable right now" };
  } catch {
    return { valid: false, message: "Offers are unavailable right now" };
  }
};

// Records the offer once and puts the discount on the saved Quote.
// → { valid, code, discount, finalAmount } or { valid: false, message }
export const redeemOfferOnQuote = async (quoteId, promoCode) => {
  try {
    const res = await client.post("/website/offers/redeem", { quoteId, promoCode });
    return res.data || { valid: false, message: "Offers are unavailable right now" };
  } catch (err) {
    return err?.response?.data?.message
      ? { valid: false, message: err.response.data.message }
      : { valid: false, message: "Offers are unavailable right now" };
  }
};

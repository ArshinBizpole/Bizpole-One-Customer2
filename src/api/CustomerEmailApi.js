import axios from "axios";

// Customer email service (Bizpole-One-Server/src/customerEmailService) — runs
// separately from the main API, so it has its own base URL. When
// VITE_CUSTOMER_EMAIL_API_URL isn't set, emails are simply skipped.
const baseURL = import.meta.env.VITE_CUSTOMER_EMAIL_API_URL;

// "Application received" / call-back confirmation email for a just-created quote.
// payload: { quoteId, applicationId, serviceType, callback, requestType, deliverableEmail }
export const sendApplicationReceivedEmail = async (payload) => {
  const token = localStorage.getItem("token");
  if (!baseURL || !token || !payload?.quoteId) return { success: false, skipped: true };
  try {
    const res = await axios.post(`${baseURL}/customer-email/application-received`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  } catch (error) {
    console.error("Application email failed (non-fatal):", error);
    return { success: false };
  }
};

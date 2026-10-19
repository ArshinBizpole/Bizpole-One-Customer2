import axios from "axios";

// Has an application's quote been paid? An Orders row only exists once a
// quote's payment has succeeded, so: find this QuoteID among the company's
// orders (same /order/company endpoint the Orders pages use) and check it has
// money received.
//
// Own client, not axiosInstance: this is polled while the customer pays in
// another tab, and axiosInstance force-logs-out on any 401/403.
const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL, timeout: 15000 });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** @returns {Promise<{ paid: boolean, received: number }>} */
export async function getQuotePaymentStatus({ companyId, quoteId }) {
  if (!companyId || !quoteId || !localStorage.getItem("token")) return { paid: false, received: 0 };
  try {
    // Newest first — a just-paid order is on the first page.
    const res = await client.post("/order/company", { companyId, limit: 50, page: 1 });
    const rows = Array.isArray(res.data?.data) ? res.data.data : [];
    const order = rows.find((o) => Number(o.QuoteID) === Number(quoteId));
    const received = Number(order?.ReceivedAmount) || 0;
    return { paid: !!order && received > 0, received };
  } catch (err) {
    // 404 = the company has no orders yet, i.e. not paid.
    if (err.response?.status === 404) return { paid: false, received: 0 };
    throw err;
  }
}

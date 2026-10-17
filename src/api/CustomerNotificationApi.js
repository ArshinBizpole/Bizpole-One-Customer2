import axios from "axios";

// Customer notification bell API (server: routes/CustomerNotification/customerNotificationRoutes.js).
//
// Deliberately NOT axiosInstance: that client force-logs-out on any 401/403,
// and this is polled in the background — a hiccup here must never end the
// customer's session. Errors just leave the bell as it was.
const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL, timeout: 15000 });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const hasCustomerToken = () => !!localStorage.getItem("token");

export const getCustomerNotifications = async ({ companyId, limit = 20 } = {}) => {
  const res = await client.get("/customer-notifications", {
    params: { limit, ...(companyId ? { companyId } : {}) },
  });
  return { items: res.data?.data || [], unread: Number(res.data?.unread) || 0 };
};

export const markCustomerNotificationRead = (id) =>
  client.post(`/customer-notifications/${id}/read`);

export const markAllCustomerNotificationsRead = (companyId) =>
  client.post("/customer-notifications/read-all", companyId ? { companyId } : {});

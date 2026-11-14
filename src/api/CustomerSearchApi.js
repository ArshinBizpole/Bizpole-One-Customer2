import axios from "axios";

// Header search API. Like CustomerNotificationApi, deliberately not
// axiosInstance: that client force-logs-out on 401/403, and a search request
// must never end the customer's session.
const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL, timeout: 15000 });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// The customer's own orders / invoices / quotes / tickets / documents
// (server: routes/CustomerSearch/customerSearchRoutes.js).
export const searchMyData = async (q, companyId, signal) => {
  if (!localStorage.getItem("token")) return null;
  const res = await client.get("/customer-search", {
    params: { q, ...(companyId ? { companyId } : {}) },
    signal,
  });
  return res.data?.data || null;
};

// Public service catalog, matched on name / service code.
export const searchServiceCatalog = async (q, signal) => {
  const res = await client.post(
    "/filterServices",
    { Name: q, page: 1, limit: 5, IsActive: 1, CustomerView: 1 },
    { signal },
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
};

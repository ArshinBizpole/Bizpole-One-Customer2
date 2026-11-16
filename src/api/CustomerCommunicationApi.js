import axios from "axios";

// Customer "Communications" tab API (server: routes/CustomerCommunication/customerCommunicationRoutes.js).
//
// Not axiosInstance, for the same reason as CustomerNotificationApi: a failed
// history load should show an error on the page, not force a logout.
const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL, timeout: 20000 });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getCustomerCommunications = async ({ companyId, type, offset = 0, limit = 20 } = {}) => {
  const res = await client.get("/customer-communications", {
    params: {
      offset,
      limit,
      ...(companyId ? { companyId } : {}),
      ...(type ? { type } : {}),
    },
  });
  return {
    items: res.data?.data || [],
    hasMore: !!res.data?.hasMore,
    nextOffset: Number(res.data?.nextOffset) || 0,
  };
};

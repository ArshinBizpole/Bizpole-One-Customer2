import axiosInstance from "./axiosInstance";

// Proxies through our own backend (Bizpole-One-Server: src/routes/gstinRoutes.js),
// which holds the third-party GST-verification provider's API key server-side —
// the browser never sees it.
export const lookupGstin = async (gstin) => {
  const res = await axiosInstance.get(`/api/gstin/${gstin}`);
  return res.data?.data || null;
};

export default { lookupGstin };

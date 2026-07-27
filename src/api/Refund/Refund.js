import axiosInstance from "../axiosInstance";
import { getSecureItem } from "../../utils/secureStorage";

// Resolve the currently-selected company id (mirrors Orders/Order.js).
export const getCompanyIdFromStorage = () => {
  try {
    let raw = getSecureItem("selectedCompany");
    if (!raw) {
      raw =
        window.localStorage.getItem("selectedCompany") ||
        window.sessionStorage.getItem("selectedCompany");
    }
    if (raw) {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed && parsed.CompanyID) return parsed.CompanyID;
    }
    let userDataRaw = getSecureItem("user");
    if (!userDataRaw) {
      userDataRaw =
        window.localStorage.getItem("user") || window.sessionStorage.getItem("user");
    }
    const userData =
      userDataRaw && typeof userDataRaw === "string" ? JSON.parse(userDataRaw) : userDataRaw;
    if (userData && userData.Companies && userData.Companies.length > 0) {
      return userData.Companies[0].CompanyID;
    }
    return null;
  } catch (error) {
    console.error("Error getting company ID:", error);
    return null;
  }
};

// Compute max refundable for an order or service
export const getRefundable = async (payload) => {
  const res = await axiosInstance.post(`/website/refunds/refundable`, payload);
  return res.data;
};

// Customer raises a refund request
export const createCustomerRefund = async (payload) => {
  const res = await axiosInstance.post(`/website/refunds`, payload);
  return res.data;
};

// Customer's own refund requests (My Refunds)
export const getMyRefunds = async (filters = {}) => {
  const companyId = getCompanyIdFromStorage();
  const res = await axiosInstance.post(`/website/refunds/list`, {
    companyId,
    page: filters.page || 1,
    limit: filters.limit || 20,
  });
  return res.data;
};

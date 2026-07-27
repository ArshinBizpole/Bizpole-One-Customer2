import axiosInstance from "../axiosInstance";
import { getSecureItem } from "../../utils/secureStorage";

// Resolve the currently-selected company id (mirrors Orders/Order.js & Refund/Refund.js).
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

// Customer raises a support ticket
export const createSupportTicket = async (payload) => {
  const companyId = getCompanyIdFromStorage();
  const res = await axiosInstance.post(`/website/support-tickets`, {
    companyId,
    ...payload,
  });
  return res.data;
};

// Customer's own support tickets (only those visible to them)
export const getMyTickets = async (filters = {}) => {
  const companyId = getCompanyIdFromStorage();
  const res = await axiosInstance.post(`/website/support-tickets/list`, {
    companyId,
    page: filters.page || 1,
    limit: filters.limit || 50,
  });
  return res.data;
};

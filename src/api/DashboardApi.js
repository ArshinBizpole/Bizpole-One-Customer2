import axiosInstance from "./axiosInstance";

const post = async (url, body) => {
  try {
    const res = await axiosInstance.post(url, body);
    return res.data;
  } catch (error) {
    console.error(`Error calling ${url}:`, error);
    return { success: false, message: error.response?.data?.message || error.message, data: null };
  }
};

export const getDashboardStats = (companyId) => post("/dashboard/stats", { CompanyId: companyId });

export const getComplianceHealth = (companyId) =>
  post("/dashboard/compliance-health", { CompanyId: companyId });

export const getServicesActions = (companyId) =>
  post("/dashboard/services-actions", { CompanyId: companyId });

export const completeAction = (actionId) => post(`/dashboard/actions/${actionId}/complete`, {});

export const getVaultFinance = (companyId) => post("/dashboard/vault-finance", { CompanyId: companyId });

export const getRecommendations = (companyId) =>
  post("/dashboard/recommendations", { CompanyId: companyId });

export const getRelationshipReferral = (companyId) =>
  post("/dashboard/relationship-referral", { CompanyId: companyId });

export const uploadCompanyDocument = async (companyId, file, { title, docType } = {}) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("CompanyId", companyId);
    if (title) formData.append("title", title);
    if (docType) formData.append("docType", docType);

    const res = await axiosInstance.post("/dashboard/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (error) {
    console.error("Error uploading document:", error);
    return { success: false, message: error.response?.data?.message || error.message };
  }
};

export default {
  getDashboardStats,
  getComplianceHealth,
  getServicesActions,
  completeAction,
  getVaultFinance,
  getRecommendations,
  getRelationshipReferral,
  uploadCompanyDocument,
};

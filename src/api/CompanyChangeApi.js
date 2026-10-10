import axiosInstance from "./axiosInstance";

// Customer-app "Change" options — each saves straight to the signed-in
// customer's own company (the server checks they're linked to CompanyId).
// Errors carry the server's message so the flow can show it as-is.
const post = async (url, body) => {
  try {
    const response = await axiosInstance.post(url, body);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || "Request failed");
  }
};

// Business Name, Address, Activity, Contact Details, Company Structure
export const getMyCompanyDetails = (companyId) =>
  post("/company/customer-details/get", { CompanyId: companyId });
export const updateMyCompanyDetails = (companyId, fields) =>
  post("/company/customer-details/update", { CompanyId: companyId, ...fields });

// Owner / Director and Partner
export const listCompanyDirectors = (companyId) =>
  post("/company/directors/list", { CompanyId: companyId });
export const addCompanyDirector = (companyId, fields) =>
  post("/company/directors/add", { CompanyId: companyId, ...fields });
export const updateCompanyDirector = (companyId, id, fields) =>
  post("/company/directors/update", { CompanyId: companyId, ID: id, ...fields });
export const removeCompanyDirector = (companyId, id) =>
  post("/company/directors/remove", { CompanyId: companyId, ID: id });

// Bank Details
export const getCompanyBank = (companyId) =>
  post("/company/bank/get", { CompanyId: companyId });
export const saveCompanyBank = (companyId, fields) =>
  post("/company/bank/save", { CompanyId: companyId, ...fields });

// Other change
export const createCompanyChangeRequest = (companyId, details, changeType = "Other") =>
  post("/company/change-request/create", { CompanyId: companyId, Details: details, ChangeType: changeType });

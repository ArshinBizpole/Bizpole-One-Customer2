import axiosInstance from "./axiosInstance";

/**
 * Create a Lead (customer-portal call-back request, new user + new service).
 * @param {Object} payload - { name, state, mobile, email, proposed_service, preferred_language, lead_source, franchiseeId, employeeId }
 */
export const createLead = async (payload) => {
  const res = await axiosInstance.post("/lead-generation/createLead", payload);
  return res.data;
};

/**
 * Schedule a follow-up on a Lead.
 * @param {Object} payload - { leadId, followUpDate, remark }
 */
export const createLeadFollowUp = async ({ leadId, followUpDate, remark }) => {
  const res = await axiosInstance.post("/followup/create", { leadId, followUpDate, remark });
  return res.data;
};

/**
 * Create/link a Customer + Company (no deal) for an in-progress application —
 * called once the applicant has entered real director/company details.
 * @param {Object} payload - { leadId, customer, company, franchiseeId }
 */
export const createCustomerCompany = async (payload) => {
  const res = await axiosInstance.post("/lead-generation/customer-company", payload);
  return res.data;
};

/**
 * Convert a Lead to a Deal once real service details (fees/addons) are known —
 * creates/reuses the Customer + Company and records the deal + its pricing.
 * @param {Object} payload - { leadId, customer, company, franchiseeId, employeeId, ServiceDetails, isIndividual }
 */
export const convertLeadToDeal = async (payload) => {
  const res = await axiosInstance.post("/lead-generation/convert-to-deal", payload);
  return res.data;
};

/**
 * Save the applicant's chosen service + fee breakdown as a real Quote, before
 * the (mocked) payment step runs.
 * @param {Object} payload - { leadId, dealId, customerId, companyId, customerName, companyName, franchiseeId, employeeId, isIndividual, ServiceDetails }
 */
export const createQuoteForApplication = async (payload) => {
  const res = await axiosInstance.post("/lead-generation/create-quote", payload);
  return res.data;
};

/**
 * Upload one Documents-step file for the apply flow.
 * @param {Object} params - { file, leadId, companyId, docLabel }
 */
export const uploadApplicationDocument = async ({ file, leadId, companyId, docLabel }) => {
  const formData = new FormData();
  formData.append("file", file);
  if (leadId) formData.append("leadId", leadId);
  if (companyId) formData.append("companyId", companyId);
  formData.append("docLabel", docLabel);
  const res = await axiosInstance.post("/lead-generation/application-document", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

/**
 * Remove a previously uploaded Documents-step file.
 * @param {Object} params - { leadId, docLabel }
 */
export const removeApplicationDocument = async ({ leadId, docLabel }) => {
  const res = await axiosInstance.post("/lead-generation/application-document/remove", { leadId, docLabel });
  return res.data;
};

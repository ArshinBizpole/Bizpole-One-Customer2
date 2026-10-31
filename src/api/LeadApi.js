import axiosInstance from "./axiosInstance";
import { getLeadAttribution } from "../utils/leadAttribution";

/**
 * Create a Lead (customer-portal call-back request, new user + new service).
 * @param {Object} payload - { name, state, mobile, email, proposed_service, preferred_language, lead_source, franchiseeId, employeeId }
 * `portal: true` tells the server this is a customer-side lead, so its source
 * becomes Website or Facebook/Instagram (from `attribution`) — see utils/leadAttribution.
 */
export const createLead = async (payload) => {
  const res = await axiosInstance.post("/lead-generation/createLead", {
    ...payload,
    portal: true,
    attribution: getLeadAttribution() || undefined,
  });
  return res.data;
};

/**
 * Schedule a follow-up on a Lead.
 * @param {Object} payload - { leadId, followUpDate (YYYY-MM-DD), followUpTime? (HH:MM), remark }
 */
export const createLeadFollowUp = async ({ leadId, followUpDate, followUpTime, remark }) => {
  const res = await axiosInstance.post("/followup/create", { leadId, followUpDate, followUpTime, remark });
  return res.data;
};

/**
 * Save corrected "Your details" to the signed-in customer's own Lead + Customer
 * (the Customer's sign-in mobile is left as it is).
 * @param {Object} payload - { leadId?, name?, email?, mobile?, state?, language? } — only what changed
 */
export const updateApplicationContact = async (payload) => {
  const res = await axiosInstance.post("/website/application/contact", payload);
  return res.data;
};

/**
 * Edits made after the Deal / Quote were created, and the application's full
 * answers — all on the signed-in customer's own records.
 */
export const updateApplicationDeal = async (payload) => {
  const res = await axiosInstance.post("/website/application/deal", payload);
  return res.data;
};
export const updateApplicationQuote = async (payload) => {
  const res = await axiosInstance.post("/website/application/quote", payload);
  return res.data;
};
export const saveApplicationAnswers = async (payload) => {
  const res = await axiosInstance.post("/website/application/answers", payload);
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
 * @param {Object} params - { leadId, companyId, docLabel } — leadId, or companyId when there's no Lead
 */
export const removeApplicationDocument = async ({ leadId, companyId, docLabel }) => {
  const res = await axiosInstance.post("/lead-generation/application-document/remove", leadId ? { leadId, docLabel } : { companyId, docLabel });
  return res.data;
};

/**
 * List the Documents-step files uploaded in the application flows for a company.
 * @param {Object} params - { companyId }
 */
export const listApplicationDocuments = async ({ companyId }) => {
  const res = await axiosInstance.post("/lead-generation/application-document/list", { companyId });
  return res.data;
};

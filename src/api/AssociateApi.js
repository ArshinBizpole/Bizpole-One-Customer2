import axiosInstance, { api } from "./axiosInstance";

/**
 * Create a new associate
 * @param {Object} payload - Associate data
 * @returns {Promise<Object>} - API response
 */
export const createAssociate = async (payload) => {
    try {
        const response = await axiosInstance.post("/associate/create", payload);
        return response.data;
    } catch (error) {
        console.error("Error creating associate:", error);
        throw error;
    }
};
export const getAssociateById = async (id) => {

    console.log("checking......");

    try {
        const response = await axiosInstance.get(`/associateById/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error getting associate by ID:", error);
        throw error;
    }
};

/**
 * Update an existing associate
 * @param {Object} payload - Associate data with AssociateID
 * @returns {Promise<Object>} - API response
 */
export const updateAssociate = async (payload) => {
    try {
        const response = await axiosInstance.post("/associate/update", payload);
        return response.data;
    } catch (error) {
        console.error("Error updating associate:", error);
        throw error;
    }
};

/**
 * List associates with filters and pagination
 * @param {Object} filters - Filter and pagination params
 * @returns {Promise<Object>} - API response
 */
export const listAssociates = async (filters) => {
    try {
        const response = await axiosInstance.post("/associate/list", filters);
        return response.data;
    } catch (error) {
        console.error("Error listing associates:", error);
        throw error;
    }
};

/**
 * Request OTP via Email for associate login
 * @param {string} email 
 */
export const requestAssociateEmailOtp = async (email) => {
    try {
        const response = await axiosInstance.post("/associate/request-email-otp", { email });
        return response.data;
    } catch (error) {
        console.error("Error requesting associate email OTP:", error);
        throw error;
    }
};

/**
 * Verify OTP via Email for associate login
 * @param {string} email 
 * @param {string} otp 
 */
export const verifyAssociateEmailOtp = async (email, otp) => {
    try {
        const response = await axiosInstance.post("/associate/verify-email-otp", { email, otp });
        return response.data;
    } catch (error) {
        console.error("Error verifying associate email OTP:", error);
        throw error;
    }
};

/**
 * Upload associate documents
 * @param {FormData} formData - FormData containing associateId and file fields
 */
export const uploadAssociateDocuments = async (formData) => {

    console.log("checking...");
    console.log({ formData });

    const token = localStorage.getItem("partnerToken"); // Use partner token
    console.log(token);

    try {
        const response = await api.post(
            "/associate/upload-documents",
            formData,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error uploading associate documents:", error);
        throw error;
    }
};

/**
 * Get associate documents
 * @param {string|number} associateId 
 */
export const getAssociateDocuments = async (associateId) => {
    try {
        const response = await axiosInstance.get(`/associate/documents/${associateId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching associate documents:", error);
        throw error;
    }
};


/**
 * List associate receipts (verified payments)
 * @param {Object} filters - filters including AssociateID
 */
export const listAssociateReceipts = async (filters) => {
    try {
        const response = await axiosInstance.post("/associate-receipts", filters);
        console.log("responseMM", response);

        return response.data;
    } catch (error) {
        console.error("Error listing associate receipts:", error);
        throw error;
    }
};


/**
 * Get associate receipt details
 * @param {string|number} paymentId
 */
export const getAssociateReceiptDetails = async (paymentId) => {
    try {
        const response = await axiosInstance.post("/associate-receipt-details", { paymentId });
        return response.data;
    } catch (error) {
        console.error("Error fetching receipt details:", error);
        throw error;
    }
};

/**
 * Get invoices for an order or quote
 * @param {Object} params - { orderId, quoteId }
 */
export const getInvoicesForService = async (params) => {
    try {
        const response = await axiosInstance.post("/getinvoiceforservice", params);
        return response.data;
    } catch (error) {
        console.error("Error fetching invoices:", error);
        throw error;
    }
};

/**
 * Get receipts for an order
 * @param {string|number} orderId - The order ID
 */
export const getReceiptsForOrder = async (orderId) => {
    try {
        const response = await axiosInstance.get(`/receipt/${orderId}?type=order`);
        return response.data;
    } catch (error) {
        console.error("Error fetching receipts for order:", error);
        throw error;
    }
};

/**
 * Get associate dashboard stats, performance series and recent activity
 * @param {Object} params - { AssociateID, range: '7d' | '30d' | 'year' }
 */
export const getAssociateDashboard = async (params) => {
    try {
        const response = await axiosInstance.post("/associate/dashboard", params);
        return response.data;
    } catch (error) {
        console.error("Error fetching associate dashboard:", error);
        throw error;
    }
};

/**
 * Get a payment receipt by PaymentID — same endpoint as the admin's receipt popup
 * @param {string|number} paymentId
 */
export const fetchReceiptByPayment = async (paymentId) => {
    const res = await axiosInstance.get(`/receipt-by-payment/${paymentId}`);
    if (!res.data?.success || !res.data?.data) throw new Error(res.data?.message || "Failed to load receipt.");
    return res.data.data;
};

export default {
    createAssociate,
    updateAssociate,
    listAssociates,
    requestAssociateEmailOtp,
    verifyAssociateEmailOtp,
    uploadAssociateDocuments,
    listAssociateReceipts,
    getAssociateReceiptDetails,
    getInvoicesForService,
    getReceiptsForOrder,
    getAssociateDashboard
};





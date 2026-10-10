import axiosInstance from "./axiosInstance";

/**
 * Convert a lead-like data structure to a deal
 * @param {Object} payload - { leadId, customer, company, franchiseeId, employeeId }
 * @returns {Promise<Object>} - API response
 */
export const convertToDeal = async (payload) => {
    try {
        // const token = getSecureItem("token");
        // console.log("token", token);

        const response = await axiosInstance.post("/lead-generation/convert-to-deal", payload, {
            // headers: {
            //     Authorization: `Bearer ${token}`
            // }
        });
        return response.data;
    } catch (error) {
        console.error("Error converting to deal:", error);
        throw error;
    }
};

/**
 * List deals with filters and pagination
 * @param {Object} filters - { franchiseId, employeeId, status, page, limit, search, isAssociate, ... }
 * @returns {Promise<Object>} - { success, total, data }
 */
export const listDeals = async (filters) => {
    try {
        const response = await axiosInstance.post("/getdeals", filters);
        return response.data;
    } catch (error) {
        console.error("Error listing deals:", error);
        throw error;
    }
};

export const listAssociateCustomers = async (payload) => {
    try {
        const response = await axiosInstance.post("/customer/associate-list", payload);
        return response.data;
    } catch (error) {
        console.error("Error listing associate customers:", error);
        throw error;
    }
};

export const listAssociateCompanies = async (payload) => {
    try {
        const response = await axiosInstance.post("/company/associate-list", payload);
        return response.data;
    } catch (error) {
        console.error("Error listing associate companies:", error);
        throw error;
    }
};

export const saveAssociateCustomer = async (payload) => {
    try {
        const response = await axiosInstance.post("/customer/create-associate", payload);
        return response.data;
    } catch (error) {
        console.error("Error saving associate customer:", error);
        throw error;
    }
};

/**
 * Get single deal details by ID
 * @param {string|number} id - Deal ID
 * @returns {Promise<Object>} - { success, data }
 */
export const getDealById = async (id) => {
    try {
        const response = await axiosInstance.post("/getdeal", { id });
        return response.data;
    } catch (error) {
        console.error("Error fetching deal details:", error);
        throw error;
    }
};

/**
 * Get company details by ID
 * @param {string|number} companyId - Company ID
 * @returns {Promise<Object>} - { success, data }
 */
export const getCompanyDetails = async (companyId) => {
    try {
        const response = await axiosInstance.post("/company/get-details", { CompanyId: companyId });
        return response.data;
    } catch (error) {
        console.error("Error fetching company details:", error);
        throw error;
    }
};

export const requestQuote = async (id, franchiseeId = null) => {
    try {
        const response = await axiosInstance.post("/request-quote", { id, associate_request: 1, franchiseeId });
        return response.data;
    } catch (error) {
        console.error("Error requesting quote:", error);
        throw error;
    }
};

export const updateDeal = async (payload) => {
    try {
        const response = await axiosInstance.post("/edit-deal", payload);
        return response.data;
    } catch (error) {
        console.error("Error updating deal:", error);
        throw error;
    }
};

export const deleteDeal = async (id) => {
    try {
        const response = await axiosInstance.post("/delete-deal", { id });
        return response.data;
    } catch (error) {
        console.error("Error deleting deal:", error);
        throw error;
    }
};

export const saveAssociateCompany = async (payload) => {
    try {
        const response = await axiosInstance.post("/company/create-associate", payload);
        return response.data;
    } catch (error) {
        console.error("Error saving associate company:", error);
        throw error;
    }
};

export const getCustomerDetails = async (customerId) => {
    try {
        const response = await axiosInstance.post("/customer/get", { CustomerID: customerId });
        return response.data;
    } catch (error) {
        console.error("Error fetching customer details:", error);
        throw error;
    }
};

/**
 * Create a Deal for an EXISTING company/customer (no ₹0 floor, unlike convert-to-deal).
 * Used by the customer-portal call-back request flow (existing client + new service).
 * @param {Object} payload - { name, state, mobile, email, franchiseId, employeeId, sourceOfSale, dealType, services, CompanyID, CustomerID }
 */
export const insertDeal = async (payload) => {
    try {
        const response = await axiosInstance.post("/insert", payload);
        return response.data;
    } catch (error) {
        console.error("Error inserting deal:", error);
        throw error;
    }
};

/**
 * Schedule a follow-up on a Deal.
 * @param {Object} payload - { dealId, followUpDate, remark }
 */
export const createDealFollowUp = async ({ dealId, followUpDate, remark }) => {
    try {
        const response = await axiosInstance.post("/deal-followup/create", { dealId, followUpDate, remark });
        return response.data;
    } catch (error) {
        console.error("Error creating deal follow-up:", error);
        throw error;
    }
};

export default {
    convertToDeal,
    listDeals,
    listAssociateCustomers,
    listAssociateCompanies,
    saveAssociateCustomer,
    saveAssociateCompany,
    getDealById,
    getCompanyDetails,
    getCustomerDetails,
    requestQuote,
    updateDeal,
    deleteDeal,
    insertDeal,
    createDealFollowUp,
    checkCompanyExistence: async (name, excludeId = null) => {
        try {
            const response = await axiosInstance.post("/company/check-existence", { name, excludeId });
            return response.data;
        } catch (error) {
            console.error("Error checking company existence:", error);
            throw error;
        }
    },
    checkCompanyEmailExistence: async (email, excludeId = null) => {
        try {
            const response = await axiosInstance.post("/company/check-email-existence", { email, excludeId });
            return response.data;
        } catch (error) {
            console.error("Error checking company email existence:", error);
            throw error;
        }
    },
    checkCompanyMobileExistence: async (mobile, excludeId = null) => {
        try {
            const response = await axiosInstance.post("/company/check-mobile-existence", { mobile, excludeId });
            return response.data;
        } catch (error) {
            console.error("Error checking company mobile existence:", error);
            throw error;
        }
    }
};

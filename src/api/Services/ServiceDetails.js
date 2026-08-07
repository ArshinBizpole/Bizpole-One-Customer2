import axiosInstance from "../axiosInstance";

/**
 * Fetch a single service detail by ID
 * @param {string|number} id - ServiceDetailID
 * @returns {Promise<Object>}
 */
export const getServiceDetailById = async (id) => {
    try {
        const response = await axiosInstance.get(`/service-details/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching service detail:", error);
        throw error;
    }
};
export const serviceFormMapping = async (id, orderId) => {

    try {
        const response = await axiosInstance.post(`/getServiceFormFullMapping`, { serviceId: id, orderId });

        return response.data;
    } catch (error) {
        console.error("Error fetching service form:", error);
        throw error;
    }
};


export const serviceFormSave = async (payload) => {

    try {
        const response = await axiosInstance.post(`/saveFormResponse`, payload);
        return response.data;
    } catch (error) {
        console.error("Error save the service form:", error);
        throw error;
    }
};

/**
 * Fetch tasks for a service detail
 * @param {Object} params - { serviceId, assignmentId }
 * @returns {Promise<Object>}
 */
export const getTasksByServiceAssignment = async (params) => {
    try {
        const response = await axiosInstance.post("/getTasksByServiceAssignment", params);
        return response.data;
    } catch (error) {
        console.error("Error fetching tasks:", error);
        throw error;
    }
};
/**
 * Fetch deliverables for a service detail
 * @param {string|number} id - ServiceDetailID
 * @returns {Promise<Object>}
 */
export const getServiceDeliverablesByServiceDetailId = async (id) => {
    try {
        const response = await axiosInstance.post("/getServiceDeliverablesByServiceDetailId", { serviceDetailedId: id, permanent: 1 });
        return response.data;
    } catch (error) {
        console.error("Error fetching deliverables:", error);
        throw error;
    }
};

/**
 * Fetch tasks for a service detail
 * @param {Object} params - { serviceDetailsId, employeeId, franchiseId }
 * @returns {Promise<Object>}
 */
export const getServiceTasks = async (params) => {
    try {
        const response = await axiosInstance.post("/getServiceTasks", params);
        return response.data;
    } catch (error) {
        console.error("Error fetching tasks:", error);
        throw error;
    }
};



/**
 * Fetch response fields for a company
 * @param {string|number} companyId 
 * @returns {Promise<Array>}
 */
export const getResponseFields = async (companyId) => {
    try {
        const response = await axiosInstance.post("/response-fields", {
            CompanyID: companyId,
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching response fields:", error);
        throw error;
    }
};
export const updateRejectedFields = async (payload) => {
    try {
        const response = await axiosInstance.post("/update-rejected-fields", payload);
        return response.data;
    } catch (error) {
        console.error("Error updating rejected fields:", error);
        throw error;
    }
};

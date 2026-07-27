import axiosInstance from "./axiosInstance";
import { setSecureItem, getSecureItem } from "../utils/secureStorage";

/**
 * 🔹 Add or Update Company
 * Stores CompanyID securely after successful upsert.
 */
export const upsertCompany = async (companyData) => {
  try {
    const response = await axiosInstance.post("/company/upsert", companyData);
    console.log("Upsert company response:", response.data);

    // ✅ Extract CompanyID from response (based on your actual response format)
    const companyId =
      response.data?.CompanyID || // Direct property
      response.data?.companyID || // camelCase variant
      response.data?.companyId || // mixed case
      response.data?.data?.CompanyID || // Nested in data object
      response.data?.data?.companyID;

    if (companyId) {
      // 🔐 Store it permanently in secure storage
      setSecureItem("CompanyId", companyId.toString());
      console.log("✅ CompanyId saved to secure storage:", companyId);
    } else {
      console.warn("⚠️ No CompanyId found in upsertCompany response. Response:", response.data);
    }

    return response.data;
  } catch (error) {
    console.error("❌ Error in upsertCompany:", error);
    throw error;
  }
};

/**
 * 🔹 Get Company Details
 */
export const getCompanyById = async (id) => {
  try {
    const companyId = id || getSecureItem("CompanyId"); 
    console.log("Using CompanyId for getCompanyById:", companyId);

    if (!companyId) throw new Error("CompanyId not found");

    const response = await axiosInstance.post("/company/get-details", {
      CompanyId: companyId,
    });

    return response.data;
  } catch (error) {
    console.error("❌ Error in getCompanyById:", error);
    throw error;
  }
};

/**
 * 🔹 Get Company Details by ID
 * Example payload:
 * {
 *   "CompanyId": 613
 * }
 */
export const getCompanyDetails = async (companyId) => {
  try {
    if (!companyId) {
      throw new Error("CompanyId is required to fetch company details");
    }

    const response = await axiosInstance.post("/company/get-details", {
      CompanyId: companyId,
    });

    console.log("✅ Response from getCompanyDetails:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error in getCompanyDetails:", error);
    throw error;
  }
};

/**
 * 🔹 Add or Update Registration & Compliance Status
 */
export const upsertRegistrationStatus = async (registrationStatusData) => {
  try {
    // 🧠 First try to get from secure storage
    let CompanyID = getSecureItem("CompanyId");
    if (!CompanyID) {
      CompanyID = localStorage.getItem("CompanyId");
      console.warn("⚠️ Fallback: Retrieved CompanyId from localStorage:", CompanyID);
    }
    if (!CompanyID) throw new Error("CompanyId not found in secure storage or localStorage");

    // If registrationStatusData is already a payload with CompanyID/registrationStatus, flatten it
    let registrationStatus = registrationStatusData;
    if (registrationStatusData && typeof registrationStatusData === 'object') {
      if ('registrationStatus' in registrationStatusData) {
        registrationStatus = registrationStatusData.registrationStatus;
      }
      // Remove CompanyID if present in registrationStatusData
      if ('CompanyID' in registrationStatus) {
        const { CompanyID: _omit, ...rest } = registrationStatus;
        registrationStatus = rest;
      }
    }

    const payload = {
      CompanyID: Number(CompanyID),
      registrationStatus
    };

    console.log("📤 Payload for upsertRegistrationStatus:", payload);

    const response = await axiosInstance.post(
      "/company/upsertRegistrationStatus",
      payload
    );

    console.log("✅ Response from upsertRegistrationStatus:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error in upsertRegistrationStatus:", error);
    throw error;
  }
};

export const getCompaniesByCustomerId = async (customerId) => {
    try {
        const response = await axiosInstance.post("/company/list-by-customer", {
            CustomerID: customerId,
        });
        return response.data;
    } catch (error) {
        console.error("❌ Error in getCompaniesByCustomerId:", error);
        throw error;
    }
};

/**
 * 🔹 Update Company Details (from CompanyDetails page)
 * Sends all editable fields for a given CompanyId.
 */
// ── Compliance APIs ───────────────────────────────────────────────────────────

export const getCompanyCompliances = async (companyId) => {
  try {
    const response = await axiosInstance.post("/company/compliances", { CompanyId: companyId });
    console.log("✅ Response from getCompanyCompliances:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error in getCompanyCompliances:", error);
    throw error;
  }
};

export const updateComplianceStatus = async (id, status) => {
  try {
    const response = await axiosInstance.post("/company/compliance/update-status", { id, status });
    console.log("✅ Response from updateComplianceStatus:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error in updateComplianceStatus:", error);
    throw error;
  }
};

export const getComplianceEvents = async (companyId) => {
  try {
    const response = await axiosInstance.post("/company/compliance/events", { CompanyId: companyId });
    console.log("✅ Response from getComplianceEvents:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error in getComplianceEvents:", error);
    throw error;
  }
};

export const updateCompanyDetails = async (companyId, fields) => {
  try {
    const response = await axiosInstance.post("/company/update-details", {
      CompanyId: companyId,
      ...fields,
    });
    console.log("✅ Response from updateCompanyDetails:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error in updateCompanyDetails:", error);
    throw error;
  }
};
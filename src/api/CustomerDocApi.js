import axiosInstance from "./axiosInstance";
import { getSecureItem } from "../utils/secureStorage";

// Helper function to safely get user data (same as in React component)
const getUserData = () => {
  try {
    const userStr = getSecureItem("user") || getSecureItem("partnerUser");

    // If userStr is already an object, return it directly
    if (typeof userStr === 'object' && userStr !== null) {
      return userStr;
    }

    // If it's a string, try to parse it
    if (typeof userStr === 'string') {
      // Clean the string if it contains :NULL
      const cleanStr = userStr.replace(/:NULL/g, ':null');
      return JSON.parse(cleanStr);
    }

    // Return empty object if nothing works
    return {};
  } catch (error) {
    console.error('Error parsing user data:', error);
    return {};
  }
};

/**
 * Upload a customer document
 * @param {string} type - 'PAN' | 'ADHAAR' | 'PassportPhoto'
 * @param {File} file - File object
 */
const uploadDocument = async (type, file) => {
  const userObj = getUserData();
  const customerId = userObj.CustomerID;

  if (!customerId) throw new Error('Customer ID not found');

  const formData = new FormData();
  formData.append("customerId", customerId);

  // Map type to correct API field
  if (type === "PAN") formData.append("PAN", file);
  if (type === "ADHAAR") formData.append("ADHAAR", file);
  if (type === "PassportPhoto") formData.append("PassportPhoto", file);

  try {
    const response = await axiosInstance.post("/customer-documents", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading document:", error);
    throw error;
  }
};

/**
 * Get all documents (Base64) for the current customer
 */
const getUploadedDocuments = async () => {
  const userObj = getUserData();
  const customerId = userObj.CustomerID;

  if (!customerId) throw new Error('Customer ID not found');

  try {
    const response = await axiosInstance.get(`/customer-documents/${customerId}`);
    // If API returns {success: false, message: 'Documents not found'}, treat as no docs
    if (response.data && response.data.success === false && response.data.message && response.data.message.toLowerCase().includes('not found')) {
      return {};
    }
    console.log('API Response:', response.data);

    return response.data;
  } catch (error) {
    // If error response is 'Documents not found', treat as no docs
    if (error.response && error.response.data && error.response.data.message && error.response.data.message.toLowerCase().includes('not found')) {
      return {};
    }
    console.error("Error fetching documents:", error);
    throw error;
  }
};


// _______________________________________

const postAllDocuments = async (filesObj) => {
  if (!filesObj) {
    console.error("postAllDocuments received:", filesObj);
    console.trace();
    return {};
  }

  const userObj = getUserData();
  const customerId = userObj?.CustomerID;

  console.log("CustomerID being sent:", customerId);

  if (!customerId) throw new Error('Customer ID not found');

  try {
    const formData = new FormData();

    const fieldMap = {
      PAN: "pan",
      ADHAAR: "aadhaar",
      PassportPhoto: "passportphoto"
    };

    for (const [type, file] of Object.entries(filesObj)) {
      if (file) {
        const backendField = fieldMap[type]; 
        if (!backendField) {
          console.warn("Unknown file type:", type);
          continue;
        }
        console.log("Appending:", backendField);
        formData.append(backendField, file);
      }
    }

    formData.append('customerId', customerId);

    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }

    const response = await axiosInstance.post(
      '/customer/upload-documents',
      formData
    );

    return response.data;
  } catch (error) {
    console.error('Error uploading documents:', error);
    throw error;
  }
};


// const getUploadedDocuments = async (customerId) => {
//   return axiosInstance.get(`/customer/documents/${customerId}`);
// };

// _______________________________________

/**
 * Get individual document (URL to view or download) for the current customer
 */
const getDocumentUrl = (docType, download = false) => {
  const userObj = getUserData();
  const customerId = userObj.CustomerID;

  if (!customerId) throw new Error('Customer ID not found');

  let url = `/customer-documents/${customerId}/${docType}`;
  if (download) url += "?download=1";
  return url;
};

/**
 * The current customer's own documents uploaded in the Start New Company /
 * Existing Company flows (a director matched to them by mobile, email or PAN,
 * or an unnamed applicant label). Returns { PAN, ADHAAR, PassportPhoto }, each
 * { url, fileName, companyId, uploadedAt } or null; `others` (other personal
 * files, e.g. Address Proof); and `ownLabels` ({ companyId, docLabel } of every
 * file counted as theirs).
 */
const getApplicationPersonalDocuments = async () => {
  const empty = { PAN: null, ADHAAR: null, PassportPhoto: null, others: [], ownLabels: [] };
  const customerId = getUserData().CustomerID;
  if (!customerId) return empty;
  try {
    const response = await axiosInstance.get(`/customer-documents/${customerId}/application-personal`);
    return { ...empty, ...(response.data?.data || {}) };
  } catch (error) {
    console.error("Error fetching application documents:", error);
    return empty;
  }
};

export default {
  uploadDocument,
  // getAllDocuments,
  getUploadedDocuments,
  getApplicationPersonalDocuments,
  postAllDocuments,
  getDocumentUrl,
};
import axiosInstance from "./axiosInstance";

// ✅ Fetch all paginated service names
export const getServices = async ({ page = 1, limit = 10, filter = "", categoryId = "" } = {}) => {
  const params = { page, limit, activeOnly: 1 };
  if (filter) params.filter = filter;
  if (categoryId) params.categoryId = categoryId;

  const res = await axiosInstance.get("/service-names", { params });
  return res.data;
};

// ✅ Fetch services for a specific category
export const getServicesByCategory = async (categoryId, { page = 1, limit = 2, filter = "" } = {}) => {
  if (!categoryId) return { data: [], total: 0 };
  // customerView: only services shown to customers, in the admin-set order
  const params = { page, limit, customerView: 1 };
  if (filter) params.filter = filter;

  const res = await axiosInstance.get(`/service-categories/${categoryId}`, { params });
  if (res.data?.data) {
    const { CategoryID, CategoryName, Services, pagination } = res.data.data;
    return {
      // Services here don't carry their category — attach it so the card badge shows
      data: (Services || []).map((s) => ({ ...s, Category: s.Category || { CategoryID, CategoryName } })),
      total: pagination?.total || (Services ? Services.length : 0)
    };
  }
  return { data: [], total: 0 };
};

// ✅ Fetch service categories
export const getServiceCategories = async () => {
  // Server pages at 10 by default — ask for all so older categories aren't cut off
  const res = await axiosInstance.get("/service-category", { params: { page: 1, limit: 100 } });
  return res.data;
};

// ✅ Fetch single service details (basic info)
export const getServiceById = async ({ ServiceId }) => {
  const res = await axiosInstance.post("/filterServices", { ServiceId });
  return res.data;
};

// Quote-page content set in the CRM's Service → Proposal step (whatYouGet, importantNotes, ...)
export const getServiceExtras = async (serviceId) => {
  const res = await axiosInstance.get(`/service-master-extras/${serviceId}`);
  return res.data?.data || null;
};

// ✅ Fetch all service prices for a state, and filter exact service price
export const getServicePrice = async ({ ServiceId, StateId }) => {
  try {
    if (!StateId || !ServiceId) {
      throw new Error("StateID and ServiceID are required.");
    }
    // Call bulk API endpoint
    const res = await axiosInstance.post("/service-price-currency/bulk", {
      StateID: StateId,
      ServiceIDs: [ServiceId],
      isIndividual: 1
    });
    const allPrices = res.data?.data || [];
    // Return first matching price object
    return {
      success: true,
      data: allPrices[0] || null,
      allPrices,
    };
  } catch (err) {
    console.error("Error fetching service price (bulk):", err);
    return { success: false, message: err.message };
  }
};

// ✅ Fetch service packages
export const getServicePackages = async (params) => {
  const res = await axiosInstance.get("/getPackage", { params });
  return res.data;
};

// Fetch price and currency for a service and state (GET, params: StateName, ServiceID)
export const getServicePriceCurrency = async ({ StateName, ServiceID }) => {
  try {
    const res = await axiosInstance.get("/service-price-currency", {
      params: { StateName, ServiceID }
    });
    return res.data;
  } catch (err) {
    console.error("Error fetching service price/currency:", err);
    return { success: false, message: err.message };
  }
};

export default {
  getServices,
  getServiceCategories,
  getServicesByCategory,
  getServiceById,
  getServiceExtras,
  getServicePrice,
  getServicePackages,
  getServicePriceCurrency,
};

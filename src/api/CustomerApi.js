import axios from "axios";
import axiosInstance from "./axiosInstance";
//
export const assignCustomer = async ({ language, state, district, salesOnly = false }) => {
  const res = await axiosInstance.post("/assignCustomer", {
    language,
    state,
    district,
    salesOnly,
  });
  return res.data;
};

// Custom axios instance for createCustomer
const customerAxios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api", // adjust as needed
  headers: {
    "x-origin": "website",
  },
});

// Customer APIs
export const createCustomer = (payload) =>
  customerAxios.post("/customer", payload);

export const getCustomers = () => axiosInstance.get("/customer");

export const getCustomerById = (id, employeeId) =>
  axiosInstance.post("/customer/get", { CustomerID: id, EmployeeID: employeeId });

export const deleteCustomer = (id) =>
  axiosInstance.delete(`/customer/${id}`);

export const getCustomerDocuments = (id) =>
  axiosInstance.get(`/customer/documents/${id}`);

export const uploadCustomerDocuments = (formData) =>
  axiosInstance.post("/customer/upload-documents", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

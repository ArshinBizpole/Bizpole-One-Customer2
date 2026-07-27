import axios from "axios";
import { clearSession } from "../utils/authSession";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // headers: {
  //   "Content-Type": "application/json",
  // },
});


export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // your backend
});


// Add interceptor to inject token from localStorage
const attachToken = (config) => {
  const token = localStorage.getItem("partnerToken") || localStorage.getItem("token")
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
};

// Fallback for when the client-side expiry timer (useAutoLogout) hasn't fired yet —
// e.g. a background tab whose setTimeout got throttled, or clock skew vs. the server.
// Only force-logout if a session token actually existed; an unauthenticated 401 (e.g. a
// failed OTP/login attempt) should just surface as a normal error, not a redirect.
const handleAuthError = (error) => {
  const status = error.response?.status;
  if (status === 401 || status === 403) {
    const hadToken = localStorage.getItem("token") || localStorage.getItem("partnerToken");
    if (hadToken) {
      clearSession();
      window.location.assign("/");
    }
  }
  return Promise.reject(error);
};

axiosInstance.interceptors.request.use(attachToken, (error) => Promise.reject(error));
axiosInstance.interceptors.response.use((response) => response, handleAuthError);

api.interceptors.request.use(attachToken, (error) => Promise.reject(error));
api.interceptors.response.use((response) => response, handleAuthError);

export default axiosInstance;

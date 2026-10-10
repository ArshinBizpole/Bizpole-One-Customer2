import axiosInstance from "./axiosInstance";


export const loginWithPhone = async (phone) => {
  try {
    const response = await axiosInstance.post("/websitelogin", { phone });
    return response.data.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const signupWithPhone = async (name, email, phone) => {
  try {
    const response = await axiosInstance.post("/website-signup", { name, email, phone });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const verifyOtp = async (phone, otp) => {
  try {
    const response = await axiosInstance.post("/verify-website-otp", { phone, otp });
    // Return the correct data structure
    if (response.data && response.data.data) {
      return response.data.data;
    } else if (response.data) {
      return response.data;
    } else {
      return response;
    }
  } catch (error) {
    throw error.response?.data || error;
  }
};



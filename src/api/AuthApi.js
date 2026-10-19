import axiosInstance from "./axiosInstance";


export const loginWithPhone = async (phone) => {
  try {
    const response = await axiosInstance.post("/websitelogin", { phone });
    return response.data.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// `referralToken` = stored referral scan token (see utils/referralAttribution); omitted when absent.
// state: the customer's state — saved on the Customer and used to pick the
// franchisee serving it (the server no longer assumes Kerala / franchisee 1).
export const signupWithPhone = async (name, email, phone, referralToken, state) => {
  try {
    const body = { name, email, phone };
    if (referralToken) body.referralToken = referralToken;
    if (state) body.state = state;
    const response = await axiosInstance.post("/website-signup", body);
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



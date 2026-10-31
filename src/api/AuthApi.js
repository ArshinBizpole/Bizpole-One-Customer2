import axiosInstance from "./axiosInstance";
import { getLeadAttribution } from "../utils/leadAttribution";


export const loginWithPhone = async (phone) => {
  try {
    const response = await axiosInstance.post("/websitelogin", { phone });
    // { success, message, emailSent, smsSent, maskedMobile } — the OTP screen
    // shows the masked mobile only when smsSent.
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// `referralToken` = stored referral scan token (see utils/referralAttribution); omitted when absent.
// state / language: the customer's state and preferred language — saved on the
// Customer and used to route their Lead to a BDE (as for a Facebook lead).
// service: what they came for (e.g. "Trademark Registration") — the Lead's service.
export const signupWithPhone = async (name, email, phone, referralToken, state, language, service) => {
  try {
    const body = { name, email, phone };
    if (referralToken) body.referralToken = referralToken;
    if (state) body.state = state;
    if (language) body.language = language;
    if (service) body.service = service;
    const attribution = getLeadAttribution();
    if (attribution) body.attribution = attribution;
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



// Sign in with the one-tap link sent on WhatsApp (document upload links).
// Returns { token, user, companyId, redirectPath, redirectState }.
export const magicLogin = async (token) => {
  try {
    const response = await axiosInstance.post("/whatsapp-bot/magic-login", { token });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

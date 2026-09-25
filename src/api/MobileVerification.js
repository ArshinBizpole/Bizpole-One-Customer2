import axiosInstance from "./axiosInstance";

// Real SMS OTP (Brevo Transactional SMS, DLT-registered sender — see
// BREVO_SMS_SENDER on the server) — src/routes/MobileVerification/mobileVerificationRoutes.js
export const sendMobileOtp = async (mobile, purpose = "general") => {
  const res = await axiosInstance.post("/mobile-otp/send", { mobile, purpose });
  return res.data;
};

export const verifyMobileOtp = async (mobile, otp) => {
  const res = await axiosInstance.post("/mobile-otp/verify", { mobile, otp });
  return res.data;
};

export default { sendMobileOtp, verifyMobileOtp };

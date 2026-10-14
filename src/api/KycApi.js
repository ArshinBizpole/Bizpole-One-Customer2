import axiosInstance from "./axiosInstance";

// PAN / Aadhaar verification through our backend (Bizpole-One-Server:
// src/routes/kycRoutes.js → Sandbox KYC). Each call carries the customer's
// consent, given via the tick box next to the field. Errors come back as
// { success: false, message } so the UI can show the server's reason.
const call = async (path, body) => {
  try {
    const res = await axiosInstance.post(path, body);
    return res.data;
  } catch (err) {
    return { success: false, message: err.response?.data?.message || "Verification failed. Please try again." };
  }
};

// { pan, name?, dob? (yyyy-mm-dd) } → { valid, nameMatch, dobMatch, aadhaarLinked, passed, … }
export const verifyPan = ({ pan, name, dob }) => call("/api/kyc/pan/verify", { pan, name, dob, consent: true });

// Sends an OTP to the Aadhaar-linked mobile → { referenceId }
export const sendAadhaarOtp = (aadhaar) => call("/api/kyc/aadhaar/otp", { aadhaar, consent: true });

// → { name, dob (yyyy-mm-dd), gender, address, district, state, pincode, photo }
export const verifyAadhaarOtp = (referenceId, otp) => call("/api/kyc/aadhaar/verify", { referenceId, otp });

// Whether this number already passed a check (no new check, no charge):
// { pan, name, dob } or { aadhaar } → { verified, aadhaarLinked? }
export const kycStatus = (body) => call("/api/kyc/status", body);

export default { verifyPan, sendAadhaarOtp, verifyAadhaarOtp, kycStatus };

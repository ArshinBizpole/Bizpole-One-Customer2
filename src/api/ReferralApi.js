import axios from "axios";
import { clearSession } from "../utils/authSession";
import { clearAffiliateSession, getAffiliateToken } from "../utils/affiliateSession";

// Referral & Affiliate Programme API.
//
// Uses its own axios instance (no shared interceptors) so the caller states explicitly
// which session a `/referrals/me/*` call belongs to — the shared axiosInstance attaches
// `partnerToken || token`, which is wrong for affiliates and for a browser holding more
// than one session.

const http = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

export const REFERRER_ROLES = ["customer", "partner", "affiliate"];

const TOKEN_KEY_BY_ROLE = {
  customer: "token",
  partner: "partnerToken",
};

const tokenForRole = (role) => {
  if (role === "affiliate") return getAffiliateToken();
  const key = TOKEN_KEY_BY_ROLE[role];
  if (!key) throw new Error(`Unknown referrer role: ${role}`);
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const authHeaders = (role) => {
  const token = tokenForRole(role);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Customer calls must carry the company they act for (query for GET, body for POST).
const withCompany = (role, companyId, extra = {}) =>
  role === "customer" ? { companyId, ...extra } : { ...extra };

const toError = (error) => {
  const data = error?.response?.data;
  const message =
    (data && typeof data === "object" && data.message) ||
    error?.message ||
    "Something went wrong";
  const err = new Error(message);
  err.status = error?.response?.status;
  err.code = data?.code;
  return err;
};

// 401 = the session for THAT role is dead. Affiliate: clear only the affiliate session.
// Customer/partner: same behaviour as the shared interceptor (clear + go home).
const handleSessionError = (role, error) => {
  if (error?.response?.status !== 401) return;
  if (role === "affiliate") {
    clearAffiliateSession();
  } else {
    clearSession();
    window.location.assign("/");
  }
};

const unwrap = (res) => res?.data?.data;

const meRequest = async (role, config) => {
  try {
    const res = await http.request({
      ...config,
      headers: { ...(config.headers || {}), ...authHeaders(role) },
    });
    return res;
  } catch (error) {
    handleSessionError(role, error);
    throw toError(error);
  }
};

const publicRequest = async (config) => {
  try {
    const res = await http.request(config);
    return unwrap(res);
  } catch (error) {
    throw toError(error);
  }
};

// ─── Public ──────────────────────────────────────────────────────────────────

// `isQr` → ?c=q (a QR scan); otherwise it is a shared link.
export const resolveReferralCode = (code, { isQr = false, timeout = 6000 } = {}) =>
  publicRequest({
    method: "get",
    url: `/referrals/public/resolve/${encodeURIComponent(code)}`,
    params: isQr ? { c: "q" } : undefined,
    timeout,
  });

export const resolveLegacyRef = (ref, { timeout = 6000 } = {}) =>
  publicRequest({ method: "post", url: "/referrals/public/legacy", data: { ref }, timeout });

export const getProgramme = () =>
  publicRequest({ method: "get", url: "/referrals/public/programme" });

export const affiliateSignup = ({ name, mobile, email, acceptTerms, website = "" }) =>
  publicRequest({
    method: "post",
    url: "/referrals/public/affiliate/signup",
    data: { name, mobile, email, acceptTerms, website },
  });

export const affiliateRequestOtp = (email) =>
  publicRequest({ method: "post", url: "/referrals/public/affiliate/request-otp", data: { email } });

export const affiliateVerifyOtp = (email, otp) =>
  publicRequest({ method: "post", url: "/referrals/public/affiliate/verify-otp", data: { email, otp } });

// ─── Referrer self-service (/referrals/me/*) ─────────────────────────────────

export const getReferralMe = async (role, companyId) =>
  unwrap(
    await meRequest(role, {
      method: "get",
      url: "/referrals/me",
      params: withCompany(role, companyId),
    })
  );

export const getMyReferrals = async (role, companyId, { page = 1, limit = 10 } = {}) =>
  unwrap(
    await meRequest(role, {
      method: "get",
      url: "/referrals/me/referrals",
      params: withCompany(role, companyId, { page, limit }),
    })
  );

export const getMyLedger = async (role, companyId, { page = 1, limit = 10 } = {}) =>
  unwrap(
    await meRequest(role, {
      method: "get",
      url: "/referrals/me/ledger",
      params: withCompany(role, companyId, { page, limit }),
    })
  );

// Raw QR image as a Blob (png or svg).
export const getMyQrBlob = async (role, companyId, { format = "png", size = 1024 } = {}) => {
  const res = await meRequest(role, {
    method: "get",
    url: "/referrals/me/qr",
    params: withCompany(role, companyId, { format, size }),
    responseType: "blob",
  });
  return { blob: res.data, disposition: res.headers?.["content-disposition"] };
};

const filenameFromDisposition = (disposition) => {
  if (!disposition) return null;
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
    } catch {
      // fall through to plain filename
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain ? plain[1].trim() : null;
};

// Fetches the QR and triggers a browser download.
export const downloadMyQr = async (role, companyId, { format = "png", size = 1024 } = {}) => {
  const { blob, disposition } = await getMyQrBlob(role, companyId, { format, size });
  const filename =
    filenameFromDisposition(disposition) ||
    `bizpole-referral-qr${format === "png" ? `-${size}` : ""}.${format}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Partner / affiliate only.
export const submitMyKyc = async (
  role,
  { panNumber, accountHolderName, accountNumber, ifsc, bankName, documentUrl }
) => {
  if (role === "customer") throw new Error("KYC applies to partners and affiliates only");
  const data = { panNumber, accountHolderName, accountNumber, ifsc, bankName };
  if (documentUrl) data.documentUrl = documentUrl;
  return unwrap(await meRequest(role, { method: "post", url: "/referrals/me/kyc", data }));
};

export default {
  resolveReferralCode,
  resolveLegacyRef,
  getProgramme,
  affiliateSignup,
  affiliateRequestOtp,
  affiliateVerifyOtp,
  getReferralMe,
  getMyReferrals,
  getMyLedger,
  getMyQrBlob,
  downloadMyQr,
  submitMyKyc,
};

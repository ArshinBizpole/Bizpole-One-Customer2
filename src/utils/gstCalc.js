import axios from "../api/axiosInstance";

// Fetch a franchisee's GST eligibility (registered AND not on Composition scheme) and state.
// GET /franchisee/:id is a public endpoint (no auth) that exposes FranchiseeMaster directly.
export const fetchFranchiseeGstInfo = async (franchiseeId) => {
  try {
    const res = await axios.get(`/franchisee/${franchiseeId}`);
    const data = res?.data?.data;
    if (!data) return { gstEligible: false, state: "" };
    const isRegistered = Number(data.GSTRegistered) === 1;
    const isComposition = String(data.GSTSchemeType || "").trim().toLowerCase() === "composition";
    return { gstEligible: isRegistered && !isComposition, state: data.State || "" };
  } catch {
    return { gstEligible: false, state: "" };
  }
};

// GST base is ProfessionalFee + VendorFee only, 18%, rounded to a whole rupee.
export const calcGstAmount = (professionalFee, vendorFee, gstEligible) => {
  const gstExact = gstEligible ? (Number(professionalFee) + Number(vendorFee)) * 0.18 : 0;
  return Math.round(gstExact);
};

// Same-state -> CGST+SGST split; different-state -> IGST. Always sums back to gstAmount exactly.
export const splitGst = (gstAmount, sellerState, buyerState) => {
  if (!gstAmount) return { cgst: 0, sgst: 0, igst: 0 };
  if (sellerState && buyerState && sellerState === buyerState) {
    const cgst = Math.floor(gstAmount / 2);
    return { cgst, sgst: gstAmount - cgst, igst: 0 };
  }
  return { cgst: 0, sgst: 0, igst: gstAmount };
};

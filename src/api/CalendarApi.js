import axiosInstance from "./axiosInstance";

// The signed-in customer's call-back follow-ups for the Calendar:
// [{ id, source: "deal" | "lead", followUpDate, remark, status }]
export const getMyCallbacks = async () => {
  try {
    const res = await axiosInstance.get("/website/my-callbacks");
    return Array.isArray(res.data?.data) ? res.data.data : [];
  } catch (error) {
    console.error("Error fetching call-backs:", error);
    return [];
  }
};

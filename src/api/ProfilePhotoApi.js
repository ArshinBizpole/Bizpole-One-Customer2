import axiosInstance from "./axiosInstance";

// Signed-in customer's profile photo (server: Website/routes/Profile/profilePhotoRoutes.js).
// Both return { success, data?, message? } and never throw.
export const uploadProfilePhoto = async (blob) => {
  const form = new FormData();
  form.append("photo", blob, "profile.jpg");
  try {
    const res = await axiosInstance.post("/website/profile-photo", form, { headers: { "Content-Type": "multipart/form-data" } });
    return res.data;
  } catch (err) {
    return { success: false, message: err.response?.data?.message || "Couldn't upload your photo. Please try again." };
  }
};

export const removeProfilePhoto = async () => {
  try {
    const res = await axiosInstance.delete("/website/profile-photo");
    return res.data;
  } catch (err) {
    return { success: false, message: err.response?.data?.message || "Couldn't remove your photo. Please try again." };
  }
};

export default { uploadProfilePhoto, removeProfilePhoto };

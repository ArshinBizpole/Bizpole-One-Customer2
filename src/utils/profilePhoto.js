import { getSecureItem, setSecureItem } from "./secureStorage";

// The signed-in customer's profile photo URL (Customer.ProfileImage).
export const userPhoto = (user) => user?.ProfileImage || user?.profileImage || "";

// Keep the stored user in step after an upload/remove so every header shows
// the new photo at once, and tell open components (ProfileMenu) to re-read it.
export function saveUserPhoto(url) {
  try {
    const raw = getSecureItem("user");
    const user = typeof raw === "string" ? JSON.parse(raw.replace(/:NULL/g, ":null")) : raw;
    if (user) setSecureItem("user", JSON.stringify({ ...user, ProfileImage: url || null, profileImage: url || null }));
  } catch {
    // stored user unreadable — the next sign-in brings the photo back anyway
  }
  window.dispatchEvent(new Event("profile-photo-changed"));
}

// Centre-crops an image (File / Blob / video frame source) to a square and
// scales it to `size` px as a JPEG — keeps camera shots well under the 2 MB cap.
export function squareJpeg(source, size = 512) {
  const draw = (img, w, h) => {
    const side = Math.min(w, h);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    canvas.getContext("2d").drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size);
    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process the photo"))), "image/jpeg", 0.88)
    );
  };
  if (source instanceof HTMLVideoElement) return draw(source, source.videoWidth, source.videoHeight);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => {
      draw(img, img.naturalWidth, img.naturalHeight).then(resolve, reject).finally(() => URL.revokeObjectURL(url));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't an image we can read"));
    };
    img.src = url;
  });
}

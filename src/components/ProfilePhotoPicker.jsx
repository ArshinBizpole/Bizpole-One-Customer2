import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, Trash2, X, RefreshCw } from "lucide-react";
import { uploadProfilePhoto, removeProfilePhoto } from "../api/ProfilePhotoApi";
import { saveUserPhoto, squareJpeg } from "../utils/profilePhoto";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/* ---------------------------------------------------------------------------
   Camera button on the profile photo → menu: Take photo (webcam / phone
   camera, live preview, Capture → Use photo / Retake), Upload from device,
   Remove photo. Every photo is centre-cropped to a square and resized before
   upload; on success the stored user is updated so all headers show it.
   `onChange(url | "")` lets the page update its own copy.
--------------------------------------------------------------------------- */
export default function ProfilePhotoPicker({ hasPhoto, onChange, className = "" }) {
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [camOpen, setCamOpen] = useState(false);
  const [shot, setShot] = useState(null); // { blob, url } captured, awaiting confirm
  const fileRef = useRef(null);
  const phoneCamRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  useEffect(() => () => stopCamera(), []);

  async function save(blob) {
    setBusy(true);
    setError("");
    const res = await uploadProfilePhoto(blob);
    setBusy(false);
    if (!res?.success) return setError(res?.message || "Couldn't upload your photo.");
    saveUserPhoto(res.data.url);
    onChange?.(res.data.url);
  }

  async function fromFile(file) {
    if (!file) return;
    if (!TYPES.includes(file.type) && !file.type.startsWith("image/")) return setError("Use a JPG, PNG or WEBP image.");
    if (file.size > 15 * 1024 * 1024) return setError("That image is too large.");
    try {
      const blob = await squareJpeg(file);
      if (blob.size > MAX_BYTES) return setError("Photo must be 2 MB or smaller.");
      await save(blob);
    } catch (e) {
      setError(e.message);
    }
  }

  async function openCamera() {
    setMenu(false);
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      // No webcam API (older phones / browsers) — use the phone's camera picker.
      phoneCamRef.current?.click();
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 } }, audio: false });
      setShot(null);
      setCamOpen(true);
    } catch (e) {
      setError(e?.name === "NotAllowedError"
        ? "Camera access is blocked. Allow it in your browser, or use Upload from device."
        : "No camera found. Use Upload from device instead.");
    }
  }

  // Attach the stream once the modal's <video> exists.
  useEffect(() => {
    if (camOpen && !shot && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [camOpen, shot]);

  async function capture() {
    try {
      const blob = await squareJpeg(videoRef.current);
      setShot({ blob, url: URL.createObjectURL(blob) });
    } catch (e) {
      setError(e.message);
    }
  }

  function closeCamera() {
    stopCamera();
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
    setCamOpen(false);
  }

  async function usePhoto() {
    const blob = shot.blob;
    closeCamera();
    await save(blob);
  }

  async function remove() {
    setMenu(false);
    setBusy(true);
    setError("");
    const res = await removeProfilePhoto();
    setBusy(false);
    if (!res?.success) return setError(res?.message || "Couldn't remove your photo.");
    saveUserPhoto("");
    onChange?.("");
  }

  return (
    <div ref={boxRef} className={className}>
      <button
        type="button"
        onClick={() => !busy && setMenu((v) => !v)}
        title="Change profile photo"
        className="relative z-10 bg-yellow-400 hover:bg-yellow-500 text-gray-900 w-10 h-10 rounded-full flex items-center justify-center border-[3px] border-white shadow-lg ring-1 ring-black/5 transition hover:scale-105"
      >
        {busy ? <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" /> : <Camera size={18} strokeWidth={2.5} />}
      </button>

      {menu && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-52 rounded-xl bg-white shadow-xl border border-gray-100 py-1 text-sm text-gray-700">
          <button type="button" onClick={openCamera} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-yellow-50">
            <Camera size={16} className="text-yellow-600" /> Take photo
          </button>
          <button type="button" onClick={() => { setMenu(false); fileRef.current?.click(); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-yellow-50">
            <ImageUp size={16} className="text-yellow-600" /> Upload from device
          </button>
          {hasPhoto && (
            <button type="button" onClick={remove} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600">
              <Trash2 size={16} /> Remove photo
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 text-[11px] text-center text-red-600 bg-white rounded-md shadow px-2 py-1 z-40"
          onClick={() => setError("")}>
          {error}
        </p>
      )}

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => { fromFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={phoneCamRef} type="file" accept="image/*" capture="user" className="hidden"
        onChange={(e) => { fromFile(e.target.files?.[0]); e.target.value = ""; }} />

      {camOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={closeCamera}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Take a profile photo</h3>
              <button type="button" onClick={closeCamera} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-900">
              {shot ? (
                <img src={shot.url} alt="Captured" className="w-full h-full object-cover" />
              ) : (
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover -scale-x-100" />
              )}
              <div className="pointer-events-none absolute inset-6 rounded-full border-2 border-white/70" />
            </div>
            <div className="mt-4 flex gap-2">
              {shot ? (
                <>
                  <button type="button" onClick={() => { URL.revokeObjectURL(shot.url); setShot(null); }}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50">
                    <RefreshCw size={15} /> Retake
                  </button>
                  <button type="button" onClick={usePhoto}
                    className="flex-1 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-sm font-semibold">
                    Use photo
                  </button>
                </>
              ) : (
                <button type="button" onClick={capture}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-sm font-semibold">
                  <Camera size={16} /> Capture
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

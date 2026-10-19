import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, BookOpen, ChevronRight, ExternalLink, Layers, LogOut, UserRound } from "lucide-react";
import { JOURNL_URL, openExternal } from "../utils/externalLinks";
import { getSecureItem } from "../utils/secureStorage";
import { userPhoto } from "../utils/profilePhoto";
import { clearStorageKeepingApplications } from "../utils/applicationPrefill";
import { notifySessionCleared } from "../utils/authSession";
import ConfirmMsg from "./ConfirmMsg";

function readUser() {
  try {
    const raw = getSecureItem("user");
    return typeof raw === "string" ? JSON.parse(raw.replace(/:NULL/g, ":null")) : raw;
  } catch {
    return null;
  }
}

// Header profile picture + its popup card: the signed-in customer's name,
// email and photo (initials when there's none), Account Settings, the two
// platforms and Log out. Opens on click only (no hover);
// closes on an outside click or Esc. Shared by every header (dashboard,
// profile pages, public site); Log out asks for confirmation, then clears the
// session (keeping in-progress applications) and returns to the home page.
export default function ProfileMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const boxRef = useRef(null);

  const user = readUser() || {};
  const name = `${user.FirstName || user.firstName || ""} ${user.LastName || user.lastName || ""}`.trim() || "Customer";
  const email = user.Email || user.email || "";
  const photo = userPhoto(user);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "C";
  const signedIn = !!localStorage.getItem("token");
  const hasCompany = !!getSecureItem("selectedCompany") || (Array.isArray(user.Companies) && user.Companies.length > 0);

  // Platform logos live in public/Images/platforms/ — until a file is there the
  // placeholder icon shows instead (see PlatformLogo).
  const platforms = [
    { name: "Compass", desc: "Business Advisory & Consulting", logo: "/Images/platforms/compass.jpg", icon: Layers, path: "/dashboard/bizpoleone",
      badge: hasCompany ? { text: "Active", cls: "bg-green-50 text-green-700", dot: "bg-green-500" } : null },
    // Its own site — opens in a new tab (href instead of an in-app path).
    { name: "Journl", desc: "Accounting & Bookkeeping", logo: "/Images/platforms/journl.jpg", icon: BookOpen, href: JOURNL_URL },
  ];

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Re-read the stored user when the profile photo is changed elsewhere.
  const [, setPhotoTick] = useState(0);
  useEffect(() => {
    const onPhoto = () => setPhotoTick((t) => t + 1);
    window.addEventListener("profile-photo-changed", onPhoto);
    return () => window.removeEventListener("profile-photo-changed", onPhoto);
  }, []);

  const go = (path) => { setOpen(false); navigate(path); };

  const avatar = (size, ring) => (
    <span className={`flex items-center justify-center rounded-full overflow-hidden bg-yellow-100 text-yellow-800 font-bold ${size} ${ring}`}>
      {photo ? <img src={photo} alt={name} className="w-full h-full object-cover" /> : initials}
    </span>
  );

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        title="Your account"
        className="flex items-center rounded-full shadow focus:outline-none focus:ring-2 focus:ring-yellow-400"
      >
        {avatar("w-9 h-9 text-sm", "ring-2 ring-yellow-400 ring-offset-2 ring-offset-white")}
      </button>

      {open && (
        <div
          className="absolute top-full mt-4 z-50 w-[340px] max-w-[calc(100vw-32px)]"
          style={{
            right: -10,
            // One filter over card + spike so they cast a single seamless shadow;
            // the faint 0-offset shadow outlines the shape on white pages.
            filter:
              "drop-shadow(0 0 1px rgba(15, 23, 42, 0.14)) drop-shadow(0 10px 18px rgba(15, 23, 42, 0.10)) drop-shadow(0 24px 48px rgba(15, 23, 42, 0.18))",
          }}
        >
          {/* Spike: a soft rounded point flowing into the card's flat top edge
              (the top-right corner is kept tight so the spike never sits on the
              curve). Tip at 28px from the card's right = centre of the 36px
              profile picture, given the card's -10px right offset. */}
          <svg
            aria-hidden="true"
            width="32" height="16" viewBox="0 0 32 16"
            className="absolute -top-[14px]"
            style={{ right: 12 }}
          >
            <path d="M0 16 C8 16 10.5 12.5 13 7 Q16 0 19 7 C21.5 12.5 24 16 32 16 Z" fill="#fff" />
          </svg>
          <div className="relative bg-white rounded-[30px] rounded-tr-[10px] p-5">
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
              {avatar("w-16 h-16 text-xl flex-none", "ring-4 ring-yellow-400 ring-offset-2")}
              <div className="min-w-0">
                <div className="text-lg font-bold text-gray-900 truncate">{name}</div>
                {email && <div className="text-sm text-gray-500 truncate">{email}</div>}
                {signedIn && (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                    <BadgeCheck className="w-4 h-4 text-teal-600" /> Account Verified
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => go("/profile")}
              className="w-full flex items-center gap-3 py-3 border-b border-gray-100 text-left hover:bg-gray-50 rounded-lg px-1"
            >
              <span className="w-10 h-10 flex-none rounded-xl bg-teal-50 flex items-center justify-center">
                <UserRound className="w-5 h-5 text-yellow-500" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-gray-900">Account Settings</span>
                <span className="block text-xs text-gray-500">Manage your account</span>
              </span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <div className="pt-3">
              <div className="text-sm font-bold text-teal-700 mb-2">Platforms</div>
              <div className="space-y-2">
                {platforms.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      if (!p.href) return go(p.path);
                      setOpen(false);
                      openExternal(p.href);
                    }}
                    className="w-full flex items-center gap-3 rounded-xl border border-gray-100 shadow-sm px-3 py-2.5 text-left hover:border-yellow-300 hover:bg-yellow-50/40"
                  >
                    <span className="w-9 h-9 flex-none rounded-lg bg-gray-50 flex items-center justify-center">
                      <PlatformLogo src={p.logo} Fallback={p.icon} name={p.name} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-gray-900">{p.name}</span>
                      <span className="block text-xs text-gray-500 truncate">{p.desc}</span>
                    </span>
                    {p.badge && (
                      <span className={`flex-none inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.badge.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.badge.dot}`} /> {p.badge.text}
                      </span>
                    )}
                    {p.href && <ExternalLink className="w-4 h-4 flex-none text-gray-400" aria-label="Opens in a new tab" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setOpen(false); setConfirmLogout(true); }}
              className="mt-4 w-full flex items-center gap-3 rounded-xl bg-red-50 hover:bg-red-100 px-3 py-3 text-left"
            >
              <LogOut className="w-6 h-6 text-red-500 flex-none" />
              <span>
                <span className="block text-sm font-semibold text-red-600">Log out</span>
                <span className="block text-xs text-gray-500">Sign out from your account</span>
              </span>
            </button>
          </div>
        </div>
      )}

      <ConfirmMsg
        open={confirmLogout}
        title="Logout"
        message="Do you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={() => {
          setConfirmLogout(false);
          clearStorageKeepingApplications();
          notifySessionCleared();
          navigate("/");
        }}
        onCancel={() => setConfirmLogout(false)}
        showCancel={true}
        variant="delete"
      />
    </div>
  );
}

// A platform's logo image, or its placeholder icon if the file is missing.
function PlatformLogo({ src, Fallback, name }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) return <Fallback className="w-5 h-5 text-teal-700" />;
  return <img src={src} alt={name} className="w-7 h-7 object-contain mix-blend-multiply" onError={() => setFailed(true)} />;
}

import { useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import {
  AFFILIATE_SESSION_CLEARED,
  clearAffiliateSession,
  getAffiliateUser,
  hasValidAffiliateSession,
} from "../../utils/affiliateSession";

// Guard + chrome for the affiliate portal. Checks ONLY the affiliate session — a customer
// `token` or partner `partnerToken` must not let someone into (or out of) this area.
const AffiliateLayout = () => {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(hasValidAffiliateSession);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const user = getAffiliateUser() || {};

  useEffect(() => {
    const onCleared = () => setAuthed(false);
    const onStorage = (e) => {
      if (e.key === "affiliateToken" || e.key === null) setAuthed(hasValidAffiliateSession());
    };
    window.addEventListener(AFFILIATE_SESSION_CLEARED, onCleared);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(AFFILIATE_SESSION_CLEARED, onCleared);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (!authed) return <Navigate to="/affiliate" replace />;

  const logout = () => {
    clearAffiliateSession();
    navigate("/affiliate", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate("/")} className="flex items-center gap-2">
            <img src="/Images/logo.webp" alt="Bizpole" className="h-8" />
            <span className="hidden rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-bold text-yellow-800 sm:inline">
              Affiliate
            </span>
          </button>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-gray-800">{user.name || "Affiliate"}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            {confirmLogout ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Log out?</span>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmLogout(false)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmLogout(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            )}
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
};

export default AffiliateLayout;

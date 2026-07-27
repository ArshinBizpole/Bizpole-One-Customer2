import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession, getSessionExpiryMs, isSessionExpired } from "../utils/authSession";

// setTimeout only accepts a 32-bit signed int (~24.8 days) — cap so a long-lived token
// doesn't overflow into firing immediately.
const MAX_TIMEOUT_MS = 2_147_483_647;

// Logs the user out automatically once their JWT's `exp` claim passes — no fixed "24h from
// login" counter is kept client-side; it reads the real expiry embedded in whichever token
// is active (customer OTP login = 1 day, partner/associate login = 8h, etc.), so it stays
// correct if the server-side expiry ever changes.
export default function useAutoLogout() {
  const navigate = useNavigate();

  useEffect(() => {
    let timeoutId;

    const forceLogout = () => {
      clearTimeout(timeoutId);
      clearSession();
      navigate("/", { replace: true });
    };

    const scheduleCheck = () => {
      clearTimeout(timeoutId);
      if (isSessionExpired()) {
        forceLogout();
        return;
      }
      const expiry = getSessionExpiryMs();
      if (expiry === null) return; // no active token, or it has no exp claim to watch
      const msRemaining = Math.min(expiry - Date.now(), MAX_TIMEOUT_MS);
      timeoutId = setTimeout(forceLogout, msRemaining);
    };

    scheduleCheck();

    // Re-arm whenever a new token is issued (login) or storage changes in another tab.
    window.addEventListener("auth-token-set", scheduleCheck);
    window.addEventListener("storage", scheduleCheck);

    // Background tabs throttle long setTimeouts — re-check as soon as the tab is visible
    // again rather than relying solely on the (possibly delayed) timer firing.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") scheduleCheck();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("auth-token-set", scheduleCheck);
      window.removeEventListener("storage", scheduleCheck);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [navigate]);
}

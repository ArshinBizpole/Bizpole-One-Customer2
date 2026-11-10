// Shared login with Bizpole Virtual Office.
//
// The API also keeps the session in an httpOnly cookie on the parent domain
// (.bizpole.io), so signing in on either app signs you in on both:
//  - restoreSharedSession(): on app load with no local token, picks up a session
//    started on Virtual Office and stores it exactly like the sign-in modal does.
//  - endSharedSession(): on logout / expiry, ends the shared cookie as well.
import axios from "axios";
import { notifyTokenSet } from "./authSession";
import { setSecureItem } from "./secureStorage";

const API = import.meta.env.VITE_API_BASE_URL;

/** Virtual Office customer site, for the app switcher. */
export const VO_URL = import.meta.env.VITE_VO_URL || "https://vo.bizpole.io";

export async function restoreSharedSession({ timeoutMs = 2500 } = {}) {
  if (!API || localStorage.getItem("token") || localStorage.getItem("partnerToken")) return false;
  try {
    // Plain axios: no Authorization header and no forced-logout interceptor.
    const { data } = await axios.get(`${API}/sso/customer-session`, { withCredentials: true, timeout: timeoutMs });
    if (!data?.token) return false;
    localStorage.setItem("token", data.token);
    if (data.user) setSecureItem("user", JSON.stringify(data.user));
    notifyTokenSet();
    return true;
  } catch {
    return false; // 401 = no shared session; anything else: carry on signed out
  }
}

export function endSharedSession() {
  if (!API) return;
  try {
    // keepalive: still sent when the page navigates away right after logout.
    fetch(`${API}/sso/logout`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ realm: "customer" }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

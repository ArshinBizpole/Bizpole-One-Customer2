import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resolveLegacyRef } from "../api/ReferralApi";
import { purgeLegacyReferralKeys, storeReferralScan } from "../utils/referralAttribution";

// App-wide handling of pre-programme `?ref=` links (replaces the old Navbar code that
// copied any ?ref= value into localStorage.PartnerID).
//  - the value is sent to POST /referrals/public/legacy; only a valid answer stores a scan token
//  - `ref` is stripped from the URL straight away (other params / hash / state kept)
//  - failures are silent and never block the page (NFR-04)
export default function useLegacyReferral() {
  const location = useLocation();
  const navigate = useNavigate();

  // Stale PartnerID values from the old mechanism die on every load.
  useEffect(() => {
    purgeLegacyReferralKeys();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref");
    if (!ref) return;

    params.delete("ref");
    const search = params.toString();
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : "", hash: location.hash },
      { replace: true, state: location.state }
    );

    resolveLegacyRef(ref.trim())
      .then((data) => {
        if (data?.valid && data.scanToken) {
          storeReferralScan({ scanToken: data.scanToken, expiresAt: data.expiresAt });
        }
      })
      .catch(() => {
        // silent — a bad or unreachable legacy ref never affects the visitor
      });
  }, [location.search, location.pathname, location.hash, location.state, navigate]);
}

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { magicLogin } from "../api/AuthApi";
import { setSecureItem } from "../utils/secureStorage";
import { clearSession, notifyTokenSet } from "../utils/authSession";

// Landing page for the sign-in links the WhatsApp assistant sends
// (/wa-login?t=...). Exchanges the token for a normal customer session — the
// same token + user the OTP login stores — then opens the page the link is for
// (document upload), with the right company selected.
export default function WhatsAppLogin() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode runs effects twice in dev
    started.current = true;

    const token = params.get("t");
    if (!token) {
      setError("This link is incomplete. Please open the full link from WhatsApp.");
      return;
    }

    magicLogin(token)
      .then((res) => {
        if (!res?.token || !res?.user) throw new Error("Invalid response");
        // Drop any other session on this browser (e.g. an associate login,
        // which would otherwise take precedence over the customer token).
        clearSession();
        localStorage.setItem("token", res.token);
        setSecureItem("user", res.user);

        const companies = res.user.Companies || [];
        const company = companies.find((c) => String(c.CompanyID) === String(res.companyId)) || companies[0];
        if (company) {
          setSecureItem("selectedCompany", JSON.stringify({
            CompanyID: company.CompanyID,
            CompanyName: company.BusinessName,
            State: company.State || "",
          }));
        }
        notifyTokenSet();
        navigate(res.redirectPath || "/dashboard/bizpoleone", { replace: true, state: res.redirectState || undefined });
      })
      .catch((err) => {
        setError(err?.message || "This link has expired. Reply DOCS on WhatsApp to get a new one.");
      });
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        {error ? (
          <>
            <h1 className="text-lg font-semibold text-gray-800 mb-2">Link not valid</h1>
            <p className="text-sm text-gray-600 mb-6">{error}</p>
            <Link to="/" className="inline-block px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700">
              Go to Bizpole
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
            <p className="text-sm text-gray-600">Signing you in…</p>
          </>
        )}
      </div>
    </div>
  );
}

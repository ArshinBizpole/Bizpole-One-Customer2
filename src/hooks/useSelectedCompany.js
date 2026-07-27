import { useContext, useEffect, useState } from "react";
import { DashboardContext } from "../pages/DashboardLayout";
import { getSecureItem } from "../utils/secureStorage";

const readStoredCompany = () => {
  try {
    const raw = getSecureItem("selectedCompany");
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return { id: parsed?.CompanyID ?? null, name: parsed?.CompanyName ?? null };
  } catch {
    return { id: null, name: null };
  }
};

// DashboardContext (set by DashboardLayout) is the source of truth when available;
// secureStorage is only a fallback for components rendered outside that layout.
export default function useSelectedCompany() {
  const ctx = useContext(DashboardContext);
  const [stored, setStored] = useState(readStoredCompany);

  useEffect(() => {
    const onSwitch = () => setStored(readStoredCompany());
    window.addEventListener("company-switched", onSwitch);
    return () => window.removeEventListener("company-switched", onSwitch);
  }, []);

  return {
    companyId: ctx?.selectedCompanyId ?? stored.id,
    companyName: ctx?.selectedCompany ?? stored.name,
  };
}

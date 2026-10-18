import { getSecureItem, setSecureItem } from "./secureStorage";

// After signing in from a public page (Services, Service Details) the
// dashboard never mounts, so nothing picks the customer's company — do it the
// same way DashboardLayout does: keep the saved company if it's one of theirs,
// otherwise take the first. Returns the chosen company, or null if they have none.
export function selectSignedInCompany(user) {
  const companies = Array.isArray(user?.Companies) ? user.Companies : [];
  if (!companies.length) return null;
  const savedId = getSecureItem("selectedCompany")?.CompanyID;
  const company = companies.find((c) => String(c.CompanyID) === String(savedId)) || companies[0];
  setSecureItem("selectedCompany", JSON.stringify({
    CompanyID: company.CompanyID,
    CompanyName: company.BusinessName || company.CompanyName || "",
    State: company.State || "",
  }));
  setSecureItem("CompanyId", String(company.CompanyID));
  return company;
}

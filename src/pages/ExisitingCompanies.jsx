import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSecureItem, setSecureItem, removeSecureItem } from "../utils/secureStorage";
import { signedInContact, cachedCompany, existingCompanyAnswers } from "../utils/applicationPrefill";
import { getCompanyIdFromStorage } from "../api/SupportTickets/SupportTicket";
import ExistingNeedsMenu from "../components/ExixistingCompany/ExistingNeedsMenu";
import FlowRunner from "../components/ExixistingCompany/FlowRunner";
import "../components/ExixistingCompany/existingco-theme.css";

const SELECTION_KEY = "existingCompanySelection";

const ExisitingCompanies = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // From the dashboard: companyId = the company selected in its switcher (to
  // prefill from); resumeFlow = reopen that in-progress application directly.
  const { companyId, resumeFlow } = location.state || {};

  const [selection, setSelection] = useState(() => {
    if (resumeFlow) {
      const next = { flow: resumeFlow, set: {} };
      setSecureItem(SELECTION_KEY, next);
      return next;
    }
    return getSecureItem(SELECTION_KEY);
  });

  const handleSelect = (item) => {
    // Signed-in customer: prefill the company details they already gave us
    // (and their own contact) — the flow's own preset answers still win.
    // Opened from the home page (no companyId): use the company currently
    // selected in their dashboard, so the details match the records we hold.
    const contact = signedInContact();
    const company = cachedCompany(companyId || (contact && getCompanyIdFromStorage()));
    const prefill = existingCompanyAnswers(company, contact);
    const next = { flow: item.flow, set: { ...prefill, ...(item.set || {}) } };
    setSecureItem(SELECTION_KEY, next);
    setSelection(next);
  };

  const handleExit = () => {
    removeSecureItem(SELECTION_KEY);
    setSelection(null);
  };

  return (
    <div className="exco-theme min-h-screen bg-gray-50">
      {selection ? (
        // onSkip: from Documents on, "Skip for now — go to dashboard" (same as
        // the New Company flows). Progress stays saved, so the dashboard's
        // in-progress list can reopen it here (resumeFlow).
        <FlowRunner key={selection.flow} flowId={selection.flow} initialSet={selection.set} onExit={handleExit} onSkip={() => navigate("/dashboard/bizpoleone")} />
      ) : (
        <ExistingNeedsMenu onSelect={handleSelect} />
      )}
    </div>
  );
};

export default ExisitingCompanies;

import { useLocation, useNavigate } from "react-router-dom";
import FlowRunner from "./ExixistingCompany/FlowRunner";
import { setSecureItem } from "../utils/secureStorage";
import { cachedCompany } from "../utils/applicationPrefill";
import "./newco-theme.css";

// Detailed "Start a New Company" application wizard — reuses the generic FlowRunner
// engine (and the FLOWS ported for the Existing Company journey) recolored to the
// yellow/black Bizpole brand. Handles every card on the NewCompanyServiceMenu:
// Business Registration ("newco"), GST Registration ("gst"), Trademark Registration
// ("trademark") and the Other Registrations sub-menu ("msme" / "iec" / "fssai").
//
// Business Registration's own step 1 ("What type of business do you want to register?")
// already asks the Private Limited / LLP / OPC / Partnership / Proprietorship question,
// so this is reached straight from the services menu — no separate "Choose Your
// Business Type" screen in front of it.
const NewCompanyFlow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const flowId = location.state?.flowId || "newco";
  const typeId = location.state?.type;
  const initialSet = { ...(location.state?.initialSet || {}) };
  // Opened from the dashboard's company switcher — finish back there, with the
  // newly registered company selected, instead of the public onboarding pages.
  const fromDashboard = location.state?.from === "dashboard";

  const finishToDashboard = (submitted) => {
    const company = cachedCompany(submitted?.companyId);
    if (company) {
      setSecureItem("selectedCompany", JSON.stringify({
        CompanyID: company.CompanyID,
        CompanyName: company.BusinessName,
        State: company.State || "",
      }));
    }
    navigate("/dashboard/bizpoleone");
  };

  return (
    <div className="newco-theme min-h-screen bg-gray-50 py-4">
      <FlowRunner
        key={flowId}
        flowId={flowId}
        initialSet={initialSet}
        homeLabel="What would you like to register?"
        nextLabel="Continue to Account Setup →"
        onExit={() => navigate(fromDashboard ? "/dashboard/bizpoleone" : "/startbusiness/services")}
        onComplete={fromDashboard ? finishToDashboard : () => navigate("/startbusiness/about", { state: { type: typeId } })}
        onSkip={() => navigate("/dashboard/bizpoleone")}
      />
    </div>
  );
};

export default NewCompanyFlow;

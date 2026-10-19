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
  const initialSet = { ...(location.state?.initialSet || {}) };
  // Opened from the dashboard's company switcher — Cancel goes back there
  // instead of the public services menu.
  const fromDashboard = location.state?.from === "dashboard";

  // Finished application: on to the dashboard, with the newly registered
  // company selected.
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
    <div className="newco-theme min-h-screen bg-[#F6F7F9] py-4">
      <FlowRunner
        key={flowId}
        flowId={flowId}
        initialSet={initialSet}
        variant="newco"
        homeLabel="Register your business"
        nextLabel="Continue to Dashboard →"
        onExit={() => navigate(fromDashboard ? "/dashboard/bizpoleone" : "/startbusiness/services")}
        onComplete={finishToDashboard}
        onSkip={() => navigate("/dashboard/bizpoleone")}
      />
    </div>
  );
};

export default NewCompanyFlow;

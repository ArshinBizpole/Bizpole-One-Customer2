import { useLocation, useNavigate } from "react-router-dom";
import FlowRunner from "./ExixistingCompany/FlowRunner";
import "./newco-theme.css";

// Detailed "Start a New Company" application wizard — reuses the generic FlowRunner
// engine (and the FLOWS ported for the Existing Company journey) recolored to the
// yellow/black Bizpole brand. Handles every card on the NewCompanyServiceMenu:
// Business Registration ("newco"), GST Registration ("gst"), Trademark Registration
// ("trademark") and the Other Registrations sub-menu ("msme" / "iec" / "other-generic").
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

  return (
    <div className="newco-theme min-h-screen bg-gray-50 py-4">
      <FlowRunner
        key={flowId}
        flowId={flowId}
        initialSet={initialSet}
        homeLabel="What would you like to register?"
        nextLabel="Continue to Account Setup →"
        onExit={() => navigate("/startbusiness/services")}
        onComplete={() => navigate("/startbusiness/about", { state: { type: typeId } })}
      />
    </div>
  );
};

export default NewCompanyFlow;

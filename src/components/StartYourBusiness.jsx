import { Routes, Route, useNavigate } from "react-router-dom";
import ChooseBusinessType from "./ChooseBusinessType";
import StartYourBusinessContent from "./StartYourBusinessContent";
import NewCompanyServiceMenu from "./NewCompanyServiceMenu";
import OtherRegistrationsMenu from "./OtherRegistrationsMenu";

const StartYourBusiness = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Routes>
        <Route
          path="/"
          element={<StartYourBusinessContent onNext={() => navigate("services")} />}
        />
        <Route
          path="services"
          element={<NewCompanyServiceMenu onBack={() => navigate("/startbusiness")} />}
        />
        <Route
          path="other"
          element={<OtherRegistrationsMenu onBack={() => navigate("/startbusiness/services")} />}
        />
        <Route
          path="choose"
          element={<ChooseBusinessType onBack={() => navigate("/startbusiness/services")} />}
        />
      </Routes>
    </div>
  );
};

export default StartYourBusiness;

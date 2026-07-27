import React, { useState } from 'react';

import DirectorPromoterForm from '../components/ExixistingCompany/DirectorPromoterForm';
// RegistrationStatusForm removed; logic will be combined into ComplianceStatusCheck
import ComplianceStatusCheck from '../components/ExixistingCompany/ComplianceStatusCheck';
import { setSecureItem, getSecureItem } from "../utils/secureStorage";
import CompanyInformationForm from '../components/ExixistingCompany/CompanyInformationForm';

const ExisitingCompanies = () => {
  // Persist step in localStorage
  const getInitialStep = () => {
    const saved = getSecureItem("onboardingStep");
    return saved ? Number(saved) : 1;
  };
  const [step, setStep] = useState(getInitialStep());
  // registrationStatusObj removed; logic will be handled in ComplianceStatusCheck

  // Update localStorage when step changes
  React.useEffect(() => {
    setSecureItem("onboardingStep", step);
  }, [step]);

  return (
    <div className="min-h-screen bg-gray-50">

  {step === 1 && <CompanyInformationForm onNext={() => setStep(2)} step={step} setStep={setStep} />}
  {step === 2 && <DirectorPromoterForm onNext={() => setStep(3)} onBack={() => setStep(1)} />}
  {step === 3 && <ComplianceStatusCheck onBack={() => setStep(2)} />}
    </div>
  );
}

export default ExisitingCompanies;
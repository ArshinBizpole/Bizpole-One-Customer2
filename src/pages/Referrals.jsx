import ReferralProgrammeView from "../components/referrals/ReferralProgrammeView";
import useSelectedCompany from "../hooks/useSelectedCompany";

// Customer "Refer & Earn" — /dashboard/bizpoleone/referrals
const Referrals = () => {
  const { companyId } = useSelectedCompany();
  return <ReferralProgrammeView role="customer" companyId={companyId} />;
};

export default Referrals;

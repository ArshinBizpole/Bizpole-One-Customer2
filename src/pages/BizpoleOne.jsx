import { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

import HeaderStats from '../components/HeaderStats';
import SectionTitle from '../components/dashboard/SectionTitle';
import ComplianceHealth from '../components/dashboard/ComplianceHealth';
import QuotesList from '../components/dashboard/QuotesList';
import ServicesActions from '../components/dashboard/ServicesActions';
import VaultFinance from '../components/dashboard/VaultFinance';
import SuiteRecommendations from '../components/dashboard/SuiteRecommendations';
import RelationshipReferral from '../components/dashboard/RelationshipReferral';
import useSelectedCompany from '../hooks/useSelectedCompany';

const BizpoleOne = () => {
  const { companyName } = useSelectedCompany();

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Initialize AOS
  useEffect(() => {
    AOS.init({
      duration: 1000,
      easing: 'ease-in-out',
      once: true,
    });
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Topbar + stat cards */}
      <HeaderStats />

      <div className="px-2 pb-10 sm:px-4 md:px-6">
        {/* ===== Compliance & Health ===== */}
        <SectionTitle title="Compliance & Health" tag="NEW" />
        <ComplianceHealth />

        {/* ===== Quotes ===== */}
        <SectionTitle title="Quotes" tag="NEW" />
        <QuotesList />

        {/* ===== Your Services & Actions ===== */}
        <SectionTitle title="Your Services & Actions" tag="NEW" />
        <ServicesActions />

        {/* ===== Document Vault & Finance ===== */}
        <SectionTitle title="Document Vault & Finance" tag="NEW" />
        <VaultFinance />

        {/* ===== Recommended ===== */}
        <SectionTitle title={`Recommended for ${companyName || "You"}`} tag="MARKETING" tagColor="amber" />
        <SuiteRecommendations />

        {/* ===== Relationship & Referral ===== */}
        <div className="mt-4">
          <RelationshipReferral />
        </div>
      </div>
    </div>
  );
};

export default BizpoleOne;

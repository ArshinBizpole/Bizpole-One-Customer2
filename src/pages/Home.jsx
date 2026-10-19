
import HeroSection from "../components/HeroSection";
import GlobalStats from "../components/GlobalStats";
import DashboardShowcase from "../components/DashboardShowcase";
import Howwework from "./../components/Howwework";
import FocusSection from "../components/FocusSection";
import ProductsSection from "../components/ProductsSection";
import ClientsSection from "../components/ClientsSection";
import PaymentLogs from "../components/PaymentLogs";
import CustomerSupport from "../components/CustomerSupport";

export default function Home() {
  return (
    <>
    <HeroSection />
    <GlobalStats />
    <DashboardShowcase />
    <Howwework />
    <FocusSection />
    <ProductsSection />
    <ClientsSection />
    {/* "More than 25,000 clients" + payment methods strip — under the reviews */}
    <h2 className="bg-[#f7f5f0] text-center text-lg sm:text-xl md:text-2xl font-semibold text-black pt-10 px-4">
      More than 25,000 clients
    </h2>
    <PaymentLogs />
    <CustomerSupport />
    </>
  );
}

import { MotionConfig } from "framer-motion";

import HeroSection from "../components/HeroSection";
import BrandMarquee from "../components/BrandMarquee";
import ServicePicker from "../components/ServicePicker";
import { ScrollProgress } from "../components/Reveal";
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
    <MotionConfig reducedMotion="user">
    <ScrollProgress />
    <HeroSection />
    <BrandMarquee />
    <ServicePicker />
    <GlobalStats />
    <DashboardShowcase />
    <Howwework />
    <FocusSection />
    <ProductsSection />
    <ClientsSection />
    <PaymentLogs />
    <CustomerSupport />
    </MotionConfig>
  );
}

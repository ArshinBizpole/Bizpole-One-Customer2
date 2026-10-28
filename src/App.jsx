import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { SHOW_CUSTOMER_REFER_AND_EARN } from "./utils/featureFlags";
import { useEffect } from "react";
import AOS from "aos";
import useAutoLogout from "./hooks/useAutoLogout";
import useLegacyReferral from "./hooks/useLegacyReferral";
import axiosInstance from "./api/axiosInstance";
import { setInternalServiceStatuses } from "./utils/orderStatus";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import ProtectedRoute from "./components/ProtectedRoute";
import About from "./pages/About";
import Contact from "./pages/Contact";
import StartYourBusiness from "./components/StartYourBusiness";
import Quiz from "./components/Quiz";
import BusinessPanel from "./components/BusinessPanel";
import Tellabout from "./components/Tellabout";
import NewCompanyFlow from "./components/NewCompanyFlow";
import Subscription from "./components/Subscription";
import NotFound from "./pages/NotFound";

// Main Dashboard pages
import DashboardLayout from "./pages/DashboardLayout";
import BizpoleBooks from "./pages/BizpoleBooks";

// BizpoleOne dashboard pages
import BizpoleOneDashboardLayout from "./pages/BizpoleOneDashboardLayout";
import BizpoleOne from "./pages/BizpoleOne";
import BizpoleOneServices from "./pages/BizpoleOneServices";
import BizpoleOneTasks from "./pages/BizpoleOneTasks";
import SupportTickets from "./pages/SupportTickets";
import Referrals from "./pages/Referrals";

import ProfileLayout from "./pages/ProfileLayout";
import ProfilePage from "./pages/ProfilePage";
import CalenderPage from "./pages/CalenderPage";
import ProfileDocuments from "./pages/ProfileDocuments";
import ModernCalendar from "./pages/ModernCalendar";
import ProfileEvents from "./pages/ProfileEvents";
import CustomerFiles from "./pages/CustomerFiles";
import CompanyDetails from "./pages/CompanyDetails";
import Invoiceprofile from "./pages/Invoiceprofile";
import Refunds from "./pages/Refunds";

import Services from "./pages/Services";
import ServiceDetails from "./pages/ServiceDetails";
import ProductList from "./pages/ProductView/ProductList";
import Partners from "./pages/Partners";
import TrademarkSearch from "./pages/TrademarkSearch";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import CancellationRefundPolicy from "./pages/CancellationRefundPolicy";
import AssociatePrivacyPolicy from "./pages/associate/AssociatePrivacyPolicy";
import AssociateTermsAndConditions from "./pages/associate/AssociateTermsAndConditions";
import AssociateReferralConductPolicy from "./pages/associate/AssociateReferralConductPolicy";
import AssociateCancellationRefundPolicy from "./pages/associate/AssociateCancellationRefundPolicy";


import Plansandpricing from "./pages/Plansandpricing";
import MyPackages from "./pages/MyPackages";
import MyIndividualservices from "./pages/MyIndividualservices";
import MyOrderDetails from "./pages/MyOrderDetails";
import ChatPage from "./pages/ChatPage";

import ExisitingCompanies from "./pages/ExisitingCompanies";

import BusinessQuizWizard from "./components/Quastions";

import { getSecureItem, setSecureItem } from "./utils/secureStorage";
import { CartProvider } from "./context/CartContext";
import GlobalCart from "./components/Cart/GlobalCart";
import InvoicePreview from "./pages/InvoicePreview";
import WhatsAppLogin from "./pages/WhatsAppLogin";
import TrademarkSharedReport from "./pages/TrademarkSharedReport";


// Associate Dashboard
import AssociateLayout from "./pages/AssociateLayout";
import AssociateDashboard from "./pages/AssociateDashboard";
import AssociateProfile from "./pages/AssociateProfile";
import AssociateDeals from "./pages/associate/AssociateDeals";
import DealDetailView from "./pages/associate/DealDetailView";
import AssociateQuotes from "./pages/associate/AssociateQuotes";
import QuoteDetailView from "./pages/associate/QuoteDetailView";
import AssociateOrders from "./pages/associate/AssociateOrders";
import OrderDetailView from "./pages/associate/OrderDetailView";
import AssociateServices from "./pages/associate/AssociateServices";
import ServiceDetailView from "./pages/associate/ServiceDetailView";
import AssociateCustomers from "./pages/associate/AssociateCustomers";
import CustomerDetailView from "./pages/associate/CustomerDetailView";
import AssociateCompanies from "./pages/associate/AssociateCompanies";
import CompanyDetailView from "./pages/associate/CompanyDetailView";
import AssociateReceipts from "./pages/associate/AssociateReceipts";
import AssociateInvoices from "./pages/associate/AssociateInvoices";
import ExploreServices from "./pages/associate/ExploreServices";
import AssociateReferrals from "./pages/associate/AssociateReferrals";

// Referral & Affiliate Programme (public + affiliate portal)
import ReferralLanding from "./pages/ReferralLanding";
import AffiliateLanding from "./pages/affiliate/AffiliateLanding";
import AffiliateLayout from "./pages/affiliate/AffiliateLayout";
import AffiliateDashboard from "./pages/affiliate/AffiliateDashboard";

function App() {
  const location = useLocation();

  useAutoLogout();
  useLegacyReferral();

  useEffect(() => {
    AOS.init({ duration: 1000 });
  }, []);

  // Service statuses set as Internal in Status Master, so the portal shows the
  // status chosen there instead. Needs a session token; without one (or if the
  // call fails) the portal's fixed status mapping is used as before.
  useEffect(() => {
    if (!(localStorage.getItem("partnerToken") || localStorage.getItem("token"))) return;
    axiosInstance
      .get("/customerStatusMap")
      .then((res) => setInternalServiceStatuses(res?.data?.data?.service))
      .catch(() => {});
  }, [location.pathname.startsWith("/dashboard")]);

  // Hide Navbar & Footer for these paths
  const hideLayoutPaths = [
    "/payments",
    "/wa-login",
    "/trademark-report",
    "/quiz",
    "/profile",
    // "/existing-companies",
    "/associate",
    "/dashboard",
    "/r/",
    "/affiliate/dashboard",

    "/partner-privacy-policy",
    "/partner-terms-and-conditions",
    "/partner-referral-conduct-policy",
    "/partner-cancellation-refund-policy",
  ];

  const hideLayout = hideLayoutPaths.some((path) =>
    location.pathname.startsWith(path)
  );

  // Fix old secure storage format
  useEffect(() => {
    const user = getSecureItem("user");
    const partnerUser = getSecureItem("partnerUser");

    try {
      if (typeof user === "string") {
        setSecureItem("user", JSON.parse(user));
      }
      if (typeof partnerUser === "string") {
        setSecureItem("partnerUser", JSON.parse(partnerUser));
      }
    } catch (error) {
      console.warn("Old user format found, clearing...", error);
      localStorage.removeItem("user");
      localStorage.removeItem("partnerUser");
    }
  }, []);

  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen">
        {!hideLayout && <Navbar />}

        <main className="flex-grow">
          <Routes>

          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/bizpoleone" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/startbusiness/*" element={<StartYourBusiness />} />
          <Route path="/checking" element={<BusinessPanel />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:id" element={<ServiceDetails />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/trademark-search" element={<TrademarkSearch />} />
          <Route path="/startbusiness/apply" element={<NewCompanyFlow />} />
          <Route path="/startbusiness/about" element={<Tellabout />} />
          <Route path="/startbusiness/subscriptions" element={<Subscription />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/questions" element={<BusinessQuizWizard />} />
          {/* Sign-in link sent by the WhatsApp assistant (document upload) */}
          <Route path="/wa-login" element={<WhatsAppLogin />} />
          {/* A report opened from the CRM (signed link, no sign-in). */}
          <Route path="/trademark-report" element={<TrademarkSharedReport />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/cancellation-refund-policy" element={<CancellationRefundPolicy />} />
          <Route path="/partner-privacy-policy" element={<AssociatePrivacyPolicy />} />
          <Route path="/partner-terms-and-conditions" element={<AssociateTermsAndConditions />} />
          <Route path="/partner-referral-conduct-policy" element={<AssociateReferralConductPolicy />} />
          <Route path="/partner-cancellation-refund-policy" element={<AssociateCancellationRefundPolicy />} />

          {/* Referral & Affiliate Programme */}
          <Route path="/r/:code" element={<ReferralLanding />} />
          <Route path="/affiliate" element={<AffiliateLanding />} />
          {/* Affiliate portal: guarded by AffiliateLayout's own affiliateToken check, NOT ProtectedRoute */}
          <Route path="/affiliate/dashboard" element={<AffiliateLayout />}>
            <Route index element={<AffiliateDashboard />} />
          </Route>

          {/* Profile */}
          <Route path="/profile" element={<ProfileLayout />}>
            <Route index element={<ProfilePage />} />
            <Route path="calendar" element={<CalenderPage />} />
            <Route path="documents" element={<ProfileDocuments />} />
            <Route path="moderncalendar" element={<ModernCalendar />} />
            <Route path="events" element={<ProfileEvents />} />
            <Route path="files" element={<CustomerFiles />} />
            <Route path="companydetails" element={<CompanyDetails />} />
            <Route path="invoice" element={<Invoiceprofile />} />
            <Route path="refunds" element={<Refunds />} />
            <Route path="invoice-preview/:encrypted" element={<InvoicePreview />} />


          </Route>

            <Route path="/existing-companies" element={<ExisitingCompanies />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute redirectPath="/" />}>

              {/* Main Dashboard */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                {/* /dashboard had only a "Welcome to Dashboard" placeholder — open the real one */}
                <Route index element={<Navigate to="/dashboard/bizpoleone" replace />} />
                <Route path="books" element={<BizpoleBooks />} />

                <Route path="bizpoleone" element={<BizpoleOneDashboardLayout />}>
                  <Route index element={<BizpoleOne />} />
                  <Route path="package" element={<MyPackages />} />
                  <Route path="orderdetails" element={<MyOrderDetails />} />
                  <Route path="services" element={<BizpoleOneServices />} />
                  <Route path="orders" element={<BizpoleOneServices />} />
                  <Route path="tasks" element={<BizpoleOneTasks />} />
                  <Route path="pricing" element={<Plansandpricing />} />
                  <Route path="individual" element={<MyIndividualservices />} />
                  <Route path="chat" element={<ChatPage />} />
                  {/* Billing and Refunds now live under Profile → Invoice */}
                  <Route path="billing" element={<Navigate to="/profile/invoice?tab=overview" replace />} />
                  <Route path="refunds" element={<Navigate to="/profile/refunds" replace />} />
                  <Route path="support" element={<SupportTickets />} />
                  <Route
                    path="referrals"
                    element={SHOW_CUSTOMER_REFER_AND_EARN ? <Referrals /> : <Navigate to="/dashboard/bizpoleone" replace />}
                  />
                  <Route path="trademark-search" element={<TrademarkSearch embedded />} />
                </Route>
              </Route>

              {/* Associate Dashboard */}
              <Route path="/associate" element={<AssociateLayout />}>
                <Route path="dashboard" element={<AssociateDashboard />} />
                <Route path="profile" element={<AssociateProfile />} />
                <Route path="deals" element={<AssociateDeals />} />
                <Route path="deals/:id" element={<DealDetailView />} />
                <Route path="quotes" element={<AssociateQuotes />} />
                <Route path="quotes/:id" element={<QuoteDetailView />} />
                <Route path="orders" element={<AssociateOrders />} />
                <Route path="orders/:id" element={<OrderDetailView />} />
                <Route path="services" element={<AssociateServices />} />
                <Route path="services/:id" element={<ServiceDetailView />} />
                <Route path="customers" element={<AssociateCustomers />} />
                <Route path="customers/:id" element={<CustomerDetailView />} />
                <Route path="companies" element={<AssociateCompanies />} />
                <Route path="companies/:id" element={<CompanyDetailView />} />
                <Route path="receipts" element={<AssociateReceipts />} />
                <Route path="invoices" element={<AssociateInvoices />} />
                <Route path="explore-services" element={<ExploreServices />} />
                <Route path="referrals" element={<AssociateReferrals />} />
              </Route>

            </Route>

            {/* Anything unmatched — instead of a blank page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        {!hideLayout && <Footer />}
        {/* Global floating cart — only on the pages where services are picked (Services list + service detail) */}
        {(location.pathname === "/services" || location.pathname.startsWith("/services/")) && <GlobalCart />}
      </div>
    </CartProvider>
  );
}

export default App;

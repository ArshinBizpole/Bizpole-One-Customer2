import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import AOS from "aos";
import useAutoLogout from "./hooks/useAutoLogout";

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
import Subscription from "./components/Subscription";
import Payment from "./components/Payment";

// Main Dashboard pages
import DashboardLayout from "./pages/DashboardLayout";
import DashboardMain from "./pages/DashboardMain";
import BizpoleBooks from "./pages/BizpoleBooks";

// BizpoleOne dashboard pages
import BizpoleOneDashboardLayout from "./pages/BizpoleOneDashboardLayout";
import BizpoleOne from "./pages/BizpoleOne";
import BizpoleOneServices from "./pages/BizpoleOneServices";
import BizpoleOneTasks from "./pages/BizpoleOneTasks";
import Refunds from "./pages/Refunds";
import SupportTickets from "./pages/SupportTickets";

import ProfileLayout from "./pages/ProfileLayout";
import ProfilePage from "./pages/ProfilePage";
import CalenderPage from "./pages/CalenderPage";
import ProfileDocuments from "./pages/ProfileDocuments";
import ModernCalendar from "./pages/ModernCalendar";
import ProfileEvents from "./pages/ProfileEvents";
import CustomerFiles from "./pages/CustomerFiles";
import CompanyDetails from "./pages/CompanyDetails";
import Invoiceprofile from "./pages/Invoiceprofile";

import Services from "./pages/Services";
import ServiceDetails from "./pages/ServiceDetails";
import ProductList from "./pages/ProductView/ProductList";
import Partners from "./pages/Partners";


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

function App() {
  const location = useLocation();

  useAutoLogout();

  useEffect(() => {
    AOS.init({ duration: 1000 });
  }, []);

  // Hide Navbar & Footer for these paths
  const hideLayoutPaths = [
    "/payments",
    "/quiz",
    "/profile",
    // "/existing-companies",
    "/associate",
    "/dashboard",
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
          <Route path="/startbusiness/about" element={<Tellabout />} />
          <Route path="/startbusiness/subscriptions" element={<Subscription />} />
          <Route path="/payments" element={<Payment />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/questions" element={<BusinessQuizWizard />} />

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
            <Route path="invoice-preview/:encrypted" element={<InvoicePreview />} />


          </Route>

            <Route path="/existing-companies" element={<ExisitingCompanies />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute redirectPath="/" />}>

              {/* Main Dashboard */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardMain />} />
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
                  <Route path="refunds" element={<Refunds />} />
                  <Route path="support" element={<SupportTickets />} />
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
              </Route>

            </Route>
          </Routes>
        </main>

        {!hideLayout && <Footer />}
        {/* Global floating cart, always visible */}
        <GlobalCart />
      </div>
    </CartProvider>
  );
}

export default App;

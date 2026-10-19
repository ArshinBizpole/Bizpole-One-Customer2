import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { Check, Loader2, Layers, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { getServicePackages } from "../api/ServicesApi";
import { upsertQuote } from "../api/Quote";
import { getSecureItem, setSecureItem } from "../utils/secureStorage";
import { selectSignedInCompany } from "../utils/signedInCompany";
import { goToNewCustomerFlow } from "../utils/newCustomerFlow";
import SigninModal from "./Modals/SigninModal";

const MAX_LISTED_SERVICES = 4;

// Cards shown at once: 3 on desktop, 2 on tablet, 1 on phone (Tailwind lg / md).
const cardsPerView = () => {
  if (typeof window === "undefined") return 3;
  if (window.matchMedia("(min-width: 1024px)").matches) return 3;
  if (window.matchMedia("(min-width: 768px)").matches) return 2;
  return 1;
};

function useCardsPerView() {
  const [perView, setPerView] = useState(cardsPerView);
  useEffect(() => {
    const onResize = () => setPerView(cardsPerView());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return perView;
}

const num = (v) => Number(v) || 0;
const formatINR = (v) => `₹${num(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// Monthly packages are billed per month, everything else per year.
const isMonthly = (plan) => /month/i.test(plan.BillingPeriod || "");
const priceOf = (plan) =>
  isMonthly(plan)
    ? num(plan.MonthlyFinalAmount || plan.MonthlyMRP)
    : num(plan.YearlyFinalAmount || plan.YearlyMRP || plan.FinalAmount || plan.TotalMRP);
const discountOf = (plan) => num(isMonthly(plan) ? plan.MonthlyDiscount : plan.YearlyDiscount || plan.Discount);

// Package cards for the public services page (no sign-in needed to browse) and
// the dashboard's Plans & Pricing. "Get Quote" creates a package quote for a
// signed-in customer; a visitor is asked to sign in first and the quote is
// created right after. preferredTypeId: business type to pre-filter to, when
// any package belongs to it.
export default function PackagePlans({ preferredTypeId = null }) {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [quotingId, setQuotingId] = useState(null);
  const [pendingPlan, setPendingPlan] = useState(null);
  const perView = useCardsPerView();
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getServicePackages({ isActive: 1, pageSize: 100 });
        if (cancelled) return;
        const rows = (Array.isArray(res?.data) ? res.data : []).filter((p) => Number(p.IsActive) === 1);
        setPackages(rows);
        const preferred = preferredTypeId && rows.find((p) => String(p.ServiceTypeID) === String(preferredTypeId));
        if (preferred?.ServiceTypeName) setTypeFilter(preferred.ServiceTypeName);
      } catch (err) {
        console.error("Error loading packages:", err);
        if (!cancelled) setError("We couldn't load packages right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [preferredTypeId]);

  const businessTypes = useMemo(() => {
    const names = packages.map((p) => p.ServiceTypeName).filter(Boolean);
    return [...new Set(names)];
  }, [packages]);

  const visible = useMemo(
    () => (typeFilter === "all" ? packages : packages.filter((p) => p.ServiceTypeName === typeFilter)),
    [packages, typeFilter],
  );

  // Show at most `perView` packages at a time; arrows page through the rest.
  const pageCount = Math.max(1, Math.ceil(visible.length / perView));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = visible.slice(currentPage * perView, currentPage * perView + perView);
  useEffect(() => { setPage(0); }, [typeFilter]);

  // Highlight the single best-value package (largest discount), as in the design.
  const featuredId = useMemo(() => {
    const discounted = visible.filter((p) => discountOf(p) > 0);
    if (!discounted.length) return null;
    return discounted.reduce((best, p) => (discountOf(p) > discountOf(best) ? p : best)).PackageID;
  }, [visible]);

  const createQuote = async (plan) => {
    setQuotingId(plan.PackageID);
    try {
      const data = await upsertQuote({
        packageId: plan.PackageID,
        packageName: plan.PackageName,
        amount: priceOf(plan),
        type: "package",
        services: Array.isArray(plan.services) ? plan.services : [],
        IsMonthly: isMonthly(plan) ? 1 : 0,
        is_manual: 0,
      });
      if (data?.QuoteID) {
        const user = getSecureItem("user");
        if (user) {
          user.QuoteID = data.QuoteID;
          setSecureItem("user", user);
        }
      }
      toast.success(`Quote requested for ${plan.PackageName}.`);
      navigate("/dashboard/bizpoleone");
    } catch (err) {
      console.error("Error creating package quote:", err);
      toast.error("Couldn't create the quote. Please try again.");
    } finally {
      setQuotingId(null);
    }
  };

  const handleGetQuote = (plan) => {
    if (localStorage.getItem("token")) {
      createQuote(plan);
    } else {
      setPendingPlan(plan);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#F3C625]" />
        <p className="mt-3 text-sm">Loading packages...</p>
      </div>
    );
  }

  if (error) {
    return <p className="text-center py-20 text-sm text-red-500">{error}</p>;
  }

  if (!packages.length) {
    return <p className="text-center py-20 text-sm text-gray-500">No packages are available right now. Choose individual services instead.</p>;
  }

  return (
    <>
      <SigninModal
        isOpen={!!pendingPlan}
        onClose={() => setPendingPlan(null)}
        onSuccess={(tokenData) => {
          selectSignedInCompany(tokenData?.user || getSecureItem("user"));
          const plan = pendingPlan;
          setPendingPlan(null);
          if (plan) createQuote(plan);
        }}
        // New customer: the application matching the package's services collects
        // their details and makes the quote.
        onSignup={() => {
          const plan = pendingPlan;
          setPendingPlan(null);
          goToNewCustomerFlow(navigate, plan?.services || [], "");
        }}
      />

      {businessTypes.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {["all", ...businessTypes].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                typeFilter === t
                  ? "bg-[#FFFBEA] border-[#F3C625] text-black"
                  : "bg-white border-gray-200 text-gray-600 hover:border-[#F3C625]"
              }`}
            >
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 max-w-6xl mx-auto">
        {pageCount > 1 && (
          <PagerArrow label="Previous packages" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
            <ChevronLeft size={20} />
          </PagerArrow>
        )}
        <div className="flex-1 min-w-0 grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((plan, i) => (
            <PackageCard
              key={plan.PackageID}
              plan={plan}
              index={i}
              featured={plan.PackageID === featuredId}
              quoting={quotingId === plan.PackageID}
              disabled={quotingId !== null}
              onGetQuote={() => handleGetQuote(plan)}
            />
          ))}
        </div>
        {pageCount > 1 && (
          <PagerArrow label="Next packages" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>
            <ChevronRight size={20} />
          </PagerArrow>
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          {Array.from({ length: pageCount }, (_, p) => (
            <button
              key={p}
              aria-label={`Show page ${p + 1} of packages`}
              onClick={() => setPage(p)}
              className={`h-2 rounded-full transition-all ${p === currentPage ? "w-6 bg-[#F3C625]" : "w-2 bg-gray-300 hover:bg-gray-400"}`}
            />
          ))}
        </div>
      )}
    </>
  );
}

function PagerArrow({ label, disabled, onClick, children }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex-shrink-0 w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-700 shadow-sm transition-colors hover:border-[#F3C625] hover:bg-[#FFFBEA] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-white"
    >
      {children}
    </button>
  );
}

function PackageCard({ plan, index, featured, quoting, disabled, onGetQuote }) {
  const services = Array.isArray(plan.services) ? plan.services : [];
  const monthly = isMonthly(plan);
  const discount = discountOf(plan);
  // The design's black card: the best-value package, or whichever card is hovered.
  const [hovered, setHovered] = useState(false);
  const dark = featured || hovered;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={`flex flex-col min-h-[440px] rounded-2xl border p-7 transition-colors duration-200 hover:shadow-lg ${
        dark ? "bg-black border-black text-white" : "bg-white border-[#F3C625] text-gray-900"
      }`}
    >
      {/* Name + badges */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-xl font-semibold leading-tight break-words min-w-0">{plan.PackageName}</h3>
        <div className="flex flex-shrink-0 gap-1 pt-0.5">
          <Badge dark={dark} icon={Layers}>{services.length} service{services.length === 1 ? "" : "s"}</Badge>
          <Badge dark={dark} icon={CalendarDays}>{monthly ? "Monthly" : "Annual"}</Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold tracking-tight">{formatINR(priceOf(plan))}</span>
        {discount > 0 && (
          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${dark ? "bg-gray-600 text-white" : "bg-gray-200 text-gray-800"}`}>
            -{discount}%
          </span>
        )}
      </div>

      {plan.Description && (
        <p className={`mt-2 text-xs leading-snug line-clamp-3 ${dark ? "text-gray-200" : "text-gray-800"}`}>
          {plan.Description}
        </p>
      )}
      <p className={`${plan.Description ? "" : "mt-2 "}text-xs ${dark ? "text-gray-200" : "text-gray-800"}`}>
        {monthly ? "per month, billed monthly" : "per year, billed annually"}
      </p>

      {plan.ServiceTypeName && (
        <p className="mt-5 mb-3 text-sm font-semibold">For {plan.ServiceTypeName}</p>
      )}

      <ul className="space-y-2.5 mb-6">
        {services.slice(0, MAX_LISTED_SERVICES).map((s, idx) => (
          <li key={s.ServiceID || idx} className="flex items-center gap-2.5 text-sm">
            <span
              className={`flex items-center justify-center w-4 h-4 rounded flex-shrink-0 ${
                dark ? "bg-[#8a7a2a] text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              <Check size={11} strokeWidth={3} />
            </span>
            <span className={dark ? "text-gray-100" : "text-gray-700"}>{s.ServiceName}</span>
          </li>
        ))}
        {services.length > MAX_LISTED_SERVICES && (
          <li className="pl-6 text-xs text-gray-400">
            +{services.length - MAX_LISTED_SERVICES} more
          </li>
        )}
      </ul>

      <button
        onClick={onGetQuote}
        disabled={disabled}
        className="mt-auto w-full py-2.5 rounded-full bg-[#F3C625] hover:bg-[#e0b420] text-black text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {quoting && <Loader2 size={14} className="animate-spin" />}
        {quoting ? "Requesting..." : "Get Quote"}
      </button>
    </motion.div>
  );
}

function Badge({ dark, icon: Icon, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium whitespace-nowrap border ${
        dark ? "bg-white text-gray-800 border-white" : "bg-white text-gray-600 border-gray-200"
      }`}
    >
      <Icon size={10} className="text-[#d4a514]" />
      {children}
    </span>
  );
}

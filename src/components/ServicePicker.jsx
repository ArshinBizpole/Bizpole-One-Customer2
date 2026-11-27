import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Rocket, Receipt, ShieldCheck, ClipboardCheck, ArrowRight, Check } from "lucide-react";
import { removeSecureItem } from "../utils/secureStorage";
import { Reveal, RevealGroup, RevealItem } from "./Reveal";

// "What do you need help with?" — the visitor picks their goal and gets a
// focused pitch + the right next step. `href` = static landing page (full
// page load); `to` = in-app route.
const GOALS = [
  {
    key: "start",
    icon: Rocket,
    label: "Start a business",
    title: "Register your company the right way, first time.",
    desc: "Private Limited, LLP, Partnership or Proprietorship — we help you pick the right structure, prepare the documents and file with the government.",
    points: ["Help choosing the right structure", "Government fees shown upfront", "Track every step in your dashboard"],
    cta: "Start your business",
    to: "/startbusiness/services",
  },
  {
    key: "gst",
    icon: Receipt,
    label: "GST registration",
    title: "Get your GSTIN without the back-and-forth.",
    desc: "Share your documents once. Our team prepares and files your GST application and keeps you updated until your GSTIN is issued.",
    points: ["Document checklist made for you", "Expert-filed application", "Status updates at every stage"],
    cta: "Register for GST",
    href: "/gst-registration",
  },
  {
    key: "brand",
    icon: ShieldCheck,
    label: "Protect your brand",
    title: "Check your brand name before someone else takes it.",
    desc: "Search the trademark registry for free, see similar marks, and file your trademark with expert help when you're ready.",
    points: ["Free trademark search", "Downloadable search report", "Filing handled by experts"],
    cta: "Search your brand free",
    to: "/trademark-search",
  },
  {
    key: "comply",
    icon: ClipboardCheck,
    label: "Stay compliant",
    title: "Already running? Never miss a filing again.",
    desc: "Bring your existing company to Bizpole. Our team takes care of returns, annual filings and compliance, so you can focus on running the business.",
    points: ["Filings handled by your expert team", "Every service tracked in one dashboard", "Documents and deliverables in one place"],
    cta: "Onboard my company",
    to: "/existing-companies",
    existing: true,
  },
];

const ServicePicker = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const goal = GOALS[active];

  const go = () => {
    if (goal.href) {
      window.location.href = goal.href;
      return;
    }
    if (goal.existing) removeSecureItem("onboardingStep");
    navigate(goal.to);
  };

  return (
    <section className="bg-[#f7f5f0] py-14 md:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="text-center mb-8 md:mb-10">
          <h2 className="text-3xl md:text-5xl font-semibold text-[#1a1a1a] tracking-tight">
            What do you need help with?
          </h2>
          <p className="mt-3 text-[#1a1a1a]/55 text-base md:text-lg">
            Pick one — we'll show you exactly how we can help.
          </p>
        </Reveal>

        {/* Goal tabs */}
        <RevealGroup role="tablist" aria-label="Choose what you need" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {GOALS.map(({ key, icon: Icon, label }, i) => {
            const on = i === active;
            return (
              <RevealItem
                as="button"
                key={key}
                role="tab"
                aria-selected={on}
                aria-controls="goal-panel"
                onClick={() => setActive(i)}
                className={`group relative flex items-center gap-3 rounded-2xl px-4 py-4 text-left border transition-all duration-300
                  ${on
                    ? "bg-[#1a1a1a] border-[#1a1a1a] text-white shadow-lg"
                    : "bg-white border-[#1a1a1a]/[0.07] text-[#1a1a1a] hover:border-[#F5C518] hover:shadow-md"}`}
              >
                <span className={`w-10 h-10 flex-none rounded-xl flex items-center justify-center transition-colors
                  ${on ? "bg-[#F5C518] text-[#1a1a1a]" : "bg-[#FFF3C4] text-[#1a1a1a] group-hover:bg-[#F5C518]"}`}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-sm sm:text-base font-semibold leading-tight">{label}</span>
              </RevealItem>
            );
          })}
        </RevealGroup>

        {/* Panel */}
        <Reveal delay={0.15} id="goal-panel" role="tabpanel" className="relative rounded-3xl bg-white border border-[#1a1a1a]/[0.06] shadow-sm overflow-hidden">
          <span aria-hidden="true" className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[#F5C518]/15 blur-3xl" />
          <AnimatePresence mode="wait">
            <motion.div
              key={goal.key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-8 p-6 sm:p-8 md:p-10 items-center"
            >
              <div>
                <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#1a1a1a] leading-snug">{goal.title}</h3>
                <p className="mt-3 text-[#1a1a1a]/60 text-base md:text-lg leading-relaxed">{goal.desc}</p>
                <button
                  onClick={go}
                  className="group mt-6 inline-flex items-center gap-2.5 rounded-full bg-[#F5C518] px-7 py-3.5 text-base font-semibold text-[#1a1a1a] shadow-lg shadow-[#F5C518]/25 hover:shadow-xl hover:-translate-y-0.5 transition duration-200"
                >
                  {goal.cta}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
              <ul className="space-y-3">
                {goal.points.map((p) => (
                  <li
                    key={p}
                    className="flex items-center gap-3 rounded-xl bg-[#f7f5f0] px-4 py-3 text-sm sm:text-base font-medium text-[#1a1a1a]"
                  >
                    <span className="w-6 h-6 flex-none rounded-full bg-[#F5C518] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </Reveal>
      </div>
    </section>
  );
};

export default ServicePicker;

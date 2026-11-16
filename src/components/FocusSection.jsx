import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Rocket, RefreshCw } from "lucide-react";

// "Stay Focused on Your Business Goals" (Figma landing page): three coded phone
// mockups of the customer app (left) and the pitch (right).
const PAGE_BG = "#f7f5f0";

// Phone frame matching the design: black bezel, notch, 9:41 status bar.
const Phone = ({ children, className = "", tall = false }) => (
  <div className={`flex-none rounded-[30px] bg-[#1a1a1a] p-[5px] shadow-2xl ${tall ? "w-[176px] sm:w-[200px]" : "w-[150px] sm:w-[170px]"} ${className}`}>
    <div className={`relative rounded-[25px] bg-white overflow-hidden flex flex-col ${tall ? "h-[360px] sm:h-[410px]" : "h-[300px] sm:h-[345px]"}`}>
      <span className="absolute top-[6px] left-1/2 -translate-x-1/2 h-[14px] w-[56px] rounded-full bg-[#1a1a1a] z-20" />
      <div className="flex items-center justify-between px-4 pt-[7px] text-[7px] font-semibold text-[#1a1a1a] relative z-10">
        <span>9:41</span>
        <span className="flex items-center gap-[3px]">
          <span className="flex items-end gap-[1px]">{[3, 4, 5, 6].map((h) => <span key={h} className="w-[1.5px] bg-[#1a1a1a]" style={{ height: h }} />)}</span>
          <span className="h-[5px] w-[9px] rounded-[1.5px] border border-[#1a1a1a]" />
        </span>
      </div>
      {children}
    </div>
  </div>
);

const Logo = ({ size = "h-7 sm:h-8" }) => (
  <img src="/Images/image.png" alt="" className={`${size} w-auto mx-auto mix-blend-multiply`} />
);

// Left: "Let's talk business!" — new vs existing company, yellow wave at the bottom.
const StartScreen = () => (
  <div className="relative flex-1 flex flex-col px-3 pt-4">
    <Logo />
    <div className="mt-4 text-[13px] sm:text-[14px] font-extrabold text-center text-[#1a1a1a]">Let's talk business!</div>
    <p className="mt-1 text-[6.5px] text-center text-gray-500 leading-snug px-1">
      To begin this journey, tell us what type of account you'd be opening.
    </p>
    <div className="mt-3 space-y-2">
      {[
        ["Start a New Company", "Perfect for entrepreneurs starting their first business venture"],
        ["Onboard Existing company", "Own or belong to a company, this is for you"],
      ].map(([title, sub]) => (
        <div key={title} className="rounded-lg bg-[#F5C518] px-2 py-2 text-center">
          <div className="text-[7.5px] font-bold text-[#1a1a1a]">{title}</div>
          <div className="text-[6px] text-[#1a1a1a]/70 leading-snug">{sub}</div>
        </div>
      ))}
    </div>
    <svg className="absolute left-0 right-0 bottom-0 w-full h-[22%]" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 14 C30 34 70 34 100 10 V40 H0 Z" fill="#F5C518" />
    </svg>
  </div>
);

// Centre: avatar + "One Dashboard to Manage all Your businesses" + Sign In / Start Building.
const WelcomeScreen = () => (
  <div className="relative flex-1 flex flex-col pt-4">
    <Logo size="h-8 sm:h-10" />
    <img
      src="/Images/focus-avatar.png"
      alt=""
      className="mx-auto mt-2 w-[64%] h-auto mix-blend-multiply"
    />
    <div className="absolute left-0 right-0 bottom-0 h-[44%] bg-[#F5C518] rounded-tl-[34px] rounded-tr-[10px] flex flex-col px-3 pt-4 pb-3">
      <div className="text-[12px] sm:text-[14px] font-extrabold text-center leading-tight text-[#1a1a1a]">
        One Dashboard to Manage all Your businesses
      </div>
      <div className="mt-auto flex items-center justify-between text-[8px] sm:text-[9px] font-semibold text-[#1a1a1a]">
        <span>Sign In</span>
        <span className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white ring-4 ring-white/50 flex items-center justify-center text-[#F5A300] text-sm">→</span>
        <span>Start Building</span>
      </div>
    </div>
  </div>
);

// Right: "Choose Your Business Type" on a yellow panel + "confused?" quiz bar.
const BusinessTypeScreen = () => (
  <div className="relative flex-1 flex flex-col pt-4">
    <Logo />
    <div className="absolute left-0 right-0 bottom-0 top-[23%] bg-[#F5C518] rounded-tl-[30px] flex flex-col px-2.5 pt-2.5 gap-0">
      <div className="text-[10px] sm:text-[11px] font-extrabold text-center text-[#1a1a1a]">Choose Your Business Type</div>
      <p className="text-[5.5px] text-center text-[#1a1a1a]/70 leading-snug px-2 mt-0.5">
        Select the business structure that best suits your needs and goals.
      </p>
      <div className="mt-1.5 space-y-[4px] px-1">
        {["Private limited", "Limited Liability Partnership", "Partnership", "Solo entrepreneur", "Sole Proprietorship", "Trust"].map((t) => (
          <div key={t} className="rounded-full bg-white py-[4px] text-center text-[6px] font-medium text-[#1a1a1a]">{t}</div>
        ))}
      </div>
      <div className="mt-auto -mx-2.5 relative bg-[#1a1a1a] rounded-t-xl px-3 pt-3 pb-2.5 translate-y-0">
        <span className="absolute -top-2 right-2 rounded-full bg-white px-2 py-[3px] text-[6px] font-semibold text-[#1a1a1a]">Take Quiz</span>
        <div className="text-[8px] font-bold text-white">confused ?</div>
        <div className="text-[5.5px] text-white/70">We're here to help! Your solution's just a page away.</div>
      </div>
    </div>
  </div>
);

const FEATURES = [
  {
    icon: Rocket,
    title: "Easy to Get Started",
    desc: "Pick a service, upload your documents and track everything from your dashboard.",
  },
  {
    icon: RefreshCw,
    title: "Always Improving",
    desc: "Regular updates designed to keep your workflow smooth and efficient.",
  },
];

const FocusSection = () => {
  const navigate = useNavigate();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-16 md:py-24" style={{ background: PAGE_BG }}>
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Phones — on a white panel with a soft yellow circle and a dot grid (design) */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={inView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-3xl bg-white py-10 sm:py-14 flex items-center justify-center overflow-hidden"
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] max-w-[560px] aspect-square rounded-full bg-[#FFF3C4]/70 blur-[2px]" aria-hidden="true" />
          <span
            className="absolute right-[8%] top-[10%] w-24 h-16 opacity-60"
            style={{ backgroundImage: "radial-gradient(#F5C518 1.2px, transparent 1.2px)", backgroundSize: "10px 10px" }}
            aria-hidden="true"
          />
          <Phone className="relative -mr-3 translate-y-6">
            <StartScreen />
          </Phone>
          <Phone tall className="relative z-10">
            <WelcomeScreen />
          </Phone>
          <Phone className="relative -ml-3 translate-y-6">
            <BusinessTypeScreen />
          </Phone>
        </motion.div>

        {/* Pitch */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={inView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a1a] leading-tight">
            Stay Focused on Your
            <span className="block text-[#F5C518]">Business Goals</span>
          </h2>
          <p className="text-[#1a1a1a]/60 text-base md:text-lg leading-relaxed max-w-xl">
            Manage your business from one connected platform. Track registrations, invoices, payments and
            compliance with a simpler, smarter workflow.
          </p>
          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <span className="w-11 h-11 flex-none rounded-xl bg-[#FFF3C4] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#1a1a1a]" />
                </span>
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-[#1a1a1a]">{title}</h3>
                  <p className="text-sm md:text-base text-[#1a1a1a]/55">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate("/bizpoleone")}
            className="px-6 py-3 rounded-full bg-[#F5C518] text-[#1a1a1a] text-sm md:text-base font-semibold shadow-lg shadow-[#F5C518]/30 hover:bg-[#e0b420] transition"
          >
            Explore Bizpole →
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default FocusSection;

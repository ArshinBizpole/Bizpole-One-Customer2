import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SiMeta, SiWhatsapp } from "react-icons/si";
import { Wallet, ListChecks, ShieldCheck, Headphones } from "lucide-react";

// Platform features: two features either side of the design's "Global Statistic"
// graphic (rebuilt in code from the Figma artboard). The tiles show services
// integrated into Bizpole One: Meta lead ads, WhatsApp, Easebuzz, DigiLocker.
const LEFT_FEATURES = [
  {
    icon: Wallet,
    title: "Save costs",
    desc: "Transparent, state-wise pricing with government fees shown upfront — no hidden charges.",
  },
  {
    icon: ListChecks,
    title: "Live tracking",
    desc: "Follow every service step by step, with documents and deliverables in your dashboard.",
  },
];

const RIGHT_FEATURES = [
  {
    icon: ShieldCheck,
    title: "Safe & secure",
    desc: "Your company documents are stored securely and shared only with your assigned team.",
  },
  {
    icon: Headphones,
    title: "Customer experience",
    desc: "A dedicated team guides you from application to completion — by phone, email or ticket.",
  },
];

const Feature = ({ icon: Icon, title, desc }) => (
  <div className="flex flex-col gap-3">
    <span className="w-12 h-12 rounded-xl bg-[#F5C518] flex items-center justify-center shadow-md shadow-[#F5C518]/30">
      <Icon className="w-6 h-6 text-[#1a1a1a]" />
    </span>
    <h3 className="text-lg font-bold text-[#1a1a1a]">{title}</h3>
    <p className="text-sm text-[#1a1a1a]/55 leading-relaxed max-w-[240px]">{desc}</p>
  </div>
);

// "Global Statistic" graphic, drawn to the design (300 × 350 artboard). Every
// position is a % of that artboard and text uses container units (cqw), so the
// whole composition scales as one piece.
const pct = (v, total) => `${(v / total) * 100}%`;
const box = (x, y, w, h) => ({ left: pct(x, 300), top: pct(y, 350), width: pct(w, 300), height: pct(h, 350) });

// Ring = coloured arc + a white remainder centred on the right-hand side.
const Ring = ({ r, color, sweep }) => {
  const c = 2 * Math.PI * r;
  return (
    <g transform={`rotate(${180 * (1 - sweep)} 85 97)`}>
      <circle cx="85" cy="97" r={r} fill="none" stroke="#ffffff" strokeWidth="6.5" />
      <circle cx="85" cy="97" r={r} fill="none" stroke={color} strokeWidth="6.5" strokeDasharray={`${c * sweep} ${c}`} />
    </g>
  );
};

// Integration tile: a yellow square holding the partner's logo (name on hover).
const IntegrationTile = ({ x, y, name, children }) => (
  <span
    className="absolute z-20 rounded-[14%] bg-[#F5C518] flex items-center justify-center shadow-md"
    style={box(x, y, 30, 30)}
    title={`Integrated with ${name}`}
    aria-label={`Integrated with ${name}`}
    role="img"
  >
    {children}
  </span>
);

const GlobalStatisticArt = () => (
  <div className="relative mx-auto w-[280px] sm:w-[340px] xl:w-[400px] max-w-full aspect-[300/350]" style={{ containerType: "inline-size" }}>
    {/* Dashed connector lines (behind everything) */}
    <svg className="absolute inset-0 w-full h-full z-0" viewBox="0 0 300 350" fill="none" aria-hidden="true">
      <g stroke="#3B9BEA" strokeWidth="1.3" strokeDasharray="3 3">
        <path d="M43 70 H76 V90" />
        <path d="M173 40 H150 V90" />
        <path d="M205 222 H240" />
        <path d="M43 300 H76 V305" />
      </g>
    </svg>

    {/* Main card */}
    <div className="absolute z-10 rounded-[5%] bg-[#141414] shadow-2xl" style={box(45, 85, 190, 225)}>
      <div className="absolute text-white font-bold text-[3.8cqw] leading-none whitespace-nowrap" style={{ left: "20%", top: "8.5%" }}>
        Global Statistic
      </div>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 190 225" aria-hidden="true">
        <Ring r={60} color="#2F80ED" sweep={0.76} />
        <Ring r={47} color="#9B51E0" sweep={0.8} />
        <Ring r={34} color="#F5A623" sweep={0.88} />
        {/* centre: trend icon, label, figure */}
        <circle cx="85" cy="82" r="7.5" fill="#ffffff" />
        <path d="M81 85 L84 82 L86.5 84.5 L89.5 80.5 M87 80.5 H89.5 V83" stroke="#141414" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="85" y="97" textAnchor="middle" fill="#ffffff" fontSize="4.5" opacity="0.8">Traffic Growth</text>
        <text x="85" y="112" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="700">68%</text>
        {/* ring legend: one grey panel per ring */}
        {[
          { x: 10, label: "Incorporation", color: "#2F80ED" },
          { x: 67, label: "GST & Tax", color: "#9B51E0" },
          { x: 124, label: "Compliance", color: "#F5A623" },
        ].map(({ x, label, color }) => (
          <g key={label}>
            <rect x={x} y="170" width="54" height="36" rx="3" fill="#D9D9D9" />
            <circle cx={x + 27} cy="182" r="3.2" fill={color} />
            <text x={x + 27} y="196" textAnchor="middle" fill="#1a1a1a" fontSize="6.2" fontWeight="600">{label}</text>
          </g>
        ))}
      </svg>
    </div>

    {/* Sales trend card */}
    <div className="absolute z-20 rounded-[8%] bg-[#141414] shadow-2xl border border-white/10" style={box(175, 65, 105, 115)}>
      <div className="absolute text-white/80 text-[2.3cqw] leading-none" style={{ left: "10%", top: "9%" }}>Sales trend</div>
      <div className="absolute text-white font-bold text-[5.6cqw] leading-none" style={{ left: "10%", top: "17%" }}>68%</div>
      <svg className="absolute left-[8%] right-[8%] top-[40%] w-[84%] h-[30%]" viewBox="0 0 90 34" fill="none" aria-hidden="true">
        <path d="M0 30 C10 30 14 6 26 8 S40 30 50 22 S62 4 72 10 S84 28 90 30" stroke="#F5A623" strokeWidth="1.8" />
        <path d="M0 32 C12 30 18 18 28 20 S44 6 54 12 S70 30 80 24 S88 18 90 20" stroke="#2F80ED" strokeWidth="1.8" />
      </svg>
      <div className="absolute rounded-full bg-[#D9D9D9] flex items-center px-[4%]" style={{ left: "10%", top: "76%", width: "62%", height: "8%" }}>
        <span className="h-[30%] w-full rounded-full bg-white" />
      </div>
    </div>

    {/* Yellow slider bar crossing the sales card's edge */}
    <div className="absolute z-30 rounded-full bg-[#141414] flex items-center" style={box(228, 119, 72, 13)}>
      <span className="absolute left-[-30%] h-[40%] w-[115%] rounded-full bg-[#F5C518]" />
    </div>

    {/* Integrations — services wired into Bizpole One */}
    <IntegrationTile x={13} y={55} name="Meta (Facebook lead ads)">
      <SiMeta className="w-[60%] h-[60%] text-[#0866FF]" />
    </IntegrationTile>
    <IntegrationTile x={173} y={13} name="WhatsApp">
      <SiWhatsapp className="w-[58%] h-[58%] text-[#25D366]" />
    </IntegrationTile>
    <IntegrationTile x={240} y={207} name="Easebuzz payments">
      <img src="/Images/integrations/easebuzz.png" alt="" className="w-[62%] h-[62%] rounded-[18%] object-cover" />
    </IntegrationTile>
    <IntegrationTile x={13} y={290} name="DigiLocker">
      <img src="/Images/integrations/digilocker.png" alt="" className="w-[58%] h-[58%] object-contain" />
    </IntegrationTile>
  </div>
);

const GlobalStats = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.15 } } };
  const fadeUp = {
    hidden: { y: 40, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        .gs-section { font-family: 'DM Sans', sans-serif; background: #f7f5f0; position: relative; overflow: hidden; }
        .gs-blob { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; }
        .gs-display { font-family: 'Syne', sans-serif; font-weight: 400; letter-spacing: -0.03em; line-height: 1.05; }
        .gs-tag {
          display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600;
          letter-spacing: 0.12em; text-transform: uppercase; color: rgba(26,26,26,0.45);
          border: 1px solid rgba(26,26,26,0.1); border-radius: 100px; padding: 5px 14px;
        }
      `}</style>

      <section ref={sectionRef} className="gs-section py-20 md:py-28">

        <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12">
          {/* Header */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate={isInView ? "show" : "hidden"}
            className="text-center mb-16 space-y-5"
          >
            <motion.div variants={fadeUp}>
              <span className="gs-tag">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5C518] animate-pulse" />
                Platform Features
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="gs-display text-[#1a1a1a] text-4xl md:text-6xl">
              Everything your{" "}
              <span className="relative inline-block">
                <span className="relative z-10">business</span>
                <motion.span
                  className="absolute inset-[-6px_-4px] bg-[#F5C518] rounded-2xl z-0"
                  initial={{ scaleX: 0 }}
                  animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
                  transition={{ delay: 0.7, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  style={{ originX: 0 }}
                />
              </span>{" "}
              needs
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[#1a1a1a]/50 text-base md:text-lg max-w-xl mx-auto font-light leading-relaxed">
              One platform to manage and track every registration, filing and compliance — in real time.
            </motion.p>
          </motion.div>

          {/* Features | overview card | features */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate={isInView ? "show" : "hidden"}
            className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-12 lg:gap-16 items-center"
          >
            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-10 lg:justify-items-end">
              {LEFT_FEATURES.map((f) => <Feature key={f.title} {...f} />)}
            </motion.div>

            <motion.div variants={fadeUp} className="py-10 px-6 sm:px-10">
              <GlobalStatisticArt />
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-10">
              {RIGHT_FEATURES.map((f) => <Feature key={f.title} {...f} />)}
            </motion.div>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default GlobalStats;

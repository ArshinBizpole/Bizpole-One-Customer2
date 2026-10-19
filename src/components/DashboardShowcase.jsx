import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useNavigate } from "react-router-dom";

// "One dashboard" showcase: a coded preview of the customer dashboard (left)
// and the pitch (right). Replaces the old template block ("Easy collaborative
// financial team", € wallet, "10,000 people have tried").
const SERVICES = [
  { name: "Private Limited Company", status: "In Process", cls: "bg-blue-500/20 text-blue-300" },
  { name: "GST Registration", status: "Completed", cls: "bg-green-500/20 text-green-300" },
  { name: "Trademark Registration", status: "Action Required", cls: "bg-orange-500/20 text-orange-300" },
];

const AVATARS = [
  "/Images/testimonials/aju.png",
  "/Images/testimonials/navy.png",
  "/Images/testimonials/riyas.png",
  "/Images/testimonials/client_.png",
];

const PreviewScreen = () => (
  <div className="rounded-2xl bg-[#F5C518] p-3 sm:p-5 shadow-2xl">
    <div className="rounded-xl bg-[#141414] p-3 sm:p-4 grid grid-cols-[auto_1fr] gap-3 sm:gap-4">
      {/* Sidebar */}
      <div className="hidden sm:flex flex-col gap-2 pr-3 border-r border-white/10 text-[10px] text-white/50">
        <span className="text-white font-semibold text-xs mb-1">Bizpole</span>
        {["Dashboard", "Orders", "My task", "Invoices", "Support"].map((item, i) => (
          <span key={item} className={i === 0 ? "text-[#F5C518]" : ""}>{item}</span>
        ))}
      </div>
      {/* Main */}
      <div className="min-w-0 col-span-2 sm:col-span-1">
        <div className="text-white text-sm font-semibold">Hello, Founder 👋</div>
        <div className="text-white/40 text-[10px] mb-3">Here's where your services stand</div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[["Active services", "3"], ["Documents due", "1"], ["Invoices", "2"]].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-white/5 p-2">
              <div className="text-[9px] text-white/40">{label}</div>
              <div className="text-white text-base font-bold">{value}</div>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {SERVICES.map((s) => (
            <div key={s.name} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-2">
              <span className="text-[11px] text-white/80 truncate">{s.name}</span>
              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${s.cls}`}>{s.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const DashboardShowcase = () => {
  const navigate = useNavigate();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="bg-[#f7f5f0] py-16 md:py-24">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left: dashboard preview on a dark stage */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={inView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl bg-[#0f0f0f] p-5 sm:p-8 shadow-2xl"
        >
          <PreviewScreen />
        </motion.div>

        {/* Right: pitch */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={inView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a1a] leading-tight">
            Easy collaborative business team
          </h2>
          <p className="text-[#1a1a1a]/55 text-base md:text-lg leading-relaxed max-w-md">
            No more chasing documents or deadlines — your registrations, payments, invoices and
            compliance live in one dashboard, shared with your Bizpole team.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex">
              {AVATARS.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover border-2 border-white"
                  style={{ marginLeft: i === 0 ? 0 : -10 }}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-[#1a1a1a]">Trusted by founders across India</span>
          </div>
          <button
            onClick={() => navigate("/startbusiness/services")}
            className="px-6 py-3 rounded-full bg-[#F5C518] text-[#1a1a1a] text-sm font-semibold shadow-lg shadow-[#F5C518]/30 hover:bg-[#e0b420] transition"
          >
            Get Started →
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default DashboardShowcase;

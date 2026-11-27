import { useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Phone, Mail, FileText, Plus } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "./Reveal";

const CONTACTS = [
  { icon: Phone, label: "Call us", value: "+91 95399 95533", href: "tel:+919539995533" },
  { icon: Mail, label: "Email us", value: "info@bizpole.in", href: "mailto:info@bizpole.in" },
  { icon: FileText, label: "Refund policy", value: "Cancellation & refunds", href: "/cancellation-refund-policy" },
];

const FAQS = [
  {
    q: "Will I know the total cost before I pay?",
    a: "Yes. Every service shows our fee and the government fees for your state upfront, before you pay. No hidden charges.",
  },
  {
    q: "How do I know what's happening with my application?",
    a: "Every service is tracked in your dashboard — you can see each step, the documents shared and the deliverables as soon as they're ready.",
  },
  {
    q: "Which documents will I need?",
    a: "It depends on the service. Once you choose one, we tell you exactly what's needed and you upload everything from your dashboard.",
  },
  {
    q: "I already have a company. Can Bizpole help?",
    a: "Absolutely. Onboard your existing company and our team can take care of GST, filings and ongoing compliance for you.",
  },
  {
    q: "Who do I talk to if I have a question?",
    a: "You get a dedicated team. Reach them by phone, by email, or by raising a ticket from your dashboard.",
  },
  {
    q: "What if I need to cancel?",
    a: "Cancellations and refunds follow our Cancellation and Refund Policy, which you can read before you buy.",
  },
];

export default function CustomerSupport() {
  const [openFaq, setOpenFaq] = useState(0);
  const sectionRef = useRef(null);
  const headRef = useRef(null);
  const headInView = useInView(headRef, { once: true, margin: "-80px" });

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.13 } } };
  const fadeUp = {
    hidden: { y: 30, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        .cs2-section { font-family: 'DM Sans', sans-serif; background: #f7f5f0; position: relative; overflow: hidden; }
        .cs2-grain {
          position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.032;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 180px;
        }
        .cs2-blob { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; }
        .cs2-display { font-weight: 600; letter-spacing: -0.025em; line-height: 1.1; }

      `}</style>

      <section ref={sectionRef} className="cs2-section py-16 md:py-24">

        <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12">

          {/* ── Top text block ── */}
          <motion.div
            ref={headRef}
            variants={stagger}
            initial="hidden"
            animate={headInView ? "show" : "hidden"}
            className="space-y-6"
          >
            {/* Tag */}
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-[#1a1a1a]/45 border border-[#1a1a1a]/10 rounded-full px-4 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5C518] inline-block" />
                Help &amp; Support
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h2 variants={fadeUp} className="cs2-display text-[#1a1a1a] text-3xl md:text-5xl max-w-3xl">
              Entrepreneurship is a journey.{" "}
              <span className="relative inline-block">
                <span className="relative z-10">We make it easier</span>
                <motion.span
                  className="absolute inset-[-5px_-3px] bg-[#F5C518] rounded-xl z-0"
                  initial={false}
                  transition={{ delay: 0.65, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  style={{ originX: 0 }}
                />
              </span>
            </motion.h2>

            <motion.p variants={fadeUp} className="text-[#1a1a1a]/60 text-base md:text-lg leading-relaxed max-w-2xl">
              From incorporation and tax filing to compliance, a real person is always a call or an email away —
              and every service is tracked in your dashboard.
            </motion.p>

            {/* Contact cards */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {CONTACTS.map(({ icon: Icon, label, value, href }) => (
                <a
                  key={label}
                  href={href}
                  className="group flex items-center gap-4 rounded-2xl bg-white border border-[#1a1a1a]/[0.06] px-5 py-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-[#F5C518]"
                >
                  <span className="w-11 h-11 flex-none rounded-xl bg-[#FFF3C4] flex items-center justify-center transition-colors group-hover:bg-[#F5C518]">
                    <Icon className="w-5 h-5 text-[#1a1a1a]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-[#1a1a1a]/45">{label}</span>
                    <span className="block font-semibold text-[#1a1a1a] truncate">{value}</span>
                  </span>
                </a>
              ))}
            </motion.div>
          </motion.div>

          {/* FAQ */}
          <div className="mt-16 md:mt-20 grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-8 lg:gap-16">
            <Reveal>
              <h3 className="cs2-display text-[#1a1a1a] text-2xl md:text-4xl">Questions before you start?</h3>
              <p className="mt-3 text-[#1a1a1a]/55 text-base leading-relaxed max-w-sm">
                The things founders ask us most. Can't find yours? Call or email us — we're happy to help.
              </p>
            </Reveal>
            <RevealGroup className="space-y-3">
              {FAQS.map((f, i) => {
                const open = i === openFaq;
                return (
                  <RevealItem
                    key={f.q}
                    className={`rounded-2xl border transition-colors duration-300 ${open ? "bg-white border-[#F5C518] shadow-md" : "bg-white/60 border-[#1a1a1a]/[0.07] hover:bg-white"}`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? -1 : i)}
                      aria-expanded={open}
                      className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 font-semibold text-[#1a1a1a]"
                    >
                      {f.q}
                      <Plus className={`w-5 h-5 flex-none transition-transform duration-300 ${open ? "rotate-45" : ""}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <p className="px-5 pb-5 text-[#1a1a1a]/65 leading-relaxed">{f.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          </div>

        </div>
      </section>
    </>
  );
}
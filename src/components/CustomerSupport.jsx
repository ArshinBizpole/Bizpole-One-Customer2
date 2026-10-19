import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function CustomerSupport() {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const headRef = useRef(null);
  const ctaRef = useRef(null);
  const headInView = useInView(headRef, { once: true, margin: "-80px" });
  const ctaInView = useInView(ctaRef, { once: true, margin: "-60px" });

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const glowY = useTransform(scrollYProgress, [0, 1], [30, -30]);
  const textY = useTransform(scrollYProgress, [0, 1], [20, -20]);

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
        .cs2-display { font-family: 'Syne', sans-serif; font-weight: 500; letter-spacing: -0.03em; line-height: 1.05; }

        /* Dark CTA banner */
        .cta-banner {
          background: radial-gradient(ellipse 70% 80% at 30% 50%, #2a2a2a 0%, #111111 55%, #0a0a0a 100%);
          border-radius: 28px;
          position: relative;
          overflow: hidden;
        }
        /* Inner gloss reflections */
        .cta-gloss-top {
          position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
        }
        .cta-gloss-inner {
          position: absolute; top: 0; left: 0; right: 0; height: 50%;
          background: radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 70%);
          pointer-events: none;
        }
        /* Ambient glow blob inside banner */
        .cta-glow {
          position: absolute; border-radius: 50%; pointer-events: none;
          background: radial-gradient(circle, rgba(80,70,40,0.7) 0%, transparent 70%);
          filter: blur(50px);
          width: 400px; height: 300px;
          bottom: -60px; left: -40px;
        }

        /* Get Started button */
        .gs-btn {
          display: inline-flex; align-items: center; gap: 10px;
          background: #F5C518;
          color: #1a1a1a;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 15px;
          border-radius: 100px;
          padding: 14px 28px;
          border: none; cursor: pointer;
          position: relative; overflow: hidden;
          transition: box-shadow 0.3s, transform 0.25s;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .gs-btn::before {
          content: '';
          position: absolute; inset: 0;
          background: #fff;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .gs-btn:hover { box-shadow: 0 8px 32px rgba(245,197,24,0.55); transform: translateY(-2px) scale(1.03); }
        .gs-btn:hover::before { opacity: 0.14; }
        .gs-btn:active { transform: scale(0.97); }

        .arrow-circle {
          width: 30px; height: 30px; border-radius: 50%;
          background: rgba(26,26,26,0.15);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; transition: transform 0.3s;
        }
        .gs-btn:hover .arrow-circle { transform: translateX(3px); }

        /* Feature pills */
        .feat-pill {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 100px;
          padding: 5px 12px;
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          font-family: 'DM Sans', sans-serif;
        }
        .feat-pill-dot {
          width: 5px; height: 5px; border-radius: 50%; background: #F5C518;
          flex-shrink: 0;
        }
      `}</style>

      <section ref={sectionRef} className="cs2-section py-16 md:py-24">

        <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12">

          {/* ── Top text block ── */}
          <motion.div
            ref={headRef}
            variants={stagger}
            initial="hidden"
            animate={headInView ? "show" : "hidden"}
            className="mb-14 space-y-6"
          >
            {/* Tag */}
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-[#1a1a1a]/45 border border-[#1a1a1a]/10 rounded-full px-4 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5C518] animate-pulse inline-block" />
                Support
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h2 variants={fadeUp} className="cs2-display text-[#1a1a1a] text-3xl md:text-5xl max-w-3xl">
              Entrepreneurship is a journey.{" "}
              <span className="relative inline-block">
                <span className="relative z-10">We make it easier</span>
                <motion.span
                  className="absolute inset-[-5px_-3px] bg-[#F5C518] rounded-xl z-0"
                  initial={{ scaleX: 0 }}
                  animate={headInView ? { scaleX: 1 } : { scaleX: 0 }}
                  transition={{ delay: 0.65, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  style={{ originX: 0 }}
                />
              </span>
            </motion.h2>

            {/* Body + features grid */}
            <motion.div variants={fadeUp} className="flex flex-col md:flex-row gap-8 md:gap-16 items-start">
              <p className="text-[#1a1a1a]/52 text-base leading-relaxed font-light ">
                From incorporation and tax filing to compliance, our team guides you through every step, and you can
                follow each service from your dashboard. Questions? Call{" "}
                <a href="tel:+919539995533" className="underline underline-offset-2">+91 95399 95533</a> or write to{" "}
                <a href="mailto:info@bizpole.in" className="underline underline-offset-2">info@bizpole.in</a>.
                Cancellations and refunds follow our{" "}
                <a href="/cancellation-refund-policy" className="underline underline-offset-2">Cancellation and Refund Policy</a>.
              </p>

            
            </motion.div>
          </motion.div>

          {/* ── Dark CTA Banner ── */}
          <motion.div
            ref={ctaRef}
            initial={{ y: 50, opacity: 0, scale: 0.97 }}
            animate={ctaInView ? { y: 0, opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Curtain reveal */}
            <motion.div
              initial={{ scaleY: 1 }}
              animate={ctaInView ? { scaleY: 0 } : { scaleY: 1 }}
              transition={{ duration: 0.75, delay: 0.15, ease: [0.76, 0, 0.24, 1] }}
              style={{ originY: 0 }}
              className="absolute inset-0 bg-[#F5C518] rounded-[28px] z-20 pointer-events-none"
            />

            <div className="cta-banner px-8 md:px-14 py-10 md:py-12">
              <div className="cta-gloss-top" />
              <div className="cta-gloss-inner" />
              <motion.div className="cta-glow" style={{ y: glowY }} />

              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">

                {/* Left: headline + pills */}
                <motion.div style={{ y: textY }} className="space-y-5">
                  <h3 className="cs2-display text-white text-3xl md:text-5xl lg:text-6xl">
                    Ready to work
                   
                    <span className="text-[#F5C518]"> with us</span> ?
                  </h3>

                 
                </motion.div>

                {/* Right: CTA button */}
                <motion.div
                  initial={{ x: 30, opacity: 0 }}
                  animate={ctaInView ? { x: 0, opacity: 1 } : {}}
                  transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-start md:items-end gap-3"
                >
                  <button className="gs-btn" onClick={() => navigate("/startbusiness")}>
                    Get Started
                    <span className="arrow-circle">→</span>
                  </button>
                 
                </motion.div>

              </div>
            </div>
          </motion.div>

        </div>
      </section>
    </>
  );
}
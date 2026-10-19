import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { testimonials } from "../data/testimonials";

// ── Single Card ──────────────────────────────────────────────────────────────
// All cards share one size so the grid gaps stay even; only colour marks the featured one.
function TestimonialCard({ item, index, active }) {
  const isFeatured = index === active;

  return (
    <div
      className={`relative h-full min-h-[260px] rounded-[24px] p-8 md:p-9 flex flex-col gap-6 cursor-pointer select-none
        transition-colors duration-500
        ${isFeatured
          ? "bg-[#F5C518] shadow-2xl shadow-[#F5C518]/30"
          : "bg-[#e8e5de]"
        }`}
    >
      {/* Quote mark */}
      <div className={`absolute top-5 right-7 text-7xl font-serif leading-none select-none
        ${isFeatured ? "text-[#1a1a1a]/15" : "text-[#1a1a1a]/10"}`}>
        "
      </div>

      {/* Author */}
      <div className="flex items-center gap-4 pr-10">
        <img
          src={item.img}
          alt={item.name}
          className={`w-16 h-16 rounded-full object-cover ring-2 flex-shrink-0
            ${isFeatured ? "ring-white/60" : "ring-white/40"}`}
        />
        <div className="min-w-0">
          <div className="font-bold text-lg leading-tight text-[#1a1a1a]">
            {item.name}
          </div>
          <div className={`text-sm mt-1 ${isFeatured ? "text-[#1a1a1a]/60" : "text-[#1a1a1a]/50"}`}>
            {item.role}
          </div>
        </div>
      </div>

      {/* Text */}
      <p className={`text-base md:text-[17px] leading-relaxed ${isFeatured ? "text-[#1a1a1a]/80" : "text-[#1a1a1a]/70"}`}>
        {item.text}
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ClientsSection() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const sectionRef = useRef(null);
  const headRef = useRef(null);
  const trackRef = useRef(null);
  const headInView = useInView(headRef, { once: true, margin: "-80px" });
  const dragStartX = useRef(0);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  const prev = () => {
    setDirection(-1);
    setActive((p) => (p - 1 + testimonials.length) % testimonials.length);
  };
  const next = () => {
    setDirection(1);
    setActive((p) => (p + 1) % testimonials.length);
  };

  // Visible cards: active + next 2
  const visible = [0, 1, 2].map((offset) => ({
    item: testimonials[(active + offset) % testimonials.length],
    index: offset,
  }));

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
  const fadeUp = {
    hidden: { y: 32, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        .cs-section { font-family: 'DM Sans', sans-serif; background: #f7f5f0; position: relative; overflow: hidden; }
        .cs-grain {
          position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.032;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 180px;
        }
        .cs-blob { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; }
        .cs-display { font-family: 'Syne', sans-serif; font-weight: 500; letter-spacing: -0.03em; line-height: 1.05; }
        .cs-track::-webkit-scrollbar { display: none; }
        .cs-track { -ms-overflow-style: none; scrollbar-width: none; }
        .nav-btn {
          width: 48px; height: 48px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; border: none; transition: all 0.25s;
          font-size: 18px;
        }
        .nav-btn-outline {
          background: transparent;
          border: 1.5px solid rgba(26,26,26,0.2) !important;
          color: rgba(26,26,26,0.5);
        }
        .nav-btn-outline:hover { border-color: rgba(26,26,26,0.5) !important; color: #1a1a1a; }
        .nav-btn-yellow { background: #F5C518; color: #1a1a1a; box-shadow: 0 6px 20px rgba(245,197,24,0.4); }
        .nav-btn-yellow:hover { transform: scale(1.08); box-shadow: 0 8px 28px rgba(245,197,24,0.55); }
      `}</style>

      <section ref={sectionRef} className="cs-section py-20 md:py-28">

        <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12">

          {/* ── Header row ── */}
          <motion.div
            ref={headRef}
            variants={stagger}
            initial="hidden"
            animate={headInView ? "show" : "hidden"}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
          >
            <div className="space-y-3 max-w-xl">
              <motion.div variants={fadeUp}>
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-[#1a1a1a]/45 border border-[#1a1a1a]/10 rounded-full px-4 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F5C518] animate-pulse inline-block" />
                  Client Stories
                </span>
              </motion.div>

              <motion.h2 variants={fadeUp} className="cs-display text-[#1a1a1a] text-3xl md:text-5xl">
                What Our{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">Clients</span>
                  <motion.span
                    className="absolute inset-[-5px_-3px] bg-[#F5C518] rounded-xl z-0"
                    initial={{ scaleX: 0 }}
                    animate={headInView ? { scaleX: 1 } : { scaleX: 0 }}
                    transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    style={{ originX: 0 }}
                  />
                </span>{" "}
                Said About Us
              </motion.h2>
            </div>

            {/* Nav buttons */}
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              {/* Progress indicator */}
              <div className="hidden md:flex items-center gap-1.5 mr-2">
                {testimonials.map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      width: i === active ? 24 : 6,
                      background: i === active ? "#F5C518" : "rgba(26,26,26,0.15)",
                    }}
                    transition={{ duration: 0.35 }}
                    className="h-1.5 rounded-full cursor-pointer"
                    onClick={() => { setDirection(i > active ? 1 : -1); setActive(i); }}
                  />
                ))}
              </div>

              <motion.button
                className="nav-btn nav-btn-outline"
                onClick={prev}
                whileTap={{ scale: 0.9 }}
                whileHover={{ x: -2 }}
              >
                ←
              </motion.button>
              <motion.button
                className="nav-btn nav-btn-yellow"
                onClick={next}
                whileTap={{ scale: 0.9 }}
                whileHover={{ x: 2 }}
              >
                →
              </motion.button>
            </motion.div>
          </motion.div>

          {/* ── Cards Track ── */}
          <motion.div
            style={{ y: bgY }}
            className="relative"
          >
            {/* Equal-width columns + fixed gap = evenly spaced cards (2nd/3rd hide on small screens) */}
            <motion.div
              ref={trackRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 pb-4 cursor-grab active:cursor-grabbing"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragStart={(_, info) => { dragStartX.current = info.point.x; }}
              onDragEnd={(_, info) => {
                const delta = info.point.x - dragStartX.current;
                if (delta < -40) next();
                else if (delta > 40) prev();
              }}
            >
              <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                {visible.map(({ item, index }) => (
                  <motion.div
                    key={`${active}-${index}`}
                    custom={direction}
                    variants={{
                      enter: (d) => ({ x: d > 0 ? 80 : -80, opacity: 0, scale: 0.95 }),
                      center: { x: 0, opacity: 1, scale: 1 },
                      exit: (d) => ({ x: d > 0 ? -80 : 80, opacity: 0, scale: 0.95 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className={`h-full ${index === 1 ? "hidden md:block" : ""} ${index === 2 ? "hidden lg:block" : ""}`}
                  >
                    <TestimonialCard item={item} index={index} active={0} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </motion.div>

        </div>
      </section>
    </>
  );
}
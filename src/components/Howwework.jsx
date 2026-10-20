import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";

// "How to use Bizpole One" walkthrough (built in bizpole-one-customer-ad-video, served from public/videos).
const HOWTO_VIDEO = {
  landscape: { src: "/videos/bizpole-one-how-to-use.mp4", poster: "/videos/bizpole-one-how-to-use-poster.jpg" },
  portrait: { src: "/videos/bizpole-one-how-to-use-vertical.mp4", poster: "/videos/bizpole-one-how-to-use-vertical-poster.jpg" },
  captions: "/videos/bizpole-one-how-to-use.en.vtt",
  // Card thumbnail with a clear centre for the play button.
  thumb: "/videos/bizpole-one-how-to-use-thumb.jpg",
};

const Howwework = () => {
  const sectionRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const [videoOpen, setVideoOpen] = useState(false);
  // Portrait screens (phones) get the 9:16 cut so the video fills the modal.
  const [portrait, setPortrait] = useState(false);
  const openVideos = () => {
    setPortrait(window.innerHeight > window.innerWidth);
    setVideoOpen(true);
  };
  const closeVideo = () => setVideoOpen(false);
  const [hoveringPlay, setHoveringPlay] = useState(false);

  // Close on Escape and lock page scroll while the video modal is open.
  useEffect(() => {
    if (!videoOpen) return;
    const onKey = (e) => e.key === "Escape" && setVideoOpen(false);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [videoOpen]);

  const video = portrait ? HOWTO_VIDEO.portrait : HOWTO_VIDEO.landscape;

  const leftInView = useInView(leftRef, { once: true, margin: "-80px" });
  const rightInView = useInView(rightRef, { once: true, margin: "-80px" });

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const rawY = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const y = useSpring(rawY, { stiffness: 60, damping: 18 });
  const cardRotate = useTransform(scrollYProgress, [0, 0.5, 1], [2, 0, -1]);

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.13 } },
  };
  const fadeUp = {
    hidden: { y: 36, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } },
  };
  const fadeLeft = {
    hidden: { x: -50, opacity: 0 },
    show: { x: 0, opacity: 1, transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap');

        .hww-section {
          font-family: 'DM Sans', sans-serif;
          background: #f7f5f0;
          position: relative;
          overflow: hidden;
        }
        .hww-grain {
          position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 180px;
        }
        .hww-blob {
          position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none;
        }
        .hww-display {
          font-family: 'Syne', sans-serif;
          font-weight: 500;
          letter-spacing: -0.03em;
          line-height: 1.05;
        }
        .hww-card {
          background: linear-gradient(135deg, #d4d0c8 0%, #c8c4bb 50%, #bcb8b0 100%);
          position: relative;
          overflow: hidden;
        }
        .hww-card::before {
          content: '';
          position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='t'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23t)' opacity='0.15'/%3E%3C/svg%3E");
          background-size: cover;
          pointer-events: none;
        }
        .hww-label {
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 400;
          letter-spacing: 0.25em;
          text-transform: uppercase;
        }
        .play-ring {
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 2px solid #F5C518;
          opacity: 0;
          transform: scale(0.8);
          animation: ping-ring 2s ease-out infinite;
        }
        .play-ring:nth-child(2) { animation-delay: 0.6s; }
        @keyframes ping-ring {
          0%   { opacity: 0.7; transform: scale(0.85); }
          100% { opacity: 0;   transform: scale(1.6); }
        }
        .modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
          z-index: 100;
          display: flex; align-items: center; justify-content: center;
        }
        .modal-inner {
          width: 90vw; max-width: 1100px;
          aspect-ratio: 16/9;
          background: #111;
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          display: flex; align-items: center; justify-content: center;
        }
        .modal-close {
          position: absolute; top: 16px; right: 16px;
          width: 36px; height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 16px;
          transition: background 0.2s;
          z-index: 10;
        }
        .modal-close:hover { background: rgba(255,255,255,0.2); }
        .modal-inner.is-portrait {
          width: min(92vw, calc(86vh * 9 / 16)); max-width: none;
          aspect-ratio: 9/16;
        }
        .modal-inner .modal-close {
          background: rgba(17,17,17,0.6);
        }
        .modal-inner .modal-close:hover { background: rgba(17,17,17,0.8); }
        .modal-inner video {
          width: 100%; height: 100%; display: block; background: #FFF6EC;
        }
      `}</style>

      <section ref={sectionRef} className="hww-section py-20 md:py-28">

        <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

            {/* ── LEFT: Video Card ── */}
            <motion.div
              ref={leftRef}
              style={{ y, rotateY: cardRotate }}
              variants={fadeLeft}
              initial="hidden"
              animate={leftInView ? "show" : "hidden"}
              className="w-full lg:w-[52%] relative"
            >
              {/* Curtain reveal */}
              <motion.div
                initial={{ scaleY: 1, originY: 0 }}
                animate={leftInView ? { scaleY: 0 } : { scaleY: 1 }}
                transition={{ duration: 0.9, delay: 0.2, ease: [0.76, 0, 0.24, 1] }}
                className="absolute inset-0 bg-[#F5C518] z-20 rounded-[24px] pointer-events-none"
                style={{ originY: 0 }}
              />

              {/* Shadow glow */}
              <div className="absolute inset-x-8 -bottom-5 h-16 bg-black/20 blur-2xl rounded-full z-0" />

              {/* Card */}
              <motion.div
                className="hww-card rounded-[24px] aspect-video relative z-10 ring-1 ring-black/10 shadow-2xl cursor-pointer group"
                whileHover={{ scale: 1.015 }}
                transition={{ duration: 0.4 }}
                onClick={openVideos}
                role="button"
                aria-label="Play the How to use Bizpole One video"
              >
                {/* Video poster */}
                <img
                  src={HOWTO_VIDEO.thumb}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />

                {/* Decorative lines */}
                {[20, 40, 60, 80].map((x) => (
                  <div
                    key={x}
                    className="absolute top-0 bottom-0 w-px bg-white/5"
                    style={{ left: `${x}%` }}
                  />
                ))}

                {/* Play button — positioned at bottom-center overlapping edge */}
                <motion.button
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
                  onHoverStart={() => setHoveringPlay(true)}
                  onHoverEnd={() => setHoveringPlay(false)}
                  onClick={(e) => { e.stopPropagation(); openVideos(); }}
                  whileTap={{ scale: 0.92 }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={leftInView ? { scale: 1, opacity: 1 } : {}}
                  transition={{ delay: 1.0, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="relative w-16 h-16 md:w-20 md:h-20">
                    {/* Pulse rings */}
                    <div className="play-ring" />
                    <div className="play-ring" style={{ animationDelay: '0.7s' }} />

                    {/* Button disk */}
                    <motion.div
                      className="relative z-10 w-full h-full rounded-full bg-[#F5C518] shadow-lg shadow-[#F5C518]/40 flex items-center justify-center"
                      animate={{ scale: hoveringPlay ? 1.1 : 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#1a1a1a">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </motion.div>
                  </div>
                </motion.button>
              </motion.div>

              {/* Bottom spacer for play button overflow */}
              <div className="h-10" />
            </motion.div>

            {/* ── RIGHT: Text ── */}
            <motion.div
              ref={rightRef}
              variants={stagger}
              initial="hidden"
              animate={rightInView ? "show" : "hidden"}
              className="w-full lg:w-[48%] space-y-6 lg:pl-4"
            >
              {/* Tag */}
            

              {/* Headline */}
              <motion.h2 variants={fadeUp} className="hww-display text-[#1a1a1a] text-3xl md:text-5xl">
                One dashboard to{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">manage</span>
                  <motion.span
                    className="absolute inset-[-5px_-3px] bg-[#F5C518] rounded-xl z-0"
                    initial={{ scaleX: 0 }}
                    animate={rightInView ? { scaleX: 1 } : { scaleX: 0 }}
                    transition={{ delay: 0.7, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    style={{ originX: 0 }}
                  />
                </span>{" "}
                all your businesses at your fingertips.
              </motion.h2>

              {/* Body */}
             

           
              {/* CTA */}
              {/* <motion.div variants={fadeUp} className="flex items-center gap-4 pt-2">
                <motion.button
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white text-sm font-semibold px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow"
                  onClick={openVideos}
                >
                  <span>Watch the demo</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </motion.button>
                <motion.button
                  whileHover={{ x: 4 }}
                  className="text-sm font-medium text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
                >
                  Learn more →
                </motion.button>
              </motion.div> */}
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── Video modal ── */}
      <AnimatePresence>
        {videoOpen && (
          <motion.div
            className="modal-backdrop"
            onClick={closeVideo}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-label="How to use Bizpole One"
          >
            <motion.div
              className={`modal-inner${portrait ? " is-portrait" : ""}`}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <button className="modal-close" onClick={closeVideo} aria-label="Close video">
                ✕
              </button>
              <video src={video.src} poster={video.poster} controls autoPlay playsInline preload="auto">
                <track kind="captions" src={HOWTO_VIDEO.captions} srcLang="en" label="English" />
              </video>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Howwework;

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import SigninModal from "./Modals/SigninModal";
import { ChevronRight } from "lucide-react";

const StartYourBusinessContent = ({ onNext }) => {
  const navigate = useNavigate();
  const [showSigninModal, setShowSigninModal] = useState(false);

  const cards = [
    {
      id: "new",
      title: "Start a New Company",
      sub: "Perfect for entrepreneurs starting their first business venture",
      onClick: onNext,
    },
    {
      id: "existing",
      title: "Onboard Existing company",
      sub: "Own or belong to a company, this is for you",
      onClick: () => navigate("/existing-companies"),
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .syb-root { font-family: 'DM Sans', sans-serif; }
        .syb-display { font-family: 'Syne', sans-serif; font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; }

        /* Right action cards */
        .rc {
          width: 100%; text-align: left; background: transparent;
          border: none; padding: 0; cursor: pointer; border-radius: 18px;
        }
        .rc-inner {
          border-radius: 16px; padding: 16px 20px;
          background: #F5C518;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .rc:hover .rc-inner {
          transform: translateY(-2px);
        }

        /* Sign-in strip */
        .signin-strip {
          background: #f7f5f0; border-radius: 12px; padding: 12px 16px;
          border: 1.5px solid rgba(0,0,0,0.07);
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
        }
        .signin-btn {
          background: #F5C518; color: #1a1a1a;
          font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: 12px;
          border-radius: 100px; padding: 8px 18px; border: none; cursor: pointer;
          transition: all 0.25s; white-space: nowrap;
        }
        .signin-btn:hover { background: #F5C518; transform: translateY(-1px); }

        /* Center toggle arrow at the seam */
        .seam-toggle {
          position: absolute; top: 50%; left: 44%; transform: translate(-50%, -50%);
          width: 40px; height: 40px; border-radius: 50%;
          background: #ffffff; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #e6a500; font-size: 16px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.12);
          z-index: 5; transition: transform 0.25s;
        }
        .seam-toggle:hover { transform: translate(-50%, -50%) scale(1.08); }
      `}</style>

      <SigninModal isOpen={showSigninModal} onClose={() => setShowSigninModal(false)} />

      <motion.div
        className="syb-root w-full max-w-5xl shadow-sm"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.97 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ borderRadius: 28, overflow: "hidden", position: "relative" }}
      >
        <div className="flex flex-col lg:flex-row" style={{ minHeight: 480, position: "relative" }}>

          {/* ════ LEFT — YELLOW SWIRL PANEL ════ */}
          <div
            className="lg:w-[44%]"
            style={{
              background: "linear-gradient(145deg, #F5C518 0%, #f0b800 45%, #e6a500 100%)",
              position: "relative", overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "24px",
            }}
          >
            {/* Wavy swirl lines */}
            <svg
              viewBox="0 0 400 480"
              preserveAspectRatio="none"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.28 }}
            >
              {Array.from({ length: 9 }).map((_, i) => {
                const y = i * 60 - 20;
                return (
                  <path
                    key={i}
                    d={`M-20,${y + 30} C60,${y - 10} 120,${y + 70} 200,${y + 30} S340,${y - 10} 420,${y + 50}`}
                    stroke="white"
                    strokeWidth="1.4"
                    fill="none"
                  />
                );
              })}
            </svg>

            {/* Centered glass placeholder card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "relative", zIndex: 2,
                width: "70%", maxWidth: 260, height: "62%", maxHeight: 300,
                borderRadius: 22,
                background: "rgba(255,255,255,0.22)",
                border: "1px solid rgba(255,255,255,0.35)",
                backdropFilter: "blur(6px)",
              }}
            />
          </div>

          {/* ════ RIGHT — WHITE PANEL ════ */}
          <div
            className="lg:w-[56%]"
            style={{
              position: "relative", background: "#ffffff",
              display: "flex", flexDirection: "column", justifyContent: "center",
              gap: 22, padding: "28px 32px",
            }}
          >

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ position: "relative", zIndex: 2, alignSelf: "flex-end" }}
            >
              <img src="/Images/logo.webp" alt="Bizpole" style={{ height: 24, width: "auto" }} />
            </motion.div>

            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Heading */}
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.6 }}
              >
                <h1 className="syb-display" style={{ color: "#1a1a1a", fontSize: "clamp(1.4rem, 2.4vw, 1.9rem)", marginBottom: 6 }}>
                  Let's talk{" "}
                  <span style={{ position: "relative", display: "inline-block" }}>
                    <span style={{ position: "relative", zIndex: 1 }}>business!</span>
                    <motion.span
                      style={{ position: "absolute", inset: "-4px -3px", background: "#F5C518", borderRadius: 10, zIndex: 0, originX: 0 }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 0.85, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </span>
                </h1>
                <p style={{ color: "#9ca3af", fontSize: 13, fontWeight: 400, lineHeight: 1.5 }}>
                  To begin this journey, tell us what type of account you'd be opening.
                </p>
              </motion.div>

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {cards.map((card, i) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, x: 22 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + i * 0.13, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <motion.button
                      className="rc"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={card.onClick}
                    >
                      <div className="rc-inner">
                        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "#1a1a1a", marginBottom: 4 }}>
                          {card.title}
                        </div>
                        <div style={{ fontSize: 12, color: "#4a4a4a", fontWeight: 400 }}>
                          {card.sub}
                        </div>
                      </div>
                    </motion.button>
                  </motion.div>
                ))}
              </div>

              {/* Sign-in — kept as requested */}
              <motion.div
                className="signin-strip"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.74, duration: 0.5 }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12.5, color: "#1a1a1a", marginBottom: 2 }}>
                    Already have an account?
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 300 }}>
                    Sign in to continue where you left off
                  </div>
                </div>
                <motion.button
                  className="signin-btn"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowSigninModal(true)}
                >
                  Sign In →
                </motion.button>
              </motion.div>
            </div>
          </div>

          {/* Floating toggle at the seam */}
          <button className="seam-toggle" aria-label="Next">
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>

        </div>
      </motion.div>
    </>
  );
};

export default StartYourBusinessContent;
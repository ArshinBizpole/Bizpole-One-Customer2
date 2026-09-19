import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Factory, Ship, UtensilsCrossed } from "lucide-react";

// Sub-menu behind the "Other Registrations" card on NewCompanyServiceMenu — same
// split-card frame so the whole "Start a New Company" journey reads as one flow.
const OTHER_SERVICES = [
  {
    id: "msme",
    title: "MSME / Udyam Registration",
    desc: "For micro, small & medium enterprises.",
    icon: Factory,
    flowId: "msme",
  },
  {
    id: "iec",
    title: "Import Export Code (IEC)",
    desc: "For importers and exporters.",
    icon: Ship,
    flowId: "iec",
  },
  {
    id: "fssai",
    title: "FSSAI / Food License",
    desc: "Mandatory for any food business.",
    icon: UtensilsCrossed,
    flowId: "other-generic",
    initialSet: { other_service: "FSSAI / Food License" },
  },
];

const OtherRegistrationsMenu = ({ onBack }) => {
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&family=Poppins:wght@400;500;600;700;800&display=swap');
        .svm-root { font-family: 'Poppins', sans-serif; }
        .svm-card {
          border: 1.5px solid #F5C518; border-radius: 12px; background: #fff;
          padding: 12px 14px; display: flex; align-items: center; gap: 12px;
          cursor: pointer; transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .svm-card:hover { background: #FFFBEA; transform: translateY(-2px); }
        .svm-ic {
          width: 38px; height: 38px; border-radius: 10px; flex: none;
          background: #FFFBEA; color: #92620a;
          display: flex; align-items: center; justify-content: center;
        }
        .svm-title { font-weight: 700; font-size: 13.5px; color: #1a1a1a; }
        .svm-desc { font-size: 11.5px; color: #9ca3af; margin-top: 1px; }
        .svm-arrow { color: #cbb56a; flex: none; }
        .svm-back-btn {
          position: absolute; top: 50%; left: 44%; transform: translate(-50%, -50%);
          width: 40px; height: 40px; border-radius: 50%;
          background: #ffffff; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #e6a500; font-size: 16px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.12);
          z-index: 5; transition: transform 0.25s;
        }
        .svm-back-btn:hover { transform: translate(-50%, -50%) scale(1.08); }
      `}</style>

      <motion.div
        className="svm-root w-full max-w-5xl shadow-sm"
        initial={{ opacity: 0, x: 80, scale: 0.97 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -80, scale: 0.97 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{ borderRadius: 28, overflow: "hidden", position: "relative" }}
      >
        <div className="flex flex-col lg:flex-row relative" style={{ minHeight: 480 }}>

          <div className="lg:w-[52%]" style={{ display: "flex", flexDirection: "column", padding: "22px 28px 0", position: "relative" }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a" }}>
                Bizpo<span style={{ color: "#F5C518" }}>1</span>e
              </div>
              <div style={{ fontSize: 8, color: "#9ca3af", fontWeight: 500 }}>
                <span style={{ color: "#F5C518" }}>Start</span>{" · "}
                <span style={{ color: "#ef4444" }}>Run</span>{" · "}
                <span style={{ color: "#1a1a1a" }}>Grow</span>
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <h1 style={{ fontSize: 19, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>
                Which Registration Do You Need?
              </h1>
              <p style={{ fontSize: 11, color: "#9ca3af" }}>
                Pick the one that applies — we'll only ask what's relevant to it.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {OTHER_SERVICES.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.id}
                    className="svm-card"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 * idx, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate("/startbusiness/apply", { state: { flowId: s.flowId, initialSet: s.initialSet } })}
                  >
                    <span className="svm-ic"><Icon size={18} /></span>
                    <span style={{ flex: 1 }}>
                      <span className="svm-title" style={{ display: "block" }}>{s.title}</span>
                      <span className="svm-desc" style={{ display: "block" }}>{s.desc}</span>
                    </span>
                    <ChevronRight size={16} className="svm-arrow" />
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div style={{ position: "absolute", top: "50%", left: "52%", transform: "translate(-50%, -50%)", zIndex: 10 }}>
            <button className="svm-back-btn" onClick={onBack}>
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
          </div>

          <div
            className="lg:w-[48%]"
            style={{ background: "#F5C518", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          >
            <svg viewBox="0 0 400 480" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.28 }}>
              {Array.from({ length: 9 }).map((_, i) => {
                const y = i * 60 - 20;
                return (
                  <path key={i} d={`M-20,${y + 30} C60,${y - 10} 120,${y + 70} 200,${y + 30} S340,${y - 10} 420,${y + 50}`} stroke="white" strokeWidth="1.4" fill="none" />
                );
              })}
            </svg>
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
        </div>
      </motion.div>
    </>
  );
};

export default OtherRegistrationsMenu;

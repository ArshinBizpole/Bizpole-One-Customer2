import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { getAllServiceTypes } from "../api/ServiceType";

const ChooseBusinessType = ({ onBack }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const suggested = location.state?.suggested;
  const reason = location.state?.reason;
  const isDashBoard = location.state?.navigate || false;

  const [businessTypes, setBusinessTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAllServiceTypes()
      .then((data) => { setBusinessTypes(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError("Failed to load business types"); setLoading(false); });
  }, []);

  const normalize = (str) => (str || "").toLowerCase().replace(/[^a-z]/gi, "");

  const isSuggested = (typeName) => {
    if (!suggested) return false;
    let base = suggested.split(/\s*[,/()]|\s+or\s+/i).map(s => s.trim()).filter(Boolean);
    base.push(suggested);
    base = base.flatMap(s => [
      s, s.replace(/company|firm/gi, "").trim(),
      s.replace(/limited/gi, "ltd").trim(), s.replace(/ltd/gi, "limited").trim(),
      s.replace(/opc/gi, "one person company").trim(), s.replace(/one person company/gi, "opc").trim(),
    ]);
    const allSuggested = Array.from(new Set(base.filter(Boolean)));
    const normType = normalize(typeName);
    return allSuggested.some(s => {
      const normS = normalize(s);
      if (normType === normS) return true;
      if (normType.length <= 6 || normS.length <= 6) return normType.includes(normS) || normS.includes(normType);
      return false;
    });
  };

  const handleTypeClick = (type) => {
    const typeName = type.Service_Name || "";
    if (isDashBoard) navigate("/startbusiness/subscriptions", { state: { type: type.Id } });
    else navigate("/startbusiness/about", { state: { selectedType: typeName, type: type.Id } });
  };

  // Split the recommended type (from the quiz) out of the grid
  const recommendedType = !loading && !error
    ? businessTypes.find((t) => isSuggested(t.Service_Name || ""))
    : null;
  const gridTypes = recommendedType
    ? businessTypes.filter((t) => (t.Id || t.Service_Name) !== (recommendedType.Id || recommendedType.Service_Name))
    : businessTypes;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&family=Poppins:wght@400;500;600;700;800&display=swap');
        .cbt-root { font-family: 'Poppins', sans-serif; }
        .cbt-hand { font-family: 'Kalam', cursive; }

        .cbt-card {
          border: 1.5px solid #F5C518;
          border-radius:10px;
          background: #fff;
          padding: 8px 12px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .cbt-card:hover {
          background: #FFFBEA;
          transform: translateY(-2px);
        }

        /* Recommended (full-width) card */
        .cbt-reco {
          position: relative;
          border: 2px solid #F5C518;
          border-radius: 12px;
          background: #fff;
          padding: 14px 16px 16px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .cbt-reco:hover { background: #FFFBEA; transform: translateY(-2px); }
        .cbt-reco-title {
          font-family: 'Kalam', cursive;
          font-size: 15px; font-weight: 700; color: #E0A200;
          margin-bottom: 3px; line-height: 1.2;
        }
        .cbt-reco-sub { font-size: 12px; color: #4b5563; line-height: 1.3; }
        .cbt-reco-badge {
          position: absolute; bottom: -13px; right: 16px;
          background: #fff; color: #1a1a1a;
          font-weight: 700; font-size: 11px;
          padding: 5px 14px; border-radius: 100px;
          box-shadow: 0 6px 16px rgba(0,0,0,0.18);
          white-space: nowrap;
        }

        /* Scrollable types region so the last box is always fully visible */
        .cbt-scroll {
          overflow-y: auto;
          max-height: 214px;
          padding-right: 4px;
        }
        .cbt-scroll::-webkit-scrollbar { width: 5px; }
        .cbt-scroll::-webkit-scrollbar-thumb { background: #e5cf7a; border-radius: 999px; }
        .cbt-scroll::-webkit-scrollbar-track { background: transparent; }

        .cbt-skel {
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: cbt-shine 1.4s ease infinite;
          border-radius: 999px; height: 38px;
        }
        @keyframes cbt-shine { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        .cbt-quiz-btn {
          background: #fff; color: #1a1a1a;
          font-weight: 700; font-size: 11.5px;
          border-radius: 100px; padding: 7px 16px; border: none; cursor: pointer;
          transition: all 0.25s;
          box-shadow: 0 6px 16px rgba(0,0,0,0.18);
        }
        .cbt-quiz-btn:hover { background: #F5C518; transform: translateY(-1px); }

        .cbt-back-btn {
          position: absolute; top: 50%; left: 44%; transform: translate(-50%, -50%);
          width: 40px; height: 40px; border-radius: 50%;
          background: #ffffff; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #e6a500; font-size: 16px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.12);
          z-index: 5; transition: transform 0.25s;
        }
        .cbt-back-btn:hover { transform: translate(-50%, -50%) scale(1.08); }
      `}</style>

      <motion.div
        className="cbt-root w-full max-w-5xl shadow-sm"
        initial={{ opacity: 0, x: 80, scale: 0.97 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -80, scale: 0.97 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{ borderRadius: 28, overflow: "hidden", position: "relative" }}
      >
        <div className="flex flex-col lg:flex-row relative" style={{ minHeight: 480 }}>

          {/* ════ LEFT — WHITE PANEL ════ */}
          <div
            className="lg:w-[52%]"
            style={{ display: "flex", flexDirection: "column", padding: "22px 28px 0", position: "relative" }}
          >
            {/* Logo */}
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

            {/* Heading */}
            <div style={{ marginBottom: 16 }}>
              <h1 style={{ fontSize: 19, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>
                Choose Your Business Type 
              </h1>
              <p style={{ fontSize: 11, color: "#9ca3af" }}>
                Select the business structure that best suits your needs and goals.
              </p>
            </div>

            {/* Recommended card (only after quiz, when a match is found) */}
            {recommendedType && (
              <motion.div
                className="cbt-reco"
                style={{ marginBottom: 22 }}
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTypeClick(recommendedType)}
              >
                <div className="cbt-reco-title">{recommendedType.Service_Name}</div>
                <div className="cbt-reco-sub">
                  {reason || "Best match based on your quiz answers."}
                </div>
                <span className="cbt-reco-badge">we recommended</span>
              </motion.div>
            )}

            {/* Business type grid (scrolls if it overflows) */}
            <div className="cbt-scroll">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {loading && Array.from({ length: 6 }).map((_, i) => (
                  <motion.div key={i} className="cbt-skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }} />
                ))}
                {error && (
                  <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#ef4444", fontSize: 14 }}>{error}</div>
                )}
                {!loading && !error && gridTypes.map((type, idx) => {
                  const typeName = type.Service_Name || "";
                  return (
                    <motion.div
                      key={type.Id || typeName}
                      className="cbt-card"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.06 * idx, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleTypeClick(type)}
                    >
                      <span className="cbt-hand" style={{ fontSize: 12, color: "#1a1a1a", textAlign: "center" }}>
                        {typeName}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Confused strip */}
            <div style={{ position: "relative", marginTop: "10px", marginBottom: "10px", paddingTop: 18 }}>
              <motion.button
                className="cbt-quiz-btn"
                style={{ position: "absolute", top: 4, right: 18, zIndex: 2 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/quiz")}
              >
                Take Quiz
              </motion.button>
              <div style={{
                background: "#1a1a1a", borderRadius: "16px",
                padding: "16px 20px 18px",
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#fff", marginBottom: 4 }}>Confused?</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                  We're here to help! Your solution's just a page away.
                </div>
              </div>
            </div>
          </div>

          {/* ════ CENTER — BACK BUTTON (on the seam) ════ */}
          <div style={{
            position: "absolute", top: "50%", left: "52%",
            transform: "translate(-50%, -50%)", zIndex: 10,
          }}>
            <button
              className="cbt-back-btn"
              onClick={isDashBoard ? () => navigate(-1) : onBack}
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
          </div>

          {/* ════ RIGHT — YELLOW PANEL ════ */}
          <div
            className="lg:w-[48%]"
            style={{
              background: "#F5C518",
              position: "relative", overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 24,
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

            {/* Placeholder card / illustration slot */}
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

export default ChooseBusinessType;

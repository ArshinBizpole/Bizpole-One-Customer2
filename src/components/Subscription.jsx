import { useState, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getPackagesByServiceType } from "../api/ServiceType";
import { upsertQuote } from "../api/Quote";
import { motion } from "framer-motion";
import { Check, Calendar, ArrowRight, Zap } from "lucide-react";
import { setSecureItem, getSecureItem } from "../utils/secureStorage";
import { CartContext } from "../context/CartContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ── Brand decorations ─────────────────────────────────────────────────────────
function FloatingOrb({ style, delay = 0 }) {
  return (
    <motion.div
      style={{ position: "absolute", borderRadius: "50%", pointerEvents: "none", ...style }}
      animate={{ y: [-14, 14, -14], x: [-7, 7, -7], scale: [1, 1.1, 1] }}
      transition={{ duration: 6 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

function Sparkle({ style, delay = 0 }) {
  return (
    <motion.div
      style={{ position: "absolute", width: 4, height: 4, borderRadius: "50%", background: "rgba(245,197,24,0.6)", pointerEvents: "none", ...style }}
      animate={{ opacity: [0, 1, 0], scale: [0, 1.4, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay, repeatDelay: 1.8 }}
    />
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ borderRadius: 24, border: "1.5px solid rgba(0,0,0,0.07)", background: "#fff", padding: "28px 24px", height: 540 }}>
      <div style={{ height: 20, borderRadius: 10, background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "sub-skel 1.4s ease infinite", marginBottom: 12 }} />
      <div style={{ height: 40, borderRadius: 10, background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "sub-skel 1.4s ease infinite 0.1s", marginBottom: 16, width: "60%" }} />
      <div style={{ height: 14, borderRadius: 8, background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "sub-skel 1.4s ease infinite 0.2s", marginBottom: 8 }} />
      <div style={{ height: 14, borderRadius: 8, background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "sub-skel 1.4s ease infinite 0.3s", width: "80%", marginBottom: 24 }} />
      <div style={{ borderTop: "1px solid #f3f4f6", marginBottom: 20 }} />
      {[1,2,3,4].map(i => (
        <div key={i} style={{ height: 14, borderRadius: 8, background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: `sub-skel 1.4s ease infinite ${i*0.1}s`, marginBottom: 12 }} />
      ))}
    </div>
  );
}

const Subscription = () => {
  const [hoveredCard, setHoveredCard] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { cart } = useContext(CartContext);
  const selectedServiceIds = Object.keys(cart).map(Number);
  const selectedCount = selectedServiceIds.length;
  const selectedTotal = selectedServiceIds.reduce((sum, sid) => {
    const item = cart[sid];
    if (item && item.price && !isNaN(Number(item.price.TotalFee))) return sum + Number(item.price.TotalFee);
    return sum;
  }, 0);

  const handleQuote = async (plan) => {
    try {
      plan.is_manual = 0;
      const data = await upsertQuote(plan);
      if (data && data.QuoteID) {
        const user = getSecureItem("user");
        if (user) { user.QuoteID = data.QuoteID; setSecureItem("user", user); }
      }
      toast.dismiss();
      toast.success(`Quote Successfully created! QuoteCode: ${data.QuoteCode}`);
      setTimeout(() => navigate("/dashboard/bizpoleone"), 1200);
    } catch {
      toast.dismiss();
      toast.error("Failed to create quote.");
    }
  };

  useEffect(() => {
    const fetchPackages = async () => {
      setLoading(true); setError(null);
      try {
        let typeId = 4;
        if (location?.state?.type) { typeId = location.state.type; }
        else { const loc = getSecureItem("location"); if (loc?.type) typeId = loc.type; }
        const data = await getPackagesByServiceType(typeId);
        setPlans(data || []);
      } catch { setError("Failed to load packages"); setPlans([]); }
      finally { setLoading(false); }
    };
    fetchPackages();
  }, [location]);

  const popularIdx = Math.floor((plans.length - 1) / 2);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .sub-root { font-family:'DM Sans',sans-serif; }
        .sub-display { font-family:'Syne',sans-serif; font-weight:500; letter-spacing:-0.03em; line-height:1.05; }

        @keyframes sub-skel { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes sub-shimmer { 0%{left:-120%} 55%{left:130%} 100%{left:130%} }
        @keyframes sub-spin  { to{transform:rotate(360deg)} }
        @keyframes sub-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }

        /* Hero banner */
        .sub-hero {
          // background:linear-gradient(145deg,#F5C518 0%,#f0b800 45%,#e6a500 100%);
          position:relative; overflow:hidden;
          padding:52px 6% 60px;
          text-align:center;
        }
        .sub-hero::after {
          content:''; position:absolute; top:0; left:-120%; height:100%; width:55%;
          background:linear-gradient(105deg,transparent,rgba(255,255,255,0.12),transparent);
          animation:sub-shimmer 3.5s ease-in-out infinite 1s; pointer-events:none; z-index:3;
        }
        .sub-hero-ring { animation:sub-spin 22s linear infinite; }
        .sub-hero-ring2 { animation:sub-spin 30s linear infinite reverse; }

        /* Toggle tabs */
        .sub-tab {
          padding:10px 24px; border-radius:100px; font-size:13px; font-weight:700;
          cursor:pointer; border:none; transition:all .25s; font-family:'DM Sans',sans-serif;
        }
        .sub-tab-active { background:#1a1a1a; color:#fff; box-shadow:0 4px 14px rgba(0,0,0,0.18); }
        .sub-tab-inactive { background:transparent; color:rgba(26,26,26,0.55); border:1.5px solid rgba(0,0,0,0.12); }
        .sub-tab-inactive:hover { border-color:#F5C518; color:#1a1a1a; background:#fef9e7; }
        .sub-tab-services { border:1.5px solid #F5C518 !important; color:#1a1a1a !important; }
        .sub-tab-services:hover { background:#F5C518 !important; }

        /* Plan cards */
        .plan-card {
          border-radius:24px; border:1.5px solid rgba(0,0,0,0.08);
          background:#fff; padding:28px 24px;
          display:flex; flex-direction:column; justify-content:space-between;
          box-shadow:0 4px 20px rgba(0,0,0,0.05);
          position:relative; overflow:hidden; cursor:default;
          transition:all .35s cubic-bezier(0.16,1,0.3,1);
          min-height:540px;
        }
        .plan-card::before {
          content:''; position:absolute; top:0; left:0; right:0; height:3px;
          background:linear-gradient(90deg,#F5C518,#e8a800);
          transform:scaleX(0); transform-origin:left;
          transition:transform .35s cubic-bezier(0.16,1,0.3,1);
        }
        .plan-card:hover::before { transform:scaleX(1); }
        .plan-card--popular {
          background:#1a1a1a !important;
          border-color:#1a1a1a !important;
          box-shadow:0 16px 60px rgba(0,0,0,0.2) !important;
          transform:scale(1.03) !important;
        }
        .plan-card--popular::before { transform:scaleX(1) !important; }

        /* Feature list item */
        .feat-item { display:flex; align-items:center; gap:10px; padding:5px 0; }
        .feat-check {
          width:22px; height:22px; border-radius:6px; flex-shrink:0;
          background:#fef9e7; border:1px solid rgba(245,197,24,0.3);
          display:flex; align-items:center; justify-content:center;
          transition:all .25s;
        }
        .plan-card--popular .feat-check { background:rgba(245,197,24,0.15); border-color:rgba(245,197,24,0.3); }

        /* CTA button */
        .plan-btn {
          width:100%; padding:13px 20px; border-radius:100px; border:none;
          font-family:'DM Sans',sans-serif; font-weight:700; font-size:14px;
          cursor:pointer; transition:all .25s;
          display:flex; align-items:center; justify-content:center; gap:8px;
        }
        .plan-btn-default { background:#F5C518; color:#1a1a1a; box-shadow:0 4px 16px rgba(245,197,24,0.35); }
        .plan-btn-default:hover { background:#1a1a1a; color:#F5C518; box-shadow:0 6px 24px rgba(0,0,0,0.2); transform:translateY(-1px); }
        .plan-btn-popular { background:#F5C518; color:#1a1a1a; box-shadow:0 6px 24px rgba(245,197,24,0.45); }
        .plan-btn-popular:hover { background:#fff; transform:translateY(-1px); box-shadow:0 8px 28px rgba(245,197,24,0.5); }

        /* Popular badge */
        .popular-badge {
          display:inline-flex; align-items:center; gap:5px;
          background:#F5C518; color:#1a1a1a;
          font-size:9px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase;
          border-radius:100px; padding:4px 10px;
        }

        /* Yearly pill */
        .yearly-pill {
          display:inline-flex; align-items:center; gap:4px;
          background:rgba(0,0,0,0.06); border-radius:100px; padding:4px 10px;
          font-size:10px; font-weight:600; color:rgba(26,26,26,0.5);
        }
        .plan-card--popular .yearly-pill { background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.45); }

        /* Skip button */
        .skip-btn {
          background:rgba(26,26,26,0.07); color:rgba(26,26,26,0.55);
          border:none; border-radius:100px; padding:9px 20px;
          font-family:'DM Sans',sans-serif; font-weight:600; font-size:13px;
          cursor:pointer; transition:all .2s;
        }
        .skip-btn:hover { background:rgba(26,26,26,0.12); color:#1a1a1a; }
      `}</style>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover />

      <div className="sub-root" style={{ minHeight: "100vh", background: "#f7f5f0" }}>

        {/* ════ HERO BANNER ════ */}
        <div className="sub-hero bg-gradient-to-b from-white to-yellow-50">
          {/* Rings */}
          <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:1 }}>
            <svg className="sub-hero-ring" width="600" height="600" viewBox="0 0 600 600" fill="none" style={{ opacity:0.08 }}>
              <circle cx="300" cy="300" r="280" stroke="white" strokeWidth="1" strokeDasharray="6 14"/>
            </svg>
          </div>
          <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:1 }}>
            <svg className="sub-hero-ring2" width="420" height="420" viewBox="0 0 420 420" fill="none" style={{ opacity:0.07 }}>
              <circle cx="210" cy="210" r="195" stroke="white" strokeWidth="1" strokeDasharray="3 18"/>
            </svg>
          </div>

          {/* Orbs */}
          <FloatingOrb delay={0}   style={{ width:220,height:220,top:"-60px",left:"-60px",background:"rgba(255,255,255,0.18)",filter:"blur(50px)" }} />
          <FloatingOrb delay={1.5} style={{ width:180,height:180,bottom:"-40px",right:"-40px",background:"rgba(255,255,255,0.13)",filter:"blur(40px)" }} />

          {/* Sparkles */}
          <Sparkle delay={0}   style={{ top:"20%",left:"8%" }} />
          <Sparkle delay={0.8} style={{ top:"30%",right:"12%" }} />
          <Sparkle delay={1.6} style={{ bottom:"25%",left:"18%" }} />
          <Sparkle delay={2.2} style={{ bottom:"20%",right:"22%" }} />

          {/* Logo + Skip */}
          <div style={{ position:"absolute",top:20,left:24,right:24,display:"flex",alignItems:"center",justifyContent:"space-between",zIndex:10 }}>
            <img src="/Images/image.png" alt="Bizpole" style={{ height:36,width:"auto" }} />
            <motion.button className="skip-btn" whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}
              onClick={() => navigate("/dashboard/bizpoleone")}>
              Skip for now →
            </motion.button>
          </div>

          {/* Hero text */}
          <div style={{ position:"relative",zIndex:5,maxWidth:640,margin:"0 auto" }}>
            <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.2 }}>
              <span className="inline-block px-4 py-1 mb-12 border border-yellow-400 rounded-full text-sm text-yellow-500">
                Choose Your Plan
              </span>
            </motion.div>

            <motion.h1 className="sub-display" style={{ color:"#1a1a1a",fontSize:"clamp(2rem,5vw,3.2rem)",marginBottom:14 }}
              initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.3 }}>
              The Right Plan for<br />Your Business
            </motion.h1>
            <motion.p style={{ color:"rgba(26,26,26,0.58)",fontSize:15,lineHeight:1.7,fontWeight:300,maxWidth:480,margin:"0 auto" }}
              initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.45 }}>
              Powerful plans designed for every stage of your entrepreneurial journey. Everything you need, nothing you don't.
            </motion.p>
          </div>
        </div>

        {/* ════ TOGGLE TABS ════ */}
        <div>
          <div style={{ maxWidth:1200,margin:"0 auto",padding:"20px 24px",display:"flex",alignItems:"center",justifyContent:"center",gap:10,flexWrap:"wrap" }}>
            <motion.button
              className="sub-tab sub-tab-inactive sub-tab-services"
              whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
              onClick={() => navigate("/services")}
            >
             Individual Services
              {selectedCount > 0 && (
                <span style={{ marginLeft:8,background:"#F5C518",color:"#1a1a1a",fontSize:10,fontWeight:800,borderRadius:100,padding:"2px 8px",display:"inline-block" }}>
                  {selectedCount} selected
                </span>
              )}
            </motion.button>
            <motion.button className="sub-tab sub-tab-active" whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}>
            Package Plans
            </motion.button>
          </div>
        </div>

        {/* ════ CARDS ════ */}
        <div style={{ maxWidth:460,margin:"0 auto",padding:"48px 24px 72px" }}>

          {/* Loading */}
          {loading && (
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:20 }}>
              {[1,2,3,4].map(i => (
                <motion.div key={i} initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:i*0.07 }}>
                  <SkeletonCard />
                </motion.div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div style={{ textAlign:"center",padding:"60px 24px" }}>
              <div style={{ fontSize:40,marginBottom:12 }}>⚠️</div>
              <div style={{ fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:18,color:"#1a1a1a",marginBottom:6 }}>Failed to load plans</div>
              <div style={{ fontSize:14,color:"#9ca3af" }}>{error}</div>
            </div>
          )}

          {/* No plans */}
          {!loading && !error && plans.length === 0 && (
            <div style={{ textAlign:"center",padding:"60px 24px" }}>
              <div style={{ fontSize:40,marginBottom:12 }}>📭</div>
              <div style={{ fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:18,color:"#1a1a1a" }}>No packages found</div>
            </div>
          )}

          {/* Plan grid */}
          {!loading && !error && plans.length > 0 && (
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:20,alignItems:"start" }}>
              {plans.map((plan, i) => {
                const isPopular = i === popularIdx;
                const isHovered = hoveredCard === i;
                return (
                  <motion.div
                    key={plan.id || plan.packageId || i}
                    className={`plan-card ${isPopular ? "plan-card--popular" : ""}`}
                    initial={{ opacity:0,y:30 }}
                    animate={{ opacity:1,y:0 }}
                    transition={{ delay:i*0.1,duration:0.5,ease:[0.16,1,0.3,1] }}
                    whileHover={!isPopular ? { y:-8,boxShadow:"0 20px 60px rgba(0,0,0,0.1)",borderColor:"rgba(245,197,24,0.4)" } : {}}
                    onHoverStart={() => setHoveredCard(i)}
                    onHoverEnd={() => setHoveredCard(null)}
                  >
                    {/* Glow for popular */}
                    {isPopular && (
                      <div style={{ position:"absolute",top:"-30%",left:"50%",transform:"translateX(-50%)",width:240,height:240,background:"radial-gradient(circle,rgba(245,197,24,0.12) 0%,transparent 70%)",borderRadius:"50%",pointerEvents:"none" }} />
                    )}

                    {/* Header row */}
                    <div>
                      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16 }}>
                        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                          {isPopular && (
                            <span className="popular-badge">
                              <Zap size={9} /> Most Popular
                            </span>
                          )}
                          <span className="yearly-pill">
                            <Calendar size={10} /> Yearly
                          </span>
                        </div>
                        {isPopular && (
                          <motion.div animate={{ rotate:[0,6,-6,0] }} transition={{ duration:4,repeat:Infinity,ease:"easeInOut" }}
                            style={{ fontSize:26 }}>⭐</motion.div>
                        )}
                      </div>

                      <h3 className="sub-display" style={{ fontSize:20,color:isPopular?"#fff":"#1a1a1a",marginBottom:8 }}>
                        {plan.name || plan.PackageName || plan.packageName}
                      </h3>

                      <div style={{ display:"flex",alignItems:"baseline",gap:4,marginBottom:10 }}>
                        <span style={{ fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"clamp(1.8rem,3vw,2.4rem)",color:isPopular?"#F5C518":"#1a1a1a",letterSpacing:"-0.03em",lineHeight:1 }}>
                          ₹{plan.price || plan.YearlyMRP || plan.amount}
                        </span>
                        <span style={{ fontSize:12,color:isPopular?"rgba(255,255,255,0.4)":"#9ca3af",fontWeight:400 }}>/yr</span>
                      </div>

                      <p style={{ fontSize:13,lineHeight:1.65,color:isPopular?"rgba(255,255,255,0.55)":"#9ca3af",fontWeight:300,marginBottom:6 }}>
                        {plan.description || plan.Description}
                      </p>
                      {(plan.audience || plan.Audience) && (
                        <p style={{ fontSize:13,fontWeight:600,color:isPopular?"rgba(255,255,255,0.7)":"rgba(26,26,26,0.6)",marginBottom:0 }}>
                          {plan.audience || plan.Audience}
                        </p>
                      )}
                    </div>

                    {/* Divider */}
                    <div style={{ margin:"20px 0",borderTop:`1px solid ${isPopular?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.07)"}` }} />

                    {/* Features */}
                    {plan.services && Array.isArray(plan.services) && plan.services.length > 0 && (
                      <div style={{ flex:1,marginBottom:24 }}>
                        <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:isPopular?"rgba(255,255,255,0.35)":"rgba(26,26,26,0.35)",marginBottom:10 }}>
                          Included Services
                        </div>
                        <ul style={{ listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:6 }}>
                          {plan.services.map((service, idx) => (
                            <li key={service.ID || idx} className="feat-item">
                              <div className="feat-check" style={isPopular ? { background:"rgba(245,197,24,0.15)",border:"1px solid rgba(245,197,24,0.3)" } : {}}>
                                <Check size={12} color="#F5C518" strokeWidth={2.5} />
                              </div>
                              <span style={{ fontSize:13,fontWeight:500,color:isPopular?"rgba(255,255,255,0.8)":"#374151" }}>
                                {service.ServiceName}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* CTA */}
                    <motion.button
                      className={`plan-btn ${isPopular?"plan-btn-popular":"plan-btn-default"}`}
                      whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                      onClick={() => handleQuote(plan)}
                    >
                      {plan.button || "Request Quote"}
                      <ArrowRight size={15} />
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          )}

       
        </div>
      </div>
    </>
  );
};

export default Subscription;
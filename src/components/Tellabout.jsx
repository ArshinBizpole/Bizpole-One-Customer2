import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { assignCustomer, createCustomer } from "../api/CustomerApi";
import { getAllStates } from "../api/States";
import { setSecureItem } from "../utils/secureStorage";
import { notifyTokenSet } from "../utils/authSession";

// ── Brand decorations ─────────────────────────────────────────────────────────
function FloatingOrb({ style, delay = 0 }) {
  return (
    <motion.div
      style={{ position: "absolute", borderRadius: "50%", pointerEvents: "none", ...style }}
      animate={{ y: [-12, 12, -12], x: [-6, 6, -6], scale: [1, 1.08, 1] }}
      transition={{ duration: 5 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}
function Sparkle({ style, delay = 0 }) {
  return (
    <motion.div
      style={{ position: "absolute", width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.75)", pointerEvents: "none", ...style }}
      animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay, repeatDelay: 1.5 }}
    />
  );
}

const Tellabout = () => {
  const [states, setStates] = useState([]);
  const location = useLocation();
  const [countryCodes, setCountryCodes] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  useEffect(() => {
    const fetchStates = async () => {
      try { const data = await getAllStates(); setStates(data); }
      catch { setStates([]); }
    };
    const fetchCountryCodes = async () => {
      try {
        setLoadingCountries(true);
        const response = await fetch("https://restcountries.com/v3.1/all?fields=name,flags,idd,cca2");
        if (!response.ok) throw new Error("Failed");
        const countriesData = await response.json();
        const flagMap = { 'IN':'🇮🇳','US':'🇺🇸','GB':'🇬🇧','CA':'🇨🇦','AU':'🇦🇺','DE':'🇩🇪','FR':'🇫🇷','IT':'🇮🇹','ES':'🇪🇸','JP':'🇯🇵','CN':'🇨🇳','BR':'🇧🇷','RU':'🇷🇺','KR':'🇰🇷','MX':'🇲🇽','AE':'🇦🇪','SA':'🇸🇦','SG':'🇸🇬','MY':'🇲🇾','TH':'🇹🇭','ID':'🇮🇩','PH':'🇵🇭','VN':'🇻🇳','BD':'🇧🇩','PK':'🇵🇰','LK':'🇱🇰','NP':'🇳🇵','MM':'🇲🇲','KH':'🇰🇭','LA':'🇱🇦' };
        const processed = countriesData
          .filter(c => c.idd.root && c.idd.suffixes)
          .flatMap(c => c.idd.suffixes.map(s => ({ code:`${c.idd.root}${s}`, label:`${flagMap[c.cca2]||c.flags?.emoji||"🏳"} ${c.idd.root}${s}`, name:c.name.common, flag:flagMap[c.cca2]||c.flags?.emoji||"🏳", cca2:c.cca2 })))
          .sort((a,b) => a.name.localeCompare(b.name));
        setCountryCodes(processed);
      } catch {
        setCountryCodes([
          { code:"+91", label:"🇮🇳 +91", name:"India", flag:"🇮🇳", cca2:"IN" },
          { code:"+1",  label:"🇺🇸 +1",  name:"United States", flag:"🇺🇸", cca2:"US" },
          { code:"+44", label:"🇬🇧 +44", name:"United Kingdom", flag:"🇬🇧", cca2:"GB" },
          { code:"+971",label:"🇦🇪 +971",name:"United Arab Emirates", flag:"🇦🇪", cca2:"AE" },
          { code:"+61", label:"🇦🇺 +61", name:"Australia", flag:"🇦🇺", cca2:"AU" },
        ]);
      } finally { setLoadingCountries(false); }
    };
    fetchStates();
    fetchCountryCodes();
  }, []);

  const partnerIdFromStorage = localStorage.getItem("PartnerID");
  const isAssociate = !!partnerIdFromStorage;
  const AssociateID = partnerIdFromStorage ? Number(partnerIdFromStorage) : null;

  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    FirstName:"", LastName:"", Email:"", CountryCode:"+91", Mobile:"", Country:"India",
    State:"", City:"null", District:"", PinCode:"", PreferredLanguage:"",
    AddressLine1:"", AddressLine2:"", DateOfBirth:"", PANNumber:"", IsComponyRegistered:1,
    Origin:"", SecondaryMobile:"", SecondaryEmail:"", CustomerCategory:"", FranchiseeID:null, CreatedBy:null,
    Companies:[{ BusinessName:"", CompanyEmail:"", CompanyMobile:"", Country:"India", State:"", City:"null", District:"", Agents:[], CompanyPAN:"", GSTNumber:"", CIN:"", ConstitutionCategory:"", Sector:"", BusinessNature:"", Website:"", PinCode:"", PrimaryCompany:1, AssociateID, isAssociate }],
  });

  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState(null);
  const [lastAssignParams, setLastAssignParams] = useState({});

  const languageOptions = [
    { label:"English", value:"english" },{ label:"Hindi", value:"hindi" },
    { label:"Marathi", value:"marathi" },{ label:"Tamil", value:"tamil" },
    { label:"Telugu", value:"telugu" },{ label:"Gujarati", value:"gujarati" },
    { label:"Bengali", value:"bengali" },{ label:"Kannada", value:"kannada" },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      let updated = { ...prev, [name]: value };
      if (name === "FirstName" || name === "LastName") {
        const clientName = (name==="FirstName"?value:prev.FirstName)+" "+(name==="LastName"?value:prev.LastName);
        updated.Companies = [{ ...prev.Companies[0], BusinessName: clientName.trim() }];
      }
      updated.Country = "India"; updated.City = "null";
      updated.Companies = [{ ...updated.Companies[0], Country:"India", City:"null" }];
      return updated;
    });
  };

  const handleAssignBlur = () => {
    const { PreferredLanguage, State, District } = formData;
    if (PreferredLanguage && State && District &&
      (lastAssignParams.language !== PreferredLanguage || lastAssignParams.state !== State || lastAssignParams.district !== District)) {
      setAssignLoading(true); setAssignError(null);
      assignCustomer({ language:PreferredLanguage, state:State, district:District })
        .then(res => {
          setFormData(prev => ({ ...prev, FranchiseeID:res.franchiseeId, CreatedBy:res.agent?res.agent.id:null, Companies:[{ ...prev.Companies[0], Agents:res.agent?[{EmployeeID:res.agent.id}]:[] }] }));
          setLastAssignParams({ language:PreferredLanguage, state:State, district:District });
        })
        .catch(() => setAssignError("Could not assign franchisee/agent. Try again."))
        .finally(() => setAssignLoading(false));
    }
  };

  const handleCountrySelect = (code) => { setFormData(prev => ({ ...prev, CountryCode:code })); setShowCountryDropdown(false); setCountrySearch(""); };
  const selectedCountry = countryCodes.find(c => c.code === formData.CountryCode);
  const filteredCountries = countryCodes.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pid = localStorage.getItem("PartnerID");
    const isAss = !!pid; const AID = pid ? Number(pid) : null;
    if (!formData.FranchiseeID) { alert("Please select language, state, and district to assign a franchisee before submitting."); return; }
    try {
      const updatedFormData = { ...formData, Origin: formData.HowDidYouHear || formData.Origin || "website" };
      const agentId = updatedFormData.CreatedBy;
      const company = { ...updatedFormData.Companies[0], BusinessName:updatedFormData.Companies[0].BusinessName, CompanyEmail:updatedFormData.Companies[0].CompanyEmail, CompanyMobile:updatedFormData.Companies[0].CompanyMobile, Country:"India", State:updatedFormData.State, City:"null", District:updatedFormData.District, Agents:agentId?[{EmployeeID:agentId}]:[], CompanyPAN:updatedFormData.Companies[0].CompanyPAN, GSTNumber:updatedFormData.Companies[0].GSTNumber, CIN:updatedFormData.Companies[0].CIN, ConstitutionCategory:updatedFormData.Companies[0].ConstitutionCategory, Sector:updatedFormData.Companies[0].Sector, BusinessNature:updatedFormData.Companies[0].BusinessNature, Website:updatedFormData.Companies[0].Website, AssociateID:AID, isAssociate:isAss, PinCode:updatedFormData.PinCode, PrimaryCompany:1 };
      const payload = { ...updatedFormData, Companies:[company], isAssociate:isAss, AssociateID:AID };
      const res = await createCustomer(payload);
      if (res?.data?.token) { localStorage.setItem('token', res.data.token); notifyTokenSet(); setSecureItem('user', JSON.stringify(res.data.user)); }
      if (location?.state) { setSecureItem('location', JSON.stringify(location.state)); }
      const typeId = location?.state?.type || null;
      navigate("/startbusiness/subscriptions", { state:{ type:typeId } });
    } catch { alert("Something went wrong while saving customer"); }
  };

  // ── Field config ─────────────────────────────────────────────────────────────
  const fields = [
    { name:"FirstName",  placeholder:"First Name",  type:"text",  half:true,  required:true },
    { name:"LastName",   placeholder:"Last Name",   type:"text",  half:true,  required:true },
    { name:"Email",      placeholder:"Email Address", type:"email", half:false, required:true },
    { name:"AddressLine1", placeholder:"Address Line 1", type:"text", half:false, required:false },
    { name:"Country",    placeholder:"Country",     type:"text",  half:true,  required:false, readOnly:true },
    { name:"District",   placeholder:"District",    type:"text",  half:true,  required:true,  onBlur:true },
    { name:"PinCode",    placeholder:"Pin Code",    type:"text",  half:true,  required:true },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .ta-root { font-family: 'DM Sans', sans-serif; }
        .ta-display { font-family: 'Syne', sans-serif; font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; }

        /* Left shimmer */
        .ta-shimmer::after {
          content:''; position:absolute; top:0; left:-120%; height:100%; width:55%;
          background:linear-gradient(105deg,transparent,rgba(255,255,255,0.12),transparent);
          animation:ta-sw 3.5s ease-in-out infinite 1s; pointer-events:none; z-index:3;
        }
        @keyframes ta-sw { 0%{left:-120%} 55%{left:130%} 100%{left:130%} }
        @keyframes ta-spin { to{transform:rotate(360deg)} }
        .ta-ring  { animation:ta-spin 22s linear infinite; }
        .ta-ring2 { animation:ta-spin 30s linear infinite reverse; }
        @keyframes ta-pulse { 0%{transform:scale(1);opacity:.55} 100%{transform:scale(1.7);opacity:0} }
        .ta-pulse  { position:absolute;inset:-8px;border-radius:50%;border:2px solid rgba(255,255,255,0.45);animation:ta-pulse 2.2s ease-out infinite;pointer-events:none; }
        .ta-pulse2 { animation-delay:.8s; }

        /* Input */
        .ta-input, .ta-select {
          width:100%; padding:8px 13px;
          border:1.5px solid rgba(0,0,0,0.1); border-radius:11px;
          font-size:13px; font-family:'DM Sans',sans-serif; font-weight:400;
          background:#fff; color:#1a1a1a; outline:none;
          transition:border-color .2s,box-shadow .2s;
          appearance:none; -webkit-appearance:none;
        }
        .ta-input:focus, .ta-select:focus {
          border-color:#F5C518;
          box-shadow:0 0 0 3px rgba(245,197,24,0.15);
        }
        .ta-input::placeholder { color:#b0b0b0; }
        .ta-input[readonly] { background:#fafafa; color:#9ca3af; cursor:not-allowed; }

        .ta-label { font-size:10px; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; color:rgba(26,26,26,0.4); margin-bottom:3px; display:block; }

        /* Country dropdown */
        .ta-cc-btn {
          width:100%; padding:8px 12px; border:1.5px solid rgba(0,0,0,0.1); border-radius:11px;
          background:#fff; display:flex; align-items:center; justify-content:space-between;
          font-size:13px; font-family:'DM Sans',sans-serif; cursor:pointer;
          transition:border-color .2s, box-shadow .2s;
        }
        .ta-cc-btn:focus, .ta-cc-btn.open { border-color:#F5C518; box-shadow:0 0 0 3px rgba(245,197,24,0.15); }
        .ta-cc-dropdown {
          position:absolute; top:calc(100% + 6px); left:0; right:0; z-index:60;
          background:#fff; border:1.5px solid rgba(245,197,24,0.4); border-radius:16px;
          box-shadow:0 12px 40px rgba(0,0,0,0.12); overflow:hidden;
        }
        .ta-cc-search { padding:8px 12px; border-bottom:1px solid rgba(0,0,0,0.07); }
        .ta-cc-search input { width:100%; outline:none; border:none; font-size:12px; font-family:'DM Sans',sans-serif; background:transparent; color:#1a1a1a; }
        .ta-cc-list { max-height:170px; overflow-y:auto; }
        .ta-cc-item { display:flex; align-items:center; gap:8px; padding:7px 12px; cursor:pointer; font-size:12px; transition:background .15s; }
        .ta-cc-item:hover { background:#fef9e7; }

        /* Submit */
        .ta-submit {
          display:inline-flex; align-items:center; gap:8px;
          background:#F5C518; color:#1a1a1a;
          font-family:'DM Sans',sans-serif; font-weight:700; font-size:13px;
          border:none; border-radius:100px; padding:10px 26px; cursor:pointer;
          box-shadow:0 6px 20px rgba(245,197,24,0.4);
          transition:all .25s;
        }
        .ta-submit:hover { background:#1a1a1a; color:#F5C518; transform:translateY(-2px); box-shadow:0 10px 28px rgba(0,0,0,0.18); }

        /* Status messages */
        .ta-status-loading { display:flex; align-items:center; gap:8px; font-size:12px; color:#92620a; background:#fef9e7; border:1px solid rgba(245,197,24,0.3); border-radius:10px; padding:8px 12px; }
        .ta-status-error { font-size:12px; color:#dc2626; background:#fef2f2; border:1px solid rgba(220,38,38,0.2); border-radius:10px; padding:8px 12px; }

        /* Right stat pill */
        .ta-stat { background:rgba(255,255,255,0.22); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.35); border-radius:10px; padding:8px 12px; flex:1; }
        .ta-stat-num { font-family:'Syne',sans-serif; font-weight:800; font-size:16px; color:#1a1a1a; letter-spacing:-0.02em; }
        .ta-stat-lbl { font-size:10px; color:rgba(26,26,26,0.55); margin-top:2px; }

        /* Scrollbar */
        .ta-cc-list::-webkit-scrollbar { width:4px; }
        .ta-cc-list::-webkit-scrollbar-thumb { background:#F5C518; border-radius:4px; }
      `}</style>

      <motion.div
        className="ta-root w-full min-h-screen flex items-center justify-center px-4 py-6"
        style={{ background: "linear-gradient(135deg, #fef9e7 0%, #f7f5f0 100%)" }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <div style={{
          width: "100%", maxWidth: 860, borderRadius: 22, overflow: "hidden",
          boxShadow: "0 24px 64px rgba(245,197,24,0.2), 0 6px 24px rgba(0,0,0,0.1)",
          display: "flex", flexDirection: "row", minHeight: 540,
        }}
          className="flex-col lg:flex-row"
        >

          {/* ════ LEFT — YELLOW PANEL ════ */}
          <div
            className="ta-shimmer"
            style={{
              width: "38%", minWidth: 240,
              background: "linear-gradient(145deg,#F5C518 0%,#f0b800 45%,#e6a500 100%)",
              position: "relative", overflow: "hidden",
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              padding: "26px 24px",
              flexShrink: 0,
            }}
          >
            <FloatingOrb delay={0}   style={{ width:200,height:200,top:"-50px",right:"-50px",background:"rgba(255,255,255,0.18)",filter:"blur(40px)" }} />
            <FloatingOrb delay={1.8} style={{ width:130,height:130,bottom:"50px",left:"-25px",background:"rgba(255,255,255,0.13)",filter:"blur(24px)" }} />
            <FloatingOrb delay={0.9} style={{ width:70,height:70,bottom:"32%",right:"12%",background:"rgba(255,255,255,0.2)",filter:"blur(12px)" }} />
            <Sparkle delay={0}   style={{ top:"18%",left:"12%" }} />
            <Sparkle delay={0.9} style={{ top:"62%",right:"16%" }} />
            <Sparkle delay={1.7} style={{ bottom:"22%",left:"42%" }} />
            <Sparkle delay={2.4} style={{ top:"38%",right:"28%" }} />

            {/* Rings */}
            <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:1 }}>
              <svg className="ta-ring" width="340" height="340" viewBox="0 0 340 340" fill="none" style={{ opacity:0.12 }}>
                <circle cx="170" cy="170" r="158" stroke="white" strokeWidth="1" strokeDasharray="6 14"/>
              </svg>
            </div>
            <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:1 }}>
              <svg className="ta-ring2" width="240" height="240" viewBox="0 0 240 240" fill="none" style={{ opacity:0.1 }}>
                <circle cx="120" cy="120" r="108" stroke="white" strokeWidth="1" strokeDasharray="3 18"/>
              </svg>
            </div>

            {/* Logo */}
            <motion.img src="/Images/logo.webp" alt="Bizpole"
              style={{ height:36,width:90,position:"relative",zIndex:4 }}
              initial={{ opacity:0,y:-10 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.2 }}
            />

            {/* Center */}
            <motion.div
              initial={{ opacity:0,y:24 }} animate={{ opacity:1,y:0 }}
              transition={{ delay:0.38,duration:0.7,ease:[0.16,1,0.3,1] }}
              style={{ position:"relative",zIndex:4,display:"flex",flexDirection:"column",gap:14 }}
            >
              <div style={{ position:"relative",width:60,height:60 }}>
                <div className="ta-pulse"/>
                <div className="ta-pulse ta-pulse2"/>
               
              </div>

              <div>
                <h2 className="ta-display" style={{ color:"#1a1a1a",fontSize:"clamp(1.3rem,2vw,1.7rem)",marginBottom:8 }}>
                  Tell us about<br />yourself.
                </h2>
                <p style={{ color:"rgba(26,26,26,0.58)",fontSize:12,lineHeight:1.6,fontWeight:300,maxWidth:210 }}>
                  Just a few details and we'll have everything set up for your business journey.
                </p>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              style={{ display:"flex",gap:10,position:"relative",zIndex:4 }}
              initial={{ opacity:0,y:14 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.6 }}
            >
              {[{ num:"3 min", lbl:"To complete" },{ num:"100%", lbl:"Secure" },{ num:"Free", lbl:"To start" }].map(s => (
                <div key={s.lbl} className="ta-stat">
                  <div className="ta-stat-num">{s.num}</div>
                  <div className="ta-stat-lbl">{s.lbl}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ════ RIGHT — FORM PANEL ════ */}
          <div style={{
            flex:1, background:"#fff",
            backgroundImage:"url('/Images/hero-bg.webp')", backgroundSize:"cover", backgroundPosition:"center",
            position:"relative", display:"flex", flexDirection:"column",
            justifyContent:"center", padding:"26px 30px", overflowY:"auto",
          }}>
            <div style={{ position:"absolute",inset:0,background:"rgba(255,255,255,0.93)",pointerEvents:"none" }} />

            <div style={{ position:"relative",zIndex:1 }}>
              {/* Header */}
              <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.25 }} style={{ marginBottom:18 }}>
                <span style={{ display:"inline-flex",alignItems:"center",gap:6,fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(26,26,26,0.4)",border:"1px solid rgba(26,26,26,0.1)",borderRadius:100,padding:"4px 12px",marginBottom:10 }}>
                  <motion.span style={{ width:5,height:5,borderRadius:"50%",background:"#F5C518",display:"inline-block" }} animate={{ scale:[1,1.5,1] }} transition={{ duration:1.8,repeat:Infinity }} />
                  Step 3 of 4
                </span>
                <h1 className="ta-display" style={{ color:"#1a1a1a",fontSize:"clamp(1.35rem,2.2vw,1.8rem)",marginBottom:5 }}>
                  Tell Us{" "}
                  <span style={{ position:"relative",display:"inline-block" }}>
                    <span style={{ position:"relative",zIndex:1 }}>About You</span>
                    <motion.span style={{ position:"absolute",inset:"-4px -3px",background:"#F5C518",borderRadius:10,zIndex:0,originX:0 }}
                      initial={{ scaleX:0 }} animate={{ scaleX:1 }} transition={{ delay:0.75,duration:0.5,ease:[0.16,1,0.3,1] }}
                    />
                  </span>
                </h1>
                <p style={{ color:"#9ca3af",fontSize:12.5,fontWeight:300,lineHeight:1.5 }}>Fill in your details to get started on your business journey.</p>
              </motion.div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 14px" }}>

                  {/* First Name */}
                  <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.3 }}>
                    <label className="ta-label">First Name *</label>
                    <input className="ta-input" type="text" name="FirstName" placeholder="e.g. Rahul" value={formData.FirstName} onChange={handleChange} required />
                  </motion.div>

                  {/* Last Name */}
                  <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.34 }}>
                    <label className="ta-label">Last Name *</label>
                    <input className="ta-input" type="text" name="LastName" placeholder="e.g. Sharma" value={formData.LastName} onChange={handleChange} required />
                  </motion.div>

                  {/* Email */}
                  <motion.div style={{ gridColumn:"1/-1" }} initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.38 }}>
                    <label className="ta-label">Email Address *</label>
                    <input className="ta-input" type="email" name="Email" placeholder="you@example.com" value={formData.Email} onChange={handleChange} required />
                  </motion.div>

                  {/* Phone */}
                  <motion.div style={{ gridColumn:"1/-1" }} initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.42 }}>
                    <label className="ta-label">Phone Number *</label>
                    <div style={{ display:"flex",gap:10 }}>
                      {/* Country code */}
                      <div style={{ position:"relative",width:130,flexShrink:0 }}>
                        {loadingCountries ? (
                          <div className="ta-input" style={{ display:"flex",alignItems:"center",justifyContent:"center",color:"#9ca3af" }}>
                            <motion.span animate={{ rotate:360 }} transition={{ duration:1,repeat:Infinity,ease:"linear" }} style={{ display:"inline-block",width:14,height:14,border:"2px solid #F5C518",borderTopColor:"transparent",borderRadius:"50%" }} />
                          </div>
                        ) : (
                          <>
                            <button type="button" className={`ta-cc-btn ${showCountryDropdown?"open":""}`} onClick={() => setShowCountryDropdown(!showCountryDropdown)}>
                              <span style={{ display:"flex",alignItems:"center",gap:6,fontSize:14 }}>
                                <span>{selectedCountry?.flag||"🏳"}</span>
                                <span style={{ fontWeight:600 }}>{formData.CountryCode}</span>
                              </span>
                              <ChevronDown size={14} style={{ color:"#9ca3af",transition:"transform .2s",transform:showCountryDropdown?"rotate(180deg)":"none" }} />
                            </button>
                            <AnimatePresence>
                              {showCountryDropdown && (
                                <motion.div className="ta-cc-dropdown"
                                  initial={{ opacity:0,y:-8,scale:0.97 }} animate={{ opacity:1,y:0,scale:1 }}
                                  exit={{ opacity:0,y:-8,scale:0.97 }} transition={{ duration:0.2 }}
                                >
                                  <div className="ta-cc-search">
                                    <input value={countrySearch} onChange={e=>setCountrySearch(e.target.value)} placeholder="Search country..." autoFocus />
                                  </div>
                                  <div className="ta-cc-list">
                                    {filteredCountries.map(c => (
                                      <div key={c.code+c.cca2} className="ta-cc-item" onClick={() => handleCountrySelect(c.code)}>
                                        <span style={{ fontSize:16 }}>{c.flag}</span>
                                        <span style={{ fontWeight:600,minWidth:40 }}>{c.code}</span>
                                        <span style={{ color:"#6b7280",fontSize:12 }}>{c.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </>
                        )}
                      </div>
                      <input className="ta-input" style={{ flex:1 }} type="tel" name="Mobile" placeholder="10-digit number" value={formData.Mobile} onChange={handleChange} required />
                    </div>
                  </motion.div>

                  {/* Address */}
                  <motion.div style={{ gridColumn:"1/-1" }} initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.46 }}>
                    <label className="ta-label">Address</label>
                    <input className="ta-input" type="text" name="AddressLine1" placeholder="House / Street / Area" value={formData.AddressLine1} onChange={handleChange} />
                  </motion.div>

                  {/* Country (read only) */}
                  <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.49 }}>
                    <label className="ta-label">Country</label>
                    <input className="ta-input" type="text" name="Country" value={formData.Country} readOnly />
                  </motion.div>

                  {/* State */}
                  <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.52 }}>
                    <label className="ta-label">State *</label>
                    <div style={{ position:"relative" }}>
                      <select className="ta-select" name="State" value={formData.State} onChange={handleChange} onBlur={handleAssignBlur} required>
                        <option value="">Select State</option>
                        {states.map(s => <option key={s.id||s.state_code||s.state_name} value={s.state_name}>{s.state_name}</option>)}
                      </select>
                      <ChevronDown size={14} style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",pointerEvents:"none" }} />
                    </div>
                  </motion.div>

                  {/* District */}
                  <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.55 }}>
                    <label className="ta-label">District *</label>
                    <input className="ta-input" type="text" name="District" placeholder="Your district" value={formData.District} onChange={handleChange} onBlur={handleAssignBlur} required />
                  </motion.div>

                  {/* Pin Code */}
                  <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.58 }}>
                    <label className="ta-label">Pin Code *</label>
                    <input className="ta-input" type="text" name="PinCode" placeholder="6-digit PIN" value={formData.PinCode} onChange={handleChange} required />
                  </motion.div>

                  {/* Language */}
                  <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.61 }}>
                    <label className="ta-label">Preferred Language *</label>
                    <div style={{ position:"relative" }}>
                      <select className="ta-select" name="PreferredLanguage" value={formData.PreferredLanguage} onChange={handleChange} onBlur={handleAssignBlur} required>
                        <option value="">Select Language</option>
                        {languageOptions.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                      <ChevronDown size={14} style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",pointerEvents:"none" }} />
                    </div>
                  </motion.div>

                  {/* How did you hear */}
                  <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.64 }}>
                    <label className="ta-label">How Did You Hear About Us? *</label>
                    <div style={{ position:"relative" }}>
                      <select className="ta-select" name="HowDidYouHear" value={formData.HowDidYouHear||""} onChange={handleChange} required>
                        <option value="">Select source</option>
                        <option value="Google">Google Search</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Instagram">Instagram</option>
                        <option value="YouTube">YouTube</option>
                        <option value="Friend">Friend / Referral</option>
                        <option value="Advertisement">Advertisement</option>
                        <option value="Other">Other</option>
                      </select>
                      <ChevronDown size={14} style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",pointerEvents:"none" }} />
                    </div>
                  </motion.div>
                </div>

                {/* Assignment status */}
                <AnimatePresence>
                  
                  {assignLoading && (
                    <motion.div className="ta-status-loading" style={{ marginTop:14 }}
                      initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
                    >
                      <motion.span animate={{ rotate:360 }} transition={{ duration:1,repeat:Infinity,ease:"linear" }}
                        style={{ display:"inline-block",width:14,height:14,border:"2px solid #d97706",borderTopColor:"transparent",borderRadius:"50%",flexShrink:0 }} />
                      Assigning franchisee based on your location & language…
                    </motion.div>
                  )}
                  {assignError && (
                    <motion.div className="ta-status-error" style={{ marginTop:14 }}
                      initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
                    >
                      {assignError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <motion.div style={{ marginTop:16, display:"flex", justifyContent:"flex-end" }}
                  initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.7 }}
                >
                  <motion.button type="submit" className="ta-submit" whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}>
                    Continue
                    <ArrowRight size={16} />
                  </motion.button>
                </motion.div>
              </form>
            </div>
          </div>
        </div>

        {/* Backdrop for dropdown close */}
        {showCountryDropdown && (
          <div style={{ position:"fixed",inset:0,zIndex:40 }} onClick={() => { setShowCountryDropdown(false); setCountrySearch(""); }} />
        )}
      </motion.div>
    </>
  );
};

export default Tellabout;
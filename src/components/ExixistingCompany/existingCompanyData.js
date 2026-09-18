// Data/config for the "Existing Company" needs-menu + flows.
// Ported from the Bizpole One Business Services HTML prototype's EXISTING_MENU + FLOWS
// system, adapted to plain JS (no DOM globals) for use inside React state.
//
// Simplification from the original prototype (documented, not accidental):
// - The AI Trademark Class Finder ports the full 45-class Nice Classification (desc + kw
//   verbatim from the prototype) and its word-boundary + nature-weighted scoring, but omits
//   the prototype's ~15,000-term WIPO Alphabetical List word-index (a secondary, low-weight
//   fuzzy-match layer keyed off WIPO_TERMS) — porting that dictionary verbatim would add on
//   the order of 100K+ tokens of legal terminology to this file for a mock-data flow. The
//   primary keyword-based matching (what actually drives the recommended class in the vast
//   majority of cases) is otherwise an exact port.
// - The MCA "Name Availability Check" implements the deterministic offline simulation from
//   the prototype — this matches the prototype's own DEFAULT behavior, since its optional
//   live APIclub.in lookup is gated behind an API key the prototype ships blank
//   (`const APICLUB_KEY = ""`), so the simulation is what actually runs there too.

export const YN = ["Yes", "No"];

export const STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Other",
];

export const BIZ_TYPES = [
  "Private Limited Company", "Limited Liability Partnership (LLP)", "One Person Company (OPC)",
  "Partnership Firm", "Sole Proprietorship", "Other",
];

export const ACTIVITIES = [
  "Product-based", "Service-based", "Trading", "Manufacturing", "Consultancy", "E-commerce",
  "Technology / IT", "Import / Export", "Education", "Healthcare", "Construction / Real Estate",
  "Food & Hospitality", "Other",
];

export const TURNOVER = [
  "Below ₹20 Lakh", "₹20 Lakh – ₹40 Lakh", "₹40 Lakh – ₹1 Crore",
  "₹1 Crore – ₹5 Crore", "Above ₹5 Crore",
];

export const ADDONS = [
  "GST Registration", "Trademark Registration", "MSME / Udyam Registration", "IEC Registration",
  "Professional Tax", "FSSAI", "Shops & Establishment", "Other",
];
export const ADDON_PRICE = {
  "GST Registration": 1499, "Trademark Registration": 5999, "MSME / Udyam Registration": 999,
  "IEC Registration": 2499, "Professional Tax": 1299, "FSSAI": 2499, "Shops & Establishment": 1999,
  "Other": 999,
};

export const TM_NATURE = ["Service-based", "Trading", "Manufacturing"];

/* ---------------------------------------------------------------------------
   Field builders (mirrors the prototype's cards/yn/text/area/pick/info/addressFields/
   panStep/bankStep/authStep/docStep helpers).
--------------------------------------------------------------------------- */
export const cardsField = (k, q, opts, o = {}) => ({ k, type: "cards", q, opts, required: true, cols: o.cols || 2, ...o });
export const checksField = (k, q, opts, o = {}) => ({ k, type: "checks", q, opts, required: true, cols: o.cols || 2, ...o });
export const ynField = (k, q, o = {}) => ({ k, type: "cards", q, opts: YN, required: true, cols: 2, ...o });
export const textField = (k, label, o = {}) => ({ k, type: o.type || "text", label, required: true, ...o });
export const areaField = (k, label, o = {}) => ({ k, type: "textarea", label, required: true, ...o });
export const pickField = (k, label, opts, o = {}) => ({ k, type: "select", label, opts, required: true, ...o });
// render(A) => JSX, for static/templated informational blocks
export const noteField = (render, o = {}) => ({ type: "note", render, ...o });

export function addressFields(prefix, label) {
  const p = prefix ? prefix + "_" : "";
  return [
    noteField(() => label, { plainLabel: true, full: true }),
    textField(p + "addr1", "Address Line 1", { full: true }),
    textField(p + "addr2", "Address Line 2", { full: true, required: false }),
    pickField(p + "state", "State", STATES),
    textField(p + "district", "District"),
    textField(p + "city", "City / Town"),
    textField(p + "pincode", "Pincode", { pattern: "pin", ph: "6 digits" }),
  ];
}
export const panStep = (id, who) => ({
  id, title: "PAN Details", fields: [
    textField("pan_number", "PAN Number", { pattern: "pan", ph: "ABCDE1234F", hint: `PAN of the ${who}.` }),
    textField("pan_name", "Name as per PAN"),
    pickField("pan_type", "PAN Holder Type", ["Individual", "Company", "LLP", "Partnership Firm", "Trust / Society", "Other"]),
  ],
});
export const bankStep = (id) => ({
  id, title: "Bank Details", fields: [
    textField("bank_name", "Bank Name"),
    textField("bank_branch", "Branch"),
    textField("bank_account", "Account Number", { pattern: "digits" }),
    textField("bank_ifsc", "IFSC Code", { pattern: "ifsc", ph: "HDFC0001234" }),
    pickField("bank_type", "Account Type", ["Current", "Savings"]),
  ],
});
export const authStep = (id) => ({
  id, title: "Authorized Person", fields: [
    textField("auth_name", "Full Name"),
    textField("auth_designation", "Designation"),
    textField("auth_email", "Email", { pattern: "email", type: "email" }),
    textField("auth_mobile", "Mobile", { pattern: "mobile", type: "tel", ph: "10 digits" }),
    textField("auth_pan", "PAN", { pattern: "pan", required: false }),
    textField("auth_din", "DIN / DPIN (if any)", { required: false }),
  ],
});
export const docStep = (items, o = {}) => ({ id: "documents", title: "Documents", type: "docs", items, ...o });

function addonRecommendations(A) {
  const act = A.activity;
  const desc = (A.activityDesc || "").toLowerCase();
  const recs = {};
  if (act === "Import / Export" || /\bexport|\bimport/.test(desc))
    recs["IEC Registration"] = "You're importing or exporting — an Import Export Code (IEC) is required by DGFT.";
  if (act === "Food & Hospitality" || /\bfood|restaurant|catering|kitchen/.test(desc))
    recs["FSSAI"] = "Food businesses need an FSSAI license or registration before they can start operating.";
  if (["Trading", "Manufacturing", "E-commerce", "Product-based"].includes(act))
    recs["GST Registration"] = "Most trading, manufacturing and e-commerce businesses need GST to invoice customers and claim input credit.";
  return recs;
}
export const addonStep = () => ({
  id: "addons", title: "Additional Registrations", fields: [
    noteField((A) => {
      const entries = Object.entries(addonRecommendations(A));
      if (!entries.length) return null;
      return { variant: "info", title: "Recommended for you, based on your business activity:", list: entries };
    }, { full: true }),
    checksField("additionalServices", "Would you like any additional registrations?", ADDONS, {
      hint: "Optional — add related services now and save on separate filings.",
    }),
  ],
});

/* ---------------------------------------------------------------------------
   Owners / Directors / Partners — role config by business type
--------------------------------------------------------------------------- */
export const OWNER_ROLE_CONFIG = {
  "Private Limited Company": { label: "Directors / Shareholders", minCount: 2, maxCount: null, hasDIN: true,
    dinLabel: "DIN (Director Identification Number)", roles: ["Director", "Director & Shareholder", "Shareholder", "Other"],
    shareholding: true, capital: false,
    hint: "A Private Limited Company needs at least 2 directors (up to 15) and at least 2 shareholders — the same person can be both." },
  "Limited Liability Partnership (LLP)": { label: "Designated Partners / Partners", minCount: 2, maxCount: null, hasDIN: true,
    dinLabel: "DPIN (Designated Partner Identification Number)", roles: ["Designated Partner", "Partner", "Other"],
    shareholding: false, capital: true,
    hint: "An LLP needs at least 2 partners, and at least 2 of them must be Designated Partners." },
  "One Person Company (OPC)": { label: "Director / Nominee", minCount: 1, maxCount: 2, hasDIN: true,
    dinLabel: "DIN (Director Identification Number)", roles: ["Director", "Nominee"],
    shareholding: true, capital: false,
    hint: "An OPC has exactly one Director/Shareholder, plus a Nominee who steps in if something happens to them." },
  "Partnership Firm": { label: "Partners", minCount: 2, maxCount: null, hasDIN: false,
    dinLabel: "", roles: ["Partner", "Managing Partner", "Other"],
    shareholding: false, capital: true,
    hint: "A Partnership Firm needs at least 2 partners." },
  "Sole Proprietorship": { label: "Proprietor", minCount: 1, maxCount: 1, hasDIN: false,
    dinLabel: "", roles: ["Proprietor"],
    shareholding: false, capital: false,
    hint: "A Sole Proprietorship has a single Proprietor — that's you." },
};
export const DEFAULT_OWNER_CONFIG = { label: "Owners / Directors", minCount: 1, maxCount: null, hasDIN: false, dinLabel: "",
  roles: ["Director", "Designated Partner", "Partner", "Shareholder", "Proprietor", "Authorized Signatory", "Other"],
  shareholding: false, capital: false,
  hint: "Add every person who will be an owner, director or partner." };

export function ownerConfig(A) {
  return OWNER_ROLE_CONFIG[A.businessType] || DEFAULT_OWNER_CONFIG;
}
export function ownerBaseFields() {
  return [
    { k: "name", label: "Full Name", type: "text" },
    { k: "dob", label: "Date of Birth", type: "date" },
    { k: "pan", label: "PAN", type: "text", pattern: "pan", ph: "ABCDE1234F" },
    { k: "aadhaar", label: "Aadhaar", type: "text", pattern: "aadhaar", ph: "12 digits" },
    { k: "email", label: "Email", type: "email", pattern: "email" },
    { k: "mobile", label: "Mobile", type: "tel", pattern: "mobile", ph: "10 digits" },
    { k: "address", label: "Address", type: "text", full: true },
  ];
}
export function newOwner() {
  return { name: "", dob: "", pan: "", aadhaar: "", email: "", mobile: "", address: "", role: "", dinKnown: "", din: "", shareholding: "", capital: "" };
}

/* ---------------------------------------------------------------------------
   Deterministic "AI"/mock helpers — hashStr-based simulations, ported
   verbatim in spirit from the prototype so results are stable per input.
--------------------------------------------------------------------------- */
export function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
export function today() {
  return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
export function rupee(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}
function idPart() { return String(10000 + Math.floor(Math.random() * 89999)); }
export function newApplicationId(code) { return `${code}-2026-${idPart()}`; }

export function recommendBusinessType(A) {
  const owners = A.hc_owners, liability = A.hc_liability, invest = A.hc_investment, legal = A.hc_legal;
  if (!owners) return null;
  if (owners === "Just me") {
    return (liability === "Yes, limit my liability" || legal === "Yes") ? "One Person Company (OPC)" : "Sole Proprietorship";
  }
  if (invest === "Yes" || legal === "Yes") return "Private Limited Company";
  if (liability === "Yes, limit my liability") return "Limited Liability Partnership (LLP)";
  return "Partnership Firm";
}

const NAME_NOISE_WORDS = new Set(["will", "with", "that", "this", "from", "have", "business", "also", "into", "them", "other", "their", "these", "sell", "provide", "offer"]);
const NAME_SUFFIXES = {
  "Private Limited Company": ["Ventures Private Limited", "Enterprises Private Limited", "Global Private Limited"],
  "Limited Liability Partnership (LLP)": ["Ventures LLP", "Associates LLP", "Global LLP"],
  "One Person Company (OPC)": ["Ventures (OPC) Private Limited", "Enterprises (OPC) Private Limited"],
  "Partnership Firm": ["& Associates", "Enterprises", "Traders"],
  "Sole Proprietorship": ["Enterprises", "Traders", "Store"],
};
export function nameKeyword(A) {
  const desc = (A.ns_hint || A.activityDesc || "").trim();
  const words = (desc.match(/[A-Za-z]+/g) || []).filter((w) => w.length > 3 && !NAME_NOISE_WORDS.has(w.toLowerCase()));
  const pick = words[0] || "Bizpole";
  return pick.charAt(0).toUpperCase() + pick.slice(1).toLowerCase();
}
export function suggestedBusinessNames(A) {
  const kw = nameKeyword(A);
  const suf = NAME_SUFFIXES[A.businessType] || NAME_SUFFIXES["Private Limited Company"];
  return suf.map((s) => `${kw} ${s}`);
}

function suggestAlternatives(name) {
  const suffixes = ["Ventures", "Enterprises", "Solutions", "Global", "Industries", "Traders", "Innovations", "Associates"];
  const h = hashStr(name.toLowerCase());
  return [`${name} ${suffixes[h % suffixes.length]}`, `${name} ${suffixes[(h + 1) % suffixes.length]}`, `${name} ${suffixes[(h + 2) % suffixes.length]}`];
}
export function runNameCheckSim(name) {
  const key = name.trim().toLowerCase();
  const h = hashStr(key);
  const bucket = h % 5;
  let entry;
  if (bucket <= 2) {
    entry = { status: "available", note: "This name appears available for registration." };
  } else if (bucket === 3) {
    const alts = suggestAlternatives(name);
    entry = { status: "similar", note: `A similarly named entity — "${alts[0]} Pvt Ltd" — is already registered. This may attract an objection from the Registrar.`, alternatives: alts.slice(0, 2) };
  } else {
    entry = { status: "not_suitable", note: "This name is too generic, or closely resembles an existing registered/trademarked name, and is unlikely to be approved as-is.", alternatives: suggestAlternatives(name) };
  }
  entry.checkedAt = today();
  return entry;
}

const NIC_CODES = {
  "Product-based": [{ code: "46900", desc: "Wholesale trade of a variety of goods (unspecialised)" }, { code: "47990", desc: "Other retail sale not in stores, stalls or markets" }],
  "Service-based": [{ code: "82990", desc: "Other business support service activities n.e.c." }, { code: "96099", desc: "Other personal service activities n.e.c." }],
  "Trading": [{ code: "46900", desc: "Wholesale trade of a variety of goods" }, { code: "47190", desc: "Other retail sale in non-specialised stores" }],
  "Manufacturing": [{ code: "25990", desc: "Manufacture of other fabricated metal products n.e.c." }, { code: "10790", desc: "Manufacture of other food products n.e.c." }],
  "Consultancy": [{ code: "70200", desc: "Management consultancy activities" }, { code: "74909", desc: "Other professional, scientific and technical activities n.e.c." }],
  "E-commerce": [{ code: "47912", desc: "Retail sale via mail order houses or via internet" }, { code: "63122", desc: "Web portals" }],
  "Technology / IT": [{ code: "62011", desc: "Writing, modifying, testing of computer programs (software publishing)" }, { code: "62020", desc: "Information technology consultancy activities" }],
  "Import / Export": [{ code: "46900", desc: "Wholesale trade — import/export of goods" }, { code: "52292", desc: "Activities of other transport agencies (clearing & forwarding)" }],
  "Education": [{ code: "85499", desc: "Other education n.e.c. (coaching / training institutes)" }, { code: "85100", desc: "Pre-primary education" }],
  "Healthcare": [{ code: "86903", desc: "Other human health activities (clinics, diagnostic services)" }, { code: "86101", desc: "Hospital activities" }],
  "Construction / Real Estate": [{ code: "41001", desc: "Construction of residential buildings" }, { code: "68100", desc: "Real estate activities with own or leased property" }],
  "Food & Hospitality": [{ code: "56101", desc: "Restaurants and mobile food service activities" }, { code: "55101", desc: "Hotels and short-stay accommodation" }],
  "Other": [{ code: "96099", desc: "Other personal service activities n.e.c." }],
};
export function suggestedNicCodes(A) { return NIC_CODES[A.activity] || NIC_CODES["Other"]; }

const GERUND_VERBS = { manufacture: "manufacturing", sell: "selling", buy: "buying", trade: "trading", provide: "providing", offer: "offering", export: "exporting", import: "importing", distribute: "distributing", supply: "supplying", design: "designing", develop: "developing", build: "building", operate: "operating", run: "running", deal: "dealing", process: "processing", package: "packaging", market: "marketing", produce: "producing", make: "making", create: "creating", deliver: "delivering", install: "installing", maintain: "maintaining", repair: "repairing", consult: "consulting", advise: "advising", teach: "teaching", train: "training", manage: "managing", construct: "constructing", transport: "transporting" };
function toGerundPhrase(text) {
  return text.split(/(\band\b|,)/i).map((part) => {
    const m = part.match(/^(\s*)([A-Za-z]+)(.*)$/);
    if (!m) return part;
    const gerund = GERUND_VERBS[m[2].toLowerCase()];
    if (!gerund) return part;
    const cased = m[2][0] === m[2][0].toUpperCase() ? gerund.charAt(0).toUpperCase() + gerund.slice(1) : gerund;
    return m[1] + cased + m[3];
  }).join("");
}
export function generateBusinessObjective(A) {
  const desc = (A.activityDesc || "").trim();
  if (!desc) return "";
  let clean = desc.replace(/^we\s+(will\s+)?/i, "").replace(/\.+$/, "").trim();
  clean = toGerundPhrase(clean);
  clean = clean ? clean.charAt(0).toLowerCase() + clean.slice(1) : clean;
  return `To carry on the business of ${clean}, and to undertake all activities incidental or ancillary thereto.`;
}

/* ---- Trademark: full 45-class Nice Classification + AI-style class finder ----
   Ported verbatim (no, short, desc, kw per class) from the prototype's NICE_CLASSES. */
export const NICE_CLASSES = [
  { no: 1, short: "Industrial & Scientific Chemicals", desc: "Chemicals used in industry, science, photography, agriculture, horticulture and forestry; unprocessed artificial resins/plastics; manures; fire extinguishing compositions; tempering/soldering preparations; tanning substances; industrial adhesives.", kw: ["chemical", "chemicals", "industrial chemical", "fertiliser", "fertilizer", "manure", "resin", "unprocessed plastic", "adhesive for industry", "industrial adhesive", "fire extinguishing", "tanning", "soldering", "agrochemical", "agro chemical"] },
  { no: 2, short: "Paints, Varnishes & Colorants", desc: "Paints, varnishes, lacquers; preservatives against rust and wood deterioration; colorants, mordants; raw natural resins; metals in foil/powder form for painters, decorators, printers and artists.", kw: ["paint", "paints", "varnish", "lacquer", "coating", "colorant", "dye", "pigment", "anti-rust", "wood preservative", "printing ink"] },
  { no: 3, short: "Cosmetics & Cleaning Preparations", desc: "Bleaching and cleaning preparations; polishing, scouring and abrasive preparations; soaps; perfumery, essential oils, cosmetics, hair lotions, dentifrices.", kw: ["cosmetic", "cosmetics", "perfume", "perfumery", "soap", "shampoo", "hair oil", "skincare", "skin care", "makeup", "make-up", "beauty product", "essential oil", "detergent", "cleaning agent", "toothpaste", "dentifrice", "deodorant"] },
  { no: 4, short: "Industrial Oils, Lubricants & Fuels", desc: "Industrial oils and greases; lubricants; dust absorbing/wetting/binding compositions; fuels (including motor spirit) and illuminants; candles, wicks.", kw: ["lubricant", "industrial oil", "grease", "fuel", "motor spirit", "petrol", "diesel", "candle", "wick", "biofuel"] },
  { no: 5, short: "Pharmaceuticals & Medical Preparations", desc: "Pharmaceutical, veterinary and sanitary preparations; dietetic substances for medical use, food for babies; plasters, dental materials; disinfectants; preparations for destroying vermin; fungicides, herbicides.", kw: ["pharma", "pharmaceutical", "medicine", "medicines", "drug", "tablet", "capsule", "ayurvedic", "herbal medicine", "supplement", "nutraceutical", "veterinary", "sanitary napkin", "disinfectant", "pesticide", "insecticide", "fungicide", "herbicide", "baby food", "dietary supplement", "protein powder"] },
  { no: 6, short: "Common Metals & Metal Goods", desc: "Common metals and their alloys; metal building materials; transportable buildings of metal; materials of metal for railway tracks; ironmongery, small items of metal hardware; pipes and tubes of metal; safes.", kw: ["metal", "steel", "aluminium", "aluminum", "iron", "ironmongery", "metal pipe", "metal fitting", "safe", "metal hardware", "wire mesh", "scaffolding"] },
  { no: 7, short: "Machines & Machine Tools", desc: "Machines and machine tools; motors and engines (except for land vehicles); machine coupling and transmission components; agricultural implements other than hand-operated; incubators for eggs.", kw: ["machine", "machinery", "machine tool", "motor", "engine", "industrial machine", "cnc", "conveyor", "packaging machine", "agricultural machine", "tractor implement", "pump", "compressor"] },
  { no: 8, short: "Hand Tools & Cutlery", desc: "Hand tools and implements (hand-operated); cutlery; side arms; razors.", kw: ["hand tool", "hand tools", "cutlery", "knife", "knives", "razor", "scissors", "spanner", "wrench", "garden tool"] },
  { no: 9, short: "Software, Electronics & Scientific Apparatus", desc: "Scientific, electric, photographic, cinematographic, optical, weighing, measuring, signalling apparatus; apparatus for recording/transmission/reproduction of sound or images; data processing equipment and computers; software.", kw: ["software", "app", "application", "mobile app", "saas", "computer", "electronics", "electronic device", "hardware", "gadget", "it hardware", "camera", "cctv", "sensor", "battery", "charger", "laptop", "smartphone", "data processing", "website platform", "artificial intelligence", "download", "firmware", "chip", "semiconductor", "weighing machine", "measuring instrument"] },
  { no: 10, short: "Medical & Surgical Instruments", desc: "Surgical, medical, dental and veterinary apparatus and instruments; artificial limbs, eyes and teeth; orthopaedic articles; suture materials.", kw: ["medical device", "surgical instrument", "medical equipment", "orthopaedic", "orthopedic", "dental instrument", "hospital equipment", "diagnostic device", "artificial limb", "prosthetic", "suture", "hearing aid"] },
  { no: 11, short: "Lighting, Heating & Sanitary Apparatus", desc: "Apparatus for lighting, heating, steam generating, cooking, refrigerating, drying, ventilating, water supply and sanitary purposes.", kw: ["lighting", "led light", "lamp", "heater", "air conditioner", "ac unit", "refrigerator", "fridge", "ventilation", "water purifier", "water heater", "sanitary ware", "bathroom fitting", "cooking appliance", "stove", "chimney"] },
  { no: 12, short: "Vehicles", desc: "Vehicles; apparatus for locomotion by land, air or water.", kw: ["vehicle", "vehicles", "car", "automobile", "bike", "motorcycle", "scooter", "truck", "bus", "bicycle", "electric vehicle", "aircraft", "boat", "ship", "tyre"] },
  { no: 13, short: "Firearms & Fireworks", desc: "Firearms; ammunition and projectiles; explosives; fireworks.", kw: ["firearm", "weapon", "ammunition", "explosive", "firework", "fireworks", "gun"] },
  { no: 14, short: "Jewellery & Precious Metals", desc: "Precious metals and their alloys and goods coated therewith, not included in other classes; jewellery, precious stones; horological and other chronometric instruments.", kw: ["jewellery", "jewelry", "jewel", "gold", "silver", "diamond", "gemstone", "ornament", "watch", "watches", "precious stone", "bangle", "necklace", "ring"] },
  { no: 15, short: "Musical Instruments", desc: "Musical instruments.", kw: ["musical instrument", "guitar", "piano", "drum", "violin", "harmonium", "keyboard instrument"] },
  { no: 16, short: "Paper, Stationery & Printed Matter", desc: "Paper, cardboard and goods made from these materials; printed matter; bookbinding material; photographs; stationery; artists' materials; instructional/teaching material; plastic packaging materials; playing cards.", kw: ["stationery", "paper", "notebook", "printed matter", "book", "books", "magazine", "brochure", "packaging material", "paper bag", "printing", "publication", "greeting card", "playing card", "pen", "pencil", "office supplies"] },
  { no: 17, short: "Rubber, Plastics & Insulating Materials", desc: "Rubber, gutta percha, gum, asbestos, mica; plastics in extruded form for use in manufacture; packing, stopping and insulating materials; flexible pipes, not of metal.", kw: ["rubber", "plastic sheet", "insulation", "insulating material", "flexible pipe", "gasket", "foam", "packing material industrial"] },
  { no: 18, short: "Leather Goods & Bags", desc: "Leather and imitations of leather, and goods made of these materials; animal skins, hides; trunks and travelling bags; umbrellas, parasols; whips, harness and saddlery.", kw: ["leather", "leather goods", "bag", "bags", "handbag", "wallet", "purse", "backpack", "luggage", "suitcase", "umbrella", "saddlery"] },
  { no: 19, short: "Building Materials (Non-metallic)", desc: "Building materials (non-metallic); non-metallic rigid pipes for building; asphalt, pitch and bitumen; non-metallic transportable buildings; monuments, not of metal.", kw: ["building material", "cement", "tiles", "bricks", "construction material", "asphalt", "bitumen", "marble", "granite", "monument", "prefab structure"] },
  { no: 20, short: "Furniture & Furnishings", desc: "Furniture, mirrors, picture frames; goods of wood, cork, reed, cane, wicker, horn, bone, ivory, whalebone, shell, amber, mother-of-pearl and substitutes for these materials, or of plastics.", kw: ["furniture", "chair", "table", "sofa", "mattress", "bed", "cabinet", "wardrobe", "mirror", "picture frame", "wooden furniture", "home decor item", "interior decor product"] },
  { no: 21, short: "Household & Kitchen Utensils", desc: "Household or kitchen utensils and containers; combs and sponges; brushes; brush-making materials; unworked/semi-worked glass; glassware, porcelain and earthenware.", kw: ["kitchenware", "utensil", "utensils", "cookware", "glassware", "crockery", "porcelain", "earthenware", "comb", "brush", "sponge", "water bottle", "container household", "dinner set"] },
  { no: 22, short: "Ropes, Nets & Tents", desc: "Ropes, string, nets, tents, awnings, tarpaulins, sails, sacks and bags; padding and stuffing materials; raw fibrous textile materials.", kw: ["rope", "tent", "tarpaulin", "net", "sack", "awning", "canvas", "fibre material", "fiber material"] },
  { no: 23, short: "Yarns & Threads", desc: "Yarns and threads for textile use.", kw: ["yarn", "thread", "cotton yarn", "textile yarn", "spinning"] },
  { no: 24, short: "Textiles & Textile Goods", desc: "Textiles and textile goods, not included in other classes; bed and table covers.", kw: ["textile", "fabric", "cloth material", "bedsheet", "bed sheet", "pillow cover", "curtain", "towel", "table cover", "linen", "upholstery fabric"] },
  { no: 25, short: "Clothing, Footwear & Headgear", desc: "Clothing, footwear, headgear.", kw: ["clothing", "apparel", "garment", "garments", "t-shirt", "shirt", "dress", "fashion wear", "footwear", "shoes", "sandals", "cap", "hat", "headgear", "innerwear", "saree", "kurta"] },
  { no: 26, short: "Lace, Embroidery & Fancy Goods", desc: "Lace and embroidery, ribbons and braid; buttons, hooks and eyes, pins and needles; artificial flowers.", kw: ["lace", "embroidery", "ribbon", "button", "zip", "needle", "artificial flower", "hair accessory", "fancy goods"] },
  { no: 27, short: "Carpets & Floor Coverings", desc: "Carpets, rugs, mats and matting, linoleum and other materials for covering floors; wall hangings (non-textile).", kw: ["carpet", "rug", "mat", "floor covering", "linoleum", "wallpaper"] },
  { no: 28, short: "Games, Toys & Sporting Goods", desc: "Games and playthings; gymnastic and sporting articles; decorations for Christmas trees.", kw: ["toy", "toys", "game", "games", "sporting goods", "gym equipment", "fitness equipment", "playing cards game", "puzzle", "board game", "sports equipment", "cricket bat", "gaming console accessory"] },
  { no: 29, short: "Meat, Fish, Dairy & Preserved Foods", desc: "Meat, fish, poultry and game; preserved, dried and cooked fruits and vegetables; jellies, jams; eggs, milk and milk products; edible oils and fats.", kw: ["meat", "chicken", "fish product", "seafood", "dairy", "milk", "cheese", "paneer", "butter", "ghee", "jam", "pickle", "edible oil", "cooking oil", "frozen food", "snack namkeen", "dry fruit"] },
  { no: 30, short: "Coffee, Tea, Bakery & Staple Foods", desc: "Coffee, tea, cocoa, sugar, rice, flour and preparations from cereals, bread, pastry and confectionery, ices; honey; spices; sauces; vinegar.", kw: ["coffee", "tea", "cocoa", "chocolate", "bakery", "bread", "biscuit", "cake", "confectionery", "sweets", "mithai", "spices", "masala", "sauce", "ketchup", "noodles", "pasta", "rice", "flour", "atta", "salt", "sugar", "honey", "ice cream"] },
  { no: 31, short: "Agricultural & Horticultural Products", desc: "Agricultural, horticultural and forestry products and grains; live animals; fresh fruits and vegetables; seeds, natural plants and flowers; foodstuffs for animals, malt.", kw: ["agriculture", "agricultural product", "seeds", "seed", "fresh fruit", "fresh vegetable", "live animal", "poultry farm", "cattle feed", "animal feed", "plant nursery", "horticulture", "fodder", "grains raw"] },
  { no: 32, short: "Beers & Non-alcoholic Beverages", desc: "Beers; mineral and aerated waters and other non-alcoholic drinks; fruit drinks and fruit juices; syrups and other preparations for making beverages.", kw: ["beer", "soft drink", "aerated water", "mineral water", "packaged drinking water", "juice", "fruit juice", "energy drink", "soda", "syrup beverage"] },
  { no: 33, short: "Alcoholic Beverages", desc: "Alcoholic beverages (except beers).", kw: ["wine", "whisky", "whiskey", "rum", "vodka", "liquor", "alcoholic beverage", "spirits"] },
  { no: 34, short: "Tobacco & Smokers' Articles", desc: "Tobacco, smokers' articles, matches.", kw: ["tobacco", "cigarette", "cigar", "matches", "smokers article", "vape", "e-cigarette"] },
  { no: 35, short: "Advertising & Business Management", desc: "Advertising; business management; business administration; office functions.", kw: ["advertising", "marketing", "business management", "business consultancy", "business consulting", "office function", "retail", "wholesale", "trading business", "import export trading", "ecommerce", "e-commerce", "online store", "distributorship", "franchise", "staffing", "recruitment", "hr services", "market research", "brand promotion"] },
  { no: 36, short: "Insurance & Financial Services", desc: "Insurance; financial affairs; monetary affairs; real estate affairs.", kw: ["insurance", "bank", "banking", "finance", "financial service", "investment", "loan", "mutual fund", "stock broking", "real estate", "property dealing", "real estate agent", "fintech", "payment gateway", "wealth management"] },
  { no: 37, short: "Construction & Repair Services", desc: "Building construction; repair; installation services.", kw: ["construction", "builder", "civil contractor", "installation service", "repair service", "plumbing service", "electrical installation", "interior fit-out", "renovation", "real estate development", "road construction"] },
  { no: 38, short: "Telecommunications", desc: "Telecommunications.", kw: ["telecom", "telecommunication", "internet service", "broadband", "mobile network", "isp", "messaging service", "broadcasting"] },
  { no: 39, short: "Transport, Packaging & Storage", desc: "Transport; packaging and storage of goods; travel arrangement.", kw: ["transport", "logistics", "courier", "shipping", "freight", "warehousing", "packaging service", "storage service", "travel agency", "cab service", "delivery service", "supply chain"] },
  { no: 40, short: "Treatment of Materials", desc: "Treatment of materials.", kw: ["material treatment", "recycling service", "dyeing service", "printing service industrial", "custom manufacturing service", "water treatment", "energy production service", "3d printing service"] },
  { no: 41, short: "Education, Training & Entertainment", desc: "Education; providing of training; entertainment; sporting and cultural activities.", kw: ["education", "school", "coaching", "training institute", "tuition", "e-learning", "online course", "entertainment", "event management", "cultural activity", "sports academy", "publishing entertainment", "gaming entertainment", "content creation", "youtube channel", "film production"] },
  { no: 42, short: "IT, Scientific & Design Services", desc: "Scientific and technological services and research and design relating thereto; industrial analysis and research services; design and development of computer hardware and software.", kw: ["it services", "software development", "web development", "app development", "it consultancy", "research and development", "r&d", "engineering service", "graphic design service", "product design", "cloud service", "hosting service", "cyber security service", "data analytics service", "saas platform"] },
  { no: 43, short: "Food, Drink & Accommodation Services", desc: "Services for providing food and drink; temporary accommodation.", kw: ["restaurant", "cafe", "hotel", "catering", "food delivery service", "cloud kitchen", "bar service", "resort", "lodge", "guest house", "banquet", "canteen"] },
  { no: 44, short: "Medical, Beauty & Agricultural Services", desc: "Medical services, veterinary services, hygienic and beauty care for human beings or animals; agriculture, horticulture and forestry services.", kw: ["hospital", "clinic", "medical service", "veterinary service", "salon", "spa", "beauty parlour", "beautician", "diagnostic lab", "physiotherapy", "wellness centre", "agriculture service", "landscaping service", "dental clinic"] },
  { no: 45, short: "Legal & Security Services", desc: "Legal services; security services for the protection of property and individuals; personal and social services rendered by others to meet the needs of individuals.", kw: ["legal service", "law firm", "lawyer", "advocate", "security service", "security guard", "detective agency", "personal service", "matrimonial service", "dating service", "social service ngo", "intellectual property service"] },
];
/* Single-word phrases must match at a word boundary — plain .includes() would let "ring" match inside
   "manufactuRING", "car" inside "scarf", etc. Multi-word phrases are safe with substring matching.
   Ported verbatim from the prototype's wbMatch. */
function wbMatch(text, phrase) {
  if (phrase.includes(" ")) return text.includes(phrase);
  return new RegExp("\\b" + phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(text);
}
function matchNiceClasses(query, nature) {
  const text = (query || "").toLowerCase().trim();
  if (!text) return [];
  const wantsTrading = nature === "Trading";
  // A Trading business is always offering wholesale/retail trade services — that's Class 35,
  // full stop, regardless of what goods it trades in — so only Class 35 is returned.
  if (wantsTrading) {
    const c35 = NICE_CLASSES.find((c) => c.no === 35);
    return [{ no: 35, short: c35.short, desc: c35.desc, score: 99 }];
  }
  const scored = [];
  NICE_CLASSES.forEach((c) => {
    let score = 0;
    c.kw.forEach((k) => { if (wbMatch(text, k)) score += k.includes(" ") ? 4 : 2; });
    if (score > 0) scored.push({ no: c.no, short: c.short, desc: c.desc, score });
  });
  // Declared nature of business is a deliberate, explicit signal — weight it heavily so it
  // steers results toward the matching Goods (1–34) / Service (35–45) half, only letting an
  // opposite-half class through when its keyword match is strong enough to survive the penalty.
  const wantsService = nature === "Service-based";
  const wantsGoods = nature === "Manufacturing";
  scored.forEach((c) => {
    const isGoods = c.no <= 34;
    if (wantsService) c.score = isGoods ? c.score * 0.3 : c.score + 3;
    else if (wantsGoods) c.score = isGoods ? c.score + 3 : c.score * 0.3;
  });
  scored.sort((a, b) => b.score - a.score || a.no - b.no);
  return scored.slice(0, 5);
}
export function recommendTmClass(A) {
  const nature = A.tm_nature || "";
  const text = nature + " " + [A.tm_products, A.tm_aiQuery].filter(Boolean).join(" ");
  const matches = matchNiceClasses(text, nature);
  if (matches.length) return `Class ${matches[0].no} — ${matches[0].short}`;
  return "Not sure — advise me";
}
export function tmClassMatches(A) {
  const nature = A.tm_nature || "";
  const text = nature + " " + [A.tm_products, A.tm_aiQuery].filter(Boolean).join(" ");
  return matchNiceClasses(text, nature);
}
export function selectedNiceClass(A) {
  const m = (A.tm_class || "").match(/^Class (\d+)/);
  return m ? (NICE_CLASSES.find((c) => c.no === Number(m[1])) || null) : null;
}
export function runTrademarkSearchSim(name, tmClass) {
  const h = hashStr(name.toLowerCase());
  const count = h % 4;
  const cls = (tmClass || "Class 35 — Advertising & Business Management").split(" — ")[0];
  const suffixes = ["Pro", "Hub", "Zone", "World", "India", "Global", "Plus", "Mart"];
  const owners = ["Nova Ventures Pvt Ltd", "Bluepeak Industries", "Trident Commerce LLP", "Silverline Traders", "Orbit Retail Pvt Ltd"];
  const statuses = ["Registered", "Under Examination", "Opposed"];
  const sims = ["Highly Similar", "Similar", "Similar"];
  const results = [];
  const exactHit = name && h % 5 === 0;
  for (let i = 0; i < count; i++) {
    results.push({
      mark: i === 0 && exactHit ? name : `${name} ${suffixes[(h + i * 7) % suffixes.length]}`,
      class: cls,
      status: statuses[(h + i) % statuses.length],
      similarity: i === 0 && exactHit ? "Identical" : sims[(h + i) % sims.length],
      owner: owners[(h + i * 3) % owners.length],
    });
  }
  return results;
}
export function tmRiskLevel(results) {
  if (!results) return null;
  if (results.some((x) => x.similarity === "Identical")) return { level: "High", variant: "err", note: "An identical mark already exists in the register. Registration is very likely to face objection or opposition — we strongly recommend choosing a different name." };
  if (results.length >= 2) return { level: "Medium", variant: "warn", note: "A few similar marks exist. Registration is possible but may attract an examination objection. Our attorney will review closely before filing." };
  if (results.length === 1) return { level: "Low-Medium", variant: "warn", note: "One similar mark was found. Risk is limited but not zero — our attorney will review before filing." };
  return { level: "Low", variant: "ok", note: "No identical or closely similar marks were found. This is a good indicator, though final risk is confirmed only after the Registrar's examination." };
}

/* ---------------------------------------------------------------------------
   New-company registration steps (used by ex-business → "Register another/new
   company", and ex-trademark → "New Trademark" reuses the "trademark" flow below)
--------------------------------------------------------------------------- */
export function newcoBusinessSteps(A) {
  const s = [
    { id: "type", title: "Business Type", fields: [
      cardsField("businessType", "What type of business do you want to register?", BIZ_TYPES, { cols: 2, hint: "Not sure which is right? Use Help Me Choose below, or pick the closest — our advisor will confirm before filing." }),
      { type: "helpChoose" },
    ] },
    { id: "name", title: "Business Name", fields: [
      ynField("hasName", "Do you already have a preferred business/company name?"),
      textField("name1", "Preferred Name 1", { showIf: (A) => A.hasName === "Yes", full: true }),
      textField("name2", "Preferred Name 2", { showIf: (A) => A.hasName === "Yes", full: true, required: false }),
      textField("name3", "Preferred Name 3", { showIf: (A) => A.hasName === "Yes", full: true, required: false }),
      { type: "suggestNames", showIf: (A) => A.hasName === "No", full: true },
    ] },
    { id: "namecheck", title: "Name Availability Check", type: "namecheck" },
    { id: "activity", title: "Business Activity", fields: [
      cardsField("activity", "What does your business do?", ACTIVITIES, { cols: 3 }),
      areaField("activityDesc", "Describe your business activity", { full: true, ph: "e.g. We design and sell custom industrial packaging to FMCG manufacturers." }),
    ] },
    { id: "objective", title: "AI Business Objective & NIC Code", type: "objective" },
    { id: "address", title: "Business Address", fields: [
      ...addressFields("", "Where will the business operate from?"),
      ynField("isRegisteredAddress", "Is this the registered business address?", { full: true }),
      cardsField("propertyType", "Do you own or rent this property?", ["Owned", "Rented", "Leased", "Other"], { cols: 2, full: true }),
    ] },
    { id: "owners", title: (ownerConfig(A)).label, type: "owners" },
    docStep(["PAN", "Aadhaar / ID Proof", "Address Proof", "Photograph", "Registered Office Address Proof", "NOC, if applicable", "Other Supporting Document"]),
    addonStep(),
  ];
  return s;
}

export const TRADEMARK_FLOW = {
  name: "Trademark Registration", code: "TM", price: 5999, govt: 4500,
  steps: () => [
    { id: "nature", title: "Nature of Business", fields: [cardsField("tm_nature", "What is the nature of your business?", TM_NATURE, { cols: 3 })] },
    { id: "product", title: "Business / Product / Service Details", fields: [
      areaField("tm_products", "Describe the goods or services the mark will be used for", { full: true, ph: "e.g. We manufacture and sell organic skincare products under this brand." }),
      textField("tm_website", "Website / online store", { required: false }),
    ] },
    { id: "recommend", title: "Recommended Trademark Class", type: "aiClassFinder" },
    { id: "class", title: "Confirm / Modify Class", type: "tmClassConfirm" },
    { id: "mark", title: "Enter Proposed Trademark / Brand Name", fields: [textField("tm_name", "Proposed trademark / brand name", { full: true, hint: "Exactly as you want it registered." })] },
    { id: "search", title: "Public Trademark Search", type: "tmSearch" },
    { id: "results", title: "Search Results", type: "tmResults" },
    { id: "assessment", title: "Search Assessment", fields: [
      { type: "tmRisk", full: true },
      ynField("tm_assessmentReviewed", "Have you reviewed the assessment above and wish to continue?", { full: true }),
    ] },
    { id: "proceed", title: "Proceed with Registration", fields: [
      cardsField("tm_proceed", "Do you want to proceed with registration for this trademark?", ["Yes, proceed with registration", "No, I want to choose a different name"], { cols: 1, full: true }),
      noteField(() => ({ variant: "info", title: "Want to change the name?", body: "Go back and update the proposed trademark name, then repeat the search." }),
        { showIf: (A) => A.tm_proceed === "No, I want to choose a different name", full: true }),
    ] },
    { id: "owner", title: "Applicant Details", fields: [
      cardsField("tm_ownerType", "Who owns the trademark?", ["Individual", "Company", "LLP", "Partnership", "Other"], { cols: 3, full: true }),
      textField("tm_ownerName", "Owner name (as per records)", { full: true }),
      textField("tm_ownerEmail", "Email", { pattern: "email", type: "email" }),
      textField("tm_ownerMobile", "Mobile", { pattern: "mobile", type: "tel" }),
      textField("tm_ownerPan", "PAN", { pattern: "pan", required: false }),
      ynField("tm_startup", "Do you have MSME (Udyam) or Startup India registration?", { full: true, showIf: (A) => !!A.tm_ownerType && A.tm_ownerType !== "Individual", hint: "This qualifies you for the lower government filing fee that individual applicants already get." }),
      textField("tm_udyamNo", "Udyam Registration Number", { full: true, showIf: (A) => A.tm_ownerType !== "Individual" && A.tm_startup === "Yes" }),
    ] },
    { id: "details", title: "Trademark Details", fields: [
      checksField("tm_what", "What do you want to protect?", ["Brand Name", "Logo", "Product Name", "Service Name", "Company Name", "Tagline", "Other"], { cols: 3, full: true }),
      textField("tm_tagline", "Tagline", { required: false, showIf: (A) => (A.tm_what || []).includes("Tagline") || (A.tm_what || []).includes("Brand Name") }),
      pickField("tm_language", "Language / script", ["English", "Hindi", "Regional language", "Other"]),
      noteField(() => ({ variant: "info", body: "Logo selected. You'll be asked to upload the logo artwork in the Documents step — a clear PNG or JPG on a white background works best." }), { showIf: (A) => (A.tm_what || []).includes("Logo"), full: true }),
      ynField("tm_inUse", "Is the trademark already being used?", { full: true }),
      textField("tm_useSince", "In use since (date)", { type: "date", showIf: (A) => A.tm_inUse === "Yes" }),
      ynField("tm_applied", "Has an application been filed for this mark before?", { full: true }),
      textField("tm_appNo", "Previous application number", { showIf: (A) => A.tm_applied === "Yes" }),
    ] },
    { id: "documents", title: "Documents Upload", type: "docs", dynamicItems: (A) => {
      const base = ["PAN of Applicant", "Aadhaar / ID Proof", "Business Registration Certificate", "Signed Form TM-48 (Power of Attorney)"];
      if ((A.tm_what || []).includes("Logo")) base.splice(1, 0, "Logo Artwork (PNG / JPG)");
      if (A.tm_inUse === "Yes") base.push("Proof of Use (invoice, packaging, listing)");
      if (A.tm_startup === "Yes") base.push("MSME / Startup Certificate");
      base.push("Other Supporting Document");
      return base;
    } },
  ],
};

export const MSME_FLOW = {
  name: "MSME / Udyam Registration", code: "MSME", price: 999, govt: 0,
  steps: () => [
    { id: "biz", title: "Business Details", fields: [
      textField("msme_name", "Enterprise Name", { full: true }),
      pickField("msme_type", "Type of Organisation", BIZ_TYPES),
      textField("msme_startDate", "Date of commencement", { type: "date" }),
      ...addressFields("msme", "Enterprise address"),
    ] },
    { id: "applicant", title: "Applicant Details", fields: [
      textField("msme_applicant", "Applicant Name"),
      pickField("msme_role", "Designation", ["Proprietor", "Partner", "Director", "Authorized Signatory", "Other"]),
      textField("msme_email", "Email", { pattern: "email", type: "email" }),
      textField("msme_mobile", "Mobile", { pattern: "mobile", type: "tel" }),
      pickField("msme_social", "Social Category", ["General", "SC", "ST", "OBC"]),
      pickField("msme_gender", "Gender", ["Male", "Female", "Other", "Prefer not to say"]),
    ] },
    panStep("pan", "enterprise"),
    { id: "aadhaar", title: "Aadhaar", fields: [
      textField("msme_aadhaar", "Aadhaar Number", { pattern: "aadhaar", ph: "12 digits" }),
      textField("msme_aadhaarName", "Name as per Aadhaar"),
      ynField("msme_otp", "Is this Aadhaar linked to the mobile number above?", { full: true, hint: "Udyam verification uses an OTP sent to the Aadhaar-linked mobile." }),
    ] },
    { id: "activity", title: "Business Activity", fields: [
      cardsField("msme_activity", "Primary activity", ["Manufacturing", "Service", "Trading", "Both Manufacturing & Service"], { cols: 2 }),
      areaField("msme_nic", "Describe your activity (NIC code if known)", { full: true }),
    ] },
    { id: "investment", title: "Investment", fields: [
      cardsField("msme_investment", "Investment in plant, machinery & equipment", ["Up to ₹1 Crore (Micro)", "₹1 Cr – ₹10 Cr (Small)", "₹10 Cr – ₹50 Cr (Medium)", "Above ₹50 Crore"], { cols: 2 }),
      textField("msme_investAmt", "Exact investment amount (₹)", { type: "number", required: false }),
    ] },
    { id: "turnover", title: "Annual Turnover", fields: [
      cardsField("msme_turnover", "Annual turnover", ["Up to ₹5 Crore", "₹5 Cr – ₹50 Cr", "₹50 Cr – ₹250 Cr", "Above ₹250 Crore"], { cols: 2 }),
      ynField("msme_exports", "Do you export goods or services?"),
    ] },
    { id: "employees", title: "Employees", fields: [
      textField("msme_male", "Male employees", { type: "number", pattern: "digits" }),
      textField("msme_female", "Female employees", { type: "number", pattern: "digits" }),
      textField("msme_total", "Total employees", { type: "number", pattern: "digits" }),
    ] },
    bankStep("bank"),
    docStep(["PAN of Enterprise / Proprietor", "Aadhaar Card", "Business Address Proof", "Bank Account Details", "GST Certificate (if registered)", "Other Supporting Document"]),
  ],
};

export const IEC_FLOW = {
  name: "IEC Registration", code: "IEC", price: 2499, govt: 500,
  steps: (A) => {
    const existing = A.iec_has === "Yes";
    return [
      { id: "existing", title: "Existing IEC", fields: [
        ynField("iec_has", "Do you already have an IEC?"),
        textField("iec_number", "Existing IEC number", { showIf: () => existing }),
        cardsField("iec_action", "What do you need to do?", ["Update IEC", "Modify Details", "Surrender IEC", "Other"], { cols: 2, showIf: () => existing, full: true }),
        areaField("iec_modify", "What details need to change?", { full: true, showIf: (A) => existing && (A.iec_action === "Update IEC" || A.iec_action === "Modify Details") }),
        areaField("iec_surrenderReason", "Reason for surrender", { full: true, showIf: (A) => existing && A.iec_action === "Surrender IEC" }),
        noteField(() => ({ variant: "info", body: "New IEC application. IEC is a lifetime code issued by DGFT — but it must be updated on the DGFT portal every April to stay active." }), { showIf: (A) => A.iec_has === "No" }),
      ] },
      { id: "biz", title: "Business Details", fields: [
        textField("iec_bizname", "Business Name", { full: true }),
        pickField("iec_biztype", "Firm Type", BIZ_TYPES),
        textField("iec_incDate", "Date of incorporation", { type: "date" }),
        textField("iec_cin", "CIN / Registration Number", { required: false }),
      ] },
      panStep("pan", "firm"),
      { id: "trade", title: "Import / Export Activity", fields: [
        cardsField("iec_nature", "What will you do?", ["Import only", "Export only", "Both import and export", "Merchant export", "Service export", "Other"], { cols: 3, full: true }),
        areaField("iec_goods", "Goods / services traded", { full: true }),
        checksField("iec_countries", "Main markets", ["UAE", "USA", "UK", "Europe", "Singapore", "China", "Africa", "Australia", "Other"]),
      ] },
      { id: "address", title: "Business Address", fields: addressFields("iec", "Registered business address") },
      bankStep("bank"),
      authStep("auth"),
      docStep(["PAN of Firm", "Aadhaar of Signatory", "Cancelled Cheque / Bank Certificate", "Business Address Proof", "Digital Signature / Aadhaar e-Sign", "Other Supporting Document"]),
    ];
  },
};

/* ---------------------------------------------------------------------------
   FLOWS — the Existing Company flows reachable from EXISTING_MENU
--------------------------------------------------------------------------- */
export const FLOWS = {
  "other-generic": {
    name: "Other Registration", code: "OTH", price: 2999, govt: 1000, kind: "Existing Company",
    steps: (A) => {
      const s = A.other_service || "Service";
      const extra = [];
      if (s.indexOf("FSSAI") >= 0) {
        extra.push(cardsField("fssai_scale", "Scale of the food business", ["Basic (turnover up to ₹12 L)", "State (₹12 L – ₹20 Cr)", "Central (above ₹20 Cr / import-export)"], { cols: 1, full: true }));
        extra.push(checksField("fssai_kind", "Which activities apply?", ["Manufacturing", "Trading", "Restaurant / Cloud Kitchen", "Storage / Warehouse", "Transport", "Retail", "Other"]));
      }
      if (s.indexOf("Shop") >= 0 || s.indexOf("Trade") >= 0) {
        extra.push(textField("shop_name", "Name displayed on the premises", { full: true }));
        extra.push(textField("shop_employees", "Number of employees", { type: "number", pattern: "digits" }));
        extra.push(cardsField("shop_premises", "Premises", ["Owned", "Rented", "Leased", "Other"], { cols: 2, full: true }));
      }
      return [
        { id: "about", title: "Service Details", fields: [
          noteField(() => ({ variant: "info", title: s, body: "Tell us about the business and we'll confirm the exact documents and government fee before filing." }), { full: true }),
          textField("other_bizname", "Business Name", { full: true }),
          pickField("other_biztype", "Business Type", BIZ_TYPES),
          pickField("other_state", "State", STATES),
          areaField("other_requirement", "What exactly do you need?", { full: true }),
          ...extra,
        ] },
        { id: "address", title: "Address", fields: addressFields("other", "Business address") },
        authStep("auth"),
        docStep(["PAN", "Aadhaar / ID Proof", "Business Address Proof", "Photograph", "Business Registration Certificate", "Other Supporting Document"]),
      ];
    },
  },

  "ex-business": {
    name: "Business Registration", code: "BR", price: 6999, govt: 2100, kind: "Existing Company",
    steps: (A) => {
      const purpose = A.ex_purpose;
      const s = [{ id: "purpose", title: "Your Requirement", fields: [
        noteField(() => ({ variant: "info", title: "You already have an existing company.", body: "We'll only ask what's relevant to your requirement — nothing you've already filed." }), { full: true }),
        cardsField("ex_purpose", "What do you need business registration for?", ["Register another/new company", "Register a new branch", "Change/update my existing business", "I'm not sure"], { cols: 1, full: true }),
      ] }];
      if (!purpose) return s;

      if (purpose === "I'm not sure") {
        s.push({ id: "advice", title: "Talk to an Advisor", fields: [
          noteField(() => ({ variant: "info", title: "No problem — let's figure it out together.", body: "Share a few details and a business advisor will call you within one working day with a recommendation." }), { full: true }),
          textField("ex_name", "Existing Company Name", { full: true }),
          textField("ex_contact", "Contact Person"),
          textField("ex_mobile", "Mobile", { pattern: "mobile", type: "tel" }),
          areaField("ex_query", "What are you trying to achieve?", { full: true }),
        ] });
        return s;
      }
      if (purpose === "Register a new branch") return s.concat(FLOWS["ex-branch"].steps(A));
      if (purpose === "Change/update my existing business") return s.concat(FLOWS["ex-change"].steps(A));

      s.push({ id: "newbiz", title: "New or Related?", fields: [
        ynField("ex_brandNew", "Is this a completely new business?", { hint: "Choose No if the new entity shares owners with, or is a subsidiary of, your existing company." }),
        cardsField("ex_relation", "How is the new company related to your existing company?", ["Same owners/directors", "Some owners/directors are common", "Different owners", "Subsidiary / related company", "Other"], { cols: 2, full: true, showIf: (A) => A.ex_brandNew === "No" }),
      ] });
      if (A.ex_brandNew === "No") {
        s.push({ id: "exdetails", title: "Existing Company", fields: [
          textField("ex_name", "Existing Company Name", { full: true }),
          textField("ex_regno", "Registration Number (CIN / LLPIN / Reg. No.)"),
          pickField("ex_biztype", "Existing Business Type", BIZ_TYPES),
          ...addressFields("ex", "Existing company address"),
        ] });
      }
      if (A.ex_brandNew === "Yes" || A.ex_brandNew === "No") {
        s.push(...newcoBusinessSteps(A));
      }
      return s;
    },
  },

  "ex-branch": {
    name: "New Branch Registration", code: "BRN", price: 3999, govt: 1200, kind: "Existing Company",
    steps: () => [
      { id: "parent", title: "Existing Company", fields: [
        textField("ex_name", "Existing Company Name", { full: true }),
        textField("ex_regno", "Registration Number (CIN / LLPIN)"),
        textField("ex_gstin", "GSTIN", { required: false, ph: "15 characters" }),
        pickField("ex_biztype", "Business Type", BIZ_TYPES),
      ] },
      { id: "branch", title: "Branch Details", fields: [
        textField("br_name", "Branch Name", { full: true }),
        ...addressFields("br", "Branch address"),
        areaField("br_activity", "Branch Activity", { full: true }),
        textField("br_contactName", "Branch Contact Person"),
        textField("br_contactMobile", "Contact Mobile", { pattern: "mobile", type: "tel" }),
        textField("br_contactEmail", "Contact Email", { pattern: "email", type: "email", full: true }),
        textField("br_employees", "Employees at branch", { type: "number", required: false }),
      ] },
      { id: "branchgst", title: "Branch GST", fields: [
        ynField("br_needGst", "Do you need GST registration for this branch?"),
        cardsField("br_gstType", "What kind of GST action for the branch?", ["New GSTIN for this state", "Additional place of business under existing GSTIN", "Not sure — advise me"], { cols: 1, full: true, showIf: (A) => A.br_needGst === "Yes" }),
        cardsField("br_gstTurnover", "Expected turnover from this branch", TURNOVER, { cols: 2, full: true, showIf: (A) => A.br_needGst === "Yes" }),
        ynField("br_interstate", "Will the branch supply across states?", { full: true, showIf: (A) => A.br_needGst === "Yes" }),
        cardsField("br_premises", "Nature of branch premises", ["Owned", "Rented", "Leased", "Consent / Shared", "Other"], { cols: 2, full: true, showIf: (A) => A.br_needGst === "Yes" }),
        noteField(() => ({ variant: "info", body: "No GST needed for this branch — we'll register the branch with the ROC / relevant authority only." }), { showIf: (A) => A.br_needGst === "No", full: true }),
      ] },
      docStep(["Board Resolution for Branch", "Existing Company PAN", "Certificate of Incorporation", "Branch Address Proof", "Rent Agreement / NOC", "Utility Bill", "Other Supporting Document"]),
    ],
  },

  "ex-change": {
    name: "Company Change Request", code: "CHG", price: 3499, govt: 900, kind: "Existing Company",
    steps: (A) => {
      const what = A.change_what;
      const s = [
        { id: "what", title: "Change Required", fields: [
          cardsField("change_what", "What would you like to change?", ["Business Name", "Business Address", "Business Activity", "Owner / Director", "Partner", "Contact Details", "Bank Details", "Company Structure", "Registered Office", "Other"], { cols: 2, full: true }),
        ] },
        { id: "company", title: "Existing Company", fields: [
          textField("ex_name", "Existing Company Name", { full: true }),
          textField("ex_regno", "Registration Number (CIN / LLPIN)"),
          pickField("ex_biztype", "Business Type", BIZ_TYPES),
        ] },
      ];
      if (!what) return [s[0]];

      const cur = [], nw = [];
      if (what === "Business Name") { cur.push(textField("cur_name", "Current registered name", { full: true })); nw.push(textField("new_name1", "New preferred name 1", { full: true }), textField("new_name2", "New preferred name 2", { full: true, required: false })); }
      else if (what === "Business Address" || what === "Registered Office") { cur.push(...addressFields("cur", "Current address")); nw.push(...addressFields("new", "New address"), cardsField("new_premises", "New premises is", ["Owned", "Rented", "Leased", "Other"], { cols: 2, full: true })); }
      else if (what === "Business Activity") { cur.push(areaField("cur_activity", "Current activity as registered", { full: true })); nw.push(cardsField("new_activity", "New primary activity", ACTIVITIES, { cols: 3, full: true }), areaField("new_activityDesc", "Describe the new activity", { full: true })); }
      else if (what === "Owner / Director" || what === "Partner") {
        cur.push(textField("cur_person", "Name of existing owner/director/partner", { full: true }), textField("cur_din", "DIN / DPIN / PAN"));
        nw.push(cardsField("change_action", "What do you want to do?", ["Add", "Remove", "Replace", "Change role / designation"], { cols: 2, full: true }),
          textField("new_person", "Name of incoming person", { full: true, showIf: (A) => ["Add", "Replace"].includes(A.change_action) }),
          textField("new_personPan", "PAN of incoming person", { pattern: "pan", showIf: (A) => ["Add", "Replace"].includes(A.change_action) }),
          textField("new_personEmail", "Email of incoming person", { pattern: "email", type: "email", showIf: (A) => ["Add", "Replace"].includes(A.change_action) }),
          pickField("new_role", "Role", ["Director", "Designated Partner", "Partner", "Shareholder", "Authorized Signatory", "Other"]));
      }
      else if (what === "Contact Details") { cur.push(textField("cur_email", "Current email", { pattern: "email", type: "email" }), textField("cur_mobile", "Current mobile", { pattern: "mobile", type: "tel" })); nw.push(textField("new_email", "New email", { pattern: "email", type: "email" }), textField("new_mobile", "New mobile", { pattern: "mobile", type: "tel" })); }
      else if (what === "Bank Details") { cur.push(textField("cur_bank", "Current bank & account number", { full: true })); nw.push(textField("bank_name", "New Bank Name"), textField("bank_branch", "Branch"), textField("bank_account", "Account Number", { pattern: "digits" }), textField("bank_ifsc", "IFSC Code", { pattern: "ifsc" }), pickField("bank_type", "Account Type", ["Current", "Savings"])); }
      else if (what === "Company Structure") { cur.push(pickField("cur_structure", "Current structure", BIZ_TYPES)); nw.push(pickField("new_structure", "Desired structure", BIZ_TYPES), areaField("new_structureReason", "Why are you converting?", { full: true })); }
      else { cur.push(areaField("cur_other", "Describe the current position", { full: true })); nw.push(areaField("new_other", "Describe the change you need", { full: true })); }

      s.push({ id: "current", title: "Current Information", fields: [noteField(() => ({ variant: "info", title: "Current information on record", body: "Enter it exactly as filed, so we can match it with the registry." }), { full: true }), ...cur] });
      s.push({ id: "new", title: "New Information", fields: [noteField(() => ({ variant: "info", title: "New information", body: "This is what we'll apply for." }), { full: true }), ...nw] });
      s.push({ id: "reason", title: "Reason for Change", fields: [
        cardsField("change_reason", "Reason for the change", ["Business expansion", "Rebranding", "Statutory requirement", "Correction of error", "Owner / management change", "Other"], { cols: 2, full: true }),
        areaField("change_notes", "Additional notes", { full: true, required: false }),
        textField("change_effective", "Preferred effective date", { type: "date", required: false }),
      ] });
      s.push(docStep(["Board Resolution / Consent", "Existing Registration Certificate", "PAN of Company", "Proof of New Information", "ID Proof of Signatory", "Other Supporting Document"]));
      return s;
    },
  },

  "ex-gst": {
    name: "GST Service", code: "GST", price: 1999, govt: 0, kind: "Existing Company",
    steps: (A) => {
      const need = A.ex_gst_need;
      const s = [{ id: "need", title: "GST Requirement", fields: [
        cardsField("ex_gst_need", "Why do you need GST assistance?", ["GST registration for existing business", "GST registration for another company", "GST registration for new branch", "GST amendment", "GST cancellation", "Other GST service"], { cols: 2, full: true }),
      ] }];
      if (!need) return s;

      const onExistingGstin = need === "GST amendment" || need === "GST cancellation";
      const askIfRegistered = need === "GST registration for existing business" || need === "GST registration for new branch";

      s.push({ id: "company", title: "Company Details", fields: [
        textField("ex_name", need === "GST registration for another company" ? "Your existing business name" : "Business Name", { full: true }),
        pickField("ex_biztype", "Constitution of Business", BIZ_TYPES),
        pickField("ex_state", "State of registration", STATES),
        textField("ex_gstin", "GSTIN", { ph: "15 characters", full: true, showIf: () => onExistingGstin, hint: "The registration we will amend or cancel." }),
        ynField("ex_hasGstin", need === "GST registration for new branch" ? "Does the parent business already have a GSTIN?" : "Does your business already have a GSTIN?", { full: true, showIf: () => askIfRegistered, hint: "If you have never registered for GST, choose No — we will file a fresh registration." }),
        textField("ex_hasGstin_gstin", "Existing GSTIN", { ph: "15 characters", full: true, showIf: (A) => askIfRegistered && A.ex_hasGstin === "Yes", k: "ex_gstin" }),
        noteField(() => ({ variant: "info", body: "Fresh GST registration. No GSTIN required — we will file a new REG-01 application and follow up on the ARN until your GSTIN is issued." }), { full: true, showIf: (A) => askIfRegistered && A.ex_hasGstin === "No" }),
        noteField(() => ({ variant: "info", body: "You already hold a GSTIN. Depending on the state and premises this will be filed either as an additional place of business under the existing GSTIN, or as a separate state registration. Our advisor confirms which before filing — the fee is the same." }), { full: true, showIf: (A) => askIfRegistered && A.ex_hasGstin === "Yes" }),
        textField("ex_gstin_parent", "GSTIN of your existing business", { ph: "15 characters", required: false, full: true, showIf: (A) => need === "GST registration for another company", hint: "Optional — helps us link the two entities. The new company will get a fresh GSTIN.", k: "ex_gstin" }),
      ] });

      if (need === "GST amendment") {
        s.push({ id: "amend", title: "Amendment Details", fields: [
          cardsField("gst_amend_what", "What needs to be amended?", ["Business Name", "Business Address", "Business Activity", "Owner/Partner", "Bank Details", "Additional Place of Business", "Other"], { cols: 2, full: true }),
        ] });
        const w = A.gst_amend_what;
        if (w) {
          const f = [noteField(() => ({ variant: "info", title: `Amendment: ${w}`, body: "Only the fields required for this amendment are shown." }), { full: true })];
          if (w === "Business Name") { f.push(textField("cur_name", "Name as per GST record", { full: true }), textField("new_name1", "Corrected / new name", { full: true })); }
          else if (w === "Business Address" || w === "Additional Place of Business") { f.push(...addressFields("new", w === "Business Address" ? "New principal place of business" : "Additional place of business"), cardsField("new_premises", "Nature of premises", ["Owned", "Rented", "Leased", "Consent / Shared", "Other"], { cols: 2, full: true })); }
          else if (w === "Business Activity") { f.push(areaField("cur_activity", "Activity as per GST record", { full: true }), areaField("new_activityDesc", "New activity / goods & services", { full: true }), textField("new_hsn", "HSN / SAC codes", { required: false, full: true })); }
          else if (w === "Owner/Partner") { f.push(cardsField("change_action", "Action", ["Add", "Remove", "Replace"], { cols: 3, full: true }), textField("cur_person", "Existing person on record", { full: true }), textField("new_person", "Incoming person", { full: true, showIf: (A) => ["Add", "Replace"].includes(A.change_action) }), textField("new_personPan", "PAN of incoming person", { pattern: "pan", showIf: (A) => ["Add", "Replace"].includes(A.change_action) })); }
          else if (w === "Bank Details") { f.push(textField("cur_bank", "Bank account on record", { full: true }), textField("bank_name", "New Bank Name"), textField("bank_branch", "Branch"), textField("bank_account", "Account Number", { pattern: "digits" }), textField("bank_ifsc", "IFSC Code", { pattern: "ifsc" }), pickField("bank_type", "Account Type", ["Current", "Savings"])); }
          else { f.push(areaField("cur_other", "Current position", { full: true }), areaField("new_other", "Required amendment", { full: true })); }
          f.push(textField("gst_amend_date", "Date of the change", { type: "date" }));
          s.push({ id: "amenddetail", title: "Amendment Information", fields: f });
        }
        s.push(docStep(["GST Certificate", "PAN of Business", "Proof of Amended Detail", "Authorization Letter", "ID Proof of Signatory", "Other Supporting Document"]));
        return s;
      }
      if (need === "GST cancellation") {
        s.push({ id: "cancel", title: "Cancellation Details", fields: [
          cardsField("gst_cancel_reason", "Reason for cancellation", ["Business discontinued", "Transfer / merger", "Change of constitution", "Turnover below threshold", "No longer liable to register", "Other"], { cols: 2, full: true }),
          textField("gst_cancel_date", "Requested date of cancellation", { type: "date" }),
          ynField("gst_returns", "Are all GST returns filed to date?", { hint: "Pending returns must be cleared before cancellation is approved." }),
          textField("gst_stock", "Value of stock held on cancellation date (₹)", { type: "number", required: false }),
          areaField("gst_cancel_notes", "Anything else we should know?", { full: true, required: false }),
        ] });
        s.push(docStep(["GST Certificate", "Latest Filed Returns", "Stock Statement", "PAN of Business", "Authorization Letter", "Other Supporting Document"]));
        return s;
      }
      if (need === "GST registration for new branch") {
        s.push({ id: "branch", title: "Branch Details", fields: [
          textField("br_name", "Branch Name", { full: true }),
          ...addressFields("br", "Branch address"),
          areaField("br_activity", "Branch Activity", { full: true }),
          cardsField("br_premises", "Nature of premises", ["Owned", "Rented", "Leased", "Consent / Shared", "Other"], { cols: 2, full: true }),
        ] });
      }
      if (need === "GST registration for another company") {
        s.push({ id: "newco", title: "New Company Details", fields: [
          textField("gst_bizname", "New Company Legal Name", { full: true }),
          textField("gst_tradename", "Trade Name", { required: false }),
          pickField("gst_biztype", "Constitution", BIZ_TYPES),
          cardsField("ex_relation", "Relationship with your existing company", ["Same owners/directors", "Some owners common", "Different owners", "Subsidiary / related company", "Other"], { cols: 2, full: true }),
        ] });
      }
      s.push(
        { id: "activity", title: "Business Activity & Turnover", fields: [
          cardsField("gst_activity", "Primary nature of business", ACTIVITIES, { cols: 3, full: true }),
          areaField("gst_goods", "Main goods / services supplied", { full: true }),
          cardsField("gst_turnover", "Expected annual turnover", TURNOVER, { cols: 2, full: true }),
          ynField("gst_interstate", "Do you sell goods/services across states?", { full: true }),
          ynField("gst_ecom", "Do you sell through e-commerce platforms?", { full: true }),
        ] },
        need !== "GST registration for new branch" ? { id: "location", title: "Place of Business", fields: addressFields("gst", "Principal place of business") } : null,
        panStep("pan", "business"),
        bankStep("bank"),
        authStep("auth"),
        docStep(["PAN of Business", "Aadhaar of Authorized Signatory", "Photograph", "Proof of Business Address", "Bank Statement / Cancelled Cheque", "Rent Agreement / NOC", "Other Supporting Document"])
      );
      return s.filter(Boolean);
    },
  },

  "ex-trademark": {
    name: "Trademark Service", code: "TM", price: 4999, govt: 4500, kind: "Existing Company",
    steps: (A) => {
      const need = A.ex_tm_need;
      const s = [{ id: "need", title: "Trademark Requirement", fields: [
        cardsField("ex_tm_need", "What do you need trademark assistance for?", ["New Trademark", "Trademark Renewal", "Trademark Modification", "Trademark Objection", "Trademark Assignment", "Trademark Status", "Other"], { cols: 2, full: true }),
      ] }];
      if (!need) return s;

      if (need === "New Trademark") {
        s.push({ id: "company", title: "Applicant Company", fields: [
          textField("ex_name", "Existing Company Name", { full: true }),
          textField("ex_regno", "Registration Number"),
          pickField("ex_biztype", "Business Type", BIZ_TYPES),
        ] });
        return s.concat(TRADEMARK_FLOW.steps());
      }

      s.push({ id: "mark", title: "Existing Trademark", fields: [
        textField("tm_name", "Trademark / brand name", { full: true }),
        textField("tm_regno", "Trademark Application / Registration Number"),
        textField("tm_class", "Class", { required: false }),
        textField("tm_regDate", "Registration / filing date", { type: "date", required: false }),
        textField("ex_name", "Registered Proprietor (company name)", { full: true }),
      ] });

      if (need === "Trademark Renewal") {
        s.push({ id: "renew", title: "Renewal Details", fields: [
          textField("tm_expiry", "Current expiry date", { type: "date" }),
          ynField("tm_lapsed", "Has the registration already expired?"),
          noteField(() => ({ variant: "info", body: "Expired marks can be restored within 6 months of expiry with a surcharge — we'll include it in the fee summary." }), { showIf: (A) => A.tm_lapsed === "Yes", full: true }),
          ynField("tm_inUse", "Is the trademark still in use?", { full: true }),
        ] });
      } else if (need === "Trademark Modification") {
        s.push({ id: "modify", title: "Modification Details", fields: [
          cardsField("tm_modify_what", "What needs to change?", ["Proprietor name", "Proprietor address", "Goods / services description", "Class", "Mark representation", "Other"], { cols: 2, full: true }),
          areaField("cur_other", "Current details on record", { full: true }),
          areaField("new_other", "Required change", { full: true }),
        ] });
      } else if (need === "Trademark Objection") {
        s.push({ id: "objection", title: "Objection Details", fields: [
          cardsField("tm_obj_stage", "Current stage", ["Examination report received", "Show cause hearing", "Opposition filed by third party", "Opposition by us", "Other"], { cols: 2, full: true }),
          textField("tm_obj_date", "Date of objection / notice", { type: "date" }),
          textField("tm_obj_deadline", "Reply deadline", { type: "date", required: false }),
          areaField("tm_obj_grounds", "Grounds of objection (as stated)", { full: true }),
          areaField("tm_obj_response", "Your position / evidence of use", { full: true }),
        ] });
      } else if (need === "Trademark Assignment") {
        s.push({ id: "assign", title: "Assignment Details", fields: [
          cardsField("tm_assign_type", "Type of assignment", ["Complete assignment", "Partial assignment", "With goodwill", "Without goodwill", "Licence / permitted use"], { cols: 2, full: true }),
          textField("tm_assignor", "Assignor (current owner)", { full: true }),
          textField("tm_assignee", "Assignee (new owner)", { full: true }),
          textField("tm_assignee_pan", "Assignee PAN", { pattern: "pan" }),
          textField("tm_assign_date", "Date of assignment deed", { type: "date" }),
          textField("tm_assign_value", "Consideration (₹)", { type: "number", required: false }),
        ] });
      } else if (need === "Trademark Status") {
        s.push({ id: "status", title: "Status Check", fields: [
          noteField(() => ({ variant: "info", title: "Status check", body: "We'll pull the live status from the IP India registry and email you a written report within 24 hours." }), { full: true }),
          textField("tm_contactEmail", "Email for the report", { pattern: "email", type: "email" }),
          textField("tm_contactMobile", "Mobile", { pattern: "mobile", type: "tel" }),
          areaField("tm_statusNotes", "Anything specific you want checked?", { full: true, required: false }),
        ] });
      } else {
        s.push({ id: "other", title: "Requirement", fields: [areaField("new_other", "Describe what you need", { full: true })] });
      }
      s.push(docStep(["Trademark Registration Certificate", "PAN of Proprietor", "Form TM-48 / Power of Attorney", "Examination Report / Notice", "Proof of Use", "Assignment Deed", "Other Supporting Document"]));
      return s;
    },
  },

  "ex-msme": {
    name: "MSME / Udyam Service", code: "MSME", price: 1499, govt: 0, kind: "Existing Company",
    steps: (A) => {
      const need = A.ex_msme_need;
      const s = [{ id: "need", title: "MSME Requirement", fields: [
        cardsField("ex_msme_need", "What do you need?", ["New Udyam Registration", "Update Udyam Details", "Correct Information", "Download Certificate", "Other"], { cols: 2, full: true }),
      ] }];
      if (!need) return s;
      if (need === "New Udyam Registration") return s.concat(MSME_FLOW.steps());

      s.push({ id: "udyam", title: "Existing Udyam", fields: [
        textField("msme_udyam", "Udyam Registration Number", { full: true, ph: "UDYAM-XX-00-0000000" }),
        textField("msme_name", "Enterprise Name", { full: true }),
        textField("msme_aadhaar", "Aadhaar of Signatory", { pattern: "aadhaar" }),
        textField("msme_mobile", "Registered Mobile", { pattern: "mobile", type: "tel" }),
        textField("msme_email", "Registered Email", { pattern: "email", type: "email", full: true }),
      ] });
      if (need === "Update Udyam Details" || need === "Correct Information") {
        s.push({ id: "update", title: need === "Correct Information" ? "Correction Details" : "Update Details", fields: [
          checksField("msme_update_what", "What needs to be updated?", ["Enterprise name", "Address", "Business activity", "Investment", "Turnover", "Employee count", "Bank details", "Mobile / Email", "Other"]),
          areaField("cur_other", "Current details on record", { full: true }),
          areaField("new_other", "Corrected / updated details", { full: true }),
          textField("msme_update_date", "Effective date of change", { type: "date", required: false }),
        ] });
      } else if (need === "Download Certificate") {
        s.push({ id: "cert", title: "Certificate Request", fields: [
          noteField(() => ({ variant: "info", title: "Certificate retrieval", body: "We'll verify via Aadhaar OTP and email your Udyam certificate as a signed PDF." }), { full: true }),
          ynField("msme_otp", "Is the registered mobile accessible for OTP?", { full: true }),
          noteField(() => ({ variant: "info", body: "Without OTP access we'll first file a mobile-number update — this adds 2–3 working days." }), { showIf: (A) => A.msme_otp === "No", full: true }),
        ] });
      } else {
        s.push({ id: "other", title: "Requirement", fields: [areaField("new_other", "Describe what you need", { full: true })] });
      }
      s.push(docStep(["Udyam Certificate", "PAN of Enterprise", "Aadhaar of Signatory", "Proof of Updated Detail", "Bank Details", "Other Supporting Document"]));
      return s;
    },
  },

  "ex-iec": {
    name: "IEC Service", code: "IEC", price: 1999, govt: 500, kind: "Existing Company",
    steps: (A) => {
      const need = A.ex_iec_need;
      const s = [{ id: "need", title: "IEC Requirement", fields: [
        cardsField("ex_iec_need", "What do you need?", ["New IEC", "Update IEC", "Modify IEC Details", "Surrender IEC", "Other"], { cols: 2, full: true }),
      ] }];
      if (!need) return s;
      if (need === "New IEC") return s.concat(IEC_FLOW.steps({ ...A, iec_has: "No" }).slice(1));

      s.push({ id: "iecdetails", title: "Existing IEC", fields: [
        textField("iec_number", "IEC Number", { full: true }),
        textField("iec_bizname", "Business Name", { full: true }),
        textField("pan_number", "PAN of Firm", { pattern: "pan" }),
        pickField("iec_biztype", "Firm Type", BIZ_TYPES),
      ] });
      if (need === "Update IEC") {
        s.push({ id: "annual", title: "Annual Update", fields: [
          noteField(() => ({ variant: "info", title: "DGFT annual update", body: "Every IEC must be confirmed on the DGFT portal between April and June each year, even if nothing has changed." }), { full: true }),
          ynField("iec_changed", "Have any details changed since last year?"),
          areaField("new_other", "What has changed?", { full: true, showIf: (A) => A.iec_changed === "Yes" }),
        ] });
      } else if (need === "Modify IEC Details") {
        s.push({ id: "modify", title: "Modification Details", fields: [
          checksField("iec_modify_what", "What needs to be modified?", ["Business name", "Address", "Directors / partners", "Bank details", "Nature of business", "Branch details", "Other"]),
          areaField("cur_other", "Current details on record", { full: true }),
          areaField("new_other", "Modified details", { full: true }),
        ] });
        s.push(bankStep("bank"));
      } else if (need === "Surrender IEC") {
        s.push({ id: "surrender", title: "Surrender Details", fields: [
          cardsField("iec_surrender_reason", "Reason for surrender", ["Business closed", "No import/export activity", "Merged with another entity", "Duplicate IEC", "Other"], { cols: 2, full: true }),
          textField("iec_surrender_date", "Requested surrender date", { type: "date" }),
          ynField("iec_pending", "Any pending shipments or licences?"),
          areaField("iec_surrenderReason", "Additional notes", { full: true, required: false }),
        ] });
      } else {
        s.push({ id: "other", title: "Requirement", fields: [areaField("new_other", "Describe what you need", { full: true })] });
      }
      s.push(authStep("auth"));
      s.push(docStep(["IEC Certificate", "PAN of Firm", "Aadhaar of Signatory", "Bank Certificate / Cancelled Cheque", "Board Resolution / Authorization", "Digital Signature", "Other Supporting Document"]));
      return s;
    },
  },

  "ex-closure": {
    name: "Business Closure", code: "CLS", price: 8999, govt: 2500, kind: "Existing Company",
    steps: (A) => {
      const what = A.close_what;
      const s = [{ id: "what", title: "What to Close", fields: [
        cardsField("close_what", "What do you want to close/cancel?", ["Business", "GST", "MSME", "IEC", "Other"], { cols: 3, full: true }),
      ] }];
      if (!what) return s;
      const reg = [
        textField("ex_name", "Registered Business Name", { full: true }),
        pickField("ex_biztype", "Business Type", BIZ_TYPES),
        textField("close_startDate", "Date of incorporation / registration", { type: "date" }),
      ];
      if (what === "Business") reg.push(textField("ex_regno", "CIN / LLPIN / Registration Number"));
      if (what === "GST") reg.push(textField("ex_gstin", "GSTIN", { ph: "15 characters" }));
      if (what === "MSME") reg.push(textField("msme_udyam", "Udyam Registration Number"));
      if (what === "IEC") reg.push(textField("iec_number", "IEC Number"));
      if (what === "Other") reg.push(textField("close_otherReg", "Registration number / details"));
      reg.push(...addressFields("close", "Registered address"));
      s.push({ id: "reg", title: "Registration Details", fields: reg });
      s.push({ id: "reason", title: "Reason for Closure", fields: [
        cardsField("close_reason", "Why are you closing?", ["Business discontinued", "Losses / not viable", "Merger or amalgamation", "Owner relocation / retirement", "Dormant since incorporation", "Other"], { cols: 2, full: true }),
        textField("close_date", "Date operations ceased / will cease", { type: "date" }),
        areaField("close_notes", "Additional context", { full: true, required: false }),
      ] });
      s.push({ id: "compliance", title: "Outstanding Compliance", fields: [
        ynField("close_returns", "Are all returns filed up to date?"),
        areaField("close_pendingReturns", "Which filings are pending?", { full: true, showIf: (A) => A.close_returns === "No" }),
        ynField("close_dues", "Any outstanding tax dues or penalties?"),
        textField("close_duesAmt", "Approximate amount outstanding (₹)", { type: "number", showIf: (A) => A.close_dues === "Yes" }),
        ynField("close_liabilities", "Any outstanding loans, creditors or employee dues?", { full: true }),
        ynField("close_assets", "Are there assets left to be disposed of?", { full: true }),
        noteField(() => ({ variant: "warn", body: "Pending filings must be cleared before closure is accepted. We'll quote for them separately after review — nothing extra is charged today." }), { showIf: (A) => A.close_returns === "No" || A.close_dues === "Yes", full: true }),
      ] });
      s.push(docStep(["Registration / Incorporation Certificate", "PAN of Business", "Latest Filed Returns", "Board Resolution / Consent of Partners", "Statement of Accounts", "Indemnity Bond / Affidavit", "ID Proof of Signatory", "Other Supporting Document"]));
      return s;
    },
  },
};

/* ---------------------------------------------------------------------------
   EXISTING_MENU — ported verbatim (labels, grouping, flow ids, preset answers)
--------------------------------------------------------------------------- */
export const EXISTING_MENU = [
  { group: "New Registration", icon: "plus", items: [
    { label: "Register another company/business", flow: "ex-business", set: { ex_purpose: "Register another/new company" } },
    { label: "Register a new branch", flow: "ex-branch" },
    { label: "GST Registration", flow: "ex-gst", set: { ex_gst_need: "GST registration for existing business" } },
    { label: "Trademark Registration", flow: "ex-trademark", set: { ex_tm_need: "New Trademark" } },
    { label: "MSME Registration", flow: "ex-msme", set: { ex_msme_need: "New Udyam Registration" } },
    { label: "IEC Registration", flow: "ex-iec", set: { ex_iec_need: "New IEC" } },
  ] },
  { group: "Existing Company Changes", icon: "edit", items: [
    { label: "Change Business Name", flow: "ex-change", set: { change_what: "Business Name" } },
    { label: "Change Business Address", flow: "ex-change", set: { change_what: "Business Address" } },
    { label: "Change Business Activity", flow: "ex-change", set: { change_what: "Business Activity" } },
    { label: "Change Owner / Director", flow: "ex-change", set: { change_what: "Owner / Director" } },
    { label: "Add / Remove Partner", flow: "ex-change", set: { change_what: "Partner" } },
    { label: "Change Contact Details", flow: "ex-change", set: { change_what: "Contact Details" } },
    { label: "Change Bank Details", flow: "ex-change", set: { change_what: "Bank Details" } },
    { label: "Change Company Structure", flow: "ex-change", set: { change_what: "Company Structure" } },
    { label: "Other change", flow: "ex-change", set: { change_what: "Other" } },
  ] },
  { group: "Compliance / Other", icon: "shield", items: [
    { label: "GST Related Service", flow: "ex-gst" },
    { label: "Trademark Related Service", flow: "ex-trademark" },
    { label: "MSME Related Service", flow: "ex-msme" },
    { label: "IEC Related Service", flow: "ex-iec" },
    { label: "Business Closure", flow: "ex-closure" },
    { label: "Other service", flow: "other-generic", set: { other_service: "Other Service" } },
  ] },
];

/* ---------------------------------------------------------------------------
   Validation — ported from RULES / fieldError / validateStep
--------------------------------------------------------------------------- */
export const RULES = {
  pan: { re: /^[A-Z]{5}[0-9]{4}[A-Z]$/i, msg: "Enter a valid PAN (e.g. ABCDE1234F)" },
  aadhaar: { re: /^[0-9]{12}$/, msg: "Aadhaar must be 12 digits" },
  mobile: { re: /^[6-9][0-9]{9}$/, msg: "Enter a valid 10-digit mobile number" },
  email: { re: /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i, msg: "Enter a valid email address" },
  pin: { re: /^[1-9][0-9]{5}$/, msg: "Pincode must be 6 digits" },
  ifsc: { re: /^[A-Z]{4}0[A-Z0-9]{6}$/i, msg: "Enter a valid IFSC (e.g. HDFC0001234)" },
  digits: { re: /^[0-9]+$/, msg: "Numbers only" },
};
export function fieldError(f, value) {
  const v = Array.isArray(value) ? value : String(value == null ? "" : value).trim();
  const empty = Array.isArray(v) ? v.length === 0 : v === "";
  if (f.required !== false && empty) return "This field is required";
  if (empty) return "";
  if (f.pattern && RULES[f.pattern] && !RULES[f.pattern].re.test(v)) return RULES[f.pattern].msg;
  return "";
}
export function visibleFields(step, A) {
  if (!step || !step.fields) return [];
  return step.fields.filter((f) => !f.showIf || f.showIf(A));
}
export function docItems(step, A) {
  return step.dynamicItems ? step.dynamicItems(A) : step.items || [];
}

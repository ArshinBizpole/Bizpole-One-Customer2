import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { JOURNL_URL, openExternal } from "../utils/externalLinks";

// "Our products you can get" (Figma landing page): three product cards, each
// with a coded illustration panel. The design's placeholder products
// (Collaboration Teams / Cloud Storage "2 TB" / Daily Analytics) are replaced
// by Bizpole's real platforms.
const PAGE_BG = "#f7f5f0";

// Compass — shapes collage (the design's "collaboration" art).
const CompassArt = () => (
  <div className="relative h-full w-full">
    <span className="absolute left-[12%] top-[14%] h-10 w-8 bg-[#1a1a1a]" />
    <span className="absolute left-[34%] top-[16%] h-7 w-7 rounded-full bg-[#1a1a1a]" />
    <span className="absolute left-[50%] top-[12%] h-0 w-0 border-l-[16px] border-l-transparent border-b-[16px] border-b-[#1a1a1a] rotate-45" />
    <span className="absolute left-[12%] top-[46%] h-10 w-8 bg-[#F5C518]" />
    <span className="absolute left-[30%] top-[40%] h-3 w-[50%] rounded bg-[#C7D2FE]" />
    <span className="absolute left-[30%] top-[52%] h-3 w-[38%] rounded bg-[#C7D2FE]" />
    <span className="absolute left-[12%] bottom-[12%] h-12 w-12 rounded-full bg-[#DCE4FF]" />
    <span className="absolute left-[38%] bottom-[12%] h-12 w-12 rounded-full bg-[#F5C518]" />
    <span className="absolute left-[64%] bottom-[12%] h-12 w-12 rounded-full bg-[#1a1a1a] flex items-center justify-center gap-1">
      {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-white" />)}
    </span>
  </div>
);

// Journl — the design's dark/yellow "document file" card.
const JournlArt = () => (
  <div className="relative h-full w-full flex items-center justify-center">
    <div className="relative w-[78%] rounded-xl overflow-hidden shadow-xl">
      <div className="bg-[#1a1a1a] px-4 pt-4 pb-6">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#F5C518] text-[#1a1a1a] text-xs font-bold">₹</span>
      </div>
      <div className="bg-[#F5C518] px-4 py-3 -mt-2 [clip-path:polygon(0_18%,100%_0,100%_100%,0_100%)] pt-5">
        <div className="text-sm font-bold text-[#1a1a1a]">Invoices & GST</div>
        <div className="text-[10px] text-[#1a1a1a]/70">Books · Returns · Reports</div>
      </div>
    </div>
    <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 flex items-end gap-2">
      {[18, 30, 22, 38, 26, 34].map((h, i) => (
        <span key={i} className="w-1.5 rounded-full bg-[#1a1a1a]" style={{ height: h }} />
      ))}
    </div>
  </div>
);

// Trademark Search — gauge + result rows (the design's "analytics" art).
const TrademarkArt = () => (
  <div className="relative h-full w-full flex flex-col items-center justify-center gap-3">
    <svg viewBox="0 0 120 70" className="w-32">
      <path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke="#E5E7EB" strokeWidth="12" strokeLinecap="round" />
      <path d="M10 62 A50 50 0 0 1 86 18" fill="none" stroke="#F5C518" strokeWidth="12" strokeLinecap="round" />
      <text x="60" y="58" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1a1a1a">Search</text>
    </svg>
    <div className="w-[75%] space-y-2">
      {[["w-[70%]", "bg-[#F5C518]"], ["w-[55%]", "bg-[#C7D2FE]"], ["w-[40%]", "bg-[#C7D2FE]"]].map(([w, c], i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 shadow-sm">
          <span className="h-4 w-4 rounded bg-[#1a1a1a]" />
          <span className={`h-2 rounded ${w} ${c}`} />
        </div>
      ))}
    </div>
  </div>
);

const PRODUCTS = [
  {
    name: "Compass",
    tag: "Bizpole One",
    desc: "Registrations, compliance and every service tracked together with your Bizpole team.",
    Art: CompassArt,
    go: (navigate) => navigate("/bizpoleone"),
  },
  {
    name: "Journl",
    tag: "Accounting",
    desc: "Accounting and bookkeeping with GST-ready books, built for small businesses.",
    Art: JournlArt,
    go: () => openExternal(JOURNL_URL),
  },
  {
    name: "Trademark Search",
    tag: "Free tool",
    desc: "Search the trademark registry for free and download a detailed report.",
    Art: TrademarkArt,
    go: (navigate) => navigate("/trademark-search"),
  },
];

const ProductsSection = () => {
  const navigate = useNavigate();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-16 md:py-24" style={{ background: PAGE_BG }}>
      <div className="max-w-[1600px] mx-auto px-6 md:px-12">
        {/* Header: title | blurb | CTA */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr_auto] gap-6 md:gap-10 items-center mb-10 md:mb-14">
          <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a1a] leading-tight">
            Our products
            <span className="block">you can get</span>
          </h2>
          <p className="text-[#1a1a1a]/50 text-sm md:text-base leading-relaxed max-w-lg">
            Three platforms that work together — so you can start, run and grow your business from one place.
          </p>
          <button
            onClick={() => navigate("/startbusiness")}
            className="justify-self-start md:justify-self-end px-6 py-3 rounded-full bg-[#1a1a1a] text-white text-sm font-semibold hover:bg-black transition"
          >
            Get Started
          </button>
        </div>

        {/* Product cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {PRODUCTS.map(({ name, tag, desc, Art, go }, i) => (
            <motion.button
              key={name}
              type="button"
              onClick={() => go(navigate)}
              initial={{ y: 30, opacity: 0 }}
              animate={inView ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 0.7, delay: 0.1 * i, ease: [0.16, 1, 0.3, 1] }}
              className="group text-left"
            >
              <div className="h-60 md:h-64 rounded-2xl bg-[#EEF1FB] overflow-hidden transition group-hover:shadow-xl">
                <Art />
              </div>
              <div className="mt-5 flex items-center gap-2">
                <h3 className="text-lg md:text-xl font-semibold text-[#1a1a1a]">{name}</h3>
                <span className="rounded-full bg-[#FFF3C4] px-2 py-0.5 text-[11px] font-semibold text-[#8a6d00]">{tag}</span>
                <ArrowUpRight className="w-4 h-4 text-gray-400 transition group-hover:text-[#1a1a1a] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="mt-2 text-sm md:text-base text-[#1a1a1a]/50 max-w-sm">{desc}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;

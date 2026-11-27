import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import { getProducts } from "../api/Products";

// Navbar "Product" menu. Same data as the old /products page (admin-managed
// via /getproducts), shown as a dropdown instead of a separate page.

const toBase64 = (bytes) => {
  let s = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.byteLength; i++) s += String.fromCharCode(arr[i]);
  return window.btoa(s);
};

const normalise = (p) => {
  const name = p.name || p.ProductName || "";
  return {
    id: p.id || p.ProductID || name,
    name,
    desc: p.description || p.Description || "",
    // Same Journl override the products page used.
    link: /journl/i.test(name) ? "https://www.getjournl.com/" : p.url || p.link || p.product_url || p.ProductUrl || "",
    icon: Array.isArray(p.icon_url?.data) ? `data:image/png;base64,${toBase64(p.icon_url.data)}` : p.image || "",
  };
};

// Loaded once per page session and shared by the desktop + mobile menus.
let cache = null;
const useProducts = (enabled) => {
  const [state, setState] = useState(cache ? { items: cache, loading: false } : { items: [], loading: true });
  useEffect(() => {
    if (!enabled || cache) return;
    let alive = true;
    getProducts()
      .then((data) => {
        cache = (data?.products || data || []).map(normalise).filter((p) => p.name);
        if (alive) setState({ items: cache, loading: false });
      })
      .catch(() => alive && setState({ items: [], loading: false }));
    return () => { alive = false; };
  }, [enabled]);
  return state;
};

const ProductRow = ({ p, compact = false }) => {
  const Tag = p.link ? "a" : "div";
  const linkProps = p.link ? { href: p.link, target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <Tag
      {...linkProps}
      className={`group flex items-start gap-3 rounded-xl ${compact ? "p-2" : "p-3"} hover:bg-[#f7f5f0] transition-colors`}
    >
      <span className="w-10 h-10 flex-none rounded-lg bg-[#FFF3C4] flex items-center justify-center overflow-hidden">
        {p.icon ? (
          <img src={p.icon} alt="" className="w-7 h-7 object-contain" />
        ) : (
          <span className="text-sm font-bold text-[#1a1a1a]">{p.name[0]}</span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-[15px] font-semibold text-[#1a1a1a]">
          {p.name}
          {p.link && (
            <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 transition group-hover:text-[#1a1a1a] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          )}
        </span>
        {p.desc && <span className="block text-[13px] leading-snug text-gray-500 line-clamp-2">{p.desc}</span>}
      </span>
    </Tag>
  );
};

const MenuBody = ({ loading, items, compact }) => {
  if (loading) {
    return (
      <div className="space-y-2 p-1" aria-busy="true">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-3 p-2">
            <span className="w-10 h-10 rounded-lg bg-gray-100 animate-pulse" />
            <span className="flex-1 space-y-2 pt-1">
              <span className="block h-3 w-1/3 rounded bg-gray-100 animate-pulse" />
              <span className="block h-3 w-4/5 rounded bg-gray-100 animate-pulse" />
            </span>
          </div>
        ))}
      </div>
    );
  }
  if (!items.length) return <p className="px-3 py-4 text-sm text-gray-500">Products will be listed here soon.</p>;
  return items.map((p) => <ProductRow key={p.id} p={p} compact={compact} />);
};

// Desktop: opens on hover or click, closes on outside click / Escape.
export const ProductsDropdown = ({ label = "Product" }) => {
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const { items, loading } = useProducts(touched);
  const ref = useRef(null);
  const closeTimer = useRef();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const show = () => { clearTimeout(closeTimer.current); setTouched(true); setOpen(true); };
  const hide = () => { closeTimer.current = setTimeout(() => setOpen(false), 120); };

  return (
    <div ref={ref} className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : show())}
        onFocus={() => setTouched(true)}
        className={`inline-flex items-center gap-1 transition-colors ${open ? "text-black" : "text-gray-800 hover:text-black"}`}
      >
        {label}
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute left-1/2 -translate-x-1/2 top-full pt-4 z-50"
          >
            <div className="w-[360px] rounded-2xl bg-white border border-gray-200/80 shadow-xl p-2 text-left">
              <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Our products</p>
              <MenuBody loading={loading} items={items} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Mobile: an expandable section inside the hamburger menu.
export const ProductsMobileList = ({ label = "Product" }) => {
  const [open, setOpen] = useState(false);
  const { items, loading } = useProducts(open);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left text-base sm:text-lg font-medium hover:text-black transition"
      >
        {label}
        <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              <MenuBody loading={loading} items={items} compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

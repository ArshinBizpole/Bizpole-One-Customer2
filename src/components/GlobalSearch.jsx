import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  LayoutGrid,
  Rocket,
  Briefcase,
  ShoppingBag,
  Receipt,
  FileText,
  LifeBuoy,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { searchMyData, searchServiceCatalog } from "../api/CustomerSearchApi";
import { getCompanyIdFromStorage } from "../api/SupportTickets/SupportTicket";
import { getOrderStatusLabel } from "../utils/orderStatus";

/* ── Site pages + "apply" flows, searched locally by title and keywords ── */
const PAGES = [
  { title: "Dashboard", to: "/dashboard/bizpoleone", keywords: "home overview compliance score deadlines quotes" },
  { title: "Package Service", to: "/dashboard/bizpoleone/package", keywords: "orders packages plan" },
  { title: "Individual services", to: "/dashboard/bizpoleone/individual", keywords: "orders services paid amount pay balance" },
  { title: "My task", to: "/dashboard/bizpoleone/tasks", keywords: "tasks action required upload forms pending" },
  { title: "Pricing & Plans", to: "/dashboard/bizpoleone/pricing", keywords: "price pricing plans packages buy" },
  { title: "Billing and Invoice", to: "/dashboard/bizpoleone/billing", keywords: "invoice bill billing payment receipt download gst invoice" },
  { title: "Refunds", to: "/dashboard/bizpoleone/refunds", keywords: "refund money back cancel" },
  { title: "Customer supports", to: "/dashboard/bizpoleone/support", keywords: "support help ticket complaint issue call back" },
  { title: "My Files", to: "/profile/files", keywords: "files documents pan aadhaar photo certificate download deliverables" },
  { title: "Calendar", to: "/profile/calendar", keywords: "calendar call back events schedule" },
  { title: "Company details", to: "/profile/companydetails", keywords: "company details gstin pan address directors" },
  { title: "All services", to: "/services", keywords: "services catalog explore browse" },
];

const APPLY_FLOWS = [
  { title: "Apply for GST Registration", flowId: "gst", keywords: "gst gstin goods services tax registration" },
  { title: "Apply for Business Registration", flowId: "newco", keywords: "company incorporation private limited pvt ltd llp opc partnership proprietorship new business registration" },
  { title: "Apply for Trademark Registration", flowId: "trademark", keywords: "trademark brand logo tm registration" },
  { title: "Apply for MSME / Udyam Registration", flowId: "msme", keywords: "msme udyam udyog small business registration" },
  { title: "Apply for Import Export Code (IEC)", flowId: "iec", keywords: "iec import export code dgft registration" },
  { title: "Apply for FSSAI Food Licence", flowId: "fssai", keywords: "fssai food licence license registration" },
];

const matchesLocal = (item, q) =>
  `${item.title} ${item.keywords}`.toLowerCase().includes(q.toLowerCase());

const fmtDate = (v) => {
  const d = new Date(v);
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";
};

/* Wraps the matched part of `text` in a highlight. */
const Highlight = ({ text, q }) => {
  const s = String(text ?? "");
  const i = q ? s.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{s}</>;
  return (
    <>
      {s.slice(0, i)}
      <mark className="bg-yellow-200 text-inherit rounded-sm px-0.5">{s.slice(i, i + q.length)}</mark>
      {s.slice(i + q.length)}
    </>
  );
};

const GROUP_META = {
  pages: { label: "Pages", icon: LayoutGrid },
  apply: { label: "Apply now", icon: Rocket },
  services: { label: "Services", icon: Briefcase },
  orders: { label: "My orders", icon: ShoppingBag },
  invoices: { label: "My invoices", icon: Receipt },
  quotes: { label: "My quotes", icon: FileText },
  tickets: { label: "My support tickets", icon: LifeBuoy },
  documents: { label: "My documents", icon: FolderOpen },
};

/**
 * Site-wide search for the customer portal.
 * variant="header"    — pill input in the top header (DashboardLayout)
 * variant="dashboard" — bordered input next to Export (HeaderStats)
 */
const GlobalSearch = ({ variant = "header", placeholder = "Search" }) => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remote, setRemote] = useState({ services: [], mine: null });
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  const term = q.trim();
  const ready = term.length >= 2;

  // Debounced server search; an older request is cancelled when typing continues.
  useEffect(() => {
    if (!ready) {
      setRemote({ services: [], mine: null });
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      const companyId = (() => {
        try {
          return getCompanyIdFromStorage() || null;
        } catch {
          return null;
        }
      })();
      const [services, mine] = await Promise.all([
        searchServiceCatalog(term, ctrl.signal).catch(() => []),
        searchMyData(term, companyId, ctrl.signal).catch(() => null),
      ]);
      if (!ctrl.signal.aborted) {
        setRemote({ services, mine });
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term, ready]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Groups → one flat list (for ↑ ↓ / Enter) and grouped for rendering.
  const groups = useMemo(() => {
    if (!ready) return [];
    const mine = remote.mine || {};
    const out = [
      {
        key: "pages",
        items: PAGES.filter((p) => matchesLocal(p, term)).slice(0, 5).map((p) => ({
          title: p.title,
          go: () => navigate(p.to),
        })),
      },
      {
        key: "apply",
        items: APPLY_FLOWS.filter((f) => matchesLocal(f, term)).map((f) => ({
          title: f.title,
          go: () => navigate("/startbusiness/apply", { state: { flowId: f.flowId } }),
        })),
      },
      {
        key: "services",
        items: remote.services.map((s) => ({
          title: s.Name,
          sub: s.ServiceCode || "",
          // Inside the dashboard (sidebar kept), not the public /services/:id page.
          go: () => navigate("/dashboard/bizpoleone/pricing", { state: { serviceId: s.ServiceID } }),
        })),
      },
      {
        key: "orders",
        items: (mine.orders || []).map((o) => ({
          title: o.code || `Order #${o.id}`,
          sub: [o.services, getOrderStatusLabel(o.status), fmtDate(o.date)].filter(Boolean).join(" · "),
          go: () => navigate(o.isIndividual ? "/dashboard/bizpoleone/individual" : "/dashboard/bizpoleone/package"),
        })),
      },
      {
        key: "invoices",
        items: (mine.invoices || []).map((i) => ({
          title: i.code || `Invoice #${i.id}`,
          sub: [i.service, i.orderCode, fmtDate(i.date)].filter(Boolean).join(" · "),
          go: () => navigate("/dashboard/bizpoleone/billing"),
        })),
      },
      {
        key: "quotes",
        items: (mine.quotes || []).map((x) => ({
          title: x.services || `Quote #${x.id}`,
          sub: fmtDate(x.date),
          go: () => navigate("/dashboard/bizpoleone"),
        })),
      },
      {
        key: "tickets",
        items: (mine.tickets || []).map((t) => ({
          title: t.subject || t.code || `Ticket #${t.id}`,
          sub: [t.code, t.status].filter(Boolean).join(" · "),
          go: () => navigate("/dashboard/bizpoleone/support"),
        })),
      },
      {
        key: "documents",
        items: (mine.documents || []).map((d) => ({
          title: d.name,
          sub: [d.kind, fmtDate(d.date)].filter(Boolean).join(" · "),
          go: () => navigate("/profile/files"),
        })),
      },
    ].filter((g) => g.items.length);
    let i = 0;
    out.forEach((g) => g.items.forEach((it) => (it.index = i++)));
    return out;
  }, [ready, term, remote, navigate]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => setActive(0), [term]);

  const choose = (item) => {
    if (!item) return;
    setOpen(false);
    setQ("");
    inputRef.current?.blur();
    item.go();
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(flat.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(flat[active]);
    }
  };

  const wrapCls =
    variant === "dashboard"
      ? "flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm"
      : "flex items-center bg-[#FFC42A40] rounded-full px-3 py-1.5";
  const inputCls =
    variant === "dashboard"
      ? "w-40 bg-transparent text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none sm:w-56"
      : "bg-transparent outline-none text-sm placeholder-gray-500 w-32 focus:w-44 transition-all";

  return (
    <div className="relative" ref={boxRef}>
      <div className={wrapCls}>
        <Search className={variant === "dashboard" ? "h-4 w-4 text-yellow-500" : "h-5 w-5 text-gray-500 mr-2"} />
        <input
          ref={inputRef}
          type="text"
          value={q}
          placeholder={placeholder}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={inputCls}
          aria-label="Search"
          role="combobox"
          aria-expanded={open && ready}
          aria-controls="global-search-results"
          autoComplete="off"
        />
        {loading && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
      </div>

      {open && ready && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute right-0 mt-2 w-[min(92vw,420px)] max-h-[70vh] overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-100 z-50"
        >
          {groups.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">
              {loading ? "Searching…" : <>No results for “{term}”</>}
            </p>
          ) : (
            groups.map((g) => {
              const meta = GROUP_META[g.key];
              const Icon = meta.icon;
              return (
                <div key={g.key} className="py-1 border-b border-gray-50 last:border-b-0">
                  <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {meta.label}
                  </p>
                  {g.items.map((it) => (
                    <button
                      type="button"
                      key={`${g.key}-${it.index}`}
                      role="option"
                      aria-selected={active === it.index}
                      onMouseEnter={() => setActive(it.index)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(it)}
                      className={`w-full text-left flex items-start gap-3 px-4 py-2 transition ${
                        active === it.index ? "bg-amber-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <Icon size={15} className="mt-0.5 flex-none text-amber-500" />
                      <span className="min-w-0">
                        <span className="block text-sm text-gray-800 truncate">
                          <Highlight text={it.title} q={term} />
                        </span>
                        {it.sub && (
                          <span className="block text-xs text-gray-500 truncate">
                            <Highlight text={it.sub} q={term} />
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;

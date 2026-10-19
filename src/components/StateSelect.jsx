import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";

const PANEL_MAX_H = 320; // search box + list

// Custom state picker for the "Select your state" modals. The browser's native
// <select> list can't be styled, so it clashed with the UI; this renders the
// open list as our own rounded panel (search, yellow hover, check on selected).
//   states: [{ id|StateID, state_name }]   value / onChange: the state id (string)
const StateSelect = ({ states = [], value, onChange, loading = false, placeholder = "Choose your state" }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);

  // The modals that host this clip their content (overflow-hidden), so the open
  // panel is portalled to <body> and fixed under the field — or above it when
  // there isn't room below.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const r = buttonRef.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom;
      setPos(below >= PANEL_MAX_H + 16 || below >= r.top
        ? { left: r.left, width: r.width, top: r.bottom + 8 }
        : { left: r.left, width: r.width, bottom: window.innerHeight - r.top + 8 });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const idOf = (s) => String(s.id ?? s.StateID);
  const selected = states.find((s) => idOf(s) === String(value));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? states.filter((s) => s.state_name?.toLowerCase().includes(q)) : states;
  }, [states, query]);

  // Close on outside click
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Open with a clear search, starting on the selected state
  const openList = () => {
    setQuery("");
    const idx = states.findIndex((s) => idOf(s) === String(value));
    setActive(idx >= 0 ? idx : 0);
    setOpen(true);
  };

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  // Keep the highlighted row in view
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (s) => {
    onChange(idOf(s));
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (["ArrowDown", "Enter", " "].includes(e.key)) { e.preventDefault(); openList(); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[active]) choose(filtered[active]); }
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        disabled={loading}
        onClick={() => (open ? setOpen(false) : openList())}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full text-left pl-4 pr-14 py-3.5 rounded-2xl border bg-white text-sm outline-none transition-colors disabled:opacity-60 ${open ? "border-[#f7d761] ring-1 ring-[#f7d761]" : "border-gray-200 hover:border-gray-300"} ${selected ? "text-gray-900 font-medium" : "text-gray-500"}`}
      >
        {loading ? "Loading states..." : selected?.state_name || placeholder}
      </button>
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-[#F3C625] flex items-center justify-center pointer-events-none">
        <ChevronDown className={`w-4 h-4 text-gray-900 transition-transform ${open ? "rotate-180" : ""}`} />
      </span>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", zIndex: 1000, ...pos }}
          className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden"
        >
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                placeholder="Search state"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-[#f7d761] outline-none"
              />
            </div>
          </div>
          <ul ref={listRef} role="listbox" className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400">No matching state</li>
            ) : (
              filtered.map((s, i) => {
                const isSelected = idOf(s) === String(value);
                return (
                  <li
                    key={idOf(s)}
                    data-index={i}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(s)}
                    className={`mx-1 px-3 py-2.5 rounded-xl text-sm cursor-pointer flex items-center justify-between ${i === active ? "bg-[#FFF7E0]" : ""} ${isSelected ? "font-semibold text-gray-900" : "text-gray-700"}`}
                  >
                    {s.state_name}
                    {isSelected && <Check className="w-4 h-4 text-[#E6A82B]" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
};

export default StateSelect;

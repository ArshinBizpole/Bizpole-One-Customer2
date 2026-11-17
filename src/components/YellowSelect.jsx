import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

// Drop-in for a native <select> whose open list would show the browser's blue
// highlight: white rounded panel with the site's soft-yellow highlight (same
// look as Trademark's ClassSelect). options: [{ value, label }].
export default function YellowSelect({ value, onChange, options, placeholder = "— Select —", disabled = false, className = "" }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  const selectedIndex = options.findIndex((o) => String(o.value) === String(value ?? ""));
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  useEffect(() => {
    if (!open) return undefined;
    setActive(Math.max(0, selectedIndex));
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, selectedIndex]);

  // Keep the highlighted option in view while arrowing through the list.
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const choose = (i) => {
    onChange(options[i].value);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (options[active]) choose(active);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg pl-3 pr-2.5 py-2 text-sm bg-white text-left transition disabled:opacity-60 disabled:cursor-not-allowed ${
          open ? "border-yellow-400 ring-2 ring-yellow-400" : "border-gray-200 hover:border-yellow-300"
        }`}
      >
        <span className={`truncate ${selected ? "text-gray-800" : "text-gray-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute left-0 top-full mt-1.5 z-50 w-full max-h-64 overflow-y-auto rounded-xl bg-white p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-gray-100"
        >
          {options.map((o, i) => {
            const isSelected = i === selectedIndex;
            return (
              <li
                key={`${o.value}-${i}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer ${
                  isSelected
                    ? "bg-[#FFF4D6] text-black font-medium"
                    : i === active
                      ? "bg-[#FFF9EA] text-black"
                      : "text-gray-700"
                }`}
              >
                <span className="flex-1">{o.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-yellow-500" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

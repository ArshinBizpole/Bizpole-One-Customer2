import { useEffect, useRef, useState } from "react";
import { FaChevronDown, FaCheck } from "react-icons/fa";

// Trademark class picker styled like the site's other dropdowns: white rounded
// panel, soft-yellow highlight on the active option. value "" = all classes.
export default function ClassSelect({ value, onChange, options, className = "" }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  const items = [{ value: "", label: "All classes" }, ...options];
  const selectedIndex = Math.max(0, items.findIndex((o) => String(o.value) === String(value)));
  const selected = items[selectedIndex];

  useEffect(() => {
    if (!open) return undefined;
    setActive(selectedIndex);
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
    onChange(items[i].value);
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
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={`w-full h-full flex items-center justify-between gap-2 pl-4 pr-4 rounded-xl border bg-white shadow-sm text-base text-gray-800 text-left transition ${
          open ? "border-yellow-400 ring-2 ring-yellow-400" : "border-gray-200 hover:border-yellow-300"
        }`}
      >
        <span className="truncate">{selected.value === "" ? selected.label : `Class ${selected.value}`}</span>
        <FaChevronDown className={`shrink-0 text-xs text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute right-0 top-full mt-2 z-50 w-full md:w-[22rem] max-h-80 overflow-y-auto rounded-2xl bg-white p-2 shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-gray-100"
        >
          {items.map((o, i) => {
            const isSelected = i === selectedIndex;
            return (
              <li
                key={o.value || "all"}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm cursor-pointer ${
                  isSelected
                    ? "bg-[#FFF4D6] text-black font-medium"
                    : i === active
                      ? "bg-[#FFF9EA] text-black"
                      : "text-gray-700"
                }`}
              >
                <span className="flex-1">{o.label}</span>
                {isSelected && <FaCheck className="shrink-0 text-xs text-yellow-500" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

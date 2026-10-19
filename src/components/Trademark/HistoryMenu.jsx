import { useEffect, useRef, useState } from "react";
import { FaEye, FaFilePdf, FaTimes } from "react-icons/fa";
import { LuHistory } from "react-icons/lu";

// "History" button beside the search bar; opens the signed-in customer's saved
// searches in a panel below it. Signed out, it asks them to sign in instead.
export default function HistoryMenu({
  history,
  typeLabel,
  onSignIn,
  onView,
  onDownload,
  viewingId,
  downloadingId,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!history.signedIn) {
      onSignIn();
      return;
    }
    setOpen((o) => !o);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`w-full h-full inline-flex items-center justify-center gap-2 px-6 rounded-xl border text-base font-semibold text-black transition ${
          open ? "bg-[#FFF4D6] border-yellow-400" : "bg-[#FFFBEF] border-yellow-300 hover:bg-[#FFF4D6]"
        }`}
      >
        <LuHistory className="text-lg" /> History
        {history.signedIn && history.items.length > 0 && (
          <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[#FFC72C] text-[11px] font-bold leading-5">
            {history.items.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Your search history"
          className="absolute right-0 top-full mt-2 z-50 w-[calc(100vw-2rem)] sm:w-[30rem] rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-gray-100"
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
            <div>
              <p className="font-semibold text-black">Your search history</p>
              <p className="text-xs text-gray-500">
                {history.usage.used}/{history.usage.limit} free searches used
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close history"
              className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-black"
            >
              <FaTimes />
            </button>
          </div>

          {history.items.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-500">
              Your searches will appear here, with their reports ready to view or download.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto p-2">
              {history.items.map((item) => (
                <li key={item.id} className="px-3 py-3 rounded-xl hover:bg-[#FFF9EA]">
                  <p className="font-medium text-black truncate">“{item.query}”</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {typeLabel(item.queryType)} · {item.classNumbers ? `Class ${item.classNumbers}` : "All classes"} ·{" "}
                    {item.totalCount != null ? `${Number(item.totalCount).toLocaleString("en-IN")} results` : "Results saved"} ·{" "}
                    {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onView(item);
                      }}
                      disabled={viewingId !== null}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-300 bg-white text-black text-xs font-medium hover:border-black disabled:opacity-50"
                    >
                      <FaEye /> {viewingId === item.id ? "Opening…" : "View report"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDownload(item)}
                      disabled={downloadingId !== null}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFC72C] hover:bg-[#FFBD00] text-black text-xs font-semibold disabled:opacity-50"
                    >
                      <FaFilePdf /> {downloadingId === item.id ? "Preparing…" : "Download PDF"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

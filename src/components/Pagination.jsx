import { ChevronLeft, ChevronRight } from "lucide-react";

// The one pagination style used across the app: white bordered buttons with the
// current page in black. Prev/Next-only pagers reuse these classes directly.
export const PAGER_NAV_CLASS =
  "flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:text-gray-300 disabled:hover:bg-white disabled:cursor-not-allowed";
export const PAGER_PAGE_CLASS = "w-8 h-8 text-sm rounded-lg border";
export const PAGER_ACTIVE_CLASS = "bg-gray-900 border-gray-900 text-white";
export const PAGER_INACTIVE_CLASS = "bg-white border-gray-200 text-gray-700 hover:bg-gray-50";

// Previous · numbered pages (sliding window of maxButtons) · Next
const Pagination = ({ page, totalPages, onPage, maxButtons = 5, className = "" }) => {
  const pages = Math.max(1, totalPages || 1);
  const current = Math.min(Math.max(1, page), pages);
  const start = Math.max(1, Math.min(current - Math.floor(maxButtons / 2), pages - maxButtons + 1));
  const end = Math.min(pages, start + maxButtons - 1);
  const numbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        disabled={current === 1}
        onClick={() => onPage(current - 1)}
        className={PAGER_NAV_CLASS}
      >
        <ChevronLeft className="w-4 h-4" /> Previous
      </button>
      {numbers.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPage(n)}
          className={`${PAGER_PAGE_CLASS} ${n === current ? PAGER_ACTIVE_CLASS : PAGER_INACTIVE_CLASS}`}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        disabled={current === pages}
        onClick={() => onPage(current + 1)}
        className={PAGER_NAV_CLASS}
      >
        Next <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Pagination;

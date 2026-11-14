import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGER_NAV_CLASS, PAGER_PAGE_CLASS, PAGER_ACTIVE_CLASS } from "./Pagination";


// Modern DataTable component with updated design
const DataTable = ({
  columns = [],
  data = [],
  loading,
  error,
  page,
  totalPages,
  onPrev,
  onNext,
  emptyMessage = "No data found."
}) => {
  return (
    <div className="w-full">
      {/* Table Container with subtle shadow and border */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Phones: one card per row (label above value) instead of a wide table.
            A column with `mobileFull` spans the whole card width. */}
        <div className="sm:hidden divide-y divide-gray-100">
          {loading && (
            <p className="px-4 py-10 text-center text-sm text-gray-500">Loading data...</p>
          )}
          {error && (
            <p className="px-4 py-10 text-center text-sm text-red-600">{error}</p>
          )}
          {!loading && !error && data.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-gray-500">{emptyMessage}</p>
          )}
          {!loading && !error && data.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
              {columns.map((col, colIndex) => (
                <div key={colIndex} className={`min-w-0 ${col.mobileFull ? "col-span-2" : ""}`}>
                  {!col.mobileHideLabel && (
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      {col.header}
                    </p>
                  )}
                  <div className="text-xs text-gray-900 break-words">
                    {typeof col.render === 'function' ? col.render(row) : row[col.key]}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Table Wrapper for horizontal scroll on small screens */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            {/* Table Header with gradient background */}
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                {columns.map((col, index) => (
                  <th
                    key={index}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-gray-100">
              {/* Loading State */}
              {loading && (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                      <p className="text-sm text-gray-500 font-medium">Loading data...</p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Error State */}
              {error && (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-red-600 font-medium">{error}</p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty State */}
              {!loading && !error && data.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm text-gray-500 font-medium">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data Rows with hover effect */}
              {!loading && !error && data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className="px-4 py-2.5 text-xs text-gray-900"
                    >
                      {typeof col.render === 'function' ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls with modern styling */}
        {!loading && !error && data.length > 0 && totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              {/* Previous Button */}
              <button
                onClick={onPrev}
                disabled={page === 1}
                className={PAGER_NAV_CLASS}
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              {/* Page Indicator */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Page
                </span>
                <span className={`${PAGER_PAGE_CLASS} ${PAGER_ACTIVE_CLASS} inline-flex items-center justify-center`}>
                  {page}
                </span>
                <span className="text-sm text-gray-600">
                  of
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {totalPages}
                </span>
              </div>

              {/* Next Button */}
              <button
                onClick={onNext}
                disabled={page === totalPages}
                className={PAGER_NAV_CLASS}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataTable;
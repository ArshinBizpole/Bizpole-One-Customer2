
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
        {/* Table Wrapper for horizontal scroll on small screens */}
        <div className="overflow-x-auto">
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
                className={`
                  inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${page === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100 hover:shadow-sm border border-gray-300'
                  }
                `}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              {/* Page Indicator */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Page
                </span>
                <span className="inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1 text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg border border-blue-200">
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
                className={`
                  inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${page === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100 hover:shadow-sm border border-gray-300'
                  }
                `}
              >
                Next
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataTable;
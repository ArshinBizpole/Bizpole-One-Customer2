// src/components/ComplianceDashboard.jsx
import { useContext, useEffect, useState } from "react";
import { DashboardContext } from "../pages/DashboardLayout";
import ComplianceCalendar from "./ComplianceCalendar";
import { useNavigate } from "react-router-dom";
import CryptoJS from "crypto-js";
import QuoteStatusApi from "../api/QuoteStatusApi";
import { FileText, Plus } from "lucide-react";
import { getSecureItem } from "../utils/secureStorage";
import { getClientBaseUrl } from "../utils/clientBaseUrl";

const ComplianceDashboard = () => {
  const navigate = useNavigate();
  const { selectedCompany: ctxSelectedCompany, quotes } =
    useContext(DashboardContext);

  // If DashboardContext.selectedCompany is not present, fall back to storage
  const getCurrentSelectedCompany = () => {
    if (ctxSelectedCompany && ctxSelectedCompany.CompanyID)
      return ctxSelectedCompany;
    try {
      const raw = getSecureItem("selectedCompany");
      return raw && typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
      console.log(e);
      return null;
    }
  };

  const selectedCompany = getCurrentSelectedCompany();

  // Filter quotes for current company
  const companyQuotes = Array.isArray(quotes)
    ? quotes.filter(
        (q) =>
          String(q.CompanyID) ===
          String(selectedCompany?.CompanyID || selectedCompany?.CompanyId),
      )
    : [];

  const [quoteStatus, setQuoteStatus] = useState(null);
  const [quoteId, setQuoteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQuoteDropdown, setShowQuoteDropdown] = useState(false);
  const [quoteStatuses, setQuoteStatuses] = useState({});

  useEffect(() => {
    setLoading(true);

    if (companyQuotes && companyQuotes.length > 0) {
      const quoteIds = companyQuotes.map((q) => q.QuoteID).filter(Boolean);
      setQuoteId(companyQuotes[0].QuoteID || null);

      if (quoteIds.length === 0) {
        setQuoteStatuses({});
        setQuoteStatus(null);
        setLoading(false);
        return;
      }

      QuoteStatusApi.getQuoteStatus(quoteIds)
        .then((res) => {
          const statusMap = {};
          if (res.results && Array.isArray(res.results)) {
            res.results.forEach((s) => {
              let normalizedStatus = s.quotestatus;
              if (normalizedStatus === "3") normalizedStatus = "Paid";
              if (normalizedStatus === "1") normalizedStatus = "Draft";
              statusMap[s.quoteId] = normalizedStatus;
            });
          }
          setQuoteStatuses(statusMap);

          const firstQuoteStatus =
            statusMap[companyQuotes[0].QuoteID] ||
            (companyQuotes[0].QuoteStatus === "3"
              ? "Paid"
              : companyQuotes[0].QuoteStatus === "1"
                ? "Draft"
                : companyQuotes[0].QuoteStatus);

          setQuoteStatus(firstQuoteStatus);
        })
        .catch(() => {
          const localStatus =
            companyQuotes[0].QuoteStatus === "3"
              ? "paid"
              : companyQuotes[0].QuoteStatus === "1"
                ? "Draft"
                : companyQuotes[0].QuoteStatus;
          setQuoteStatuses({});
          setQuoteStatus(localStatus);
        })
        .finally(() => setLoading(false));
    } else {
      setQuoteId(null);
      setQuoteStatus(null);
      setQuoteStatuses({});
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(companyQuotes), selectedCompany?.CompanyID]);

  const encrypt = (id) => {
    const secret =
      import.meta.env.VITE_QUOTE_LINK_SECRET || "q3!9fKs7@pLzXr84$nmYtB!cVZdQ3";
    return CryptoJS.AES.encrypt(String(id), secret).toString();
  };

  const handleViewDetails = (quote = null) => {
    const targetQuoteId = quote ? quote.QuoteID : quoteId;
    if (!targetQuoteId) {
      alert("Quote ID not found");
      return;
    }
    const encrypted = encrypt(targetQuoteId);
    const url = `${getClientBaseUrl()}/quotes/saved-preview/${encodeURIComponent(encrypted)}`;
    // const url = `http://dev.bizpoleindia.in/quotes/saved-preview/${encodeURIComponent(encrypted)}`;
    window.open(url, "_blank");
  };

  // const handleDownload = (quote = null) => {
  //   const targetQuoteId = quote ? quote.QuoteID : quoteId;
  //   if (!targetQuoteId) {
  //     alert("Quote ID not found");
  //     return;
  //   }
  //   const url = `http://localhost:5174/quotes/download/${targetQuoteId}`;
  //   window.open(url, "_blank");
  // };

  const handleGenerateQuote = () => {
    navigate("/startbusiness/choose", { state: { navigate: true } });
  };

  const getQuoteStatusText = (status) => {
    switch (status) {
      case "Paid":
        return "Payment successful! Your quote is ready.";
      case "Draft":
        return "Your quote is in draft status. Please complete the process.";
      default:
        return "Your compliance score is below 30%. Please review your pending tasks.";
    }
  };

  const getQuoteStatusIcon = (status) => {
    switch (status) {
      case "Paid":
        return (
          <svg
            className="w-6 h-6 text-green-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case "Draft":
        return (
          <span className="inline-block w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></span>
        );
      default:
        return (
          <span className="inline-block w-3 h-3 bg-yellow-400 rounded-full"></span>
        );
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full px-2 sm:px-4">
      <div className="flex-1 flex justify-center mb-4 md:mb-0">
        <ComplianceCalendar />
      </div>

      <div className="flex-1 flex justify-center items-center">
        {/* Quotes Card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 flex flex-col items-center">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            {companyQuotes.length > 0 ? (
              getQuoteStatusIcon(quoteStatus)
            ) : (
              <FileText className="w-6 h-6 text-yellow-500" />
            )}
            <span className="font-semibold text-gray-700 text-2xl">Quotes</span>
          </div>

          {/* Status Message */}
          <div className="text-gray-600 text-center text-base md:text-xl mb-4">
            {companyQuotes.length > 0
              ? getQuoteStatusText(quoteStatus)
              : "No quotes found for this company. Generate your first quote to get started."}
          </div>

          {loading ? (
            <div className="text-gray-500 text-center py-2">
              Checking quote status...
            </div>
          ) : companyQuotes.length === 0 ? (
            // No quotes
            <div className="flex flex-col gap-4 w-full items-center">
              <div className="text-center py-4">
                <FileText size={48} className="mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500 mb-2">
                  No quotes available for selected company
                </p>
                <p className="text-sm text-gray-400">
                  Generate a quote to get started with your business compliance
                </p>
              </div>
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-full transition flex items-center gap-2"
                onClick={handleGenerateQuote}
              >
                <Plus size={20} />
                Generate Quote
              </button>
            </div>
          ) : (
            // Has quotes
            <div className="w-full space-y-4">
              {/* Quote Dropdown */}
              <div className="relative">
                <button
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition flex justify-between items-center"
                  onClick={() => setShowQuoteDropdown(!showQuoteDropdown)}
                >
                  <div className="text-left">
                    <div className="font-medium text-gray-800">
                      {companyQuotes.length} Quote
                      {companyQuotes.length > 1 ? "s" : ""} Available
                    </div>
                    <div className="text-sm text-gray-500">
                      Click to view all quotes
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${showQuoteDropdown ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Quotes List */}
                {showQuoteDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {companyQuotes.map((quote, index) => {
                      const rawStatus =
                        quoteStatuses[quote.QuoteID] || quote.QuoteStatus;
                      const status =
                        rawStatus === "3"
                          ? "Paid"
                          : rawStatus === "1"
                            ? "Draft"
                            : rawStatus || "";
                      const statusColor =
                        status === "Paid"
                          ? "text-green-600"
                          : status === "Draft"
                            ? "text-yellow-600"
                            : "text-gray-600";

                      return (
                        <div
                          key={quote.QuoteID || index}
                          className="p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleViewDetails(quote)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-gray-800 text-sm">
                                {quote.PackageName || `Quote ${index + 1}`}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                Status:{" "}
                                <span
                                  className={`font-semibold ${statusColor}`}
                                >
                                  {status}
                                </span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-800">
                                ₹{quote.TotalAmount || quote.Total || "0"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {quote.CreatedDate
                                  ? new Date(
                                      quote.CreatedDate,
                                    ).toLocaleDateString()
                                  : "Recent"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 w-full">
                {companyQuotes.length > 0 && (
                  <button
                    className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-full font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all w-full"
                    onClick={() => handleViewDetails(companyQuotes[0])}
                  >
                    View Latest Quote
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplianceDashboard;

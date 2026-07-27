import { useState, useEffect, useContext } from "react";
import { getCompanyCompliances, updateComplianceStatus } from "../../api/CompanyApi";
import { ProfileCompanyContext } from "../../pages/ProfileLayout";
import { toast } from "react-toastify";

const STATUS_OPTIONS = ["Complete", "Pending", "Not Applicable"];

const RegistrationStatusForm = ({ onNext, onBack }) => {
  const { selectedCompanyId } = useContext(ProfileCompanyContext);

  const [items, setItems] = useState([]);
  const [answers, setAnswers] = useState({});   // { [id]: status }
  const [progress, setProgress] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Clear stale data from previous company immediately
    setItems([]);
    setAnswers({});
    setProgress(0);
    setError("");

    if (!selectedCompanyId) return;

    const load = async () => {
      setFetching(true);
      try {
        const res = await getCompanyCompliances(selectedCompanyId);
        if (res.success) {
          setItems(res.data.items);
          setProgress(res.data.progress);
          const initial = {};
          res.data.items.forEach((item) => {
            initial[item.id] = item.status || "";
          });
          setAnswers(initial);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load compliance data.");
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [selectedCompanyId]);

  const handleChange = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));

    // Recalculate progress optimistically
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: value } : item)));
    setProgress(() => {
      const updated = items.map((item) =>
        item.id === id ? { ...item, status: value } : item,
      );
      const completed = updated.filter((i) => i.status === "Complete").length;
      return updated.length > 0 ? Math.round((completed / updated.length) * 100) : 0;
    });
  };

  const handleNext = async (e) => {
    e.preventDefault();

    const unanswered = items.some((item) => !answers[item.id]);
    if (unanswered) {
      setError("Please answer all questions before proceeding.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await Promise.all(
        items.map((item) => updateComplianceStatus(item.id, answers[item.id])),
      );
      toast.success("Registration status saved");
      if (onNext) onNext(answers);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save. Please try again.");
      setError("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#f5f5f5]">
      {/* Left Section */}
      <div className="flex-1 p-4 sm:p-8 md:p-10 lg:p-12 bg-cover bg-center rounded-tl-2xl rounded-bl-2xl">
        <h1 className="text-3xl font-bold text-center mb-12">
          Registration Status (For Compliance Calendar)
        </h1>

        {fetching ? (
          <div className="text-center text-gray-400 py-10">Loading...</div>
        ) : (
          <>
            <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
              {items.map((item) => (
                <div key={item.id}>
                  <label className="block mb-2 text-lg font-semibold">
                    {item.name ? `DO YOU HAVE ${item.name.toUpperCase()}?` : ""}
                    {item.description && (
                      <span className="block text-sm font-normal text-gray-500 mt-0.5">
                        {item.description}
                      </span>
                    )}
                  </label>
                  <select
                    className="w-full border-2 border-yellow-400 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    value={answers[item.id] || ""}
                    onChange={(e) => handleChange(item.id, e.target.value)}
                    disabled={loading}
                    required
                  >
                    <option value="">Select</option>
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {items.length > 0 && (
              <div className="max-w-3xl mx-auto mt-8">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>Compliance Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-yellow-400 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-between mt-8 md:mt-12 max-w-3xl mx-auto gap-6 md:gap-0">
          <button
            onClick={onBack}
            className="w-12 h-12 flex items-center justify-center border-2 border-yellow-400 rounded-full text-yellow-500 text-xl hover:bg-yellow-100 transition focus:outline-none focus:ring-2 focus:ring-yellow-500"
            title="Back"
            type="button"
            disabled={loading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-base">
              <input type="checkbox" className="accent-yellow-500" />
              Remind me later!
            </label>
            <button
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-8 py-3 rounded-full flex items-center gap-2 transition focus:outline-none focus:ring-2 focus:ring-yellow-500"
              onClick={handleNext}
              title="Next"
              disabled={loading || fetching}
            >
              {loading ? "Saving..." : "Next »"}
            </button>
          </div>
        </div>

        {error && <div className="text-red-500 text-center mt-4">{error}</div>}
      </div>
    </div>
  );
};

export default RegistrationStatusForm;

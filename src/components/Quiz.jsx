import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Building,
  TrendingUp,
  Shield,
  Users,
} from "lucide-react";

/**
 * Quiz component (full updated)
 * - Requires: framer-motion, lucide-react, Tailwind CSS (as used in your project)
 */

const quizQuestions = [
  {
    id: 1,
    question: "Do you plan to raise investment from outside?",
    options: ["Yes", "No"],
    key: "funding",
  },
  {
    id: 2,
    question: "Do you have Partner?",
    options: ["Yes", "No"],
    key: "ownership",
  },
  {
    id: 3,
    question: "Would you like to protect your personal assets from business risk?",
    options: ["Yes", "No"],
    key: "liability",
  },
  // Scale now has explicit levels to match rules
  {
    id: 4,
    question: "How much do you plan to scale your business?",
    options: ["High", "Medium", "Low"],
    key: "scale",
  },
  {
    id: 5,
    question: "Do you expect the annual revenue to exceed 40 Lakhs?",
    options: ["Yes", "No"],
    key: "revenue",
  },
];

// Clean, consistent rule set (scale: High|Medium|Low, revenue: >40L | <40L)
const businessStructureRules = [
  {
    conditions: {
      funding: "Yes",
      ownership: "No",
      liability: "Yes",
      scale: "High",
      revenue: ">40L",
    },
    recommendation: "Private Limited",
    reason: "Best for investment, scale, and limited liability",
  },
  {
    conditions: {
      funding: "No",
      ownership: "No",
      liability: "Yes",
      scale: "Medium",
      revenue: "<40L",
    },
    recommendation: "Solo Entrepreneur",
    reason: "Ideal for solo entrepreneur with some protection",
  },
  {
    conditions: {
      funding: "No",
      ownership: "No",
      liability: "No",
      scale: "Low",
      revenue: "<40L",
    },
    recommendation: "Sole Proprietorship",
    reason: "Simplest, easy to start, but no liability protection",
  },
  {
    conditions: {
      funding: "No",
      ownership: "Yes",
      liability: "Yes",
      scale: "Medium",
      revenue: "<40L",
    },
    recommendation: "Limited Liability Partnership",
    reason: "Safer for partnership with liability protection",
  },
  {
    conditions: {
      funding: "No",
      ownership: "Yes",
      liability: "No",
      scale: "Low",
      revenue: "<40L",
    },
    recommendation: "Partnership",
    reason: "Traditional partnership setup (partners bear liability)",
  },
  {
    conditions: {
      funding: "No",
      ownership: "No",
      liability: "Yes",
      scale: "Medium",
      revenue: ">40L",
    },
    recommendation: "OPC or Private Ltd",
    reason: "Both may work — Private Ltd safer for future funding/scale",
  },
  {
    conditions: {
      funding: "No",
      ownership: "Yes",
      liability: "Yes",
      scale: "High",
      revenue: ">40L",
    },
    recommendation: "Limited Liability Partnership or Private Ltd",
    reason: "Limited Liability Partnership okay for partnerships; Private Ltd better for larger scale",
  },
  {
    conditions: {
      funding: "No",
      ownership: "No",
      liability: "No",
      scale: "High",
      revenue: ">40L",
    },
    recommendation: "Private Limited",
    reason: "Better liability protection and credibility for high scale",
  },
  {
    conditions: {
      funding: "Yes",
      ownership: "Yes",
      liability: "Yes",
      scale: "High",
      revenue: ">40L",
    },
    recommendation: "Private Limited",
    reason: "Investors typically require a corporate structure",
  },
  {
    conditions: {
      funding: "Yes",
      ownership: "No",
      liability: "Yes",
      scale: "High",
      revenue: ">40L",
    },
    recommendation: "Private Limited",
    reason: "OPC not suitable for external investors; Private Ltd preferred",
  },
];

const Quiz = ({ onComplete = () => { } }) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState({});
  const [selectedOption, setSelectedOption] = useState(null);
  const [recommendation, setRecommendation] = useState(null);

  // Countdown loader
  useEffect(() => {
    if (!started && countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setStarted(true);
    }
  }, [countdown, started]);

  // Helper: convert raw answers to processed values for rule matching
  const processAnswers = (finalAnswers) => {
    // revenue mapping to >40L / <40L
    const revenueValue = finalAnswers.revenue === "Yes" ? ">40L" : "<40L";

    // scale is already High/Medium/Low (we set it that way in questions)
    // If user skipped or left undefined, fallback to Medium
    const scaleValue = finalAnswers.scale || "Medium";

    const processedAnswers = {
      funding: finalAnswers.funding || "No",
      ownership: finalAnswers.ownership || "No",
      liability: finalAnswers.liability || "No",
      scale: scaleValue,
      revenue: revenueValue,
    };

    // Try to find an exact rule match
    let matchedRule = businessStructureRules.find((rule) =>
      Object.keys(rule.conditions).every(
        (key) => rule.conditions[key] === processedAnswers[key]
      )
    );

    // Fallback heuristics (ordered)
    if (!matchedRule) {
      // If external funding is required -> Private Ltd
      if (processedAnswers.funding === "Yes") {
        matchedRule = {
          recommendation: "Private Limited Company",
          reason: "External funding expected — Private Ltd is the standard choice.",
        };
      }
      // If there are partners
      else if (processedAnswers.ownership === "Yes") {
        matchedRule = {
          recommendation:
            processedAnswers.liability === "Yes" ? "Limited Liability Partnership" : "Partnership Firm",
          reason:
            processedAnswers.liability === "Yes"
              ? "Partnership with limited liability (Limited Liability Partnership) is recommended"
              : "Traditional partnership — partners share unlimited liability",
        };
      }
      // Sole owner with liability preference
      else {
        matchedRule = {
          recommendation:
            processedAnswers.liability === "Yes"
              ? "One Person Company (OPC)"
              : "Sole Proprietorship",
          reason:
            processedAnswers.liability === "Yes"
              ? "Solo entrepreneur with liability protection"
              : "Simplest setup; limited liability protection",
        };
      }
    }

    // Return matchedRule (object with recommendation + reason)
    return matchedRule;
  };

  // When the user chooses an option
  const handleAnswer = (answer) => {
    setSelectedOption(answer);

    // small delay to show selected animation
    setTimeout(() => {
      const qKey = quizQuestions[currentQuestion].key;
      const newAnswers = { ...answers, [qKey]: answer };
      setAnswers(newAnswers);
      setSelectedOption(null);

      if (currentQuestion < quizQuestions.length - 1) {
        setCurrentQuestion((q) => q + 1);
      } else {
        // Finalize and compute recommendation
        let result = processAnswers(newAnswers);
        // Fallback if recommendation is empty or missing
        if (!result || !result.recommendation || result.recommendation.trim() === "") {
          result = {
            recommendation: "Sole Proprietorship",
            reason: "Default: Simplest setup; limited liability protection."
          };
        }
        setRecommendation(result);
        setFinished(true);
        onComplete({ answers: newAnswers, recommendation: result });
        // After a short delay, navigate back and pass the recommendation
        setTimeout(() => {
          navigate("/startbusiness/choose", { state: { suggested: result.recommendation, reason: result.reason } });
        }, 2000);
      }
    }, 600);
  };

  // sensible defaults for Skip: for scale use Medium; for other boolean Qs use "No"
  const defaultForQuestion = (qIndex) => {
    const key = quizQuestions[qIndex]?.key;
    if (key === "scale") return "Medium";
    return "No";
  };

  const handleSkip = () => {
    const def = defaultForQuestion(currentQuestion);
    handleAnswer(def);
  };

  // const resetQuiz = () => {
  //   setCountdown(2);
  //   setStarted(false);
  //   setCurrentQuestion(0);
  //   setFinished(false);
  //   setAnswers({});
  //   setSelectedOption(null);
  //   setRecommendation(null);
  // };

  // Floating particles (kept from your design)
  const FloatingParticles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-yellow-400 rounded-full opacity-30"
          initial={{
            x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 800),
            y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 600),
          }}
          animate={{
            y: [0, -40 - Math.random() * 60, 0],
            x: [0, Math.random() * 30 - 15, 0],
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );

  const getBusinessIcon = (businessType) => {
    if (!businessType) return <TrendingUp className="w-12 h-12 text-yellow-500" />;
    if (businessType.includes("Private Limited") || businessType.includes("Private Ltd"))
      return <Building className="w-12 h-12 text-blue-500" />;
    if (businessType.includes("Limited Liability Partnership")) return <Users className="w-12 h-12 text-green-500" />;
    if (businessType.includes("OPC")) return <Shield className="w-12 h-12 text-purple-500" />;
    if (businessType.includes("Partnership")) return <Users className="w-12 h-12 text-orange-500" />;
    return <TrendingUp className="w-12 h-12 text-yellow-500" />;
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-10 px-4 relative overflow-hidden">
      <FloatingParticles />

      {/* Loader Screen */}
      {!started && !finished && (
        <AnimatePresence>
          <motion.div
            className="fixed flex flex-col inset-0 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-2xl md:text-4xl">
              Your <span className="font-bold">Quiz</span> Will Start in
            </h1>

            <motion.div
              key={countdown}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative z-20 text-8xl font-extrabold text-yellow-400 flex flex-col items-center mt-6"
              style={{ textShadow: "0 4px 8px rgba(255, 215, 0, 0.5)" }}
            >
              {countdown > 0 ? (
                <>
                  <span>{countdown}</span>
                  <motion.span
                    className="text-lg mt-4 text-gray-600 font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Getting ready...
                  </motion.span>
                </>
              ) : (
                <motion.span
                  className="text-yellow-500 flex flex-col items-center"
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <Sparkles className="w-12 h-12 mb-2" />
                  START!
                </motion.span>
              )}
            </motion.div>

            {/* Decorative */}
            <motion.div
              className="absolute bottom-[8%] right-[8%] w-16 h-14 z-20"
              animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="relative w-full h-full" style={{ background: "linear-gradient(135deg,#ffd700,#ffed4e)", transform: "rotate(30deg)", boxShadow: "0 8px 16px rgba(255,215,0,0.3)" }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white/80" style={{ transform: "rotate(-30deg)" }} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Question Screen */}
      {started && !finished && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl bg-white rounded-3xl shadow-2xl p-8 md:p-12 flex flex-col justify-center relative overflow-hidden min-h-[520px]"
        >
          <div className="absolute top-6 right-6 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
            {currentQuestion + 1} / {quizQuestions.length}
          </div>

          <div className="w-full bg-gray-200 rounded-full h-4 mb-8 overflow-hidden shadow-inner">
            <motion.div
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-4 rounded-full shadow-sm relative overflow-hidden"
              initial={{ width: "0%" }}
              animate={{
                width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%`,
              }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </div>

          <motion.div className="text-center mb-8" key={currentQuestion} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{quizQuestions[currentQuestion].question}</h2>
          </motion.div>

          <div className="space-y-4 flex-1 flex flex-col justify-center mb-6">
            {quizQuestions[currentQuestion].options.map((option, idx) => (
              <motion.button
                key={idx}
                onClick={() => handleAnswer(option)}
                className={`w-full group relative py-5 px-8 rounded-2xl text-left font-semibold transition-all duration-300 shadow-sm hover:shadow-lg ${selectedOption === option
                  ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white"
                  : "bg-gray-200 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-yellow-100 hover:border-yellow-400"
                  }`}
                whileHover={{ scale: selectedOption ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                disabled={selectedOption !== null}
                aria-label={`Answer ${option}`}
              >
                <span className="flex items-center justify-between">
                  <span>{option}</span>
                  {selectedOption === option && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500 }}>
                      <CheckCircle2 className="w-5 h-5" />
                    </motion.span>
                  )}
                </span>
              </motion.button>
            ))}
          </div>

          <motion.div className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <button
              onClick={handleSkip}
              className="text-gray-600 hover:text-gray-800 font-medium hover:underline transition-all duration-200 flex items-center justify-center mx-auto"
              disabled={selectedOption !== null}
            >
              Skip
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Results Screen */}
      {finished && recommendation && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center justify-center text-center space-y-8 max-w-3xl mx-auto bg-white p-12 rounded-3xl shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0, rotate: -160 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 220, delay: 0.15 }}
            className="flex flex-col items-center space-y-4"
          >
            {getBusinessIcon(recommendation.recommendation)}
            <h2 className="text-4xl font-extrabold text-gray-900">Our Suggestion</h2>
            <p className="text-gray-600 text-lg max-w-lg">Based on your answers, this is the most suitable business structure for you:</p>
            <h3 className="text-3xl font-bold text-blue-900 mb-2 mt-4">{recommendation.recommendation}</h3>
            <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">Recommended</span>
            <p className="text-blue-700 font-medium text-lg mt-2">{recommendation.reason}</p>
          </motion.div>

          <motion.div className="bg-gray-50 p-6 rounded-xl text-base text-gray-600 w-full" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}>
            <h4 className="font-semibold mb-3 text-lg">Your Answers:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {Object.entries(answers).map(([key, value]) => (
                <div key={key} className="flex justify-between bg-white px-3 py-2 rounded-md shadow-sm">
                  <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}:</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div className="text-yellow-600 font-semibold text-lg mt-4">Redirecting to business type selection...</motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Quiz;

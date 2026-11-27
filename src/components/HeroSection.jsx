import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AOS from "aos";
import "aos/dist/aos.css";
import { FaArrowRight, FaCheckCircle } from "react-icons/fa";
import { removeSecureItem } from "../utils/secureStorage";




const HeroSection = () => {
  const navigate = useNavigate();
  // Animated words for heading
  const words = [
    { text: "Run", color: "text-red-400" },
    { text: "Grow", color: "text-gray-600" },
    { text: "Start", color: "text-[#F5C518]" }, // brand yellow (same as the buttons / logo)
  ];

  const [currentWord, setCurrentWord] = useState(0);

  useEffect(() => {
    // Loop heading words
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 2600);

    // Init AOS
    AOS.init({ duration: 1000, once: false });
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <section className="relative flex flex-col items-center px-4 sm:px-6 -mt-20 lg:-mt-24 pt-32 sm:pt-36 lg:pt-44 pb-12 md:pb-16 text-center overflow-hidden bg-[#f7f5f0]">
      {/* Soft brand glow behind the headline */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 w-[680px] max-w-[110vw] h-[300px] rounded-full bg-[#F5C518]/20 blur-[100px]"
      />

      <div className="relative z-10 w-full max-w-6xl mx-auto">

        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-[#1a1a1a]/10 bg-white/70 backdrop-blur px-4 py-1.5 mb-6 md:mb-8 text-xs sm:text-sm font-medium text-gray-700 shadow-sm"
        >
          <span className="w-2 h-2 rounded-full bg-[#F5C518]" />
          India&apos;s first AI-powered business super app for SMEs
        </motion.div>

        {/* Animated Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-black mb-6 md:mb-7 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-4"
        >
          <motion.span
            key={words[currentWord].text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`${words[currentWord].color} font-semibold text-5xl sm:text-6xl md:text-7xl lg:text-8xl md:w-56 lg:w-72 inline-block text-center md:text-right`}
          >
            {words[currentWord].text}
          </motion.span>
          <span className="max-w-full px-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-gray-900 lg:whitespace-nowrap">
            your business, simplified.
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto px-2 mb-9 md:mb-10"
        >
          Incorporation, GST &amp; taxes, compliance, trademarks and accounting —
          handled by experts and tracked in <span className="font-semibold text-gray-900">one dashboard</span>.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
          className="flex flex-col sm:flex-row justify-center items-center gap-5 sm:gap-8 px-4"
        >
          {/* Primary CTA */}
          <motion.button
            className="group bg-[#F5C518] text-black text-base md:text-lg font-semibold px-8 md:px-10 py-3.5 md:py-4 rounded-full flex items-center gap-2.5 shadow-lg shadow-[#F5C518]/25 hover:shadow-xl hover:shadow-[#F5C518]/35 hover:-translate-y-0.5 active:translate-y-0 transition duration-200 w-full sm:w-auto justify-center"
            onClick={() => navigate("/startbusiness/services")}
          >
            Start your business
            <FaArrowRight className="text-sm transition-transform group-hover:translate-x-1" />
          </motion.button>

          {/* Secondary CTA */}
          <button
            className="group inline-flex items-center gap-2 text-[#1a1a1a] font-semibold text-base md:text-lg px-2 py-2 border-b-2 border-[#F5C518] hover:border-[#1a1a1a] transition-colors duration-200"
            onClick={() => {
              removeSecureItem("onboardingStep");
              navigate("/existing-companies");
            }}
          >
            I have an existing company
            <FaArrowRight className="text-sm transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </motion.div>

        {/* Quick reassurance */}
        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-9 md:mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-600"
        >
          {["Transparent state-wise pricing", "No hidden charges", "Dedicated expert team"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <FaCheckCircle className="text-[#F5C518]" />
              {t}
            </li>
          ))}
        </motion.ul>

      </div>
    </section>
  );
};

export default HeroSection;

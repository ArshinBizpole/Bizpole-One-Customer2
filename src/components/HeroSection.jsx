import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AOS from "aos";
import "aos/dist/aos.css";
import { FaArrowRight } from "react-icons/fa";



import { Suspense, lazy } from "react";
const PaymentLogs = lazy(() => import("./PaymentLogs"));

const HeroSection = () => {
  const navigate = useNavigate();
  // Animated words for heading
  const words = [
    { text: "Run", color: "text-red-400" },
    { text: "Grow", color: "text-gray-600" },
    { text: "Start", color: "text-yellow-600" },
  ];

  const [currentWord, setCurrentWord] = useState(0);

  useEffect(() => {
    // Loop heading words
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 1500);

    // Init AOS
    AOS.init({ duration: 1000, once: false });
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <section
      className="relative bg-cover bg-center min-h-screen flex  flex-col items-center justify-center px-4 sm:px-6 py-12 md:py-16 text-center overflow-hidden bg-gradient-to-t from-white to-yellow-50"
    
    >
      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto hero-content">

        {/* Animated Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-black mb-4 flex flex-col  md:flex-row items-center justify-center gap-2 md:gap-3"
        >
          <motion.span
            key={words[currentWord].text}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: -10 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
            className={`${words[currentWord].color} drop-shadow-lg text-4xl sm:text-5xl md:text-7xl lg:text-8xl w-60 inline-block text-center`}
          >
            {words[currentWord].text}
          </motion.span>
          <span className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-semibold text-gray-900 mt-2 md:mt-0">
            a Business, Now Simplified !!
          </span>
        </motion.h1>


        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          data-aos="fade-up"
          className="text-base sm:text-lg md:text-2xl text-gray-700 mb-8 md:mb-10 max-w-3xl mx-auto px-4"
        >
          India's First AI Powered Business Super Application For{" "}
          <span className="font-semibold text-black">SME</span>
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 mb-10 md:mb-14 px-4"
        >
          {/* Primary CTA */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-yellow-400 text-black text-xl  px-6 py-3 rounded-full flex items-center gap-2 shadow-md hover:bg-yellow-500 transition w-full sm:w-auto justify-center"
            onClick={() => navigate("/startbusiness/choose")}
          >
            Start  <span className="font-bold">New Company</span>
            <FaArrowRight />
          </motion.button>

          {/* Secondary CTA */}
          <motion.button
            initial="initial"
            whileHover="hovered"
            className="flex items-center gap-3 text-black font-medium border-b-2 border-yellow-400 hover:border-b-0 transition cursor-pointer py-2 sm:py-0 justify-center sm:justify-start text-xl"
            onClick={() => navigate("/existing-companies")}
          >
            {/* Expanding circle effect */}
            <motion.span
              variants={{
                initial: {
                  width: 12,
                  height: 12,
                  borderRadius: 9999,
                  backgroundColor: "rgba(0,0,0,0)",
                  borderColor: "#facc15",
                  borderWidth: 2,
                },
                hovered: {
                  width: 48,
                  height: 48,
                  borderRadius: 9999,
                  backgroundColor: "#facc15",
                  borderColor: "#facc15",
                  borderWidth: 2,
                },
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="inline-flex items-center justify-center overflow-hidden"
            >
              <motion.span
                variants={{
                  initial: { opacity: 0, scale: 0.6 },
                  hovered: { opacity: 1, scale: 1 },
                }}
                transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.05 }}
                style={{ color: "black" }}
              >
                <FaArrowRight size={19} />
              </motion.span>
            </motion.span>
            Existing Company
          </motion.button>
        </motion.div>

        {/* Clients Text */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          data-aos="fade-up"
          className="text-lg sm:text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-black px-4"
        >
          More than 25,000 clients
        </motion.h2>
      </div>


           <div className="py-4 md:py-6 ">
             <Suspense fallback={null}>
               <PaymentLogs />
             </Suspense>
           </div>


    </section>
  );
};

export default HeroSection;

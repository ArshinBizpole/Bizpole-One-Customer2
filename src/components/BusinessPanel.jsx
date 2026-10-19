import { motion, AnimatePresence } from "framer-motion";
import HeroPhotoCard from "./HeroPhotoCard";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import { ChevronRight } from "lucide-react";

const BusinessPanel = ({ isRight, setIsRight }) => {
  useEffect(() => {
    AOS.init({ duration: 800, once: true });
  }, []);

  return (
    <div className="relative flex min-h-screen bg-gray-50 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={isRight ? "existing" : "new"}
          className="flex w-full"
          initial={{ opacity: 0, x: isRight ? 100 : -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRight ? -100 : 100 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
        >
          {/* Left Section */}
          {!isRight ? (
            // Start New Company → image left, content right
            <>
              {/* Image Left */}
              <motion.div
                layout
                className="w-1/2 flex items-center justify-center bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 relative"
                data-aos="fade-right"
              >
                <HeroPhotoCard />
              </motion.div>

              {/* Content Right */}
              <motion.div
                layout
                className="w-1/2 flex flex-col justify-center px-12"
                data-aos="fade-left"
              >
                <h2 className="text-4xl font-bold mb-4">Let’s talk business!</h2>
                <p className="text-gray-600 mb-8">
                  To begin this journey, tell us what type of account you’d be
                  opening.
                </p>
                <div className="space-y-4">
                  <button className="w-full py-3 px-6 bg-yellow-400 hover:bg-yellow-500 rounded-xl font-medium transition">
                    Start a New Company
                  </button>
                  <button className="w-full py-3 px-6 bg-yellow-400 hover:bg-yellow-500 rounded-xl font-medium transition">
                    Onboard Existing Company
                  </button>
                </div>
              </motion.div>
            </>
          ) : (
            // Existing Company → content left, image right
            <>
              {/* Content Left */}
              <motion.div
                layout
                className="w-1/2 flex flex-col justify-center px-12"
                data-aos="fade-right"
              >
                <h2 className="text-4xl font-bold mb-6">
                  Choose Your Business Type
                </h2>
                <p className="text-gray-600 mb-8">
                  Select the business structure that best suits your needs and
                  goals.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    "Private Limited",
                    "Limited Liability Partnership",
                    "Partnership",
                    "Solo Entrepreneur",
                    "Sole Proprietorship",
                    "Trust",
                  ].map((type, i) => (
                    <button
                      key={i}
                      className="py-3 px-4 bg-yellow-400 hover:bg-yellow-500 rounded-xl transition"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Image Right */}
              <motion.div
                layout
                className="w-1/2 flex items-center justify-center bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 relative"
                data-aos="fade-left"
              >
                <HeroPhotoCard />
              </motion.div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Switch Button */}
      <motion.button
        aria-label="Switch"
        onClick={() => setIsRight(!isRight)}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
        w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center"
        whileTap={{ scale: 0.9 }}
      >
        <motion.div
          animate={{ rotate: isRight ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 10 }}
        >
          <ChevronRight className="w-6 h-6 text-yellow-500" />
        </motion.div>
      </motion.button>
    </div>
  );
};

export default BusinessPanel;

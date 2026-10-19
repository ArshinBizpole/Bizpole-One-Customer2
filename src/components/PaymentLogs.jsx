import { motion } from "framer-motion";
import { FaCcVisa, FaCcMastercard, FaGooglePay } from "react-icons/fa";
import { SiPhonepe, SiPaytm } from "react-icons/si";

// Payment methods customers can actually use — Bizpole collects through
// Easebuzz (UPI, cards, net banking). No Klarna / Affirm / Stripe / Apple Pay.
const badge = (text, cls) => (
  <span className={`text-sm sm:text-base font-semibold px-3 py-1 rounded ${cls}`}>{text}</span>
);

const PAYMENT_METHODS = [
  { key: "upi", icon: badge("UPI", "bg-green-50 text-green-700 border border-green-200") },
  { key: "gpay", icon: <FaGooglePay className="text-gray-800" /> },
  { key: "phonepe", icon: <SiPhonepe className="text-[#5F259F]" /> },
  { key: "paytm", icon: <SiPaytm className="text-[#00BAF2]" /> },
  { key: "visa", icon: <FaCcVisa className="text-blue-700" /> },
  { key: "mastercard", icon: <FaCcMastercard className="text-red-500" /> },
  { key: "rupay", icon: badge("RuPay", "bg-orange-50 text-[#0B2D6B] border border-orange-200") },
  { key: "netbanking", icon: badge("Net Banking", "bg-gray-100 text-gray-800") },
];

const PaymentLogs = () => {
  // Repeated so the strip scrolls as a seamless loop.
  const marqueeItems = Array.from({ length: 10 }, () => PAYMENT_METHODS).flat();

  return (
    <section className="w-full overflow-hidden py-8 bg-[#f7f5f0]">
      <p className="text-center text-xs sm:text-sm font-semibold tracking-widest uppercase text-gray-400 mb-4">
        Pay securely with
      </p>
      <motion.div
        className="flex gap-10 sm:gap-14 md:gap-20"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ repeat: Infinity, duration: 50, ease: "linear" }}
      >
        {marqueeItems.map(({ icon, key }, i) => (
          <motion.div
            key={key + i}
            whileHover={{ scale: 1.15 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="text-3xl sm:text-4xl md:text-5xl flex items-center flex-none"
          >
            {icon}
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

export default PaymentLogs;

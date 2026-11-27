import { motion } from "framer-motion";
import { CreditCard, Lock } from "lucide-react";

const Payment = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2"
      >
        {/* Left Side - Order Details */}
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="p-8 md:p-12"
        >
          <img src="/Images/logo.webp" alt="Bizpole Logo" className="h-13" /> <br />

          <div className="mt-6 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Order No: #35264555</h3>
            <select className="border border-gray-300 rounded-md px-2 py-1 text-sm">
              <option>USD</option>
              <option>EUR</option>
              <option>INR</option>
            </select>
          </div>

          {/* Items */}
          <div className="mt-8 space-y-4 text-gray-700">
            {[
              { label: "Item", price: "$12" },
              { label: "Item", price: "$50" },
              { label: "Item", price: "$25" },
              { label: "Item", price: "$50" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex justify-between border-b border-dotted pb-1"
              >
                <span>{item.label}</span>
                <span>{item.price}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 space-y-3 text-gray-800">
            <div className="flex justify-between border-t pt-2">
              <span>Sub Total</span>
              <span>$137</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (6%)</span>
              <span>$8.22</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Total</span>
              <span>$145.22</span>
            </div>
          </div>

          <p className="mt-6 text-xs text-gray-500 leading-relaxed">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
        </motion.div>

        {/* Right Side - Payment Form */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="bg-yellow-400 p-8 md:p-12 flex flex-col justify-center relative"
        >
          {/* Card Preview */}
          <div className="bg-black text-white p-6 rounded-xl w-100 h-40 shadow-lg mb-10">
            <p className="tracking-widest text-lg">6037 9975 9598 3090</p>
            <p className="mt-4 text-sm">Soorouh Nasrpour</p>
          </div>

          {/* Form */}
          <div className="space-y-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Cardholder Name"
                className="w-full px-4 py-2 rounded-md border border-gray-300 bg-white shadow-xl"
              />
            </div>

            <div className="relative">
              <CreditCard className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Card Number"
                className="w-full pl-10 px-4 py-2 rounded-md border border-gray-300 bg-white shadow-xl"
              />
            </div>

            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Expiration date"
                className="w-1/2 px-4 py-2 rounded-md border border-gray-300 bg-white shadow-xl"
              />
              <div className="relative w-1/2">
                <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Security Code"
                  className="w-full pl-10 px-4 py-2 rounded-md border border-gray-300 bg-white shadow-xl"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-white cursor-pointer hover:bg-yellow-600 text-black font-semibold py-2 rounded-md transition shadow-md"
            >
              Pay Now
            </motion.button>
          </div>

          {/* Terms */}
          <div className="mt-6 flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" id="terms" />
            <label htmlFor="terms">I Agree to Terms & Conditions</label>
          </div>

          <p className="mt-6 text-xs text-gray-700 leading-relaxed">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Payment;

// 📁 src/components/ProductList.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaExternalLinkAlt } from "react-icons/fa";

// ── Helper ────────────────────────────────────────────────────────────────────
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
}

// ═══════════════════════════════════════════════════════════════════════════════
const ProductList = () => {
  const [products, setProducts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    import("../../api/Products").then(({ getProducts }) => {
      getProducts()
        .then((data) => setProducts(data.products || data || []))
        .catch(() => setProducts([]))
        .finally(() => setLoading(false));
    });
  }, []);

  return (
    <>
      <div className="product-page mt-4">
        {/* ── Header ── */}
        <section className="pt-24 pb-4 px-4 text-center bg-[#f4f4f2]">
          {/* Badge */}
          <motion.div
            className="inline-flex items-center mt-10 gap-2 px-4 py-1.5 mb-8 bg-white border border-yellow-200 rounded-full text-xs font-medium text-gray-700 shadow-sm"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <svg className="w-3.5 h-3.5 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 6.9L21 11l-6.6 2.1L12 20l-2.4-6.9L3 11l6.6-2.1L12 2z" />
            </svg>
            Powerful SaaS Solutions
          </motion.div>

          <motion.h1
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            Transform Your Business with Our{" "}
            <span className="text-yellow-400">Products</span>
          </motion.h1>

          <motion.p
            className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.7 }}
          >
            Discover our suite of enterprise-grade SaaS products designed to
            streamline operations, boost productivity, and drive growth. From
            CRM to analytics, we've got you covered.
          </motion.p>
        </section>

        {/* ── Products ── */}
        <section className="pt-16 pb-28 px-4 mx-auto bg-[#f4f4f2]">
          <div className="max-w-5xl mx-auto">
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <motion.div
                  className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span className="ml-4 text-yellow-500 font-semibold text-lg">Loading products...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <h3 className="text-2xl font-bold text-gray-700 mb-2">No products found</h3>
                <p className="text-gray-500">No products available at the moment.</p>
              </div>
            ) : (
              <motion.div
                className="space-y-12"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { staggerChildren: 0.18, delayChildren: 0.1 } },
                }}
              >
                <AnimatePresence>
                  {products.map((product, idx) => {
                    const name = product.name || product.ProductName;
                    const description =
                      product.description || product.Description || "No description available.";
                    const link = /journl/i.test(name || "")
                      ? "https://www.getjournl.com/"
                      : product.url || product.link || product.product_url || product.ProductUrl;

                    return (
                      <motion.div
                        key={product.id || idx}
                        data-cursor-hover
                        className="flex flex-col md:flex-row bg-white rounded-2xl border border-gray-300 shadow-[0_10px_40px_rgba(0,0,0,0.06)] overflow-hidden hover:shadow-[0_16px_50px_rgba(0,0,0,0.1)] transition-shadow duration-300"
                        initial={{ opacity: 0, y: 40, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.98 }}
                        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                      >
                        {/* Product Image */}
                        <div className="w-full md:w-2/5 bg-gray-50 flex items-center justify-center p-10 md:p-12 md:min-h-[20rem]">
                          {product.icon_url?.data && Array.isArray(product.icon_url.data) ? (
                            <img
                              src={`data:image/png;base64,${arrayBufferToBase64(product.icon_url.data)}`}
                              alt={name}
                              className="max-w-full max-h-44 object-contain"
                            />
                          ) : product.image ? (
                            <img
                              src={product.image}
                              alt={name}
                              className="max-w-full max-h-44 object-contain"
                            />
                          ) : (
                            <div className="w-full h-40 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 flex items-center justify-center">
                              <span className="text-gray-400 text-lg">No image</span>
                            </div>
                          )}
                        </div>

                        {/* Product Content */}
                        <div className="w-full md:w-3/5 p-8 md:p-12 flex flex-col justify-center">
                          <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">
                            {name}
                          </h3>

                          {link && (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="self-start inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-[#FFFBEA] border border-[#F3C625] text-sm font-semibold text-gray-800 shadow-sm hover:bg-[#F3C625] hover:text-black transition-all break-all"
                            >
                              {link.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                              <FaExternalLinkAlt className="text-xs text-[#CA8A04]" />
                            </a>
                          )}

                          <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wide mb-3">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <path d="M14 2v6h6" />
                              <path d="M16 13H8M16 17H8M10 9H8" />
                            </svg>
                            Description
                          </div>
                          <p className="text-gray-500 text-sm md:text-base leading-relaxed">
                            {description}
                          </p>

                          {product.price && (
                            <div className="text-yellow-500 font-bold text-xl mt-6">
                              ₹{product.price}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default ProductList;
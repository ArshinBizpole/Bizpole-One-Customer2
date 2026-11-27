import { motion, useScroll, useSpring } from "framer-motion";

// One shared scroll animation for the site: content fades up gently the first
// time it enters the viewport. Keep it subtle — same distance, same easing
// everywhere, so the page feels calm and consistent.
const EASE = [0.22, 1, 0.36, 1];

export const Reveal = ({ as = "div", delay = 0, y = 24, className = "", children, ...rest }) => {
  const Tag = motion[as];
  return (
    <Tag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  );
};

// Parent + child pair for lists and card grids: children appear one after another.
export const RevealGroup = ({ as = "div", stagger = 0.08, className = "", children, ...rest }) => {
  const Tag = motion[as];
  return (
    <Tag
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export const RevealItem = ({ as = "div", className = "", children, ...rest }) => {
  const Tag = motion[as];
  return (
    <Tag
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
      }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  );
};

// Thin brand-yellow bar along the top edge showing how far down the page you are.
export const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX, transformOrigin: "0% 50%" }}
      className="fixed top-0 left-0 right-0 h-[3px] bg-[#F5C518] z-[60] pointer-events-none"
    />
  );
};

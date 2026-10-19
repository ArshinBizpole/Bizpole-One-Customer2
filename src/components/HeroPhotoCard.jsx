import { motion } from "framer-motion";
import startBusinessHero from "../assets/images/startbusiness-hero.jpg";

// Hero photo for the yellow side panel of the /startbusiness flow screens —
// the photo exactly as supplied, centred in the panel.
const HeroPhotoCard = ({ width = "92%", maxWidth = 620 }) => (
  <motion.img
    src={startBusinessHero}
    alt="Entrepreneur using Bizpole One on a laptop"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    style={{
      position: "relative", zIndex: 2,
      display: "block", width, maxWidth, height: "auto",
      borderRadius: 16,
    }}
  />
);

export default HeroPhotoCard;

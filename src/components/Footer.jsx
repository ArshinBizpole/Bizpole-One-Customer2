import { FaFacebookF, FaLinkedinIn, FaInstagram, FaYoutube, FaPhoneAlt, FaEnvelope, FaMapMarkerAlt } from "react-icons/fa";
import { Link } from "react-router-dom";

// Contact details and social links as published on https://www.bizpole.in/.
const SOCIAL_LINKS = [
  { href: "https://www.facebook.com/bizpolebusinessconsulting", label: "Facebook", icon: FaFacebookF },
  { href: "https://www.linkedin.com/company/56406685/", label: "LinkedIn", icon: FaLinkedinIn },
  { href: "https://www.instagram.com/bizpole_/", label: "Instagram", icon: FaInstagram },
  { href: "https://www.youtube.com/@bizpole3483", label: "YouTube", icon: FaYoutube },
];

const QUICK_LINKS = [
  { to: "/services", label: "Services" },
  { to: "/startbusiness", label: "Start a Business" },
  { to: "/bizpoleone", label: "Bizpole One" },
  { to: "/partners", label: "Partners" },
  { to: "/trademark-search", label: "Trademark Search" },
];

const LEGAL_LINKS = [
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/terms-and-conditions", label: "Terms and Conditions" },
  { to: "/cancellation-refund-policy", label: "Cancellation and Refund Policy" },
];

export default function Footer() {
  return (
    <footer className="bg-[#f7f5f0] text-gray-900 py-12">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1.1fr] gap-10 lg:gap-16">

        {/* Device preview + social */}
        <div className="flex flex-col items-start gap-8">
          <img
            src="/Images/footer-devices.png"
            alt="Bizpole on laptop and mobile"
            loading="lazy"
            className="w-full max-w-[300px] h-auto"
          />
          <div className="flex gap-3 pl-8">
            {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:bg-[#F5C518] transition"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-lg lg:text-xl font-semibold mb-6">Quick Links</h3>
          <ul className="space-y-4 text-base lg:text-lg text-gray-500">
            {QUICK_LINKS.map(({ to, label }) => (
              <li key={to}><Link to={to} className="hover:text-gray-900 transition">{label}</Link></li>
            ))}
          </ul>
        </div>

        {/* Licence */}
        <div>
          <h3 className="text-lg lg:text-xl font-semibold mb-6">Licence</h3>
          <ul className="space-y-4 text-base lg:text-lg text-gray-500">
            {LEGAL_LINKS.map(({ to, label }) => (
              <li key={to}><Link to={to} className="hover:text-gray-900 transition">{label}</Link></li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-lg lg:text-xl font-semibold mb-6">Contact</h3>
          <ul className="space-y-5 text-base lg:text-lg text-gray-600">
            <li className="flex items-center gap-3">
              <FaPhoneAlt className="text-base text-gray-900" />
              <a href="tel:+919539995533" className="hover:text-gray-900 transition">+91 95399 95533</a>
            </li>
            <li className="flex items-center gap-3">
              <FaEnvelope className="text-base text-gray-900" />
              <a href="mailto:info@bizpole.in" className="hover:text-gray-900 transition">info@bizpole.in</a>
            </li>
            <li className="flex items-center gap-3">
              <FaMapMarkerAlt className="text-base text-gray-900" />
              <span>Bangalore | Kerala</span>
            </li>
          </ul>
        </div>

      </div>
      <p className="max-w-[1600px] mx-auto px-6 md:px-12 mt-10 text-sm text-gray-500">
        Copyright © {new Date().getFullYear()} Bizpole
      </p>
    </footer>
  );
}

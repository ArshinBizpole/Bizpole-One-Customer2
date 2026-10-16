import { FaFacebookF, FaLinkedinIn, FaInstagram } from "react-icons/fa";
import { FiPhone, FiMail, FiMapPin } from "react-icons/fi";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-gray-100 text-gray-800 py-10 ">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">

        {/* Social Links */}
        <div className="flex flex-col items-start space-y-4">
          <div className="flex space-x-4">
            <a href="#" className="p-2 rounded-full border border-gray-400 hover:bg-gray-200 transition">
              <FaFacebookF />
            </a>
            <a href="#" className="p-2 rounded-full border border-gray-400 hover:bg-gray-200 transition">
              <FaLinkedinIn />
            </a>
            <a href="#" className="p-2 rounded-full border border-gray-400 hover:bg-gray-200 transition">
              <FaInstagram />
            </a>
          </div>
        </div>

        {/* Navigation */}
        <div>
          <h3 className="font-semibold mb-4">Navigation</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><a href="#" className="hover:text-black">Service</a></li>
            <li><a href="#" className="hover:text-black">Agency</a></li>
            <li><a href="#" className="hover:text-black">Case Study</a></li>
            <li><a href="#" className="hover:text-black">Resource</a></li>
          </ul>
        </div>

        {/* Licence */}
        <div>
          <h3 className="font-semibold mb-4">Licence</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><Link to="/privacy-policy" className="hover:text-black">Privacy Policy</Link></li>
            <li><Link to="/terms-and-conditions" className="hover:text-black">Terms and Conditions</Link></li>
            <li><Link to="/cancellation-refund-policy" className="hover:text-black">Cancellation and Refund Policy</Link></li>
            <li><a href="#" className="hover:text-black">Copyright</a></li>
            <li><a href="#" className="hover:text-black">Email Address</a></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="font-semibold mb-4">Contact</h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <FiPhone /> <span>(406) 555-0120</span>
            </li>
            <li className="flex items-center gap-2">
              <FiMail /> <span>bizpole@india.com</span>
            </li>
            <li className="flex items-center gap-2">
              <FiMapPin /> <span>palakkad</span>
            </li>
          </ul>
        </div>

      </div>
    </footer>
  );
}

import { Link } from "react-router-dom";

// Shown for any URL that matches no route (previously a blank page).
const NotFound = () => (
  <div className="min-h-[60vh] flex items-center justify-center px-4 py-24">
    <div className="text-center max-w-md">
      <p className="text-6xl font-extrabold text-[#F3C625]">404</p>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 text-sm text-gray-500">
        The page you're looking for doesn't exist or has moved.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className="px-5 py-2.5 rounded-full bg-[#F3C625] text-black text-sm font-semibold hover:bg-[#e0b420]">
          Go to home
        </Link>
        <Link to="/services" className="px-5 py-2.5 rounded-full border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Browse services
        </Link>
      </div>
    </div>
  </div>
);

export default NotFound;

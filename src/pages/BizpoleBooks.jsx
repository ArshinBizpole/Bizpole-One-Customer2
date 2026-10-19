import { useEffect } from "react";
import { JOURNL_URL } from "../utils/externalLinks";

// Journl (Bizpole Books) is its own site and is no longer shown inside the
// portal — links open it in a new tab. This route only catches old bookmarks to
// /dashboard/books and sends them there.
const BizpoleBooks = () => {
  useEffect(() => {
    window.location.replace(JOURNL_URL);
  }, []);
  return (
    <div className="p-8 text-center text-sm text-gray-500">
      Opening Journl… <a href={JOURNL_URL} className="underline">Continue</a>
    </div>
  );
};

export default BizpoleBooks;

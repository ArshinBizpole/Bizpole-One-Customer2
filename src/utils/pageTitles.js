// Browser-tab / Google title, search-result description and indexing rule for
// each route (applied in App.jsx). First match wins, so more specific paths
// come before their parents. Signed-in and token pages are noindex.
const BRAND = "Bizpole";
const SITE = "https://www.bizpole.io";
const DEFAULT_DESCRIPTION =
  "Bizpole helps Indian businesses start, run and grow — company registration, GST, trademark, licences and compliance, handled online by experts.";

const PAGES = [
  [/^\/$/, "Business Registration, GST & Trademark Online in India",
    "Register your company, get GST, file your trademark and stay compliant — all online with Bizpole. Transparent pricing, expert support, track everything in one dashboard."],
  [/^\/trademark-search/, "Free Trademark Search India – Check Brand Name Availability",
    "Check if your brand name or logo is already registered or applied for in India. Search the trademark registry by brand name, owner, application number or logo, filtered by class — free on Bizpole."],
  [/^\/bizpoleone/, "Bizpole One – Your Business Compliance Dashboard",
    "Bizpole One brings your registrations, filings, documents, orders and payments into one dashboard, so you always know what's done and what's due."],
  [/^\/contact/, "Contact Us",
    "Talk to a Bizpole advisor about company registration, GST, trademark or compliance. Call +91 95399 95533 or send us a message."],
  [/^\/startbusiness\/apply/, "Apply Online"],
  [/^\/startbusiness\/about/, "Tell Us About Your Business"],
  [/^\/startbusiness\/subscriptions/, "Subscriptions"],
  [/^\/startbusiness/, "Start a Business – Company Registration Online",
    "Start your business the right way: Private Limited, LLP, OPC, partnership or proprietorship registration, GST and trademark — apply online with Bizpole."],
  [/^\/services\/[^/]+/, "Service Details"],
  [/^\/services/, "Business Registration & Compliance Services",
    "Explore Bizpole's services — company and LLP registration, GST, trademark, licences, accounting and annual compliance — with clear pricing for your state."],
  [/^\/products/, "Products – Bizpole Books & Bizpole One",
    "Bizpole Books for accounting and Bizpole One for compliance — the tools that help Indian small businesses run smoothly."],
  [/^\/partners/, "Become a Partner",
    "Partner with Bizpole: refer clients for registrations and compliance and earn on every successful service."],
  [/^\/quiz/, "Which Business Structure Is Right for You?",
    "Answer a few quick questions to find the right business structure — Private Limited, LLP, OPC, partnership or proprietorship."],
  [/^\/existing-companies/, "Services for Existing Companies"],
  [/^\/privacy-policy/, "Privacy Policy"],
  [/^\/terms-and-conditions/, "Terms & Conditions"],
  [/^\/cancellation-refund-policy/, "Cancellation & Refund Policy"],
  [/^\/partner-privacy-policy/, "Partner Privacy Policy"],
  [/^\/partner-terms-and-conditions/, "Partner Terms & Conditions"],
  [/^\/partner-referral-conduct-policy/, "Partner Referral Conduct Policy"],
  [/^\/partner-cancellation-refund-policy/, "Partner Cancellation & Refund Policy"],
  [/^\/affiliate\/dashboard/, "Affiliate Dashboard", null, true],
  [/^\/affiliate/, "Affiliate Programme",
    "Join the Bizpole affiliate programme and earn by referring businesses for registration and compliance services."],
  [/^\/questions/, "Questions", null, true],
  [/^\/r\//, "Referral", null, true],
  [/^\/trademark-report/, "Trademark Report", null, true],
  [/^\/wa-login/, "Sign In", null, true],
  [/^\/checking/, "Checking", null, true],
  [/^\/profile/, "My Profile", null, true],
  [/^\/dashboard\/bizpoleone\/trademark-search/, "Dashboard · Trademark Search", null, true],
  [/^\/dashboard\/bizpoleone\/orders/, "Dashboard · Orders", null, true],
  [/^\/dashboard\/bizpoleone\/services/, "Dashboard · Services", null, true],
  [/^\/dashboard\/bizpoleone\/tasks/, "Dashboard · Tasks", null, true],
  [/^\/dashboard\/bizpoleone\/billing/, "Dashboard · Billing", null, true],
  [/^\/dashboard\/bizpoleone\/support/, "Dashboard · Support", null, true],
  [/^\/dashboard\/bizpoleone\/referrals/, "Dashboard · Referrals", null, true],
  [/^\/dashboard/, "Dashboard", null, true],
  [/^\/associate/, "Associate Portal", null, true],
];

// { title, description, canonical, noindex } for a pathname.
export const pageMetaFor = (pathname) => {
  const hit = PAGES.find(([re]) => re.test(pathname));
  const path = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  return {
    title: hit ? `${hit[1]} | ${BRAND}` : BRAND,
    description: hit?.[2] || DEFAULT_DESCRIPTION,
    canonical: `${SITE}${path}`,
    noindex: !!hit?.[3],
  };
};

const setMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

// Writes the route's title, description, canonical, Open Graph tags and robots
// rule into <head> (Google renders the app, so it reads these per page).
export const applyPageMeta = (pathname) => {
  const meta = pageMetaFor(pathname);
  document.title = meta.title;
  setMeta("name", "description", meta.description);
  setMeta("name", "robots", meta.noindex ? "noindex, nofollow" : "index, follow");
  setMeta("property", "og:title", meta.title);
  setMeta("property", "og:description", meta.description);
  setMeta("property", "og:url", meta.canonical);
  setMeta("name", "twitter:title", meta.title);
  setMeta("name", "twitter:description", meta.description);
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", meta.canonical);
  return meta;
};

// Sample MarkSimpl results in the shape our server proxy returns
// (Bizpole-One-Server › trademarkSearch.service.js › normalize), used while the
// live API key isn't wired up. Switch off with USE_DUMMY_TRADEMARK_DATA in TrademarkApi.js.

const svg = (body) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60">${body}</svg>`
)}`;

const sunLogo = (text, color) => svg(
  `<path d="M44 26a16 16 0 0 1 32 0z" fill="#f59e0b"/>` +
  `<g stroke="#f59e0b" stroke-width="3" stroke-linecap="round">` +
  `<line x1="60" y1="2" x2="60" y2="7"/><line x1="46" y1="8" x2="49" y2="12"/><line x1="74" y1="8" x2="71" y2="12"/>` +
  `<line x1="38" y1="18" x2="42" y2="20"/><line x1="82" y1="18" x2="78" y2="20"/></g>` +
  `<text x="60" y="46" text-anchor="middle" font-family="Arial" font-weight="700" font-size="17" fill="${color}">${text}</text>`
);

const leafLogo = (text, leaf, color) => svg(
  `<path d="M52 24c0-12 10-20 18-20 0 12-8 20-18 20z" fill="none" stroke="${leaf}" stroke-width="4"/>` +
  `<text x="60" y="46" text-anchor="middle" font-family="Arial" font-weight="700" font-size="17" fill="${color}">${text}</text>`
);

export const DUMMY_TRADEMARKS = [
  {
    applicationNumber: 6543210,
    wordMark: "SUNLYF",
    classNumber: 30,
    classDetail: "Coffee, tea, cocoa and processed grains.",
    status: "Registered",
    applicationDate: "2024-03-18",
    expireAt: "18/03/2034",
    proprietorName: "Sunlyf Foods Private Limited",
    proprietorAddress: "Kochi, Kerala",
    state: "Kerala",
    country: "India",
    image: sunLogo("SUNLYF", "#14532d"),
    userDetail: "Proposed to be used",
    tmType: "Device",
  },
  {
    applicationNumber: 3210987,
    wordMark: "SunBite",
    classNumber: 30,
    classDetail: "Coffee-based drinks; beverage preparations.",
    status: "Refused",
    applicationDate: "2018-08-01",
    expireAt: null,
    proprietorName: "SunBite Beverages Pvt. Ltd.",
    proprietorAddress: "Bengaluru, Karnataka",
    state: "Karnataka",
    country: "India",
    image: leafLogo("SunBite", "#c2410c", "#9a3412"),
    userDetail: "01/08/2018",
    tmType: "Device",
  },
  {
    applicationNumber: 7896543,
    wordMark: "Sunnify",
    classNumber: 30,
    classDetail: "Herbal tea; grain-based snack foods.",
    status: "Registered",
    applicationDate: "2025-01-09",
    expireAt: "09/01/2035",
    proprietorName: "Sunnify Natural Products LLP",
    proprietorAddress: "Pune, Maharashtra",
    state: "Maharashtra",
    country: "India",
    image: leafLogo("Sunnify", "#4d7c0f", "#14532d"),
    userDetail: "Proposed to be used",
    tmType: "Device",
  },
  {
    applicationNumber: 4561230,
    wordMark: "Sunlio",
    classNumber: 30,
    classDetail: "Cocoa products; confectionery.",
    status: "Refused",
    applicationDate: "2020-03-12",
    expireAt: null,
    proprietorName: "Sunlio India Private Limited",
    proprietorAddress: "Chennai, Tamil Nadu",
    state: "Tamil Nadu",
    country: "India",
    image: sunLogo("Sunlio", "#111827"),
    userDetail: "12/03/2020",
    tmType: "Device",
  },
];

// Mimics the proxy's paged response: { count, limit, offset, results, hasMore }.
export function dummyTrademarkSearch({ classes = [], limit = 10, offset = 0 }) {
  const wanted = classes.map(Number);
  const all = wanted.length
    ? DUMMY_TRADEMARKS.filter((t) => wanted.includes(t.classNumber))
    : DUMMY_TRADEMARKS;
  const results = all.slice(offset, offset + limit);
  return new Promise((resolve) =>
    setTimeout(() => resolve({
      count: all.length,
      limit,
      offset,
      results,
      hasMore: offset + results.length < all.length,
    }), 400)
  );
}

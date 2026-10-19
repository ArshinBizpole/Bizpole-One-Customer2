// State -> languages, same data as the CRM's Lead form (Bizpole-One-Client
// src/data/StatesandDistrict[1].json). Picking a State limits Preferred
// Language to that state's languages; the first one is its main language.
const STATE_LANGUAGES = {
  "andhra pradesh": ["Telugu", "English", "Hindi"],
  "arunachal pradesh": ["English", "Hindi"],
  "assam": ["Assamese", "English", "Hindi"],
  "bihar": ["Hindi", "English"],
  "chandigarh": ["English", "Hindi"],
  "chhattisgarh": ["Hindi", "English"],
  "dadra and nagar haveli": ["Gujarati", "Hindi", "English"],
  "daman and diu": ["Gujarati", "Hindi", "English"],
  "dadra and nagar haveli and daman and diu": ["Gujarati", "Hindi", "English"],
  "delhi": ["Hindi", "English"],
  "goa": ["Konkani", "English", "Hindi"],
  "gujarat": ["Gujarati", "English", "Hindi"],
  "haryana": ["Hindi", "English"],
  "himachal pradesh": ["Hindi", "English"],
  "jammu and kashmir": ["Kashmiri", "English", "Hindi"],
  "jharkhand": ["Hindi", "English"],
  "karnataka": ["Kannada", "English", "Hindi"],
  "kerala": ["Malayalam", "English", "Hindi", "Kannada", "Tamil"],
  "ladakh": ["English", "Hindi"],
  "lakshadweep": ["Malayalam", "English", "Hindi"],
  "madhya pradesh": ["Hindi", "English"],
  "maharashtra": ["Marathi", "English", "Hindi"],
  "manipur": ["Manipuri", "English", "Hindi"],
  "meghalaya": ["English", "Hindi"],
  "mizoram": ["Mizo", "English", "Hindi"],
  "nagaland": ["English", "Hindi"],
  "odisha": ["Odia", "English", "Hindi"],
  "puducherry": ["Tamil", "English", "Hindi"],
  "punjab": ["Punjabi", "English", "Hindi"],
  "rajasthan": ["Hindi", "English"],
  "sikkim": ["Nepali", "English", "Hindi"],
  "tamil nadu": ["Tamil", "English", "Hindi"],
  "telangana": ["Telugu", "English", "Hindi"],
  "tripura": ["Bengali", "English", "Hindi"],
  "uttar pradesh": ["Hindi", "English"],
  "uttarakhand": ["Hindi", "English"],
  "west bengal": ["Bengali", "English", "Hindi"],
  // Not in the CRM file.
  "andaman and nicobar islands": ["English", "Hindi"],
};

// Every language above — used before a State is picked (or for "Other").
export const ALL_LANGUAGES = [...new Set(Object.values(STATE_LANGUAGES).flat())].sort();

// "Delhi (National Capital Territory)" -> "delhi".
const norm = (s) => String(s || "").replace(/\(.*?\)/g, "").trim().toLowerCase();

export function languagesForState(state) {
  return STATE_LANGUAGES[norm(state)] || ALL_LANGUAGES;
}

// Language to keep after the State changes: the current one if that state
// still offers it, else the state's main language.
export function languageForState(state, current) {
  const list = languagesForState(state);
  const keep = list.find((l) => l.toLowerCase() === String(current || "").toLowerCase());
  return keep || (STATE_LANGUAGES[norm(state)] ? list[0] : current || "");
}

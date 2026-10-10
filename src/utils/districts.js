import locationData from "./statesAndDistricts.json";

// Same state → district source AddCompanyModal uses. State names come from the
// DB (`indiastates.state_name`, e.g. "Delhi") or the static STATES list, which
// don't always match the JSON's spelling ("Delhi (National Capital
// Territory)") — so compare loosely.
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z]+/g, " ")
    .trim();

// District names for a state, or [] when unknown (caller falls back to text).
export function districtsFor(stateName) {
  const n = norm(stateName);
  if (!n) return [];
  const states = locationData.states || [];
  const st = states.find((s) => norm(s.stateName) === n) || states.find((s) => norm(s.stateName).includes(n));
  return st ? st.districts.map((d) => d.districtName) : [];
}

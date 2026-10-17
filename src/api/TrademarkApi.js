import { api } from "./axiosInstance";

// Public proxy to the MarkSimpl trademark search API (server: /api/trademark/search).
// type: WORD_MARK | PROPRIETOR_NAME | APPLICATION_NUMBER
// track: save the search to the signed-in customer's history and count it
// against their free searches (Trademark Search page only). The result then
// carries `usage` ({ used, limit, historyId }); over the limit the call fails
// with a 429 whose body has limitReached: true.
export const searchTrademarks = async ({ q, type = "WORD_MARK", classes = [], limit = 10, offset = 0, track = false }) => {
  const { data } = await api.get("/api/trademark/search", {
    params: {
      q,
      type,
      classes: classes.length ? classes.join(",") : undefined,
      limit,
      offset,
      track: track ? 1 : undefined,
    },
  });
  return data.usage ? { ...data.data, usage: data.usage } : data.data;
};

// Signed-in customer's saved searches: { signedIn, items, usage: { used, limit } }.
export const getTrademarkSearchHistory = async () => {
  const { data } = await api.get("/api/trademark/history");
  return data;
};

// One saved search with its results, for re-downloading its report.
export const getTrademarkSearchHistoryEntry = async (id) => {
  const { data } = await api.get(`/api/trademark/history/${id}`);
  return data.data;
};

// Company-registration name availability: MCA company register + trademark
// registry together (server: /api/trademark/name-check). Signed-in customers
// only — without a session it resolves { signInRequired: true }.
// Data: { status: available|similar|not_suitable, note, companies[], trademarks[] }.
export const checkBusinessName = async (name) => {
  const { data } = await api.get("/api/trademark/name-check", { params: { name } });
  return data.signInRequired ? { signInRequired: true } : data.data;
};

// Marks in these states no longer block a new filing.
const DEAD_STATUS = /(abandoned|refused|withdrawn|removed|expired|rejected)/i;
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function similarity(mark, name) {
  const a = norm(mark);
  const b = norm(name);
  if (!a || !b) return "Similar";
  if (a === b) return "Identical";
  if (a.includes(b) || b.includes(a)) return "Highly Similar";
  return "Similar";
}

const SIMILARITY_RANK = { Identical: 0, "Highly Similar": 1, Similar: 2 };

// Registration-flow search: live marks similar to `name`, in the flow's
// { mark, class, status, similarity, owner } shape (see tmRiskLevel).
// tmClass is the flow's "Class 35 — …" label; "Not sure — advise me" searches all classes.
export async function runTrademarkSearch(name, tmClass) {
  const classNo = Number((String(tmClass || "").match(/^Class (\d+)/) || [])[1]);
  const data = await searchTrademarks({ q: name, classes: classNo ? [classNo] : [], limit: 20 });
  return (data?.results || [])
    .filter((r) => !DEAD_STATUS.test(r.status || ""))
    .map((r) => ({
      mark: r.wordMark || "(Device mark)",
      class: r.classNumber != null ? `Class ${r.classNumber}` : "—",
      status: r.status || "—",
      similarity: similarity(r.wordMark, name),
      owner: r.proprietorName || "—",
      applicationNumber: r.applicationNumber,
    }))
    .sort((x, y) => SIMILARITY_RANK[x.similarity] - SIMILARITY_RANK[y.similarity]);
}

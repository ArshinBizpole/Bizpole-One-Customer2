import axios from "axios";

// Plain client (no token): the reviews endpoint is public.
const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL, timeout: 15000 });

/**
 * Active client reviews for the home page carousel, in admin display order
 * (managed in admin Settings → Customer Reviews). Never throws: any failure
 * returns [] so the section simply hides.
 * @returns {Promise<Array<{ReviewID:number, ClientName:string, CompanyName:string|null,
 *   ServicesTaken:string|null, ReviewText:string, PhotoUrl:string|null}>>}
 */
export async function fetchPublicReviews() {
  try {
    const { data } = await client.get("/api/customer-reviews/public");
    return Array.isArray(data?.data) ? data.data : [];
  } catch (err) {
    console.error("Failed to load customer reviews:", err?.message);
    return [];
  }
}

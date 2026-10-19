import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Star, TrendingUp } from "lucide-react";
import useSelectedCompany from "../../hooks/useSelectedCompany";
import { getRecommendations } from "../../api/DashboardApi";

// Last slides shown per company, so a repeat visit paints the banner at once while the
// request refreshes it (instead of the banner popping in and pushing the page down).
const CACHE_KEY = "dashboardBannerSlides";
const readCache = (companyId) => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}")[companyId] ?? null;
  } catch {
    return null;
  }
};
const writeCache = (companyId, slides) => {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    all[companyId] = slides;
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch {
    // cache is best-effort
  }
};

// Slides come from /dashboard/recommendations: published announcements first, then the
// services recommended for this company. No slides → the banner isn't shown.
const FeaturedCarousel = () => {
  const { companyId } = useSelectedCompany();
  const navigate = useNavigate();
  const [slides, setSlides] = useState(() => (companyId ? readCache(companyId) : null)); // null = loading
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!companyId) {
      setSlides([]);
      return;
    }
    setSlides(readCache(companyId));
    setIndex(0);
    let cancelled = false;
    getRecommendations(companyId).then((res) => {
      if (cancelled) return;
      if (!res.success) {
        setSlides((prev) => prev ?? []);
        return;
      }
      const news = (res.data.news || []).map((n) => ({
        key: `news-${n.id}`,
        tag: n.tag || "News",
        title: n.title,
        body: n.body,
      }));
      const recommended = (res.data.recommended || []).map((r) => ({
        key: `rec-${r.title}`,
        tag: "Recommended",
        title: r.title,
        // "Contact us" isn't a price — leave it off the banner.
        body: [r.sub, r.price && r.price !== "Contact us" && `${r.price}${r.note ? ` ${r.note}` : ""}`]
          .filter(Boolean)
          .join(" · "),
        cta: { label: "Get Started", to: "/dashboard/bizpoleone/pricing" },
      }));
      const next = [...news, ...recommended];
      setSlides(next);
      setIndex((i) => (i < next.length ? i : 0));
      writeCache(companyId, next);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const count = slides?.length || 0;
  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 7000);
    return () => clearInterval(t);
  }, [count]);

  // First visit for this company: hold the banner's space while it loads.
  if (slides === null) {
    return <div className="h-[196px] animate-pulse rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200/70" />;
  }
  if (slides.length === 0) return null;
  const slide = slides[index];
  const go = (step) => setIndex((i) => (i + step + slides.length) % slides.length);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E9B92F] via-[#D9A520] to-[#B8860B] px-6 py-8 text-white shadow-md sm:px-12 sm:py-10">
      {/* soft decorative glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-black/5" />

      <div className="relative flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-white" />
            <span className="rounded bg-white/20 px-2 py-0.5 text-[11px] font-medium">{slide.tag}</span>
          </div>
          <h2 className="mt-3 text-2xl font-medium sm:text-3xl">{slide.title}</h2>
          {slide.body && <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">{slide.body}</p>}
          {slide.cta && (
            <button
              type="button"
              onClick={() => navigate(slide.cta.to)}
              className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50"
            >
              {slide.cta.label} <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="hidden h-28 w-28 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/10 md:flex">
          <TrendingUp className="h-12 w-12" />
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-800 shadow"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-800 shadow"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default FeaturedCarousel;

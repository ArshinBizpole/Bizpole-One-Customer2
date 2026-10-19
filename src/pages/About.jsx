import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Zap, Lock, Crosshair, Handshake, BarChart3, Lightbulb,
  Target, Users, MapPin, Trophy, FileCheck2, Settings,
} from "lucide-react";
import { STATS } from "../data/siteStats";

// Awards & Accolades (confirmed by the business, 19 Oct 2026). The section renders
// only when this list has entries: { title, issuer, year, icon } (a lucide icon).
const AWARDS = [
  { title: "Best Startup of the Year", issuer: "Kerala Government", year: 2019, icon: Trophy },
  { title: "Excellence in Compliance", issuer: "NASSCOM", year: 2022, icon: FileCheck2 },
  { title: "Top 50 LegalTech Firms", issuer: "Inc42 Magazine", year: 2021, icon: BarChart3 },
  { title: "Best FinTech Enabler", issuer: "Startup India", year: 2023, icon: Settings },
];

// Cut-out team photo shown over the hero's yellow shape. The hero still reads
// correctly without it (the image hides itself if the file is missing).
const HERO_IMAGE = "/Images/bizpole-one-hero-team.png";

const fmt = (n) => n.toLocaleString("en-IN");

// ── Animated Counter ──────────────────────────────────────────────────────────
function Counter({ to }) {
  const ref = useRef(null);
  // Bottom-only margin: a side margin would hide the narrow "0" span in a
  // left-hand column on phones, so the count would never start.
  const inView = useInView(ref, { once: true, margin: "0px 0px -80px 0px" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const end = parseFloat(to);
    const dur = 1800, step = 16;
    const inc = end / (dur / step);
    const t = setInterval(() => {
      start += inc;
      if (start >= end) { setVal(end); clearInterval(t); }
      else setVal(start);
    }, step);
    return () => clearInterval(t);
  }, [inView, to]);
  return <span ref={ref}>{fmt(Math.floor(val))}</span>;
}

// ── Motion helpers ────────────────────────────────────────────────────────────
const ease = [0.16, 1, 0.3, 1];
const reveal = (delay = 0, y = 30) => ({
  initial: { opacity: 0, y },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { delay, duration: 0.7, ease },
});

function ValueCard({ v, i }) {
  return (
    <motion.div className="bo-value-card" {...reveal(i * 0.08)}>
      <div className="bo-icon-tile"><v.icon size={20} strokeWidth={2.2} color="#F5B800" /></div>
      <div className="bo-value-dash" />
      <div className="bo-value-title">{v.title}</div>
      <div className="bo-value-desc">{v.desc}</div>
    </motion.div>
  );
}

// Curved connector drawn between two value cards (desktop only).
function Connector({ from = 70, to = 40 }) {
  return (
    <div className="bo-connector" aria-hidden="true">
      <svg viewBox="0 0 60 100" preserveAspectRatio="none">
        <path
          d={`M0 ${from} C 30 ${from}, 30 ${to}, 60 ${to}`}
          fill="none" stroke="#c7cbd6" strokeWidth="1.4" vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="bo-connector-dot" style={{ top: `${from}%` }} />
    </div>
  );
}

// Laurel seal for the Awards section.
function AwardBadge({ award }) {
  const Icon = award.icon || Trophy;
  const scallop = (r, bumps, depth) => {
    const pts = [];
    for (let i = 0; i <= 360; i += 3) {
      const a = (i * Math.PI) / 180;
      const rr = r + depth * Math.cos(bumps * a);
      pts.push(`${100 + rr * Math.cos(a)},${100 + rr * Math.sin(a)}`);
    }
    return `M${pts.join("L")}Z`;
  };
  // Laurel: leaves along the lower-left arc, mirrored on the right.
  const leaves = [];
  for (let i = 0; i < 9; i++) {
    const ang = 105 + i * 16;
    const rad = (ang * Math.PI) / 180;
    const cx = 100 + 66 * Math.cos(rad);
    const cy = 100 + 66 * Math.sin(rad);
    leaves.push(
      <ellipse key={`l${i}`} cx={cx} cy={cy} rx="3.2" ry="8" transform={`rotate(${ang + 20} ${cx} ${cy})`} fill="url(#bo-gold)" />,
      <ellipse key={`r${i}`} cx={200 - cx} cy={cy} rx="3.2" ry="8" transform={`rotate(${-ang - 20} ${200 - cx} ${cy})`} fill="url(#bo-gold)" />
    );
  }
  return (
    <div className="bo-award">
      <svg viewBox="0 0 200 200" className="bo-award-svg">
        <defs>
          <linearGradient id="bo-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FCE38A" />
            <stop offset="50%" stopColor="#D4A017" />
            <stop offset="100%" stopColor="#F5C518" />
          </linearGradient>
        </defs>
        <path d={scallop(92, 12, 5)} fill="url(#bo-gold)" />
        <path d={scallop(84, 12, 4.5)} fill="#0B1F4D" />
        {leaves}
        {[-2, -1, 0, 1, 2].map((k) => (
          <text key={k} x={100 + k * 12} y={42 - (2 - Math.abs(k)) * 3} textAnchor="middle" fontSize={k === 0 ? 11 : 8} fill="#F5C518">★</text>
        ))}
      </svg>
      <div className="bo-award-body">
        <Icon size={26} color="#F5C518" strokeWidth={2.2} />
        <div className="bo-award-title">{award.title}</div>
        <div className="bo-award-rule" />
        <div className="bo-award-meta">{award.issuer}<br />{award.year}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function AboutPage() {
  const navigate = useNavigate();
  const [heroImgOk, setHeroImgOk] = useState(true);

  // Most-ordered services on the platform, in order of volume.
  const marqueeItems = [
    "Trademark Registration", "Income Tax Return", "Private Limited Company Registration",
    "Commencement of Business", "GST Registration", "Auditor Appointment",
    "MSME / Udyam", "Form AOC 4", "Form MGT 7", "GST Annual Package",
  ];

  const heroStats = [
    { num: STATS.businesses, label: "Businesses on platform" },
    { num: STATS.clientCompanies, label: "Companies served" },
    { num: STATS.team, label: "Team members" },
    { num: STATS.states, label: "States & UTs", plus: false },
  ];

  const orderedShare = Math.round((STATS.clientCompanies / STATS.businesses) * 100);

  const values = [
    { icon: Zap, title: "Speed", desc: "Fast service delivery without compromising quality." },
    { icon: Lock, title: "Trust", desc: "Secure document handling and complete transparency in every transaction." },
    { icon: Crosshair, title: "Precision", desc: "Every detail handled with expert-level accuracy and care." },
    { icon: Handshake, title: "Partnership", desc: "We grow only when your business grows. Always on your side." },
    { icon: BarChart3, title: "Scale", desc: `From Kerala to ${STATS.states} states and union territories, we grow with you.` },
    { icon: Lightbulb, title: "Innovation", desc: "Technology-first approach to transform traditional compliance." },
  ];

  const impact = [
    { icon: Users, num: STATS.team, label: "In-house team members" },
    { icon: BarChart3, num: STATS.servicesOrdered, label: "Services ordered on Bizpole One" },
    { icon: MapPin, num: STATS.districts, label: "Districts with active clients" },
  ];

  return (
    <>
      <style>{`
        .bo-page {
          --bo-yellow: #F5C518;
          --bo-yellow-deep: #F2B705;
          --bo-blob: #EDCA4F;
          --bo-ink: #111318;
          --bo-muted: #6b7280;
          --bo-soft: #FFF6D6;
          background: #fff; color: var(--bo-ink); overflow-x: hidden;
        }
        .bo-wrap { max-width: 1280px; margin: 0 auto; padding: 0 24px; }
        .bo-yellow { color: var(--bo-yellow); }
        .bo-h2 { font-weight: 700; font-size: clamp(30px, 4.2vw, 52px); line-height: 1.08; letter-spacing: -0.03em; }
        .bo-sub { font-size: 15px; color: var(--bo-muted); line-height: 1.7; }

        /* ── Hero ───────────────────────────── */
        .bo-hero { position: relative; min-height: clamp(720px, 100vh, 940px); display: flex; align-items: center; padding: 120px 0 60px; }
        .bo-hero-blob { position: absolute; top: 0; right: 0; bottom: 0; width: 44%; pointer-events: none; }
        .bo-hero-blob svg { width: 100%; height: 100%; display: block; }
        .bo-hero-img {
          position: absolute; right: 2%; bottom: 0; width: 46%; max-width: 720px;
          height: auto; max-height: 88%; object-fit: contain; object-position: bottom; pointer-events: none;
        }
        .bo-hero-text { position: relative; z-index: 2; max-width: 840px; }
        .bo-hero-h1 { font-weight: 700; font-size: clamp(36px, 4.6vw, 66px); line-height: 1.14; letter-spacing: -0.035em; }
        .bo-hero-actions { display: flex; align-items: center; gap: 44px; margin-top: 44px; flex-wrap: wrap; }
        .bo-consult { display: inline-flex; align-items: center; gap: 12px; font-size: 16px; color: #222; background: none; border: none; cursor: pointer; }
        .bo-consult-ring {
          position: relative; width: 64px; height: 64px; border-radius: 50%;
          border: 1.5px solid var(--bo-yellow); display: grid; place-items: center; margin-right: -4px;
        }
        .bo-consult-ring::after { content: ''; position: absolute; right: -2px; top: 10px; bottom: 10px; width: 6px; background: #fff; }
        .bo-consult-dot { width: 42px; height: 42px; border-radius: 50%; background: var(--bo-blob); display: grid; place-items: center; transition: transform .3s; }
        .bo-consult:hover .bo-consult-dot { transform: translateX(4px); }
        .bo-explore { font-size: 16px; font-weight: 600; color: #111; background: none; border: none; cursor: pointer; }
        .bo-explore:hover { text-decoration: underline; text-underline-offset: 6px; }
        .bo-hero-stats { display: grid; grid-template-columns: repeat(4, auto); gap: 18px 56px; margin-top: 80px; justify-content: start; }
        .bo-hero-num { font-weight: 800; font-size: clamp(26px, 2.6vw, 38px); letter-spacing: -0.02em; line-height: 1; }
        .bo-hero-num i { font-style: normal; color: var(--bo-yellow); }
        .bo-hero-label { margin-top: 10px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #8a8f99; }

        /* ── Marquee ────────────────────────── */
        .bo-marquee { background: var(--bo-blob); border-top: 1px solid #d9b53a; border-bottom: 1px solid #d9b53a; overflow: hidden; padding: 16px 0; position: relative; z-index: 3; }
        .bo-marquee-track { display: flex; width: max-content; animation: bo-scroll 45s linear infinite; }
        .bo-marquee:hover .bo-marquee-track { animation-play-state: paused; }
        .bo-marquee-item { display: flex; align-items: center; white-space: nowrap; font-size: 13px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #111; }
        .bo-marquee-item::after { content: ''; width: 3px; height: 14px; background: rgba(0,0,0,0.35); margin: 0 36px; border-radius: 1px; }
        @keyframes bo-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        /* ── Big Dreams ─────────────────────── */
        .bo-dreams { padding: 110px 0 60px; }
        .bo-dreams-grid { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 48px; align-items: center; }
        .bo-dreams-h { font-weight: 700; font-size: clamp(36px, 4.4vw, 60px); line-height: 1.08; letter-spacing: -0.03em; }
        .bo-squiggle { margin-top: 28px; width: 300px; max-width: 80%; }
        .bo-stat-cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; align-items: end; }
        .bo-stat-card {
          background: #fff; border: 1px solid #f0eee6; border-radius: 24px; padding: 28px 18px;
          box-shadow: 0 18px 50px rgba(17,19,24,0.06); display: flex; flex-direction: column;
          position: relative; overflow: hidden;
        }
        .bo-stat-card.tint { background: #FFFDF6; }
        .bo-stat-card.gold { background: var(--bo-yellow); border-color: var(--bo-yellow); box-shadow: 0 24px 60px rgba(245,197,24,0.35); }
        .bo-stat-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #3d4250; line-height: 1.45; }
        .bo-stat-num { font-weight: 800; font-size: clamp(26px, 2.3vw, 38px); white-space: nowrap; letter-spacing: -0.03em; margin: 12px 0 10px; line-height: 1; }
        .bo-stat-desc { font-size: 13px; line-height: 1.6; color: #5b6170; }
        .bo-stat-card.gold .bo-stat-desc { color: #2a2a2a; }
        .bo-stat-foot { margin-top: auto; padding-top: 22px; }
        .bo-city-dots { display: flex; flex-wrap: wrap; gap: 5px; }
        .bo-city-dots span { width: 9px; height: 9px; border-radius: 50%; background: var(--bo-yellow); }
        .bo-foot-label { font-size: 11px; color: #6b7280; margin-top: 8px; }
        .bo-bars { display: flex; align-items: flex-end; gap: 6px; justify-content: center; }
        .bo-bars span { width: 8px; border-radius: 6px; background: var(--bo-yellow); }
        .bo-wave { position: absolute; left: 0; right: 0; bottom: 0; height: 45%; }

        /* ── Story ──────────────────────────── */
        .bo-story { padding: 60px 0 100px; }
        .bo-hl { position: relative; display: inline-block; padding: 0 14px; }
        .bo-hl-bg { position: absolute; inset: 6% 0 2% 0; background: var(--bo-yellow); border-radius: 14px; z-index: 0; transform-origin: left; }
        .bo-hl-text { position: relative; z-index: 1; }
        .bo-story-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 72px; align-items: center; margin-top: 64px; }
        .bo-story-img { position: relative; border-radius: 28px; overflow: hidden; aspect-ratio: 16/10; box-shadow: 0 24px 60px rgba(17,19,24,0.12); }
        .bo-story-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .bo-story-float { position: absolute; top: 0; right: 36px; background: #1d1d1f; color: #fff; border-radius: 0 0 16px 16px; padding: 14px 22px; text-align: center; }
        .bo-story-float b { display: block; color: var(--bo-yellow); font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
        .bo-story-float small { font-size: 12px; color: rgba(255,255,255,0.75); }
        .bo-story-badge { position: absolute; left: 22px; bottom: 22px; background: var(--bo-yellow); color: #111; font-weight: 700; font-size: 13px; padding: 8px 18px; border-radius: 999px; }
        .bo-story-p { font-size: 15.5px; line-height: 1.75; color: #5b6170; }
        .bo-info-card { display: flex; gap: 18px; align-items: flex-start; background: #f8f9fb; border: 1px solid #eceef2; border-radius: 16px; padding: 22px 24px; }
        .bo-info-icon { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; }
        .bo-info-title { font-weight: 600; font-size: 16px; margin-bottom: 4px; }
        .bo-info-desc { font-size: 14px; color: #6b7280; line-height: 1.6; }

        /* ── Values ─────────────────────────── */
        .bo-values { padding: 90px 0 110px; }
        .bo-values-row { display: grid; grid-template-columns: 1fr 64px 1fr 64px 1fr; align-items: stretch; }
        .bo-values-row.bottom { margin-left: 8%; margin-right: -4%; }
        .bo-values-gap { height: 60px; position: relative; }
        .bo-values-gap svg { position: absolute; right: 13%; top: 0; height: 100%; width: 40px; }
        .bo-value-card {
          position: relative; overflow: hidden; background: #fff; border: 1px solid #f1f1f4; border-radius: 22px;
          padding: 34px 36px; box-shadow: 0 14px 40px rgba(17,19,24,0.06); transition: transform .3s, box-shadow .3s;
        }
        .bo-value-card::before {
          content: ''; position: absolute; top: -70px; right: -70px; width: 220px; height: 220px; border-radius: 50%;
          background: radial-gradient(circle, rgba(252,211,77,0.55) 0%, rgba(252,211,77,0) 68%);
        }
        .bo-value-card:hover { transform: translateY(-6px); box-shadow: 0 22px 50px rgba(245,197,24,0.18); }
        .bo-icon-tile { position: relative; width: 56px; height: 56px; border-radius: 14px; background: var(--bo-soft); display: grid; place-items: center; }
        .bo-value-dash { width: 26px; height: 4px; border-radius: 4px; background: var(--bo-yellow); margin: 12px 0 22px; }
        .bo-value-title { position: relative; font-weight: 600; font-size: 22px; letter-spacing: -0.01em; margin-bottom: 8px; }
        .bo-value-desc { position: relative; font-size: 15px; color: #5b6170; line-height: 1.7; }
        .bo-connector { position: relative; }
        .bo-connector svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
        .bo-connector-dot { position: absolute; left: -5px; width: 10px; height: 10px; margin-top: -5px; border-radius: 50%; background: var(--bo-yellow-deep); }

        /* ── Dark band ──────────────────────── */
        .bo-band { background: #0b0b0c; padding: 80px 24px 96px; text-align: center; }
        .bo-band-h { font-weight: 700; font-size: clamp(36px, 5vw, 68px); letter-spacing: -0.03em; color: #fff; line-height: 1.1; }
        .bo-band p { color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.75; max-width: 680px; margin: 22px auto 40px; }
        .bo-btn { display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; font-weight: 700; font-size: 15px; padding: 16px 32px; border: none; cursor: pointer; }
        .bo-btn-yellow { background: var(--bo-yellow); color: #111; box-shadow: 0 14px 36px rgba(245,197,24,0.35); }
        .bo-btn-dark { background: #161616; color: #fff; box-shadow: 0 14px 30px rgba(0,0,0,0.25); }
        .bo-btn-ghost { background: #FCD94A; color: #111; border: 1.5px solid #E8BC14; }

        /* ── Impact ─────────────────────────── */
        .bo-impact { padding: 110px 0 80px; text-align: center; }
        .bo-impact-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 34px; max-width: 1150px; margin: 72px auto 0; }
        .bo-impact-card {
          position: relative; overflow: hidden; text-align: left; background: #fff; border-radius: 20px;
          border: 1px solid #f1f1f4; border-top: 3px solid var(--bo-yellow); padding: 38px 40px 44px;
          box-shadow: 0 16px 44px rgba(17,19,24,0.06);
        }
        .bo-impact-rings { position: absolute; right: -90px; bottom: -120px; width: 300px; height: 300px; pointer-events: none; }
        .bo-impact-num { position: relative; font-weight: 800; font-size: clamp(38px, 4vw, 58px); letter-spacing: -0.03em; line-height: 1; margin-top: 46px; }
        .bo-impact-label { position: relative; font-size: 15px; color: #6b7280; margin-top: 14px; }

        /* ── Awards ─────────────────────────── */
        .bo-awards { padding: 70px 0 40px; text-align: center; }
        .bo-awards-grid { display: flex; justify-content: center; gap: 48px; flex-wrap: wrap; margin-top: 64px; }
        .bo-award { position: relative; width: 236px; height: 236px; filter: drop-shadow(0 10px 22px rgba(11,31,77,0.25)); }
        .bo-award-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
        .bo-award-body { position: absolute; inset: 27% 25% 18%; display: flex; flex-direction: column; align-items: center; gap: 6px; color: #fff; }
        .bo-award-title { font-weight: 700; font-size: 13.5px; line-height: 1.3; }
        .bo-award-rule { width: 28px; height: 1px; background: rgba(255,255,255,0.6); }
        .bo-award-meta { font-size: 10.5px; color: rgba(255,255,255,0.75); line-height: 1.5; }

        /* ── CTA ────────────────────────────── */
        .bo-cta-wrap { padding: 60px 24px 110px; }
        .bo-cta {
          position: relative; overflow: hidden; max-width: 1280px; margin: 0 auto; border-radius: 28px;
          background: var(--bo-yellow); padding: 84px 24px 72px; text-align: center;
        }
        .bo-cta-deco { position: absolute; inset: 0; pointer-events: none; }
        .bo-cta-h { position: relative; font-weight: 800; font-size: clamp(40px, 5vw, 66px); line-height: 1.05; letter-spacing: -0.035em; color: #111; }
        .bo-cta p { position: relative; font-size: 16px; color: #2a2a2a; line-height: 1.9; margin: 26px auto 34px; max-width: 520px; }
        .bo-cta-actions { position: relative; display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; }

        /* ── Responsive ─────────────────────── */
        @media (max-width: 1024px) {
          .bo-hero { min-height: 0; flex-direction: column; align-items: stretch; padding-top: 110px; }
          .bo-hero-blob { top: auto; height: 380px; width: 100%; }
          .bo-hero-img { width: 82%; right: 9%; max-height: 360px; }
          .bo-hero-visual { height: 360px; }
          .bo-dreams-grid { grid-template-columns: 1fr; }
          .bo-story-grid { grid-template-columns: 1fr; gap: 40px; }
          .bo-values-row, .bo-values-row.bottom { grid-template-columns: 1fr; gap: 20px; margin: 0; }
          .bo-values-gap { height: 20px; }
          .bo-values-gap svg, .bo-connector { display: none; }
          .bo-impact-grid { grid-template-columns: 1fr; max-width: 520px; }
        }
        @media (max-width: 640px) {
          .bo-hero-stats { grid-template-columns: repeat(2, auto); gap: 28px 40px; margin-top: 52px; }
          .bo-stat-cards { grid-template-columns: repeat(2, 1fr); gap: 14px; }
          .bo-stat-card { min-height: 0 !important; }
          .bo-hero-actions { gap: 28px; }
          .bo-story-float { right: 16px; padding: 10px 16px; }
          .bo-awards-grid { gap: 16px; margin-top: 40px; }
          .bo-award { width: 158px; height: 158px; }
          .bo-award-body svg { width: 18px; height: 18px; }
          .bo-award-body { gap: 4px; }
          .bo-award-title { font-size: 9.5px; }
          .bo-award-meta { font-size: 7.5px; }
        }
      `}</style>

      <div className="bo-page">
        {/* ════════════ 1. HERO ════════════ */}
        <section className="bo-hero">
          <div className="bo-hero-blob" aria-hidden="true">
            <svg viewBox="0 0 700 920" preserveAspectRatio="none">
              <path
                d="M120 920 C 50 760, 0 600, 10 470 C 18 380, 70 350, 130 395 C 200 450, 260 500, 350 470 C 470 420, 590 230, 700 20 L700 920 Z"
                fill="var(--bo-blob)"
              />
            </svg>
          </div>
          {heroImgOk && (
            <motion.img
              src={HERO_IMAGE}
              alt="The Bizpole team"
              className="bo-hero-img"
              onError={() => setHeroImgOk(false)}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.9, ease }}
            />
          )}

          <div className="bo-wrap" style={{ width: "100%" }}>
            <div className="bo-hero-text">
              <motion.h1
                className="bo-hero-h1"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease }}
              >
                Kerala's home-grown<br />
                <span className="bo-yellow">business platform</span><br />
                for India.
              </motion.h1>

              <motion.div
                className="bo-hero-actions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.7, ease }}
              >
                <button className="bo-consult" onClick={() => navigate("/contact")}>
                  <span className="bo-consult-ring">
                    <span className="bo-consult-dot"><ArrowRight size={20} color="#fff" strokeWidth={2} /></span>
                  </span>
                  Get Free Consultation
                </button>
                <button className="bo-explore" onClick={() => navigate("/products")}>
                  Explore Platform
                </button>
              </motion.div>

              <div className="bo-hero-stats">
                {heroStats.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 + i * 0.1, duration: 0.6 }}
                  >
                    <div className="bo-hero-num">
                      <Counter to={s.num} />{s.plus !== false && <i>+</i>}
                    </div>
                    <div className="bo-hero-label">{s.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          {/* Reserves room for the blob + photo when the hero stacks on small screens */}
          <div className="bo-hero-visual lg:hidden" />
        </section>

        {/* ════════════ 2. MARQUEE ════════════ */}
        <div className="bo-marquee">
          <div className="bo-marquee-track">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={i} className="bo-marquee-item">{item}</span>
            ))}
          </div>
        </div>

        {/* ════════════ 3. BIG DREAMS ════════════ */}
        <section className="bo-dreams">
          <div className="bo-wrap bo-dreams-grid">
            <motion.div {...reveal()}>
              <h2 className="bo-dreams-h">
                Big Dreams,<br />
                <span className="bo-yellow">Bigger</span> Results
              </h2>
              <p className="bo-sub" style={{ fontSize: 17, maxWidth: 340, marginTop: 20 }}>
                Businesses that started small and grew with our support.
              </p>
              <svg className="bo-squiggle" viewBox="0 0 300 70" fill="none" aria-hidden="true">
                <motion.path
                  d="M2 38 C 70 40, 150 52, 205 46 C 240 42, 262 18, 250 8 C 236 -2, 214 30, 230 50 C 246 66, 280 54, 298 50"
                  stroke="var(--bo-yellow)" strokeWidth="2.2" strokeLinecap="round"
                  initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }} transition={{ duration: 1.6, ease: "easeInOut" }}
                />
              </svg>
            </motion.div>

            <div className="bo-stat-cards">
              {/* Team */}
              <motion.div className="bo-stat-card" style={{ minHeight: 330 }} {...reveal(0)}>
                <div className="bo-stat-eyebrow">Team<br />Strength</div>
                <div className="bo-stat-num"><Counter to={STATS.team} />+</div>
                <div className="bo-stat-desc">Professionals across sales, operations and service delivery.</div>
                <div className="bo-stat-foot">
                  <div className="bo-city-dots">
                    {Array.from({ length: STATS.officeCities }).map((_, i) => <span key={i} />)}
                  </div>
                  <div className="bo-foot-label">{STATS.officeCities} office cities</div>
                </div>
              </motion.div>

              {/* Client companies */}
              <motion.div className="bo-stat-card tint" style={{ minHeight: 400 }} {...reveal(0.1)}>
                <div className="bo-stat-eyebrow">Client<br />Companies</div>
                <div className="bo-stat-num"><Counter to={STATS.clientCompanies} />+</div>
                <div className="bo-stat-desc">Companies that have ordered at least one service with us.</div>
                <div className="bo-stat-foot" style={{ display: "flex", justifyContent: "center" }}>
                  <div style={{ position: "relative", width: 110, height: 110 }}>
                    <svg viewBox="0 0 110 110" width="110" height="110">
                      <circle cx="55" cy="55" r="44" fill="none" stroke="#f3f0e4" strokeWidth="10" />
                      <motion.circle
                        cx="55" cy="55" r="44" fill="none" stroke="var(--bo-yellow)" strokeWidth="10" strokeLinecap="round"
                        transform="rotate(-90 55 55)"
                        initial={{ pathLength: 0 }} whileInView={{ pathLength: orderedShare / 100 }}
                        viewport={{ once: true }} transition={{ duration: 1.4, ease }}
                      />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center" }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{orderedShare}%</div>
                      <div style={{ fontSize: 9, letterSpacing: "0.08em", color: "#8a8f99", textTransform: "uppercase" }}>Ordered</div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Reach */}
              <motion.div className="bo-stat-card" style={{ minHeight: 360 }} {...reveal(0.2)}>
                <div className="bo-stat-eyebrow">Districts<br />Served</div>
                <div className="bo-stat-num"><Counter to={STATS.districts} />+</div>
                <div className="bo-stat-desc">Client businesses across {STATS.states} states and union territories.</div>
                <div className="bo-stat-foot">
                  <div className="bo-bars">
                    {[10, 18, 26, 36, 46].map((h, i) => (
                      <motion.span
                        key={h}
                        style={{ height: h, opacity: i === 0 ? 0.6 : 1 }}
                        initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }}
                        viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Services completed */}
              <motion.div className="bo-stat-card gold" style={{ minHeight: 420 }} {...reveal(0.3)}>
                <div className="bo-stat-eyebrow" style={{ color: "#1a1a1a" }}>Services Completed</div>
                <div className="bo-stat-num"><Counter to={STATS.servicesCompleted} />+</div>
                <div className="bo-stat-desc" style={{ position: "relative", zIndex: 1 }}>
                  Delivered end to end, with {fmt(STATS.completedLastMonth)}+ completed in September alone.
                </div>
                <svg className="bo-wave" viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M0 80 C 40 70, 60 40, 100 50 C 140 60, 160 30, 200 10 L200 120 L0 120 Z" fill="rgba(255,255,255,0.18)" />
                  <path d="M0 100 C 50 90, 80 70, 120 78 C 160 86, 180 60, 200 50 L200 120 L0 120 Z" fill="rgba(255,255,255,0.22)" />
                </svg>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ════════════ 4. OUR STORY ════════════ */}
        <section className="bo-story">
          <div className="bo-wrap">
            <motion.h2 className="bo-h2" style={{ textAlign: "center" }} {...reveal()}>
              From a small team to<br />a{" "}
              <span className="bo-hl">
                <motion.span
                  className="bo-hl-bg"
                  initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }} transition={{ delay: 0.35, duration: 0.55, ease }}
                />
                <span className="bo-hl-text">national platform</span>
              </span>
            </motion.h2>

            <div className="bo-story-grid">
              <motion.div className="bo-story-img" {...reveal(0, 40)}>
                <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=1000&q=80" alt="The Bizpole team at work" />
                <div className="bo-story-float">
                  <b>{fmt(STATS.businesses)}+</b>
                  <small>Businesses on Bizpole One</small>
                </div>
                <div className="bo-story-badge">Kerala, India</div>
              </motion.div>

              <motion.div {...reveal(0.1, 40)} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                <p className="bo-story-p">
                  Bizpole was born from a simple observation: starting and running a business in India was unnecessarily complicated. Frustrated by the opaque, slow, and expensive world of business compliance, we decided to build something better.
                </p>
                <p className="bo-story-p">
                  We started in Kerala. Today, more than {fmt(STATS.businesses)} businesses across {STATS.states} states and union territories are on Bizpole One, served from offices in {STATS.officeCities} cities, but our mission has never changed: make every Indian entrepreneur's journey easier.
                </p>
                {[
                  { icon: Target, title: "Our Purpose", desc: "Empowering entrepreneurs with the tools, knowledge, and support they need to build great businesses.", bg: "#FFF1F2", color: "#E11D48" },
                  { icon: Users, title: "Our Team", desc: `${STATS.team}+ professionals across sales, operations, and service delivery, working as one team.`, bg: "#EEF2FF", color: "#4F46E5" },
                ].map((c, i) => (
                  <motion.div key={c.title} className="bo-info-card" {...reveal(0.2 + i * 0.12, 16)}>
                    <div className="bo-info-icon" style={{ background: c.bg }}>
                      <c.icon size={20} color={c.color} strokeWidth={2.2} />
                    </div>
                    <div>
                      <div className="bo-info-title">{c.title}</div>
                      <div className="bo-info-desc">{c.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ════════════ 5. VALUES ════════════ */}
        <section className="bo-values">
          <div className="bo-wrap">
            <motion.div style={{ textAlign: "center", marginBottom: 64 }} {...reveal()}>
              <h2 className="bo-h2">Our Core <span className="bo-yellow">Values</span></h2>
              <p className="bo-sub" style={{ maxWidth: 540, margin: "16px auto 0", fontSize: 16 }}>
                The principles that guide every decision, every product, every interaction.
              </p>
            </motion.div>

            <div style={{ maxWidth: 1120, margin: "0 auto" }}>
              <div className="bo-values-row">
                <ValueCard v={values[0]} i={0} />
                <Connector from={74} to={44} />
                <ValueCard v={values[1]} i={1} />
                <Connector from={70} to={40} />
                <ValueCard v={values[2]} i={2} />
              </div>
              <div className="bo-values-gap" aria-hidden="true">
                <svg viewBox="0 0 40 60" preserveAspectRatio="none">
                  <path d="M30 0 C 28 30, 14 34, 10 60" fill="none" stroke="#c7cbd6" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>
              <div className="bo-values-row bottom">
                <ValueCard v={values[3]} i={3} />
                <Connector from={34} to={40} />
                <ValueCard v={values[4]} i={4} />
                <Connector from={60} to={52} />
                <ValueCard v={values[5]} i={5} />
              </div>
            </div>
          </div>
        </section>

        {/* ════════════ 6. REGISTER. COMPLY. SCALE. ════════════ */}
        <section className="bo-band">
          <motion.div {...reveal()}>
            <h2 className="bo-band-h">
              <span className="bo-yellow">Register.</span> Comply. Scale.
            </h2>
            <p>
              Bizpole is your all-in-one legal and regulatory partner, from incorporating your company to managing compliance and annual filings as you grow.
            </p>
            <motion.button
              className="bo-btn bo-btn-yellow"
              whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/startbusiness")}
            >
              Get Started Now <ArrowRight size={17} strokeWidth={2.4} />
            </motion.button>
          </motion.div>
        </section>

        {/* ════════════ 7. NUMBERS THAT SPEAK ════════════ */}
        <section className="bo-impact">
          <div className="bo-wrap">
            <motion.div {...reveal()}>
              <h2 className="bo-h2">Numbers that <span className="bo-yellow">speak</span></h2>
              <p className="bo-sub" style={{ marginTop: 14, fontSize: 16 }}>Real results from real businesses we've empowered.</p>
            </motion.div>

            <div className="bo-impact-grid">
              {impact.map((item, i) => (
                <motion.div
                  key={item.label}
                  className="bo-impact-card"
                  {...reveal(i * 0.12)}
                  whileHover={{ y: -6, boxShadow: "0 24px 60px rgba(245,197,24,0.16)" }}
                >
                  <svg className="bo-impact-rings" viewBox="0 0 300 300" aria-hidden="true">
                    <circle cx="150" cy="150" r="150" fill="#FFFBEA" />
                    <circle cx="150" cy="150" r="148" fill="none" stroke="#FCE9A8" strokeWidth="1.5" />
                    <circle cx="150" cy="150" r="112" fill="none" stroke="#FCE9A8" strokeWidth="1.5" />
                  </svg>
                  <div className="bo-icon-tile" style={{ width: 56, height: 56 }}>
                    <item.icon size={20} color="#F5B800" strokeWidth={2.2} />
                  </div>
                  <div className="bo-impact-num"><Counter to={item.num} />+</div>
                  <div className="bo-impact-label">{item.label}</div>
                </motion.div>
              ))}
            </div>

            <motion.div style={{ marginTop: 52 }} {...reveal(0.3, 16)}>
              <motion.button
                className="bo-btn bo-btn-dark"
                whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/services")}
              >
                See our impact <ArrowRight size={16} strokeWidth={2.4} />
              </motion.button>
            </motion.div>
          </div>
        </section>

        {/* ════════════ 8. AWARDS ════════════ */}
        {AWARDS.length > 0 && (
          <section className="bo-awards">
            <div className="bo-wrap">
              <motion.div {...reveal()}>
                <h2 className="bo-h2">Awards &amp; <span className="bo-yellow">Accolades</span></h2>
                <p className="bo-sub" style={{ marginTop: 14, fontSize: 16 }}>Industry recognition for our commitment to excellence.</p>
              </motion.div>
              <div className="bo-awards-grid">
                {AWARDS.map((a, i) => (
                  <motion.div key={a.title} {...reveal(i * 0.1)}>
                    <AwardBadge award={a} />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ════════════ 9. CTA ════════════ */}
        <div className="bo-cta-wrap">
          <motion.section className="bo-cta" {...reveal(0, 40)}>
            <svg className="bo-cta-deco" viewBox="0 0 1280 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <circle cx="40" cy="420" r="190" fill="rgba(255,255,255,0.12)" />
              <circle cx="40" cy="420" r="300" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
              <circle cx="40" cy="420" r="380" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
              <circle cx="1270" cy="380" r="220" fill="rgba(255,255,255,0.12)" />
              <circle cx="1270" cy="380" r="300" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
              <circle cx="1270" cy="380" r="420" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
            </svg>
            <h2 className="bo-cta-h">Get started<br />today!</h2>
            <p>
              It takes less than a minute to start your business journey.<br />
              Join {fmt(STATS.businesses)}+ businesses that chose Bizpole.
            </p>
            <div className="bo-cta-actions">
              <motion.button
                className="bo-btn bo-btn-dark"
                whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/startbusiness")}
              >
                Start Your Business <ArrowRight size={16} strokeWidth={2.4} />
              </motion.button>
              <motion.button
                className="bo-btn bo-btn-ghost"
                whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/services")}
              >
                View Services
              </motion.button>
            </div>
          </motion.section>
        </div>
      </div>
    </>
  );
}

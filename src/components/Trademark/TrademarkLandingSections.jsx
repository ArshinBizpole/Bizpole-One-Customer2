import { useEffect, useRef, useState } from "react";
import "./TrademarkLandingSections.css";

// Landing content under the search on the public /trademark-search page:
// How it works (+ sample score gauge), What the report covers, Why search first,
// CTA band and FAQs. Same content as the static Meta-ads page
// (public/trademark-search/meta/index.html), so keep the two in step.
// `onCheck` scrolls back up to the search box.

const Ic = ({ children }) => (
  <span className="ic" aria-hidden="true">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  </span>
);

const COVERS = [
  { title: "Identical marks", text: "Exact matches of your brand name already filed or registered in India.", icon: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></> },
  { title: "Similar-sounding names", text: "Phonetic matches and spelling variants that the Registry treats as confusingly similar.", icon: <path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 11v2" /> },
  { title: "Right trademark class", text: "Which of the 45 Nice classes fits your goods or services, and conflicts within it.", icon: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></> },
  { title: "Status of conflicting marks", text: "Whether a clashing mark is registered, objected, opposed, abandoned or expired.", icon: <><path d="M12 8v4l3 2" /><circle cx="12" cy="12" r="9" /></> },
  { title: "Availability outlook", text: "A plain-language view of how likely the name is to go through, and the main risks.", icon: <><path d="M9 12l2 2 4-4" /><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" /></> },
  { title: "Expert next steps", text: "What to change if the name is risky, or how to file quickly if it looks clear.", icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> },
];

const FAQS = [
  ["Is the trademark search really free?", "Yes. The trademark search and the report are 100% free. No payment or card details are needed."],
  ["How will I receive my trademark search report?", "Your report link is sent to the WhatsApp number you enter, usually within a minute. Open it to see the matching trademarks for your brand name."],
  ["What does the trademark search check?", "We search the Indian trademark registry for identical marks, similar-sounding and similar-looking marks, and marks in the class that fits your business, and note the status of any conflicting marks."],
  ["Does a clear search mean my trademark will be registered?", "No. The search is a preliminary check. Final registrability is decided by the Trade Marks Registry after examination, so a professional review is recommended before you file."],
  ["Which trademark class should I choose?", "India follows the Nice Classification with 45 classes: 1–34 for goods and 35–45 for services. Tell us your business category and we will suggest the right class in your report."],
  ["What should I do after the search?", "If your name looks available, file your trademark application early, because rights in India generally go to whoever files first. Bizpole can file it for you and you can use the ™ symbol once it is filed."],
];

// Gauge tick marks (11 ticks over the half circle), as in the static page.
const TICKS = [
  [58.0, 120.0, 48.0, 120.0], [57.2, 99.6, 51.5, 97.8], [66.6, 81.2, 61.8, 77.7], [81.2, 66.6, 77.7, 61.8],
  [99.6, 57.2, 97.8, 51.5], [120.0, 58.0, 120.0, 48.0], [140.4, 57.2, 142.2, 51.5], [158.8, 66.6, 162.3, 61.8],
  [173.4, 81.2, 178.2, 77.7], [182.8, 99.6, 188.5, 97.8], [182.0, 120.0, 192.0, 120.0],
];

function GaugeCard() {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  // Swing the needle in when the card scrolls into view.
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!("IntersectionObserver" in window)) { setOn(true); return undefined; }
    const obs = new IntersectionObserver((en) => {
      if (en[0].isIntersecting) { setOn(true); obs.disconnect(); }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <figure ref={ref} className={`gauge-card${on ? " on" : ""}`} aria-labelledby="gauge-cap">
      <div className="gc-top">
        <span className="gc-tag">Sample report</span>
        <span className="gc-brand">Your brand · Class 30</span>
      </div>
      <svg className="gauge" viewBox="0 0 240 132" role="img" aria-label="Gauge showing an 82% probability of registration, in the Good to apply zone">
        <g fill="none" strokeWidth="16">
          <path d="M28 120 A92 92 0 0 1 212 120" stroke="#eef2f7" />
          <path d="M28 120 A92 92 0 0 1 212 120" pathLength="100" stroke="#ef4444" strokeDasharray="49 101" />
          <path d="M28 120 A92 92 0 0 1 212 120" pathLength="100" stroke="#f59e0b" strokeDasharray="0 50.5 24 101" />
          <path d="M28 120 A92 92 0 0 1 212 120" pathLength="100" stroke="#16a34a" strokeDasharray="0 75.5 24.5 101" />
        </g>
        <g stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
          {TICKS.map(([x1, y1, x2, y2]) => <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} />)}
        </g>
        <g className="g-needle"><path d="M120 115 L52 120 L120 125 Z" fill="#0f172a" /></g>
        <circle cx="120" cy="120" r="10" fill="#0f172a" />
        <circle cx="120" cy="120" r="4" fill="#fcc419" />
      </svg>
      <div className="gc-score">
        <p className="gc-pct">82<span>%</span></p>
        <p className="gc-k">Probability of registration</p>
        <span className="gc-verdict">✓ Good to apply</span>
      </div>
      <ul className="gc-legend" aria-label="Score zones">
        <li><i style={{ background: "#ef4444" }} />Below 50<br /><b>Not advisable</b></li>
        <li><i style={{ background: "#f59e0b" }} />50 – 74<br /><b>Apply with changes</b></li>
        <li><i style={{ background: "#16a34a" }} />75 and up<br /><b>Good to apply</b></li>
      </ul>
      <ul className="gc-checks">
        <li><span className="ok">✓</span>Identical marks<b>None found</b></li>
        <li><span className="mid">!</span>Similar-sounding names<b>2 to review</b></li>
        <li><span className="ok">✓</span>Conflicts in your class<b>Low risk</b></li>
      </ul>
      <figcaption id="gauge-cap">
        Every report scores your name from 0 to 100, so you know at a glance whether to file, tweak or rethink.
      </figcaption>
    </figure>
  );
}

export default function TrademarkLandingSections({ onCheck }) {
  return (
    <div className="tml">
      {/* How it works */}
      <section className="sec sec-soft" id="how-it-works" aria-labelledby="how-title">
        <div className="wrap how-grid">
          <div className="how-copy">
            <p className="eyebrow">How it works</p>
            <h2 id="how-title">Free trademark search in 3 simple steps</h2>
            <p className="intro">
              Your logo, packaging, website and signboard all depend on one name. Find out if you can register it{" "}
              <b>before</b> you spend money on it. No sign-up, no payment.
            </p>
            <ol className="steps steps-v">
              <li><h3>Enter your brand name</h3><p>Type the name you want to own. Add your business category and we search the exact class that protects you.</p></li>
              <li><h3>Add your WhatsApp number</h3><p>Your report link is sent to WhatsApp right away, so it&apos;s there whenever you need it.</p></li>
              <li><h3>Get your approval score</h3><p>See your chance of registration, the marks that could block you, and an expert&apos;s advice on what to do next.</p></li>
            </ol>
            <button type="button" className="how-cta" onClick={onCheck}>
              Check my brand name — free <span aria-hidden="true">→</span>
            </button>
          </div>
          <GaugeCard />
        </div>
      </section>

      {/* What the report covers */}
      <section className="sec" id="report" aria-labelledby="report-title">
        <div className="wrap">
          <p className="eyebrow">Your free report</p>
          <h2 id="report-title">What your trademark search report covers</h2>
          <p className="intro">
            A brand name can be refused if it clashes with an existing mark, even one that only sounds similar. Your
            report shows these risks before you spend on branding or filing.
          </p>
          <ul className="covers">
            {COVERS.map((c) => (
              <li key={c.title}>
                <Ic>{c.icon}</Ic>
                <div><h3>{c.title}</h3><p>{c.text}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Why search first */}
      <section className="sec sec-soft" aria-labelledby="why-title">
        <div className="wrap two">
          <div className="prose">
            <p className="eyebrow">Why search first</p>
            <h2 id="why-title">Check trademark availability before you build your brand</h2>
            <p>
              In India, trademark rights generally go to whoever files first. If someone already holds a similar mark,
              your application can be objected or opposed, and you may have to rebrand after spending on logos,
              packaging and marketing.
            </p>
            <p>
              A trademark search takes minutes and tells you whether your brand name is likely to be available, which
              class to file in, and what to watch out for.
            </p>
          </div>
          <ul className="ticks">
            <li><b>Avoid rejection:</b> spot identical or similar marks before you file.</li>
            <li><b>Save money:</b> don&apos;t pay for branding on a name you can&apos;t protect.</li>
            <li><b>Choose the right class:</b> protect the goods or services you actually sell.</li>
            <li><b>File with confidence:</b> once filed, use the ™ symbol with your brand.</li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="sec" aria-labelledby="cta-title">
        <div className="wrap">
          <div className="cta-band">
            <div>
              <h2 id="cta-title">Name looks available? Protect it today.</h2>
              <p>Trademark filing by Bizpole experts at ₹3,000 incl. GST + Govt. fee. Get your TM application number in 24–48 hours.</p>
            </div>
            <div>
              <button type="button" className="btn" onClick={onCheck}>Check my brand name free</button>
              {/* Static page — full load, not a router link */}
              <a className="ghost" href="/trademark-registration">Trademark registration details →</a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="sec sec-soft" id="faq" aria-labelledby="faq-title">
        <div className="wrap">
          <div className="center">
            <p className="eyebrow">FAQs</p>
            <h2 id="faq-title" style={{ marginBottom: 28 }}>Free trademark search: common questions</h2>
          </div>
          <div className="faq">
            {FAQS.map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

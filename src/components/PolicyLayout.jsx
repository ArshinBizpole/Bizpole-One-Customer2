import { useEffect, useRef, useState } from "react";

// Shared details for Privacy Policy, Terms & Conditions and Cancellation & Refund Policy.
// Fill in the blank values; empty fields are hidden on the pages.
const POLICY_INFO = {
  effectiveDate: "",
  lastUpdated: "",
  companyName: "BIZPOLE BUSINESS SOLUTIONS PRIVATE LIMITED",
  address:
    "2nd Floor, Falcon Complex, Opp. HPCL Petrol Bunk, Nurani, Palakkad City, Palakkad, Kerala – 678014.",
  email: "",
  phone: "",
};

// A section counts as "current" once its heading is within this many px of the
// top of the window — just below the sticky header (sections use scroll-mt-28 = 112px).
const ACTIVE_OFFSET = 140;

const sectionId = (heading) => heading.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function ContactBlock() {
  return (
    <div className="mt-4 rounded-xl border-l-4 border-[#F5C518] bg-[#FFF8DC] p-5 text-sm text-[#374151]">
      <p className="font-semibold text-[#1a1a1a]">{POLICY_INFO.companyName}</p>
      <p className="mt-1 leading-relaxed">{POLICY_INFO.address}</p>
      {POLICY_INFO.email && (
        <p className="mt-2">
          Email:{" "}
          <a href={`mailto:${POLICY_INFO.email}`} className="font-medium text-[#1a1a1a] hover:text-[#CA8A04]">
            {POLICY_INFO.email}
          </a>
        </p>
      )}
      {POLICY_INFO.phone && (
        <p className="mt-1">
          Phone:{" "}
          <a href={`tel:${POLICY_INFO.phone}`} className="font-medium text-[#1a1a1a] hover:text-[#CA8A04]">
            {POLICY_INFO.phone}
          </a>
        </p>
      )}
    </div>
  );
}

// sections: [{ heading, body, contact? }] — body is a string or an array of paragraphs; set contact: true to render the contact block under that section
export default function PolicyLayout({ title, showLastUpdated = false, sections }) {
  const [activeId, setActiveId] = useState(sectionId(sections[0].heading));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [title]);

  // While a click-triggered smooth scroll runs, the scroll handler is paused so
  // the highlight stays on the clicked section instead of passing through others.
  const clickLock = useRef(false);
  const unlockTimer = useRef(null);
  const releaseLockSoon = () => {
    clearTimeout(unlockTimer.current);
    unlockTimer.current = setTimeout(() => {
      clickLock.current = false;
    }, 150);
  };

  // Highlight the section currently in view in the "On this page" list: the last
  // section whose heading has scrolled past the header, or the last section once
  // the page is at the bottom (it may be too short to scroll up that far).
  useEffect(() => {
    const updateActive = () => {
      if (clickLock.current) {
        releaseLockSoon();
        return;
      }
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      let current = sectionId(sections[0].heading);
      sections.forEach((s, i) => {
        const el = document.getElementById(sectionId(s.heading));
        if (!el) return;
        if (el.getBoundingClientRect().top <= ACTIVE_OFFSET || (atBottom && i === sections.length - 1)) {
          current = el.id;
        }
      });
      setActiveId(current);
    };
    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateActive);
      clearTimeout(unlockTimer.current);
    };
  }, [sections]);

  const scrollTo = (id) => {
    setActiveId(id);
    clickLock.current = true;
    releaseLockSoon();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="bg-white">
      {/* Banner */}
      <div className="bg-[#1a1a1a]">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
          <h1 className="text-2xl md:text-4xl font-bold text-white">{title}</h1>
          <div className="mt-4 h-1 w-20 rounded-full bg-[#F5C518]" />
          {(POLICY_INFO.effectiveDate || (showLastUpdated && POLICY_INFO.lastUpdated)) && (
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-300">
              {POLICY_INFO.effectiveDate && <p>Effective Date: {POLICY_INFO.effectiveDate}</p>}
              {showLastUpdated && POLICY_INFO.lastUpdated && <p>Last Updated: {POLICY_INFO.lastUpdated}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 md:py-14 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10">
        {/* On this page */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-3">On this page</p>
            <ul className="space-y-1 border-l border-[#E5E7EB]">
              {sections.map((section, index) => {
                const id = sectionId(section.heading);
                const isActive = activeId === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => scrollTo(id)}
                      className={`-ml-px w-full text-left border-l-2 pl-4 py-1.5 text-sm transition-colors ${isActive
                        ? "border-[#F5C518] font-semibold text-[#1a1a1a]"
                        : "border-transparent text-[#6B7280] hover:text-[#1a1a1a]"
                        }`}
                    >
                      {index + 1}. {section.heading}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Sections */}
        <div className="space-y-10 max-w-3xl">
          {sections.map((section, index) => (
            <section key={section.heading} id={sectionId(section.heading)} className="scroll-mt-28">
              <div className="flex items-center gap-3">
                <span className="flex-none w-8 h-8 rounded-lg bg-[#F5C518] text-[#1a1a1a] text-sm font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <h2 className="text-lg md:text-xl font-semibold text-[#1a1a1a]">{section.heading}</h2>
              </div>
              {section.body &&
                [].concat(section.body).map((paragraph, i) => (
                  <p key={i} className="mt-3 text-[15px] text-[#374151] leading-relaxed">{paragraph}</p>
                ))}
              {section.contact && <ContactBlock />}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

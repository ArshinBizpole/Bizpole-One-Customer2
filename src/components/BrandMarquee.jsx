import { Reveal } from "./Reveal";

// "Trusted by" strip under the home hero: client brands scrolling in a loop.
//
// To show a real logo, drop the file in public/Images/brands/ and set `logo`
// on that entry (transparent PNG/SVG/WebP, roughly 3:1). Entries without a
// logo render as a clean wordmark so the strip never shows a broken image.
const BRANDS = [
  { name: "SDA Services India" },
  { name: "Cute Voyages" },
  { name: "Gaurav RK Manufacturers" },
  { name: "EYECO" },
  { name: "Delpick" },
  { name: "Saras Vinayak Exports" },
  { name: "VSS Technologies" },
  { name: "Thanvitha Infra Projects" },
];

const initials = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

const Brand = ({ name, logo }) =>
  logo ? (
    <img
      src={logo}
      alt={name}
      loading="lazy"
      className="h-8 sm:h-10 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition duration-300"
    />
  ) : (
    <span className="flex items-center gap-2.5 text-[#1a1a1a]/55 hover:text-[#1a1a1a] transition-colors duration-300 whitespace-nowrap">
      <span
        aria-hidden="true"
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#1a1a1a]/[0.06] flex items-center justify-center text-[11px] sm:text-xs font-bold tracking-wide"
      >
        {initials(name)}
      </span>
      <span className="text-base sm:text-lg font-semibold tracking-tight">{name}</span>
    </span>
  );

const BrandMarquee = () => (
  <section aria-label="Businesses that trust Bizpole" className="bg-[#f7f5f0] pt-2 pb-4 md:pb-6">
    <style>{`
      @keyframes brand-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      .brand-track { animation: brand-marquee 40s linear infinite; }
      .brand-mask:hover .brand-track { animation-play-state: paused; }
      .brand-mask {
        -webkit-mask-image: linear-gradient(to right, transparent, #000 10%, #000 90%, transparent);
                mask-image: linear-gradient(to right, transparent, #000 10%, #000 90%, transparent);
      }
      @media (prefers-reduced-motion: reduce) { .brand-track { animation: none; } }
    `}</style>

    <Reveal y={12}>
    <p className="text-center text-xs sm:text-sm font-semibold tracking-[0.14em] uppercase text-[#1a1a1a]/45 mb-7 px-4">
      Trusted by 30,000+ growing businesses across India
    </p>

    <div className="brand-mask overflow-hidden">
      {/* Two identical halves so translating by -50% loops seamlessly. */}
      <ul className="brand-track flex w-max items-center">
        {[...BRANDS, ...BRANDS].map((b, i) => (
          <li key={b.name + i} className="flex-none px-7 sm:px-10" aria-hidden={i >= BRANDS.length}>
            <Brand {...b} />
          </li>
        ))}
      </ul>
    </div>
    </Reveal>
  </section>
);

export default BrandMarquee;

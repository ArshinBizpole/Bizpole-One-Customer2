import {
  Building2, Search, Briefcase, Sparkles, MapPin, Users, FileText, ListChecks,
  ClipboardCheck, Package, ShieldCheck, UserRound, Check,
} from "lucide-react";

// Right-hand "what this step is about" panel for the New Company wizard
// (FlowRunner variant="newco"). Keyed by step id; anything not listed falls
// back to a generic panel so every New Company flow (GST, Trademark, MSME…)
// still gets one.
const GUIDES = {
  lead: { icon: UserRound, title: "Tell us about you", body: "We use these details to keep you updated on your application and to reach you if our experts need anything.", points: ["Quick, one-time details", "Updates on mobile & email", "Your data stays private"] },
  type: { icon: Building2, title: "Pick the right business structure", body: "The structure decides your liability, compliance and how easily you can raise funds. Not sure? Use Help Me Choose.", points: ["Compare liability & compliance", "Get a recommendation", "Advisor confirms before filing"] },
  name: { icon: Search, title: "Choose a unique business name", body: "Your business name should be unique and comply with MCA guidelines. We'll help you check availability and suggest alternatives.", points: ["Check name availability", "Avoid similar names", "Follow MCA naming rules"] },
  namecheck: { icon: Search, title: "Check name availability", body: "We compare your proposed name with registered companies and trademarks so it has the best chance of approval.", points: ["Search registered names", "Spot similar names early", "Pick from alternatives"] },
  activity: { icon: Briefcase, title: "Describe what your business does", body: "Your business activity decides your NIC code, the registrations you need and the main objects of your company.", points: ["Pick the closest activity", "Describe it in your words", "We map it to the right code"] },
  objective: { icon: Sparkles, title: "AI business objective & NIC code", body: "We draft your main business objective and suggest NIC codes from your activity. Review and edit them before filing.", points: ["AI-drafted objective", "Suggested NIC codes", "Fully editable"] },
  address: { icon: MapPin, title: "Where will you operate from?", body: "The registered office receives official communication from the government. No office yet? We can arrange a virtual office.", points: ["Registered office address", "Owned, rented or leased", "Virtual office available"] },
  owners: { icon: Users, title: "Add owners & directors", body: "Add every director, partner or shareholder with their KYC details and shareholding.", points: ["PAN & Aadhaar verified", "Shareholding adds to 100%", "Minors need a guardian"] },
  documents: { icon: FileText, title: "Keep your documents ready", body: "Upload clear scans or photos. You can also skip a document now and upload it later from your dashboard.", points: ["PDF, JPG or PNG", "Clear & readable copies", "Upload later if needed"] },
  addons: { icon: ListChecks, title: "Additional registrations", body: "Add registrations your business will need from day one and save time by filing them together.", points: ["Recommended for your activity", "Filed alongside incorporation", "One place to track all"] },
  __review: { icon: ClipboardCheck, title: "Review before you pay", body: "Check every detail carefully — the government filing uses exactly what you enter here.", points: ["Edit any section", "Confirm all details", "Then pick a package"] },
  __packages: { icon: Package, title: "Choose your package", body: "Every package includes expert filing. Pick the one that fits the support you need after registration.", points: ["Transparent pricing", "Government fee included", "No hidden charges"] },
  __payment: { icon: ShieldCheck, title: "Secure payment", body: "Pay securely online, or request a call back and our advisor will help you complete the application.", points: ["Encrypted payment", "Instant receipt", "Call back on request"] },
};

const FALLBACK = { icon: FileText, title: "We're with you at every step", body: "Answer a few quick questions — our experts review every application before it's filed.", points: ["Progress saved automatically", "Expert review before filing", "Track status on your dashboard"] };

function Illustration({ icon: Icon }) {
  return (
    <div className="relative mx-auto w-[120px] h-[112px]">
      <span className="absolute left-0 top-1 text-[#F5C518] text-sm leading-none">+</span>
      <span className="absolute right-0 top-3 text-[#F5C518] text-[10px] leading-none">+</span>
      <span className="absolute right-1 top-[46%] text-[#F5C518] text-[10px] leading-none">+</span>
      <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[72px] h-[92px] rounded-xl bg-white border border-[#F1E3B3] shadow-[0_6px_16px_rgba(16,24,40,0.08)] px-2.5 py-3 space-y-1.5">
        <div className="h-1.5 w-full rounded bg-gray-100" />
        <div className="h-1.5 w-4/5 rounded bg-gray-100" />
        <div className="h-1.5 w-full rounded bg-gray-100" />
        <div className="h-1.5 w-3/5 rounded bg-gray-100" />
        <div className="h-1.5 w-2/5 rounded bg-gray-100 !mt-4" />
      </div>
      <div className="absolute right-3 bottom-0 w-9 h-9 rounded-full bg-[#F5C518] ring-4 ring-white shadow flex items-center justify-center">
        <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
      </div>
    </div>
  );
}

export default function FlowStepGuide({ step }) {
  const g = GUIDES[step?.id] || FALLBACK;
  return (
    <aside className="hidden xl:block xl:sticky xl:top-6">
      <div className="rounded-2xl border border-[#EEEAE0] bg-[#FAF8F3] shadow-[0_8px_24px_rgba(16,24,40,0.08)] px-5 pt-8 pb-6 min-h-[74vh]">
        <Illustration icon={g.icon} />
        <h3 className="mt-7 text-lg font-bold text-gray-900 leading-snug">{g.title}</h3>
        <p className="mt-3 text-xs text-gray-500 leading-relaxed">{g.body}</p>
        <div className="my-5 w-8 h-0.5 rounded-full bg-[#F5C518]" />
        <ul className="space-y-3">
          {g.points.map((p) => (
            <li key={p} className="flex items-center gap-2.5 text-xs font-semibold text-gray-800">
              <span className="flex-none w-4 h-4 rounded-full bg-[#F5C518] flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

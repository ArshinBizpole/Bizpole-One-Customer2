import { EXISTING_MENU } from "./existingCompanyData";

const ICONS = { plus: "＋", edit: "✎", shield: "🛡" };

export default function ExistingNeedsMenu({ onSelect }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tell us what you need help with</h1>
        <p className="text-gray-500 mt-1.5 max-w-2xl">
          We won't ask you to re-register anything. Choose your requirement and we'll only collect what's missing.
        </p>
      </div>

      {EXISTING_MENU.map((g) => (
        <div key={g.group} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 mb-4">
          <h3 className="flex items-center gap-2.5 font-semibold text-gray-800 mb-3">
            <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm">{ICONS[g.icon] || "•"}</span>
            {g.group}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {g.items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onSelect(item)}
                className="flex items-center gap-2.5 text-left rounded-lg border border-gray-200 px-3.5 py-3 text-sm font-medium text-gray-700 hover:border-blue-300 hover:bg-blue-50/60 transition"
              >
                <span className="w-4 h-4 rounded-full border-2 border-gray-300 flex-none" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-900">
        <span>💡</span>
        <div>Not sure which applies? Pick the closest option — every flow starts with a short clarifying question before we ask for documents.</div>
      </div>
    </div>
  );
}

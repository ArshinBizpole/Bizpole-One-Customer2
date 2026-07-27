const SectionTitle = ({ title, tag, tagColor = "indigo" }) => {
  const tagColors = {
    indigo: "bg-indigo-50 text-indigo-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return (
    <div className="mt-8 mb-3 flex items-center gap-2 px-0.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
        {title}
      </span>
      {tag && (
        <span
          className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide ${tagColors[tagColor]}`}
        >
          {tag}
        </span>
      )}
      <span className="ml-1 h-px flex-1 bg-gray-200" />
    </div>
  );
};

export default SectionTitle;

import { useState } from "react";
import { getSecureItem, setSecureItem, removeSecureItem } from "../utils/secureStorage";
import ExistingNeedsMenu from "../components/ExixistingCompany/ExistingNeedsMenu";
import FlowRunner from "../components/ExixistingCompany/FlowRunner";

const SELECTION_KEY = "existingCompanySelection";

const ExisitingCompanies = () => {
  const [selection, setSelection] = useState(() => getSecureItem(SELECTION_KEY));

  const handleSelect = (item) => {
    const next = { flow: item.flow, set: item.set || {} };
    setSecureItem(SELECTION_KEY, next);
    setSelection(next);
  };

  const handleExit = () => {
    removeSecureItem(SELECTION_KEY);
    setSelection(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {selection ? (
        <FlowRunner key={selection.flow} flowId={selection.flow} initialSet={selection.set} onExit={handleExit} />
      ) : (
        <ExistingNeedsMenu onSelect={handleSelect} />
      )}
    </div>
  );
};

export default ExisitingCompanies;

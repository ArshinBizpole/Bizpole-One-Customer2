import { useState, useEffect, useContext } from "react";
import { ProfileCompanyContext } from "./ProfileLayout";
import {
  getCompanyCompliances,
  updateComplianceStatus,
  getComplianceEvents,
} from "../api/CompanyApi";
import { toast } from "react-toastify";
import {
  Calendar,
  Pencil,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Calculator,
  Building2,
  BookOpen,
  FileText,
  UserCheck,
  Shield,
  Briefcase,
  Users,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Mic,
} from "lucide-react";

/* ---------- shared status config ---------- */

const statusConfig = {
  Complete: {
    icon: CheckCircle2,
    color: "text-green-600",
    pillBg: "bg-green-100 text-green-700",
  },
  Yes: {
    icon: CheckCircle2,
    color: "text-green-600",
    pillBg: "bg-green-100 text-green-700",
  },
  Pending: {
    icon: Clock,
    color: "text-amber-600",
    pillBg: "bg-amber-100 text-amber-700",
  },
  "Not Applicable": {
    icon: AlertCircle,
    color: "text-orange-600",
    pillBg: "bg-orange-100 text-orange-700",
  },
  No: {
    icon: XCircle,
    color: "text-red-500",
    pillBg: "bg-red-100 text-red-600",
  },
};

// Icon map for compliance items by name
const ICON_MAP = {
  "IE Code":           Briefcase,
  "FSSAI":             Shield,
  "ESI Registration":  Users,
  "EPF Registration":  Users,
  "TDS Returns":       FileText,
  "GST Returns":       Calculator,
  "ROC Filing":        Building2,
  "Books of Accounts": BookOpen,
  "IT Returns":        FileText,
  "Auditor":           UserCheck,
};

const getIcon = (name) => ICON_MAP[name] || FileText;

const formatDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

const STATUS_OPTIONS = ["Complete", "Pending", "Not Applicable"];

const ActionButton = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 transition-colors text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-md"
  >
    <Pencil className="w-4 h-4" />
    {label}
  </button>
);

/* ---------- view mode ---------- */

const StatusRow = ({ icon, title, subtitle, status, pill }) => (
  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <div className="font-medium text-gray-900 text-sm">{title}</div>
        <div className="text-xs text-gray-500">{subtitle}</div>
      </div>
    </div>
    <span
      className={`text-xs font-medium px-3 py-1 rounded-full ${pill || "bg-amber-100 text-amber-700"}`}
    >
      {status}
    </span>
  </div>
);

const RegistrationStatusCard = ({ onEdit, items, progress }) => {
  const completed = items.filter((i) => i.status === "Complete").length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-medium text-gray-900">
            Registration Status (For Compliance Calendar)
          </h2>
        </div>
        <ActionButton label="Edit Status" onClick={onEdit} />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          No compliance data found.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = getIcon(item.name);
            return (
              <StatusRow
                key={item.id}
                icon={<Icon className="w-5 h-5 text-amber-600" />}
                title={item.name}
                subtitle={item.description}
                status={item.status || "Pending"}
                pill={statusConfig[item.status]?.pillBg}
              />
            );
          })}
        </div>
      )}

      <div className="border-t border-gray-100 mt-6 pt-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-gray-900">
            Compliance Progress
          </div>
          <div className="text-xs text-gray-500">
            {completed} of {items.length} registrations complete
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700">{progress}%</span>
        </div>
      </div>
    </div>
  );
};

const ComplianceStatusCard = ({ onEdit, events }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-gray-700" />
        <h2 className="text-lg font-medium text-gray-900">Compliance Status</h2>
      </div>
      <ActionButton label="Update Status" onClick={onEdit} />
    </div>

    {events.length === 0 ? (
      <p className="text-sm text-gray-400 text-center py-6">
        No compliance events found.
      </p>
    ) : (
      <div className="space-y-2">
        {events.map((ev) => {
          const Icon = getIcon(ev.compliance_name);
          return (
            <StatusRow
              key={ev.id}
              icon={<Icon className="w-5 h-5 text-amber-500" />}
              title={ev.compliance_name}
              subtitle={`${ev.event_type} · ${formatDate(ev.event_date)}`}
              status={ev.status || ev.event_type}
              pill={statusConfig[ev.status]?.pillBg || "bg-amber-100 text-amber-700"}
            />
          );
        })}
      </div>
    )}

    <div className="border-t border-gray-100 mt-6 pt-4 flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-gray-900">Overall Compliance</div>
        <div className="text-xs text-gray-500">{events.length} event(s) recorded</div>
      </div>
    </div>
  </div>
);

/* ---------- edit mode form controls ---------- */

const StatusSelect = ({ value, onChange, options }) => {
  const config = statusConfig[value] || statusConfig.Pending;
  const Icon = config.icon;
  return (
    <div className="relative">
      <Icon
        className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${config.color} pointer-events-none`}
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-9 py-2 text-sm font-medium ${config.color} focus:outline-none focus:ring-2 focus:ring-amber-400`}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
};

const TextField = ({ value }) => (
  <input
    type="text"
    defaultValue={value}
    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
  />
);

const EditHeader = ({ title, subtitle, onBack }) => (
  <div className="flex items-center gap-3 mb-6">
    <button
      onClick={onBack}
      className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 flex-shrink-0"
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
    <div>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  </div>
);

const EditFooter = ({ onCancel, onSubmit, submitLabel, saving }) => (
  <div className="flex items-center justify-end gap-3 mt-6">
    <button
      onClick={onCancel}
      disabled={saving}
      className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
    >
      Cancel
    </button>
    <button
      onClick={onSubmit}
      disabled={saving}
      className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white px-4 py-2 rounded-lg flex items-center gap-1 text-sm font-medium shadow-md disabled:opacity-50"
    >
      {saving ? "Saving…" : submitLabel}
      {!saving && <ChevronRight className="w-4 h-4" />}
    </button>
  </div>
);

const Connector = () => (
  <div className="w-px h-4 border-l border-dashed border-gray-300 mx-auto" />
);

/* ---------- Registration Status edit form ---------- */

const RegistrationStatusEdit = ({ onCancel, onSave, items }) => {
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initial = {};
    items.forEach((item) => {
      initial[item.id] = item.status || "Pending";
    });
    setEdits(initial);
  }, [items]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        items.map((item) => updateComplianceStatus(item.id, edits[item.id])),
      );
      toast.success("Registration status saved");
      onSave(edits);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <EditHeader
        title="Registration Status"
        subtitle="Update your compliance registration information"
        onBack={onCancel}
      />

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4 text-sm font-medium text-gray-700">
          <FileText className="w-4 h-4 text-amber-500" />
          Registration Requirements
        </div>

        {items.map((item, idx) => {
          const Icon = getIcon(item.name);
          const currentStatus = edits[item.id] || "Pending";
          return (
            <div key={item.id}>
              <div className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.description}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${statusConfig[currentStatus]?.pillBg || "bg-amber-100 text-amber-700"}`}
                  >
                    {currentStatus}
                  </span>
                </div>
                <div className="text-xs font-medium text-gray-500 mb-2 ml-12">
                  DO YOU HAVE {item.name.toUpperCase()}?
                </div>
                <div className="ml-12">
                  <StatusSelect
                    value={currentStatus}
                    options={STATUS_OPTIONS}
                    onChange={(val) =>
                      setEdits((prev) => ({ ...prev, [item.id]: val }))
                    }
                  />
                </div>
              </div>
              {idx < items.length - 1 && <Connector />}
            </div>
          );
        })}
      </div>

      <EditFooter
        onCancel={onCancel}
        onSubmit={handleSave}
        submitLabel="Save Changes"
        saving={saving}
      />
    </div>
  );
};

/* ---------- Compliance Status Check edit form ---------- */

const complianceEditItems = [
  {
    id: 1,
    icon: Calculator,
    question: "ARE GST RETURNS UP TO DATE?",
    type: "select",
    value: "Yes",
    options: ["Yes", "No"],
  },
  {
    id: 2,
    icon: Building2,
    question: "IS ROC FILING CURRENT?",
    type: "text",
    value: "FY 2023-24",
  },
  {
    id: 3,
    icon: BookOpen,
    question: "BOOKS OF ACCOUNTS UP TO DATE?",
    type: "select",
    value: "Yes",
    options: ["Yes", "No"],
  },
  {
    id: 4,
    icon: FileText,
    question: "IS IT RETURN UP TO DATE?",
    type: "text",
    value: "FY 2023-24",
  },
  {
    id: 5,
    icon: UserCheck,
    question: "DO YOU HAVE AN AUDITOR?",
    type: "select",
    value: "Yes",
    options: ["Yes", "No"],
  },
];

const AudioField = ({ label }) => (
  <div className="mb-4 last:mb-0">
    <label className="text-xs font-medium text-gray-500 block mb-2">
      {label}
    </label>
    <div className="relative">
      <textarea
        placeholder="Audio to Text"
        rows={3}
        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
      <button className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center text-white">
        <Mic className="w-4 h-4" />
      </button>
    </div>
  </div>
);

const ComplianceStatusEdit = ({ onCancel, onSave }) => (
  <div>
    <EditHeader
      title="Compliance Status Check"
      subtitle="Update your compliance and business information"
      onBack={onCancel}
    />

    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4 text-sm font-medium text-gray-700">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
        Compliance Status Check
      </div>

      {complianceEditItems.map((item, idx) => (
        <div key={item.id}>
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-sm font-semibold text-gray-800 tracking-wide">
                  {item.question}
                </div>
              </div>
              {item.type === "select" && (
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${statusConfig[item.value]?.pillBg}`}
                >
                  {item.value}
                </span>
              )}
            </div>
            <div className="ml-12">
              {item.type === "select" ? (
                <StatusSelect
                  value={item.value}
                  options={item.options}
                  onChange={() => {}}
                />
              ) : (
                <TextField value={item.value} />
              )}
            </div>
          </div>
          {idx < complianceEditItems.length - 1 && <Connector />}
        </div>
      ))}
    </div>

    <div className="bg-white border border-gray-200 rounded-xl p-5 mt-4">
      <div className="text-sm font-medium text-gray-700 mb-4">
        Business Understanding
      </div>
      <AudioField label="TELL US MORE ABOUT YOUR BUSINESS" />
      <AudioField label="WHAT IS YOUR EXPECTATION FROM BIZPOLE?" />
    </div>

    <EditFooter onCancel={onCancel} onSubmit={onSave} submitLabel="Next" />
  </div>
);

/* ---------- page ---------- */

const tabs = [
  { id: "registration", label: "Registration Status" },
  { id: "compliance", label: "Compliance Status" },
];

const CompliancePage = () => {
  const { selectedCompanyId } = useContext(ProfileCompanyContext);
  const [activeTab, setActiveTab] = useState("registration");
  const [isEditing, setIsEditing] = useState(false);

  const [regItems, setRegItems] = useState([]);
  const [regProgress, setRegProgress] = useState(0);
  const [events, setEvents] = useState([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    // Reset everything so stale data from the previous company isn't shown
    setIsEditing(false);
    setActiveTab("registration");
    setRegItems([]);
    setRegProgress(0);
    setEvents([]);

    if (!selectedCompanyId) return;

    const load = async () => {
      setFetching(true);
      try {
        const [compRes, evRes] = await Promise.all([
          getCompanyCompliances(selectedCompanyId),
          getComplianceEvents(selectedCompanyId),
        ]);
        if (compRes.success) {
          setRegItems(compRes.data.items);
          setRegProgress(compRes.data.progress);
        }
        if (evRes.success) {
          setEvents(evRes.data);
        }
      } catch (err) {
        console.error("Error loading compliance data:", err);
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [selectedCompanyId]);

  const handleRegSave = (updatedEdits) => {
    setRegItems((prev) =>
      prev.map((item) => ({
        ...item,
        status: updatedEdits[item.id] || item.status,
      })),
    );
    // Recalculate progress
    const updated = regItems.map((item) => ({
      ...item,
      status: updatedEdits[item.id] || item.status,
    }));
    const completed = updated.filter((i) => i.status === "Complete").length;
    setRegProgress(
      updated.length > 0 ? Math.round((completed / updated.length) * 100) : 0,
    );
    setIsEditing(false);
  };

  const handleTabChange = (id) => {
    setActiveTab(id);
    setIsEditing(false);
  };

  if (fetching) {
    return (
      <div className="bg-white p-6 flex items-center justify-center min-h-48">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Compliance</h1>
      <div className="max-w-5xl mx-auto">
        {!isEditing && (
          <div className="inline-flex bg-gray-100 rounded-lg p-1 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {activeTab === "registration" ? (
          isEditing ? (
            <RegistrationStatusEdit
              items={regItems}
              onCancel={() => setIsEditing(false)}
              onSave={handleRegSave}
            />
          ) : (
            <RegistrationStatusCard
              items={regItems}
              progress={regProgress}
              onEdit={() => setIsEditing(true)}
            />
          )
        ) : isEditing ? (
          <ComplianceStatusEdit
            onCancel={() => setIsEditing(false)}
            onSave={() => setIsEditing(false)}
          />
        ) : (
          <ComplianceStatusCard
            events={events}
            onEdit={() => setIsEditing(true)}
          />
        )}
      </div>
    </div>
  );
};

export default CompliancePage;

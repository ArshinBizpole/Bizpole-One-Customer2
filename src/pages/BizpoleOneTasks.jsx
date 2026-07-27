// src/App.jsx
import { useState, useEffect, useMemo } from "react";
import {
  getCompanyServices,
  getServiceDeliverablesByServiceDetailId,
  getTasks,
  getResponseFieldsBySerId,
} from "../api/TaskApi";
import { serviceFormMapping } from "../api/Services/ServiceDetails";
import { useLocation } from "react-router-dom";
import ServiceTaskListing from "../../src/components/associate/ServiceTaskListing";
import ServiceTaskForm from "../../src/components/associate/ServiceTaskForm";
import { getSecureItem, removeSecureItem } from "../utils/secureStorage";

// Mock data (keep as fallback so the table always has something to render
// while real per-task data is wired up on the backend)
// const currentTasks = [
//   {
//     id: 1,
//     title: "Bank details",
//     status: "Approved",
//     date: "18 Apr 2021",
//     progress: 100,
//     completed: true,
//     assignee: { name: "Aaron More", avatar: null },
//   },
//   {
//     id: 2,
//     title: "CIN number",
//     status: "In review",
//     date: "18 Apr 2021",
//     progress: 55,
//     completed: true,
//     assignee: { name: "Aaron More", avatar: null },
//   },
//   {
//     id: 3,
//     title: "ID Proof",
//     status: "Not Approved",
//     date: "18 Apr 2021",
//     progress: 30,
//     completed: true,
//     assignee: null,
//   },
//   {
//     id: 4,
//     title: "Interactive prototype for app screens of deltamine project",
//     status: "In review",
//     date: "18 Apr 2021",
//     progress: 40,
//     completed: false,
//     assignee: null,
//   },
//   {
//     id: 5,
//     title: "Interactive prototype for app screens of deltamine project",
//     status: "Approved",
//     date: "",
//     progress: 90,
//     completed: true,
//     assignee: null,
//   },
// ];

// const upcomingTasks = [
//   {
//     id: 1,
//     title: "Create a user flow of social application design",
//     status: "Disable",
//     date: "18 Apr 2021",
//     progress: 20,
//     assignee: { name: "Aaron More", avatar: null },
//   },
//   {
//     id: 2,
//     title: "Create a user flow of social application design",
//     status: "Disable",
//     date: "18 Apr 2021",
//     progress: 15,
//     assignee: { name: "Aaron More", avatar: null },
//   },
//   {
//     id: 3,
//     title: "Landing page design for Fintech project of singapore",
//     status: "Disable",
//     date: "18 Apr 2021",
//     progress: 10,
//     assignee: null,
//   },
//   {
//     id: 4,
//     title: "Interactive prototype for app screens of deltamine project",
//     status: "Disable",
//     date: "",
//     progress: 25,
//     assignee: null,
//   },
//   {
//     id: 5,
//     title: "Interactive prototype for app screens of deltamine project",
//     status: "Disable",
//     date: "",
//     progress: 0,
//     assignee: null,
//   },
// ];

const STATUS_FILTERS = ["All", "Approved", "In review", "Not Approved", "Not Uploaded", "Disable"];


export default function ServiceSelection() {
  const location = useLocation();
  const navState = location.state || {};
  const navServiceId = navState.serviceId;
  const navService = navState.service;
  const navQuoteId = navService?.QuoteID || navState.quoteId;

  // State declarations - all at the top level
  const [formConfig, setFormConfig] = useState([]);
  const [service, setService] = useState(null);
  const [companyServices, setCompanyServices] = useState(null);
  const [loadingCompanyServices, setLoadingCompanyServices] = useState(false);
  const [companyServicesError, setCompanyServicesError] = useState(null);
  const [responseFields, setResponseFields] = useState([]);
  const [responseFieldsLoading, setResponseFieldsLoading] = useState(false);
  const [serviceFormFullMapping, setServiceFormFullMapping] = useState(null);
  const [selectedService, setSelectedService] = useState(navService || null);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentsError, setDocumentsError] = useState(null);
  const [verifiedFields, setVerifiedFields] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Task");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [collectDataTask, setCollectDataTask] = useState(null);
  const [noteTask, setNoteTask] = useState(null);
  const [tasksFromApi, setTasksFromApi] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [tasksError, setTasksError] = useState(null);
  const [serviceDeliverables, setServiceDeliverables] = useState(null);
  const [loadingDeliverables, setLoadingDeliverables] = useState(false);
  const [deliverablesError, setDeliverablesError] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(null);


  const [companyId, setCompanyId] = useState(() => getSecureItem("selectedCompany")?.CompanyID || null);

  const [activeFormTask, setActiveFormTask] = useState(null); // task currently open in modal

  // Add more task types here as you build them out — same shape as "Bank"
  const TASK_FORM_CONFIGS = {
    "Bank details": {
      title: "Bank",
      rejectionMessage:
        "Important: The bank details you submitted could not be verified. Kindly provide the information as outlined below.",
      fields: [
        { type: "text", name: "accountNumber", label: "Account Number", required: true, colSpan: 1 },
        { type: "select", name: "branchCode", label: "Branch code", required: true, options: [], colSpan: 1 },
        { type: "file", name: "accountBook", label: "Account Book", required: false, colSpan: 1 },
        { type: "select", name: "ifscCode", label: "IFSC code", required: true, options: [], colSpan: 1 },
      ],
    },
  };

  const getFormConfigForTask = (task) =>
    TASK_FORM_CONFIGS[task?.title] || {
      title: task?.title || "Task",
      fields: [
        { type: "text", name: "value", label: task?.title || "Details", required: true, colSpan: 2 },
      ],
    };

  // Clear invalid selectedCompany format
  useEffect(() => {
    const raw = localStorage.getItem("selectedCompany");
    if (raw && raw === "[object Object]") {
      removeSecureItem("selectedCompany");
      console.warn("selectedCompany was invalid and has been removed. Please re-select the company.");
    }
  }, []);

  // Re-fetch when company is switched from the dropdown
  useEffect(() => {
    const handler = () => {
      const company = getSecureItem("selectedCompany");
      setCompanyId(company?.CompanyID || null);
      setSelectedService(null);
      setCompanyServices(null);
    };
    window.addEventListener("company-switched", handler);
    return () => window.removeEventListener("company-switched", handler);
  }, []);

  // Fetch company services
  useEffect(() => {
    if (companyId) {
      const fetchCompanyServices = async () => {
        setLoadingCompanyServices(true);
        setCompanyServicesError(null);
        try {
          const data = await getCompanyServices(companyId);
          setCompanyServices(data);
        } catch (err) {
          console.error("Error fetching company services:", err);
          setCompanyServicesError("Failed to fetch company services.");
        } finally {
          setLoadingCompanyServices(false);
        }
      };
      fetchCompanyServices();
    }
  }, [companyId]);

  // Auto-select service from navigation state
  useEffect(() => {
    if (navServiceId && companyServices?.services?.length > 0) {
      const found = companyServices.services.find(
        (s) => String(s.ServiceDetailID) === String(navServiceId)
      );
      if (found && (!selectedService || selectedService.ServiceDetailID !== found.ServiceDetailID)) {
        setSelectedService(found);
      }
    } else if (!navServiceId && !selectedService && companyServices?.services?.length > 0) {
      setSelectedService(companyServices.services[0]);
    }
  }, [navServiceId, companyServices, selectedService]);

  // Fetch tasks and approval status for Task tab
  useEffect(() => {
    const serviceCompanyId = selectedService?.CompanyID || selectedService?.companyId || companyId;

    if (activeTab === "Task" && serviceCompanyId && selectedService?.ServiceDetailID) {
      const fetchTasksAndApproval = async () => {
        setLoadingTasks(true);
        setTasksError(null);
        try {
          // Fetch tasks
          const data = await getTasks({
            ServiceDetailID: selectedService.ServiceDetailID,
            QuoteID: selectedService.QuoteID || navQuoteId,
          });
          setTasksFromApi(data || []);

          // Fetch approval status
          const respFields = await getResponseFieldsBySerId(selectedService.ServiceID);

          if (!respFields?.results || respFields.results.length === 0) {
            setApprovalStatus("No Records Found");
          } else {
            const allFields = respFields.results.flatMap((r) => r.fields || []);

            const isRejected = allFields.some((f) => f.reject === 1);
            const allVerified =
              allFields.length > 0 &&
              allFields.every((f) => f.verify === 1);

            setApprovalStatus(
              isRejected
                ? "Not Approved"
                : allVerified
                  ? "Approved"
                  : "In review"
            );
          }
        } catch (err) {
          setTasksError("Failed to fetch tasks from /Task API.");
          setApprovalStatus(null);
        } finally {
          setLoadingTasks(false);
        }
      };
      fetchTasksAndApproval();
    } else if (activeTab === "Task") {
      setTasksFromApi([]);
      setApprovalStatus(null);
    }
  }, [activeTab, selectedService, companyId, navQuoteId]);

  // Fetch documents/response fields
  useEffect(() => {
    const serviceCompanyId = selectedService?.CompanyID || selectedService?.companyId || companyId;
    const serviceQuoteId = selectedService?.QuoteID || navQuoteId;

    if (activeTab === "Documents" && serviceCompanyId && selectedService?.ServiceID) {
      setLoadingDocuments(true);
      setDocumentsError(null);

      getResponseFieldsBySerId(selectedService.ServiceID)
        .then((data) => {
          if (!data?.results || data.results.length === 0) {
            setVerifiedFields([]);
            setLoadingDocuments(false);
            return;
          }

          // The API returns response sets for every company that has ever used
          // this ServiceID, so only keep the ones belonging to the currently
          // selected company/quote before flattening fields.
          const matchingSets = data.results.filter((r) => {
            const companyMatches = String(r.company_id) === String(serviceCompanyId);
            const quoteMatches =
              !serviceQuoteId || r.quote_id == null || String(r.quote_id) === String(serviceQuoteId);
            return companyMatches && quoteMatches;
          });

          const allFields = matchingSets.flatMap((r) => r.fields || []);

          // Keep only the latest submission per field (results are ordered
          // oldest-to-newest, so a later entry overwrites an earlier one).
          const latestFieldsMap = new Map();
          allFields.forEach((f) => {
            const key = f.field_id ?? f.field_key;
            latestFieldsMap.set(key, f);
          });
          const latestFields = Array.from(latestFieldsMap.values());

          let verified = [];

          if (activeTab === "Documents") {
            verified = latestFields.filter(
              (f) => f.verify === 1 || f.verify === 0
            );
          } else if (activeTab === "Task") {
            verified = latestFields.filter((f) => f.verify === 1);
          } else {
            verified = latestFields.filter((f) => f.verify === 0);
          }

          setVerifiedFields(verified);
          setLoadingDocuments(false);
        })
        .catch((err) => {
          console.error("[Documents] getResponseFields API error:", err);
          setVerifiedFields([]);
          setDocumentsError("Failed to fetch verified fields.");
          setLoadingDocuments(false);
        });
    } else {
      setVerifiedFields([]);
    }
  }, [activeTab, selectedService]);

  // Fetch response fields by company ID
  const fetchFields = async () => {
    if (!selectedService?.ServiceID) return;

    setResponseFieldsLoading(true);

    try {
      const response = await getResponseFieldsBySerId(selectedService.ServiceID);

      if (
        !response ||
        !response.results ||
        response.results.length === 0
      ) {
        setResponseFields([]);
        return;
      }

      setResponseFields(response.results);
    } catch (error) {
      console.error("Error fetching response fields:", error);
      setResponseFields([]);
    } finally {
      setResponseFieldsLoading(false);
    }
  };
  useEffect(() => {
    fetchFields();
  }, [selectedService?.ServiceID]);

  // Fetch deliverables
  useEffect(() => {
    if (activeTab === "Deliverables" && selectedService?.ServiceDetailID) {
      setLoadingDeliverables(true);
      setDeliverablesError(null);

      getServiceDeliverablesByServiceDetailId(selectedService.ServiceDetailID)
        .then((data) => {
          setServiceDeliverables(data);
          setLoadingDeliverables(false);
        })
        .catch((err) => {
          console.error("[Deliverables] API error:", err);
          setDeliverablesError("Failed to fetch deliverables.");
          setLoadingDeliverables(false);
        });
    } else if (activeTab === "Deliverables") {
      setServiceDeliverables(null);
    }
  }, [activeTab, selectedService]);

  // Fetch formConfig
  useEffect(() => {
    if (selectedService?.ServiceID) {
      setFormConfig([]);
      serviceFormMapping(selectedService.ServiceID)
        .then((res) => {
          if (res?.data) setFormConfig(res.data);
          else if (Array.isArray(res)) setFormConfig(res);
          setService(selectedService);
        })
        .catch((err) => {
          console.error("Error fetching form mapping:", err);
          setFormConfig([]);
        });
    }
  }, [selectedService]);

  // ---------- Helpers ----------
  const getStatusStyles = (status) => {
    switch (status) {
      case "Approved":
        return "bg-green-50 text-green-500";
      case "In review":
        return "bg-orange-50 text-orange-500";
      case "Not Approved":
        return "bg-red-50 text-red-500";
      case "Not Uploaded":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-50 text-gray-500";
    }
  };

  const getProgressBarColor = (status, disabled) => {
    if (disabled) return "bg-indigo-100";
    if (status === "Not Approved") return "bg-red-300";
    return "bg-yellow-400";
  };

  const getInitials = (name = "") =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  // Helper to find previous submitted field value for status mapping
  const getFieldPrevData = (fieldID, fieldName) => {
    const dataArray = Array.isArray(responseFields)
      ? responseFields
      : responseFields?.results || [];
    if (!dataArray || dataArray.length === 0) return null;

    for (let i = dataArray.length - 1; i >= 0; i--) {
      const set = dataArray[i];
      const foundField = set.fields?.find(
        (f) =>
          (f.field_id && Number(f.field_id) === Number(fieldID)) ||
          f.field_key === fieldName,
      );
      if (foundField) return foundField;
    }
    return null;
  };

  // Memoized actual tasks from forms mapping
  const tasks = useMemo(() => {
    if (!formConfig || formConfig.length === 0) return [];

    return formConfig.map((item) => {
      const sections = item.Sections || [];
      const fields = sections.flatMap((s) => s.Fields || []);

      let allSubmitted = fields.length > 0;
      let allVerified = fields.length > 0;
      let anyRejected = false;
      let anySubmitted = false;

      fields.forEach((field) => {
        const prevData = getFieldPrevData(field.FieldID, field.FieldName);
        if (prevData) {
          anySubmitted = true;
          if (prevData.reject === 1) anyRejected = true;
          if (prevData.verify !== 1) allVerified = false;
        } else {
          allSubmitted = false;
          allVerified = false;
        }
      });

      let calculatedStatus = item.Status || "In review";
      if (anyRejected) {
        calculatedStatus = "Not Approved";
      } else if (allSubmitted && allVerified) {
        calculatedStatus = "Approved";
      } else if (anySubmitted) {
        calculatedStatus = "In review";
      } else if (fields.length > 0) {
        calculatedStatus = "Not Uploaded";
      }

      return {
        id: item.Id,
        title: item.SubFormMaster?.SubFormName || "Required Form",
        subtitle:
          item.Section || item.Sections?.[0]?.SectionName || "Documentation",
        status: calculatedStatus,
        date: item.EmployeeAssignment?.CreatedAt
          ? new Date(item.EmployeeAssignment.CreatedAt).toLocaleDateString(
            "en-GB",
            {
              day: "2-digit",
              month: "short",
              year: "numeric",
            },
          )
          : item.UpdatedAt
            ? new Date(item.UpdatedAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
            : "Pending",
        progress:
          calculatedStatus === "Approved" ? 100 : calculatedStatus === "In review" ? 70 : anySubmitted ? 50 : 40,
        completed: calculatedStatus === "Approved",
        assignee: item.EmployeeAssignment?.EmployeeName ? {
          name: item.EmployeeAssignment.EmployeeName,
          avatar: "https://ui-avatars.com/api/?name=" + encodeURIComponent(item.EmployeeAssignment.EmployeeName) + "&background=4b49ac&color=fff"
        } : null,
        originalData: item,
      };
    });
  }, [formConfig, responseFields]);

  // Prefer real API task list if it looks like an array of tasks, otherwise fall back to mock data
  const realTaskList = Array.isArray(tasksFromApi) && tasksFromApi.length > 0 ? tasksFromApi : null;

const displayedCurrentTasks =
  tasks.length > 0
    ? tasks.slice(0, 5)
    : realTaskList
      ? realTaskList.map((t) => ({
          id: t.id ?? t.TaskID,
          title: t.title ?? t.TaskName ?? "Untitled task",
          status: t.status ?? approvalStatus ?? "In review",
          date: t.date ?? t.assignedAt ?? "",
          progress: t.progress ?? t.percentComplete ?? 0,
          completed: t.completed ?? t.status === "Approved",
          assignee: t.assignee ?? null,
        }))
      : [];

const displayedUpcomingTasks =
  tasks.length > 5
    ? tasks.slice(5)
    : [];

  const filteredCurrentTasks =
    statusFilter === "All"
      ? displayedCurrentTasks
      : displayedCurrentTasks.filter((task) => task.status === statusFilter);

  const filteredUpcomingTasks =
    statusFilter === "All"
      ? displayedUpcomingTasks
      : displayedUpcomingTasks.filter((task) => task.status === statusFilter);

  const summary = !Array.isArray(tasksFromApi)
    ? tasksFromApi?.summary
    : tasksFromApi?.[0];

  // Full set of tasks actually rendered (current + upcoming), so the summary card
  // always matches what's shown in the task list below.
  const allListedTasks = [...displayedCurrentTasks, ...displayedUpcomingTasks];

  const totalTasksCompleted =
    allListedTasks.length > 0
      ? allListedTasks.filter((t) => t.completed).length
      : (summary?.totalTasksCompleted ?? summary?.totalTasks ?? 0);
  const startDate = summary?.assignedAt ?? summary?.startDate ?? "-";
  const paymentDue =
    summary?.paymentDue !== undefined && summary?.paymentDue !== null ? `₹${summary.paymentDue}` : "-";
  const overallPercent =
    allListedTasks.length > 0
      ? Math.round((totalTasksCompleted / allListedTasks.length) * 100)
      : Math.min(100, Math.max(0, parseFloat(String(summary?.percentComplete ?? 0).replace("%", "")) || 0));
  const overallStatusLabel =
    allListedTasks.length === 0
      ? "In Progress"
      : allListedTasks.some((t) => t.status === "Not Approved")
        ? "Not Approved"
        : allListedTasks.every((t) => t.completed)
          ? "Completed"
          : "In Progress";

  // ---------- Reusable task row ----------
  const TaskRow = ({ task, disabled }) => (
    <div
      className={`grid grid-cols-[24px_1fr_120px_110px_150px_150px] items-center gap-4 py-3 ${disabled ? "" : "cursor-pointer hover:bg-gray-50 rounded-lg"
        }`}
      onClick={() => {
        if (!disabled) setActiveFormTask(task);
      }}
    >
      <div className="flex justify-center">
        {task.completed ? (
          <span className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        ) : (
          <span
            className={`w-5 h-5 rounded-full border-2 block ${disabled ? "border-gray-200" : "border-gray-300"}`}
          />
        )}
      </div>

      <div className={`text-sm truncate pr-2 ${disabled ? "text-gray-300" : "text-gray-800"}`}>{task.title}</div>

      <div>
        {task.status === "Disable" ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400">
            <span className="w-4 h-4 rounded-full bg-red-400 text-white flex items-center justify-center text-[9px] leading-none">
              ✕
            </span>
            Disable
          </span>
        ) : (
          <span
            className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${getStatusStyles(task.status)}`}
          >
            {task.status}
          </span>
        )}
      </div>

      <div className={`text-xs ${disabled ? "text-gray-300" : "text-gray-500"}`}>{task.date || ""}</div>

      <div className="flex items-center pr-4">
        <div className={`w-full h-1.5 rounded-full overflow-hidden ${disabled ? "bg-indigo-50" : "bg-gray-100"}`}>
          <div
            className={`h-full rounded-full ${getProgressBarColor(task.status, disabled)}`}
            style={{ width: `${task.progress || 0}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {task.assignee ? (
          <>
            {task.assignee.avatar ? (
              <img
                src={task.assignee.avatar}
                alt={task.assignee.name}
                className="w-6 h-6 rounded-full object-cover border border-white shadow flex-shrink-0"
              />
            ) : (
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold flex-shrink-0 ${disabled ? "bg-gray-100 text-gray-300" : "bg-yellow-100 text-yellow-700"
                  }`}
              >
                {getInitials(task.assignee.name)}
              </span>
            )}
            <span className={`text-sm truncate ${disabled ? "text-gray-300" : "text-gray-700"}`}>
              {task.assignee.name}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );

  // Collect Data Form Component
  const CollectDataForm = ({ task, onBack }) => {
    const [form, setForm] = useState({
      name: "",
      mobile: "",
      aadhaar: "",
      pan: "",
      address: "",
      fileAadhaar: null,
      filePan: null,
      fileOther: null,
    });

    const handleChange = (e) => {
      const { name, value, files } = e.target;
      if (name === "fileAadhaar" || name === "filePan" || name === "fileOther") {
        setForm({ ...form, [name]: files[0] });
      } else {
        setForm({ ...form, [name]: value });
      }
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      onBack();
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
        <button onClick={onBack} className="mb-4 text-gray-500 hover:text-gray-700 text-sm">
          ← Back to Tasks
        </button>
        <h2 className="text-xl font-bold mb-4 text-yellow-600">Collect Data for Task</h2>
        <div className="mb-4">
          <div className="font-semibold text-gray-700 mb-2">Task Name</div>
          <div className="text-gray-900 mb-2">{task.title}</div>
          <div className="text-sm text-gray-500 mb-2">
            Status: <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">{task.status}</span>
          </div>
          <div className="text-sm text-gray-500 mb-2">Date: {task.date || "N/A"}</div>
          <div className="text-sm text-gray-500 mb-2">Progress: {task.progress}%</div>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
            placeholder="Enter your name"
            required
          />
          <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
          <input
            type="tel"
            name="mobile"
            value={form.mobile}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
            placeholder="Enter your mobile number"
            required
          />
          <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar Number</label>
          <input
            type="text"
            name="aadhaar"
            value={form.aadhaar}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
            placeholder="Enter Aadhaar number"
            required
          />
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Aadhaar Card</label>
          <input type="file" name="fileAadhaar" accept="image/*,application/pdf" onChange={handleChange} className="mb-4" />
          {form.fileAadhaar && (
            <div className="mb-4">
              <span className="block text-xs text-gray-500 mb-1">Preview:</span>
              <img src={URL.createObjectURL(form.fileAadhaar)} alt="Aadhaar Preview" className="h-24 rounded-lg object-cover" />
            </div>
          )}
          <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number</label>
          <input
            type="text"
            name="pan"
            value={form.pan}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
            placeholder="Enter PAN number"
            required
          />
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload PAN Card</label>
          <input type="file" name="filePan" accept="image/*,application/pdf" onChange={handleChange} className="mb-4" />
          {form.filePan && (
            <div className="mb-4">
              <span className="block text-xs text-gray-500 mb-1">Preview:</span>
              <img src={URL.createObjectURL(form.filePan)} alt="PAN Preview" className="h-24 rounded-lg object-cover" />
            </div>
          )}
          <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
          <input
            type="text"
            name="address"
            value={form.address}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
            placeholder="Enter address"
          />
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Other Document</label>
          <input type="file" name="fileOther" accept="image/*,application/pdf" onChange={handleChange} className="mb-4" />
          {form.fileOther && (
            <div className="mb-4">
              <span className="block text-xs text-gray-500 mb-1">Preview:</span>
              <img src={URL.createObjectURL(form.fileOther)} alt="Other Document Preview" className="h-24 rounded-lg object-cover" />
            </div>
          )}
          <button
            type="submit"
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-semibold px-6 py-2 rounded-lg
             shadow w-full"
          >
            Submit Data
          </button>
        </form>
      </div>
    );
  };

  const TaskFormModal = ({ task, onClose }) => {
    const config = getFormConfigForTask(task);
    const [values, setValues] = useState({});

    const handleChange = (name, val) => setValues((v) => ({ ...v, [name]: val }));

    const handleSubmit = (e) => {
      e.preventDefault();
      // TODO: wire to real submit endpoint per task type
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-gray-100">
          <div className="px-8 pt-6 pb-4 border-b-2 border-yellow-400 flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">{config.title}</h2>
            {task.status === "Not Approved" && (
              <span className="text-xs font-medium text-red-500 bg-red-50 border border-dashed border-red-300 px-3 py-1 rounded-full underline decoration-dotted decoration-red-400 underline-offset-2">
                Not Approved
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6">
            {task.status === "Not Approved" && config.rejectionMessage && (
              <div className="mb-6 text-sm text-gray-700 leading-relaxed">
                {config.rejectionMessage}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              {config.fields.map((field) => (
                <div key={field.name} className={field.colSpan === 2 ? "md:col-span-2" : ""}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm text-gray-700">{field.label}</label>
                    <span className="w-4 h-4 rounded-full border border-red-300 text-red-400 text-[10px] flex items-center justify-center">
                      i
                    </span>
                  </div>

                  {field.type === "text" && (
                    <input
                      type="text"
                      value={values[field.name] || ""}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      required={field.required}
                      className="w-full border border-yellow-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
                    />
                  )}

                  {field.type === "select" && (
                    <select
                      value={values[field.name] || ""}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      required={field.required}
                      className="w-full border border-yellow-400 rounded-lg px-3 py-2.5 text-sm text-gray-500 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                    >
                      <option value="">Select an option...</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === "file" && (
                    <div>
                      <label className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 text-sm font-medium px-4 py-2.5 rounded-lg cursor-pointer w-fit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        {values[field.name] ? "Change File" : "Upload Files"}
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleChange(field.name, e.target.files[0])}
                        />
                      </label>

                      {values[field.name] && (
                        <div className="flex items-center gap-2 mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 w-fit max-w-full">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 flex-shrink-0">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                          <span className="text-xs text-green-700 truncate max-w-[180px]">
                            {values[field.name].name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleChange(field.name, null)}
                            className="text-green-500 hover:text-green-700 flex-shrink-0"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-1.5">{field.required ? "Required" : ""}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-full text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-semibold px-6 py-2 rounded-lg shadow-sm"
              >
                SUBMIT
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Note Form Component
  const NoteForm = ({ task, onBack }) => {
    const [form, setForm] = useState({ name: "", description: "", file: null });

    const handleChange = (e) => {
      const { name, value, files } = e.target;
      if (name === "file") {
        setForm({ ...form, file: files[0] });
      } else {
        setForm({ ...form, [name]: value });
      }
    };

    const handleReAddSubmit = (e) => {
      e.preventDefault();
      onBack();
    };

    return (
      <div className="bg-white rounded-lg border border-red-400 p-8 mb-8">
        <button onClick={onBack} className="mb-4 text-gray-500 hover:text-gray-700 text-sm">
          ← Back to Tasks
        </button>
        <h2 className="text-xl font-bold mb-4 text-red-600">Not Approved Task</h2>
        <div className="mb-4">
          <div className="font-semibold text-gray-700 mb-2">Task Name</div>
          <div className="text-gray-900 mb-2">{task.title}</div>
          <div className="text-sm text-gray-500 mb-2">
            Status: <span className="bg-red-100 text-red-700 px-2 py-1 rounded">{task.status}</span>
          </div>
          <div className="text-sm text-gray-700 mb-2 font-semibold">Why not approved?</div>
          <div className="bg-gray-100 text-gray-700 rounded-lg p-3 mb-4">
            Required data items are missing. Please re-submit with all required information.
          </div>
        </div>
        <form onSubmit={handleReAddSubmit}>
          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
            placeholder="Enter your name"
            required
          />
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
            placeholder="Describe your work"
            rows={3}
            required
          />
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Image</label>
          <input type="file" name="file" accept="image/*" onChange={handleChange} className="mb-4" />
          {form.file && (
            <div className="mb-4">
              <img src={URL.createObjectURL(form.file)} alt="Preview" className="h-24 rounded-lg object-cover" />
            </div>
          )}
          <button
            type="submit"
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-semibold px-6 py-2 rounded-lg shadow w-full"
          >
            Re-Add Task
          </button>
        </form>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-12 mb-10">
        <h1 className="text-2xl font-bold text-gray-900">Task</h1>
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="bg-yellow-400 hover:bg-[#F3C625] text-white text-base font-small pl-5 pr-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2"
          >
            <span>{selectedService?.ItemName || "Choose Services"}</span>
            <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-gray-600 text-[10px] font-semibold">
              {companyServices?.services?.length || 0}
            </span>
            <span className="text-gray-700 text-xs">⌄</span>
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
              <div className="p-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Select a Service</h3>
              </div>
              <div className="max-h-60 overflow-y-auto no-scrollbar">
                {loadingCompanyServices ? (
                  <div className="p-4 text-gray-500">Loading...</div>
                ) : companyServicesError ? (
                  <div className="p-4 text-red-500">{companyServicesError}</div>
                ) : companyServices?.services?.length > 0 ? (
                  companyServices.services.map((s) => (
                    <div
                      key={s.ServiceDetailID}
                      onClick={() => {
                        setSelectedService(s);
                        setIsDropdownOpen(false);
                      }}
                      className={`flex items-center p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 ${selectedService?.ServiceDetailID === s.ServiceDetailID ? "bg-yellow-100" : ""
                        }`}
                    >
                 
                      <div>
                        <h4 className="font-medium text-gray-800">{s.ItemName || `Service ID: ${s.ServiceID}`}</h4>
                        <p className="text-xs text-gray-500">
                          ServiceDetailID: {s.ServiceDetailID} | QuoteID: {s.QuoteID}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-gray-500">No services found.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary card */}
      {companyServices && companyServices.services?.length === 0 ? null : (
        <div className="mb-4 p-8 border-b border-[#F3C625]">
          {selectedService?.ItemName && (
            <h2 className="text-base font-semibold text-gray-800 mb-3">{selectedService.ItemName}</h2>
          )}

          {loadingTasks ? (
            <div className="py-4 text-gray-500">Loading summary...</div>
          ) : tasksError ? (
            <div className="py-4 text-red-500">{tasksError}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Total Tasks Completed</p>
                <p className="text-base font-semibold text-gray-800">{totalTasksCompleted}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Start Date</p>
                <p className="text-base font-semibold text-gray-800">{startDate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Payment Due</p>
                <p className="text-base font-semibold text-gray-800">{paymentDue}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Status</p>
                <div className="flex items-center gap-1.5">
                  <div
                    className="relative h-4 rounded-full bg-gray-100 overflow-hidden flex-shrink-0"
                    style={{ width: "150px" }}
                  >
                    <div className="absolute inset-0 flex items-center px-3">
                      <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {overallStatusLabel} / {overallPercent}%
                      </span>
                    </div>
                    <div
                      className="absolute inset-y-0 left-0 bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${overallPercent}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 overflow-hidden transition-all"
                      style={{ width: `${overallPercent}%` }}
                    >
                      <div className="h-full flex items-center px-3" style={{ width: "150px" }}>
                        <span className="text-[11px] font-semibold text-white whitespace-nowrap">
                          {overallStatusLabel} / {overallPercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className=" mt-8 mb-6 border border-gray-200 rounded-xl">
        <div className="flex items-center justify-between p-2">
          <div className="flex space-x-8">
            {["Task", "Documents", "Deliverables"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setCollectDataTask(null);
                  setNoteTask(null);
                }}
                className={`pb-3 px-1  font-medium text-sm ${activeTab === tab && !collectDataTask && !noteTask
                  ? "border-yellow-400 text-yellow-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                {tab}
              </button>
            ))}
            {collectDataTask && (
              <button className="pb-3 px-1 border-b-2 font-medium text-sm border-yellow-400 text-yellow-600" disabled>
                Collect Data
              </button>
            )}
            {noteTask && (
              <button className="pb-3 px-1 border-b-2 font-medium text-sm border-red-400 text-red-600" disabled>
                Add Note
              </button>
            )}
          </div>

          {activeTab === "Task" && !collectDataTask && !noteTask && (
            <div className="relative">
              <button
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Status: <span className="font-medium">{statusFilter}</span>
                <span className="text-xs">▾</span>
              </button>
              {isStatusDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  {STATUS_FILTERS.map((s) => (
                    <div
                      key={s}
                      onClick={() => {
                        setStatusFilter(s);
                        setIsStatusDropdownOpen(false);
                      }}
                      className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${statusFilter === s ? "text-yellow-600 font-medium" : "text-gray-600"
                        }`}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {collectDataTask ? (
        <CollectDataForm task={collectDataTask} onBack={() => setCollectDataTask(null)} />
      ) : noteTask ? (
        <NoteForm task={noteTask} onBack={() => setNoteTask(null)} />
      ) : companyServices && companyServices.services?.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 mb-8 text-center text-gray-500 text-sm">
          No task
        </div>
      ) : activeTab === "Task" ? (
        <div className="mb-10">
          {/* Current Task */}
          <div className="mb-10">
            <h3 className="text-base font-semibold text-gray-800 mb-3">Current Task</h3>
            <div className="grid grid-cols-[24px_1fr_120px_110px_150px_150px] gap-4 pb-3 mb-1 text-sm font-normal text-gray-400  border-b border-gray-200">
              <div />
              <div>All</div>
              <div>Status</div>
              <div>Date</div>
              <div>Progress</div>
              <div>Assignee</div>
            </div>
          {loadingTasks ? (
    <div>Loading...</div>
) : filteredCurrentTasks.length === 0 ? (
    <div className="py-6 text-center text-gray-500">
        No Records Found
    </div>
) : (
    filteredCurrentTasks.map((task) => (
        <TaskRow key={task.id} task={task} />
    ))
)}
          </div>

          {/* Upcoming Task */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-3">Upcoming Task</h3>
            <div className="flex items-center gap-1.5 pb-2 mb-2">
              <span className="text-xs font-medium text-yellow-500 border-b-2 border-yellow-400 pb-2">All</span>
              <span className="w-3.5 h-3.5 rounded-full bg-yellow-400" />
            </div>
            <div className="grid grid-cols-[24px_1fr_120px_110px_150px_150px] gap-4 pb-2 mb-1 text-xs font-medium text-gray-300 border-b border-gray-50">
              <div />
              <div>Task</div>
              <div>Status</div>
              <div>Date</div>
              <div>Progress</div>
              <div>Assignee</div>
            </div>
     {loadingTasks ? (
  <div className="py-6 text-gray-500 text-sm">
    Loading tasks...
  </div>
) : filteredUpcomingTasks.length > 0 ? (
  filteredUpcomingTasks.map((task) => (
    <TaskRow key={task.id} task={task} disabled />
  ))
) : (
  <div className="py-6 text-center text-gray-500 text-sm">
    No Records Found
  </div>
)}
          </div>

          {/* Keep the original dynamic task listing available, hidden below the
              redesigned tables, so real per-field submission logic is not lost */}
          <div className="hidden">
            <ServiceTaskListing
              formConfig={formConfig}
              responseFields={responseFields}
              serviceDetails={{
                CompanyID: companyId,
                ServiceID: service?.ServiceID,
                QuoteID: service?.QuoteID,
                OrderID: service?.OrderID,
                submittedBy: service?.submittedBy ?? getSecureItem("partnerUser")?.EmployeeID,
              }}
              onTaskUpdate={fetchFields}
            />
          </div>
        </div>
      ) : activeTab === "Documents" ? (
        <div className="bg-white rounded-lg p-8 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Uploaded</h3>
          {loadingDocuments && <p className="text-gray-600">Loading documents...</p>}
          {documentsError && <p className="text-red-500">{documentsError}</p>}
          {!loadingDocuments && !documentsError && verifiedFields.length > 0 && (
            <div className="flex flex-col gap-3">
              {verifiedFields.map((field) => (
                <div
                  key={field.fieldRows_id}
                  className="flex items-center justify-between border border-yellow-400 rounded-full px-5 py-3"
                >
                  <span className="text-sm text-gray-700 truncate max-w-lg">{field.field_key}</span>
                  {field.field_type === "File" ? (
                    <a
                      href={field.field_text}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 text-gray-500 hover:text-yellow-600 flex-shrink-0"
                      title="Download"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </a>
                  ) : (
                    <span className="ml-4 text-gray-800 font-semibold">{field.field_text}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {!loadingDocuments && !documentsError && verifiedFields.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              No Records Found
            </div>
          )}
        </div>
      ) : activeTab === "Deliverables" ? (
        <div className="bg-white rounded-lg  p-8 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Uploaded</h3>
          {loadingDeliverables && <p className="text-gray-600">Loading deliverables...</p>}
          {deliverablesError && <p className="text-red-500">{deliverablesError}</p>}
          {!loadingDeliverables && !deliverablesError && Array.isArray(serviceDeliverables) && serviceDeliverables.length > 0 && (
            <div className="flex flex-col gap-3">
              {serviceDeliverables.map((item) => {
                const isFile = item.type === "file";
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border border-yellow-400 rounded-full px-5 py-3"
                  >
                    <span className="text-sm text-gray-700 truncate max-w-lg">{item.label}</span>
                    {isFile ? (
                      <a
                        href={item.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 text-gray-500 hover:text-yellow-600 flex-shrink-0"
                        title="Download"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </a>
                    ) : (
                      <span className="ml-4 text-gray-800 font-semibold">{item.value}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!loadingDeliverables && !deliverablesError && Array.isArray(serviceDeliverables) && serviceDeliverables.length === 0 && (
            <p className="text-gray-600">No deliverables available yet.</p>
          )}

        </div>
      ) : null}

      {activeFormTask && (
        activeFormTask.originalData ? (
          <ServiceTaskForm
            task={activeFormTask}
            serviceDetails={{
              CompanyID: companyId,
              ServiceID: selectedService?.ServiceID,
              QuoteID: selectedService?.QuoteID || navQuoteId,
              OrderID: selectedService?.OrderID,
              submittedBy: getSecureItem("partnerUser")?.EmployeeID || 1,
            }}
            responseFields={responseFields}
            onClose={() => setActiveFormTask(null)}
            onSuccess={() => {
              setActiveFormTask(null);
              fetchFields(); // refresh response fields
            }}
          />
        ) : (
          <TaskFormModal task={activeFormTask} onClose={() => setActiveFormTask(null)} />
        )
      )}
    </div>
  );
}
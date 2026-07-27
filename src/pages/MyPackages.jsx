import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getOrdersByCompanyId } from "../api/Orders/Order";
import { getSecureItem } from "../utils/secureStorage";
import DataTable from "../components/Datatable";
import { DollarSign, Package, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

/* ── Order status mapping ── */
const orderStatusList = [
  { value: 1, label: 'In Progress' },
  { value: 2, label: 'Completed' },
  { value: 3, label: 'Pending' },
  { value: 4, label: 'Completed' },
  { value: 5, label: 'Completed, Payment Done' },
];

const getOrderStatusLabel = (statusValue) => {
  const found = orderStatusList.find((s) => s.value === statusValue);
  return found ? found.label : 'Unknown';
};

const PAGE_SIZE = 10;

/* ── KPI Card ── */
const KpiCard = ({ icon: Icon, iconBg, label, value }) => (
  <div className="flex items-center gap-4 px-6 py-4 rounded-xl border border-gray-100 bg-white shadow-sm flex-1 min-w-0">
    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
      <Icon size={16} className="text-amber-500" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 mb-0.5 truncate">{label}</p>
      <p className="text-xl font-bold truncate text-gray-800">{value}</p>
    </div>
  </div>
);

/* ── Status chip with icon ── */
const StatusChip = ({ status }) => {
  const map = {
    1: { icon: CheckCircle2, label: 'In Progress', color: 'text-blue-600',   bg: 'bg-blue-50'   },
    2: { icon: CheckCircle2, label: 'Completed',   color: 'text-green-600',  bg: 'bg-green-50'  },
    3: { icon: AlertCircle,  label: 'Pending',     color: 'text-yellow-600', bg: 'bg-yellow-50' },
    4: { icon: XCircle,      label: 'Disable',     color: 'text-red-500',    bg: 'bg-red-50'    },
    5: { icon: CheckCircle2, label: 'Done',        color: 'text-purple-600', bg: 'bg-purple-50' },
  };
  const cfg = map[status] || { icon: AlertCircle, label: 'Unknown', color: 'text-gray-500', bg: 'bg-gray-50' };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.color} ${cfg.bg}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
};

/* ── Amber progress bar ── */
const ProgressBar = ({ value = 60 }) => (
  <div className="flex items-center gap-2 min-w-[100px]">
    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-amber-400 rounded-full transition-all duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

const statusProgress = { 1: 40, 2: 100, 3: 20, 4: 0, 5: 100 };

/* ── Amount already paid on an order (Orders.ReceivedAmount, falling back to AdvanceAmount) ── */
const getPaidAmount = (row) => {
  if (row.ReceivedAmount != null) return parseFloat(row.ReceivedAmount) || 0;
  if (row.AdvanceAmount != null) return parseFloat(row.AdvanceAmount) || 0;
  if (Array.isArray(row.ServiceList)) {
    return row.ServiceList.reduce((sum, svc) => sum + (parseFloat(svc.AdvanceAmount) || 0), 0);
  }
  return 0;
};

/* ── Amount still owed on an order (PendingAmount if provided, else Total - Paid) ── */
const getDueAmount = (row) => {
  if (row.PendingAmount != null) return parseFloat(row.PendingAmount) || 0;
  const total = parseFloat(row.TotalAmount) || 0;
  return Math.max(total - getPaidAmount(row), 0);
};

/* ══════════════════════════════════════════
   Main component
══════════════════════════════════════════ */
const MyPackages = () => {
  const [packages, setPackages]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [totalCount, setTotalCount]     = useState(0);
  const [apiMessage, setApiMessage]     = useState("");
  const [activeStatus, setActiveStatus] = useState('ALL');

  const [selectedCompany, setSelectedCompany] = useState(() => {
    try {
      const raw = getSecureItem("selectedCompany");
      return raw && typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch { return null; }
  });

  /* ── Fetch orders ── */
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true);
        setError(null);
        setApiMessage("");
        const companyId = selectedCompany?.CompanyID || selectedCompany?.CompanyId || null;
        const res = await getOrdersByCompanyId({ companyId, page, limit: PAGE_SIZE, IsIndividual: 0 });
        if (res && res.message) setApiMessage(res.message);
        const data = res.data || res.orders || res;
        let groupedOrders = [];
        if (Array.isArray(data)) {
          data.forEach(order => {
            if (Array.isArray(order.ServiceDetails) && order.ServiceDetails.length > 0) {
              groupedOrders.push({
                ...order,
                ServiceList: order.ServiceDetails,
                TotalAmount: order.TotalAmount ?? order.totalAmount,
                ReceivedAmount: order.ReceivedAmount,
                PendingAmount: order.PendingAmount,
              });
            }
          });
        }
        setPackages(groupedOrders);
        const total = res.total || res.count || (res.meta && res.meta.total) || 0;
        setTotalCount(total || 0);
        setTotalPages(total ? Math.ceil(total / PAGE_SIZE) : 1);
      } catch (err) {
        console.error("Error fetching packages:", err);
        const resData = err.response?.data;
        if (resData && resData.success === false) {
          // Backend returns 404 with a message when a company has no orders — treat as empty, not an error
          setPackages([]);
          setApiMessage(resData.message || "");
          setTotalCount(resData.total || 0);
          setTotalPages(1);
        } else {
          setPackages([]);
          setError(err.message || "Failed to fetch packages");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, [page, selectedCompany]);

  /* ── Company switch listener ── */
  useEffect(() => {
    const handleCompanySwitch = () => {
      let parsed = null;
      try {
        const raw =
          getSecureItem("selectedCompany") ||
          window.localStorage.getItem("selectedCompany") ||
          window.sessionStorage.getItem("selectedCompany");
        parsed = raw && typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch (err) { console.error(err); }
      setSelectedCompany(parsed);
      setPage(1);
    };
    window.addEventListener("company-switched", handleCompanySwitch);
    return () => window.removeEventListener("company-switched", handleCompanySwitch);
  }, []);

  /* ── KPI values ── */
  const kpi = useMemo(() => {
    const totalPackages = packages.length;
    const nextDue = packages.reduce(
      (acc, o) => acc + getDueAmount(o), 0
    );
    const dates = packages
      .map(o => o.CreatedAt ? new Date(o.CreatedAt) : null)
      .filter(Boolean);
    const earliest = dates.length ? new Date(Math.min(...dates)) : null;
    const startDate = earliest
      ? earliest.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
      : '—';
    return { nextDue: nextDue.toLocaleString('en-IN'), totalPackages, startDate };
  }, [packages]);

  /* ── Status tabs with counts ── */
  const statusTabs = useMemo(() => {
    const counts = { ALL: packages.length };
    packages.forEach(o => {
      const label = getOrderStatusLabel(o.OrderStatus);
      counts[label] = (counts[label] || 0) + 1;
    });
    return [
      { key: 'ALL',         label: 'All Orders'  },
      { key: 'In Progress', label: 'In Progress' },
      { key: 'Completed',   label: 'Completed'   },
      { key: 'Pending',     label: 'Pending'     },
    ].map(tab => ({ ...tab, count: counts[tab.key] || 0 }));
  }, [packages]);

  /* ── Filtered rows ── */
  const filteredPackages = useMemo(() => {
    if (activeStatus === 'ALL') return packages;
    return packages.filter(
      o => getOrderStatusLabel(o.OrderStatus) === activeStatus
    );
  }, [packages, activeStatus]);

  const handlePrev = () => { if (page > 1) setPage(page - 1); };
  const handleNext = () => { if (page < totalPages) setPage(page + 1); };
  const navigate = useNavigate();

  /* ── Table columns ── */
  const columns = [
    { key: "OrderID", header: "Order ID" },
    {
      key: "PackageName", header: "Package Name",
      render: (row) => row.PackageName || row.PackageTitle || "Unnamed Package"
    },
    {
      key: "ServiceList", header: "Services",
      render: (row) => (
        <ul className="list-disc pl-4">
          {Array.isArray(row.ServiceList) && row.ServiceList.length > 0
            ? row.ServiceList.map((svc, idx) => (
              <li key={svc.ServiceDetailID || svc.ServiceID || idx} className="mb-1">
                {svc.ItemName || svc.ServiceName || `Service ${idx + 1}`}{' '}
              </li>
            ))
            : <li className="text-gray-400">No services</li>
          }
        </ul>
      )
    },
    {
      key: "TotalAmount", header: "Total Amount",
      render: (row) => `₹${row.TotalAmount || "N/A"}`
    },
    {
      key: "PaidAmount", header: "Paid Amount",
      render: (row) => `₹${getPaidAmount(row).toLocaleString("en-IN")}`
    },
    {
      key: "OrderStatus", header: "Status",
      render: (row) => <StatusChip status={row.OrderStatus} />
    },
    {
      key: "CreatedAt", header: "Date",
      render: (row) => row.CreatedAt
        ? new Date(row.CreatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : "N/A"
    },
    {
      key: "progress", header: "Progress",
      render: (row) => <ProgressBar value={statusProgress[row.OrderStatus] ?? 40} />
    },
    {
      key: "action", header: "Action",
      render: (row) => (
        <button
          onClick={() => navigate("/dashboard/bizpoleone/orderdetails", { state: { order: row } })}
          className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-white text-xs font-medium rounded-full transition"
        >
          View Details
        </button>
      )
    },
  ];

  /* ── Render ── */
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Package Orders</h1>
      <p className="text-sm text-gray-500 mb-6">View and manage all your package orders in one place</p>

      {/* KPI Cards */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <KpiCard icon={DollarSign} iconBg="bg-amber-100" label="Next Payment Due" value={loading ? '—' : `₹${kpi.nextDue}`} />
        <KpiCard icon={Package}    iconBg="bg-amber-100" label="Total Packages"   value={loading ? '—' : kpi.totalPackages} />
        <KpiCard icon={FileText}   iconBg="bg-amber-100" label="Start Date"       value={loading ? '—' : kpi.startDate} />
      </div>

      {/* Divider */}
      <div className="border-t border-amber-200 mb-4" />

      {/* Status tabs */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {statusTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveStatus(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeStatus === tab.key
                ? 'bg-amber-400 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Loading packages...</div>
      ) : error ? (
        <div className="text-center py-20 text-red-500 text-sm">{apiMessage || error}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl">
        <DataTable
          columns={columns}
          data={filteredPackages}
          loading={loading}
          error={error}
          page={page}
          totalPages={totalPages}
          onPrev={handlePrev}
          onNext={handleNext}
          emptyMessage="No records available"
        />
        </div>
      )}
    </div>
  );
};

export default MyPackages;
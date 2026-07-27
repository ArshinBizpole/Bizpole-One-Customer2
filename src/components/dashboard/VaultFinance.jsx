import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, CreditCard, FileText, Check, AlertCircle, ChevronRight } from "lucide-react";
import useSelectedCompany from "../../hooks/useSelectedCompany";
import { getVaultFinance } from "../../api/DashboardApi";

const Card = ({ children }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">{children}</div>
);

const CardHead = ({ icon: Icon, title, link, onLinkClick }) => (
  <div className="mb-4 flex items-center justify-between gap-2">
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
    </div>
    {link && (
      <button
        onClick={onLinkClick}
        className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-yellow-700 hover:underline"
      >
        {link} <ChevronRight className="h-3 w-3" />
      </button>
    )}
  </div>
);

const VaultFinance = () => {
  const { companyId } = useSelectedCompany();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setDocuments([]);
      setInvoices([]);
      setOutstandingBalance(0);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getVaultFinance(companyId).then((res) => {
      if (cancelled) return;
      if (res.success) {
        setDocuments(res.data.documents || []);
        setInvoices(res.data.invoices || []);
        setOutstandingBalance(res.data.outstandingBalance || 0);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-pulse">
        <div className="h-64 rounded-2xl bg-white shadow-sm" />
        <div className="h-64 rounded-2xl bg-white shadow-sm" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Document vault */}
      <Card>
        <CardHead
          icon={FolderOpen}
          title="Document Vault"
          link="Browse all"
          onLinkClick={() => navigate("/dashboard/bizpoleone/orders")}
        />
        <div className="space-y-2">
          {documents.length === 0 && <p className="text-sm text-gray-400">No documents uploaded yet.</p>}
          {documents.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-xl border border-gray-200 p-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <b className="text-[13px] text-gray-800">{d.title}</b>
                <p className="text-[11px] text-gray-500">{d.meta}</p>
              </div>
              <a
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-yellow-700 hover:underline"
              >
                Download
              </a>
            </div>
          ))}
        </div>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHead
          icon={CreditCard}
          title="Invoices & Payments"
          link="All invoices"
          onLinkClick={() => navigate("/dashboard/bizpoleone/orderdetails")}
        />
        <div className="space-y-2">
          {invoices.length === 0 && <p className="text-sm text-gray-400">No invoices yet.</p>}
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 rounded-xl border border-gray-200 p-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  inv.paid ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                }`}
              >
                {inv.paid ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <b className="text-[13px] text-gray-800">{inv.title}</b>
                <p className="text-[11px] text-gray-500">{inv.meta}</p>
              </div>
              <button
                onClick={() => navigate("/dashboard/bizpoleone/orderdetails")}
                className={`text-xs font-semibold hover:underline ${
                  inv.paid ? "text-yellow-700" : "text-red-600"
                }`}
              >
                {inv.paid ? "Receipt" : "Pay now"}
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-[13px]">
          <span className="text-gray-500">Outstanding balance</span>
          <b className="text-gray-900">₹ {outstandingBalance.toLocaleString("en-IN")}</b>
        </div>
      </Card>
    </div>
  );
};

export default VaultFinance;

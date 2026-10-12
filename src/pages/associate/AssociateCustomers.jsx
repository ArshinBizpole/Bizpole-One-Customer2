import { useState, useEffect, useCallback } from 'react';
import { MoreVertical, Search, ArrowLeft, ArrowRight, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as DealsApi from '../../api/DealsApi';
import { getSecureItem } from '../../utils/secureStorage';
import { Eye, Pencil, Trash2, Phone, PhoneOff, Plus } from 'lucide-react';
import AddCustomerModal from '../../components/Modals/AddCustomerModal';

const COLUMN_COUNT = 15;
// Company codes shown per row before collapsing the rest behind "+N more"
const VISIBLE_COMPANY_IDS = 1;

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-US') : '-');


const AssociateCustomers = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 10;
    const [searchTerm, setSearchTerm] = useState('');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    // Customer whose full company list is shown in the "+N more" popup
    const [companiesPopup, setCompaniesPopup] = useState(null);

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const user = getSecureItem("partnerUser") || {};

            const result = await DealsApi.listAssociateCustomers({
                page,
                limit: pageSize,
                AssociateID: user.id || null,
                search: searchTerm
            });

            if (result.success) {
                setCustomers(result.data);
                setTotal(result.total);
            } else {
                setError(result.message || "Failed to fetch customers");
            }

        } catch (err) {
            setError(err.message || "Error connecting to server");
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, searchTerm]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-800">Customers</h1>

                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
                        {error}
                    </div>
                )}
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search customers..."
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                    <button
                        onClick={() => {
                            setCustomerToEdit(null);
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 shadow-md shadow-yellow-400/20 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Add Customer
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">S.No</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">CustomerID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mobile</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Origin</th>
                                {/* <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer Category</th> */}
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created By</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company Names</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created On</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Updated On</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Communication</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array(COLUMN_COUNT).fill(0).map((_, j) => (
                                            <td key={j} className="px-6 py-4">
                                                <div className="h-4 bg-gray-200 rounded w-full"></div>
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : customers.length > 0 ? (
                                customers.map((customer, index) => (
                                    <tr key={customer.CustomerID} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4 text-sm text-gray-600">{(page - 1) * pageSize + index + 1}</td>
                                        <td
                                            className="px-6 py-4 text-sm font-medium text-yellow-600 cursor-pointer hover:underline"
                                            onClick={() => navigate(`/associate/customers/${customer.CustomerID}`)}
                                        >
                                            {customer.CustomerCode || '-'}
                                        </td>
                                        <td
                                            className="px-6 py-4 text-sm text-gray-900 font-medium cursor-pointer hover:text-yellow-600"
                                            onClick={() => navigate(`/associate/customers/${customer.CustomerID}`)}
                                        >
                                            {customer.CustomerName?.trim() || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{customer.Mobile || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{customer.Email || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{customer.Origin || '-'}</td>
                                        {/* <td className="px-6 py-4 text-sm text-gray-600">{customer.CustomerCategory || '-'}</td> */}
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${Number(customer.IsActive) === 1
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : 'bg-gray-50 text-gray-500 border-gray-200'
                                                }`}>
                                                {Number(customer.IsActive) === 1 ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{customer.CreatedByName || '-'}</td>
                                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                                            {customer.Companies?.length ? (
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="text-yellow-600 cursor-pointer hover:underline"
                                                        onClick={() => navigate(`/associate/companies/${customer.Companies[0].CompanyID}`)}
                                                    >
                                                        {customer.Companies[0].BusinessName}
                                                    </span>
                                                    {customer.Companies.length > 1 && (
                                                        <span
                                                            className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs"
                                                            title={customer.Companies.slice(1).map(c => c.BusinessName).join(', ')}
                                                        >
                                                            +{customer.Companies.length - 1} more
                                                        </span>
                                                    )}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {customer.Companies?.length ? (() => {
                                                const hiddenCount = customer.Companies.length - VISIBLE_COMPANY_IDS;
                                                const visible = customer.Companies.slice(0, VISIBLE_COMPANY_IDS);
                                                return (
                                                    <div className="flex flex-wrap items-center gap-1.5 max-w-[220px]">
                                                        {visible.map(c => (
                                                            <span
                                                                key={c.CompanyID}
                                                                className="text-yellow-600 cursor-pointer hover:underline whitespace-nowrap"
                                                                onClick={() => navigate(`/associate/companies/${c.CompanyID}`)}
                                                            >
                                                                {c.CompanyCode || c.CompanyID}
                                                            </span>
                                                        ))}
                                                        {hiddenCount > 0 && (
                                                            <button
                                                                onClick={() => setCompaniesPopup(customer)}
                                                                className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                                                            >
                                                                +{hiddenCount} more
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{formatDate(customer.CreatedAt)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{formatDate(customer.UpdatedAt)}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex justify-center">
                                                <span
                                                    className={`p-2 rounded-xl inline-flex items-center justify-center transition-colors ${customer.communication
                                                        ? 'bg-red-100 text-red-600'
                                                        : 'bg-green-100 text-green-600'
                                                        }`}
                                                    title={customer.communication ? 'Communication Restricted' : 'Communication Enabled'}
                                                >
                                                    {customer.communication
                                                        ? <PhoneOff className="w-4 h-4" />
                                                        : <Phone className="w-4 h-4" />
                                                    }
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-sm text-gray-400 relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === customer.CustomerID ? null : customer.CustomerID);
                                                }}
                                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>

                                            {openMenuId === customer.CustomerID && (
                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="absolute right-10 top-1/2 -translate-y-1/2 
                       bg-white border border-gray-200 
                       rounded-md shadow-md 
                       px-3 py-2 flex items-center gap-4 z-50"
                                                >
                                                    {/* View */}
                                                    <button
                                                        onClick={() => {
                                                            navigate(`/associate/customers/${customer.CustomerID}`);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="text-blue-500 hover:scale-110 transition"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>

                                                    {/* Edit */}
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            try {
                                                                const result = await DealsApi.getCustomerDetails(customer.CustomerID);
                                                                if (result.success) {
                                                                    console.log("customer data", result.data);

                                                                    setCustomerToEdit(result.data);
                                                                    setIsAddModalOpen(true);
                                                                }
                                                            } catch (err) {
                                                                console.error("Error fetching customer details", err);
                                                            }
                                                        }}
                                                        className="text-gray-700 hover:scale-110 transition"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>

                                                    {/* Delete */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeleteId(customer.CustomerID);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="text-red-500 hover:scale-110 transition"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>

                                                    {/* Close */}
                                                    <button
                                                        onClick={() => setOpenMenuId(null)}
                                                        className="text-gray-400 hover:text-black transition"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>


                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={COLUMN_COUNT} className="px-6 py-12 text-center text-gray-500">
                                        No customers found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Showing page {page} of {totalPages || 1}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                            let pageNum;
                            if (totalPages <= 5) pageNum = i + 1;
                            else if (page <= 3) pageNum = i + 1;
                            else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                            else pageNum = page - 2 + i;

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setPage(pageNum)}
                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === pageNum
                                        ? 'bg-yellow-400 text-black'
                                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || totalPages === 0}
                            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <AddCustomerModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setCustomerToEdit(null);
                }}
                initialData={customerToEdit}
                onSuccess={fetchCustomers}
            />

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 overflow-hidden transform transition-all">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-red-100 text-red-600 rounded-full">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Delete Customer</h3>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete this customer? This action will set the customer as inactive.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="px-5 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setIsDeleting(true);
                                    try {
                                        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/customer/delete`, {
                                            method: "POST",
                                            headers: {
                                                "Content-Type": "application/json",
                                                Authorization: `Bearer ${getSecureItem("partnerToken")}`
                                            },
                                            body: JSON.stringify({ CustomerID: deleteId })
                                        });
                                        const result = await response.json();
                                        if (result.success) {
                                            fetchCustomers();
                                            setDeleteId(null);
                                        }
                                    } catch (err) {
                                        console.error("Error deleting customer", err);
                                    } finally {
                                        setIsDeleting(false);
                                    }
                                }}
                                disabled={isDeleting}
                                className="px-6 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md shadow-red-600/20 transition-all flex items-center gap-2"
                            >
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* All companies of a customer ("+N more" popup) */}
            {companiesPopup && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setCompaniesPopup(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Companies</h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {companiesPopup.CustomerName} · {companiesPopup.Companies.length} companies
                                </p>
                            </div>
                            <button
                                onClick={() => setCompaniesPopup(null)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                            {companiesPopup.Companies.map(c => (
                                <li
                                    key={c.CompanyID}
                                    onClick={() => navigate(`/associate/companies/${c.CompanyID}`)}
                                    className="px-6 py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <span className="text-sm font-medium text-yellow-600 whitespace-nowrap">{c.CompanyCode || c.CompanyID}</span>
                                    <span className="text-sm text-gray-600 truncate">{c.BusinessName || '-'}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssociateCustomers;

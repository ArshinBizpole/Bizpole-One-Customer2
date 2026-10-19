import { useState, useEffect, useCallback } from 'react';
import { MoreVertical, Search, Plus, Eye, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as DealsApi from '../../api/DealsApi';
import { getSecureItem } from '../../utils/secureStorage';
import { format } from 'date-fns';
import AddCompanyModal from '../../components/Modals/AddCompanyModal';
import Pagination from '../../components/Pagination';

const AssociateCompanies = () => {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 10;
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [companyToEdit, setCompanyToEdit] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchCompanies = useCallback(async () => {
        setLoading(true);
        try {
            const user = getSecureItem("partnerUser") || {};

            const result = await DealsApi.listAssociateCompanies({
                page,
                limit: pageSize,
                AssociateID: user.id || null,
                search: searchTerm
            });

            if (result.success) {
                setCompanies(result.data);
                setTotal(result.total);
            } else {
                setError(result.message || 'Failed to fetch companies');
            }
        } catch (err) {
            setError(err.message || 'Error connecting to server');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, searchTerm]);

    useEffect(() => {
        fetchCompanies();
    }, [fetchCompanies]);

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-800">Companies</h1>

                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search companies..."
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
                            setCompanyToEdit(null);
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 shadow-md shadow-yellow-400/20 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Add Company
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        {/* ... table content remains same ... */}
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">S.No</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company Created</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Origin</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Orders</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Orders</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount Due</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created On</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Updated On</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array(13).fill(0).map((_, j) => (
                                            <td key={j} className="px-6 py-4">
                                                <div className="h-4 bg-gray-200 rounded w-full"></div>
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : companies.length > 0 ? (
                                companies.map((company, index) => (
                                    <tr key={company.CompanyID} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4 text-sm text-gray-600">{(page - 1) * pageSize + index + 1}</td>
                                        <td
                                            className="px-6 py-4 text-sm font-medium text-gray-900 cursor-pointer hover:text-yellow-600"
                                            onClick={() => navigate(`/associate/companies/${company.CompanyID}`)}
                                        >
                                            {company.CompanyCode || 'N/A'}
                                        </td>
                                        <td
                                            className="px-6 py-4 text-sm text-gray-900 font-medium cursor-pointer hover:text-yellow-600"
                                            onClick={() => navigate(`/associate/companies/${company.CompanyID}`)}
                                        >
                                            {company.BusinessName}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{company.CreatedByName || 'Unknown'}</td>
                                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                                            {company.PrimaryCustomerID ? (
                                                <span
                                                    className="text-yellow-600 hover:underline cursor-pointer"
                                                    onClick={() => navigate(`/associate/customers/${company.PrimaryCustomerID}`)}
                                                >
                                                    {company.PrimaryCustomerCode || `CU${String(company.PrimaryCustomerID).padStart(6, "0")}`}
                                                </span>
                                            ) : <span className="text-gray-400">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium">
                                            {company.PrimaryCustomerID ? (
                                                <span
                                                    className="text-yellow-600 hover:underline cursor-pointer"
                                                    onClick={() => navigate(`/associate/customers/${company.PrimaryCustomerID}`)}
                                                >
                                                    {company.PrimaryCustomerName?.trim() || company.PrimaryCustomerCode || '-'}
                                                </span>
                                            ) : <span className="text-gray-400">-</span>}
                                        </td>

                                        <td className="px-6 py-4 text-sm text-gray-600">{company.Origin || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600 text-center">{company.activeOrders || 0}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600 text-center">{company.totalOrders || 0}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{company.AmountDue ? `₹${company.AmountDue}` : '-'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                            {company.CreatedAt ? format(new Date(company.CreatedAt), 'dd/MM/yyyy') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                            {company.UpdatedAt ? format(new Date(company.UpdatedAt), 'dd/MM/yyyy') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-400 relative">
                                            <button
                                                onClick={() => setOpenMenuId(openMenuId === company.CompanyID ? null : company.CompanyID)}
                                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>

                                            {openMenuId === company.CompanyID && (
                                                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 flex items-center gap-2 px-3 z-50 animate-in fade-in slide-in-from-right-2 duration-200">
                                                    {/* View */}
                                                    <button
                                                        onClick={() => {
                                                            navigate(`/associate/companies/${company.CompanyID}`);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="text-gray-700 hover:scale-110 transition"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>

                                                    {/* Edit */}
                                                    <button
                                                        onClick={async () => {
                                                            setOpenMenuId(null);
                                                            try {
                                                                const result = await DealsApi.getCompanyDetails(company.CompanyID);
                                                                if (result.success) {
                                                                    setCompanyToEdit(result.data);
                                                                    setIsAddModalOpen(true);
                                                                }
                                                            } catch (err) {
                                                                console.error("Error fetching company details:", err);
                                                            }
                                                        }}
                                                        className="text-gray-700 hover:scale-110 transition"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>

                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => {
                                                            setDeleteId(company.CompanyID);
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
                                    <td colSpan="13" className="px-6 py-12 text-center text-gray-500">
                                        No companies found.
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
                    <Pagination page={page} totalPages={totalPages} onPage={setPage} />
                </div>
            </div>

            <AddCompanyModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setCompanyToEdit(null);
                }}
                initialData={companyToEdit}
                onSuccess={fetchCompanies}
            />

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 overflow-hidden transform transition-all">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-red-100 text-red-600 rounded-full">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Delete Company</h3>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete this company? This action will set the company as inactive.
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
                                        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/company/soft-delete`, {
                                            method: "POST",
                                            headers: {
                                                "Content-Type": "application/json",
                                                Authorization: `Bearer ${getSecureItem("partnerToken")}`
                                            },
                                            body: JSON.stringify({ CompanyId: deleteId })
                                        });
                                        const result = await response.json();
                                        if (result.success) {
                                            fetchCompanies();
                                            setDeleteId(null);
                                        }
                                    } catch (err) {
                                        console.error("Error deleting company", err);
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
        </div>
    );
};

export default AssociateCompanies;

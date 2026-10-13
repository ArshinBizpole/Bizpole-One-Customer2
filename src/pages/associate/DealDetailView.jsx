import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    ChevronRight,
    Loader2,
    Info,
    Phone,
    MapPin,
    Briefcase,
} from 'lucide-react';
import DealsApi from '../../api/DealsApi';

const DealDetailView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [deal, setDeal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDealDetails = async () => {
            setLoading(true);
            try {
                const response = await DealsApi.getDealById(id);
                if (response.success) {
                    console.log("VVVV", response.data);

                    setDeal(response.data);
                } else {
                    setError(response.message || "Failed to fetch deal details");
                }
            } catch (err) {
                console.error("fetchDealDetails error", err);
                setError("An error occurred while fetching deal details");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchDealDetails();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-yellow-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Loading deal details...</p>
            </div>
        );
    }

    if (error || !deal) {
        return (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 inline-block mb-4">
                    {error || "Deal not found"}
                </div>
                <div>
                    <button
                        onClick={() => navigate('/associate/deals')}
                        className="text-yellow-600 font-bold hover:underline"
                    >
                        Back to Deals
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Navigation */}
            <div className="flex flex-col gap-4">
                <button
                    onClick={() => navigate('/associate/deals')}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors w-fit border border-slate-200 px-4 py-1.5 rounded-lg bg-white shadow-sm hover:shadow transition-all"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Back to Deals</span>
                </button>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Link to="/associate/deals" className="hover:text-slate-900">Deals</Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-slate-900 font-medium">Deal Details</span>
                    <ChevronRight className="w-3 h-3" />
                    <span>Summary</span>
                </div>
            </div>

            {/* Header section */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-400/10 rounded-2xl flex items-center justify-center">
                            <Briefcase className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{deal.name}</h1>
                            <div className="flex items-center gap-4 mt-1">
                                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                                    Status
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200 ml-1">
                                        {deal.status}
                                    </span>
                                </span>
                                <span className="flex items-center gap-1 text-sm text-slate-500">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {deal.state}{deal.city ? `, ${deal.city}` : ''}
                                </span>
                                {deal.remarks && (
                                    <span className="text-sm text-slate-400 italic">
                                        {deal.remarks}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-8 mt-8 border-b border-slate-100">
                    <button className="pb-4 text-sm font-bold text-red-500 border-b-2 border-red-500 transition-all">
                        Summary
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                {/* Basic Information */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm border-t-4 border-t-amber-400">
                    <div className="flex items-center gap-2 mb-6 text-slate-800">
                        <Info className="w-5 h-5" />
                        <h3 className="font-bold text-lg">Basic Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-y-6">
                        <div>
                            <p className="text-xs text-slate-400 mb-1">Deal Name</p>
                            <p className="text-sm font-medium text-slate-900">{deal.name}</p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-400 mb-1">Deal ID</p>
                            <p className="text-sm font-medium text-slate-900">{deal.id}</p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-400 mb-1">Status</p>
                            <p className="text-sm font-medium text-slate-900">{deal.status}</p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-400 mb-1">Source</p>
                            <p className="text-sm font-medium text-slate-900">{"Associate"}</p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-400 mb-1">Proposed Service</p>
                            <p className="text-sm font-medium text-slate-900">{deal.serviceName || "--"}</p>
                        </div>


                        <div>
                            <p className="text-xs text-slate-400 mb-1">State</p>
                            <p className="text-sm font-medium text-slate-900">{deal.state || "--"}</p>
                        </div>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm border-t-4 border-t-amber-400">
                    <div className="flex items-center gap-2 mb-6 text-slate-800">
                        <Phone className="w-5 h-5 text-red-500" />
                        <h3 className="font-bold text-lg">Contact Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-y-6 gap-x-12">
                        <div>
                            <p className="text-xs text-slate-400 mb-1">Mobile</p>
                            <p className="text-sm font-medium text-slate-900">{deal.mobile}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 mb-1">Email</p>
                            <p className="text-sm font-medium text-slate-900">{deal.email || "--"}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Services Section */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg text-slate-900 mb-4">Services</h3>
                {deal.services && deal.services.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Service Name</th>
                                    <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                                    <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                                    {/* <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Fee</th> */}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {deal.services.map((service, index) => (
                                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-4 text-sm font-medium text-slate-700">{service.serviceName || "--"}</td>
                                        <td className="py-4 text-sm text-slate-600">{service.serviceCategory || "--"}</td>
                                        <td className="py-4 text-sm text-slate-600">{service.dealType || "--"}</td>
                                        {/* <td className="py-4 text-sm font-bold text-slate-900 text-right">
                                            {service.total ? `₹${Number(service.total).toLocaleString('en-IN')}` : "--"}
                                        </td> */}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-8 text-center text-slate-400 flex flex-col items-center gap-2">
                        <Briefcase className="w-8 h-8 opacity-20" />
                        <p className="text-sm font-medium">No services found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DealDetailView;

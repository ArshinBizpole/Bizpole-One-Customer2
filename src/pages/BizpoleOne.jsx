import { useEffect, useState } from 'react';

import FeaturedCarousel from '../components/dashboard/FeaturedCarousel';
import ContinueApplications from '../components/dashboard/ContinueApplications';
import OverviewCards from '../components/dashboard/OverviewCards';
import RecentServices from '../components/dashboard/RecentServices';
import UpcomingEvents from '../components/dashboard/UpcomingEvents';
import QuotesList from '../components/dashboard/QuotesList';
import RelationshipReferral from '../components/dashboard/RelationshipReferral';
import useSelectedCompany from '../hooks/useSelectedCompany';
import { getDashboardOverview } from '../api/DashboardApi';
import { getSecureItem } from '../utils/secureStorage';

const customerFirstName = () => {
  try {
    const raw = getSecureItem('user');
    const user = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return user?.FirstName || null;
  } catch {
    return null;
  }
};

const BizpoleOne = () => {
  const { companyId, companyName } = useSelectedCompany();
  const [firstName] = useState(customerFirstName);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!companyId) {
      setOverview(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getDashboardOverview(companyId).then((res) => {
      if (cancelled) return;
      setOverview(res.success ? res.data : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-10">
      {/* Title */}
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-gray-900 sm:text-[28px]">
          Dashboard
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Live</span>
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, <b className="font-medium text-gray-700">{firstName || companyName || 'there'}</b> — here's
          your business at a glance.
        </p>
      </div>

      <FeaturedCarousel />
      <ContinueApplications />

      {!loading && !overview && companyId ? (
        <p className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
          Couldn't load your dashboard figures right now. Please refresh in a moment.
        </p>
      ) : (
        <OverviewCards data={overview} loading={loading} />
      )}

      {/* Services + upcoming events */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentServices services={overview?.recentServices || []} loading={loading} />
        </div>
        <UpcomingEvents events={overview?.events} loading={loading} />
      </div>

      {/* Quotes */}
      <div>
        <div className="mb-3 flex items-center gap-2 px-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Quotes</span>
          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-indigo-700">
            NEW
          </span>
        </div>
        <QuotesList />
      </div>

      <RelationshipReferral />
    </div>
  );
};

export default BizpoleOne;

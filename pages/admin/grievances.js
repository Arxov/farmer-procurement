import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';

const STATUS_COLORS = {
  open: 'bg-yellow-100 text-yellow-800',
  in_review: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
};

export default function AdminGrievances() {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState(null);
  const router = useRouter();
  const { t } = useLanguage();

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/'); return; }
    const res = await fetch('/api/admin/grievances', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.status === 403) { router.push('/'); return; }
    if (res.ok) {
      const { grievances: g } = await res.json();
      setGrievances(g || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, newStatus) => {
    const notes = newStatus === 'resolved' ? prompt('Resolution notes (optional):') : null;
    setUpdating(id);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/admin/grievances', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id, status: newStatus, resolution_notes: notes || undefined }),
    });
    setUpdating(null);
    load();
  };

  const filtered = filter === 'all' ? grievances : grievances.filter(g => g.status === filter);
  const counts = { all: grievances.length, open: 0, in_review: 0, resolved: 0 };
  grievances.forEach(g => { if (counts[g.status] !== undefined) counts[g.status]++; });

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>{t('loading')}</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link href="/admin/dashboard" className="text-green-700 text-sm">&larr; Dashboard</Link>
            <h1 className="text-xl font-bold mt-1">Grievance Management</h1>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {['all', 'open', 'in_review', 'resolved'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === f ? 'bg-green-700 text-white' : 'bg-white dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 dark:text-neutral-400 border'}`}
            >
              {f.replace(/_/g, ' ')} ({counts[f]})
            </button>
          ))}
        </div>

        {/* Grievance Cards */}
        <div className="space-y-3">
          {filtered.length === 0 && <p className="text-gray-500 dark:text-neutral-400 dark:text-neutral-400">No grievances found.</p>}
          {filtered.map(g => (
            <div key={g.id} className="bg-white dark:bg-neutral-800 rounded-xl shadow p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{g.bookings?.profiles?.full_name || 'Unknown'}</span>
                    <span className="text-xs text-gray-400">{g.bookings?.profiles?.phone}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[g.status] || 'bg-gray-100 dark:bg-neutral-800'}`}>
                      {g.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-neutral-300 capitalize"><strong>Type:</strong> {(g.issue_type || '').replace(/_/g, ' ')}</p>
                  <p className="text-sm text-gray-600 dark:text-neutral-400 dark:text-neutral-400 mt-1 bg-gray-50 dark:bg-neutral-900 rounded p-2">{g.description}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Centre: {g.bookings?.centres?.name} | Date: {g.bookings?.slot_date} | Filed: {new Date(g.created_at).toLocaleDateString()}
                  </p>
                  {g.resolution_notes && (
                    <p className="text-sm text-green-700 mt-2 bg-green-50 rounded p-2">✅ Resolution: {g.resolution_notes}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 ml-3">
                  {g.status === 'open' && (
                    <button
                      onClick={() => updateStatus(g.id, 'in_review')}
                      disabled={updating === g.id}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                    >
                      Start Review
                    </button>
                  )}
                  {g.status === 'in_review' && (
                    <button
                      onClick={() => updateStatus(g.id, 'resolved')}
                      disabled={updating === g.id}
                      className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                    >
                      Mark Resolved
                    </button>
                  )}
                  {g.status !== 'open' && g.status !== 'resolved' && (
                    <button
                      onClick={() => updateStatus(g.id, 'open')}
                      disabled={updating === g.id}
                      className="bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

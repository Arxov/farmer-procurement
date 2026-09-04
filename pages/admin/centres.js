import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';

export default function AdminCentres() {
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', district: '', state: 'Maharashtra', daily_capacity: 100 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { t } = useLanguage();

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const load = async () => {
    const token = await getToken();
    if (!token) { router.push('/'); return; }
    const res = await fetch('/api/admin/centres', { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 403) { router.push('/'); return; }
    if (res.ok) {
      const { centres: c } = await res.json();
      setCentres(c || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (centre) => {
    setEditing(centre.id);
    setForm({ name: centre.name, district: centre.district || '', state: centre.state || 'Maharashtra', daily_capacity: centre.daily_capacity });
    setError('');
  };

  const startNew = () => {
    setEditing('new');
    setForm({ name: '', district: '', state: 'Maharashtra', daily_capacity: 100 });
    setError('');
  };

  const cancelEdit = () => { setEditing(null); setError(''); };

  const save = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    const token = await getToken();
    const isNew = editing === 'new';

    const res = await fetch('/api/admin/centres', {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(isNew ? form : { id: editing, ...form }),
    });

    setSaving(false);
    if (!res.ok) { const r = await res.json(); setError(r.error || 'Failed'); return; }
    setEditing(null);
    load();
  };

  const deleteCentre = async (id) => {
    if (!confirm('Delete this centre? This cannot be undone.')) return;
    const token = await getToken();
    await fetch('/api/admin/centres', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    load();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>{t('loading')}</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link href="/admin/dashboard" className="text-green-700 text-sm">&larr; Dashboard</Link>
            <h1 className="text-xl font-bold mt-1">Centre Management</h1>
          </div>
          <button onClick={startNew} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Centre</button>
        </div>

        {/* Add/Edit Form */}
        {editing && (
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow p-6 mb-6">
            <h2 className="font-bold mb-3">{editing === 'new' ? 'Add New Centre' : 'Edit Centre'}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Centre Name *</label>
                <input className="w-full border rounded-lg px-3 py-2" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">District</label>
                <input className="w-full border rounded-lg px-3 py-2" value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <input className="w-full border rounded-lg px-3 py-2" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Daily Capacity</label>
                <input type="number" min="1" className="w-full border rounded-lg px-3 py-2" value={form.daily_capacity} onChange={e => setForm({ ...form, daily_capacity: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={save} disabled={saving} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={cancelEdit} className="bg-gray-200 text-gray-700 dark:text-neutral-300 px-4 py-2 rounded-lg text-sm font-medium">Cancel</button>
            </div>
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500 dark:text-neutral-400 dark:text-neutral-400">
                <th className="p-3">Name</th>
                <th className="p-3">District</th>
                <th className="p-3">State</th>
                <th className="p-3">Daily Capacity</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {centres.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50 dark:bg-neutral-900">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3">{c.district || '-'}</td>
                  <td className="p-3">{c.state || '-'}</td>
                  <td className="p-3">{c.daily_capacity}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(c)} className="text-blue-600 text-xs font-medium hover:underline">Edit</button>
                      <button onClick={() => deleteCentre(c.id)} className="text-red-600 text-xs font-medium hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {centres.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-gray-500 dark:text-neutral-400 dark:text-neutral-400">No centres. Click "Add Centre" to create one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

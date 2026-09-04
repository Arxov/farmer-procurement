import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// GET: all grievances with booking + farmer details
// PATCH: update grievance status + resolution notes
export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) return res.status(401).json({ error: 'Invalid session' });

  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', userData.user.id).single();
  if (!profile || profile.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('grievances')
      .select('*, bookings(slot_date, slot_window, farmer_id, profiles(full_name, phone), centres(name), commodities(name))')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ grievances: data || [] });
  }

  if (req.method === 'PATCH') {
    const { id, status, resolution_notes } = req.body;
    if (!id || !status) return res.status(400).json({ error: 'Missing id or status' });

    const updateObj = { status };
    if (resolution_notes !== undefined) updateObj.resolution_notes = resolution_notes;

    const { data, error } = await supabaseAdmin
      .from('grievances')
      .update(updateObj)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ grievance: data });
  }

  return res.status(405).end();
}

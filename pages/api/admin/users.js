import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// GET: all user profiles
// PATCH: update user role
export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) return res.status(401).json({ error: 'Invalid session' });

  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', userData.user.id).single();
  if (!profile || profile.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ users: data || [] });
  }

  if (req.method === 'PATCH') {
    const { id, role } = req.body;
    if (!id || !role) return res.status(400).json({ error: 'Missing id or role' });
    if (!['farmer', 'officer', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ user: data });
  }

  return res.status(405).end();
}

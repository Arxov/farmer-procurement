import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withAuth } from '../../../lib/apiAuth';

// GET: all user profiles
// PATCH: update user role
async function handler(req, res) {

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

export default withAuth(handler, { roles: ['admin'] });

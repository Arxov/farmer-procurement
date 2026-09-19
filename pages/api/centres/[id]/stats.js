import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { withAuth } from '../../../../lib/apiAuth';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Centre ID is required' });

  try {
    // We only need farmer_id and status to compute stats
    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select('farmer_id, status, actual_weight_quintals')
      .eq('centre_id', id);

    if (error) throw error;

    // Compute stats
    const uniqueFarmers = new Set();
    let totalCompleted = 0;
    let totalRejected = 0;
    let totalVolume = 0;

    bookings?.forEach(b => {
      uniqueFarmers.add(b.farmer_id);
      
      if (['accepted', 'paid', 'rejected'].includes(b.status)) {
        totalCompleted++;
        if (b.status === 'rejected') {
          totalRejected++;
        }
      }
      
      if (['weighed', 'quality_checked', 'accepted', 'paid'].includes(b.status) && b.actual_weight_quintals) {
        totalVolume += parseFloat(b.actual_weight_quintals);
      }
    });

    const rejectionRate = totalCompleted > 0 
      ? Math.round((totalRejected / totalCompleted) * 100) 
      : 0;

    return res.status(200).json({
      farmersServed: uniqueFarmers.size,
      rejectionRate,
      totalCompleted,
      totalVolumeProcessed: Math.round(totalVolume)
    });

  } catch (err) {
    console.error('Centre Stats API error:', err);
    return res.status(500).json({ error: 'Failed to fetch centre stats' });
  }
}

export default withAuth(handler);

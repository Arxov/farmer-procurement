const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: c } = await supabase.from('centres').select('count', { count: 'exact' });
  const { data: com } = await supabase.from('commodities').select('count', { count: 'exact' });
  console.log("Centres count:", c);
  console.log("Commodities count:", com);
}
check();

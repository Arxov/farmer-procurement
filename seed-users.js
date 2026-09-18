const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const accounts = [
  { email: 'farmer@demo.com', password: 'password123', name: 'Ramesh Patil', role: 'farmer' },
  { email: 'officer@demo.com', password: 'password123', name: 'APMC Officer Desk', role: 'officer' },
  { email: 'admin@demo.com', password: 'password123', name: 'Kisan Setu National Admin', role: 'admin' }
];

async function seed() {
  for (const acc of accounts) {
    let userId;
    const { data, error } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: acc.password,
      email_confirm: true
    });
    
    if (error) {
      if (error.message.includes('already been registered')) {
        console.log(`${acc.email} already exists. Fetching id...`);
        const { data: users } = await supabase.auth.admin.listUsers();
        const existing = users.users.find(u => u.email === acc.email);
        if (existing) userId = existing.id;
      } else {
        console.log(`Error creating ${acc.email}:`, error.message);
        continue;
      }
    } else {
      userId = data.user.id;
    }
    
    if (!userId) continue;

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: acc.name,
      role: acc.role,
      phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`
    });
    
    if (profileError) {
      console.log(`Error creating profile for ${acc.email}:`, profileError.message);
    } else {
      console.log(`Successfully created ${acc.email} (${acc.role})`);
    }
  }
  console.log('Done!');
}

seed();

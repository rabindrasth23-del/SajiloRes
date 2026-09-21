import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUsers() {
  console.log("Fetching auth.users...");
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error("Error fetching users:", authError);
    return;
  }
  
  console.log(`Found ${users.length} users.`);
  
  const { data: appUsers, error: appUsersError } = await supabase.from('app_users').select('id');
  if (appUsersError) {
    console.error("Error fetching app_users:", appUsersError);
    return;
  }
  
  const appUserIds = new Set(appUsers.map(u => u.id));
  
  for (const user of users) {
    if (!appUserIds.has(user.id)) {
      console.log(`User ${user.email} (${user.id}) missing from app_users. Inserting...`);
      const { error: insertError } = await supabase.from('app_users').insert({
        id: user.id,
        role: 'coordinator', // updated from dispatcher to match check constraint
        display_name: user.email?.split('@')[0] || 'User'
      });
      
      if (insertError) {
        console.error(`Failed to insert ${user.id}:`, insertError);
      } else {
        console.log(`Successfully added ${user.email} to app_users.`);
      }
    } else {
      console.log(`User ${user.email} already in app_users, ensuring role...`);
      // Update role just in case they have null role
      await supabase.from('app_users').update({ role: 'coordinator' }).eq('id', user.id);
    }
  }
  console.log("Done.");
}

fixUsers();

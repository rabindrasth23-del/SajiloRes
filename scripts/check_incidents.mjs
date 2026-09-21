import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIncidents() {
  const { data, error } = await supabase
    .from('incidents')
    .select('id, raw_text, status, ai_status, created_at, triage')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error("Error fetching incidents:", error);
    return;
  }
  
  console.log("Latest incidents:", JSON.stringify(data, null, 2));
}

checkIncidents();

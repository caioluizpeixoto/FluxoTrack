import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('product_events').select('id, event_value, currency, raw_payload').order('created_at', { ascending: false }).limit(3);
  console.log(JSON.stringify(data, null, 2));
}
run();

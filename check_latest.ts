import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('product_events').select('*').order('created_at', { ascending: false }).limit(2);
  if (data && data.length > 0) {
    data.forEach(d => console.log('Value:', d.event_value, 'Currency:', d.currency, '\nPayload:', JSON.stringify(d.raw_payload, null, 2)));
  } else {
    console.log('No data');
  }
}
run();

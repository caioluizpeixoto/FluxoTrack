import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  // Fix the new UYU sale that was logged as 465 BRL
  const { error } = await supabase.from('product_events')
    .update({ event_value: 49.79, currency: 'BRL' }) // from payload: converted_value
    .eq('transaction_id', 'HP1413547794');
  console.log('Update Error:', error);
}
run();

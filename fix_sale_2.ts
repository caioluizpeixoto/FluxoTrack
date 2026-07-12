import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('product_events').select('*').eq('event_value', 202).limit(5);
  if (data && data.length > 0) {
    console.log(data.map(d => d.transaction_id));
    for (const d of data) {
       console.log('Fixing', d.transaction_id);
       await supabase.from('product_events').update({ event_value: 49.94, currency: 'BRL' }).eq('id', d.id);
    }
  } else {
    // If it was already converted, let's search by transaction_id from the first payload
    const { data: d2 } = await supabase.from('product_events').select('*').eq('transaction_id', 'HP0999603950').limit(1);
    if (d2 && d2.length > 0) {
       console.log('Fixing HP0999603950');
       await supabase.from('product_events').update({ event_value: 49.94, currency: 'BRL' }).eq('id', d2[0].id);
    } else {
       console.log('No 202 BRL sales found');
    }
  }
}
run();

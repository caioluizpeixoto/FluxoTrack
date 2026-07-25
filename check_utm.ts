import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
async function run() {
  const { data, error } = await supabase.from('product_events').select('raw_payload').limit(500);
  let found = data?.filter(d => JSON.stringify(d).includes('utm') && JSON.stringify(d).includes('hotmart') || JSON.stringify(d).includes('HOTMART'));
  if (found && found.length > 0) {
    console.log(JSON.stringify(found[0], null, 2));
  } else {
    console.log('No UTM found in Hotmart payloads');
  }
}
run();

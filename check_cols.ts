import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
async function run() {
  const { data, error } = await supabase.from('product_events').select('*').limit(1);
  console.log('Columns:', data && data.length > 0 ? Object.keys(data[0]) : error);
}
run();

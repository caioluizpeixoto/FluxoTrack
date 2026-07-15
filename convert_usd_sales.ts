import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const { data: events, error } = await supabase.from('product_events').select('*');
  if (error) {
    console.error('Error fetching events:', error);
    return;
  }

  let count = 0;
  for (const event of events) {
    const payload = event.raw_payload;
    if (!payload) continue;

    let convertedValueFromPayload = 0;

    // Check Hotmart/similar format with commissions array
    if (payload.commissions && Array.isArray(payload.commissions)) {
      const prodComm = payload.commissions.find((c: any) => c.source === 'PRODUCER') || payload.commissions[0];
      if (prodComm && prodComm.currency_value === 'USD') {
        if (prodComm.currency_conversion && prodComm.currency_conversion.converted_value) {
          convertedValueFromPayload = parseFloat(prodComm.currency_conversion.converted_value);
        }
      }
    }

    // Convert events that are saved as USD
    if (event.currency === 'USD' && event.event_value < 50) {
      console.log(`Found event ${event.id} with value ${event.event_value} USD`);
      
      try {
        let newValue = 0;
        
        if (convertedValueFromPayload > 0) {
           newValue = convertedValueFromPayload;
           console.log(`Using converted_value from payload: ${newValue} BRL`);
        } else {
           const rateResponse = await fetch(`https://economia.awesomeapi.com.br/json/last/USD-BRL`);
           const rateData = await rateResponse.json();
           const rate = parseFloat(rateData.USDBRL.ask);
           newValue = event.event_value * rate;
           console.log(`Converting ${event.event_value} USD to ${newValue} BRL using live rate ${rate}`);
        }

        const { error: updateError } = await supabase
          .from('product_events')
          .update({ event_value: newValue, currency: 'BRL' })
          .eq('id', event.id);

        if (updateError) {
          console.error(`Failed to update event ${event.id}:`, updateError);
        } else {
          count++;
        }
      } catch(e) {
        console.error("Error doing conversion:", e);
      }
    }
  }

  console.log(`Successfully converted ${count} events.`);
}

main();

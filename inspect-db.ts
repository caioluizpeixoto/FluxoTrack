import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

// Puxar as variaveis do .env
const dotenv = require("dotenv");
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching last 5 product events...");
  const { data: events, error } = await supabase
    .from("product_events")
    .select("id, created_at, event_value, currency, raw_payload")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching events:", error);
    return;
  }

  events.forEach((e) => {
    console.log(`Event ID: ${e.id} | Value: ${e.event_value} | Currency: ${e.currency}`);
    console.log(`Raw Payload: ${JSON.stringify(e.raw_payload).slice(0, 300)}...`);
    console.log("-------------------");
    fs.writeFileSync(`payload_${e.id}.json`, JSON.stringify(e.raw_payload, null, 2));
  });

}

run();

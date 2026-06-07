import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productId = params.id;
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is missing' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    
    // Verify product exists
    const { data: product } = await supabaseAdmin.from('products').select('id, user_id').eq('id', productId).single();
    if (!product) {
      return NextResponse.json({ error: 'Invalid product' }, { status: 404 });
    }

    // Get Raw JSON
    const body = await req.json();

    // Agnostic parser (Tries common fields from Kiwify, Hotmart, PerfectPay, generic)
    const eventType = body.event || body.event_type || body.type || body.status || 'unknown';
    const eventValue = body.value || body.amount || body.price || body.comission || body.liquid || 0;
    const customerEmail = body.email || body.customer_email || body.customer?.email || '';
    const customerName = body.name || body.customer_name || body.customer?.name || '';
    const transactionId = body.transaction_id || body.transaction || body.id || '';
    const currency = body.currency || 'BRL';

    // Normalize Status
    let status = 'pending';
    const normalizedEvent = eventType.toString().toLowerCase();
    
    if (normalizedEvent.includes('approved') || normalizedEvent.includes('paid') || normalizedEvent.includes('compra') || normalizedEvent.includes('purchase')) {
       status = 'approved';
    } else if (normalizedEvent.includes('refund') || normalizedEvent.includes('chargeback') || normalizedEvent.includes('reembolso')) {
       status = 'refunded';
    }

    // Normalize Event Type for DB (purchase, lead, checkout)
    let finalType = 'other';
    if (status === 'approved' || status === 'refunded') finalType = 'purchase';
    else if (normalizedEvent.includes('lead') || normalizedEvent.includes('pix')) finalType = 'lead';
    else if (normalizedEvent.includes('checkout') || normalizedEvent.includes('cart')) finalType = 'checkout';

    // Insert into DB
    const { error } = await supabaseAdmin.from('product_events').insert({
      product_id: productId,
      event_type: finalType,
      event_value: Number(eventValue),
      currency: currency,
      status: status,
      customer_email: customerEmail,
      customer_name: customerName,
      transaction_id: transactionId,
      raw_payload: body
    });

    if (error) {
      console.error('Error inserting event:', error);
      return NextResponse.json({ error: 'Failed to insert event' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Event logged successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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
    
    const cleanValue = (val: any): number => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      // Remove R$, spaces, and format decimal separator
      const clean = val.toString().replace(/[^\d.,]/g, '').replace(',', '.');
      return parseFloat(clean) || 0;
    };

    // Parse Value
    let rawValue = 0;
    if (body.payment?.amount !== undefined) {
      rawValue = cleanValue(body.payment.amount);
    } else if (body.Order?.price_cents !== undefined) {
      rawValue = cleanValue(body.Order.price_cents) / 100;
    } else if (body.Order?.order_approved_amount !== undefined) {
      rawValue = cleanValue(body.Order.order_approved_amount) / 100;
    } else if (body.purchase?.price?.value !== undefined) {
      rawValue = cleanValue(body.purchase.price.value);
    } else if (body.sale_value !== undefined) {
      rawValue = cleanValue(body.sale_value);
    } else if (body.value_cents !== undefined) {
      rawValue = cleanValue(body.value_cents) / 100;
    } else if (body.price_cents !== undefined) {
      rawValue = cleanValue(body.price_cents) / 100;
    } else {
      rawValue = cleanValue(body.value || body.amount || body.price || body.comission || body.liquid || 0);
    }
    const eventValue = rawValue;

    // Parse Email
    const customerEmail = body.customer?.email || body.Customer?.email || body.buyer?.email || body.email || body.customer_email || '';

    // Parse Name
    const customerName = body.customer?.name || body.Customer?.name || body.buyer?.name || body.name || body.customer_name || '';

    // Parse Transaction ID
    const transactionId = body.payment?.id || body.Order?.order_id || body.purchase?.transaction || body.sale_id || body.transaction_id || body.transaction || body.id || '';

    const currency = body.currency || body.purchase?.price?.currency_code || 'BRL';

    // Normalize Status
    let status = 'pending';
    const normalizedEvent = eventType.toString().toLowerCase();
    
    if (normalizedEvent.includes('approved') || normalizedEvent.includes('paid') || normalizedEvent.includes('compra') || normalizedEvent.includes('purchase')) {
       status = 'approved';
    } else if (normalizedEvent.includes('refund') || normalizedEvent.includes('chargeback') || normalizedEvent.includes('reembolso')) {
       status = 'refunded';
    } else if (normalizedEvent.includes('refused') || normalizedEvent.includes('cancel') || normalizedEvent.includes('reject')) {
       status = 'refused';
    } else {
       status = 'pending';
    }

    // Normalize Event Type for DB (purchase, lead, checkout)
    let finalType = 'purchase';
    if (normalizedEvent.includes('abandoned') || normalizedEvent.includes('cart') || normalizedEvent.includes('checkout')) {
      finalType = 'checkout';
    } else if (normalizedEvent.includes('lead')) {
      finalType = 'lead';
    }

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

/**
 * Cloudflare Pages Function — Stripe Webhook Handler
 *
 * Handles all Stripe webhook events for subscription lifecycle.
 * Verifies signature using Web Crypto API (CF Workers compatible).
 *
 * Endpoint: POST /api/stripe-webhook
 *
 * Events handled:
 *   - checkout.session.completed
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_succeeded
 *   - invoice.payment_failed
 */

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://lightning-dni.pages.dev',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
};

const GRACE_PERIOD_DAYS = 7;
const DATA_RETENTION_DAYS = 90;
const SOFT_DELETE_GRACE_DAYS = 7;

// ============================================
// STRIPE SIGNATURE VERIFICATION
// ============================================

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = sigHeader.split(',').reduce((acc: Record<string, string>, part) => {
      const [key, value] = part.split('=');
      acc[key.trim()] = value;
      return acc;
    }, {});

    const timestamp = parts['t'];
    const signature = parts['v1'];

    if (!timestamp || !signature) return false;

    // Check timestamp tolerance (5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) return false;

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// ============================================
// SUPABASE HELPERS
// ============================================

async function supabaseQuery(env: Env, table: string, method: string, query: string, body?: any) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}${query}`;
  const headers: Record<string, string> = {
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : (method === 'PATCH' ? 'return=representation' : 'return=minimal'),
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${method} ${table} error: ${response.status} ${text}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function logSubscriptionEvent(env: Env, event: {
  subscription_id: string;
  event_type: string;
  stripe_event_id?: string;
  previous_status?: string;
  new_status?: string;
  previous_tier?: string;
  new_tier?: string;
  metadata?: Record<string, any>;
}) {
  try {
    await supabaseQuery(env, 'subscription_events', 'POST', '?select=id', event);
  } catch (error) {
    console.error('Error logging subscription event:', error);
  }
}

// ============================================
// EVENT HANDLERS
// ============================================

async function handleCheckoutCompleted(env: Env, session: any) {
  const metadata = session.subscription_details?.metadata || session.metadata || {};
  const subscriptionId = session.subscription;
  const customerId = session.customer;
  const type = metadata.type || 'church_premium';
  const serverId = metadata.lightning_server_id || null;
  const userId = metadata.lightning_user_id || null;
  const tier = metadata.tier || null;
  const timezone = metadata.timezone || 'America/New_York';

  // Fetch the Stripe subscription to get trial/period info
  const subResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  const stripeSub = await subResponse.json() as any;

  const status = stripeSub.status === 'trialing' ? 'trialing' : 'active';
  const billingInterval = stripeSub.items?.data?.[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly';
  const priceCents = stripeSub.items?.data?.[0]?.price?.unit_amount || 0;

  const subscriptionRecord: Record<string, any> = {
    type,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: stripeSub.items?.data?.[0]?.price?.id || null,
    status,
    billing_interval: billingInterval,
    current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
    current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
    current_price_cents: priceCents,
    tier,
    trial_timezone: timezone,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (serverId) subscriptionRecord.server_id = serverId;
  if (userId) subscriptionRecord.user_id = userId;

  if (stripeSub.trial_start) {
    subscriptionRecord.trial_start = new Date(stripeSub.trial_start * 1000).toISOString();
  }
  if (stripeSub.trial_end) {
    subscriptionRecord.trial_end = new Date(stripeSub.trial_end * 1000).toISOString();
  }

  // Insert subscription record
  const inserted = await supabaseQuery(env, 'subscriptions', 'POST', '?select=id', subscriptionRecord);

  if (inserted && inserted[0]) {
    await logSubscriptionEvent(env, {
      subscription_id: inserted[0].id,
      event_type: 'created',
      new_status: status,
      new_tier: tier,
      metadata: { checkout_session_id: session.id },
    });

    // If church premium, create default cosmetics record
    if (type === 'church_premium' && serverId) {
      try {
        await supabaseQuery(env, 'premium_cosmetics', 'POST', '?select=id', {
          server_id: serverId,
          is_verified: true,
          verified_at: new Date().toISOString(),
        });
      } catch {
        // Cosmetics record may already exist
      }
    }
  }
}

async function handleSubscriptionUpdated(env: Env, subscription: any, stripeEventId: string) {
  const stripeSubId = subscription.id;
  const newStripeStatus = subscription.status;

  // Map Stripe status to our status
  let newStatus: string;
  switch (newStripeStatus) {
    case 'trialing': newStatus = 'trialing'; break;
    case 'active': newStatus = 'active'; break;
    case 'past_due': newStatus = 'past_due'; break;
    case 'canceled': newStatus = 'canceled'; break;
    case 'incomplete': newStatus = 'incomplete'; break;
    case 'incomplete_expired': newStatus = 'expired'; break;
    case 'unpaid': newStatus = 'expired'; break;
    default: newStatus = 'expired';
  }

  // Fetch existing subscription
  const existing = await supabaseQuery(
    env,
    'subscriptions',
    'GET',
    `?stripe_subscription_id=eq.${stripeSubId}&select=*`
  );

  if (!existing || existing.length === 0) {
    console.error(`No subscription found for Stripe sub ${stripeSubId}`);
    return;
  }

  const sub = existing[0];
  const previousStatus = sub.status;

  const updates: Record<string, any> = {
    status: newStatus,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Handle cancellation
  if (subscription.cancel_at_period_end && !sub.canceled_at) {
    updates.canceled_at = new Date().toISOString();
  }

  // Handle past_due → set grace period
  if (newStatus === 'past_due' && previousStatus !== 'past_due') {
    const graceEnd = new Date();
    graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);
    updates.grace_period_end = graceEnd.toISOString();
  }

  // Handle canceled/expired → set data retention
  if (['canceled', 'expired'].includes(newStatus) && !sub.data_retention_end) {
    const retentionEnd = new Date();
    retentionEnd.setDate(retentionEnd.getDate() + DATA_RETENTION_DAYS);
    updates.data_retention_end = retentionEnd.toISOString();

    const softDelete = new Date(retentionEnd);
    softDelete.setDate(softDelete.getDate() + SOFT_DELETE_GRACE_DAYS);
    updates.soft_delete_at = softDelete.toISOString();
  }

  await supabaseQuery(
    env,
    'subscriptions',
    'PATCH',
    `?stripe_subscription_id=eq.${stripeSubId}`,
    updates
  );

  await logSubscriptionEvent(env, {
    subscription_id: sub.id,
    event_type: 'status_changed',
    stripe_event_id: stripeEventId,
    previous_status: previousStatus,
    new_status: newStatus,
    metadata: { cancel_at_period_end: subscription.cancel_at_period_end },
  });
}

async function handleSubscriptionDeleted(env: Env, subscription: any, stripeEventId: string) {
  const stripeSubId = subscription.id;

  const existing = await supabaseQuery(
    env,
    'subscriptions',
    'GET',
    `?stripe_subscription_id=eq.${stripeSubId}&select=*`
  );

  if (!existing || existing.length === 0) return;

  const sub = existing[0];

  const retentionEnd = new Date();
  retentionEnd.setDate(retentionEnd.getDate() + DATA_RETENTION_DAYS);

  const softDelete = new Date(retentionEnd);
  softDelete.setDate(softDelete.getDate() + SOFT_DELETE_GRACE_DAYS);

  await supabaseQuery(
    env,
    'subscriptions',
    'PATCH',
    `?stripe_subscription_id=eq.${stripeSubId}`,
    {
      status: 'expired',
      canceled_at: sub.canceled_at || new Date().toISOString(),
      data_retention_end: retentionEnd.toISOString(),
      soft_delete_at: softDelete.toISOString(),
      updated_at: new Date().toISOString(),
    }
  );

  await logSubscriptionEvent(env, {
    subscription_id: sub.id,
    event_type: 'expired',
    stripe_event_id: stripeEventId,
    previous_status: sub.status,
    new_status: 'expired',
  });
}

async function handleInvoicePaymentSucceeded(env: Env, invoice: any, stripeEventId: string) {
  const stripeSubId = invoice.subscription;
  if (!stripeSubId) return;

  const existing = await supabaseQuery(
    env,
    'subscriptions',
    'GET',
    `?stripe_subscription_id=eq.${stripeSubId}&select=*`
  );

  if (!existing || existing.length === 0) return;

  const sub = existing[0];

  await supabaseQuery(
    env,
    'subscriptions',
    'PATCH',
    `?stripe_subscription_id=eq.${stripeSubId}`,
    {
      status: 'active',
      grace_period_end: null,
      updated_at: new Date().toISOString(),
    }
  );

  await logSubscriptionEvent(env, {
    subscription_id: sub.id,
    event_type: 'renewed',
    stripe_event_id: stripeEventId,
    previous_status: sub.status,
    new_status: 'active',
    metadata: { invoice_id: invoice.id, amount: invoice.amount_paid },
  });
}

async function handleInvoicePaymentFailed(env: Env, invoice: any, stripeEventId: string) {
  const stripeSubId = invoice.subscription;
  if (!stripeSubId) return;

  const existing = await supabaseQuery(
    env,
    'subscriptions',
    'GET',
    `?stripe_subscription_id=eq.${stripeSubId}&select=*`
  );

  if (!existing || existing.length === 0) return;

  const sub = existing[0];

  // Only set past_due if not already
  if (sub.status !== 'past_due') {
    const graceEnd = new Date();
    graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);

    await supabaseQuery(
      env,
      'subscriptions',
      'PATCH',
      `?stripe_subscription_id=eq.${stripeSubId}`,
      {
        status: 'past_due',
        grace_period_end: graceEnd.toISOString(),
        updated_at: new Date().toISOString(),
      }
    );
  }

  await logSubscriptionEvent(env, {
    subscription_id: sub.id,
    event_type: 'payment_failed',
    stripe_event_id: stripeEventId,
    previous_status: sub.status,
    new_status: 'past_due',
    metadata: { invoice_id: invoice.id, attempt_count: invoice.attempt_count },
  });
}

// ============================================
// MAIN HANDLER
// ============================================

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.text();
    const sigHeader = context.request.headers.get('stripe-signature');

    if (!sigHeader) {
      return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Verify signature
    const isValid = await verifyStripeSignature(body, sigHeader, context.env.STRIPE_WEBHOOK_SECRET);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(body);

    // Idempotency: check if we've already processed this event
    try {
      const existing = await supabaseQuery(
        context.env,
        'subscription_events',
        'GET',
        `?stripe_event_id=eq.${event.id}&select=id`
      );
      if (existing && existing.length > 0) {
        // Already processed
        return new Response(JSON.stringify({ received: true, deduplicated: true }), {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    } catch {
      // If dedup check fails, continue processing
    }

    // Route event to handler
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(context.env, event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(context.env, event.data.object, event.id);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(context.env, event.data.object, event.id);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(context.env, event.data.object, event.id);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(context.env, event.data.object, event.id);
        break;

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Stripe webhook error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Webhook processing error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
};

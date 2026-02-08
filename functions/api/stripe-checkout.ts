/**
 * Cloudflare Pages Function — Stripe Checkout Session Creator
 *
 * Creates a Stripe Checkout Session for church premium or individual pro subscriptions.
 * Handles trial setup (30-day free trial, credit card required).
 *
 * Endpoint: POST /api/stripe-checkout
 *
 * Request body:
 *   { serverId?, userId?, userEmail, type, tier?, interval, timezone? }
 *
 * Response:
 *   { url: string } — Stripe Checkout URL to redirect to
 */

interface Env {
  STRIPE_SECRET_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://lightning-dni.pages.dev',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const INDIVIDUAL_PRO_MONTHLY_CENTS = 499;
const INDIVIDUAL_PRO_ANNUAL_CENTS = 4999;
const TRIAL_DAYS = 30;

// Helper: call Stripe API
async function stripeRequest(env: Env, endpoint: string, method: string, body?: Record<string, any>) {
  const url = `https://api.stripe.com/v1${endpoint}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  let formBody = '';
  if (body) {
    formBody = encodeFormData(body);
  }

  const response = await fetch(url, {
    method,
    headers,
    body: method !== 'GET' ? formBody : undefined,
  });

  return response.json();
}

// Encode nested objects for Stripe's form-encoded API
function encodeFormData(obj: Record<string, any>, prefix = ''): string {
  const parts: string[] = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    const value = obj[key];
    if (value === null || value === undefined) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      parts.push(encodeFormData(value, fullKey));
    } else {
      parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.filter(Boolean).join('&');
}

// Supabase helper
async function supabaseQuery(env: Env, table: string, method: string, query: string, body?: any) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}${query}`;
  const headers: Record<string, string> = {
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase error: ${response.status} ${text}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Rate limit: 5 checkout attempts per minute per IP
  const { checkRateLimit, getClientIP, rateLimitResponse } = await import('./_rateLimit');
  const ip = getClientIP(context.request);
  const rl = checkRateLimit(ip, 'stripe-checkout', 5, 60_000);
  if (!rl.allowed) {
    return rateLimitResponse(rl.retryAfterMs, CORS_HEADERS);
  }

  try {
    const { serverId, userId, userEmail, type, tier, interval, timezone } = await context.request.json() as any;

    // Validate
    if (!type || !['church_premium', 'individual_pro'].includes(type)) {
      return new Response(JSON.stringify({ error: 'Invalid subscription type' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (!interval || !['monthly', 'annual'].includes(interval)) {
      return new Response(JSON.stringify({ error: 'Invalid billing interval' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (!userEmail) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Determine price
    let priceCents: number;

    if (type === 'individual_pro') {
      priceCents = interval === 'annual' ? INDIVIDUAL_PRO_ANNUAL_CENTS : INDIVIDUAL_PRO_MONTHLY_CENTS;
    } else {
      // Church premium — look up tier pricing
      if (!tier || !serverId) {
        return new Response(JSON.stringify({ error: 'Server ID and tier are required for church premium' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // Fetch pricing tier from Supabase
      const tiers = await supabaseQuery(
        context.env,
        'pricing_tiers',
        'GET',
        `?tier=eq.${tier}&is_active=eq.true&select=*`
      );

      if (!tiers || tiers.length === 0) {
        return new Response(JSON.stringify({ error: 'Invalid pricing tier' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      priceCents = interval === 'annual' ? tiers[0].annual_price_cents : tiers[0].monthly_price_cents;
    }

    // 1. Look up or create Stripe Customer
    const existingCustomers = await stripeRequest(context.env, `/customers?email=${encodeURIComponent(userEmail)}&limit=1`, 'GET');

    let customerId: string;
    if (existingCustomers.data && existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const newCustomer = await stripeRequest(context.env, '/customers', 'POST', {
        email: userEmail,
        metadata: {
          lightning_server_id: serverId || '',
          lightning_user_id: userId || '',
          subscription_type: type,
        },
      });
      customerId = newCustomer.id;
    }

    // 2. Create a Price on the fly (or use existing Stripe Price IDs from pricing_tiers)
    // For simplicity, create ad-hoc price. In production, pre-create Stripe Prices and store IDs.
    const price = await stripeRequest(context.env, '/prices', 'POST', {
      currency: 'usd',
      unit_amount: priceCents,
      recurring: {
        interval: interval === 'annual' ? 'year' : 'month',
      },
      product_data: {
        name: type === 'individual_pro'
          ? 'Lightning Pro'
          : `Lightning Church Premium (${tier})`,
      },
    });

    // 3. Create Checkout Session
    const successUrl = type === 'individual_pro'
      ? `${getOrigin(context.request)}?billing=success&type=pro`
      : `${getOrigin(context.request)}?billing=success&type=church&serverId=${serverId}`;

    const cancelUrl = `${getOrigin(context.request)}?billing=canceled`;

    const sessionParams: Record<string, any> = {
      customer: customerId,
      mode: 'subscription',
      'line_items[0][price]': price.id,
      'line_items[0][quantity]': 1,
      success_url: successUrl,
      cancel_url: cancelUrl,
      'subscription_data[trial_period_days]': TRIAL_DAYS,
      'subscription_data[metadata][type]': type,
      'subscription_data[metadata][lightning_server_id]': serverId || '',
      'subscription_data[metadata][lightning_user_id]': userId || '',
      'subscription_data[metadata][tier]': tier || '',
      'subscription_data[metadata][timezone]': timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    // Encode manually for Stripe's form format (no nesting helper needed for bracket keys)
    const formParts = Object.entries(sessionParams)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const session = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${context.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formParts,
    }).then(r => r.json()) as any;

    if (session.error) {
      return new Response(JSON.stringify({ error: session.error.message }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
};

function getOrigin(request: Request): string {
  const url = new URL(request.url);
  // In production, use the app's actual URL
  return request.headers.get('origin') || `${url.protocol}//${url.host}`;
}

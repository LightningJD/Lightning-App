/**
 * Cloudflare Pages Function — Subscription Status
 *
 * Returns current subscription status for a server or user.
 * Called on app load and cached in PremiumContext.
 *
 * Endpoint: GET /api/subscription-status?serverId=xxx or ?userId=xxx
 *
 * Response:
 *   { subscription: {...}, cosmetics: {...} } or { subscription: null }
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function supabaseQuery(env: Env, table: string, query: string) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}${query}`;
  const response = await fetch(url, {
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const serverId = url.searchParams.get('serverId');
    const userId = url.searchParams.get('userId');

    if (!serverId && !userId) {
      return new Response(JSON.stringify({ error: 'serverId or userId is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    let subscription = null;
    let cosmetics = null;

    if (serverId) {
      // Church premium
      const subs = await supabaseQuery(
        context.env,
        'subscriptions',
        `?server_id=eq.${serverId}&type=eq.church_premium&order=created_at.desc&limit=1&select=*`
      );
      subscription = subs && subs.length > 0 ? subs[0] : null;

      // Also fetch cosmetics
      if (subscription && ['trialing', 'active', 'past_due'].includes(subscription.status)) {
        const cosmeticsData = await supabaseQuery(
          context.env,
          'premium_cosmetics',
          `?server_id=eq.${serverId}&select=*`
        );
        cosmetics = cosmeticsData && cosmeticsData.length > 0 ? cosmeticsData[0] : null;
      }
    } else if (userId) {
      // Individual pro
      const subs = await supabaseQuery(
        context.env,
        'subscriptions',
        `?user_id=eq.${userId}&type=eq.individual_pro&order=created_at.desc&limit=1&select=*`
      );
      subscription = subs && subs.length > 0 ? subs[0] : null;
    }

    return new Response(JSON.stringify({ subscription, cosmetics }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Subscription status error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
};

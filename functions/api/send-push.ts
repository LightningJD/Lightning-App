/**
 * Cloudflare Pages Function — Push Notification Sender
 *
 * Sends Web Push notifications to subscribed users.
 *
 * Endpoint: POST /api/send-push
 *
 * Request body:
 *   { userId: string, title: string, body: string, url?: string, tag?: string }
 *
 * Environment variables needed:
 *   VAPID_PUBLIC_KEY — VAPID public key (base64url)
 *   VAPID_PRIVATE_KEY — VAPID private key (base64url)
 *   VAPID_SUBJECT — mailto: or URL for VAPID identification
 *   SUPABASE_URL — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key
 */

interface Env {
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface PushRequest {
  userId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  try {
    // Parse request
    const body = (await request.json()) as PushRequest;
    const { userId, title, body: messageBody, url, tag } = body;

    if (!userId || !title || !messageBody) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: userId, title, body' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check environment variables
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
      return new Response(
        JSON.stringify({ success: false, error: 'VAPID keys not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Fetch user's push subscriptions from Supabase
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

    const subResponse = await fetch(
      `${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${userId}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!subResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const subscriptions = (await subResponse.json()) as PushSubscriptionRow[];

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No push subscriptions found for user' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Build notification payload
    const payload = JSON.stringify({
      title,
      body: messageBody,
      icon: '/vite.svg',
      badge: '/vite.svg',
      tag: tag || 'lightning-notification',
      url: url || '/',
    });

    // Send push to each subscription
    let successCount = 0;
    let failCount = 0;

    for (const sub of subscriptions) {
      try {
        // Build Web Push request using the Web Push protocol
        // Note: In production, use a proper web-push library or Cloudflare's built-in support
        // This is a simplified implementation that works with the Web Push API
        const pushResult = await sendWebPush(
          sub.endpoint,
          sub.p256dh,
          sub.auth,
          payload,
          env.VAPID_PUBLIC_KEY,
          env.VAPID_PRIVATE_KEY,
          env.VAPID_SUBJECT
        );

        if (pushResult) {
          successCount++;
        } else {
          failCount++;
          // Remove stale subscription
          await fetch(
            `${supabaseUrl}/rest/v1/push_subscriptions?id=eq.${sub.id}`,
            {
              method: 'DELETE',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
              }
            }
          );
        }
      } catch (pushErr) {
        console.error('Push send error:', pushErr);
        failCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        sent: successCount,
        failed: failCount,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err: any) {
    console.error('Send push error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

/**
 * Send a Web Push notification
 *
 * Note: This is a placeholder — in Cloudflare Workers, you'd typically use
 * the `web-push` npm package or Cloudflare's native Web Push support.
 * For now, this makes a direct POST to the push endpoint.
 * The full encryption implementation requires the Web Crypto API
 * which is available in Cloudflare Workers.
 */
async function sendWebPush(
  endpoint: string,
  _p256dh: string,
  _auth: string,
  payload: string,
  _vapidPublicKey: string,
  _vapidPrivateKey: string,
  _vapidSubject: string
): Promise<boolean> {
  try {
    // TODO: Implement proper Web Push encryption using Web Crypto API
    // For now, send a simple POST. Full implementation requires:
    // 1. ECDH key exchange with p256dh
    // 2. Content encryption with auth
    // 3. VAPID JWT header generation
    //
    // Consider using a library like `web-push` compiled for CF Workers
    // or Cloudflare's native Push API support when available.

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'TTL': '86400',
      },
      body: payload,
    });

    return response.ok || response.status === 201;
  } catch (error) {
    console.error('Web Push delivery error:', error);
    return false;
  }
}

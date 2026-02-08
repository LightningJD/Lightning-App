/**
 * Cloudflare Pages Function — Send Transactional Email via Resend
 *
 * Handles all transactional emails:
 *   - Trial ending reminders
 *   - Payment failure notifications
 *   - Win-back emails (day 14, day 60)
 *   - Subscription confirmations
 *
 * Endpoint: POST /api/send-email
 *
 * Request body:
 *   { to: string, subject: string, template: string, data: Record<string, any> }
 *
 * Response:
 *   { success: boolean, id?: string }
 */

interface Env {
  RESEND_API_KEY: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const FROM_EMAIL = 'Lightning <noreply@lightningapp.church>';

// ============================================
// EMAIL TEMPLATES
// ============================================

function getEmailHtml(template: string, data: Record<string, any>): string {
  const baseStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 560px;
    margin: 0 auto;
    padding: 32px 24px;
    background: #0f0f1a;
    color: #e2e8f0;
    border-radius: 16px;
  `;

  const buttonStyle = `
    display: inline-block;
    padding: 12px 28px;
    background: linear-gradient(135deg, #4F96FF, #2563eb);
    color: white;
    text-decoration: none;
    border-radius: 12px;
    font-weight: bold;
    font-size: 14px;
  `;

  switch (template) {
    case 'trial_ending':
      return `
        <div style="${baseStyle}">
          <h1 style="font-size: 24px; margin-bottom: 8px;">Your trial is ending soon</h1>
          <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">
            Hi! Your ${data.planName || 'Lightning Premium'} trial for <strong>${data.serverName || 'your church'}</strong>
            ends in <strong>${data.daysLeft} day${data.daysLeft !== 1 ? 's' : ''}</strong>.
          </p>
          <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">
            To continue enjoying premium features, make sure your payment method is up to date.
          </p>
          <a href="${data.billingUrl || '#'}" style="${buttonStyle}">Manage Billing</a>
          <p style="color: #475569; font-size: 12px; margin-top: 32px;">
            No action needed if you've already added a payment method.
          </p>
        </div>
      `;

    case 'payment_failed':
      return `
        <div style="${baseStyle}">
          <h1 style="font-size: 24px; margin-bottom: 8px;">Payment failed</h1>
          <p style="color: #94a3b8; font-size: 14px; margin-bottom: 16px;">
            We couldn't process your payment for <strong>${data.serverName || 'your subscription'}</strong>.
          </p>
          <p style="color: #fbbf24; font-size: 14px; margin-bottom: 24px;">
            Your premium features will remain active for ${data.graceDays || 7} more days while we retry.
          </p>
          <a href="${data.billingUrl || '#'}" style="${buttonStyle}">Update Payment Method</a>
        </div>
      `;

    case 'winback_14':
      return `
        <div style="${baseStyle}">
          <h1 style="font-size: 24px; margin-bottom: 8px;">Your church is thriving!</h1>
          <p style="color: #94a3b8; font-size: 14px; margin-bottom: 16px;">
            Since you left, <strong>${data.serverName}</strong> has had:
          </p>
          <div style="background: rgba(59,130,246,0.1); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #93c5fd; font-size: 14px; margin: 4px 0;">
              ${data.newTestimonies || 0} new testimonies shared
            </p>
            <p style="color: #93c5fd; font-size: 14px; margin: 4px 0;">
              ${data.newMembers || 0} new members joined
            </p>
          </div>
          <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">
            Upgrade back to Premium and unlock custom branding, AI insights, and more.
          </p>
          <a href="${data.upgradeUrl || '#'}" style="${buttonStyle}">Reactivate Premium</a>
        </div>
      `;

    case 'winback_60':
      return `
        <div style="${baseStyle}">
          <h1 style="font-size: 24px; margin-bottom: 8px;">${data.serverName} is growing!</h1>
          <p style="color: #94a3b8; font-size: 14px; margin-bottom: 16px;">
            It's been 60 days. Here's what's happening at your church:
          </p>
          <div style="background: rgba(59,130,246,0.1); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #93c5fd; font-size: 14px; margin: 4px 0;">
              ${data.totalMembers || 0} total members
            </p>
            <p style="color: #93c5fd; font-size: 14px; margin: 4px 0;">
              ${data.totalTestimonies || 0} testimonies shared
            </p>
            ${data.growthPercent ? `<p style="color: #34d399; font-size: 14px; margin: 4px 0;">${data.growthPercent}% growth</p>` : ''}
          </div>
          <a href="${data.upgradeUrl || '#'}" style="${buttonStyle}">Bring Back Premium</a>
        </div>
      `;

    case 'subscription_confirmed':
      return `
        <div style="${baseStyle}">
          <h1 style="font-size: 24px; margin-bottom: 8px;">Welcome to Premium!</h1>
          <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">
            ${data.serverName || 'Your church'} now has access to all premium features.
            ${data.trialDays ? `Your ${data.trialDays}-day free trial has started.` : ''}
          </p>
          <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">
            Head to Server Settings to customize your church's appearance.
          </p>
          <a href="${data.appUrl || '#'}" style="${buttonStyle}">Open Lightning</a>
        </div>
      `;

    default:
      return `
        <div style="${baseStyle}">
          <p style="color: #94a3b8; font-size: 14px;">${data.message || 'You have a new notification from Lightning.'}</p>
        </div>
      `;
  }
}

// ============================================
// MAIN HANDLER
// ============================================

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { to, subject, template, data } = await context.request.json() as any;

    if (!to || !subject || !template) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, template' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const html = getEmailHtml(template, data || {});

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${context.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    const result = await response.json() as any;

    if (!response.ok) {
      return new Response(JSON.stringify({ error: result.message || 'Failed to send email' }), {
        status: response.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Send email error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
};

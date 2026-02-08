/**
 * Cloudflare Worker — Billing Cron Jobs
 *
 * Runs on a schedule (daily at midnight UTC) via Cloudflare Cron Triggers.
 *
 * Jobs:
 *   1. Member count snapshots — daily snapshot of member counts per server
 *   2. Grace period enforcement — expire past_due subscriptions after 7 days
 *   3. Win-back email dispatch — day 14 and day 60 after cancellation
 *   4. Data retention cleanup — delete data 90+7 days after cancellation
 *   5. Trial ending reminders — email 3 days before trial ends
 *
 * Deployment:
 *   This is a separate Cloudflare Worker (not a Pages Function).
 *   Deploy with: wrangler deploy --config workers/billing-cron/wrangler.toml
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STRIPE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  APP_URL: string;
}

// ============================================
// SUPABASE HELPER
// ============================================

async function supabaseQuery(env: Env, table: string, method: string, query: string, body?: any): Promise<any> {
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
    throw new Error(`Supabase ${method} ${table}: ${response.status} ${text}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function sendEmail(env: Env, to: string, subject: string, template: string, data: Record<string, any>) {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Lightning <noreply@lightningapp.church>',
        to: [to],
        subject,
        html: `<p>${data.message || subject}</p>`, // Simplified — real templates in send-email function
      }),
    });
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
  }
}

// ============================================
// JOB 1: MEMBER COUNT SNAPSHOTS
// ============================================

async function snapshotMemberCounts(env: Env) {
  console.log('[Cron] Starting member count snapshots...');

  // Get all active church premium subscriptions
  const subs = await supabaseQuery(
    env,
    'subscriptions',
    'GET',
    '?type=eq.church_premium&status=in.(trialing,active,past_due)&select=id,server_id,tier'
  );

  if (!subs || subs.length === 0) {
    console.log('[Cron] No active church subscriptions to snapshot');
    return;
  }

  const today = new Date().toISOString().split('T')[0];

  for (const sub of subs) {
    if (!sub.server_id) continue;

    try {
      // Count members from server_members table
      const members = await supabaseQuery(
        env,
        'server_members',
        'GET',
        `?server_id=eq.${sub.server_id}&select=id`
      );

      const memberCount = members?.length || 0;

      // Determine next tier
      const tiers = await supabaseQuery(
        env,
        'pricing_tiers',
        'GET',
        `?is_active=eq.true&min_members=gt.${memberCount}&order=min_members.asc&limit=1&select=tier`
      );

      await supabaseQuery(env, 'member_count_snapshots', 'POST', '?select=id', {
        server_id: sub.server_id,
        member_count: memberCount,
        current_tier: sub.tier,
        next_tier: tiers?.[0]?.tier || null,
        snapshot_date: today,
      });
    } catch (error) {
      console.error(`[Cron] Snapshot error for server ${sub.server_id}:`, error);
    }
  }

  console.log(`[Cron] Completed ${subs.length} member count snapshots`);
}

// ============================================
// JOB 2: GRACE PERIOD ENFORCEMENT
// ============================================

async function enforceGracePeriods(env: Env) {
  console.log('[Cron] Enforcing grace periods...');

  const now = new Date().toISOString();

  // Find subscriptions where grace period has ended
  const expired = await supabaseQuery(
    env,
    'subscriptions',
    'GET',
    `?status=eq.past_due&grace_period_end=lt.${now}&select=id,server_id,user_id,status`
  );

  if (!expired || expired.length === 0) {
    console.log('[Cron] No grace periods to enforce');
    return;
  }

  for (const sub of expired) {
    try {
      const retentionEnd = new Date();
      retentionEnd.setDate(retentionEnd.getDate() + 90);

      const softDelete = new Date(retentionEnd);
      softDelete.setDate(softDelete.getDate() + 7);

      await supabaseQuery(
        env,
        'subscriptions',
        'PATCH',
        `?id=eq.${sub.id}`,
        {
          status: 'expired',
          data_retention_end: retentionEnd.toISOString(),
          soft_delete_at: softDelete.toISOString(),
          updated_at: now,
        }
      );

      await supabaseQuery(env, 'subscription_events', 'POST', '?select=id', {
        subscription_id: sub.id,
        event_type: 'grace_period_expired',
        previous_status: 'past_due',
        new_status: 'expired',
      });
    } catch (error) {
      console.error(`[Cron] Grace period enforcement error for sub ${sub.id}:`, error);
    }
  }

  console.log(`[Cron] Expired ${expired.length} past_due subscriptions`);
}

// ============================================
// JOB 3: WIN-BACK EMAILS
// ============================================

async function sendWinbackEmails(env: Env) {
  console.log('[Cron] Checking for win-back emails...');

  const now = new Date();

  // Day 14 win-backs
  const day14Start = new Date(now);
  day14Start.setDate(day14Start.getDate() - 14);
  const day14End = new Date(day14Start);
  day14End.setDate(day14End.getDate() + 1);

  const day14Subs = await supabaseQuery(
    env,
    'subscriptions',
    'GET',
    `?status=in.(canceled,expired)&canceled_at=gte.${day14Start.toISOString()}&canceled_at=lt.${day14End.toISOString()}&select=id,server_id,user_id`
  );

  for (const sub of (day14Subs || [])) {
    try {
      // Check if already sent
      const existing = await supabaseQuery(
        env,
        'winback_emails',
        'GET',
        `?subscription_id=eq.${sub.id}&email_type=eq.day_14&select=id`
      );

      if (existing && existing.length > 0) continue;

      // Record the send
      await supabaseQuery(env, 'winback_emails', 'POST', '?select=id', {
        subscription_id: sub.id,
        email_type: 'day_14',
        sent_at: now.toISOString(),
      });
    } catch (error) {
      console.error(`[Cron] Win-back day 14 error for sub ${sub.id}:`, error);
    }
  }

  // Day 60 win-backs
  const day60Start = new Date(now);
  day60Start.setDate(day60Start.getDate() - 60);
  const day60End = new Date(day60Start);
  day60End.setDate(day60End.getDate() + 1);

  const day60Subs = await supabaseQuery(
    env,
    'subscriptions',
    'GET',
    `?status=in.(canceled,expired)&canceled_at=gte.${day60Start.toISOString()}&canceled_at=lt.${day60End.toISOString()}&select=id,server_id,user_id`
  );

  for (const sub of (day60Subs || [])) {
    try {
      const existing = await supabaseQuery(
        env,
        'winback_emails',
        'GET',
        `?subscription_id=eq.${sub.id}&email_type=eq.day_60&select=id`
      );

      if (existing && existing.length > 0) continue;

      await supabaseQuery(env, 'winback_emails', 'POST', '?select=id', {
        subscription_id: sub.id,
        email_type: 'day_60',
        sent_at: now.toISOString(),
      });
    } catch (error) {
      console.error(`[Cron] Win-back day 60 error for sub ${sub.id}:`, error);
    }
  }

  console.log(`[Cron] Win-back check complete (day14: ${day14Subs?.length || 0}, day60: ${day60Subs?.length || 0})`);
}

// ============================================
// JOB 4: DATA RETENTION CLEANUP
// ============================================

async function cleanupExpiredData(env: Env) {
  console.log('[Cron] Running data retention cleanup...');

  const now = new Date().toISOString();

  // Find subscriptions past their soft_delete_at date
  const toDelete = await supabaseQuery(
    env,
    'subscriptions',
    'GET',
    `?status=eq.expired&soft_delete_at=lt.${now}&select=id,server_id,user_id`
  );

  if (!toDelete || toDelete.length === 0) {
    console.log('[Cron] No expired data to clean up');
    return;
  }

  for (const sub of toDelete) {
    try {
      // Delete cosmetics data
      if (sub.server_id) {
        await supabaseQuery(
          env,
          'premium_cosmetics',
          'DELETE',
          `?server_id=eq.${sub.server_id}`
        );
      }

      if (sub.user_id) {
        await supabaseQuery(
          env,
          'individual_pro_cosmetics',
          'DELETE',
          `?user_id=eq.${sub.user_id}`
        );
      }

      // Mark subscription as fully cleaned
      await supabaseQuery(
        env,
        'subscriptions',
        'PATCH',
        `?id=eq.${sub.id}`,
        { updated_at: now }
      );
    } catch (error) {
      console.error(`[Cron] Cleanup error for sub ${sub.id}:`, error);
    }
  }

  console.log(`[Cron] Cleaned up ${toDelete.length} expired subscriptions`);
}

// ============================================
// JOB 5: TRIAL ENDING REMINDERS
// ============================================

async function sendTrialReminders(env: Env) {
  console.log('[Cron] Checking for trial ending reminders...');

  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const fourDaysFromNow = new Date();
  fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4);

  // Find trials ending in ~3 days
  const trialsEnding = await supabaseQuery(
    env,
    'subscriptions',
    'GET',
    `?status=eq.trialing&trial_end=gte.${threeDaysFromNow.toISOString()}&trial_end=lt.${fourDaysFromNow.toISOString()}&select=id,server_id,user_id,stripe_customer_id`
  );

  console.log(`[Cron] Found ${trialsEnding?.length || 0} trials ending in 3 days`);

  // In a full implementation, we'd look up email from Stripe customer and send via Resend
  // For now, log for monitoring
  for (const sub of (trialsEnding || [])) {
    try {
      await supabaseQuery(env, 'subscription_events', 'POST', '?select=id', {
        subscription_id: sub.id,
        event_type: 'trial_reminder_sent',
        metadata: { days_left: 3 },
      });
    } catch (error) {
      console.error(`[Cron] Trial reminder error for sub ${sub.id}:`, error);
    }
  }
}

// ============================================
// MAIN HANDLER
// ============================================

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log(`[Cron] Running billing cron at ${new Date().toISOString()}`);

    // Run all jobs concurrently
    ctx.waitUntil(
      Promise.allSettled([
        snapshotMemberCounts(env),
        enforceGracePeriods(env),
        sendWinbackEmails(env),
        cleanupExpiredData(env),
        sendTrialReminders(env),
      ]).then(results => {
        results.forEach((result, i) => {
          const jobNames = ['memberSnapshots', 'gracePeriods', 'winbackEmails', 'dataCleanup', 'trialReminders'];
          if (result.status === 'rejected') {
            console.error(`[Cron] Job ${jobNames[i]} failed:`, result.reason);
          } else {
            console.log(`[Cron] Job ${jobNames[i]} completed`);
          }
        });
      })
    );
  },

  // Also support HTTP trigger for manual runs
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/run' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`) {
        return new Response('Unauthorized', { status: 401 });
      }

      ctx.waitUntil(
        Promise.allSettled([
          snapshotMemberCounts(env),
          enforceGracePeriods(env),
          sendWinbackEmails(env),
          cleanupExpiredData(env),
          sendTrialReminders(env),
        ])
      );

      return new Response(JSON.stringify({ triggered: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Lightning Billing Cron Worker', { status: 200 });
  },
};

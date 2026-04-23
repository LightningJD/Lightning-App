/**
 * Cloudflare Pages Function — Public testimony fetch
 *
 * GET /api/testimony?id=<uuid>
 *
 * Returns the minimal testimony data needed for the public /testimony/:id
 * landing page. Uses the service role key to bypass RLS — the anon role
 * can't read testimonies after the authenticated-only RLS migration.
 *
 * Response fields are intentionally minimal: no raw content, no user IDs.
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') ?? '';

  if (!UUID_RE.test(id)) {
    return Response.json({ error: 'Invalid testimony ID' }, { status: 400, headers: CORS });
  }

  const { SUPABASE_URL: base, SUPABASE_SERVICE_ROLE_KEY: key } = env;
  if (!base || !key) {
    return Response.json({ error: 'Service unavailable' }, { status: 503, headers: CORS });
  }

  const dbHeaders = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };

  try {
    const select = 'id,pull_quote,badge_color,badge_door,is_public,users:user_id(display_name,username,church_id)';
    const resp = await fetch(
      `${base}/rest/v1/testimonies?id=eq.${id}&select=${encodeURIComponent(select)}&limit=1`,
      { headers: dbHeaders },
    );
    const rows: any[] = await resp.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: CORS });
    }

    const t = rows[0];
    let churchName: string | undefined;

    const churchId = t.users?.church_id;
    if (churchId && UUID_RE.test(churchId)) {
      const cResp = await fetch(
        `${base}/rest/v1/churches?id=eq.${churchId}&select=name&limit=1`,
        { headers: dbHeaders },
      );
      const cRows: any[] = await cResp.json();
      churchName = cRows[0]?.name as string | undefined;
    }

    return Response.json(
      {
        id: t.id as string,
        pull_quote: (t.pull_quote as string) || '',
        badge_color: (t.badge_color as string) || 'blue',
        badge_door: t.badge_door as number | undefined,
        author_name:
          (t.users?.display_name as string) ||
          (t.users?.username as string) ||
          'Anonymous',
        church_name: churchName,
      },
      { headers: { ...CORS, 'Cache-Control': 'public, max-age=60' } },
    );
  } catch {
    return Response.json({ error: 'Service unavailable' }, { status: 503, headers: CORS });
  }
};

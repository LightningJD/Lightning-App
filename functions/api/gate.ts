interface Env { GATE_PASSWORD: string }
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
    const launchDate = new Date('2026-05-15T00:00:00Z');
    if (new Date() >= launchDate) {
          return Response.json({ ok: true, reason: 'launched' });
    }
    try {
          const { password } = await request.json<{ password: string }>();
          if (password === env.GATE_PASSWORD) return Response.json({ ok: true });
          return Response.json({ ok: false }, { status: 401 });
    } catch {
          return Response.json({ ok: false }, { status: 400 });
    }
};

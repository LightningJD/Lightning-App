// Cloudflare Pages middleware
// 1. Bounce Clerk OAuth handshake from /landing to / so the SPA can consume it.
// 2. Replace the `/ /landing 302` _redirects rule, but skip the redirect when
//    a Clerk handshake or active session is present (which would otherwise loop).
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const hasHandshake = url.searchParams.has('__clerk_handshake');

  if (url.pathname === '/landing' && hasHandshake) {
    const redirect = new URL(url);
    redirect.pathname = '/';
    return Response.redirect(redirect.toString(), 302);
  }

  if (url.pathname === '/' && !hasHandshake) {
    const cookieHeader = context.request.headers.get('cookie') || '';
    // Active Clerk session => __client_uat is a unix timestamp (10+ digits).
    const hasSession = /__client_uat=[1-9]\d{6,}/.test(cookieHeader);
    if (!hasSession) {
      const redirect = new URL(url);
      redirect.pathname = '/landing';
      return Response.redirect(redirect.toString(), 302);
    }
  }

  return context.next();
};

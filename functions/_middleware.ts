// Cloudflare Pages middleware
// Bounce Clerk OAuth handshake from /landing to / so the SPA can consume it.
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  if (url.pathname === '/landing' && url.searchParams.has('__clerk_handshake')) {
    const newUrl = new URL(url);
    newUrl.pathname = '/';
    return Response.redirect(newUrl.toString(), 302);
  }
  return context.next();
};

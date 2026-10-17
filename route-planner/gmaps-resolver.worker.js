// Βοηθός για το «Ο δικός μου δρόμος»: βρίσκει πού οδηγεί ένα σύντομο link του Google Maps (maps.app.goo.gl/…).
// Ο browser δεν επιτρέπει σε μια σελίδα να το κάνει μόνη της, γι' αυτό τρέχει ως Cloudflare Worker (δωρεάν).
// Επιστρέφει ΜΟΝΟ το τελικό link, όχι περιεχόμενο, και ακολουθεί ΜΟΝΟ links της Google.
// Στήσιμο: Cloudflare → Workers & Pages → Create → Worker → επικόλληση αυτού του αρχείου → Deploy.
const ALLOWED_ORIGINS = ['https://ferelisvag.github.io'];
const okHost = h => /^(maps\.app\.goo\.gl|goo\.gl|g\.co|consent\.google\.[a-z.]+|(www\.|maps\.)?google\.[a-z.]+)$/i.test(h);
const isMaps = u => /(^|\.)google\.[a-z.]+$/i.test(u.hostname) && !/^consent\./i.test(u.hostname) && (u.pathname.startsWith('/maps') || /^maps\./i.test(u.hostname));

export default {
  async fetch(request) {
    const origin = request.headers.get('origin') || '';
    const headers = { 'content-type': 'application/json', 'access-control-allow-origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0], 'vary': 'origin' };
    const reply = (body, status) => new Response(JSON.stringify(body), { status: status || 200, headers });
    let cur;
    try { cur = new URL(new URL(request.url).searchParams.get('u') || ''); } catch (e) { return reply({ error: 'bad url' }, 400); }
    for (let hop = 0; hop < 6; hop++) {
      if (!okHost(cur.hostname)) return reply({ error: 'not a google link' }, 400);
      if (/^consent\./i.test(cur.hostname) && cur.searchParams.get('continue')) { cur = new URL(cur.searchParams.get('continue')); continue; }
      if (isMaps(cur)) return reply({ url: cur.toString() });
      const r = await fetch(cur.toString(), { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 (compatible; route-planner)' } });
      const loc = r.headers.get('location');
      if (!loc) break;
      cur = new URL(loc, cur);
    }
    return isMaps(cur) ? reply({ url: cur.toString() }) : reply({ error: 'could not resolve' }, 422);
  }
};

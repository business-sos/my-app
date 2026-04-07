export default async function handler(req, res) {
  const docUrl = process.env.OFFER_DOC_URL;
  if (!docUrl) return res.status(500).send("OFFER_DOC_URL env var not set");

  const ref = req.query.ref; // optional post ID for per-post attribution

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    const headers = { Authorization: `Bearer ${redisToken}` };
    // Always increment total offer doc clicks
    fetch(`${redisUrl}/incr/clicks:offer`, { headers }).catch(() => {});
    // Also increment per-post counter so Tracking page sync works
    if (ref) {
      fetch(`${redisUrl}/incr/clicks:${ref}`, { headers }).catch(() => {});
    }
  }

  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, docUrl);
}

export default async function handler(req, res) {
  const { id, to } = req.query;
  if (!id || !to) return res.status(400).send("Missing params");

  // Increment click count in Upstash Redis via REST API
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (redisUrl && redisToken) {
    await fetch(`${redisUrl}/incr/clicks:${id}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    }).catch(() => {}); // fire-and-forget — never block the redirect
  }

  // Redirect to the offer doc
  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, decodeURIComponent(to));
}

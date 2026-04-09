export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { ids, global: fetchGlobal } = req.query;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return res.json({});

  const idList = ids ? ids.split(",").filter(Boolean) : [];
  const keys = [...idList.map(id => `clicks:${id}`), ...(fetchGlobal ? ["clicks:offer"] : [])];

  if (keys.length === 0) return res.json({});

  // MGET all keys in one Redis call
  const response = await fetch(`${redisUrl}/mget/${keys.join("/")}`, {
    headers: { Authorization: `Bearer ${redisToken}` },
  });
  const { result } = await response.json();

  const counts = {};
  idList.forEach((id, i) => { counts[id] = Number(result?.[i] || 0); });
  if (fetchGlobal) { counts["_offer"] = Number(result?.[idList.length] || 0); }
  res.json(counts);
}

module.exports = async (req, res) => {
  const origin = req.headers.origin;

  const allowedOrigins = new Set([
    "https://google.oss",
    "http://google.oss"
  ]);

  if (allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  const q = String(req.query.q || "").trim();
  const rawPage = Number.parseInt(req.query.page, 10);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.min(100, rawPage)) : 1;

  if (!q || q.length > 200) {
    return res.status(400).json({
      error: "Enter a search query (maximum 200 characters)"
    });
  }

  const key = process.env.SERPER_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "Search API not configured" });
  }

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q,
        page,
        num: 10,
        gl: "in",
        hl: "en"
      })
    });

    if (!response.ok) {
      return res.status(502).json({
        error: "Search provider error",
        providerStatus: response.status
      });
    }

    const data = await response.json();

    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");

    return res.status(200).json({
      query: q,
      page,
      organic: data.organic || [],
      answerBox: data.answerBox || null,
      knowledgeGraph: data.knowledgeGraph || null,
      peopleAlsoAsk: data.peopleAlsoAsk || [],
      relatedSearches: data.relatedSearches || []
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong while searching" });
  }
};

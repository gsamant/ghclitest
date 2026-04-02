const express = require("express");
const Parser = require("rss-parser");
const path = require("path");

const app = express();
const parser = new Parser();
const PORT = process.env.PORT || 3000;

const RSS_FEEDS = [
  "https://news.google.com/rss/search?q=artificial+intelligence+OR+AI+announcement+OR+machine+learning&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=OpenAI+OR+Google+AI+OR+ChatGPT+OR+GPT+OR+Claude+OR+Gemini&hl=en-US&gl=US&ceid=US:en",
];

function isToday(dateStr) {
  const itemDate = new Date(dateStr);
  const now = new Date();
  return (
    itemDate.getUTCFullYear() === now.getUTCFullYear() &&
    itemDate.getUTCMonth() === now.getUTCMonth() &&
    itemDate.getUTCDate() === now.getUTCDate()
  );
}

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/news", async (req, res) => {
  try {
    const feedPromises = RSS_FEEDS.map((url) =>
      parser.parseURL(url).catch(() => ({ items: [] }))
    );
    const feeds = await Promise.all(feedPromises);

    const seen = new Set();
    const articles = feeds
      .flatMap((feed) => feed.items || [])
      .filter((item) => {
        if (!item.pubDate || !isToday(item.pubDate)) return false;
        const key = item.link || item.title;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .map((item) => ({
        title: item.title,
        link: item.link,
        source: item.creator || item.author || extractSource(item.title),
        pubDate: item.pubDate,
        snippet: item.contentSnippet || item.content || "",
      }));

    res.json({ date: new Date().toISOString(), count: articles.length, articles });
  } catch (err) {
    console.error("Error fetching news:", err);
    res.status(500).json({ error: "Failed to fetch AI news" });
  }
});

function extractSource(title) {
  const match = title && title.match(/ - ([^-]+)$/);
  return match ? match[1].trim() : "Unknown";
}

app.listen(PORT, () => {
  console.log(`AI News server running on http://localhost:${PORT}`);
});

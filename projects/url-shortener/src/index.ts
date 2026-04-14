import express from "express";
import { saveUrl, getUrl } from "./store";

const app = express();
app.use(express.json());

app.post("/shorten", (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Invalid or missing URL" });
    return;
  }

  try {
    new URL(url);
  } catch {
    res.status(400).json({ error: "Invalid or missing URL" });
    return;
  }

  const code = saveUrl(url);
  const port = process.env.PORT || 3000;
  res.status(201).json({ shortUrl: `http://localhost:${port}/${code}` });
});

app.get("/:code", (req, res) => {
  const url = getUrl(req.params.code);
  if (!url) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.redirect(302, url);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`URL shortener running on http://localhost:${PORT}`);
});

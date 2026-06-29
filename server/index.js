import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// In production Heroku serves everything from one dyno — no cross-origin needed.
// In local dev, allow the Vite dev server.
if (process.env.NODE_ENV !== "production") {
  app.use(cors({ origin: "http://localhost:5173" }));
}

app.use(express.json());

// Serve the Vite production build (created by heroku-postbuild)
const distPath = join(__dirname, "../client/dist");
app.use(express.static(distPath));

app.post("/api/aircraft", async (req, res) => {
  const { origin, destination } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({ error: "Origin and destination are required." });
  }

  const prompt = `You are an aviation data expert. A user wants to know which aircraft types have historically operated flights between ${origin} and ${destination}.

Respond ONLY with a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "originName": "Full airport name including city",
  "destName": "Full airport name including city",
  "routeExists": true or false,
  "distance_km": approximate great circle distance as a number,
  "aircraft": [
    {
      "type": "e.g. Boeing 737-800",
      "iata": "IATA aircraft code e.g. 738",
      "icao": "ICAO aircraft code e.g. B738",
      "category": "Narrowbody" | "Widebody" | "Regional Jet" | "Turboprop" | "Business Jet",
      "airlines": ["list of airline names that have operated this type on this route"],
      "era": "current" | "historical" | "both",
      "notes": "brief note about usage on this specific route, or empty string"
    }
  ],
  "routeNotes": "any relevant notes about this route (codeshares, frequency, hub connections etc.)"
}

Sort aircraft by how common/significant they are on this route (most common first).
If the route is implausible or airports don't exist, set routeExists to false and aircraft to [].
Be comprehensive — include both current and historical operators if known.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content.find((b) => b.type === "text")?.text || "";
    const clean = raw.replace(/```json|```/gi, "").trim();
    const data = JSON.parse(clean);
    res.json(data);
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Failed to fetch aircraft data." });
  }
});

// Catch-all: serve React app for any non-API route (client-side routing)
app.get("*", (req, res) => {
  res.sendFile(join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

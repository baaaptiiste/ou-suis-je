import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: "256kb" }));

// Cle secrete partagee. Definir SHARE_SECRET dans env en prod.
const SECRET = process.env.SHARE_SECRET || "change-moi";

const MAX_POINTS = 5000; // securite memoire

// Etat d'une sortie, en memoire (perdu au redemarrage = OK, "live only").
let hike = newHike();
function newHike() {
  return { active: false, startTs: null, arrived: false, label: null, name: null, points: [] };
  // point = { lat, lng, acc, alt, spd, bat, ts }
}

function checkKey(req, res) {
  const key = req.query.key || req.headers["x-key"];
  if (key !== SECRET) {
    res.status(401).json({ error: "cle invalide" });
    return false;
  }
  return true;
}

// Demarre une sortie (efface la trace precedente).
app.post("/start", (req, res) => {
  if (!checkKey(req, res)) return;
  hike = newHike();
  hike.active = true;
  hike.startTs = Date.now();
  hike.label = (req.body && req.body.label) || null;
  hike.name = (req.body && req.body.name) || null;
  res.json({ ok: true });
});

// Stoppe la sortie (la trace reste visible jusqu'au prochain start).
app.post("/stop", (req, res) => {
  if (!checkKey(req, res)) return;
  hike.active = false;
  res.json({ ok: true });
});

// Marque "je suis arrive".
app.post("/arrived", (req, res) => {
  if (!checkKey(req, res)) return;
  hike.arrived = true;
  res.json({ ok: true });
});

// Le tel du randonneur envoie un point.
app.post("/update", (req, res) => {
  if (!checkKey(req, res)) return;
  const b = req.body || {};
  if (typeof b.lat !== "number" || typeof b.lng !== "number") {
    return res.status(400).json({ error: "lat/lng manquants" });
  }
  // Auto-start si pas demarre (robustesse si l'app crash/reload).
  if (!hike.active && hike.points.length === 0) {
    hike.active = true;
    hike.startTs = Date.now();
  }
  hike.points.push({
    lat: b.lat,
    lng: b.lng,
    acc: num(b.acc),
    alt: num(b.alt),
    spd: num(b.spd),
    bat: num(b.bat),
    ts: Date.now(),
  });
  if (hike.points.length > MAX_POINTS) hike.points.shift();
  res.json({ ok: true });
});

// Envoi groupe (points bufferises hors-reseau). Conserve le ts d'origine.
app.post("/batch", (req, res) => {
  if (!checkKey(req, res)) return;
  const arr = (req.body && req.body.points) || [];
  if (!Array.isArray(arr)) return res.status(400).json({ error: "points doit etre un tableau" });
  if (!hike.active && hike.points.length === 0) {
    hike.active = true;
    hike.startTs = Date.now();
  }
  let added = 0;
  for (const b of arr) {
    if (typeof b.lat !== "number" || typeof b.lng !== "number") continue;
    hike.points.push({
      lat: b.lat,
      lng: b.lng,
      acc: num(b.acc),
      alt: num(b.alt),
      spd: num(b.spd),
      bat: num(b.bat),
      ts: typeof b.ts === "number" ? b.ts : Date.now(),
    });
    added++;
  }
  hike.points.sort((a, b) => a.ts - b.ts);
  while (hike.points.length > MAX_POINTS) hike.points.shift();
  res.json({ ok: true, added });
});

// L'observateur lit toute la trace + meta.
app.get("/track", (req, res) => {
  if (!checkKey(req, res)) return;
  res.json({
    active: hike.active,
    arrived: hike.arrived,
    startTs: hike.startTs,
    label: hike.label,
    name: hike.name,
    points: hike.points,
  });
});

function num(v) {
  return typeof v === "number" && isFinite(v) ? v : null;
}

app.use(express.static(path.join(__dirname, "public")));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Serveur sur port ${port}`));

const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.SMARTDROP_API_KEY || "smartdrop-demo-key";

app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

const DB_DIR = process.env.SMARTDROP_DB_DIR || path.join(__dirname, "data");
const fs = require("fs");
fs.mkdirSync(DB_DIR, { recursive: true });
const db = new Database(path.join(DB_DIR, "smartdrop.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device TEXT NOT NULL,
  ph REAL NOT NULL,
  ec REAL NOT NULL,
  turbidity REAL NOT NULL,
  temperature REAL NOT NULL,
  reliability REAL NOT NULL,
  anomaly INTEGER NOT NULL DEFAULT 0,
  sensor_health TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_readings_created_at ON readings(created_at);
`);

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function calculateReliability(r) {
  let score = 100;
  if (r.ph < 6.0 || r.ph > 9.0) score -= 18;
  if (r.ec < 0 || r.ec > 2500) score -= 18;
  if (r.turbidity < 0 || r.turbidity > 10) score -= 18;
  if (r.temperature < 0 || r.temperature > 50) score -= 10;
  return clamp(score, 0, 100);
}

function validateReading(body) {
  const fields = ["device", "ph", "ec", "turbidity", "temperature"];
  if (!fields.every(k => body[k] !== undefined)) return "Missing required fields";
  if (typeof body.device !== "string" || !body.device.trim()) return "Invalid device";
  for (const k of fields.slice(1)) {
    if (!Number.isFinite(Number(body[k]))) return `Invalid ${k}`;
  }
  return null;
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "SmartDrop API", time: new Date().toISOString() });
});

app.get("/api/latest", (req, res) => {
  const row = db.prepare("SELECT * FROM readings ORDER BY id DESC LIMIT 1").get();
  if (!row) return res.json({ reading: null });
  row.sensor_health = row.sensor_health ? JSON.parse(row.sensor_health) : {};
  res.json({ reading: row });
});

app.get("/api/history", (req, res) => {
  const limit = clamp(parseInt(req.query.limit || "50", 10), 1, 500);
  const rows = db.prepare(
    "SELECT * FROM readings ORDER BY id DESC LIMIT ?"
  ).all(limit).reverse();
  res.json({ readings: rows.map(r => ({...r, sensor_health: r.sensor_health ? JSON.parse(r.sensor_health) : {}})) });
});

app.post("/api/readings", (req, res) => {
  if (req.headers["x-api-key"] !== API_KEY) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  const error = validateReading(req.body);
  if (error) return res.status(400).json({ error });

  const r = {
    device: req.body.device.trim(),
    ph: Number(req.body.ph),
    ec: Number(req.body.ec),
    turbidity: Number(req.body.turbidity),
    temperature: Number(req.body.temperature)
  };

  const reliability = Number.isFinite(Number(req.body.reliability))
    ? clamp(Number(req.body.reliability), 0, 100)
    : calculateReliability(r);

  const anomaly = req.body.anomaly ? 1 : 0;
  const sensorHealth = req.body.sensor_health || {
    ph: "OK", ec: "OK", turbidity: "OK", temperature: "OK"
  };

  const info = db.prepare(`
    INSERT INTO readings
    (device, ph, ec, turbidity, temperature, reliability, anomaly, sensor_health)
    VALUES (@device, @ph, @ec, @turbidity, @temperature, @reliability, @anomaly, @sensor_health)
  `).run({
    ...r,
    reliability,
    anomaly,
    sensor_health: JSON.stringify(sensorHealth)
  });

  const saved = db.prepare("SELECT * FROM readings WHERE id = ?").get(info.lastInsertRowid);
  saved.sensor_health = JSON.parse(saved.sensor_health);
  res.status(201).json({ ok: true, reading: saved });
});

// Simple demo generator for competition presentations.
app.post("/api/demo", (req, res) => {
  const now = Date.now();
  const ph = 7.1 + Math.sin(now / 7000) * 0.12;
  const ec = 420 + Math.sin(now / 9000) * 25;
  const turbidity = 1.4 + Math.sin(now / 5000) * 0.25;
  const temperature = 25.5 + Math.sin(now / 11000) * 0.4;
  const reliability = clamp(96 - Math.abs(ph - 7.1) * 8 - turbidity * 0.5, 0, 100);

  const payload = {
    device: "SmartDrop-Demo",
    ph: Number(ph.toFixed(2)),
    ec: Number(ec.toFixed(1)),
    turbidity: Number(turbidity.toFixed(2)),
    temperature: Number(temperature.toFixed(2)),
    reliability: Number(reliability.toFixed(1)),
    anomaly: false,
    sensor_health: { ph: "OK", ec: "OK", turbidity: "OK", temperature: "OK" }
  };

  const info = db.prepare(`
    INSERT INTO readings
    (device, ph, ec, turbidity, temperature, reliability, anomaly, sensor_health)
    VALUES (@device, @ph, @ec, @turbidity, @temperature, @reliability, @anomaly, @sensor_health)
  `).run({...payload, sensor_health: JSON.stringify(payload.sensor_health)});

  res.json({ ok: true, id: info.lastInsertRowid, reading: payload });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SmartDrop running at http://localhost:${PORT}`);
});

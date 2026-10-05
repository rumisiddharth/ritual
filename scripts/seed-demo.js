#!/usr/bin/env node
/**
 * Seeds a public demo account through the live API (no direct DB access).
 *
 *   node scripts/seed-demo.js --dry     # preview generated data + phi, no network
 *   node scripts/seed-demo.js           # seed the deployed backend
 *   API_URL=http://localhost:3001 node scripts/seed-demo.js   # seed a local backend
 *
 * Safe to re-run: registers or logs in, only creates missing habits, and
 * completions are idempotent (ON CONFLICT DO NOTHING on the server).
 */
const API_URL = process.env.API_URL || "https://ritual-backend-giri.onrender.com";
const EMAIL = process.env.DEMO_EMAIL || "demo@ritual-demo.com";
const PASSWORD = process.env.DEMO_PASSWORD || "ritual-demo-2026";
const TZ = "Asia/Kolkata";
const DAYS = 60;
const DRY = process.argv.includes("--dry");

// Deterministic PRNG so every run produces the same data.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(2026);
const bern = (p) => rand() < p;

const HABITS = [
  { key: "code", name: "Code 1 hour", category: "work", color: "#c9b97a" },
  { key: "study", name: "Study DSA", category: "learning", color: "#7f77dd" },
  { key: "workout", name: "Workout", category: "fitness", color: "#d85a30" },
  { key: "sleep", name: "Sleep before 11pm", category: "health", color: "#1d9e75" },
  { key: "meditate", name: "Meditate", category: "mindfulness", color: "#378add" },
];

// Local YYYY-MM-DD for "today" in the demo timezone, then walk back with UTC math.
const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
function addDays(ymd, n) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
const dates = Array.from({ length: DAYS }, (_, i) => addDays(today, i - (DAYS - 1)));

// Designed relationships: study follows coding, sleep follows workouts, meditation is independent.
const done = { code: [], study: [], workout: [], sleep: [], meditate: [] };
dates.forEach((ymd) => {
  const dow = new Date(ymd + "T00:00:00Z").getUTCDay(); // 0 Sun .. 6 Sat
  const weekend = dow === 0 || dow === 6;
  const code = bern(weekend ? 0.5 : 0.8);
  const study = code ? bern(0.85) : bern(0.15);
  const workout = bern(weekend ? 0.65 : 0.45);
  const sleep = workout ? bern(0.8) : bern(0.35);
  const meditate = bern(0.55);
  done.code.push(code);
  done.study.push(study);
  done.workout.push(workout);
  done.sleep.push(sleep);
  done.meditate.push(meditate);
});

function phi(a, b) {
  let n11 = 0, n10 = 0, n01 = 0, n00 = 0;
  a.forEach((x, i) => {
    const y = b[i];
    if (x && y) n11++; else if (x && !y) n10++; else if (!x && y) n01++; else n00++;
  });
  const den = Math.sqrt((n11 + n10) * (n01 + n00) * (n11 + n01) * (n10 + n00));
  return den === 0 ? 0 : (n11 * n00 - n10 * n01) / den;
}

function preview() {
  console.log(`Window: ${dates[0]} -> ${dates[dates.length - 1]} (${DAYS} days)`);
  HABITS.forEach((h) => {
    const n = done[h.key].filter(Boolean).length;
    console.log(`${h.name.padEnd(20)} ${String(n).padStart(2)}/${DAYS} days`);
  });
  const pairs = [["code", "study"], ["workout", "sleep"], ["code", "meditate"], ["study", "sleep"]];
  console.log("\nphi coefficients:");
  pairs.forEach(([a, b]) => console.log(`${a} x ${b}: ${phi(done[a], done[b]).toFixed(2)}`));
}

async function api(path, { method = "GET", token, body } = {}) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(API_URL + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      console.log("rate limited, waiting 15s...");
      await new Promise((r) => setTimeout(r, 15000));
      continue;
    }
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
  }
  throw new Error(`Too many retries for ${path}`);
}

async function main() {
  preview();
  if (DRY) return console.log("\n--dry: no requests sent.");

  console.log(`\nWaking backend at ${API_URL} (may take up to 60s on a cold start)...`);
  let reg = await api("/auth/register", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD, timezone: TZ, first_name: "Demo" },
  });
  if (reg.status === 409) {
    reg = await api("/auth/login", { method: "POST", body: { email: EMAIL, password: PASSWORD } });
  }
  if (!reg.data || !reg.data.token) throw new Error(`Auth failed: ${JSON.stringify(reg.data)}`);
  const token = reg.data.token;
  console.log("authenticated as", EMAIL);

  const existing = await api("/habits", { token });
  const byName = new Map((existing.data || []).map((h) => [h.name, h]));
  for (const h of HABITS) {
    if (!byName.has(h.name)) {
      const created = await api("/habits", {
        method: "POST", token, body: { name: h.name, category: h.category, color: h.color },
      });
      byName.set(h.name, created.data);
      console.log("created habit:", h.name);
    }
    h.id = byName.get(h.name).id;
  }

  let sent = 0;
  for (const h of HABITS) {
    for (let i = 0; i < dates.length; i++) {
      if (!done[h.key][i]) continue;
      await api("/completions", {
        method: "POST", token, body: { habit_id: h.id, completed_date: dates[i] },
      });
      if (++sent % 25 === 0) console.log(`  ${sent} completions sent`);
      await new Promise((r) => setTimeout(r, 220));
    }
  }
  console.log(`done: ${sent} completions`);

  const refresh = await api("/correlations/refresh", { method: "POST", token });
  console.log("correlation refresh:", refresh.status);
}

main().catch((e) => { console.error(e); process.exit(1); });
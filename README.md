# ritual.

> a fullstack habit tracker built for consistency — not gamification.

**Live demo:** _coming soon_  
**Stack:** React 19 · Node.js/Express 5 · PostgreSQL · Railway · Vercel

---

## what it does

ritual. lets you track daily habits across a month-view grid, see streak data, and discover correlations between habits — all with a clean, distraction-free interface.

- **completion grid** — click any cell to toggle a day. optimistic updates, no lag.
- **streak engine** — PostgreSQL trigger (`compute_streak`) calculates current and longest streaks server-side, timezone-aware
- **correlation engine** — nightly cron job computes phi-coefficients between every pair of habits. "when you code, you also study 82% of the time"
- **soft archive** — habits can be archived (not deleted), preserving historical data
- **5 themes** — dark, light, amoled, sepia, high-contrast + colorblindness filters (protanopia, deuteranopia, tritanopia)
- **3 ui modes** — normal, focus, simplified, immersive

---

## architecture

```
┌─────────────────────────────────────────────────────┐
│                     Vercel                          │
│              React 19 (CRA) frontend                │
│  App.jsx — all state lifted (habits, completions,   │
│  streaks, auth). useAuthFetch hook handles JWT +    │
│  auto-logout on 401/403.                            │
└───────────────────┬─────────────────────────────────┘
                    │ HTTPS (JWT in Authorization header)
┌───────────────────▼─────────────────────────────────┐
│                    Railway                          │
│           Node.js / Express 5 backend               │
│                                                     │
│  routes/auth.js        — register, login            │
│  routes/habits.js      — CRUD + soft delete         │
│  routes/completions.js — toggle + date normalise    │
│  routes/analytics.js   — dna, correlations          │
│  lib/cron.js           — nightly phi recompute      │
└───────────────────┬─────────────────────────────────┘
                    │ pg pool
┌───────────────────▼─────────────────────────────────┐
│              Railway Postgres                       │
│                                                     │
│  users              habits            completions   │
│  habit_streaks      habit_correlations              │
└─────────────────────────────────────────────────────┘
```

---

## tech decisions worth noting

**why pure string arithmetic for dates?**  
node-postgres returns `DATE` columns as JavaScript `Date` objects parsed from local time. Calling `.toISOString()` on them converts IST midnight (e.g. April 8 00:00 IST) to UTC (April 7 18:30 UTC), shifting every date back one day. All date handling uses a `toYMD()` helper that reads `.getFullYear() / .getMonth() / .getDate()` — local parts only, never UTC.

**why server-side streaks?**  
Streak calculation requires knowing which days were completed relative to today in the user's timezone. A PostgreSQL trigger (`compute_streak`) accepts `p_local_date` as a parameter, keeping the logic close to the data and timezone-correct.

**why phi-coefficient for correlations?**  
Both habit completion and non-completion are binary (done / not done). The phi-coefficient is mathematically equivalent to Pearson's r for binary variables — it's the right tool, not just a heuristic. Recomputed nightly via `node-cron`.

**why optimistic updates?**  
The completion grid should feel instant. Each cell click optimistically updates local state, then reconciles with the server response. An `inFlight` Set prevents race conditions on fast double-clicks. Temp IDs (`temp-${habitId}-${day}`) prevent a guard from sending `DELETE /completions/temp-x` to the server.

**why no Redux?**  
State is all in `App.jsx` and passed down as props. For a single-user app with this data shape, lifting state is simpler and more debuggable than a store. If this grew to team features, Zustand would be the first addition.

---

## local setup

```bash
# 1. clone
git clone https://github.com/rumisiddharth/ritual
cd ritual

# 2. backend deps
npm install

# 3. frontend deps
cd client && npm install && cd ..

# 4. environment
cp .env.example .env
# fill in: DATABASE_URL, JWT_SECRET, PORT=3001, NODE_ENV=development

# 5. database
psql $DATABASE_URL -f migration.sql

# 6. run both
# terminal 1
node index.js

# terminal 2
cd client && npm start
```

Frontend runs on `:3000`, proxies API calls to `:3001` via CRA proxy config.

---

## environment variables

| variable | description |
|---|---|
| `DATABASE_URL` | postgres connection string |
| `JWT_SECRET` | secret for signing JWTs (min 32 chars) |
| `PORT` | backend port (default 3001) |
| `NODE_ENV` | `development` or `production` |

---

## api reference

| method | route | description |
|---|---|---|
| POST | `/auth/register` | create account |
| POST | `/auth/login` | get JWT |
| GET | `/habits` | list active habits |
| POST | `/habits` | create habit |
| PUT | `/habits/:id` | edit habit |
| DELETE | `/habits/:id` | soft archive |
| DELETE | `/habits/:id/permanent` | hard delete |
| PATCH | `/habits/:id/unarchive` | restore archived habit |
| GET | `/completions/:year/:month` | monthly completions |
| POST | `/completions` | mark a day complete |
| DELETE | `/completions/:id` | unmark a day |
| GET | `/streaks` | all habit streaks |
| GET | `/habit-dna` | per-habit analytics |
| GET | `/correlations` | phi-coefficient pairs |
| POST | `/correlations/refresh` | manual recompute |

---

## security

- JWT auth on all routes (`middleware/auth.js`)
- `helmet` for HTTP headers
- `express-rate-limit` — 100 req/15min on auth routes
- `bcrypt` password hashing with timing-safe compare (dummy hash even on user-not-found to prevent enumeration)
- `pino` structured logging — no sensitive data logged

---

## project structure

```
ritual/
├── index.js              # express wiring (~70 lines)
├── db.js                 # pg pool singleton
├── migration.sql         # full schema
├── middleware/
│   └── auth.js           # jwt middleware
├── routes/
│   ├── auth.js
│   ├── habits.js
│   ├── completions.js
│   └── analytics.js
├── lib/
│   ├── correlations.js   # phi-coefficient engine
│   └── cron.js           # nightly recompute job
└── client/               # react cra
    └── src/
        ├── App.jsx        # all state lives here
        ├── hooks/
        │   ├── useAuthFetch.js
        │   └── useTheme.js
        └── components/
            ├── CompletionGrid.jsx
            ├── TrackerTab.jsx
            ├── DnaTab.jsx
            └── ...
```

---

## license

MIT

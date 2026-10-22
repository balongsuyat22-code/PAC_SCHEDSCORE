# 🏆 Sport Fest Management System

A full-featured REST API for managing multi-sport tournaments, team/player registration, live scoring, and department leaderboards — built with **Node.js**, **Express**, and **MySQL**.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Database Setup](#database-setup)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Tournament System](#tournament-system)
- [Scoring System](#scoring-system)
- [Champion Calculator](#champion-calculator)

---

## ✨ Features

| Module                       | Description                                                   |
| ---------------------------- | ------------------------------------------------------------- |
| 👤 **User Management**       | Roles: Admin, Referee, Player · JWT auth · Profile management |
| 🏢 **Department Management** | Create departments · Track total points · View rankings       |
| ⚽ **Sports Management**     | Individual & team sports · Configurable player counts         |
| 🏅 **Tournament System**     | Round Robin · Single Elimination · Double Elimination         |
| 📅 **Game Scheduling**       | Date/time/venue assignment · Conflict prevention              |
| 🔴 **Live Scoring**          | Real-time score updates per period/set/round                  |
| 📊 **Match History**         | Full records with scores, winner, referee, duration           |
| 🏆 **Leaderboard**           | Department rankings · Medal tally · Sport-by-sport            |
| 🥇 **Champion Calculator**   | Shows division champions and finalizes the overall champion when the season is finalized |
| 📈 **Admin Dashboard**       | Summary stats · Upcoming matches · Recent results             |

---

## 🛠 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MySQL 8+ (with stored triggers)
- **Auth:** JWT (Access + Refresh tokens)
- **Architecture:** MVC (Models/Controllers/Routes/Services)
- **Password Hashing:** bcryptjs
- **Validation:** express-validator

---

## 📁 Project Structure

```
sportfest/
├── sql/
│   └── schema.sql              # Full DB schema with seed data
├── src/
│   ├── app.js                  # Express app entry point
│   ├── config/
│   │   ├── database.js         # MySQL connection pool
│   │   ├── jwt.js              # JWT config
│   │   ├── scoring.js          # Points config
│   │   └── setupDatabase.js    # DB setup script
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── departmentController.js
│   │   ├── sportsController.js
│   │   ├── tournamentController.js
│   │   ├── matchController.js
│   │   ├── teamController.js
│   │   ├── userController.js
│   │   ├── venueController.js
│   │   ├── scheduleController.js
│   │   ├── leaderboardController.js
│   │   ├── sportFestController.js
│   │   └── reportController.js
│   ├── middleware/
│   │   ├── auth.js             # JWT verify + role guard
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── index.js            # All other routes
│   ├── services/
│   │   ├── bracketService.js   # Bracket generation logic
│   │   └── matchService.js     # Bracket progression
│   └── utils/
│       ├── logger.js           # Activity logger
│       └── response.js         # Response helpers
├── .env.example
└── package.json
```

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
cd sportfest
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your MySQL credentials and a strong JWT_SECRET
```

### 3. Create the database

```bash
npm run setup-db
```

### 4. Start the server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will run at **http://localhost:3000**  
API docs at **http://localhost:3000/api**

---

## ☁️ Deploy to Vercel with TiDB Cloud

This repository includes a Vercel Node function entry point and routing configuration. The same Express routes serve the frontend and `/api` endpoints. Vercel runs the app as a serverless function, so it does not call `listen()` or run the database setup script on each deployment.

1. Create a TiDB Cloud database and import `sql/schema.sql` into the database you intend to use. To initialize a new database with the included seed data, configure the environment variables locally and run `npm run setup-db` once. Do not run database initialization as part of Vercel's build or request startup.
2. Import this repository into Vercel and set these **Project → Settings → Environment Variables** for Production (and Preview if needed):
   - `DATABASE_URL`: TiDB's `mysql://` connection URL, including the database name in its path. Alternatively set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`.
   - `DB_SSL`: `true` (TLS certificate verification is enabled).
   - `DB_CA_CERT`: the full TiDB CA certificate PEM contents if required. For local database setup, `DB_CA_CERT_PATH` can point to the downloaded CA file instead.
   - `JWT_SECRET`: a long, randomly generated secret. Do not use the development fallback.
   - `CORS_ORIGIN`: your deployed site's exact origin, such as `https://your-project.vercel.app`.
   - `DB_CONNECTION_LIMIT`: `5` is a suitable serverless starting point; tune it together with your TiDB connection limits.
3. Deploy. Verify `/health`, `/api`, and a database-backed API endpoint after deployment.

Vercel functions do not provide persistent WebSocket connections or writable durable local storage. Socket.IO is therefore disabled in the Vercel runtime (`/socket-status` reports `available: false`), and department logo uploads go to temporary `/tmp` storage and can disappear between invocations. For production real-time updates and persistent uploads, use a separate WebSocket-capable service and durable object storage; the default local/Railway runtime retains Socket.IO and local uploads.

### Continuous integration and deployment

The GitHub Actions workflow at `.github/workflows/deploy.yml` validates JavaScript and deployment configuration on pull requests and pushes to `main`. A push to `main` (or manually running the workflow) deploys the production build to Vercel after validation succeeds.

Add these repository secrets under **GitHub → Settings → Secrets and variables → Actions**:

- `VERCEL_TOKEN`: a Vercel access token.
- `VERCEL_ORG_ID`: the Vercel team/account ID for the project.
- `VERCEL_PROJECT_ID`: the Vercel project ID.

Find the project and org IDs in the Vercel project settings or the `.vercel/project.json` file after linking the project with the Vercel CLI. Keep database credentials, `JWT_SECRET`, and other runtime environment variables configured in **Vercel → Project → Settings → Environment Variables**; the workflow does not copy or print them. After adding the secrets, push to `main` or use **Actions → CI and Vercel deployment → Run workflow**.

---

## 🗄 Database Setup

The `schema.sql` file creates everything automatically:

- All tables with foreign key relationships
- Performance indexes
- MySQL triggers that **auto-update department points** when tournament results are saved
- Seed data: departments, venues, and sports. Demo users are not created.

### Initial Administrator

Set `INITIAL_ADMIN_USERNAME`, `INITIAL_ADMIN_EMAIL`, and
`INITIAL_ADMIN_PASSWORD` in your local environment before running
`npm run setup-db` to create the first administrator. This also works against
an already-initialized database; normal setup preserves its existing data.
The password must be at least 12 characters. These values are only used for
the bootstrap insert and are never logged. Existing users are not overwritten.
Do not put these credentials in a tracked file or Vercel variables unless you
are intentionally using the setup script there.
Existing database accounts are preserved; this does not remove any demo users
that may already exist from an earlier setup. Remove or deactivate those
accounts explicitly in the application if needed.

To reset the password for one existing account, set `RESET_ACCOUNT_USERNAME`
and `RESET_ACCOUNT_PASSWORD` in your local environment and run
`node reset_password.js`. The script updates only a matching existing account,
requires a 12-character password, supports the same TiDB TLS settings, and
never creates demo users or prints the password.

### Points Trigger

When a `tournament_results` row is inserted, a MySQL trigger automatically:

1. Adds the points to the department's `department_scores` total
2. Increments the correct medal counter (gold/silver/bronze)
3. Updates participation count

---

## 🔐 Authentication

All protected routes require a Bearer token:

```
Authorization: Bearer <accessToken>
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "your-account@example.com",
  "password": "your-password"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": { "id": 1, "role": "admin", ... }
  }
}
```

### Role Permissions

| Endpoint Type                   | admin | referee | player |
| ------------------------------- | ----- | ------- | ------ |
| View public data                | ✅    | ✅      | ✅     |
| Update live scores              | ✅    | ✅      | ❌     |
| Start/complete matches          | ✅    | ✅      | ❌     |
| Manage tournaments/brackets     | ✅    | ❌      | ❌     |
| Manage users/departments        | ✅    | ❌      | ❌     |
| Finalize results & award points | ✅    | ❌      | ❌     |

---

## 🏟 Tournament System

### Step-by-step workflow:

```
1. Create Tournament       POST /api/tournaments
2. Open Registration       PUT  /api/tournaments/:id  { status: "registration" }
3. Add Participants        POST /api/tournaments/:id/participants
4. Generate Bracket        POST /api/tournaments/:id/generate-bracket
5. Schedule Matches        PATCH /api/matches/:id/schedule
6. Start Match             PATCH /api/matches/:id/start
7. Update Scores (live)    PUT  /api/matches/:id/scores
8. Complete Match          POST /api/matches/:id/complete
9. Finalize Tournament     POST /api/tournaments/:id/finalize  (awards medals + points)
```

### Supported Formats

| Format               | Description                                                           |
| -------------------- | --------------------------------------------------------------------- |
| `round_robin`        | Every team plays every other team. Standings by W/D/L points.         |
| `single_elimination` | Lose once = eliminated. Byes auto-handled for non-power-of-2 entries. |
| `double_elimination` | Upper + lower bracket. Two losses to be eliminated.                   |

---

## 📊 Scoring System

Points are awarded per tournament finish position:

| Placement     | Points | Medal  |
| ------------- | ------ | ------ |
| 🥇 1st Place  | 10     | Gold   |
| 🥈 2nd Place  | 7      | Silver |
| 🥉 3rd Place  | 5      | Bronze |
| Participation | 2      | —      |

Configure in `.env`:

```env
POINTS_1ST_PLACE=10
POINTS_2ND_PLACE=7
POINTS_3RD_PLACE=5
POINTS_PARTICIPATION=2
```

---

## 🏆 Champion Calculator

```http
GET /api/leaderboard/champion
```

**While events are ongoing** — returns current leader + completion status:

```json
{
  "is_final": false,
  "message": "📊 Current standings (8/12 events completed)",
  "current_leader": { "name": "IT Department", "total_points": 65 },
  "tournament_stats": { "total": 12, "completed": 8, "ongoing": 2 }
}
```

**When all events are done** — declares the champion:

```json
{
  "is_final": true,
  "message": "🏆 IT Department is the Sport Fest Overall Champion!",
  "champion": {
    "name": "IT Department",
    "total_points": 85,
    "gold_medals": 4,
    "silver_medals": 2,
    "bronze_medals": 1
  },
  "sport_breakdown": [...],
  "leaderboard": [...]
}
```

**Admin: Auto-declare and record champion**

```http
POST /api/sport-fest/:id/declare-champion
```

---

## 📡 Key API Endpoints

### Live Scoreboard

```http
GET /api/matches/live            — All ongoing matches
GET /api/matches/:id/scoreboard  — Real-time score for one match
```

### Leaderboard

```http
GET /api/leaderboard             — Rankings by total points
GET /api/leaderboard/medals      — Gold/Silver/Bronze tally
GET /api/leaderboard/by-sport    — Per-sport department performance
GET /api/leaderboard/champion    — 🏆 Champion status
```

### Admin Dashboard

```http
GET /api/reports/dashboard       — Stats, upcoming, recent results
GET /api/reports/match-history   — Filterable match log
GET /api/schedules/today         — Today's schedule (public)
```

---

## 🔧 Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=sportfest_db

# JWT (use a strong random string in production!)
JWT_SECRET=change_this_to_a_random_secret
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Scoring
POINTS_1ST_PLACE=10
POINTS_2ND_PLACE=7
POINTS_3RD_PLACE=5
POINTS_PARTICIPATION=2
```

---

## 📦 Seed Sports Included

| Sport             | Code | Type       |
| ----------------- | ---- | ---------- |
| Basketball        | BBL  | Team (5v5) |
| Volleyball        | VBL  | Team (6v6) |
| Badminton Singles | BDS  | Individual |
| Badminton Doubles | BDD  | Team (2v2) |
| Chess             | CHS  | Individual |
| Track 100m        | T100 | Individual |
| Track 200m        | T200 | Individual |
| Track 400m        | T400 | Individual |
| 4x100m Relay      | R4X1 | Team (4)   |
| Mobile Legends    | ML   | Team (5v5) |
| Valorant          | VLR  | Team (5v5) |

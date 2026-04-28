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
| 🥇 **Champion Calculator**   | Auto-declares Overall Champion when all events finish         |
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

## 🗄 Database Setup

The `schema.sql` file creates everything automatically:

- All tables with foreign key relationships
- Performance indexes
- MySQL triggers that **auto-update department points** when tournament results are saved
- Seed data: 6 departments, 6 venues, 11 sports, 1 admin account

### Default Admin Account

```
Email:    admin@sportfest.com
Password: Admin@1234
```

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
  "email": "admin@sportfest.com",
  "password": "Admin@1234"
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

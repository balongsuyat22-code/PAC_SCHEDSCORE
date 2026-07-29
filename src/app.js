require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
app.set('trust proxy', 1);

const { testConnection } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const departmentRoutes = require('./routes/departments');
const sportsRoutes = require('./routes/sports');
const tournamentRoutes = require('./routes/tournaments');
const matchRoutes = require('./routes/matches');
const teamRoutes = require('./routes/teams');
const userRoutes = require('./routes/users');
const venueRoutes = require('./routes/venues');
const scheduleRoutes = require('./routes/schedules');
const leaderboardRoutes = require('./routes/leaderboard');
const sportFestRoutes = require('./routes/sportFest');
const reportRoutes = require('./routes/reports');
const playerRoutes = require('./routes/player');

// Import socket utilities
const { initSocket } = require('./utils/socketEmit');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ── SOCKET.IO SETUP ──
const io = socketIo(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
});

// Initialize socket handlers and get helpers
const socketHelpers = require('./socket')(io);
initSocket(socketHelpers);

// Make io available to routes
app.set('io', io);

// ── Frontend directories ────────────────────────────────────────
const frontendRoot = path.join(__dirname, 'frontend');
const frontendAdmin = path.join(__dirname, 'frontend', 'admin');
const frontendReferee = path.join(__dirname, 'frontend', 'referee');
const frontendVisitor = path.join(__dirname, 'frontend', 'visitor');
const frontendDean = path.join(__dirname, 'frontend', 'dean');
const frontendPresident = path.join(__dirname, 'frontend', 'SGO_PRESIDENT');

// ── Directory-scoped page sender ────────────────────────────────
const sendPageFrom = (dir, filename) => (req, res) => {
    const p = path.join(dir, filename);
    if (fs.existsSync(p)) return res.sendFile(p);
    res.status(404).send(
        `<h2>Page not found: <code>${filename}</code></h2>` +
        `<p>Looked in:</p><ul><li><code>${p}</code></li></ul>`
    );
};

// ── MIDDLEWARE ──
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static('uploads'));

// Logging (dev only)
if (process.env.NODE_ENV === 'development') {
    app.use((req, _res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
        next();
    });
}

// ── HEALTH CHECK ──
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'Sport Fest', version: '1.0.0' }));

// ── WEBSOCKET STATUS ENDPOINT ──
app.get('/socket-status', (req, res) => {
    res.json({
        success: true,
        data: {
            connected: socketHelpers.getConnectedUsers(),
            rooms: {
                matches: 'dynamic',
                tournaments: 'dynamic',
                leaderboard: io.sockets.adapter.rooms.get('leaderboard')?.size || 0
            }
        }
    });
});

// ── PUBLIC PAGES ──
app.get('/player-registration', sendPageFrom(frontendRoot, 'player_registration.html'));

// ── PUBLIC LIVE SCOREBOARD (visitor) ──
app.get('/live', sendPageFrom(frontendVisitor, 'index.html'));
app.get('/live/scores', sendPageFrom(frontendVisitor, 'index.html'));
app.get('/live/standings', sendPageFrom(frontendVisitor, 'standings.html'));
app.get('/live/schedule', sendPageFrom(frontendVisitor, 'schedule.html'));
app.get('/live/mvp', sendPageFrom(frontendVisitor, 'mvp.html'));
app.get('/live/highlights', sendPageFrom(frontendVisitor, 'highlights.html'));

// ── API ROUTES ──
const API = '/api';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/departments`, departmentRoutes);
app.use(`${API}/sports`, sportsRoutes);
app.use(`${API}/tournaments`, tournamentRoutes);
app.use(`${API}/matches`, matchRoutes);
app.use(`${API}/teams`, teamRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/venues`, venueRoutes);
app.use(`${API}/schedules`, scheduleRoutes);
app.use(`${API}/leaderboard`, leaderboardRoutes);
app.use(`${API}/sport-fest`, sportFestRoutes);
app.use(`${API}/reports`, reportRoutes);
app.use(`${API}/players`, playerRoutes);

app.get(`${API}`, (_req, res) => res.json({
    service: 'Sport Fest Management System API',
    version: '1.0.0',
    websocket: 'enabled',
    endpoints: {
        auth: `${API}/auth`,
        departments: `${API}/departments`,
        sports: `${API}/sports`,
        tournaments: `${API}/tournaments`,
        matches: `${API}/matches`,
        teams: `${API}/teams`,
        users: `${API}/users`,
        venues: `${API}/venues`,
        schedules: `${API}/schedules`,
        leaderboard: `${API}/leaderboard`,
        sportFest: `${API}/sport-fest`,
        reports: `${API}/reports`,
        players: `${API}/players`,
    },
}));

// ── ROOT AND LOGIN ──
app.get('/', sendPageFrom(frontendVisitor, 'index.html')); // live board as home
app.get('/login', sendPageFrom(frontendRoot, 'login.html'));

// ── Admin pages ──────────────────────────────────────────────
app.get('/admin', sendPageFrom(frontendAdmin, 'admin.html'));
app.get('/admin/dashboard', sendPageFrom(frontendAdmin, 'admin.html'));
app.get('/admin/tournaments', sendPageFrom(frontendAdmin, 'admin-tournaments.html'));
app.get('/admin/matches', sendPageFrom(frontendAdmin, 'admin-matches.html'));
app.get('/admin/leaderboard', sendPageFrom(frontendAdmin, 'admin-leaderboard.html'));
app.get('/admin/live', sendPageFrom(frontendAdmin, 'admin-live.html'));
app.get('/admin/sports', sendPageFrom(frontendAdmin, 'admin-sports.html'));
app.get('/admin/teams', sendPageFrom(frontendAdmin, 'admin-teams.html'));
app.get('/admin/venues', sendPageFrom(frontendAdmin, 'admin-venues.html'));
app.get('/admin/users', sendPageFrom(frontendAdmin, 'admin-users.html'));
app.get('/admin/schedule', sendPageFrom(frontendAdmin, 'admin-schedule.html'));
app.get('/admin/departments', sendPageFrom(frontendAdmin, 'admin-departments.html'));
app.get('/admin/sport-fest', sendPageFrom(frontendAdmin, 'admin-sport-fest.html'));
app.get('/admin/reports', sendPageFrom(frontendAdmin, 'admin-reports.html'));

// ── Dean Adviser pages ────────────────────────────────────────
app.get('/dean', sendPageFrom(frontendDean, 'dashboard.html'));
app.get('/dean/dashboard', sendPageFrom(frontendDean, 'dashboard.html'));
app.get('/dean/live', sendPageFrom(frontendDean, 'live.html'));
app.get('/dean/leaderboard', sendPageFrom(frontendDean, 'leaderboard.html'));
app.get('/dean/schedule', sendPageFrom(frontendDean, 'schedule.html'));
app.get('/dean/notifications', sendPageFrom(frontendDean, 'notifications.html'));
app.get('/dean/players', sendPageFrom(frontendDean, 'player.html'));
app.get('/dean/teams', sendPageFrom(frontendDean, 'teams.html'));
app.get('/dean/matches', sendPageFrom(frontendDean, 'matches.html'));
app.get('/dean/scores', sendPageFrom(frontendDean, 'scores.html'));
app.get('/dean/reports', sendPageFrom(frontendDean, 'reports.html'));
app.get('/dean/standings', sendPageFrom(frontendDean, 'standings.html'));

// ── SGO President pages ──────────────────────────────────────
app.get('/president', sendPageFrom(frontendPresident, 'dashboard.html'));
app.get('/president/dashboard', sendPageFrom(frontendPresident, 'dashboard.html'));
app.get('/president/dashboard.html', sendPageFrom(frontendPresident, 'dashboard.html'));
app.get('/president/bracketing', sendPageFrom(frontendPresident, 'bracketing.html'));
app.get('/president/bracketing.html', sendPageFrom(frontendPresident, 'bracketing.html'));
app.get('/president/game-setup', sendPageFrom(frontendPresident, 'game-setup.html'));
app.get('/president/game-setup.html', sendPageFrom(frontendPresident, 'game-setup.html'));
app.get('/president/schedule', sendPageFrom(frontendPresident, 'schedule.html'));
app.get('/president/schedule.html', sendPageFrom(frontendPresident, 'schedule.html'));
app.get('/president/venues', sendPageFrom(frontendPresident, 'venues.html'));
app.get('/president/venues.html', sendPageFrom(frontendPresident, 'venues.html'));
app.get('/president/assignment', sendPageFrom(frontendPresident, 'game-assignment.html'));
app.get('/president/assignment.html', sendPageFrom(frontendPresident, 'game-assignment.html'));
app.get('/president/live', sendPageFrom(frontendPresident, 'live-scores.html'));
app.get('/president/live-scores.html', sendPageFrom(frontendPresident, 'live-scores.html'));
app.get('/president/reports', sendPageFrom(frontendPresident, 'reports.html'));
app.get('/president/reports.html', sendPageFrom(frontendPresident, 'reports.html'));
app.get('/president/notifications', sendPageFrom(frontendPresident, 'notifications.html'));
app.get('/president/notifications.html', sendPageFrom(frontendPresident, 'notifications.html'));
app.get('/president/sports', sendPageFrom(frontendPresident, 'sports.html'));
app.get('/president/sports.html', sendPageFrom(frontendPresident, 'sports.html'));

// SGO_PRESIDENT static assets
app.use('/SGO_PRESIDENT', express.static(frontendPresident));
app.use('/sgo_president', express.static(frontendPresident));

app.get('/sgo_president', (req, res) => {
    res.redirect('/president');
});
app.get('/sgo_president/*', (req, res) => {
    const subpath = req.params[0] || '';
    if (subpath) {
        res.redirect(`/president/${subpath}`);
    } else {
        res.redirect('/president');
    }
});

// ── SGO Officer pages ──
app.get('/officer', (req, res) => res.redirect('/referee'));
app.get('/officer/dashboard', (req, res) => res.redirect('/referee'));
app.get('/officer/matches', (req, res) => res.redirect('/referee/matches'));
app.get('/officer/scoring', (req, res) => res.redirect('/referee/scoring'));
app.get('/officer/history', (req, res) => res.redirect('/referee/history'));
app.get('/officer/standings', (req, res) => res.redirect('/referee/leaderboard'));

// ── Referee pages ──
app.get('/referee', sendPageFrom(frontendReferee, 'schedule.html'));
app.get('/referee/history', sendPageFrom(frontendReferee, 'history.html'));
app.get('/referee/leaderboard', sendPageFrom(frontendReferee, 'leaderboard.html'));
app.get('/referee/matches', sendPageFrom(frontendReferee, 'matches.html'));
app.get('/referee/scoring', sendPageFrom(frontendReferee, 'scoring.html'));
app.get('/referee/schedule', sendPageFrom(frontendReferee, 'schedule.html'));
app.get('/referee/tournaments', sendPageFrom(frontendReferee, 'tournaments.html'));

// ── Static files ──────────────────────────────────────────────
app.use(express.static(frontendRoot));
app.use(express.static(frontendAdmin));
app.use(express.static(frontendDean));
app.use(express.static(frontendPresident));
app.use(express.static(frontendReferee));
app.use(express.static(frontendVisitor));

// ── Catch-all route ──
app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) return next();

    const ext = path.extname(req.originalUrl).toLowerCase();
    if (['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp'].includes(ext)) {
        return res.status(404).send('File not found');
    }

    const loginPath = path.join(frontendRoot, 'login.html');
    if (fs.existsSync(loginPath)) return res.sendFile(loginPath);
    next();
});

// ── ERROR HANDLING ──
app.use(notFound);
app.use(errorHandler);

// ── START SERVER ──
const start = async () => {
    try {
        await testConnection();

        const requiredDirs = [
            frontendRoot,
            frontendAdmin,
            frontendDean,
            frontendPresident,
            frontendReferee,
            frontendVisitor,
        ];
        const missing = requiredDirs.filter((d) => !fs.existsSync(d));
        if (missing.length) {
            missing.forEach((d) => console.warn(`⚠️  Missing folder: ${d}`));
        }

        server.listen(PORT, () => {
            console.log(`Sport Fest running on http://localhost:${PORT}`);
            console.log(`WebSocket ws://localhost:${PORT}`);
            if (process.env.NODE_ENV === 'development') {
                console.log(`Live board → http://localhost:${PORT}/live`);
                console.log(`API        → http://localhost:${PORT}/api`);
            }
        });
    } catch (err) {
        console.error('Server failed to start:', err.message);
        process.exit(1);
    }
};

start();

module.exports = { app, server, io };
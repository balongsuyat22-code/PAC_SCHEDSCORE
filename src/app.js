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
const visitorRoutes = require('./routes/visitor');
const notificationRoutes = require('./routes/notifications');

const { initSocket } = require('./utils/socketEmit');

const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

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

const socketHelpers = require('./socket')(io);
initSocket(socketHelpers);

app.set('io', io);

const frontendRoot = path.join(__dirname, 'frontend');
const frontendPages = path.join(__dirname, 'frontend', 'pages'); // same folder login.html lives in
const frontendAdmin = path.join(__dirname, 'frontend', 'pages', 'admin');
const frontendReferee = path.join(__dirname, 'frontend', 'pages', 'referee');
const frontendVisitor = path.join(__dirname, 'frontend', 'pages', 'visitor');
const frontendDean = path.join(__dirname, 'frontend', 'pages', 'dean');
const frontendPresident = path.join(__dirname, 'frontend', 'pages', 'SGO_PRESIDENT');

const sendPageFrom = (dir, filename) => (req, res) => {
    const p = path.join(dir, filename);
    if (fs.existsSync(p)) return res.sendFile(p);
    res.status(404).send(
        `<h2>Page not found: <code>${filename}</code></h2>` +
        `<p>Looked in:</p><ul><li><code>${p}</code></li></ul>`
    );
};

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static('uploads'));

if (process.env.NODE_ENV === 'development') {
    app.use((req, _res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
        next();
    });
}

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'Sport Fest', version: '1.0.0' }));

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

// player_registration.html lives alongside login.html in frontend/pages/
app.get('/player-registration', sendPageFrom(frontendPages, 'player_registration.html'));

app.get('/live', sendPageFrom(frontendVisitor, 'index.html'));
app.get('/live/scores', sendPageFrom(frontendVisitor, 'index.html'));
app.get('/live/standings', sendPageFrom(frontendVisitor, 'standings.html'));
app.get('/live/schedule', sendPageFrom(frontendVisitor, 'schedule.html'));
app.get('/live/mvp', sendPageFrom(frontendVisitor, 'mvp.html'));
app.get('/live/highlights', sendPageFrom(frontendVisitor, 'highlights.html'));

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
app.use(`${API}/visitor`, visitorRoutes);
app.use(`${API}/notifications`, notificationRoutes);

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
        visitor: `${API}/visitor`,
    },
}));

app.get('/', sendPageFrom(frontendVisitor, 'index.html'));
app.get('/login', sendPageFrom(frontendRoot, '/pages/login.html'));

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
app.get('/admin/tournament-export', sendPageFrom(frontendAdmin, 'admin-tournament-export.html'));

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

app.get('/president', sendPageFrom(frontendPresident, 'pres-dashboard.html'));
app.get('/president/dashboard', sendPageFrom(frontendPresident, 'pres-dashboard.html'));
app.get('/president/dashboard.html', sendPageFrom(frontendPresident, 'pres-dashboard.html'));
app.get('/president/bracketing', sendPageFrom(frontendPresident, 'pres-game-setup.html'));
app.get('/president/bracketing.html', sendPageFrom(frontendPresident, 'pres-game-setup.html'));
app.get('/president/game-setup', sendPageFrom(frontendPresident, 'pres-game-setup.html'));
app.get('/president/game-setup.html', sendPageFrom(frontendPresident, 'pres-game-setup.html'));
app.get('/president/schedule', sendPageFrom(frontendPresident, 'pres-schedule.html'));
app.get('/president/schedule.html', sendPageFrom(frontendPresident, 'pres-schedule.html'));
app.get('/president/venues', sendPageFrom(frontendPresident, 'pres-venues.html'));
app.get('/president/venues.html', sendPageFrom(frontendPresident, 'pres-venues.html'));
app.get('/president/departments', sendPageFrom(frontendPresident, 'pres-departments.html'));
app.get('/president/departments.html', sendPageFrom(frontendPresident, 'pres-departments.html'));
app.get('/president/users', sendPageFrom(frontendPresident, 'pres-users.html'));
app.get('/president/users.html', sendPageFrom(frontendPresident, 'pres-users.html'));
app.get('/president/tournament-export', sendPageFrom(frontendPresident, 'pres-tournament-export.html'));
app.get('/president/tournament-export.html', sendPageFrom(frontendPresident, 'pres-tournament-export.html'));
app.get('/president/assignment', (req, res) => res.redirect(301, '/president/schedule'));
app.get('/president/assignment.html', (req, res) => res.redirect(301, '/president/schedule'));
app.get('/president/live', sendPageFrom(frontendPresident, 'pres-live-scores.html'));
app.get('/president/live-scores.html', sendPageFrom(frontendPresident, 'pres-live-scores.html'));
app.get('/president/leaderboard', sendPageFrom(frontendPresident, 'pres-leaderboard.html'));
app.get('/president/leaderboard.html', sendPageFrom(frontendPresident, 'pres-leaderboard.html'));
app.get('/president/reports', sendPageFrom(frontendPresident, 'pres-reports.html'));
app.get('/president/reports.html', sendPageFrom(frontendPresident, 'pres-reports.html'));
app.get('/president/notifications', sendPageFrom(frontendPresident, 'pres-notifications.html'));
app.get('/president/notifications.html', sendPageFrom(frontendPresident, 'pres-notifications.html'));
app.get('/president/sports', sendPageFrom(frontendPresident, 'pres-sports.html'));
app.get('/president/sports.html', sendPageFrom(frontendPresident, 'pres-sports.html'));
app.get('/president/sport-fest', sendPageFrom(frontendPresident, 'pres-sport-fest.html'));
app.get('/president/sport-fest.html', sendPageFrom(frontendPresident, 'pres-sport-fest.html'));

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

app.get('/officer', (req, res) => res.redirect('/referee'));
app.get('/officer/dashboard', (req, res) => res.redirect('/referee'));
app.get('/officer/matches', (req, res) => res.redirect('/referee/matches'));
app.get('/officer/scoring', (req, res) => res.redirect('/referee/scoring'));
app.get('/officer/history', (req, res) => res.redirect('/referee/history'));
app.get('/officer/standings', (req, res) => res.redirect('/referee/leaderboard'));

app.get('/referee', sendPageFrom(frontendReferee, 'schedule.html'));
app.get('/referee/history', sendPageFrom(frontendReferee, 'history.html'));
app.get('/referee/leaderboard', sendPageFrom(frontendReferee, 'leaderboard.html'));
app.get('/referee/matches', sendPageFrom(frontendReferee, 'matches.html'));
app.get('/referee/scoring', sendPageFrom(frontendReferee, 'scoring.html'));
app.get('/referee/schedule', sendPageFrom(frontendReferee, 'schedule.html'));
app.get('/referee/tournaments', sendPageFrom(frontendReferee, 'tournaments.html'));

app.use(express.static(frontendRoot));
app.use(express.static(frontendAdmin));
app.use(express.static(frontendDean));
app.use(express.static(frontendPresident));
app.use(express.static(frontendReferee));
app.use(express.static(frontendVisitor));

app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) return next();

    const ext = path.extname(req.originalUrl).toLowerCase();
    next();
});

app.use(notFound);
app.use(errorHandler);

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
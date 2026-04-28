require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

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

const app = express();
const PORT = process.env.PORT || 3000;


const frontendRoot = path.join(__dirname, 'frontend');
const frontendAdmin = path.join(__dirname, 'frontend', 'admin');
const frontendReferee = path.join(__dirname, 'frontend', 'referee');
const frontendPlayer = path.join(__dirname, 'frontend', 'player');
const frontendVisitor = path.join(__dirname, 'frontend', 'visitor');


const resolvePage = (filename) => {
    const v = path.join(frontendVisitor, filename);
    if (fs.existsSync(v)) return v;

    const a = path.join(frontendAdmin, filename);
    if (fs.existsSync(a)) return a;

    const r = path.join(frontendReferee, filename);
    if (fs.existsSync(r)) return r;

    const p = path.join(frontendPlayer, filename);
    if (fs.existsSync(p)) return p;

    const b = path.join(frontendRoot, filename);
    if (fs.existsSync(b)) return b;

    return null;
};


const sendPage = (filename) => (req, res) => {
    const p = resolvePage(filename);
    if (p) return res.sendFile(p);
    res.status(404).send(
        `<h2>Page not found: <code>${filename}</code></h2>` +
        `<p>Looked in:</p><ul>` +
        `<li><code>${path.join(frontendAdmin, filename)}</code></li>` +
        `<li><code>${path.join(frontendReferee, filename)}</code></li>` +
        `<li><code>${path.join(frontendPlayer, filename)}</code></li>` + // <--- NEW
        `<li><code>${path.join(frontendRoot, filename)}</code></li>` +
        `</ul>`
    );
};

app.use('/uploads', express.static('uploads'));


app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
    app.use((req, _res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
        next();
    });
}


app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'Sport Fest', version: '1.0.0' }));
app.get('/player-registration', sendPage('player_registration.html'));


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
    service: 'Sport Fest Management System API', version: '1.0.0',
    endpoints: {
        auth: `${API}/auth`, departments: `${API}/departments`, sports: `${API}/sports`,
        tournaments: `${API}/tournaments`, matches: `${API}/matches`, teams: `${API}/teams`,
        users: `${API}/users`, venues: `${API}/venues`, schedules: `${API}/schedules`,
        leaderboard: `${API}/leaderboard`, champion: `${API}/leaderboard/champion`,
        sportFest: `${API}/sport-fest`, reports: `${API}/reports`,
    },
}));


app.get('/', sendPage('visitor.html'));
app.get('/login', sendPage('login.html'));


app.get('/admin', sendPage('admin.html'));
app.get('/admin/dashboard', sendPage('admin.html'));
app.get('/admin/tournaments', sendPage('admin-tournaments.html'));
app.get('/admin/tournaments/:id', sendPage('admin-tournament-detail.html'));
app.get('/admin/matches', sendPage('admin-matches.html'));
app.get('/admin/leaderboard', sendPage('admin-leaderboard.html'));
app.get('/admin/live', sendPage('admin-live.html'));
app.get('/admin/sports', sendPage('admin-sports.html'));
app.get('/admin/teams', sendPage('admin-teams.html'));
app.get('/admin/venues', sendPage('admin-venues.html'));
app.get('/admin/users', sendPage('admin-users.html'));
app.get('/admin/schedule', sendPage('admin-schedule.html'));
app.get('/admin/departments', sendPage('admin-departments.html'));


app.get('/player', sendPage('profile.html'));
app.get('/player/profile', sendPage('profile.html'));
app.get('/player/athletes', sendPage('athletes.html'));
app.get('/player/mvp', sendPage('mvp.html'));
app.get('/player/scores', sendPage('scores.html'));
app.get('/player/standings', sendPage('standings.html'));


app.get('/referee', sendPage('referee.html'));
app.get('/referee/history', sendPage('history.html'));
app.get('/referee/leaderboard', sendPage('leaderboard.html'));
app.get('/referee/matches', sendPage('matches.html'));
app.get('/referee/scoring', sendPage('scoring.html'));
app.get('/referee/schedule', sendPage('schedule.html'));
app.get('/referee/tournaments', sendPage('tournaments.html'));


app.use(express.static(frontendRoot));
app.use(express.static(frontendAdmin));
app.use(express.static(frontendReferee));
app.use(express.static(frontendPlayer));
app.use(express.static(frontendVisitor));


app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) return next();
    const p = resolvePage('login.html');
    if (p) return res.sendFile(p);
    next();
});

app.use(notFound);
app.use(errorHandler);


const start = async () => {
    try {
        await testConnection();
        app.listen(PORT, () => {
            console.log('');
            console.log('  🏆  Sport Fest Management System');
            console.log(`  🚀  http://localhost:${PORT}`);
            console.log(`  ⚙️   Admin       → http://localhost:${PORT}/admin`);
            console.log(`  哨  Referee     → http://localhost:${PORT}/referee`);
            console.log(`  🏃  Player      → http://localhost:${PORT}/player`);
            console.log(`  📖  API Docs    → http://localhost:${PORT}/api`);
            console.log('');
            console.log(`  📁  Root    → ${frontendRoot}`);
            console.log(`  📁  Admin   → ${frontendAdmin}`);
            console.log(`  📁  Referee → ${frontendReferee}`);
            console.log(`  📁  Player  → ${frontendPlayer}`);

            if (!fs.existsSync(frontendRoot))
                console.warn(`  ⚠️  MISSING: ${frontendRoot}`);
            if (!fs.existsSync(frontendAdmin))
                console.warn(`  ⚠️  MISSING: ${frontendAdmin}  (create this folder)`);
            if (!fs.existsSync(frontendReferee))
                console.warn(`  ⚠️  MISSING: ${frontendReferee}  (create this folder)`);
            if (!fs.existsSync(frontendPlayer))
                console.warn(`  ⚠️  MISSING: ${frontendPlayer}  (create this folder)`); // <--- NEW
            console.log('');
        });
    } catch (err) {
        console.error('❌ Server failed to start:', err.message);
        process.exit(1);
    }
};

start();
module.exports = app;
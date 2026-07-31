/** Shared config & utilities for PAC SCHED-SCORE public pages */

// FIXED — this was the actual cause of every ERR_CONNECTION_REFUSED /
// failed WebSocket you're seeing in production. The old logic was:
//   location.origin.includes('3000') ? '' : 'http://localhost:3000'
// which means: "same-origin ONLY if the URL happens to contain the digits
// 3000 — otherwise always point at localhost:3000." On Railway
// (pacsportsched-production.up.railway.app) that condition is false, so
// every page tried to fetch and open a socket against a server that only
// exists on your dev machine. It happened to work in local dev purely by
// coincidence (dev server runs on port 3000, so the URL contains "3000").
//
// Correct rule: use the same origin the page was served from, in every
// environment, UNLESS you're on localhost/127.0.0.1 on a port that ISN'T
// already your API port — that's the one case that actually needs the
// separate-origin dev server address. window.PAC_API_BASE always wins if
// you explicitly set it (e.g. for a staging environment).
const BASE = window.PAC_API_BASE || (() => {
    const isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!isLocalHost) return ''; // production/staging: always same-origin
    return location.port === '3000' ? '' : 'http://localhost:3000';
})();

const MATCHES_POLL_MS = 20000;
const LEADERBOARD_POLL_MS = 30000;
const MODAL_POLL_MS = 8000;

const I = {
    live: '●', star: '★', trophy: '🏆', crown: '👑', check: '✓',
    pin: '📍', clock: '🕐', calendar: '📅', search: '🔍', zap: '⚡',
    sets: '▤', binary: '⚔', refresh: '↻'
};

function esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function initials(name) {
    if (!name) return '?';
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const DEPT_PALETTE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
function deptColor(name) {
    if (!name) return '#6b7280';
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return DEPT_PALETTE[h % DEPT_PALETTE.length];
}

function isToday(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr + 'T00:00:00');
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function fmtTime(t) {
    if (!t) return '—';
    const parts = String(t).split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
}

function fmtDate(d) {
    if (!d || d === 'TBD') return 'TBD';
    try {
        const dt = new Date(d + 'T00:00:00');
        return dt.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch { return d; }
}

function isTimeBased(sport) {
    if (!sport) return false;
    const s = sport.toLowerCase();
    return /swim|run|track|race|time trial|athletics/.test(s);
}

function isFFA(m) {
    return m && (m.tournament_format === 'ffa' || m.bracket_side === 'ffa' ||
        (m.bracket_position && String(m.bracket_position).toLowerCase().includes('ffa')) ||
        (!m.participant_b_department_id && m.tournament_format === 'free_for_all'));
}

function isSets(m) {
    return m && (m.scoring_type === 'sets' || (m.sets_to_win && Number(m.sets_to_win) > 0));
}

function isBinary(m) {
    return m && m.scoring_type === 'binary';
}

function fmtScore(val, sport) {
    if (val == null || val === '') return '0';
    const n = Number(val);
    if (isNaN(n)) return String(val);
    if (isTimeBased(sport)) {
        if (n >= 60) {
            const m = Math.floor(n / 60);
            const s = (n % 60).toFixed(2);
            return `${m}:${s.padStart(5, '0')}`;
        }
        return n.toFixed(2);
    }
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function sportIcon(name) {
    if (!name) return '🏅';
    const s = name.toLowerCase();
    if (/basket/.test(s)) return '🏀';
    if (/volley/.test(s)) return '🏐';
    if (/soccer|football/.test(s)) return '⚽';
    if (/badminton/.test(s)) return '🏸';
    if (/table.?tennis|ping/.test(s)) return '🏓';
    if (/tennis/.test(s)) return '🎾';
    if (/chess/.test(s)) return '♟️';
    if (/swim/.test(s)) return '🏊';
    if (/run|track|athlet/.test(s)) return '🏃';
    if (/chess|board/.test(s)) return '♟️';
    return '🏅';
}

function statusBadgeHTML(status) {
    if (status === 'ongoing') return `<span class="status-badge status-live"><span class="status-dot"></span>LIVE</span>`;
    if (status === 'completed') return `<span class="status-badge status-done">FINAL</span>`;
    return `<span class="status-badge status-upcoming">UPCOMING</span>`;
}

function deptAvatarHTML(name, color, logo, size, isWinner) {
    const ring = isWinner ? ' is-winner-ring' : '';
    if (logo) {
        return `<div class="dept-avatar${ring}" style="background:${color}"><img src="${esc(logo)}" alt="${esc(name)}"></div>`;
    }
    return `<div class="dept-avatar${ring}" style="background:${color}">${initials(name)}</div>`;
}

function applyDynamicTheme(hex) {
    if (!hex) return;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r)) return;
    document.documentElement.style.setProperty('--accent', hex);
    document.documentElement.style.setProperty('--accent-rgb', `${r},${g},${b}`);
    document.documentElement.style.setProperty('--accent-dim', `rgba(${r},${g},${b},0.12)`);
    document.documentElement.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.3)`);
    const glow = document.querySelector('.hero-glow');
    if (glow) glow.classList.add('themed');
}

/* WebSocket */
let socket = null;
let isConnected = false;
const activeMatchRooms = new Set();
let consecutiveFetchFailures = 0;

function initSocket(handlers = {}) {
    if (typeof io === 'undefined') {
        console.warn('Socket.IO not loaded — falling back to polling');
        return null;
    }
    try {
        socket = io(BASE || undefined, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
        });
        socket.on('connect', () => {
            isConnected = true;
            consecutiveFetchFailures = 0;
            updateWsStatus(true);
            activeMatchRooms.forEach(id => socket.emit('joinMatch', id));
            if (handlers.onConnect) handlers.onConnect();
        });
        socket.on('disconnect', () => {
            isConnected = false;
            updateWsStatus(false);
        });
        // Surfaces *why* it's not connecting instead of failing silently —
        // helpful the next time BASE is misconfigured.
        socket.on('connect_error', (err) => {
            isConnected = false;
            updateWsStatus(false);
            console.warn('Socket connect_error:', err?.message || err, '— API base:', BASE || '(same origin)');
        });
        socket.on('score:update', data => { if (handlers.onScoreUpdate) handlers.onScoreUpdate(data); });
        socket.on('match:started', data => { if (handlers.onMatchStarted) handlers.onMatchStarted(data); });
        socket.on('match:completed', data => { if (handlers.onMatchCompleted) handlers.onMatchCompleted(data); });
        socket.on('live:tick', data => { if (handlers.onLiveTick) handlers.onLiveTick(data); });
        socket.on('leaderboard:changed', data => { if (handlers.onLeaderboardChanged) handlers.onLeaderboardChanged(data); });
        socket.on('ffa:resultsUpdated', data => { if (handlers.onFFA) handlers.onFFA(data); });
        socket.on('live:matchStarted', data => { if (handlers.onMatchStarted) handlers.onMatchStarted(data); });
    } catch (e) {
        console.warn('Socket init failed', e);
    }
    return socket;
}

function updateWsStatus(connected) {
    document.querySelectorAll('.ws-dot').forEach(d => {
        d.classList.toggle('connected', connected);
        d.classList.toggle('disconnected', !connected);
    });
    document.querySelectorAll('.ws-status span:last-child').forEach(s => {
        s.textContent = connected ? 'Live' : 'Offline';
    });
}

function joinMatchRoom(id) {
    if (socket && isConnected && id != null) {
        socket.emit('joinMatch', id);
        activeMatchRooms.add(id);
    }
}

function leaveMatchRoom(id) {
    if (socket && isConnected && id != null) {
        socket.emit('leaveMatch', id);
        activeMatchRooms.delete(id);
    }
}

// Shared fetch wrapper so every page's "Could not load X" message can show
// the real reason (network unreachable vs. a 4xx/5xx from the API) instead
// of each page hand-rolling its own try/catch with a generic message.
async function fetchJSON(path) {
    try {
        const r = await fetch(`${BASE}${path}`);
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
            consecutiveFetchFailures++;
            return { ok: false, status: r.status, message: j.message || `HTTP ${r.status}`, data: null };
        }
        consecutiveFetchFailures = 0;
        return { ok: true, status: r.status, message: null, data: j.data ?? j };
    } catch {
        consecutiveFetchFailures++;
        return { ok: false, status: 0, message: 'Network error — server unreachable', data: null };
    }
}

function startClock() {
    const el = document.getElementById('topbar-clock');
    if (!el) return;
    const tick = () => {
        el.textContent = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    tick();
    setInterval(tick, 1000);
}

function setActiveNav(page) {
    document.querySelectorAll('.mobile-nav a, .nav a.tab').forEach(a => {
        const href = a.getAttribute('href') || '';
        const name = a.dataset.page || href.replace(/\.html.*/, '').replace(/^\//, '') || 'index';
        a.classList.toggle('active', name === page || (page === 'index' && (name === 'index' || name === 'scores' || href === './' || href === 'index.html')));
    });
}
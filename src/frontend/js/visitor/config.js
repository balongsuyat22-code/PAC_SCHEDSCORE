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

/* ═══════════════════════════════════════════════════════════
   CHAMPION CELEBRATION — shared across every visitor page.
   One implementation, one set of styles, one confetti routine —
   scores.js and standings.js (and any future page) all call
   showChampionCelebration(...) instead of keeping their own copy.
   ═══════════════════════════════════════════════════════════ */
let _ccConfettiRainTimer = null;

function injectChampionStyles() {
    if (document.getElementById('champion-celebration-styles')) return;
    const style = document.createElement('style');
    style.id = 'champion-celebration-styles';
    style.textContent = `
    @keyframes ccFadeIn { from{opacity:0} to{opacity:1} }
    @keyframes ccTrophyDrop {
      0%{transform:translateY(-60px) scale(.4) rotate(-15deg);opacity:0}
      55%{transform:translateY(6px) scale(1.15) rotate(6deg);opacity:1}
      75%{transform:translateY(-3px) scale(.97) rotate(-3deg)}
      100%{transform:translateY(0) scale(1) rotate(0)}
    }
    @keyframes ccTrophyPulse {
      0%,100%{filter:drop-shadow(0 0 10px var(--cc-color)) drop-shadow(0 0 2px var(--cc-color))}
      50%{filter:drop-shadow(0 0 26px var(--cc-color)) drop-shadow(0 0 10px var(--cc-color))}
    }
    @keyframes ccRingPing {
      0%{transform:scale(.5);opacity:.55}
      100%{transform:scale(2.15);opacity:0}
    }
    @keyframes ccSlotUp {
      from{opacity:0;transform:translateY(16px) scale(.92)}
      to{opacity:1;transform:translateY(0) scale(1)}
    }
    @keyframes ccSparkle {
      0%,100%{opacity:0;transform:scale(.4) rotate(0deg)}
      50%{opacity:1;transform:scale(1) rotate(90deg)}
    }
    @keyframes ccFabPulse {
      0%{box-shadow:0 0 0 0 color-mix(in srgb, var(--accent, #f59e0b) 55%, transparent)}
      70%{box-shadow:0 0 0 14px color-mix(in srgb, var(--accent, #f59e0b) 0%, transparent)}
      100%{box-shadow:0 0 0 0 color-mix(in srgb, var(--accent, #f59e0b) 0%, transparent)}
    }
    .champion-overlay{
      position:fixed;inset:0;z-index:1000;
      background:rgba(5,6,7,.9);backdrop-filter:blur(10px);
      display:flex;align-items:center;justify-content:center;
      opacity:0;visibility:hidden;
      transition:opacity .35s ease,visibility .35s ease;
      padding:max(1.25rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right))
              max(1.25rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
      overflow:hidden;
      overscroll-behavior:contain;
      touch-action:none;
    }
    .champion-overlay.open{opacity:1;visibility:visible}
    .champion-modal{
      position:relative;max-width:420px;width:100%;
      text-align:center;
      background:radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--cc-color) 24%, #111417), #0a0c0e 72%);
      border:1px solid color-mix(in srgb, var(--cc-color) 55%, transparent);
      border-radius:28px;
      padding:2.25rem 1.5rem 1.75rem;
      box-shadow:0 30px 80px rgba(0,0,0,.6), 0 0 60px color-mix(in srgb, var(--cc-color) 35%, transparent);
      transform:scale(.85) translateY(20px);
      transition:transform .45s cubic-bezier(.34,1.56,.64,1);
      max-height:min(88vh,660px);
      overflow-x:hidden;
      overflow-y:auto;
      -webkit-overflow-scrolling:touch;
      overscroll-behavior:contain;
      touch-action:pan-y;
      box-sizing:border-box;
      isolation:isolate;
    }
    .champion-overlay.open .champion-modal{transform:scale(1) translateY(0)}
    .cc-close{
      position:absolute;top:10px;right:10px;width:40px;height:40px;border-radius:50%;
      border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;font-size:19px;
      cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:3;
      touch-action:manipulation;
    }
    .cc-close:active{background:rgba(255,255,255,.16)}
    .cc-trophy-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center;margin-bottom:.3rem}
    .cc-ring{
      position:absolute;inset:-14px;border-radius:50%;
      border:2px solid var(--cc-color);
      animation:ccRingPing 1.8s cubic-bezier(0,.6,.4,1) infinite;
      pointer-events:none;
    }
    .cc-ring.d2{animation-delay:.6s}
    .cc-trophy{
      font-size:46px;position:relative;z-index:1;
      animation:ccTrophyDrop .7s cubic-bezier(.34,1.56,.64,1) both,
                ccTrophyPulse 2.2s ease-in-out .7s infinite;
    }
    .cc-spark{position:absolute;font-size:14px;color:var(--cc-color);animation:ccSparkle 1.6s ease-in-out infinite;opacity:0;pointer-events:none}
    .cc-spark.s1{top:-6px;left:6%;animation-delay:.3s}
    .cc-spark.s2{top:10%;right:2%;animation-delay:.9s}
    .cc-spark.s3{bottom:6%;left:0;animation-delay:1.3s}
    .cc-logo{
      width:80px;height:80px;border-radius:50%;object-fit:cover;margin:.5rem auto .85rem;
      border:3px solid var(--cc-color);
      box-shadow:0 0 24px color-mix(in srgb, var(--cc-color) 50%, transparent);
      display:flex;align-items:center;justify-content:center;
      opacity:0;animation:ccFadeIn .5s ease .35s both;
    }
    .cc-logo-initials{font-family:var(--font-head);font-size:26px;font-weight:800;color:#fff}
    .cc-eyebrow{
      font-family:var(--font-mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;
      color:var(--cc-color);margin-bottom:.35rem;
      opacity:0;animation:ccFadeIn .5s ease .45s both;
    }
    .cc-name{
      font-family:var(--font-head);font-size:clamp(24px,7vw,36px);font-weight:900;text-transform:uppercase;
      color:#fff;line-height:1.05;
      text-shadow:0 0 20px color-mix(in srgb, var(--cc-color) 60%, transparent);
      word-break:break-word;padding:0 .5rem;max-width:100%;
      opacity:0;animation:ccFadeIn .5s ease .5s both;
    }
    .cc-sub{
      font-size:13px;color:var(--muted2);margin-top:.5rem;padding:0 .5rem;
      opacity:0;animation:ccFadeIn .5s ease .6s both;
    }
    .cc-podium{
      display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:8px;align-items:end;
      margin:1.25rem 0 .5rem;width:100%;max-width:100%;box-sizing:border-box
    }
    .cc-slot{
      background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);
      border-radius:14px;padding:.7rem .45rem;text-align:center;min-width:0;
      opacity:0;animation:ccSlotUp .5s cubic-bezier(.2,.9,.3,1) both;
    }
    .cc-slot:nth-child(1){animation-delay:.75s}
    .cc-slot:nth-child(2){animation-delay:.68s}
    .cc-slot:nth-child(3){animation-delay:.82s}
    .cc-slot.gold{
      background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.45);
      padding-top:1rem;padding-bottom:.9rem
    }
    .cc-slot.silver{border-color:rgba(148,163,184,.35)}
    .cc-slot.bronze{border-color:rgba(194,98,42,.35)}
    .cc-slot-rank{font-size:16px;margin-bottom:4px}
    .cc-slot-av{
      width:36px;height:36px;border-radius:50%;margin:0 auto 5px;
      display:flex;align-items:center;justify-content:center;
      font-family:var(--font-head);font-size:12px;font-weight:700;color:#fff;overflow:hidden
    }
    .cc-slot.gold .cc-slot-av{width:44px;height:44px;font-size:14px;box-shadow:0 0 0 2px var(--gold,#f5b800)}
    .cc-slot-av img{width:100%;height:100%;object-fit:cover}
    .cc-slot-name{
      font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%
    }
    .cc-slot-pts{font-family:var(--font-mono);font-size:13px;font-weight:700;color:var(--gold,#f5b800);margin-top:3px}
    .cc-slot.gold .cc-slot-pts{font-size:15px}
    .cc-champions{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:8px;margin:1rem 0 .25rem;width:100%}
    .cc-champion-card{border:1px solid color-mix(in srgb,var(--cc-color) 45%,transparent);background:rgba(255,255,255,.05);border-radius:12px;padding:.65rem .45rem;min-width:0}
    .cc-champion-division{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--cc-color);margin-bottom:.35rem}
    .cc-champion-name{font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .champion-fab-pulsing{animation:ccFabPulse 2.4s ease-out infinite}
    @media (max-width:420px){
      .champion-modal{padding:1.75rem 1.1rem 1.4rem;border-radius:22px}
      .cc-trophy{font-size:38px}
      .cc-logo{width:68px;height:68px}
      .cc-podium{gap:6px;margin:1rem 0 .4rem}
      .cc-slot{padding:.55rem .3rem}
      .cc-slot.gold{padding-top:.8rem}
    }
    @media (max-height:640px){
      .champion-modal{padding-top:1.5rem}
      .cc-trophy{font-size:36px;margin-bottom:.15rem}
      .cc-logo{width:56px;height:56px;margin:.3rem auto .5rem}
    }
    @media (prefers-reduced-motion: reduce){
      .cc-trophy,.cc-ring,.cc-spark,.cc-logo,.cc-eyebrow,.cc-name,.cc-sub,.cc-slot,.champion-fab-pulsing{animation:none !important;opacity:1 !important;transform:none !important}
    }`;
    document.head.appendChild(style);
}

function animateCountUp(el, target, duration = 1100) {
    if (!el) return;
    target = Number(target) || 0;
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    function frame(now) {
        const p = Math.min(1, (now - t0) / duration);
        el.textContent = Math.round(target * ease(p)).toLocaleString();
        if (p < 1) requestAnimationFrame(frame);
        else el.textContent = target.toLocaleString();
    }
    requestAnimationFrame(frame);
}

/** Big multi-stage burst + a short gentle "confetti rain" finale. */
function fireChampionConfetti(color) {
    if (typeof confetti !== 'function') return;
    const col = color || '#f59e0b';
    const base = {
        particleCount: 160, spread: 110, startVelocity: 60,
        colors: [col, '#ffffff', '#f59e0b'], zIndex: 2000,
        shapes: ['star', 'circle'],
    };
    confetti({ ...base, angle: 60, origin: { x: 0, y: 0.65 } });
    confetti({ ...base, angle: 120, origin: { x: 1, y: 0.65 } });
    setTimeout(() => confetti({ ...base, particleCount: 100, angle: 90, origin: { x: 0.5, y: 0.3 } }), 350);
    setTimeout(() => confetti({ ...base, particleCount: 80, spread: 140, origin: { x: 0.5, y: 0.5 } }), 700);

    clearInterval(_ccConfettiRainTimer);
    let ticks = 0;
    _ccConfettiRainTimer = setInterval(() => {
        ticks++;
        confetti({
            particleCount: 16, startVelocity: 20, gravity: 0.85, spread: 70,
            colors: [col, '#ffffff', '#f59e0b'], zIndex: 2000,
            origin: { x: Math.random(), y: -0.05 },
            shapes: ['circle', 'square'],
            scalar: 0.8,
        });
        if (ticks >= 12) clearInterval(_ccConfettiRainTimer);
    }, 260);
}

/**
 * Shared full-screen champion celebration modal.
 * opts: { name, color, logoUrl, points, gold, silver, bronze, top3, champions }
 */
function showChampionCelebration(opts = {}) {
    injectChampionStyles();

    const col = opts.color || deptColor(opts.name || '');
    const name = opts.name || 'Champion';
    const pts = Number(opts.points || 0);
    const gold = opts.gold || 0;
    const silver = opts.silver || 0;
    const bronze = opts.bronze || 0;
    const logo = opts.logoUrl;
    const top3 = opts.top3 || [];
    const champions = opts.champions || [];

    const imgHtml = logo
        ? `<img src="${esc(logo)}" class="cc-logo" alt="">`
        : `<div class="cc-logo cc-logo-initials" style="background:${col}">${initials(name)}</div>`;

    const order = [1, 0, 2];
    const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉');
    const rankCls = (i) => (i === 0 ? 'gold' : i === 1 ? 'silver' : 'bronze');
    const podiumHtml = top3.length
        ? `<div class="cc-podium">${order.map((idx) => {
            const p = top3[idx];
            if (!p) return '<div></div>';
            const n = p.department_name || p.name || p.dept_name || '—';
            const c = p.department_color || p.color || p.dept_color || deptColor(n);
            const lo = p.logo_url || p.department_logo || null;
            const points = p.total_points ?? p.points ?? 0;
            return `<div class="cc-slot ${rankCls(idx)}">
          <div class="cc-slot-rank">${medal(idx)}</div>
          <div class="cc-slot-av" style="background:${c}">${lo ? `<img src="${esc(lo)}" alt="">` : initials(n)}</div>
          <div class="cc-slot-name">${esc(n)}</div>
          <div class="cc-slot-pts">${Number(points).toLocaleString()}</div>
        </div>`;
        }).join('')}</div>`
        : '';
    const championsHtml = champions.length > 1
        ? `<div class="cc-champions">${champions.map((champion) => `
                        <div class="cc-champion-card">
                            <div class="cc-champion-division">${esc(String(champion.division || '').replace(/_/g, ' '))} Champion</div>
                            <div class="cc-champion-name">${esc(champion.name || champion.department_name || 'Champion')}</div>
                        </div>`).join('')}</div>`
        : '';

    document.querySelector('.champion-overlay')?.remove();
    clearInterval(_ccConfettiRainTimer);

    const overlay = document.createElement('div');
    overlay.className = 'champion-overlay';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeChampionCelebration(); });
    overlay.innerHTML = `
      <div class="champion-modal" style="--cc-color:${col}">
        <button type="button" class="cc-close" onclick="closeChampionCelebration()" aria-label="Close">×</button>
        <div class="cc-trophy-wrap">
          <span class="cc-ring"></span><span class="cc-ring d2"></span>
          <span class="cc-spark s1">✦</span><span class="cc-spark s2">✧</span><span class="cc-spark s3">✦</span>
          <div class="cc-trophy">🏆</div>
        </div>
        ${imgHtml}
        <div class="cc-eyebrow">Sport Fest Overall Champion</div>
        <div class="cc-name">${esc(name)}</div>
        <div class="cc-sub"><span id="cc-pts-count">0</span> pts · ${gold} Gold · ${silver} Silver · ${bronze} Bronze</div>
        ${championsHtml}
        ${podiumHtml}
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
        overlay.classList.add('open');
        setTimeout(() => fireChampionConfetti(col), 80);
        setTimeout(() => animateCountUp(overlay.querySelector('#cc-pts-count'), pts, 1100), 250);
    });
}

function closeChampionCelebration() {
    const overlay = document.querySelector('.champion-overlay');
    clearInterval(_ccConfettiRainTimer);
    document.body.style.overflow = '';
    if (!overlay) return;
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 300);
}

/** Briefly pulses an element (e.g. the champion FAB) to draw the eye to it. */
function pulseChampionElement(el, ms = 6000) {
    if (!el) return;
    injectChampionStyles();
    el.classList.add('champion-fab-pulsing');
    setTimeout(() => el.classList.remove('champion-fab-pulsing'), ms);
}
const API_BASE = window.location.origin + '/api';

const Auth = {
    getToken: () => localStorage.getItem('sf_token'),
    getUser: () => { try { return JSON.parse(localStorage.getItem('sf_user')); } catch { return null; } },
    logout: () => {
        try { Realtime.disconnect(); } catch (_) { }
        localStorage.removeItem('sf_token');
        localStorage.removeItem('sf_user');
        window.location.href = '/login';
    },

    requireAuth(expectedRoles = null) {
        const user = this.getUser();
        if (!user) { window.location.href = '/login'; return null; }
        if (expectedRoles) {
            const allowed = Array.isArray(expectedRoles) ? expectedRoles : [expectedRoles];
            if (!allowed.includes(user.role)) {
                const home = {
                    admin: '/admin',
                    dean_adviser: '/dean',
                    sgo_president: '/president',
                    sgo_officer: '/referee',
                    visitor: '/login',
                };
                window.location.href = home[user.role] || '/login';
                return null;
            }
        }
        return user;
    }
};

const api = async (path, options = {}) => {
    const token = Auth.getToken();

    const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    let body = options.body;

    if (body instanceof FormData) {
        delete headers['Content-Type'];
    } else {
        headers['Content-Type'] = 'application/json';
        if (body && typeof body === 'object') {
            body = JSON.stringify(body);
        }
    }

    try {
        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers,
            body
        });

        const data = await res.json();
        if (!res.ok) {
            console.error(`API ${res.status}: ${path}`, data);
            if (res.status !== 404) Toast.show(data.message || `Server error (${res.status})`, 'error');
            return { success: false, message: data.message || `HTTP ${res.status}`, data: [] };
        }
        return data;
    } catch (e) {
        const mockKey = path.split('?')[0];
        if (typeof MOCK_DATA !== 'undefined' && MOCK_DATA[mockKey]) return MOCK_DATA[mockKey];
        console.warn('[API] Network error for', path, e.message);
        return { success: false, data: [], message: 'Network error — is the server running?' };
    }
};

const initSidebar = () => {
    const user = Auth.getUser();
    if (!user) return;

    const nameEl = document.getElementById('sb-name');
    const roleEl = document.getElementById('sb-role');
    const avatarEl = document.getElementById('sb-avatar');

    if (nameEl) nameEl.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'User';
    if (roleEl) roleEl.textContent = user.role;
    if (avatarEl) avatarEl.textContent = (user.first_name?.[0] || user.username?.[0] || 'U').toUpperCase();

    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-item').forEach(item => {
        const href = item.getAttribute('href');
        const page = item.dataset.page;
        const isActive = (href && href !== '/' && currentPath.startsWith(href)) ||
            (page && currentPath.includes(page));
        item.classList.toggle('active', isActive);
    });

    document.getElementById('logout-btn')?.addEventListener('click', Auth.logout);
};

const Logos = {
    _map: null,
    load() {
        if (!this._map) {
            try { this._map = JSON.parse(localStorage.getItem('sf_logos') || '{}'); }
            catch { this._map = {}; }
        }
        return this._map;
    },
    save() { localStorage.setItem('sf_logos', JSON.stringify(this._map)); },
    get(id) { return this.load()[id] || null; },
    set(id, url) { this.load()[id] = url; this.save(); },
    remove(id) { delete this.load()[id]; this.save(); },
    render(id, name, color, size = 44) {
        const url = this.get(id);
        const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
        const r = Math.round(size * 0.25);
        const base = `width:${size}px;height:${size}px;border-radius:${r}px;`;
        if (url) {
            return `<img src="${url}" onerror="this.style.display='none';this.nextSibling.style.display='flex'"
                        style="${base}object-fit:cover;display:block">
                    <span style="display:none;${base}background:${color || '#555'};align-items:center;justify-content:center;
                                 font-family:'Barlow Condensed',sans-serif;font-size:${Math.round(size * 0.36)}px;
                                 font-weight:900;color:#fff">${initials}</span>`;
        }
        return `<span style="display:flex;${base}background:${color || '#555'};align-items:center;justify-content:center;
                             font-family:'Barlow Condensed',sans-serif;font-size:${Math.round(size * 0.36)}px;
                             font-weight:900;color:#fff">${initials}</span>`;
    }
};

function filterTable(tableId, query) {
    const rows = document.querySelectorAll(`#${tableId} tbody tr`);
    const q = query.toLowerCase();
    rows.forEach(r => r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none');
}

const Toast = {
    _ensureStyles() {
        if (document.getElementById('sf-toast-style')) return;
        const style = document.createElement('style');
        style.id = 'sf-toast-style';
        style.textContent = `
            #sf-toast {
                position: fixed !important;
                bottom: max(16px, env(safe-area-inset-bottom, 0px) + 16px) !important;
                right: max(16px, env(safe-area-inset-right, 0px) + 16px) !important;
                left: auto !important;
                top: auto !important;
                transform: translateY(12px) !important;
                width: max-content !important;
                max-width: min(320px, calc(100vw - 32px)) !important;
                padding: 12px 16px !important;
                border-radius: 10px !important;
                font-size: 13px !important;
                line-height: 1.35 !important;
                color: #fff !important;
                box-shadow: 0 6px 20px rgba(0,0,0,.35) !important;
                z-index: 99999 !important;
                opacity: 0 !important;
                pointer-events: none !important;
                transition: opacity .2s ease, transform .2s ease !important;
                word-break: break-word !important;
                background: #1f2937 !important;
                font-family: 'Barlow', system-ui, sans-serif !important;
                font-weight: 600 !important;
            }
            #sf-toast.show {
                opacity: 1 !important;
                transform: translateY(0) !important;
                pointer-events: auto !important;
            }
            #sf-toast.success { background: #16a34a !important; }
            #sf-toast.error   { background: #dc2626 !important; }
            #sf-toast.info    { background: #2563eb !important; }
        `;
        document.head.appendChild(style);
    },
    show(msg, type = 'success', duration = 3000) {
        this._ensureStyles();
        let t = document.getElementById('sf-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'sf-toast';
            document.body.appendChild(t);
        }
        const icons = { success: '✓', error: '!', info: 'i' };
        t.innerHTML = `<span style="font-weight:800;margin-right:6px">${icons[type] || '•'}</span>${msg}`;
        t.className = `${type} show`;
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('show'), duration);
    },
    hide() {
        const t = document.getElementById('sf-toast');
        if (!t) return;
        t.classList.remove('show');
        clearTimeout(t._timer);
    }
};
window.Toast = Toast;


const Modal = {
    open(id) { document.getElementById(id)?.classList.add('open'); },
    close(id) { document.getElementById(id)?.classList.remove('open'); },
    closeAll() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open')); },
    _ensureDialog() {
        if (document.getElementById('sf-dialog')) return document.getElementById('sf-dialog');
        const overlay = document.createElement('div');
        overlay.id = 'sf-dialog';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `<div class="modal sf-dialog-modal" role="dialog" aria-modal="true">
            <div class="modal-header"><div class="modal-title" data-dialog-title></div>
                <button class="modal-close" type="button" data-dialog-cancel aria-label="Close">X</button></div>
            <div class="modal-body"><div data-dialog-message></div><input class="form-input" data-dialog-input type="text" hidden></div>
            <div class="modal-footer"><button class="btn btn-secondary" type="button" data-dialog-cancel>Cancel</button>
                <button class="btn btn-primary" type="button" data-dialog-ok>OK</button></div>
        </div>`;
        document.body.appendChild(overlay);
        return overlay;
    },
    _dialog(mode, title, message, defaultValue = '') {
        const overlay = this._ensureDialog();
        const input = overlay.querySelector('[data-dialog-input]');
        const ok = overlay.querySelector('[data-dialog-ok]');
        const cancel = overlay.querySelectorAll('[data-dialog-cancel]');
        overlay.querySelector('[data-dialog-title]').textContent = title;
        overlay.querySelector('[data-dialog-message]').textContent = message;
        input.hidden = mode !== 'prompt';
        input.value = defaultValue;
        ok.textContent = mode === 'confirm' ? 'Confirm' : 'OK';
        cancel.forEach(button => { button.hidden = mode === 'alert'; });
        overlay.classList.add('open');
        if (mode === 'prompt') input.focus(); else ok.focus();
        return new Promise(resolve => {
            const finish = value => {
                overlay.classList.remove('open');
                ok.removeEventListener('click', onOk);
                cancel.forEach(button => button.removeEventListener('click', onCancel));
                overlay.removeEventListener('click', onBackdrop);
                resolve(value);
            };
            const onOk = () => finish(mode === 'prompt' ? input.value : true);
            const onCancel = () => finish(mode === 'prompt' ? null : false);
            const onBackdrop = event => { if (event.target === overlay) onCancel(); };
            ok.addEventListener('click', onOk);
            cancel.forEach(button => button.addEventListener('click', onCancel));
            overlay.addEventListener('click', onBackdrop);
        });
    },
    confirm(message, title = 'Confirm action') { return this._dialog('confirm', title, message); },
    alert(message, title = 'Notification') { return this._dialog('alert', title, message); },
    prompt(message, defaultValue = '', title = 'Enter value') { return this._dialog('prompt', title, message, defaultValue); }
};
window.Modal = Modal;

const statusBadge = (status) => {
    const map = {
        ongoing: ['badge-pulse badge-green', 'Live'],
        scheduled: ['badge-muted', 'Scheduled'],
        completed: ['badge-blue', 'Done'],
        cancelled: ['badge-red', 'Cancelled'],
        postponed: ['badge-orange', 'Postponed'],
        walkover: ['badge-muted', 'Walkover'],
        draft: ['badge-muted', 'Draft'],
        registration: ['badge-blue', 'Registration'],
        pending: ['badge-muted', 'Pending'],
        active: ['badge-green', 'Active'],
        inactive: ['badge-red', 'Inactive'],
        approved: ['badge-green', 'Approved'],
        rejected: ['badge-red', 'Rejected'],
        upcoming: ['badge-muted', 'Upcoming'],
    };
    const [cls, label] = map[status] || ['badge-muted', status || '—'];
    return `<span class="badge ${cls}">${label}</span>`;
};

const medalBadge = (medal) => {
    const map = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze', participation: 'Part.' };
    return map[medal] || '—';
};

const formatRank = (rank) => {
    if (!rank) return '—';
    if (rank === 1) return '1st';
    if (rank === 2) return '2nd';
    if (rank === 3) return '3rd';
    return `${rank}th`;
};

const sportIcon = (name = '') => {
    const n = (name || '').toLowerCase();
    if (n.includes('basket')) return '🏀';
    if (n.includes('volley')) return '🏐';
    if (n.includes('badmin')) return '🏸';
    if (n.includes('chess')) return '♟️';
    if (n.includes('relay') || n.includes('4x') || n.includes('track') || n.includes('sprint')) return '🏃';
    if (n.includes('mobile') || n.includes('legend') || n.includes('valorant') || n.includes('esport')) return '🎮';
    if (n.includes('swim')) return '🏊';
    if (n.includes('tennis')) return '🎾';
    if (n.includes('table')) return '🏓';
    if (n.includes('football') || n.includes('soccer')) return '⚽';
    return '🏅';
};

const formatDate = (d) => d
    ? new Date(d + (String(d).includes('T') ? '' : 'T00:00')).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
const formatTime = (t) => t ? String(t).slice(0, 5) : '—';

const Realtime = {
    socket: null,
    connected: false,
    _feed: [],
    _maxFeed: 40,
    _ioReady: null,
    _availability: null,
    _tournamentRooms: new Set(),

    async _isAvailable() {
        if (!this._availability) {
            this._availability = fetch('/socket-status', { cache: 'no-store' })
                .then(response => {
                    if (!response.ok) throw new Error(`Socket status returned HTTP ${response.status}`);
                    return response.json();
                })
                .then(status => status?.data?.available !== false)
                .catch(error => {
                    console.warn('[Realtime] socket availability check failed', error.message);
                    return true;
                });
        }
        return this._availability;
    },

    _loadIo() {
        if (window.io) return Promise.resolve(window.io);
        if (this._ioReady) return this._ioReady;
        this._ioReady = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
            s.async = true;
            s.onload = () => resolve(window.io);
            s.onerror = () => reject(new Error('socket.io CDN failed'));
            document.head.appendChild(s);
        });
        return this._ioReady;
    },

    async connect() {
        if (this.socket?.connected) return this.socket;
        if (!(await this._isAvailable())) {
            this._setConnDot(false);
            return null;
        }
        try {
            await this._loadIo();
        } catch (e) {
            console.warn('[Realtime] socket.io not available', e.message);
            return null;
        }
        const token = Auth.getToken();
        this.socket = window.io(window.location.origin, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            auth: token ? { token } : {},
            reconnection: true,
            reconnectionAttempts: 20,
            reconnectionDelay: 1500,
        });

        this.socket.on('connect', () => {
            this.connected = true;
            // IMPORTANT: authenticate so server joins user_/role_/dept_ rooms
            if (token) this.socket.emit('authenticate', token);
            this.socket.emit('joinLeaderboard');
            this.socket.emit('join', 'notifications');
            this._tournamentRooms.forEach((tournamentId) => this.socket.emit('joinTournament', tournamentId));
            this._setConnDot(true);
            console.info('[Realtime] connected', this.socket.id);
        });

        this.socket.on('authenticated', (payload) => {
            if (payload?.success) {
                console.info('[Realtime] authenticated', payload.rooms || '');
            } else {
                console.warn('[Realtime] auth failed', payload?.message);
            }
        });

        this.socket.on('disconnect', () => {
            this.connected = false;
            this._setConnDot(false);
        });

        const push = (type, title, body, extra = {}) => {
            const item = {
                id: Date.now() + Math.random(),
                type, title, body,
                at: new Date().toISOString(),
                ...extra,
            };
            this._feed.unshift(item);
            if (this._feed.length > this._maxFeed) this._feed.length = this._maxFeed;
            this._renderNotifBell();
            window.dispatchEvent(new CustomEvent('sf:notif', { detail: item }));
            if (type === 'live' || type === 'done' || type === 'trophy' || type === 'lb' || type === 'announce' || type === 'info') {
                try {
                    Toast.show(
                        title + (body ? ' — ' + body : ''),
                        type === 'done' || type === 'trophy' ? 'success' : 'info',
                        3500
                    );
                } catch (_) { }
            }
        };

        const bus = (name, detail) =>
            window.dispatchEvent(new CustomEvent(name, { detail }));

        // —— Real notifications from server ——
        this.socket.on('notification:new', (row) => {
            if (!row) return;
            const typeMap = {
                score: 'live',
                schedule: 'info',
                announce: 'announce',
                result: 'done',
                reminder: 'info',
                system: 'info',
            };
            push(
                typeMap[row.type] || 'info',
                row.title || 'Notification',
                row.message || '',
                { serverId: row.id, link: row.link, severity: row.severity }
            );
            bus('sf:notif', row);
            if (typeof NotificationEngine !== 'undefined' && NotificationEngine._activeTick) {
                try { NotificationEngine._activeTick(); } catch (_) { }
            }
        });

        this.socket.on('live:matchStarted', (d) => {
            push('live', 'Match live', `${d?.dept_a || d?.team_a || d?.match?.dept_a_name || 'A'} vs ${d?.dept_b || d?.team_b || d?.match?.dept_b_name || 'B'}`);
            bus('sf:live', d);
            bus('sf:match', { action: 'started', ...d });
            this._bumpLiveBadge(+1);
        });
        this.socket.on('match:started', (d) => {
            push('live', 'Match started', d?.match_id ? `Match #${d.match_id}` : 'A match is now live');
            bus('sf:live', d);
            bus('sf:match', { action: 'started', ...d });
            this._bumpLiveBadge(+1);
        });
        this.socket.on('live:tick', (d) => {
            bus('sf:live', d);
            bus('sf:score', d);
        });
        this.socket.on('score:update', (d) => {
            bus('sf:score', d);
            bus('sf:match', { action: 'score', ...d });
        });
        this.socket.on('match:completed', (d) => {
            push('done', 'Match completed', d?.winner ? `Winner: ${d.winner}` : (d?.final_score_display || 'Result locked in'));
            bus('sf:match', { action: 'completed', ...d });
            bus('sf:live', d);
            this._bumpLiveBadge(-1);
        });
        this.socket.on('match:scheduled', (d) => {
            push('info', 'Match scheduled', d?.scheduled_date ? `${d.scheduled_date} ${d.scheduled_time || ''}`.trim() : 'Schedule updated');
            bus('sf:match', { action: 'scheduled', ...d });
        });
        this.socket.on('leaderboard:changed', (d) => {
            push('lb', 'Leaderboard updated', d?.reason ? String(d.reason).replace(/_/g, ' ') : 'Standings changed');
            bus('sf:leaderboard', d || {});
        });
        this.socket.on('bracket:updated', (d) => {
            bus('sf:bracket', d || {});
            bus('sf:match', { action: 'bracket', ...d });
        });
        this.socket.on('ffa:resultsUpdated', (d) => {
            push('info', 'FFA results updated', d?.tournament_id ? `Tournament #${d.tournament_id}` : 'Standings refreshed');
            bus('sf:ffa', d || {});
            bus('sf:leaderboard', d || {});
        });
        this.socket.on('champion:declared', (d) => {
            push('trophy', 'Champion declared', d?.name || d?.department_name || 'Season champion set');
            bus('sf:champion', d || {});
            bus('sf:leaderboard', d || {});
        });

        [
            'match:created', 'match:deleted', 'match:linked', 'match:teamsUpdated',
            'schedule:updated', 'tournament:updated', 'department:updated',
            'sport:updated', 'user:updated', 'venue:updated', 'sportFest:updated',
        ].forEach((event) => this.socket.on(event, (data) => bus('sf:data', { event, data })));

        return this.socket;
    },

    disconnect() {
        try { this.socket?.disconnect(); } catch (_) { }
        this.socket = null;
        this.connected = false;
        this._setConnDot(false);
    },

    joinTournament(tournamentId) {
        const id = parseInt(tournamentId, 10);
        if (!Number.isInteger(id) || id <= 0) return;
        this._tournamentRooms.add(id);
        if (!this.socket) this.connect().catch(() => { });
        if (this.socket?.connected) this.socket.emit('joinTournament', id);
    },

    leaveTournament(tournamentId) {
        const id = parseInt(tournamentId, 10);
        if (!Number.isInteger(id) || id <= 0) return;
        this._tournamentRooms.delete(id);
        if (this.socket?.connected) this.socket.emit('leaveTournament', id);
    },

    on(event, fn) {
        if (!this.socket) this.connect();
        this.socket?.on(event, fn);
    },

    getFeed() { return this._feed.slice(); },
    clearFeed() { this._feed = []; this._renderNotifBell(); },

    _bumpLiveBadge(delta) {
        const badge = document.getElementById('sb-live-count');
        if (!badge) return;
        let n = parseInt(badge.textContent, 10) || 0;
        n = Math.max(0, n + delta);
        badge.textContent = n;
        badge.style.display = n > 0 ? '' : 'none';
    },

    _setConnDot(on) {
        const el = document.getElementById('sf-conn-dot');
        if (el) {
            el.style.background = on ? 'var(--green)' : 'var(--muted)';
            el.title = on ? 'Live connection' : 'Reconnecting…';
        }
    },

    _renderNotifBell() {
        if (typeof NotificationEngine !== 'undefined' && NotificationEngine._activeTick) {
            NotificationEngine._activeTick();
            return;
        }

        const badge = document.getElementById('sf-notif-badge');
        const list = document.getElementById('sf-notif-list');
        if (badge) {
            const n = this._feed.length;
            badge.textContent = n > 9 ? '9+' : String(n);
            badge.style.display = n > 0 ? '' : 'none';
        }
        if (!list) return;
        if (!this._feed.length) {
            list.innerHTML = `<div class="notif-item empty">No notifications yet</div>`;
            return;
        }
        list.innerHTML = this._feed.slice(0, 12).map(i => {
            const time = new Date(i.at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
            return `<div class="notif-item">
                <div class="notif-content">
                    <strong>${i.title}</strong>
                    <div>${i.body || ''}</div>
                    <div style="font-size:11px;color:var(--muted);margin-top:4px">${time}</div>
                </div>
            </div>`;
        }).join('');
    },
};

document.addEventListener('DOMContentLoaded', () => {
    if (Auth.getToken()) Realtime.connect().catch(() => { });
    installPageAutoRefresh();
});

function registerPageRefresh(fn) {
    if (typeof fn === 'function') window.__sfRegisteredRefresh = fn;
}

function installPageAutoRefresh() {
    if (window.__sfPageAutoRefreshInstalled) return;
    window.__sfPageAutoRefreshInstalled = true;

    let timer = null;
    let running = false;
    const getLoader = () => window.__sfRegisteredRefresh || ['reloadDetail', 'refreshAll', 'refresh', 'loadPage', 'loadAll',
        'loadSeasons', 'loadVenues', 'loadTournaments', 'loadNotificationsPage', 'loadMatchHistory', 'initList', 'loadDashboard']
        .map((name) => window[name]).find((fn) => typeof fn === 'function');
    const refresh = async () => {
        if (running || document.hidden) return;
        const activeModal = document.querySelector('.modal-overlay.open');
        const editing = activeModal && activeModal.querySelector('input:focus, textarea:focus, select:focus');
        if (editing) return;
        const loader = getLoader();
        if (!loader) return;
        running = true;
        try { await loader(); } catch (error) { console.warn('[Realtime] page refresh failed', error); }
        running = false;
    };
    const schedule = () => {
        clearTimeout(timer);
        timer = setTimeout(refresh, 350);
    };

    ['sf:live', 'sf:match', 'sf:score', 'sf:leaderboard', 'sf:bracket', 'sf:ffa',
        'sf:champion', 'sf:data'].forEach((event) => window.addEventListener(event, schedule));
    window.setInterval(refresh, 15000);
}

async function loadDashboard() {
    const [dash, champion] = await Promise.all([
        api('/reports/dashboard'),
        api('/leaderboard/overall-champion')
    ]);

    if (dash.success) {
        const t = dash.data.totals;
        document.getElementById('s-tournaments').textContent = t.total_tournaments;
        document.getElementById('s-completed').textContent = t.completed_tournaments;
        document.getElementById('s-live').textContent = t.live_matches;
        document.getElementById('s-matches').textContent = t.total_matches;
        document.getElementById('s-players').textContent = t.total_players;
        document.getElementById('s-today').textContent = t.todays_matches;
        const liveCount = document.getElementById('live-count');
        if (liveCount) liveCount.textContent = t.live_matches;

        const upEl = document.getElementById('upcoming-matches');
        if (upEl) {
            if (dash.data.upcomingMatches.length) {
                upEl.innerHTML = dash.data.upcomingMatches.map(m => `
                    <div class="match-card">
                        <div class="match-sport-icon">${sportIcon(m.sport_name)}</div>
                        <div class="match-info">
                            <div class="match-teams">${m.dept_a} <span style="color:var(--muted)">vs</span> ${m.dept_b}</div>
                            <div class="match-meta">${m.tournament_name} · ${m.venue_name || 'TBD'}</div>
                        </div>
                        <div style="text-align:right">
                            <div style="font-weight:600;font-size:13px">${formatDate(m.scheduled_date)}</div>
                            <div style="color:var(--gold);font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700">${formatTime(m.scheduled_time)}</div>
                        </div>
                    </div>`).join('');
            } else {
                upEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-text">No upcoming matches</div></div>`;
            }
        }

        const rr = dash.data.recentResults;
        const rrEl = document.getElementById('recent-results');
        if (rrEl) {
            rrEl.innerHTML = rr.length
                ? rr.map(r => `<tr>
                    <td>${sportIcon(r.sport_name)} ${r.sport_name}</td>
                    <td><span style="color:#fff">${r.dept_a}</span> <span style="color:var(--muted)">vs</span> <span style="color:#fff">${r.dept_b}</span></td>
                    <td><code style="color:var(--gold)">${r.final_score_display || '—'}</code></td>
                    <td style="font-weight:600;color:var(--green)">${r.winner}</td>
                    <td style="color:var(--muted)">${formatDate(r.completed_at)}</td>
                </tr>`).join('')
                : `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px">No results yet</td></tr>`;
        }
    }

    if (champion.success) {
        const c = champion.data;
        const leader = c.champion || c.current_leader;
        const area = document.getElementById('champion-area');
        if (area && leader) {
            area.innerHTML = `
                <div class="champion-banner">
                    <div class="champion-trophy">${c.is_final ? '🏆' : '📊'}</div>
                    <div class="champion-info">
                        <div class="champion-label">${c.is_final ? '🎉 SPORT FEST CHAMPION' : '📈 CURRENT LEADER'}</div>
                        <div class="champion-name">${leader.name}</div>
                        <div class="champion-sub">${c.message}</div>
                    </div>
                    <div style="text-align:right">
                        <div class="champion-pts">${leader.total_points}</div>
                        <div class="champion-pts-lbl">POINTS</div>
                        <div style="font-size:12px;color:var(--muted);margin-top:4px">🥇${leader.gold_medals || 0} 🥈${leader.silver_medals || 0} 🥉${leader.bronze_medals || 0}</div>
                    </div>
                </div>`;
        }
    }

    await loadMiniLeaderboard();
}

async function loadMiniLeaderboard() {
    const res = await api('/leaderboard');
    if (!res.success) return;
    const el = document.getElementById('mini-leaderboard');
    if (!el) return;
    el.innerHTML = res.data.map((d, i) => `
        <div class="lb-row">
            <div class="lb-rank ${i < 3 ? `rank-${i + 1}` : ''}">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</div>
            <div class="lb-color" style="background:${d.color}"></div>
            <div class="lb-dept">
                <div class="lb-dept-name">${d.name}</div>
                <div class="lb-dept-medals">🥇${d.gold_medals} 🥈${d.silver_medals} 🥉${d.bronze_medals}</div>
            </div>
            <div><div class="lb-pts">${d.total_points}</div><div class="lb-pts-lbl">pts</div></div>
        </div>`).join('');
}

async function loadLiveMatches() {
    const res = await api('/matches/live');
    const el = document.getElementById('live-matches-list');
    if (!el) return;
    if (!res.success || !res.data.length) {
        el.innerHTML = `<div class="empty-state"><div class="empty-icon">😴</div><div class="empty-text">No live matches right now</div></div>`;
        return;
    }
    el.innerHTML = res.data.map(m => `
        <div class="live-card">
            <div style="font-size:36px">${sportIcon(m.sport_name)}</div>
            <div style="flex:1">
                <div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--green);margin-bottom:6px">
                    <span class="live-dot"></span>LIVE · ${m.sport_name} · ${m.tournament_name}
                </div>
                <div style="display:flex;align-items:center;gap:16px">
                    <div style="text-align:center">
                        <div style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:800">${m.team_a || m.dept_a}</div>
                        <div style="font-size:11px;color:var(--muted)">${m.dept_a}</div>
                    </div>
                        <div style="font-family:'Barlow Condensed',sans-serif;font-size:48px;font-weight:900;color:var(--gold);text-align:center;min-width:100px">${m.scoring_type === 'sets' ? `${m.live_sets_a || 0} - ${m.live_sets_b || 0}` : `${m.live_score_a || 0} - ${m.live_score_b || 0}`}</div>
                    <div style="text-align:center">
                        <div style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:800">${m.team_b || m.dept_b}</div>
                        <div style="font-size:11px;color:var(--muted)">${m.dept_b}</div>
                    </div>
                </div>
                <div style="font-size:12px;color:var(--muted);margin-top:8px">📍 ${m.venue_name || '—'}</div>
            </div>
        </div>`).join('');
}

async function loadLeaderboard() {
    const res = await api('/leaderboard');
    if (!res.success) return;

    const fullEl = document.getElementById('full-leaderboard');
    if (fullEl) {
        fullEl.innerHTML = res.data.map((d, i) => `
            <div class="lb-row">
                <div class="lb-rank ${i < 3 ? `rank-${i + 1}` : ''}">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</div>
                <div class="lb-color" style="background:${d.color}"></div>
                <div class="lb-dept">
                    <div class="lb-dept-name">${d.name}</div>
                    <div class="lb-dept-medals">🥇${d.gold_medals} 🥈${d.silver_medals} 🥉${d.bronze_medals} · ${d.total_participations || 0} events</div>
                    <div class="progress-bar" style="margin-top:6px;width:100%">
                        <div class="progress-fill" style="width:${Math.min((d.total_points / 100) * 100, 100)}%;background:${d.color}"></div>
                    </div>
                </div>
                <div><div class="lb-pts">${d.total_points}</div><div class="lb-pts-lbl">pts</div></div>
            </div>`).join('');
    }

    const medalEl = document.getElementById('medal-tally');
    if (medalEl) {
        medalEl.innerHTML = `
            <table><thead><tr><th>Dept</th><th>🥇</th><th>🥈</th><th>🥉</th><th>Total</th></tr></thead>
            <tbody>${res.data.map(d => `<tr>
                <td><span style="background:${d.color};display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px"></span>${d.code}</td>
                <td style="color:#FFD700;font-weight:700">${d.gold_medals}</td>
                <td style="color:#C0C0C0;font-weight:700">${d.silver_medals}</td>
                <td style="color:#CD7F32;font-weight:700">${d.bronze_medals}</td>
                <td style="font-weight:700">${(d.gold_medals || 0) + (d.silver_medals || 0) + (d.bronze_medals || 0)}</td>
            </tr>`).join('')}</tbody></table>`;
    }

    const champion = await api('/leaderboard/overall-champion');
    if (champion.success) {
        const s = champion.data.tournament_stats;
        const epEl = document.getElementById('event-progress');
        if (epEl) {
            epEl.innerHTML = `
                <div style="margin-bottom:16px">
                    <div class="progress-label"><span>Events Completed</span><span style="color:var(--gold)">${s.completed_tournaments}/${s.total_tournaments}</span></div>
                    <div class="progress-bar"><div class="progress-fill" style="width:${(s.completed_tournaments / Math.max(s.total_tournaments, 1) * 100)}%"></div></div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center">
                    <div style="background:var(--bg3);border-radius:8px;padding:12px">
                        <div style="font-family:'Barlow Condensed',sans-serif;font-size:24px;font-weight:900;color:var(--green)">${s.completed_tournaments}</div>
                        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Done</div>
                    </div>
                    <div style="background:var(--bg3);border-radius:8px;padding:12px">
                        <div style="font-family:'Barlow Condensed',sans-serif;font-size:24px;font-weight:900;color:var(--red)">${s.ongoing_tournaments}</div>
                        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Live</div>
                    </div>
                    <div style="background:var(--bg3);border-radius:8px;padding:12px">
                        <div style="font-family:'Barlow Condensed',sans-serif;font-size:24px;font-weight:900;color:var(--muted)">${s.upcoming_tournaments}</div>
                        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Coming</div>
                    </div>
                </div>`;
        }
    }
}

async function loadTournaments() {
    const res = await api('/tournaments');
    if (!res.success) return;
    const sports = await api('/sports');
    const sportOpts = sports.data?.map(s => `<option value="${s.id}">${s.name}</option>`).join('') || '';
    const tnSport = document.getElementById('tn-sport');
    if (tnSport) tnSport.innerHTML = '<option value="">Select sport...</option>' + sportOpts;

    const tbody = document.getElementById('tournaments-body');
    if (!tbody) return;
    tbody.innerHTML = res.data.map(t => `
        <tr>
            <td><strong>${t.name}</strong></td>
            <td>${sportIcon(t.sport_name)} ${t.sport_name}</td>
            <td><span class="badge badge-muted">${t.format?.replace(/_/g, ' ').toUpperCase()}</span></td>
            <td>${statusBadge(t.status)}</td>
            <td style="color:var(--muted)">${t.participant_count || 0}</td>
            <td style="color:var(--muted);font-size:12px">${formatDate(t.start_date)}</td>
            <td>
                <a class="btn btn-secondary btn-sm" href="/admin/tournaments?id=${t.id}">View</a>
                ${t.status === 'registration' || t.status === 'draft'
            ? `<button class="btn btn-primary btn-sm" onclick="generateBracket(${t.id})">⚡ Bracket</button>`
            : ''}
                ${t.status === 'ongoing'
            ? `<button class="btn btn-danger btn-sm" onclick="window.location.href='/admin/tournaments?id=${t.id}'">🏅 Finalize</button>`
            : ''}
            </td>
        </tr>`).join('')
        || '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">No tournaments yet</td></tr>';
}

async function generateBracket(id) {
    const res = await api(`/tournaments/${id}/generate-bracket`, { method: 'POST' });
    Toast.show(res.message || 'Bracket generated!', res.success ? 'success' : 'error');
    if (res.success) loadTournaments();
}

async function loadMatches() {
    const res = await api('/matches');
    if (!res.success) return;
    const tbody = document.getElementById('matches-body');
    if (!tbody) return;
    tbody.innerHTML = res.data.map(m => `
        <tr>
            <td>${sportIcon(m.sport_name)} ${m.sport_name}</td>
            <td style="color:var(--muted);font-size:12px">${m.tournament_name}</td>
            <td><strong>${m.dept_a_name || '—'}</strong> <span style="color:var(--muted)">vs</span> <strong>${m.dept_b_name || '—'}</strong></td>
            <td style="font-size:12px;color:var(--muted)">${formatDate(m.scheduled_date)} ${formatTime(m.scheduled_time)}</td>
            <td style="font-size:12px;color:var(--muted)">${m.venue_name || '—'}</td>
            <td style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;color:var(--gold)">${m.total_score_a != null ? `${m.total_score_a}–${m.total_score_b}` : '—'}</td>
                <td style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;color:var(--gold)">${m.scoring_type === 'sets' && m.sets_won_a != null ? `${m.sets_won_a}–${m.sets_won_b}` : m.total_score_a != null ? `${m.total_score_a}–${m.total_score_b}` : '—'}</td>
            <td>${statusBadge(m.status)}</td>
            <td><a class="btn btn-secondary btn-sm" href="/admin/matches">Details</a></td>
        </tr>`).join('')
        || '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">No matches</td></tr>';
}

async function loadDepartments() {
    const res = await api('/departments');
    if (!res.success) return;
    const grid = document.getElementById('departments-grid');
    if (!grid) return;
    grid.innerHTML = res.data.map(d => `
        <div class="card" style="position:relative;overflow:hidden">
            <div style="height:5px;background:${d.color}"></div>
            <div class="card-body">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
                    <div style="width:44px;height:44px;border-radius:10px;background:${d.color}20;border:1px solid ${d.color}40;
                                display:flex;align-items:center;justify-content:center;
                                font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:800;color:${d.color}">${d.code}</div>
                    <div>
                        <div style="font-weight:600;font-size:15px">${d.name}</div>
                        <div style="font-size:12px;color:var(--muted)">${d.total_members || 0} members</div>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
                    <div style="background:var(--bg3);border-radius:7px;padding:8px;text-align:center">
                        <div style="font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;color:var(--gold)">${d.total_points || 0}</div>
                        <div style="font-size:10px;color:var(--muted)">PTS</div>
                    </div>
                    <div style="background:var(--bg3);border-radius:7px;padding:8px;text-align:center">
                        <div style="font-size:16px">🥇${d.gold_medals || 0}</div>
                        <div style="font-size:10px;color:var(--muted)">GOLD</div>
                    </div>
                    <div style="background:var(--bg3);border-radius:7px;padding:8px;text-align:center">
                        <div style="font-size:16px">🥈${d.silver_medals || 0}</div>
                        <div style="font-size:10px;color:var(--muted)">SILVER</div>
                    </div>
                </div>
                <button class="btn btn-secondary btn-sm" style="width:100%" onclick="Toast.show('${d.name} — ${d.total_points || 0} pts','info')">View Details</button>
            </div>
        </div>`).join('');
}

async function loadSports() {
    const res = await api('/sports');
    if (!res.success) return;
    const tbody = document.getElementById('sports-body');
    if (!tbody) return;
    tbody.innerHTML = res.data.map(s => `
        <tr>
            <td style="font-size:24px">${sportIcon(s.name)}</td>
            <td><strong>${s.name}</strong></td>
            <td><span class="badge badge-muted">${s.code}</span></td>
            <td><span class="badge ${s.category === 'team' ? 'badge-blue' : 'badge-orange'}">${s.category}</span></td>
            <td style="color:var(--muted)">${s.min_players}–${s.max_players}</td>
            <td style="color:var(--muted);text-transform:capitalize">${s.scoring_type || '—'}</td>
            <td style="color:var(--muted)">${s.total_tournaments || 0}</td>
        </tr>`).join('');
}

async function loadTeams() {
    const [teams, depts, sports] = await Promise.all([api('/teams'), api('/departments'), api('/sports')]);
    if (!teams.success) return;

    const deptOpts = depts.data?.map(d => `<option value="${d.id}">${d.name}</option>`).join('') || '';
    const sportOpts = sports.data?.map(s => `<option value="${s.id}">${s.name}</option>`).join('') || '';
    const tmDept = document.getElementById('tm-dept');
    const tmSport = document.getElementById('tm-sport');
    if (tmDept) tmDept.innerHTML = '<option value="">Select...</option>' + deptOpts;
    if (tmSport) tmSport.innerHTML = '<option value="">Select...</option>' + sportOpts;

    const tbody = document.getElementById('teams-body');
    if (!tbody) return;
    tbody.innerHTML = teams.data.map(t => `
        <tr>
            <td><strong>${t.name}</strong></td>
            <td style="color:var(--muted)">${t.department_name}</td>
            <td>${t.sport_name ? `${sportIcon(t.sport_name)} ${t.sport_name}` : '—'}</td>
            <td style="color:var(--muted)">${t.member_count || 0} players</td>
            <td><span class="badge ${t.status === 'active' ? 'badge-green' : t.status === 'eliminated' ? 'badge-red' : 'badge-muted'}">${t.status}</span></td>
        </tr>`).join('')
        || '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px">No teams</td></tr>';
}

async function loadVenues() {
    const res = await api('/venues');
    if (!res.success) return;
    const grid = document.getElementById('venues-grid');
    if (!grid) return;
    grid.innerHTML = res.data.map(v => `
        <div class="card">
            <div class="card-body">
                <div style="font-size:32px;margin-bottom:10px">🏟️</div>
                <div style="font-size:16px;font-weight:700;margin-bottom:4px">${v.name}</div>
                <div style="font-size:13px;color:var(--muted);margin-bottom:12px">📍 ${v.location || '—'}</div>
                <div style="display:flex;gap:10px;margin-bottom:14px">
                    <div style="flex:1;background:var(--bg3);border-radius:7px;padding:8px;text-align:center">
                        <div style="font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800">${v.capacity || 0}</div>
                        <div style="font-size:10px;color:var(--muted)">CAPACITY</div>
                    </div>
                    <div style="flex:1;background:var(--bg3);border-radius:7px;padding:8px;text-align:center">
                        <div style="font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;color:${v.scheduled_matches ? 'var(--red)' : 'var(--green)'}">${v.scheduled_matches || 0}</div>
                        <div style="font-size:10px;color:var(--muted)">ACTIVE</div>
                    </div>
                </div>
                <button class="btn btn-secondary btn-sm" style="width:100%" onclick="Toast.show('${v.name} — capacity ${v.capacity}','info')">View Schedule</button>
            </div>
        </div>`).join('');
}

async function loadUsers() {
    const res = await api('/users');
    if (!res.success) return;
    const tbody = document.getElementById('users-body');
    if (!tbody) return;
    const roleBadge = r => ({ admin: 'badge-gold', referee: 'badge-red', player: 'badge-green' }[r] || 'badge-muted');
    tbody.innerHTML = res.data.map(u => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:30px;height:30px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--gold)">${(u.first_name?.[0] || '?').toUpperCase()}</div>
                    <div><div style="font-weight:600">${u.first_name} ${u.last_name}</div></div>
                </div>
            </td>
            <td style="font-size:13px;color:var(--muted)">${u.email}</td>
            <td><span class="badge ${roleBadge(u.role)}">${u.role.toUpperCase()}</span></td>
            <td style="color:var(--muted);font-size:13px">${u.department_name || '—'}</td>
            <td><span class="badge ${u.is_active ? 'badge-green' : 'badge-red'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
            <td><button class="btn btn-secondary btn-sm" onclick="Toast.show('Edit user — use /admin/users page','info')">Edit</button></td>
        </tr>`).join('')
        || '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">No users</td></tr>';
}

async function loadSchedule() {
    const res = await api('/schedules/today');
    const el = document.getElementById('today-schedule');
    if (!el) return;
    if (!res.success || !res.data.length) {
        el.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-text">No matches scheduled today</div></div>`;
        return;
    }
    el.innerHTML = res.data.map(m => `
        <div class="match-card">
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:900;color:var(--gold);min-width:60px">${formatTime(m.scheduled_time)}</div>
            <div class="match-sport-icon">${sportIcon(m.sport_name)}</div>
            <div class="match-info">
                <div class="match-teams">${m.team_a} <span style="color:var(--muted)">vs</span> ${m.team_b}</div>
                <div class="match-meta">${m.tournament_name} · 📍 ${m.venue_name || 'TBD'} · 🟡 ${m.referee_name || 'TBD'}</div>
            </div>
            <div class="match-status">${statusBadge(m.status)}</div>
        </div>`).join('');
}

async function createTournament() {
    const name = document.getElementById('tn-name')?.value?.trim();
    const sport_id = parseInt(document.getElementById('tn-sport')?.value) || null;
    const format = document.getElementById('tn-format')?.value?.trim();
    const gender = document.getElementById('tn-gender')?.value || 'open';

    if (!name) { Toast.show('Tournament name is required', 'error'); return; }
    if (!sport_id) { Toast.show('Please select a sport', 'error'); return; }
    if (!format) { Toast.show('Please select a format', 'error'); return; }

    const validFormats = [
        'round_robin', 'single_elimination', 'double_elimination',
        'free_for_all', 'team_ranking',
        'group_stage_se', 'group_stage_de', 'group_stage_ffa'
    ];
    if (!validFormats.includes(format)) {
        Toast.show(`Invalid format: "${format}"`, 'error');
        return;
    }

    const isGroupStage = format.startsWith('group_stage_');
    const isFFA = ['free_for_all', 'team_ranking'].includes(format);

    const body = {
        name,
        sport_id,
        format,
        gender,
        max_participants: parseInt(document.getElementById('tn-max')?.value) || 0,
        start_date: document.getElementById('tn-start')?.value || null,
        end_date: document.getElementById('tn-end')?.value || null,
        description: document.getElementById('tn-desc')?.value || null,
        ffa_scoring: isFFA ? (document.getElementById('tn-ffa-scoring')?.value || 'points') : null,
        group_count: isGroupStage ? (parseInt(document.getElementById('tn-groups')?.value) || 2) : null,
        advance_per_group: isGroupStage ? (parseInt(document.getElementById('tn-advance')?.value) || 2) : null,
    };

    const res = await api('/tournaments', { method: 'POST', body: JSON.stringify(body) });
    Toast.show(res.message || (res.success ? 'Tournament created!' : 'Error'), res.success ? 'success' : 'error');

    if (res.success) {
        const tournamentId = res.data?.id;
        if (tournamentId && body.start_date && typeof createSlots !== 'undefined' && createSlots.length) {
            localStorage.setItem(
                `sf_slots_${tournamentId}`,
                JSON.stringify({ [body.start_date]: [...createSlots] })
            );
            if (typeof createSlots !== 'undefined') createSlots = [];
        }
        Modal.closeAll();
        if (typeof initList === 'function') initList();
        else if (typeof loadTournaments === 'function') loadTournaments();
    }
}

async function createDepartment() {
    const body = {
        name: document.getElementById('dept-name').value,
        code: document.getElementById('dept-code').value,
        color: document.getElementById('dept-color').value,
        description: document.getElementById('dept-desc').value,
    };
    if (!body.name || !body.code) { Toast.show('Name and code required', 'error'); return; }
    const res = await api('/departments', { method: 'POST', body: JSON.stringify(body) });
    Toast.show(res.message || (res.success ? 'Department created!' : 'Error'), res.success ? 'success' : 'error');
    if (res.success) { Modal.closeAll(); loadDepartments(); }
}

async function createSport() {
    const body = {
        name: document.getElementById('sp-name').value,
        code: document.getElementById('sp-code').value,
        category: document.getElementById('sp-cat').value,
        scoring_type: document.getElementById('sp-scoring').value,
        min_players: parseInt(document.getElementById('sp-min').value) || 1,
        max_players: parseInt(document.getElementById('sp-max').value) || 1,
    };
    if (!body.name || !body.code) { Toast.show('Name and code required', 'error'); return; }
    const res = await api('/sports', { method: 'POST', body: JSON.stringify(body) });
    Toast.show(res.message || (res.success ? 'Sport created!' : 'Error'), res.success ? 'success' : 'error');
    if (res.success) { Modal.closeAll(); loadSports(); }
}

async function createUser() {
    const body = {
        first_name: document.getElementById('u-first').value,
        last_name: document.getElementById('u-last').value,
        username: document.getElementById('u-username').value,
        email: document.getElementById('u-email').value,
        password: document.getElementById('u-pass').value,
        role: document.getElementById('u-role').value,
    };
    if (!body.email || !body.password || !body.username) { Toast.show('Email, username and password required', 'error'); return; }
    const res = await api('/users', { method: 'POST', body: JSON.stringify(body) });
    Toast.show(res.message || (res.success ? 'User created!' : 'Error'), res.success ? 'success' : 'error');
    if (res.success) { Modal.closeAll(); loadUsers(); }
}

async function createVenue() {
    const body = {
        name: document.getElementById('v-name').value,
        location: document.getElementById('v-loc').value,
        capacity: parseInt(document.getElementById('v-cap').value) || 0,
        description: document.getElementById('v-desc').value,
    };
    if (!body.name) { Toast.show('Venue name required', 'error'); return; }
    const res = await api('/venues', { method: 'POST', body: JSON.stringify(body) });
    Toast.show(res.message || (res.success ? 'Venue created!' : 'Error'), res.success ? 'success' : 'error');
    if (res.success) { Modal.closeAll(); loadVenues(); }
}

async function createTeam() {
    const body = {
        name: document.getElementById('tm-name')?.value?.trim(),
        department_id: parseInt(document.getElementById('tm-dept')?.value, 10) || null,
        sport_id: parseInt(document.getElementById('tm-sport')?.value, 10) || null,
        gender: document.getElementById('tm-gender')?.value || 'Men',
    };
    if (!body.name || !body.department_id || !body.sport_id) {
        Toast.show('Team name, department and sport are required', 'error');
        return;
    }
    if (!body.gender) {
        Toast.show('Gender is required', 'error');
        return;
    }
    const res = await api('/teams', { method: 'POST', body: JSON.stringify(body) });
    Toast.show(res.message || (res.success ? 'Team created!' : 'Error'), res.success ? 'success' : 'error');
    if (res.success) {
        Modal.closeAll();
        if (typeof loadTeams === 'function') loadTeams();
    }
}

const MOCK_DATA = {
    '/leaderboard': {
        success: true,
        data: [
            { id: 1, name: 'IT Department', code: 'IT', color: '#3B82F6', total_points: 85, gold_medals: 4, silver_medals: 2, bronze_medals: 1, total_participations: 8, rank: 1 },
            { id: 2, name: 'Engineering', code: 'ENGR', color: '#10B981', total_points: 78, gold_medals: 3, silver_medals: 3, bronze_medals: 2, total_participations: 8, rank: 2 },
            { id: 3, name: 'Business Admin', code: 'BA', color: '#F59E0B', total_points: 64, gold_medals: 2, silver_medals: 2, bronze_medals: 3, total_participations: 7, rank: 3 },
            { id: 4, name: 'Education', code: 'EDUC', color: '#EF4444', total_points: 55, gold_medals: 1, silver_medals: 3, bronze_medals: 2, total_participations: 7, rank: 4 },
            { id: 5, name: 'Arts & Sciences', code: 'AS', color: '#8B5CF6', total_points: 48, gold_medals: 1, silver_medals: 1, bronze_medals: 3, total_participations: 6, rank: 5 },
            { id: 6, name: 'Nursing', code: 'NRS', color: '#EC4899', total_points: 42, gold_medals: 1, silver_medals: 1, bronze_medals: 1, total_participations: 6, rank: 6 },
        ]
    },
    '/leaderboard/overall-champion': {
        success: true,
        data: {
            is_final: false,
            message: '📊 Current standings (8/11 events completed)',
            current_leader: { name: 'IT Department', total_points: 85, gold_medals: 4, silver_medals: 2, bronze_medals: 1 },
            tournament_stats: { total_tournaments: 11, completed_tournaments: 8, ongoing_tournaments: 2, upcoming_tournaments: 1 },
            leaderboard: []
        }
    },
    '/leaderboard/by-sport': { success: true, data: [] },
    '/reports/dashboard': {
        success: true,
        data: {
            totals: { total_departments: 6, total_sports: 11, total_tournaments: 11, ongoing_tournaments: 2, completed_tournaments: 8, total_matches: 86, live_matches: 2, completed_matches: 74, todays_matches: 5, total_players: 120, total_referees: 8, total_teams: 42 },
            upcomingMatches: [
                { id: 1, scheduled_date: '2025-10-15', scheduled_time: '09:00', sport_name: 'Basketball', tournament_name: 'Basketball Championship', dept_a: 'IT Dept', dept_b: 'Engineering', venue_name: 'Main Gymnasium' },
                { id: 2, scheduled_date: '2025-10-15', scheduled_time: '11:00', sport_name: 'Volleyball', tournament_name: 'Volleyball Cup', dept_a: 'Business', dept_b: 'Education', venue_name: 'Covered Court 1' },
                { id: 3, scheduled_date: '2025-10-15', scheduled_time: '14:00', sport_name: 'Chess', tournament_name: 'Chess Masters', dept_a: 'IT Dept', dept_b: 'Arts & Sci', venue_name: 'Conference Hall' },
            ],
            recentResults: [
                { id: 10, sport_name: 'Badminton', dept_a: 'IT Dept', dept_b: 'Nursing', winner: 'IT Department', final_score_display: '2-0', completed_at: '2025-10-14' },
                { id: 11, sport_name: 'Track 100m', dept_a: 'Engineering', dept_b: 'Education', winner: 'Engineering', final_score_display: '11.2s', completed_at: '2025-10-14' },
            ],
            leaderboard: []
        }
    },
    '/matches': {
        success: true,
        data: [
            { id: 1, sport_name: 'Basketball', tournament_name: 'Basketball Championship', dept_a_name: 'IT Dept', dept_b_name: 'Engineering', status: 'ongoing', scheduled_date: '2025-10-15', scheduled_time: '09:00', venue_name: 'Main Gym', total_score_a: 54, total_score_b: 48 },
            { id: 2, sport_name: 'Volleyball', tournament_name: 'Volleyball Cup', dept_a_name: 'Business', dept_b_name: 'Education', status: 'scheduled', scheduled_date: '2025-10-15', scheduled_time: '11:00', venue_name: 'Court 1', total_score_a: null, total_score_b: null },
            { id: 3, sport_name: 'Badminton Singles', tournament_name: 'Badminton Open', dept_a_name: 'IT Dept', dept_b_name: 'Nursing', status: 'completed', scheduled_date: '2025-10-14', scheduled_time: '14:00', venue_name: 'Court 2', total_score_a: 21, total_score_b: 15 },
        ]
    },
    '/matches/live': {
        success: true,
        data: [
            { id: 1, sport_name: 'Basketball', tournament_name: 'Basketball Championship', team_a: 'IT Eagles', dept_a: 'IT Dept', dept_a_color: '#3B82F6', team_b: 'ENGR Titans', dept_b: 'Engineering', dept_b_color: '#10B981', venue_name: 'Main Gymnasium', live_score_a: 54, live_score_b: 48 },
        ]
    },
    '/sports': {
        success: true, data: [
            { id: 1, name: 'Basketball', code: 'BBL', category: 'team', min_players: 5, max_players: 15, scoring_type: 'points', total_tournaments: 1 },
            { id: 2, name: 'Volleyball', code: 'VBL', category: 'team', min_players: 6, max_players: 12, scoring_type: 'sets', total_tournaments: 1 },
            { id: 3, name: 'Badminton Singles', code: 'BDS', category: 'individual', min_players: 1, max_players: 1, scoring_type: 'sets', total_tournaments: 1 },
            { id: 4, name: 'Chess', code: 'CHS', category: 'individual', min_players: 1, max_players: 1, scoring_type: 'custom', total_tournaments: 1 },
            { id: 5, name: 'Mobile Legends', code: 'ML', category: 'team', min_players: 5, max_players: 7, scoring_type: 'custom', total_tournaments: 1 },
        ]
    },
    '/departments': {
        success: true, data: [
            { id: 1, name: 'IT Department', code: 'IT', color: '#3B82F6', total_members: 24, total_points: 85, gold_medals: 4, silver_medals: 2, bronze_medals: 1 },
            { id: 2, name: 'Engineering', code: 'ENGR', color: '#10B981', total_members: 20, total_points: 78, gold_medals: 3, silver_medals: 3, bronze_medals: 2 },
            { id: 3, name: 'Business Admin', code: 'BA', color: '#F59E0B', total_members: 22, total_points: 64, gold_medals: 2, silver_medals: 2, bronze_medals: 3 },
            { id: 4, name: 'Education', code: 'EDUC', color: '#EF4444', total_members: 18, total_points: 55, gold_medals: 1, silver_medals: 3, bronze_medals: 2 },
            { id: 5, name: 'Arts & Sciences', code: 'AS', color: '#8B5CF6', total_members: 15, total_points: 48, gold_medals: 1, silver_medals: 1, bronze_medals: 3 },
            { id: 6, name: 'Nursing', code: 'NRS', color: '#EC4899', total_members: 21, total_points: 42, gold_medals: 1, silver_medals: 1, bronze_medals: 1 },
        ]
    },
    '/tournaments': {
        success: true, data: [
            { id: 1, name: 'Basketball Championship', sport_name: 'Basketball', format: 'single_elimination', status: 'ongoing', participant_count: 6, start_date: '2025-10-10' },
            { id: 2, name: 'Volleyball Cup', sport_name: 'Volleyball', format: 'round_robin', status: 'ongoing', participant_count: 6, start_date: '2025-10-10' },
            { id: 3, name: 'Badminton Open', sport_name: 'Badminton Singles', format: 'single_elimination', status: 'completed', participant_count: 8, start_date: '2025-10-08' },
            { id: 4, name: 'Chess Masters', sport_name: 'Chess', format: 'round_robin', status: 'registration', participant_count: 4, start_date: '2025-10-16' },
            { id: 5, name: 'Mobile Legends Cup', sport_name: 'Mobile Legends', format: 'single_elimination', status: 'draft', participant_count: 0, start_date: '2025-10-18' },
        ]
    },
    '/teams': {
        success: true, data: [
            { id: 1, name: 'IT Eagles', department_name: 'IT Dept', sport_name: 'Basketball', status: 'active', member_count: 10 },
            { id: 2, name: 'ENGR Titans', department_name: 'Engineering', sport_name: 'Basketball', status: 'active', member_count: 10 },
        ]
    },
    '/venues': {
        success: true, data: [
            { id: 1, name: 'Main Gymnasium', location: 'Building A', capacity: 500, scheduled_matches: 2 },
            { id: 2, name: 'Covered Court 1', location: 'East Wing', capacity: 300, scheduled_matches: 1 },
            { id: 3, name: 'Track and Field', location: 'South Campus', capacity: 2000, scheduled_matches: 0 },
        ]
    },
    '/schedules/today': {
        success: true, data: [
            { match_id: 1, scheduled_time: '09:00', sport_name: 'Basketball', tournament_name: 'Basketball Championship', team_a: 'IT Eagles', team_b: 'ENGR Titans', venue_name: 'Main Gymnasium', status: 'ongoing', referee_name: 'Juan Dela Cruz' },
            { match_id: 2, scheduled_time: '11:00', sport_name: 'Volleyball', tournament_name: 'Volleyball Cup', team_a: 'BA Blazers', team_b: 'EDUC Stars', venue_name: 'Covered Court 1', status: 'scheduled', referee_name: 'Pedro Reyes' },
            { match_id: 3, scheduled_time: '14:00', sport_name: 'Chess', tournament_name: 'Chess Masters', team_a: 'Maria S.', team_b: 'Juan M.', venue_name: 'Conference Hall', status: 'scheduled', referee_name: 'Ana Garcia' },
        ]
    },
};

// ── Auto-refresh with soft-reload fallback ────────────────────────────
window.AutoRefresh = {
    _timers: {},
    /**
     * @param {string} key          unique id for this page
     * @param {Function} loadFn     the page’s load / refresh function
     * @param {number}  intervalMs  default 15 s
     * @param {string[]} events     extra custom events that should also trigger a soft reload
     */
    start(key, loadFn, intervalMs = 15000, events = []) {
        this.stop(key);

        // soft debounce so rapid events don’t hammer the API
        let softTimer = null;
        const soft = () => {
            clearTimeout(softTimer);
            softTimer = setTimeout(() => loadFn({ silent: true }), 400);
        };

        // hard interval (fallback when realtime is silent)
        this._timers[key] = setInterval(() => loadFn({ silent: true }), intervalMs);

        // also listen to the usual realtime events
        const allEvents = [
            'sf:live', 'sf:match', 'sf:score',
            'sf:leaderboard', 'sf:champion', 'sf:tournament',
            ...events
        ];
        allEvents.forEach(ev => window.addEventListener(ev, soft));

        // store the soft handler so we can remove it later if needed
        this._timers[key]._soft = soft;
        this._timers[key]._events = allEvents;
    },

    stop(key) {
        const t = this._timers[key];
        if (!t) return;
        clearInterval(t);
        if (t._soft && t._events) {
            t._events.forEach(ev => window.removeEventListener(ev, t._soft));
        }
        delete this._timers[key];
    }
};
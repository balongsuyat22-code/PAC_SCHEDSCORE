
const API_BASE = window.location.origin + '/api';

const Auth = {
    getToken: () => localStorage.getItem('sf_token'),
    getUser: () => { try { return JSON.parse(localStorage.getItem('sf_user')); } catch { return null; } },
    logout: () => {
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
                const home = { admin: '/admin', dean_adviser: '/dean', sgo_president: '/president', sgo_officer: '/referee' };
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
        if (body && typeof body === 'object') body = JSON.stringify(body);
    }

    try {
        const res = await fetch(`${API_BASE}${path}`, { ...options, headers, body });
        const data = await res.json();
        if (!res.ok) {
            console.error(`❌ API ${res.status}: ${path}`, data);
            if (res.status !== 404) Toast.show(data.message || `Server error (${res.status})`, 'error');
            return { success: false, message: data.message || `HTTP ${res.status}`, data: [] };
        }
        return data;
    } catch (e) {
        console.warn('[API] Network error for', path, e.message);
        return { success: false, data: [], message: 'Network error — is the server running?' };
    }
};

const Toast = window.Toast || {
    show(msg, type = 'success', duration = 3000) {
        let t = document.getElementById('sf-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'sf-toast';
            t.className = 'toast';
            document.body.appendChild(t);
        }
        const icons = { success: 'OK', error: 'ERR', info: 'i' };
        t.innerHTML = `<span style="font-weight:800;margin-right:6px">${icons[type] || '•'}</span> ${msg}`;
        t.className = `toast ${type} show`;
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('show'), duration);
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
                <button class="btn btn-primary" type="button" data-dialog-ok>OK</button></div></div>`;
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
        ongoing: ['badge-pulse badge-green', '🟢 LIVE'],
        scheduled: ['badge-muted', '📅 Scheduled'],
        pending: ['badge-muted', '⏳ Pending'],
        completed: ['badge-blue', '✅ Done'],
        cancelled: ['badge-red', '❌ Cancelled'],
        postponed: ['badge-orange', '⏸ Postponed'],
        walkover: ['badge-muted', '🚶 Walkover'],
        draft: ['badge-muted', '📝 Draft'],
        registration: ['badge-blue', '📋 Registration'],
        active: ['badge-green', 'Active'],
        approved: ['badge-green', '✅ Approved'],
        rejected: ['badge-red', '❌ Rejected'],
    };
    const [cls, label] = map[status] || ['badge-muted', status];
    return `<span class="badge ${cls}">${label}</span>`;
};

const medalBadge = (medal) => ({ gold: '🥇', silver: '🥈', bronze: '🥉', participation: '🎖' }[medal] || '—');
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
    if (n.includes('relay') || n.includes('4x')) return '🏃';
    if (n.includes('track') || n.includes('sprint') || n.includes('100') || n.includes('200') || n.includes('400')) return '🏃';
    if (n.includes('mobile') || n.includes('legend')) return '🎮';
    if (n.includes('valorant') || n.includes('esport')) return '🎮';
    if (n.includes('swim')) return '🏊';
    if (n.includes('tennis')) return '🎾';
    if (n.includes('table')) return '🏓';
    if (n.includes('football') || n.includes('soccer')) return '⚽';
    return '🏅';
};

const formatDate = (d) => d
    ? new Date(d + (String(d).includes('T') ? '' : 'T00:00')).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
const formatTime = (t) => t ? t.slice(0, 5) : '—';
const initials = (name = '') => name.split(' ').map(w => w[0] || '').slice(0, 2).join('').toUpperCase() || '?';

function filterTable(tableId, query) {
    const rows = document.querySelectorAll(`#${tableId} tbody tr`);
    const q = query.toLowerCase();
    rows.forEach(r => r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none');
}

const NotifBell = {
    async init() {
        const bell = document.getElementById('notif-bell');
        const dropdown = document.getElementById('notif-dropdown');
        if (!bell) return;

        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!dropdown) return;
            const opening = dropdown.style.display !== 'block';
            dropdown.style.display = opening ? 'block' : 'none';
            if (opening) this.refresh();
        });
        document.addEventListener('click', () => {
            if (dropdown) dropdown.style.display = 'none';
        });

        this.refresh();
        clearInterval(this._timer);
        this._timer = setInterval(() => this.refresh(), 45000);
        ['sf:notif', 'sf:live', 'sf:match', 'sf:leaderboard', 'sf:champion'].forEach(evt => {
            window.addEventListener(evt, () => this.refresh());
        });
    },

    async refresh() {
        if (typeof NotificationEngine === 'undefined') return;
        const badgeEl = document.getElementById('notif-badge');
        const listEl = document.getElementById('notif-list');
        if (!badgeEl && !listEl) return;

        const role = (typeof Auth !== 'undefined' && Auth.getUser && Auth.getUser()?.role) || null;
        const items = await NotificationEngine.list(role);
        const live = (typeof Realtime !== 'undefined' && Realtime.getFeed) ? Realtime.getFeed() : [];
        NotificationEngine.render('notif-list', 'notif-badge', items, live);
    },
};

function toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('sidebar-open');
    let overlay = document.getElementById('sidebar-overlay');
    if (sidebar.classList.contains('sidebar-open')) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sidebar-overlay';
            overlay.className = 'sidebar-open-overlay';
            overlay.onclick = toggleSidebar;
            document.body.appendChild(overlay);
        }
    } else {
        overlay?.remove();
    }
}
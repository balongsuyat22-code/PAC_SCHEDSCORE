/* ============================================================
   PAC SCHED-SCORE — CORE JS (api, auth, toast, modal, render helpers)
   Shared by admin / dean / SGO_PRESIDENT / referee pages
   ============================================================ */

const API_BASE = window.location.origin + '/api';

// ── Auth ──────────────────────────────────────────────────────
const Auth = {
    getToken: () => localStorage.getItem('sf_token'),
    getUser: () => { try { return JSON.parse(localStorage.getItem('sf_user')); } catch { return null; } },
    logout: () => {
        localStorage.removeItem('sf_token');
        localStorage.removeItem('sf_user');
        window.location.href = '/login';
    },
    // expectedRoles: string or array of allowed roles for this page
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

// ── API Request Helper ────────────────────────────────────────
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

// ── Toast ─────────────────────────────────────────────────────
const Toast = {
    show(msg, type = 'success', duration = 3000) {
        let t = document.getElementById('sf-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'sf-toast';
            t.className = 'toast';
            document.body.appendChild(t);
        }
        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        t.innerHTML = `<span>${icons[type] || '📢'}</span> ${msg}`;
        t.className = `toast ${type} show`;
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('show'), duration);
    }
};

// ── Modal ─────────────────────────────────────────────────────
const Modal = {
    open(id) { document.getElementById(id)?.classList.add('open'); },
    close(id) { document.getElementById(id)?.classList.remove('open'); },
    closeAll() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open')); }
};

// ── Render Helpers ────────────────────────────────────────────
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

// ── Table Search ──────────────────────────────────────────────
function filterTable(tableId, query) {
    const rows = document.querySelectorAll(`#${tableId} tbody tr`);
    const q = query.toLowerCase();
    rows.forEach(r => r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none');
}

// ── Notification bell (generic, polls announcements/alerts) ───
const NotifBell = {
    async init() {
        const bell = document.getElementById('notif-bell');
        if (!bell) return;
        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            const dd = document.getElementById('notif-dropdown');
            if (!dd) return;
            dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', () => {
            const dd = document.getElementById('notif-dropdown');
            if (dd) dd.style.display = 'none';
        });
    }
};

// ── Mobile sidebar toggle ───────────────────────────────────────
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
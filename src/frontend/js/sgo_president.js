/* ============================================================
   SGO PRESIDENT SIDEBAR — PAC SCHED-SCORE
   ============================================================ */
const SGO_PRESIDENT_NAV = [
    { section: 'Overview' },
    { key: 'dashboard', icon: 'fa-solid fa-gauge-high', label: 'Dashboard', href: '/president/dashboard' },
    { key: 'live', icon: 'fa-solid fa-circle-play', label: 'Live Scores', href: '/president/live', badge: 'live' },
    { section: 'Tournament Ops' },
    { key: 'sports', icon: 'fa-solid fa-medal', label: 'Sports', href: '/president/sports' },
    { key: 'bracketing', icon: 'fa-solid fa-trophy', label: 'Bracketing', href: '/president/bracketing' },
    { key: 'game-setup', icon: 'fa-solid fa-screwdriver-wrench', label: 'Game Setup', href: '/president/game-setup' },
    { key: 'schedule', icon: 'fa-solid fa-calendar-days', label: 'Schedule & Officers', href: '/president/schedule' },
    { key: 'venues', icon: 'fa-solid fa-location-dot', label: 'Venue Management', href: '/president/venues' },
    { section: 'Comms & Reports' },
    { key: 'reports', icon: 'fa-solid fa-file-lines', label: 'Reports', href: '/president/reports' },
    { key: 'notifications', icon: 'fa-solid fa-bell', label: 'Announcements', href: '/president/notifications' },
];

let sidebarRendered = false;

function showPageLoader() {
    if (document.getElementById('page-loader')) return;
    const el = document.createElement('div');
    el.id = 'page-loader';
    el.className = 'page-loader';
    el.innerHTML = `
        <div class="page-loader-logo"><i class="fa-solid fa-building-columns"></i></div>
        <div class="page-loader-text">PAC SCHED-SCORE</div>
        <div class="page-loader-bar"><span></span></div>
    `;
    document.body.appendChild(el);
}

function hidePageLoader() {
    const el = document.getElementById('page-loader');
    if (!el) return;
    el.classList.add('done');
    setTimeout(() => el.remove(), 400);
}

function skeletonHtml(kind = 'rows', count = 4) {
    if (kind === 'stats') {
        return Array.from({ length: count }, () => `<div class="skeleton skeleton-card"></div>`).join('');
    }
    if (kind === 'cards') {
        return Array.from({ length: count }, () => `<div class="skeleton skeleton-card" style="height:120px"></div>`).join('');
    }
    return Array.from({ length: count }, () => `<div class="skeleton skeleton-row"></div>`).join('');
}

function toggleSidebar() {
    const sb = document.getElementById('app-sidebar');
    if (!sb) return;
    const open = !sb.classList.contains('sidebar-open');
    sb.classList.toggle('sidebar-open', open);

    let overlay = document.getElementById('sidebar-overlay');
    if (open) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sidebar-overlay';
            overlay.className = 'sidebar-open-overlay';
            overlay.addEventListener('click', () => toggleSidebar());
            document.body.appendChild(overlay);
        }
        requestAnimationFrame(() => overlay.classList.add('show'));
        document.body.style.overflow = 'hidden';
    } else {
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 250);
        }
        document.body.style.overflow = '';
    }
}

function closeSidebarOnNavigate() {
    const sb = document.getElementById('app-sidebar');
    if (sb?.classList.contains('sidebar-open')) {
        sb.classList.remove('sidebar-open');
        document.getElementById('sidebar-overlay')?.remove();
        document.body.style.overflow = '';
    }
}

function renderSidebar(activePage) {
    if (sidebarRendered) {
        hidePageLoader();
        return;
    }

    showPageLoader();

    const user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    const name = user
        ? (`${user.first_name || ''} ${user.last_name || ''}`).trim() || user.username || 'President'
        : 'President';
    const avatar = (user?.first_name?.[0] || user?.username?.[0] || 'P').toUpperCase();
    const currentPath = window.location.pathname;

    const navHtml = SGO_PRESIDENT_NAV.map(item => {
        if (item.section) {
            return `<div class="nav-section-title">${item.section}</div>`;
        }
        const isActive =
            item.key === activePage ||
            currentPath === item.href ||
            currentPath.endsWith(item.href.split('/').pop()) ||
            (currentPath === '/president' && item.key === 'dashboard');
        const badgeHtml = item.badge === 'live'
            ? `<span class="nav-badge" id="sb-live-count" style="background:var(--red);display:none">0</span>`
            : '';
        return `<a class="nav-item${isActive ? ' active' : ''}" href="${item.href}" data-nav="${item.key}">
            <span class="nav-icon"><i class="${item.icon}"></i></span>
            ${item.label}${badgeHtml}
        </a>`;
    }).join('\n');

    const sidebarHtml = `
<aside class="sidebar" id="app-sidebar">
    <div class="sidebar-logo">
        <div class="logo-icon"><i class="fa-solid fa-building-columns"></i></div>
        <div class="logo-text">PAC <span>SCHED-SCORE</span></div>
    </div>
    <div class="sidebar-role role-sgo_president">
        <i class="fa-solid fa-user-tie"></i> SGO President
    </div>
    <nav class="sidebar-nav">${navHtml}</nav>
    <div class="sidebar-footer">
        <div class="user-card">
            <div class="user-avatar" id="sb-avatar">${avatar}</div>
            <div class="user-info">
                <div class="user-name" id="sb-name">${name}</div>
                <div class="user-role" id="sb-role">SGO President</div>
            </div>
            <button class="logout-btn" id="logout-btn" title="Logout" type="button">
                <i class="fa-solid fa-right-from-bracket"></i>
            </button>
        </div>
    </div>
</aside>`;

    document.getElementById('app-sidebar')?.remove();

    const mainEl = document.querySelector('main.main') || document.querySelector('main');
    if (mainEl) {
        mainEl.insertAdjacentHTML('beforebegin', sidebarHtml);
    } else {
        document.body.insertAdjacentHTML('afterbegin', sidebarHtml);
    }

    document.getElementById('logout-btn')?.addEventListener('click', confirmSgoPresidentLogout);

    document.querySelectorAll('.sidebar-nav .nav-item').forEach(link => {
        link.addEventListener('click', () => closeSidebarOnNavigate());
    });

    sidebarRendered = true;
    requestAnimationFrame(() => setTimeout(hidePageLoader, 120));
}

function confirmSgoPresidentLogout() {
    document.querySelector('.logout-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'logout-overlay show';
    overlay.innerHTML = `
        <div class="logout-modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
            <div class="logout-modal-icon"><i class="fa-solid fa-right-from-bracket"></i></div>
            <div class="logout-modal-title">Sign Out</div>
            <div class="logout-modal-text">Are you sure you want to leave your SGO President session?</div>
            <div class="logout-modal-actions">
                <button class="logout-cancel-btn" type="button">Cancel</button>
                <button class="logout-confirm-btn" type="button">Sign Out</button>
            </div>
        </div>
    `;
    const close = () => overlay.remove();
    overlay.querySelector('.logout-cancel-btn').addEventListener('click', close);
    overlay.querySelector('.logout-confirm-btn').addEventListener('click', () => Auth.logout());
    overlay.addEventListener('click', close);
    document.body.appendChild(overlay);
}

function refreshSidebar(activePage) {
    sidebarRendered = false;
    renderSidebar(activePage);
}

function updateLiveBadge() {
    if (typeof api !== 'function') return;
    api('/matches/live').then(r => {
        const badge = document.getElementById('sb-live-count');
        if (!badge) return;
        const count = r.data?.length || 0;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }).catch(() => { });
}

const Modal = window.Modal || {
    open(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.add('open');
        document.body.style.overflow = 'hidden';
    },
    close(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('open');
        if (!document.querySelector('.modal-overlay.open')) {
            document.body.style.overflow = '';
        }
    },
    closeAll() {
        document.querySelectorAll('.modal-overlay.open').forEach(el => el.classList.remove('open'));
        document.body.style.overflow = '';
    },
};
window.Modal = Modal;

const Toast = window.Toast || {
    show(msg, type = 'info') {
        document.querySelectorAll('.toast').forEach(t => t.remove());
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = msg;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 300);
        }, 3200);
    },
};
window.Toast = Toast;

window.formatDate = window.formatDate || function (d) {
    if (!d) return '—';
    try {
        const dt = new Date(d);
        if (Number.isNaN(dt.getTime())) return d;
        return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return d; }
};
window.formatTime = window.formatTime || function (t) {
    if (!t) return '—';
    const parts = String(t).split(':');
    if (parts.length >= 2) {
        let h = parseInt(parts[0], 10);
        const m = parts[1];
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${m} ${ampm}`;
    }
    return t;
};
window.initials = window.initials || function (name) {
    if (!name) return '?';
    return String(name).split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
};
window.statusBadge = window.statusBadge || function (status) {
    const map = {
        draft: 'badge-muted', registration: 'badge-blue', ongoing: 'badge-green badge-pulse',
        scheduled: 'badge-blue', completed: 'badge-muted', cancelled: 'badge-red', pending: 'badge-orange',
    };
    return `<span class="badge ${map[status] || 'badge-muted'}">${status || '—'}</span>`;
};
window.sportIcon = window.sportIcon || function (name) {
    const n = (name || '').toLowerCase();
    const map = {
        basketball: 'fa-basketball', volleyball: 'fa-volleyball', football: 'fa-futbol',
        soccer: 'fa-futbol', badminton: 'fa-feather-pointed', 'table tennis': 'fa-table-tennis-paddle-ball',
        chess: 'fa-chess', baseball: 'fa-baseball', swim: 'fa-person-swimming',
        track: 'fa-person-running', run: 'fa-person-running', dance: 'fa-music', esports: 'fa-gamepad',
    };
    for (const key in map) if (n.includes(key)) return `<i class="fa-solid ${map[key]}"></i>`;
    return `<i class="fa-solid fa-medal"></i>`;
};

function renderFfaScoreboard(participants, opts = {}) {
    const list = participants || [];
    if (!list.length) {
        return `<div class="section-empty">${opts.emptyText || 'No participants yet'}</div>`;
    }
    const sorted = [...list].sort((a, b) => {
        if (a.rank != null && b.rank != null) return a.rank - b.rank;
        if (a.score != null && b.score != null) return Number(b.score) - Number(a.score);
        return 0;
    });
    return `<div class="ffa-scoreboard">${sorted.map((p, i) => {
        const rank = p.rank != null ? p.rank : i + 1;
        const score = p.score != null && p.score !== '' ? p.score : null;
        return `
        <div class="ffa-score-row${rank === 1 ? ' is-leader' : ''}">
            <div class="ffa-score-rank">${rank}</div>
            <div class="ffa-score-name">${p.department_name || p.name || '—'}</div>
            <div class="ffa-score-value${score == null ? ' muted' : ''}">${score == null ? '—' : score}</div>
        </div>`;
    }).join('')}</div>`;
}
window.renderFfaScoreboard = renderFfaScoreboard;

window.NotifBell = window.NotifBell || {
    init() {
        const bell = document.getElementById('notif-bell');
        const dropdown = document.getElementById('notif-dropdown');
        if (!bell || !dropdown) return;
        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', () => { dropdown.style.display = 'none'; });
    },
};

document.addEventListener('DOMContentLoaded', function () {
    showPageLoader();
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/president') || currentPath.startsWith('/SGO_PRESIDENT')) {
        const activePage = currentPath.split('/').pop() || 'dashboard';
        const cleanPage = activePage.replace('.html', '');
        const pageMap = {
            dashboard: 'dashboard', sports: 'sports', bracketing: 'bracketing',
            'game-setup': 'game-setup', schedule: 'schedule', venues: 'venues',
            assignment: 'schedule', live: 'live', 'live-scores': 'live',
            reports: 'reports', notifications: 'notifications',
        };
        renderSidebar(pageMap[cleanPage] || 'dashboard');
        updateLiveBadge();
    } else {
        hidePageLoader();
    }
});

window.addEventListener('popstate', function () {
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/president') || currentPath.startsWith('/SGO_PRESIDENT')) {
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
            el.classList.toggle('active', el.getAttribute('href') === currentPath);
        });
    }
});

window.toggleSidebar = toggleSidebar;
window.skeletonHtml = skeletonHtml;
window.showPageLoader = showPageLoader;
window.hidePageLoader = hidePageLoader;
let deanMobileOpen = false;
let deanSidebarCollapsed = localStorage.getItem('sf_sidebar_collapsed') === '1';

const DEAN_ICONS = {
    dashboard: `<svg viewBox="0 0 24 24"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`,
    live: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`,
    trophy: `<svg viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
    user: `<svg viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    users: `<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    sword: `<svg viewBox="0 0 24 24"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>`,
    clipboard: `<svg viewBox="0 0 24 24"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`,
    bell: `<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
    logout: `<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`,
    building: `<svg viewBox="0 0 24 24"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`,
    grad: `<svg viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`,
    check: `<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>`,
    x: `<svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
    menu: `<svg viewBox="0 0 24 24"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>`,
    chevronLeft: `<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>`,
};

function deanIcon(name, cls = '') {
    return `<span class="icon ${cls}">${DEAN_ICONS[name] || ''}</span>`;
}

const DEAN_NAV = [
    { section: 'Overview' },
    { key: 'dashboard', icon: 'dashboard', label: 'Dashboard', href: '/dean' },
    { key: 'live', icon: 'live', label: 'Live Scores', href: '/dean/live', badge: true },
    { key: 'leaderboard', icon: 'trophy', label: 'Leaderboard', href: '/dean/leaderboard' },
    { key: 'schedule', icon: 'calendar', label: 'Schedule', href: '/dean/schedule' },
    { section: 'My Department' },
    { key: 'players', icon: 'user', label: 'Player Registration', href: '/dean/players' },
    { key: 'teams', icon: 'users', label: 'Team Rosters', href: '/dean/teams' },
    { key: 'matches', icon: 'sword', label: 'Our Matches', href: '/dean/matches' },
    { section: 'Reports' },
    { key: 'reports', icon: 'clipboard', label: 'Reports', href: '/dean/reports' },
    { key: 'notifications', icon: 'bell', label: 'Notifications', href: '/dean/notifications', badge: true },
];

function renderSidebar(activePage) {
    const user = Auth.getUser();
    const name = user
        ? (`${user.first_name || ''} ${user.last_name || ''}`).trim() || user.username || 'Adviser'
        : 'Adviser';
    const avatar = (user?.first_name?.[0] || user?.username?.[0] || 'D').toUpperCase();
    const deptName = user?.department_name || 'My Department';
    const currentPath = window.location.pathname;

    const navHtml = DEAN_NAV.map(item => {
        if (item.section) {
            return `<div class="nav-section-title">${item.section}</div>`;
        }
        const isActive = item.key === activePage
            || (item.href !== '/dean' && currentPath.startsWith(item.href))
            || (item.href === '/dean' && (currentPath === '/dean' || currentPath === '/dean/dashboard'));
        const badgeHtml = item.badge && item.key === 'live'
            ? `<span class="nav-badge" id="sb-live-count" style="background:var(--red);display:none">0</span>`
            : item.badge && item.key === 'notifications'
                ? `<span class="nav-badge" id="sb-notif-count" style="background:var(--gold);color:#000;display:none">0</span>`
                : '';
        return `<a class="nav-item${isActive ? ' active' : ''}" href="${item.href}" title="${item.label}">
            <span class="nav-icon">${DEAN_ICONS[item.icon] || ''}</span>
            <span>${item.label}</span>${badgeHtml}
        </a>`;
    }).join('\n');

    // Referee-style sidebar markup
    const sidebarHtml = `
<aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
        <div class="logo-mark">${DEAN_ICONS.trophy}</div>
        <div class="sidebar-logo-text">PAC<span> SCHED-SCORE</span></div>
        <button class="sidebar-close-btn" onclick="toggleSidebar()" aria-label="Close menu">${DEAN_ICONS.x}</button>
    </div>
    <div class="sidebar-role-badge role-dean">Dean / Adviser</div>
    <div class="sidebar-dept">
        <span class="sidebar-dept-icon">${DEAN_ICONS.building}</span>
        <span id="sb-dept-name">${deptName}</span>
    </div>
    <nav class="sidebar-nav">${navHtml}</nav>
    <div class="sidebar-footer">
        <div class="user-card">
            <div class="user-avatar" id="sb-avatar">${avatar}</div>
            <div class="user-info">
                <div class="user-name" id="sb-name">${name}</div>
                <div class="user-role" id="sb-role">Dean / Adviser</div>
            </div>
            <button class="logout-btn" id="logout-btn" title="Logout">${DEAN_ICONS.logout}</button>
        </div>
    </div>
</aside>`;

    document.getElementById('sidebar')?.remove();
    const mainEl = document.querySelector('main.main') || document.querySelector('main');
    if (mainEl) mainEl.insertAdjacentHTML('beforebegin', sidebarHtml);
    else document.body.insertAdjacentHTML('afterbegin', sidebarHtml);

    document.getElementById('logout-btn')?.addEventListener('click', confirmDeanLogout);

    if (deanSidebarCollapsed) {
        document.getElementById('sidebar')?.classList.add('collapsed');
        document.querySelector('.main')?.classList.add('sidebar-collapsed');
    }

    // Live badge
    api('/matches/live').then(r => {
        const badge = document.getElementById('sb-live-count');
        if (!badge) return;
        if (!r.success) { badge.style.display = 'none'; return; }
        const count = r.data?.length || 0;
        badge.textContent = count;
        badge.style.display = count > 0 ? '' : 'none';
    }).catch(() => {
        const badge = document.getElementById('sb-live-count');
        if (badge) badge.style.display = 'none';
    });

    // Topbar (referee-style) + mobile nav
    renderDeanTopbar();
    injectDeanNotifEngine();
}

async function renderDeanTopbar() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;

    const user = Auth.getUser();
    const firstName = user?.first_name || 'Dean';
    const lastName = user?.last_name || '';
    const initials = (firstName[0] || 'D').toUpperCase();

    // Preserve existing page title if present
    const existingTitle = topbar.querySelector('.topbar-title');
    const titleHtml = existingTitle
        ? existingTitle.outerHTML
        : `<div class="topbar-title">Dashboard</div>`;

    // Preserve extra action buttons that pages put in .topbar-actions
    const existingActions = topbar.querySelector('.topbar-actions');
    const pageActionsHtml = existingActions ? existingActions.innerHTML : '';

    topbar.innerHTML = `
        <div class="topbar-left">
            <button class="burger-menu" onclick="toggleSidebar()" aria-label="Open menu">${DEAN_ICONS.menu}</button>
            ${titleHtml}
        </div>
        <div class="topbar-right">
            <span id="sf-conn-dot" title="Connecting…"
                  style="width:8px;height:8px;border-radius:50%;background:var(--muted);flex-shrink:0;
                         box-shadow:0 0 0 3px rgba(34,197,94,0.12);margin-right:4px;align-self:center"></span>
            <div class="nav-notification-container">
                <div class="nav-bell" onclick="window.toggleDeanNotifDropdown && window.toggleDeanNotifDropdown(event)" role="button" aria-label="Notifications">
                    ${DEAN_ICONS.bell}
                    <span id="notif-badge" style="display:none">0</span>
                </div>
                <div id="notif-dropdown">
                    <div class="notif-header-row">
                        <span class="notif-header-title">${DEAN_ICONS.bell} Notifications</span>
                        <span class="notif-mark-read" onclick="window.deanMarkAllRead && window.deanMarkAllRead(event)">Mark all read</span>
                    </div>
                    <div id="notif-list"></div>
                    <div class="notif-footer">
                        <a href="/dean/notifications">View all</a>
                    </div>
                </div>
            </div>
            <div class="topbar-actions" style="display:flex;align-items:center;gap:8px">${pageActionsHtml}</div>
            <div class="user-pill">
                <div class="user-pill-avatar">${initials}</div>
                <span class="user-pill-name">${firstName}${lastName ? ' ' + lastName : ''}</span>
            </div>
        </div>
    `;

    if (!document.getElementById('sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        overlay.onclick = toggleSidebar;
        document.body.appendChild(overlay);
    }
}

function injectDeanNotifEngine() {
    if (typeof Realtime !== 'undefined') {
        Realtime.connect().catch(() => { });
    }

    if (typeof NotificationEngine !== 'undefined') {
        NotificationEngine.mount({
            stateContainerId: 'notif-list',
            badgeId: 'notif-badge',
            role: 'dean_adviser',
        });
    }

    const syncNavBadge = async () => {
        if (typeof NotificationEngine === 'undefined') return;
        const items = await NotificationEngine.list('dean_adviser');
        const navBadge = document.getElementById('sb-notif-count');
        if (!navBadge) return;
        navBadge.textContent = items.length > 9 ? '9+' : String(items.length);
        navBadge.style.display = items.length > 0 ? '' : 'none';
    };
    syncNavBadge();
    setInterval(syncNavBadge, 45000);
    ['sf:notif', 'sf:live', 'sf:match', 'sf:leaderboard'].forEach(evt =>
        window.addEventListener(evt, syncNavBadge)
    );
}

window.toggleDeanNotifDropdown = function (event) {
    if (event) event.stopPropagation();
    const dd = document.getElementById('notif-dropdown');
    if (!dd) return;
    const isOpen = dd.classList.contains('open');
    dd.classList.toggle('open', !isOpen);
    dd.style.display = isOpen ? 'none' : 'flex';
};

window.deanMarkAllRead = async function (event) {
    if (event) event.stopPropagation();
    try {
        await api('/notifications/read-all', { method: 'PATCH' }).catch(() => { });
        if (typeof NotificationEngine !== 'undefined') NotificationEngine.undismissAll();
    } catch (_) { }
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notif-list');
    if (badge) badge.style.display = 'none';
    if (list) list.innerHTML = `<div class="notif-empty">You're all caught up</div>`;
};

window.addEventListener('click', function (e) {
    const dd = document.getElementById('notif-dropdown');
    const bell = document.querySelector('.nav-bell');
    if (dd && bell && !bell.contains(e.target) && !dd.contains(e.target)) {
        dd.classList.remove('open');
        dd.style.display = 'none';
    }
});

function toggleSidebar() {
    deanMobileOpen = !deanMobileOpen;
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('sidebar-open', deanMobileOpen);
    if (overlay) overlay.style.display = deanMobileOpen ? 'block' : 'none';
    document.body.style.overflow = deanMobileOpen ? 'hidden' : '';
}

function confirmDeanLogout() {
    document.querySelector('.logout-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'logout-overlay show';
    overlay.innerHTML = `
        <div class="logout-modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
            <div class="logout-modal-icon">${DEAN_ICONS.logout}</div>
            <div class="logout-modal-title">Sign Out</div>
            <div class="logout-modal-text">Are you sure you want to leave your Dean / Adviser session?</div>
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

// Close mobile sidebar on nav click / resize / Escape (referee parity)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && deanMobileOpen) toggleSidebar();
});
window.addEventListener('resize', () => {
    if (window.innerWidth > 900 && deanMobileOpen) {
        deanMobileOpen = false;
        document.getElementById('sidebar')?.classList.remove('sidebar-open');
        const overlay = document.getElementById('sidebar-overlay');
        if (overlay) overlay.style.display = 'none';
        document.body.style.overflow = '';
    }
});
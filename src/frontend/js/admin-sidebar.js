
const ADMIN_ICONS = {
    dashboard: `<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
    live: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path></svg>`,
    leaderboard: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`,
    tournaments: `<svg viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>`,
    matches: `<svg viewBox="0 0 24 24"><line x1="5" y1="19" x2="19" y2="5"></line><polyline points="14 5 19 5 19 10"></polyline><line x1="19" y1="19" x2="5" y2="5"></line><polyline points="10 19 5 19 5 14"></polyline></svg>`,
    departments: `<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
    sports: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
    teams: `<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    venues: `<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
    users: `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    schedule: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    sportFest: `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
    reports: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
    export: `<svg viewBox="0 0 24 24"><path d="M6 2h9l3 3v17H6z"></path><path d="M14 2v4h4M9 13h6M9 17h6M9 9h2"></path></svg>`,
    trophy: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`,
    settings: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    logout: `<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
    menu: `<svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
    bell: `<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
};

const ADMIN_NAV = [
    { section: 'Overview' },
    { key: 'dashboard', icon: ADMIN_ICONS.dashboard, label: 'Dashboard', href: '/admin' },
    { key: 'leaderboard', icon: ADMIN_ICONS.leaderboard, label: 'Leaderboard', href: '/admin/leaderboard' },
    { section: 'Management' },
    { key: 'tournaments', icon: ADMIN_ICONS.tournaments, label: 'Tournaments', href: '/admin/tournaments' },
    { key: 'matches', icon: ADMIN_ICONS.matches, label: 'Matches', href: '/admin/matches', badge: 'live' },
    { key: 'departments', icon: ADMIN_ICONS.departments, label: 'Grades & Strands', href: '/admin/departments' },
    { key: 'sports', icon: ADMIN_ICONS.sports, label: 'Sports', href: '/admin/sports' },
    { key: 'teams', icon: ADMIN_ICONS.teams, label: 'Teams', href: '/admin/teams' },
    { key: 'venues', icon: ADMIN_ICONS.venues, label: 'Venues', href: '/admin/venues' },
    { section: 'System' },
    { key: 'users', icon: ADMIN_ICONS.users, label: 'Users', href: '/admin/users' },
    { key: 'sport-fest', icon: ADMIN_ICONS.sportFest, label: 'Sport Fest', href: '/admin/sport-fest' },
    { key: 'reports', icon: ADMIN_ICONS.reports, label: 'Reports & Logs', href: '/admin/reports' },
    { key: 'tournament-export', icon: ADMIN_ICONS.export, label: 'Export Results', href: '/admin/tournament-export' },
];

function renderSidebar(activePage) {
    const user = Auth.getUser();
    const name = user ? (`${user.first_name || ''} ${user.last_name || ''}`).trim() || user.username || 'Admin' : 'Admin';
    const avatar = (user?.first_name?.[0] || user?.username?.[0] || 'A').toUpperCase();
    const currentPath = window.location.pathname;

    const navHtml = ADMIN_NAV.map(item => {
        if (item.section) return `<div class="nav-section-title">${item.section}</div>`;
        const isActive = item.key === activePage
            || (item.href !== '/admin' && currentPath.startsWith(item.href))
            || (item.href === '/admin' && (currentPath === '/admin' || currentPath === '/admin/dashboard'));
        const badgeHtml = item.badge === 'live'
            ? `<span class="nav-badge" id="sb-live-count" style="background:var(--red);display:none">0</span>`
            : '';
        return `<a class="nav-item${isActive ? ' active' : ''}" href="${item.href}">
            <span class="nav-icon"><span class="icon">${item.icon}</span></span>
            ${item.label}${badgeHtml}
        </a>`;
    }).join('\n');

    const sidebarHtml = `
<aside class="sidebar" id="admin-sidebar">
    <div class="sidebar-logo">
        <div class="logo-icon"><span class="icon">${ADMIN_ICONS.trophy}</span></div>
        <div class="logo-text">PAC <span>SCHED-SCORE</span></div>
    </div>
    <div class="sidebar-role role-admin"><span class="icon">${ADMIN_ICONS.settings}</span> Administrator</div>
    <nav class="sidebar-nav">${navHtml}</nav>
    <div class="sidebar-footer">
        <div class="user-card">
            <div class="user-avatar" id="sb-avatar">${avatar}</div>
            <div class="user-info">
                <div class="user-name" id="sb-name">${name}</div>
                <div class="user-role" id="sb-role">Admin</div>
            </div>
            <button class="logout-btn" id="logout-btn" title="Logout"><span class="icon">${ADMIN_ICONS.logout}</span></button>
        </div>
    </div>
</aside>`;

    document.getElementById('admin-sidebar')?.remove();

    const mainEl = document.querySelector('main.main') || document.querySelector('main');
    if (mainEl) mainEl.insertAdjacentHTML('beforebegin', sidebarHtml);
    else document.body.insertAdjacentHTML('afterbegin', sidebarHtml);

    document.getElementById('logout-btn')?.addEventListener('click', confirmAdminLogout);

    api('/matches/live').then(r => {
        const badge = document.getElementById('sb-live-count');
        if (!badge) return;
        const count = r.data?.length || 0;
        badge.textContent = count;
        badge.style.display = count > 0 ? '' : 'none';
    }).catch(() => { });

    setupBurgerMenu();
    injectRealtimeChrome();

    if (typeof NotificationEngine !== 'undefined') {
        NotificationEngine.mount({
            stateContainerId: 'sf-notif-list',
            badgeId: 'sf-notif-badge',
            role: 'admin',
        });
    }

    if (typeof Realtime !== 'undefined') {
        Realtime.connect().catch(() => { });
        window.addEventListener('sf:live', () => {
            api('/matches/live').then(r => {
                const badge = document.getElementById('sb-live-count');
                if (!badge) return;
                const count = r.data?.length || 0;
                badge.textContent = count;
                badge.style.display = count > 0 ? '' : 'none';
            }).catch(() => { });
        });
    }
}

function injectRealtimeChrome() {
    const actions = document.querySelector('.topbar-actions');
    if (!actions || document.getElementById('sf-notif-wrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'sf-notif-wrap';
    wrap.style.cssText = 'display:flex;align-items:center;gap:10px;margin-right:4px;position:relative;';
    wrap.innerHTML = `
        <span id="sf-conn-dot" title="Connecting…"
              style="width:8px;height:8px;border-radius:50%;background:var(--muted);flex-shrink:0;
                     box-shadow:0 0 0 3px rgba(34,197,94,0.12)"></span>
        <div class="nav-notification-container" style="position:relative">
            <button type="button" id="sf-notif-btn" class="btn btn-secondary btn-sm"
                    style="padding:6px 10px;position:relative" aria-label="Notifications">
                <span class="icon" style="width:16px;height:16px">${ADMIN_ICONS.bell}</span>
                <span id="sf-notif-badge" class="notif-badge" style="display:none">0</span>
            </button>
            <div id="sf-notif-dropdown" class="notif-dropdown" style="display:none">
                <div class="notif-header" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border)">
                    <span style="font-weight:700;font-size:13px">Notifications</span>
                    <button type="button" id="sf-notif-clear" class="btn btn-secondary btn-sm"
                            style="padding:2px 8px;font-size:11px">Clear live feed</button>
                </div>
                <div class="notif-list" id="sf-notif-list" style="max-height:320px;overflow-y:auto">
                    <div class="notif-item empty" style="padding:16px;color:var(--muted);text-align:center;font-size:13px">No notifications yet</div>
                </div>
            </div>
        </div>`;
    actions.insertBefore(wrap, actions.firstChild);

    const btn = document.getElementById('sf-notif-btn');
    const dd = document.getElementById('sf-notif-dropdown');
    if (dd) {
        dd.style.cssText = 'display:none;position:absolute;right:0;top:calc(100% + 8px);width:340px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.45);z-index:200;overflow:hidden';
    }
    btn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = dd.style.display === 'block';
        dd.style.display = open ? 'none' : 'block';
        if (!open && typeof Realtime !== 'undefined') Realtime._renderNotifBell();
    });
    document.getElementById('sf-notif-clear')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof Realtime !== 'undefined') Realtime.clearFeed();
    });
    document.addEventListener('click', () => { if (dd) dd.style.display = 'none'; });
    dd?.addEventListener('click', (e) => e.stopPropagation());
}

function setupBurgerMenu() {
    const sidebar = document.getElementById('admin-sidebar');
    if (!sidebar) return;

    let burger = document.getElementById('burger-menu') || document.querySelector('.burger-menu');
    if (!burger) return;

    const freshBurger = burger.cloneNode(true);
    burger.parentNode.replaceChild(freshBurger, burger);
    burger = freshBurger;
    if (!burger.innerHTML.trim()) {
        burger.innerHTML = `<span class="icon">${ADMIN_ICONS.menu}</span>`;
    }
    burger.setAttribute('aria-label', 'Toggle navigation menu');
    burger.setAttribute('type', 'button');

    const getOverlay = () => document.querySelector('.sidebar-open-overlay');

    const closeSidebar = () => {
        sidebar.classList.remove('sidebar-open');
        getOverlay()?.remove();
    };

    const openSidebar = () => {
        sidebar.classList.add('sidebar-open');
        if (!getOverlay()) {
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-open-overlay';
            overlay.addEventListener('click', closeSidebar);
            document.body.appendChild(overlay);
        }
    };

    burger.addEventListener('click', () => {
        sidebar.classList.contains('sidebar-open') ? closeSidebar() : openSidebar();
    });

    sidebar.querySelectorAll('.nav-item').forEach(a => a.addEventListener('click', closeSidebar));

    window.addEventListener('resize', () => {
        if (window.innerWidth > 900) closeSidebar();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSidebar();
    });
}

function confirmAdminLogout() {
    document.querySelector('.logout-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'logout-overlay show';
    overlay.innerHTML = `
        <div class="logout-modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
            <div class="logout-modal-icon"><span class="icon">${ADMIN_ICONS.logout}</span></div>
            <div class="logout-modal-title">Sign Out</div>
            <div class="logout-modal-text">Are you sure you want to leave your Administrator session?</div>
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
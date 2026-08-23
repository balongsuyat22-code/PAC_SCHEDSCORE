
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
    eye: `<svg viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    star: `<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
    layers: `<svg viewBox="0 0 24 24"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 12.5-8.58 3.91a2 2 0 0 1-1.66 0L2 12.5"/><path d="m22 17.5-8.58 3.91a2 2 0 0 1-1.66 0L2 17.5"/></svg>`,
    activity: `<svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
    medal: `<svg viewBox="0 0 24 24"><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/></svg>`,
    menu: `<svg viewBox="0 0 24 24"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>`,
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
            ? `<span class="nav-badge" id="sb-live-count" style="background:var(--red)">—</span>`
            : item.badge && item.key === 'notifications'
                ? `<span class="nav-badge" id="sb-notif-count" style="background:var(--gold);color:#000;display:none">0</span>`
                : '';
        return `<a class="nav-item${isActive ? ' active' : ''}" href="${item.href}">
            <span class="nav-icon">${DEAN_ICONS[item.icon] || ''}</span>
            <span>${item.label}</span>${badgeHtml}
        </a>`;
    }).join('\n');

    const sidebarHtml = `
<aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
        <div class="logo-mark" style="background:var(--gold);color:#000;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;">
            ${DEAN_ICONS.trophy}
        </div>
        <div class="sidebar-logo-text">PAC<span> SCHED-SCORE</span></div>
    </div>
    <div class="sidebar-role role-dean">${deanIcon('grad')} Dean / Adviser</div>
    <div class="sidebar-dept">
        <span class="sidebar-dept-icon">${deanIcon('building')}</span>
        <span id="sb-dept-name">${deptName}</span>
    </div>
    <nav class="sidebar-nav">
        ${navHtml}
    </nav>
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

    const mainEl = document.querySelector('main.main') || document.querySelector('main');
    if (mainEl) mainEl.insertAdjacentHTML('beforebegin', sidebarHtml);
    else document.body.insertAdjacentHTML('afterbegin', sidebarHtml);

    document.getElementById('logout-btn')?.addEventListener('click', confirmDeanLogout);
    initMobileNav();
    injectDeanNotifBell();

    const hideBadge = (id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    };

    api('/matches/live').then(r => {
        const badge = document.getElementById('sb-live-count');
        if (!badge) return;
        if (!r.success) { badge.style.display = 'none'; return; }
        const count = r.data?.length || 0;
        badge.textContent = count;
        badge.style.display = count > 0 ? '' : 'none';
    }).catch(() => hideBadge('sb-live-count'));

}

function injectDeanNotifBell() {
    if (typeof NotificationEngine === 'undefined') return;

    const actions = document.querySelector('.topbar-actions');
    if (actions && !document.getElementById('sf-notif-wrap')) {
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
                    <span class="icon" style="width:16px;height:16px">${DEAN_ICONS.bell}</span>
                    <span id="sf-notif-badge" class="notif-badge" style="display:none">0</span>
                </button>
                <div id="sf-notif-dropdown" class="notif-dropdown" style="display:none;position:absolute;right:0;top:calc(100% + 8px);width:320px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.45);z-index:200;overflow:hidden">
                    <div class="notif-header" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border)">
                        <span style="font-weight:700;font-size:13px">Notifications</span>
                    </div>
                    <div class="notif-list" id="sf-notif-list" style="max-height:320px;overflow-y:auto">
                        <div class="notif-item empty" style="padding:16px;color:var(--muted);text-align:center;font-size:13px">No notifications yet</div>
                    </div>
                </div>
            </div>`;
        actions.insertBefore(wrap, actions.firstChild);

        const btn = document.getElementById('sf-notif-btn');
        const dd = document.getElementById('sf-notif-dropdown');
        btn?.addEventListener('click', (e) => {
            e.stopPropagation();
            dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', () => { if (dd) dd.style.display = 'none'; });
        dd?.addEventListener('click', (e) => e.stopPropagation());
    }

    // Live socket (joins user_/role_/dept_ rooms)
    if (typeof Realtime !== 'undefined') {
        Realtime.connect().catch(() => { });
    }

    NotificationEngine.mount({
        stateContainerId: 'sf-notif-list',
        badgeId: 'sf-notif-badge',
        role: 'dean_adviser',
    });

    const syncNavBadge = async () => {
        const items = await NotificationEngine.list('dean_adviser');
        const navBadge = document.getElementById('sb-notif-count');
        if (!navBadge) return;
        navBadge.textContent = items.length > 9 ? '9+' : String(items.length);
        navBadge.style.display = items.length > 0 ? '' : 'none';
    };
    syncNavBadge();
    setInterval(syncNavBadge, 45000);
    ['sf:notif', 'sf:live', 'sf:match', 'sf:leaderboard'].forEach(evt => window.addEventListener(evt, syncNavBadge));
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

function initMobileNav() {
    const titleEl = document.querySelector('.topbar-title');
    if (titleEl && !titleEl.querySelector('.burger-menu')) {
        const btn = document.createElement('button');
        btn.className = 'burger-menu';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Open navigation menu');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', 'sidebar');
        btn.innerHTML = deanIcon('menu');
        titleEl.insertAdjacentElement('afterbegin', btn);
        btn.addEventListener('click', toggleMobileSidebar);
    }

    if (!document.getElementById('dean-sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-open-overlay';
        overlay.id = 'dean-sidebar-overlay';
        overlay.addEventListener('click', closeMobileSidebar);
        document.body.appendChild(overlay);
    }

    const sidebarEl = document.getElementById('sidebar');
    if (sidebarEl) {
        sidebarEl.querySelectorAll('.nav-item').forEach(a => a.addEventListener('click', closeMobileSidebar));

        let touchStartX = null, touchStartY = null;
        sidebarEl.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        sidebarEl.addEventListener('touchmove', (e) => {
            if (touchStartX === null) return;
            const dx = e.touches[0].clientX - touchStartX;
            const dy = e.touches[0].clientY - touchStartY;
            if (dx < -45 && Math.abs(dx) > Math.abs(dy)) closeMobileSidebar();
        }, { passive: true });
        sidebarEl.addEventListener('touchend', () => { touchStartX = null; touchStartY = null; });
    }

    if (!window.__deanMobileNavGlobalBound) {
        window.__deanMobileNavGlobalBound = true;
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMobileSidebar();
        });
        window.addEventListener('resize', () => {
            if (window.innerWidth > 900) closeMobileSidebar();
        });
    }
}

function toggleMobileSidebar() {
    const sidebarEl = document.getElementById('sidebar');
    if (!sidebarEl) return;
    sidebarEl.classList.contains('sidebar-open') ? closeMobileSidebar() : openMobileSidebar();
}

function openMobileSidebar() {
    const sidebarEl = document.getElementById('sidebar');
    const overlay = document.getElementById('dean-sidebar-overlay');
    const btn = document.querySelector('.burger-menu');
    sidebarEl?.classList.add('sidebar-open');
    overlay?.classList.add('show');
    btn?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
}

function closeMobileSidebar() {
    const sidebarEl = document.getElementById('sidebar');
    const overlay = document.getElementById('dean-sidebar-overlay');
    const btn = document.querySelector('.burger-menu');
    sidebarEl?.classList.remove('sidebar-open');
    overlay?.classList.remove('show');
    btn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
}
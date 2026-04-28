
const SIDEBAR_NAV = [
    { section: 'Overview' },
    { key: 'dashboard', icon: '📊', label: 'Dashboard', href: '/admin' },
    { key: 'live', icon: '🔴', label: 'Live Matches', href: '/admin/live', badge: true },
    { key: 'leaderboard', icon: '🏆', label: 'Leaderboard', href: '/admin/leaderboard' },
    { section: 'Management' },
    { key: 'tournaments', icon: '🏅', label: 'Tournaments', href: '/admin/tournaments' },
    { key: 'matches', icon: '⚔️', label: 'Matches', href: '/admin/matches' },
    { key: 'departments', icon: '🏢', label: 'Departments', href: '/admin/departments' },
    { key: 'sports', icon: '⚽', label: 'Sports', href: '/admin/sports' },
    { key: 'teams', icon: '👥', label: 'Teams', href: '/admin/teams' },
    { key: 'venues', icon: '🏟️', label: 'Venues', href: '/admin/venues' },
    { section: 'Admin' },
    { key: 'users', icon: '👤', label: 'Users', href: '/admin/users' },
    { key: 'schedule', icon: '📅', label: 'Schedule', href: '/admin/schedule' },
];

function renderSidebar(activePage) {
    const user = Auth.getUser();
    const name = user ? (`${user.first_name || ''} ${user.last_name || ''}`).trim() || user.username || 'Admin' : 'Admin';
    const avatar = (user?.first_name?.[0] || user?.username?.[0] || 'A').toUpperCase();

    // Current URL path for active detection
    const currentPath = window.location.pathname;

    const navHtml = SIDEBAR_NAV.map(item => {
        if (item.section) {
            return `<div class="nav-section-title">${item.section}</div>`;
        }
        // Active if: explicit key match OR URL path matches href
        const isActive = item.key === activePage
            || (item.href !== '/admin' && currentPath.startsWith(item.href))
            || (item.href === '/admin' && (currentPath === '/admin' || currentPath === '/admin/dashboard'));

        const badgeHtml = item.badge
            ? `<span class="nav-badge" id="sb-live-count" style="background:var(--red)">—</span>`
            : '';

        return `<a class="nav-item${isActive ? ' active' : ''}" href="${item.href}">
    <span class="nav-icon">${item.icon}</span>
    ${item.label}${badgeHtml}
</a>`;
    }).join('\n');

    const sidebarHtml = `
<aside class="sidebar">
    <div class="sidebar-logo">
        <div class="logo-icon">🏆</div>
        <div class="logo-text">PAC <span>SCHED-SCORE</span></div>
    </div>
    <div class="sidebar-role role-admin">⚙️ Administrator</div>
    <nav class="sidebar-nav">
        ${navHtml}
    </nav>
    <div class="sidebar-footer">
        <div class="user-card">
            <div class="user-avatar" id="sb-avatar">${avatar}</div>
            <div class="user-info">
                <div class="user-name" id="sb-name">${name}</div>
                <div class="user-role" id="sb-role">admin</div>
            </div>
            <button class="logout-btn" id="logout-btn" title="Logout">↩</button>
        </div>
    </div>
</aside>`;

    // Insert before <main>
    const mainEl = document.querySelector('main.main') || document.querySelector('main');
    if (mainEl) {
        mainEl.insertAdjacentHTML('beforebegin', sidebarHtml);
    } else {
        document.body.insertAdjacentHTML('afterbegin', sidebarHtml);
    }

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => Auth.logout());

    // Fetch live count and update badge
    api('/matches/live').then(r => {
        const badge = document.getElementById('sb-live-count');
        if (badge) {
            const count = r.data?.length || 0;
            badge.textContent = count;
            badge.style.display = count > 0 ? '' : 'none';
        }
    }).catch(() => { });
}
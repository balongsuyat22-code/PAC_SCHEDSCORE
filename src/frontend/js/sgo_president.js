/* ============================================================
   SGO PRESIDENT SIDEBAR — PAC SCHED-SCORE
   Standalone (not shared with admin/dean/referee).
   Role: sgo_president
   Icons: Font Awesome 6 (no emojis)
   ============================================================ */
const SGO_PRESIDENT_NAV = [
    { section: 'Overview' },
    { key: 'dashboard', icon: 'fa-solid fa-gauge-high', label: 'Dashboard', href: '/president/dashboard' },
    { key: 'live', icon: 'fa-solid fa-circle-play', label: 'Live Scores', href: '/president/live', badge: 'live' },
    { section: 'Tournament Ops' },
    { key: 'sports', icon: 'fa-solid fa-medal', label: 'Sports', href: '/president/sports' },
    { key: 'bracketing', icon: 'fa-solid fa-trophy', label: 'Bracketing', href: '/president/bracketing' },
    { key: 'game-setup', icon: 'fa-solid fa-screwdriver-wrench', label: 'Game Setup', href: '/president/game-setup' },
    // Game Assignment was retired and merged into Schedule Management (see
    // game-assignment.html — now just a redirect stub) since it was almost
    // entirely the same match list/modal with a different default filter.
    // One nav item covering both instead of two that did nearly the same
    // thing.
    { key: 'schedule', icon: 'fa-solid fa-calendar-days', label: 'Schedule & Officers', href: '/president/schedule' },
    { key: 'venues', icon: 'fa-solid fa-location-dot', label: 'Venue Management', href: '/president/venues' },
    { section: 'Comms & Reports' },
    { key: 'reports', icon: 'fa-solid fa-file-lines', label: 'Reports', href: '/president/reports' },
    { key: 'notifications', icon: 'fa-solid fa-bell', label: 'Announcements', href: '/president/notifications' },
];

// Flag to prevent multiple sidebar renders
let sidebarRendered = false;

function renderSidebar(activePage) {
    if (sidebarRendered) {
        console.log('Sidebar already rendered, skipping...');
        return;
    }
    const user = Auth.getUser();
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
            <button class="logout-btn" id="logout-btn" title="Logout">
                <i class="fa-solid fa-right-from-bracket"></i>
            </button>
        </div>
    </div>
</aside>`;

    const existingSidebar = document.getElementById('app-sidebar');
    if (existingSidebar) existingSidebar.remove();

    const mainEl = document.querySelector('main.main') || document.querySelector('main');
    if (mainEl) {
        mainEl.insertAdjacentHTML('beforebegin', sidebarHtml);
    } else {
        document.body.insertAdjacentHTML('afterbegin', sidebarHtml);
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', confirmSgoPresidentLogout);
    }

    document.querySelectorAll('.sidebar-nav .nav-item').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if (href) {
                window.history.pushState({}, '', href);
                document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
                    el.classList.remove('active');
                });
                this.classList.add('active');
                window.location.href = href;
            }
        });
    });

    sidebarRendered = true;
}

function confirmSgoPresidentLogout() {
    document.querySelector('.logout-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'logout-overlay show';
    overlay.innerHTML = `
        <div class="logout-modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
            <div class="logout-modal-icon">
                <i class="fa-solid fa-right-from-bracket"></i>
            </div>
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
    api('/matches/live').then(r => {
        const badge = document.getElementById('sb-live-count');
        if (!badge) return;
        const count = r.data?.length || 0;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }).catch(() => { });
}

document.addEventListener('DOMContentLoaded', function () {
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/president') || currentPath.startsWith('/SGO_PRESIDENT')) {
        const activePage = currentPath.split('/').pop() || 'dashboard';
        const cleanPage = activePage.replace('.html', '');
        const pageMap = {
            'dashboard': 'dashboard',
            'sports': 'sports',
            'bracketing': 'bracketing',
            'game-setup': 'game-setup',
            'schedule': 'schedule',
            'venues': 'venues',
            'assignment': 'schedule', // retired page, keep highlighting Schedule if somehow landed on
            'live': 'live',
            'live-scores': 'live',
            'reports': 'reports',
            'notifications': 'notifications',
        };
        renderSidebar(pageMap[cleanPage] || 'dashboard');
        updateLiveBadge();
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
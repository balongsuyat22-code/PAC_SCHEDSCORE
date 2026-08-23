let refereeMobileOpen = false;

let refereeSidebarCollapsed = localStorage.getItem('sf_sidebar_collapsed') === '1';

const ICONS = {
    trophy: `<svg viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
    zap: `<svg viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    clipboard: `<svg viewBox="0 0 24 24"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
    history: `<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`,
    medal: `<svg viewBox="0 0 24 24"><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/></svg>`,
    users: `<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    logout: `<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`,
    chevronLeft: `<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>`,
    menu: `<svg viewBox="0 0 24 24"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>`,
    x: `<svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
    bell: `<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
    check: `<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>`,
    alert: `<svg viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    clock: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    play: `<svg viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`,
    inbox: `<svg viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
    mapPin: `<svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    activity: `<svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
};

function icon(name, cls = '') {
    return `<span class="icon ${cls}">${ICONS[name] || ''}</span>`;
}

function renderRefereeSidebar(currentPage = '') {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const navGroups = [
        {
            section: 'My Work',
            links: [
                { id: 'scoring', label: 'Live Scoring', icon: 'zap', path: '/referee/scoring' },
                { id: 'matches', label: 'My Assignments', icon: 'clipboard', path: '/referee/matches' },
                { id: 'schedule', label: "Today's Schedule", icon: 'calendar', path: '/referee/schedule' },
            ]
        },
        {
            section: 'Insights',
            links: [
                { id: 'leaderboard', label: 'Leaderboard', icon: 'trophy', path: '/referee/leaderboard' },
                { id: 'history', label: 'Match History', icon: 'history', path: '/referee/history' },
                { id: 'tournaments', label: 'Tournaments', icon: 'medal', path: '/referee/tournaments' },
            ]
        }
    ];

    const currentPath = window.location.pathname;
    let navHtml = '';
    navGroups.forEach(group => {
        navHtml += `<div class="nav-section-title">${group.section}</div>`;
        group.links.forEach(link => {
            const active = (currentPath === link.path || currentPage === link.id) ? 'active' : '';
            navHtml += `
            <a href="${link.path}" class="nav-item ${active}" title="${link.label}">
                <span class="nav-icon">${ICONS[link.icon]}</span>
                <span>${link.label}</span>
            </a>`;
        });
    });

    const user = Auth.getUser();
    const name = user
        ? (`${user.first_name || ''} ${user.last_name || ''}`).trim() || user.username || 'Referee'
        : 'Referee';
    const avatar = (user?.first_name?.[0] || user?.username?.[0] || 'R').toUpperCase();

    sidebar.innerHTML = `
        <div class="sidebar-logo">
            <div class="logo-mark">${ICONS.trophy}</div>
            <div class="sidebar-logo-text">PAC<span> SCHED-SCORE</span></div>
            <button class="sidebar-close-btn" onclick="toggleSidebar()" aria-label="Close menu">${ICONS.x}</button>
        </div>
        <div class="sidebar-role-badge">Referee Mode</div>
        <nav class="sidebar-nav">${navHtml}</nav>
        <div class="sidebar-footer">
            <div class="user-card">
                <div class="user-avatar" id="sb-avatar">${avatar}</div>
                <div class="user-info">
                    <div class="user-name" id="sb-name">${name}</div>
                    <div class="user-role" id="sb-role">Referee</div>
                </div>
                <button class="logout-btn" id="logout-btn" title="Logout">
                    ${ICONS.logout}
                </button>
            </div>
        </div>
    `;

    document.getElementById('logout-btn')?.addEventListener('click', confirmRefereeLogout);

    if (refereeSidebarCollapsed) {
        sidebar.classList.add('collapsed');
        document.querySelector('.main')?.classList.add('sidebar-collapsed');
    }
}

function confirmRefereeLogout() {
    document.querySelector('.logout-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'logout-overlay show';
    overlay.innerHTML = `
        <div class="logout-modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
            <div class="logout-modal-icon">${ICONS.logout}</div>
            <div class="logout-modal-title">Sign Out</div>
            <div class="logout-modal-text">Are you sure you want to leave your referee session?</div>
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

async function renderRefereeTopbar() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;

    const user = Auth.getUser();
    const firstName = (user && user.first_name) ? user.first_name : 'Referee';
    const lastName = (user && user.last_name) ? user.last_name : 'User';
    const initials = (firstName[0] || 'R').toUpperCase();

    topbar.innerHTML = `
        <div class="topbar-left">
            <button class="burger-menu" onclick="toggleSidebar()" aria-label="Open menu">${ICONS.menu}</button>
        </div>
        <div class="topbar-right">
            <span id="sf-conn-dot" title="Connecting…"
                  style="width:8px;height:8px;border-radius:50%;background:var(--muted);flex-shrink:0;
                         box-shadow:0 0 0 3px rgba(34,197,94,0.12);margin-right:4px;align-self:center"></span>
            <div class="nav-notification-container">
                <div class="nav-bell" onclick="window.toggleNotifDropdown(event)" role="button" aria-label="Notifications">
                    ${ICONS.bell}
                    <span id="notif-badge">0</span>
                </div>
                <div id="notif-dropdown">
                    <div class="notif-header-row">
                        <span class="notif-header-title">${ICONS.bell} Alert Center</span>
                        <span class="notif-mark-read" onclick="markAllRead(event)">Mark all read</span>
                    </div>
                    <div id="notif-list"></div>
                    <div class="notif-footer">
                        <a href="/referee/matches">View all alerts</a>
                    </div>
                </div>
            </div>
            <div class="user-pill">
                <div class="user-pill-avatar">${initials}</div>
                <span class="user-pill-name">${firstName} ${lastName}</span>
            </div>
        </div>
    `;

    if (!document.getElementById('sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        overlay.onclick = toggleSidebar;
        document.body.appendChild(overlay);
    }

    fetchNotifications();
    setInterval(fetchNotifications, 60000);

    // Live socket — joins user_/role_ rooms; toasts on notification:new
    if (typeof Realtime !== 'undefined') {
        Realtime.connect().catch(() => { });
        window.addEventListener('sf:notif', () => { fetchNotifications(); });
        window.addEventListener('sf:match', () => { fetchNotifications(); });
    }
}

function toggleRefereeCollapse() {
    refereeSidebarCollapsed = !refereeSidebarCollapsed;
    localStorage.setItem('sf_sidebar_collapsed', refereeSidebarCollapsed ? '1' : '0');
    document.getElementById('sidebar')?.classList.toggle('collapsed', refereeSidebarCollapsed);
    document.querySelector('.main')?.classList.toggle('sidebar-collapsed', refereeSidebarCollapsed);
}

function toggleSidebar() {
    refereeMobileOpen = !refereeMobileOpen;
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('sidebar-open', refereeMobileOpen);
    if (overlay) overlay.style.display = refereeMobileOpen ? 'block' : 'none';
}

const DISMISS_KEY = 'sf_dismissed_notifs';
const DISMISS_TTL = 12 * 60 * 60 * 1000;

function getDismissedNotifs() {
    try {
        const raw = JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}');
        const now = Date.now();
        const pruned = {};
        Object.keys(raw).forEach(id => {
            if (now - raw[id] < DISMISS_TTL) pruned[id] = raw[id];
        });
        return pruned;
    } catch {
        return {};
    }
}

function dismissNotif(notifId) {
    const dismissed = getDismissedNotifs();
    dismissed[notifId] = Date.now();
    localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed));

    // Mark server notification as read
    if (String(notifId).startsWith('db_')) {
        const id = String(notifId).replace('db_', '');
        api('/notifications/' + id + '/read', { method: 'PATCH' }).catch(() => { });
    }
}

window.dismissMatchNotifications = function (matchId) {
    ['ongoing', 'scheduled'].forEach(status => dismissNotif(`match_${matchId}_${status}`));
    fetchNotifications();
};

async function fetchNotifications() {
    const user = Auth.getUser();
    if (!user) return;
    try {
        // 1) Server-persisted notifications (assignments, etc.)
        let serverNotifs = [];
        try {
            const sn = await api('/notifications?limit=20');
            if (sn.success && Array.isArray(sn.data)) {
                const dismissedEarly = getDismissedNotifs();
                serverNotifs = sn.data
                    .filter(n => !n.is_read)
                    .map(n => ({
                        id: `db_${n.id}`,
                        icon: n.type === 'schedule' ? 'calendar'
                            : (n.type === 'score' ? 'activity'
                                : (n.type === 'result' ? 'check' : 'bell')),
                        title: n.title,
                        message: n.message,
                        link: n.link || '/referee/matches',
                        weight: n.severity === 'critical' ? 8
                            : (n.severity === 'live' ? 6
                                : (n.severity === 'warning' ? 5 : 4)),
                        color: n.severity === 'critical' ? '#E8323B'
                            : (n.severity === 'live' || n.severity === 'success' ? '#22C55E'
                                : (n.severity === 'warning' ? '#F5B800' : '#3B82F6')),
                        cls: n.severity === 'critical' ? 'ni-red'
                            : (n.severity === 'live' || n.severity === 'success' ? 'ni-green'
                                : 'ni-gold'),
                        time: n.created_at
                            ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '',
                        _serverId: n.id,
                    }))
                    .filter(n => !dismissedEarly[n.id]);
            }
        } catch (_) { /* optional — table may not exist yet */ }

        // 2) Derived alerts from assigned matches
        const res = await api(`/matches?referee_id=${user.id}`);
        if (!res.success || !res.data) {
            renderNotificationList(serverNotifs);
            return;
        }

        const now = new Date();
        const dismissed = getDismissedNotifs();
        const notifications = [];
        const currentTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        res.data.forEach(m => {
            const notifId = `match_${m.id}_${m.status}`;
            const nameA = m.team_a_name || m.dept_a_name || 'TBD';
            const nameB = m.team_b_name || m.dept_b_name || 'TBD';
            const isFFA = (m.tournament_format || '').toLowerCase() === 'free_for_all' ||
                (m.tournament_format || '').toLowerCase() === 'team_ranking';
            const matchup = isFFA ? (m.tournament_name || 'FFA Event') : `${nameA} vs ${nameB}`;

            if ((m.status === 'scheduled' || m.status === 'pending') && !m.venue_name) {
                const venueNotifId = `match_${m.id}_novenue`;
                if (!dismissed[venueNotifId]) {
                    notifications.push({
                        id: venueNotifId, icon: 'mapPin', title: 'No Venue Assigned',
                        message: `${matchup} has no venue set yet — check with the SGO President.`,
                        link: '/referee/matches', weight: 3, color: '#F5B800', cls: 'ni-gold', time: currentTimeStr
                    });
                }
            }

            if (dismissed[notifId]) return;

            if (m.status === 'cancelled') {
                notifications.push({
                    id: notifId, icon: 'x', title: 'Match Cancelled',
                    message: `${matchup} was cancelled.`,
                    link: '/referee/matches', weight: 4, color: '#E8323B', cls: 'ni-red', time: currentTimeStr
                });
            } else if (m.status === 'completed') {
                notifications.push({
                    id: notifId, icon: 'check', title: 'Scores Finalised',
                    message: `${matchup} is complete.`,
                    link: '/referee/history', weight: 1, color: '#22C55E', cls: 'ni-green', time: currentTimeStr
                });
            } else if (m.status === 'ongoing') {
                notifications.push({
                    id: notifId, icon: 'activity', title: 'Match LIVE',
                    message: `Active: ${matchup}.`,
                    link: `/referee/scoring?id=${m.id}`, weight: 6, color: '#22C55E', cls: 'ni-green pulse', time: currentTimeStr
                });
            } else if (m.status === 'scheduled' && m.scheduled_date) {
                const matchTime = new Date(`${m.scheduled_date}T${m.scheduled_time || '00:00'}`);
                const diff = (matchTime - now) / 60000;
                if (diff < 0) {
                    notifications.push({
                        id: notifId, icon: 'alert', title: 'Match Overdue',
                        message: `${matchup} was scheduled for ${m.scheduled_time || 'TBD'}. Start the match.`,
                        link: `/referee/scoring?id=${m.id}`, weight: 7, color: '#E8323B', cls: 'ni-red pulse', time: currentTimeStr
                    });
                } else if (diff <= 30) {
                    notifications.push({
                        id: notifId, icon: 'clock', title: 'Starting Soon',
                        message: `${matchup} in ${Math.max(1, Math.round(diff))} min.`,
                        link: `/referee/scoring?id=${m.id}`, weight: 5, color: '#F5B800', cls: 'ni-gold', time: currentTimeStr
                    });
                } else {
                    notifications.push({
                        id: notifId, icon: 'calendar', title: 'Upcoming Match',
                        message: `Assigned: ${matchup}.`,
                        link: '/referee/matches', weight: 2, color: '#F5B800', cls: 'ni-gold', time: currentTimeStr
                    });
                }
            }
        });

        // Merge server notifs (skip duplicates)
        const seen = new Set(notifications.map(n => n.id));
        serverNotifs.forEach(n => {
            if (!seen.has(n.id)) notifications.push(n);
        });

        renderNotificationList(notifications);
    } catch (err) {
        console.error('Notification fetch error:', err);
    }
}

function isOverdue(m, now) {
    if (!m.scheduled_date) return false;
    const matchTime = new Date(`${m.scheduled_date}T${m.scheduled_time || '00:00'}`);
    return matchTime < now;
}

function renderNotificationList(notifications) {
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notif-list');
    if (!badge || !list) return;

    notifications.sort((a, b) => b.weight - a.weight);

    if (notifications.length > 0) {
        badge.style.display = 'flex';
        badge.textContent = notifications.length > 99 ? '99+' : notifications.length;
        list.innerHTML = notifications.map(n => `
            <div class="notif-item ${n.cls}" onclick="window.location.href='${n.link}'">
                <div class="notif-item-icon ${n.cls}">${ICONS[n.icon] || ICONS.bell}</div>
                <div class="notif-item-body">
                    <div class="notif-item-title">
                        <span style="color:${n.color}">${n.title}</span>
                        <span class="notif-item-time">${n.time}</span>
                    </div>
                    <div class="notif-item-msg">${n.message}</div>
                </div>
                <button class="notif-item-dismiss" title="Dismiss" aria-label="Dismiss"
                    onclick="event.stopPropagation(); dismissNotif('${n.id}'); fetchNotifications();">${ICONS.x}</button>
            </div>`).join('');
    } else {
        badge.style.display = 'none';
        list.innerHTML = `<div class="notif-empty">You're all caught up</div>`;
    }
}

window.toggleNotifDropdown = function (event) {
    if (event) event.stopPropagation();
    const dd = document.getElementById('notif-dropdown');
    if (!dd) return;
    const isOpen = dd.classList.contains('open');
    dd.classList.toggle('open', !isOpen);
    dd.style.display = isOpen ? 'none' : 'flex';
};

window.markAllRead = async function (event) {
    if (event) event.stopPropagation();

    try {
        // Mark all server notifications read
        await api('/notifications/read-all', { method: 'PATCH' }).catch(() => { });

        const user = Auth.getUser();
        if (user) {
            const res = await api(`/matches?referee_id=${user.id}`);
            if (res.success && res.data) {
                res.data.forEach(m => {
                    dismissNotif(`match_${m.id}_${m.status}`);
                    dismissNotif(`match_${m.id}_novenue`);
                });
            }
        }
    } catch (err) {
        console.error('markAllRead error:', err);
    }
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
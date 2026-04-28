
let refereeSidebarCollapsed = false;
let refereeMobileOpen = false;

// ─── 1. INJECT STYLES ───────────────────────────────────────────────────────
(function injectRefereeStyles() {
    if (document.getElementById('referee-sidebar-styles')) return;
    const style = document.createElement('style');
    style.id = 'referee-sidebar-styles';
    style.innerHTML = `

        /* ── SIDEBAR WIDTH & COLLAPSE ── */
        .sidebar {
            width: 220px;
            transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                        transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar.collapsed { width: 60px; }

        /* ── MAIN CONTENT — keeps in sync with sidebar width ── */
        .main {
            margin-left: 220px;
            transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .main.sidebar-collapsed { margin-left: 60px; }

        /* ── LOGO TEXT ── */
        .sidebar-logo-text {
            transition: opacity 0.2s, max-width 0.3s;
            overflow: hidden; max-width: 160px; white-space: nowrap;
        }
        .sidebar.collapsed .sidebar-logo-text { opacity: 0; max-width: 0; }

        /* ── NAV ITEMS ── */
        .nav-item {
            display: flex; align-items: center; gap: 10px;
            padding: 10px 12px; border-radius: 8px;
            text-decoration: none; color: var(--text2);
            transition: all 0.18s; overflow: hidden; font-size: 14px;
        }
        .nav-item:hover { background: rgba(255,255,255,0.05); color: var(--text); }
        .nav-item.active { background: var(--gold-bg); color: var(--gold); }

        .nav-icon { font-size: 17px; flex-shrink: 0; width: 22px; text-align: center; }

        .nav-item span:not(.nav-icon) {
            transition: opacity 0.2s, max-width 0.3s;
            overflow: hidden; max-width: 160px; white-space: nowrap;
        }
        .sidebar.collapsed .nav-item span:not(.nav-icon) { opacity: 0; max-width: 0; }

        /* ── SECTION TITLES ── */
        .nav-section-title {
            font-size: 10px; font-weight: 700; letter-spacing: 2px;
            text-transform: uppercase; color: var(--muted);
            padding: 12px 12px 4px;
            transition: opacity 0.15s, height 0.2s;
            overflow: hidden; white-space: nowrap;
        }
        .sidebar.collapsed .nav-section-title { opacity: 0; height: 0; padding: 0; }

        /* ── ROLE BADGE ── */
        .sidebar-role-badge {
            margin: 12px 10px 4px;
            padding: 7px 10px; text-align: center;
            background: rgba(245,184,0,0.1); color: var(--gold);
            border-radius: 8px; font-weight: 700; font-size: 11px;
            letter-spacing: 0.5px; white-space: nowrap; overflow: hidden;
            transition: opacity 0.2s, margin 0.2s, padding 0.2s, height 0.2s;
        }
        .sidebar.collapsed .sidebar-role-badge { opacity: 0; height: 0; margin: 0; padding: 0; }

        /* ── COLLAPSE BUTTON ── */
        .collapse-btn {
            width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
            padding: 7px 10px; background: none; border: 1px solid var(--border);
            border-radius: 8px; color: var(--muted); font-size: 12px; font-weight: 600;
            cursor: pointer; transition: all 0.18s; margin-bottom: 8px; overflow: hidden;
        }
        .collapse-btn:hover { color: var(--text); border-color: var(--border-gold); }
        .collapse-arrow { transition: transform 0.3s; font-size: 11px; flex-shrink: 0; }
        .sidebar.collapsed .collapse-arrow { transform: rotate(180deg); }
        .collapse-label {
            transition: opacity 0.2s, max-width 0.3s;
            max-width: 100px; overflow: hidden; white-space: nowrap;
        }
        .sidebar.collapsed .collapse-label { opacity: 0; max-width: 0; }

        /* ── LOGOUT BUTTON ── */
        .sidebar-logout-btn {
            width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
            padding: 10px; background: rgba(229,57,53,0.1); color: #E8323B;
            border: none; border-radius: 8px; cursor: pointer;
            font-size: 14px; font-family: 'Barlow', sans-serif; font-weight: 600;
            overflow: hidden; transition: background 0.18s;
        }
        .sidebar-logout-btn:hover { background: rgba(229,57,53,0.18); }
        .logout-icon { font-size: 16px; flex-shrink: 0; }
        .logout-text {
            transition: opacity 0.2s, max-width 0.3s;
            max-width: 100px; overflow: hidden; white-space: nowrap;
        }
        .sidebar.collapsed .logout-text { opacity: 0; max-width: 0; }

        /* ── NOTIFICATION COLOURS ── */
        .ni-blue  { background: rgba(59,130,246,0.1)  !important; }
        .ni-green { background: rgba(34,197,94,0.1)   !important; }
        .ni-gold  { background: rgba(245,184,0,0.1)   !important; }
        .ni-red   { background: rgba(232,50,59,0.1)   !important; }
        @keyframes pulse-notif {
            0%   { box-shadow: 0 0 0 0   rgba(232,50,59,0.4); }
            50%  { box-shadow: 0 0 0 6px rgba(232,50,59,0);   }
            100% { box-shadow: 0 0 0 0   rgba(232,50,59,0);   }
        }
        .pulse { animation: pulse-notif 2s infinite; }

        /* ── NOTIF BELL BUTTON ── */
        .nav-bell {
            cursor: pointer; width: 36px; height: 36px;
            background: var(--bg3); border: 1px solid var(--border); border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            position: relative; font-size: 17px; transition: border-color 0.18s;
        }
        .nav-bell:hover { border-color: var(--border-gold); }

        /* ── NOTIF DROPDOWN ── */
        #notif-dropdown {
            display: none; position: absolute; top: 120%; right: 0;
            width: 320px; max-width: 90vw; max-height: 440px;
            overflow-y: auto; background: var(--bg2);
            border: 1px solid var(--border); border-radius: 12px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.7); z-index: 9999;
        }
        .notif-header-row {
            display: flex; justify-content: space-between; align-items: center;
            padding: 13px 16px; border-bottom: 1px solid var(--border);
            background: var(--bg3); position: sticky; top: 0;
        }
        .notif-header-title {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 15px; font-weight: 800; letter-spacing: 1px; color: var(--text);
        }
        .notif-mark-read { font-size: 11px; cursor: pointer; color: var(--gold); font-weight: 600; }
        .notif-mark-read:hover { text-decoration: underline; }
        #notif-list { max-height: 330px; overflow-y: auto; }
        .notif-item {
            display: flex; gap: 12px; padding: 12px 16px;
            border-bottom: 1px solid rgba(255,255,255,0.04);
            cursor: pointer; transition: filter 0.15s;
        }
        .notif-item:hover { filter: brightness(1.15); }
        .notif-item:last-child { border-bottom: none; }
        .notif-item-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
        .notif-item-body { flex: 1; }
        .notif-item-title { font-weight: 700; font-size: 13px; margin-bottom: 2px; }
        .notif-item-msg { font-size: 12px; color: var(--text2); line-height: 1.4; }
        .notif-footer {
            padding: 10px; text-align: center;
            border-top: 1px solid var(--border); background: var(--bg3);
        }
        .notif-footer a { color: var(--gold); font-size: 12px; font-weight: 600; text-decoration: none; }
        .notif-footer a:hover { text-decoration: underline; }

        /* ── LOGOUT MODAL ── */
        .logout-overlay {
            display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85);
            backdrop-filter: blur(5px); z-index: 10000;
            align-items: center; justify-content: center;
        }
        .logout-overlay.show { display: flex; }
        .logout-modal {
            background: var(--bg2); border: 1px solid var(--border);
            border-radius: 16px; width: 320px; padding: 28px 24px;
            text-align: center; box-shadow: 0 24px 60px rgba(0,0,0,0.6);
            animation: modalIn 0.2s ease;
        }
        @keyframes modalIn { from { transform: scale(0.92); opacity:0; } to { transform: scale(1); opacity:1; } }
        .logout-modal-icon { font-size: 44px; margin-bottom: 14px; }
        .logout-modal-title {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 26px; font-weight: 900; letter-spacing: 1px; margin-bottom: 8px;
        }
        .logout-modal-text { font-size: 14px; color: var(--text2); margin-bottom: 24px; line-height: 1.5; }
        .logout-modal-actions { display: flex; gap: 10px; }
        .logout-cancel-btn {
            flex: 1; padding: 11px; border-radius: 8px;
            background: var(--bg3); border: 1px solid var(--border);
            color: var(--text2); font-family: 'Barlow Condensed', sans-serif;
            font-size: 15px; font-weight: 700; cursor: pointer; transition: 0.18s;
            text-transform: uppercase;
        }
        .logout-cancel-btn:hover { color: var(--text); border-color: var(--border-gold); }
        .logout-confirm-btn {
            flex: 1; padding: 11px; border-radius: 8px;
            background: var(--red); border: none;
            color: #fff; font-family: 'Barlow Condensed', sans-serif;
            font-size: 15px; font-weight: 700; cursor: pointer; transition: 0.18s;
            text-transform: uppercase;
        }
        .logout-confirm-btn:hover { background: #c0282f; }

        /* ── MOBILE ── */
        @media (max-width: 900px) {
            .sidebar { transform: translateX(-100%); width: 220px !important; }
            .sidebar.sidebar-open { transform: translateX(0); }
            .main { margin-left: 0 !important; }
            .burger-menu { display: block !important; }
        }
        @media (max-width: 400px) {
            #notif-dropdown { width: 280px !important; right: -16px !important; }
        }

        /* ── BURGER ALWAYS HIDDEN ON DESKTOP ── */
        @media (min-width: 901px) {
            .burger-menu { display: none !important; }
            .sidebar-close-btn { display: none !important; }
        }
            /* ── TOAST FIX ── */
.toast {
    position: fixed !important;
    top: 20px !important;
    right: 20px !important;
    max-width: 380px !important; /* Limits the width so it doesn't take 1/3 of screen */
    width: auto !important;
    z-index: 10001 !important;
    padding: 12px 16px !important;
    border-radius: 12px !important;
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3) !important;
    animation: slideInToast 0.3s ease-out;
}

@keyframes slideInToast {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
    `;
    document.head.appendChild(style);
})();

// ─── 2. RESTORE COLLAPSE STATE ──────────────────────────────────────────────
(function restoreCollapseState() {
    if (localStorage.getItem('sf_sidebar_collapsed') === '1') {
        refereeSidebarCollapsed = true;
        // Applied after sidebar is rendered — see renderRefereeSidebar()
    }
})();

// ─── 3. RENDER SIDEBAR ──────────────────────────────────────────────────────
function renderRefereeSidebar(currentPage = '') {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const user = Auth.getUser() || { first_name: 'Referee', last_name: 'User', role: 'referee' };

    const navGroups = [
        {
            section: 'My Work',
            links: [
                { id: 'scoring', label: 'Live Scoring', icon: '⚡', path: 'scoring.html' },
                { id: 'matches', label: 'My Assignments', icon: '📋', path: 'matches.html' },
                { id: 'schedule', label: "Today's Schedule", icon: '📅', path: 'schedule.html' },
            ]
        },
        {
            section: 'Insights',
            links: [
                { id: 'leaderboard', label: 'Leaderboard', icon: '🏆', path: 'leaderboard.html' },
                { id: 'history', label: 'Match History', icon: '📜', path: 'history.html' },
                { id: 'tournaments', label: 'Tournaments', icon: '🏅', path: 'tournaments.html' },
            ]
        }
    ];

    const currentPath = window.location.pathname.split('/').pop();

    let navHtml = '';
    navGroups.forEach(group => {
        navHtml += `<div class="nav-section-title">${group.section}</div>`;
        group.links.forEach(link => {
            const active = (currentPath === link.path || currentPage === link.id) ? 'active' : '';
            navHtml += `
                <a href="${link.path}" class="nav-item ${active}">
                    <span class="nav-icon">${link.icon}</span>
                    <span>${link.label}</span>
                </a>`;
        });
    });

    sidebar.innerHTML = `
        <div class="sidebar-logo" style="display:flex; align-items:center; gap:10px; padding:16px 14px; border-bottom:1px solid var(--border); position:relative;">
            <div class="logo-icon" style="width:34px; height:34px; background:var(--gold); border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:16px;">🏆</div>
            <div class="sidebar-logo-text" style="font-family:'Barlow Condensed',sans-serif; font-size:20px; font-weight:900; color:var(--text); text-transform:uppercase; letter-spacing:0.5px;">
                PAC<span style="color:var(--gold);"> SCHED-SCORE</span>
            </div>
            <button class="sidebar-close-btn" onclick="toggleSidebar()" style="margin-left:auto; background:none; border:none; color:var(--muted); font-size:20px; cursor:pointer; flex-shrink:0; padding:0 0 0 6px;">✕</button>
        </div>

        <div class="sidebar-role-badge">🟡 &nbsp;Referee Mode</div>

        <nav class="sidebar-nav" style="flex:1; padding:6px 10px; overflow-y:auto;">
            ${navHtml}
        </nav>

        <div class="sidebar-footer" style="padding:12px; border-top:1px solid var(--border);">
            <button class="collapse-btn" onclick="toggleRefereeCollapse()">
                <span class="collapse-arrow">◀</span>
                <span class="collapse-label">Collapse</span>
            </button>
            <button class="sidebar-logout-btn" onclick="confirmLogout()">
                <span class="logout-icon">🚪</span>
                <span class="logout-text">Sign Out</span>
            </button>
        </div>
    `;

    // Re-apply saved collapse state
    if (refereeSidebarCollapsed) {
        sidebar.classList.add('collapsed');
        document.querySelector('.main')?.classList.add('sidebar-collapsed');
    }
}

// ─── 4. RENDER TOPBAR ───────────────────────────────────────────────────────
async function renderRefereeTopbar() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;

    const user = Auth.getUser();
    const firstName = (user && user.first_name) ? user.first_name : 'Referee';
    const lastName = (user && user.last_name) ? user.last_name : 'User';
    const initials = firstName[0].toUpperCase();

    topbar.innerHTML = `
        <div class="topbar-left">
            <button class="burger-menu" onclick="toggleSidebar()" style="display:none; background:none; border:none; color:var(--text); font-size:22px; cursor:pointer; padding:4px 8px;">☰</button>
        </div>

        <div class="topbar-right" style="display:flex; align-items:center; gap:14px;">

            <!-- Notification Bell -->
            <div class="nav-notification-container" style="position:relative;">
                <div class="nav-bell" onclick="window.toggleNotifDropdown(event)">
                    🔔
                    <span id="notif-badge" style="display:none; position:absolute; top:-5px; right:-5px; background:#E8323B; color:#fff; font-size:10px; font-weight:800; min-width:17px; height:17px; border-radius:50%; align-items:center; justify-content:center; pointer-events:none;">0</span>
                </div>

                <div id="notif-dropdown">
                    <div class="notif-header-row">
                        <span class="notif-header-title">🔔 Alert Center</span>
                        <span class="notif-mark-read" onclick="markAllRead(event)">Mark all read</span>
                    </div>
                    <div id="notif-list"></div>
                    <div class="notif-footer">
                        <a href="profile.html">View all alerts →</a>
                    </div>
                </div>
            </div>

            <!-- User Pill -->
            <div style="display:flex; align-items:center; gap:9px; background:var(--bg3); padding:5px 12px 5px 5px; border-radius:50px; border:1px solid var(--border);">
                <div style="width:30px; height:30px; background:var(--gold); color:#000; font-weight:800; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-family:'Barlow Condensed',sans-serif;">${initials}</div>
                <span style="font-size:13px; font-weight:600; color:var(--text); font-family:'Barlow Condensed',sans-serif; white-space:nowrap;">${firstName} ${lastName}</span>
            </div>
        </div>
    `;

    // Inject sidebar overlay (once)
    if (!document.getElementById('sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(3px); z-index:1500; display:none;';
        overlay.onclick = toggleSidebar;
        document.body.appendChild(overlay);
    }

    fetchNotifications();
    setInterval(fetchNotifications, 60000);
}

// ─── 5. SIDEBAR COLLAPSE (DESKTOP) ──────────────────────────────────────────
function toggleRefereeCollapse() {
    refereeSidebarCollapsed = !refereeSidebarCollapsed;
    localStorage.setItem('sf_sidebar_collapsed', refereeSidebarCollapsed ? '1' : '0');
    document.getElementById('sidebar')?.classList.toggle('collapsed', refereeSidebarCollapsed);
    document.querySelector('.main')?.classList.toggle('sidebar-collapsed', refereeSidebarCollapsed);
}

// ─── 6. SIDEBAR OPEN/CLOSE (MOBILE) ─────────────────────────────────────────
function toggleSidebar() {
    refereeMobileOpen = !refereeMobileOpen;
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('sidebar-open', refereeMobileOpen);
    if (overlay) overlay.style.display = refereeMobileOpen ? 'block' : 'none';
}

async function fetchNotifications() {
    const user = Auth.getUser();
    if (!user) return;

    try {
        const res = await api(`/matches?referee_id=${user.id}`);
        if (!res.success || !res.data) return;

        const now = new Date();
        const dismissed = JSON.parse(localStorage.getItem('sf_notifs_dismissed') || '[]');
        const notifications = [];
        const currentTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        res.data.forEach(m => {
            const notifId = `match_${m.id}_${m.status}`;
            if (dismissed.includes(notifId)) return;

            const nameA = m.team_a_name || m.dept_a_name || 'TBD';
            const nameB = m.team_b_name || m.dept_b_name || 'TBD';

            if (m.status === 'cancelled') {
                notifications.push({ id: notifId, icon: '❌', title: 'Match Cancelled', message: `${nameA} vs ${nameB} was cancelled.`, link: 'matches.html', weight: 4, color: '#E8323B', cls: 'ni-red', time: currentTimeStr });
            } else if (m.status === 'completed') {
                notifications.push({ id: notifId, icon: '✅', title: 'Scores Finalised', message: `${nameA} vs ${nameB} is complete.`, link: 'history.html', weight: 1, color: '#22C55E', cls: 'ni-green', time: currentTimeStr });
            } else if (m.status === 'ongoing') {
                notifications.push({ id: notifId, icon: '🟢', title: 'Match LIVE', message: `Active: ${nameA} vs ${nameB}.`, link: `scoring.html?id=${m.id}`, weight: 6, color: '#22C55E', cls: 'ni-green pulse', time: currentTimeStr });
            } else if (m.status === 'scheduled' && m.scheduled_date) {
                const matchTime = new Date(`${m.scheduled_date}T${m.scheduled_time}`);
                const diff = (matchTime - now) / 60000; // Difference in minutes

                if (diff < 0) {
                    // 🚨 MATCH IS OVERDUE (Past scheduled time but not started)
                    notifications.push({
                        id: notifId,
                        icon: '🚨',
                        title: 'Match Overdue!',
                        message: `${nameA} vs ${nameB} was scheduled for ${m.scheduled_time}. Please start match!`,
                        link: `scoring.html?id=${m.id}`,
                        weight: 7, // Highest priority
                        color: '#E8323B',
                        cls: 'ni-red pulse',
                        time: currentTimeStr
                    });
                } else if (diff <= 30) {
                    // ⏰ MATCH STARTING SOON (Within 30 mins)
                    notifications.push({
                        id: notifId,
                        icon: '⏰',
                        title: 'Starting Soon',
                        message: `${nameA} vs ${nameB} in ${Math.round(diff)} min.`,
                        link: `scoring.html?id=${m.id}`,
                        weight: 5,
                        color: '#F5B800',
                        cls: 'ni-gold',
                        time: currentTimeStr
                    });
                } else {
                    // 📅 UPCOMING MATCH
                    notifications.push({
                        id: notifId,
                        icon: '📅',
                        title: 'Upcoming Match',
                        message: `Assigned: ${nameA} vs ${nameB}.`,
                        link: 'matches.html',
                        weight: 2,
                        color: '#F5B800',
                        cls: 'ni-gold',
                        time: currentTimeStr
                    });
                }
            }
        });

        renderNotificationList(notifications);
    } catch (err) {
        console.error('Notification fetch error:', err);
    }
}

function renderNotificationList(notifications) {
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notif-list');
    if (!badge || !list) return;

    notifications.sort((a, b) => b.weight - a.weight);

    if (notifications.length > 0) {
        badge.style.display = 'flex';
        badge.textContent = notifications.length;
        list.innerHTML = notifications.map(n => `
            <div class="notif-item ${n.cls}" onclick="window.location.href='${n.link}'">
                <div class="notif-item-icon">${n.icon}</div>
                <div class="notif-item-body">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div class="notif-item-title" style="color:${n.color};">${n.title}</div>
                        <div style="font-size:10px; color:var(--muted); font-family:monospace;">${n.time}</div>
                    </div>
                    <div class="notif-item-msg">${n.message}</div>
                </div>
            </div>`).join('');
    } else {
        badge.style.display = 'none';
        list.innerHTML = `<div style="padding:40px 20px; text-align:center; color:var(--muted); font-size:13px;">☕ You're all caught up!</div>`;
    }
}

function renderNotificationList(notifications) {
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notif-list');
    if (!badge || !list) return;

    notifications.sort((a, b) => b.weight - a.weight);

    if (notifications.length > 0) {
        badge.style.display = 'flex';
        badge.textContent = notifications.length;
        list.innerHTML = notifications.map(n => `
            <div class="notif-item ${n.cls}" onclick="window.location.href='${n.link}'">
                <div class="notif-item-icon">${n.icon}</div>
                <div class="notif-item-body">
                    <div class="notif-item-title" style="color:${n.color};">${n.title}</div>
                    <div class="notif-item-msg">${n.message}</div>
                </div>
            </div>`).join('');
    } else {
        badge.style.display = 'none';
        list.innerHTML = `<div style="padding:40px 20px; text-align:center; color:var(--muted); font-size:13px;">☕ You're all caught up!</div>`;
    }
}

window.toggleNotifDropdown = function (event) {
    if (event) event.stopPropagation();
    const dd = document.getElementById('notif-dropdown');
    if (dd) dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
};

window.markAllRead = function (event) {
    if (event) event.stopPropagation();
    // Collect all currently visible notif IDs and dismiss them
    const list = document.getElementById('notif-list');
    const ids = [];
    if (list) {
        list.querySelectorAll('.notif-item[onclick]').forEach(el => {
            // IDs are stored separately; just clear the visible list
        });
    }
    // Simplest approach: store a "cleared before" timestamp and skip older ones
    localStorage.setItem('sf_notifs_cleared_at', Date.now().toString());
    const badge = document.getElementById('notif-badge');
    if (badge) badge.style.display = 'none';
    if (list) list.innerHTML = `<div style="padding:40px 20px; text-align:center; color:var(--muted); font-size:13px;">☕ You're all caught up!</div>`;
};

// ─── 8. LOGOUT MODAL ─────────────────────────────────────────────────────────
function confirmLogout() {
    // Remove any existing modal first
    document.querySelector('.logout-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'logout-overlay show';
    overlay.innerHTML = `
        <div class="logout-modal" onclick="event.stopPropagation()">
            <div class="logout-modal-icon">🚪</div>
            <div class="logout-modal-title">Sign Out</div>
            <div class="logout-modal-text">Are you sure you want to leave your referee session?</div>
            <div class="logout-modal-actions">
                <button class="logout-cancel-btn"  onclick="this.closest('.logout-overlay').remove()">Cancel</button>
                <button class="logout-confirm-btn" onclick="Auth.logout()">Sign Out</button>
            </div>
        </div>
    `;
    // Click outside to cancel
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
}

// ─── 9. CLOSE NOTIF DROPDOWN ON OUTSIDE CLICK ────────────────────────────────
window.addEventListener('click', function (e) {
    const dd = document.getElementById('notif-dropdown');
    const bell = document.querySelector('.nav-bell');
    if (dd && bell && !bell.contains(e.target) && !dd.contains(e.target)) {
        dd.style.display = 'none';
    }
});
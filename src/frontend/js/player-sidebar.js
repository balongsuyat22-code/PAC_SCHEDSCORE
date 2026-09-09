let sidebarCollapsed = false;
let sidebarMobileOpen = false;
let playerProfileData = { user: null, department: null, matches: [] };
let playerNotifs = [];

const injectSidebarStyles = () => {
    if (document.getElementById('sf-sidebar-styles')) return;
    const style = document.createElement('style');
    style.id = 'sf-sidebar-styles';
    style.innerHTML = `
        /* ── SIDEBAR LAYOUT ── */
        .app-layout { display: flex; min-height: 100vh; }

        .sidebar { 
            width: 220px; background: var(--bg2); border-right: 1px solid var(--border); 
            display: flex; flex-direction: column; position: fixed; top: 0; left: 0; 
            height: 100vh; z-index: 300; 
            transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
            flex-shrink: 0; 
        }

        .sidebar.collapsed { width: 60px; }

        .sidebar-logo { 
            display: flex; align-items: center; gap: 10px; padding: 16px 14px 14px; 
            border-bottom: 1px solid var(--border); min-height: 64px; overflow: hidden; text-decoration: none; 
        }
        em{
            color: var(--gold);
            font-style: normal;}

        .sidebar-logo-icon { 
            width: 34px; height: 34px; background: var(--gold); border-radius: 8px; 
            display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; 
        }

        .sidebar-logo-text { 
            font-family: 'Bebas Neue', sans-serif; font-size: 19px; letter-spacing: 2.5px; 
            color: var(--text); white-space: nowrap; overflow: hidden; 
            transition: opacity 0.2s, max-width 0.3s; max-width: 160px; 
        }

        .sidebar.collapsed .sidebar-logo-text { opacity: 0; max-width: 0; }

        .sidebar-nav { flex: 1; padding: 10px 8px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; overflow-x: hidden; }

        .nav-section-label { 
            font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; 
            color: var(--muted); padding: 10px 10px 4px; white-space: nowrap; 
            overflow: hidden; transition: opacity 0.2s; 
        }

        .sidebar.collapsed .nav-section-label { opacity: 0; }

        .sidebar-nav-link { 
            display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 8px; 
            font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; 
            transition: all 0.18s; text-decoration: none; white-space: nowrap; overflow: hidden; 
            position: relative; border: 1px solid transparent; 
        }

        .sidebar-nav-link:hover { background: rgba(255, 255, 255, 0.05); color: var(--text); }

        .sidebar-nav-link.active { background: var(--gold-dim); color: var(--gold); border-color: var(--gold-border); }
        
        .sidebar-nav-link.active::before {
            content: ''; position: absolute; left: 0; top: 20%; bottom: 20%; width: 3px; background: var(--gold); border-radius: 0 2px 2px 0;
        }

        .sidebar-nav-icon { font-size: 16px; flex-shrink: 0; width: 20px; text-align: center; }

        .sidebar-nav-label { transition: opacity 0.2s, max-width 0.3s; overflow: hidden; flex: 1; max-width: 160px; }

        .sidebar.collapsed .sidebar-nav-label { opacity: 0; max-width: 0; }

        .sidebar-bottom { border-top: 1px solid var(--border); padding: 10px 8px; }

        .collapse-btn { 
            width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; 
            padding: 7px 10px; background: none; border: 1px solid var(--border); 
            border-radius: 8px; color: var(--muted); font-size: 12px; font-weight: 600; 
            cursor: pointer; transition: all 0.18s; margin-bottom: 8px; overflow: hidden; 
        }

        .collapse-btn:hover { color: var(--text); border-color: var(--gold-border); }
        .collapse-arrow { transition: transform 0.3s; font-size: 11px; flex-shrink: 0; }
        .sidebar.collapsed .collapse-arrow { transform: rotate(180deg); }
        .collapse-label { transition: opacity 0.2s, max-width 0.3s; max-width: 100px; overflow: hidden; white-space: nowrap; }
        .sidebar.collapsed .collapse-label { opacity: 0; max-width: 0; }

        .sidebar-user-row { 
            display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; 
            cursor: pointer; transition: background 0.18s; overflow: hidden; text-decoration: none; 
        }

        .sidebar-user-row:hover { background: rgba(255, 255, 255, 0.05); }

        .sidebar-user-avatar { 
            width: 30px; height: 30px; border-radius: 50%; background: var(--bg4); 
            border: 2px solid var(--gold-border); display: flex; align-items: center; 
            justify-content: center; font-size: 13px; flex-shrink: 0; color: var(--gold); 
            font-weight: 700; overflow: hidden; 
        }

        .sidebar-user-info { overflow: hidden; transition: opacity 0.2s, max-width 0.3s; max-width: 140px; }
        .sidebar.collapsed .sidebar-user-info { opacity: 0; max-width: 0; }
        .sidebar-user-name { font-size: 12px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sidebar-user-dept { font-size: 10px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* 🚪 SIGN OUT TEXT HIDING LOGIC */
        .logout-text { 
            transition: opacity 0.2s, max-width 0.3s; 
            max-width: 100px; 
            overflow: hidden; 
            white-space: nowrap; 
        }
        .sidebar.collapsed .logout-text { opacity: 0; max-width: 0; }

        .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px); z-index: 290; }
        .sidebar-overlay.open { display: block; }
        .main-wrapper { flex: 1; margin-left: 220px; transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1); min-width: 0; }
        .main-wrapper.sidebar-collapsed { margin-left: 60px; }

        /* NOTIFICATION COLOR CLASSES */
        .ni-blue { background: rgba(59, 130, 246, 0.1) !important; color: #3B82F6 !important; }
        .ni-green { background: rgba(34, 197, 94, 0.1) !important; color: #22C55E !important; }
        .ni-gold { background: rgba(245, 184, 0, 0.1) !important; color: #F5B800 !important; }
        .ni-red { background: rgba(232, 50, 59, 0.1) !important; color: #E8323B !important; }
        .pulse { animation: pulse-notif 2s infinite; }
        @keyframes pulse-notif { 0% { box-shadow: 0 0 0 0 rgba(232, 50, 59, 0.4); } 50% { box-shadow: 0 0 0 6px rgba(232, 50, 59, 0); } 100% { box-shadow: 0 0 0 0 rgba(232, 50, 59, 0); } }

        @media (max-width: 900px) {
            .sidebar { transform: translateX(-100%); width: 220px !important; }
            .sidebar.mobile-open { transform: translateX(0); }
            .main-wrapper { margin-left: 0 !important; }
            .hamburger-btn { display: flex !important; }
        }

        @media (max-width: 400px) {
            #notif-dropdown { width: 280px !important; right: -20px !important; }
        }
    `;
    document.head.appendChild(style);
};

async function initPlayerLayout(activePage = 'profile') {
    injectSidebarStyles();
    try {
        const meRes = await apiFetch('/auth/me');
        if (!meRes.success) throw new Error("Session expired");
        playerProfileData.user = meRes.data;
        const [deptsRes, matchesRes] = await Promise.all([
            apiFetch(`/departments`),
            apiFetch(`/matches?department_id=${playerProfileData.user.department_id}`)
        ]);
        playerProfileData.department = deptsRes.data?.find(d => d.id === playerProfileData.user.department_id);
        playerProfileData.matches = matchesRes.data || [];
    } catch (err) {
        window.location.href = '/login';
        return;
    }
    renderPlayerSidebar(activePage);
    renderPlayerTopbar();
    generateRealNotifications();
    renderTopbarNotifs();
    setInterval(generateRealNotifications, 60000);
}

function renderPlayerSidebar(activePage) {
    const sidebar = document.querySelector('.sidebar') || document.getElementById('sidebar');
    if (!sidebar) return;
    const u = playerProfileData.user;
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Player';
    const deptName = playerProfileData.department?.name || 'No Department';
    const initial = fullName.charAt(0).toUpperCase();
    const avatarHtml = u.profile_picture ? `<img src="${u.profile_picture}" style="width:100%;height:100%;object-fit:cover;">` : initial;

    const links = [
        { id: 'profile', path: 'profile.html', icon: '🏃', label: 'My Profile' },
        { id: 'athletes', path: 'athletes.html', icon: '👥', label: 'Athletes' },
        { id: 'scores', path: 'scores.html', icon: '🏅', label: 'Scores' },
        { id: 'mvp', path: 'mvp.html', icon: '⭐', label: 'MVP' },
        { id: 'standings', path: 'standings.html', icon: '📊', label: 'Standings' }
    ];

    let navHtml = links.map(l => `<a href="${l.path}" class="sidebar-nav-link ${activePage === l.id ? 'active' : ''}"><span class="sidebar-nav-icon">${l.icon}</span><span class="sidebar-nav-label">${l.label}</span></a>`).join('');

    sidebar.innerHTML = `
        <a href="profile.html" class="sidebar-logo">
            <div class="sidebar-logo-icon">🏆</div>
            <span class="sidebar-logo-text">PAC <em>SCHED-SCORE</em> 2025</span>
        </a>
        <nav class="sidebar-nav"><div class="nav-section-label">Main</div>${navHtml}</nav>
        <div class="sidebar-bottom">
            <button class="collapse-btn" onclick="toggleCollapse()"><span class="collapse-arrow">◀</span><span class="collapse-label">Collapse</span></button>
            <a href="profile.html" class="sidebar-user-row">
                <div class="sidebar-user-avatar">${avatarHtml}</div>
                <div class="sidebar-user-info"><div class="sidebar-user-name">${fullName}</div><div class="sidebar-user-dept">${deptName}</div></div>
            </a>
            <button class="btn btn-danger" style="width:100%; margin-top:10px; font-size:12px; padding: 8px; display:flex; justify-content:center; align-items:center; gap:8px; border:none; cursor:pointer; background:rgba(229,57,53,0.1); color:var(--red); border-radius:8px;" onclick="confirmLogout()">
                <span>🚪</span> <span class="logout-text">Sign Out</span>
            </button>
        </div>
    `;
}

function renderPlayerTopbar() {
    const topbar = document.querySelector('.topbar') || document.getElementById('topbar');
    if (!topbar) return;
    const u = playerProfileData.user;
    const initial = `${u.first_name || 'P'}`.charAt(0).toUpperCase();
    const avatarHtml = u.profile_picture ? `<img src="${u.profile_picture}" style="width:100%;height:100%;object-fit:cover;">` : initial;

    topbar.innerHTML = `
        <button class="hamburger-btn" id="hamburger-btn" onclick="toggleSidebar()">
            <div class="hamburger-line"></div><div class="hamburger-line"></div><div class="hamburger-line"></div>
        </button>
        <div class="topbar__right" style="display:flex; align-items:center; gap:10px; margin-left:auto;">
            <div class="nav-notification-container" style="position: relative;">
                <div class="nav-bell" onclick="window.toggleNotifDropdown(event)" style="cursor: pointer; font-size: 20px; width:36px; height:36px; background:var(--bg3); border:1px solid var(--border); border-radius:8px; display:flex; align-items:center; justify-content:center; position:relative;">
                    🔔
                    <span id="notif-badge" class="notif-badge" style="display:none; position:absolute; top:-5px; right:-5px; background:#E8323B; color:#fff; font-size:10px; font-weight:bold; min-width:17px; height:17px; border-radius:50%; display:flex; align-items:center; justify-content:center; pointer-events:none;">0</span>
                </div>
                <div id="notif-dropdown" style="display: none; position: absolute; top: 140%; right: 0; width: 320px; max-width: 90vw; max-height: 450px; overflow-y: auto; background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.7); z-index: 9999;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid var(--border); background: var(--bg3);">
                        <span style="font-family:'Bebas Neue',sans-serif; font-size:16px; letter-spacing:1.5px; color:var(--text);">🔔 Alerts</span>
                        <span style="font-size: 11px; cursor: pointer; color: var(--gold);" onclick="window.markAllNotifsReadTopbar(event)">Mark all read</span>
                    </div>
                    <div id="notif-list" style="max-height: 340px; overflow-y: auto;"></div>
                    <div style="padding:10px; text-align:center; border-top:1px solid var(--border); background:var(--bg3);">
                        <a href="profile.html" style="color:var(--gold); font-size:12px; font-weight:600; text-decoration:none;">View all in Profile →</a>
                    </div>
                </div>
            </div>
            <a href="profile.html" class="topbar__user" style="display:flex; align-items:center; gap:8px; background:var(--bg3); border:1px solid var(--border); border-radius:8px; padding:5px 12px 5px 5px; text-decoration:none;">
                <div class="topbar__user-avatar" style="width:28px; height:28px; border-radius:50%; background:var(--bg4); border:2px solid var(--gold-border); display:flex; align-items:center; justify-content:center; overflow:hidden;">${avatarHtml}</div>
                <span class="topbar__user-name" style="font-size:13px; font-weight:600; color:var(--text);">${u.first_name || 'Player'}</span>
            </a>
        </div>
    `;
}

function generateRealNotifications() {
    const user = playerProfileData.user;
    const matches = playerProfileData.matches;
    if (!user) return;

    playerNotifs = JSON.parse(localStorage.getItem(`sf_notifs_${user.id}`) || '[]');
    let changed = false;

    const addNotif = (id, type, title, body, icon, cls) => {
        if (!playerNotifs.find(n => n.id === id)) {
            playerNotifs.unshift({ id, type, title, body, icon, iconClass: cls, ts: Date.now(), read: false });
            changed = true;
        }
    };

    addNotif('welcome', 'system', 'Welcome to SportFest!', `Hi ${user.first_name}, your account is active.`, '🎉', 'ni-gold');

    if (matches && matches.length > 0) {
        const now = new Date();
        matches.forEach(m => {
            const notifId = `match_${m.id}_${m.status}`;
            const isTeamA = m.participant_a_department_id === user.department_id;
            const opponent = isTeamA ? (m.team_b_name || m.dept_b_name || 'TBD') : (m.team_a_name || m.dept_a_name || 'TBD');

            if (m.status === 'cancelled') addNotif(notifId, 'match', 'Match Cancelled', `Your match against ${opponent} has been cancelled.`, '❌', 'ni-red');
            else if (m.status === 'completed') addNotif(notifId, 'match', 'Match Finalized', `Your match vs ${opponent} is over.`, '🏁', 'ni-green');
            else if (m.status === 'ongoing') addNotif(notifId, 'match', 'Match is LIVE!', `Your match against ${opponent} has started!`, '🔴', 'ni-red pulse');
            else if (m.status === 'scheduled' && m.scheduled_date && m.scheduled_time) {
                const diffMins = (new Date(`${m.scheduled_date}T${m.scheduled_time}`) - now) / 60000;
                if (diffMins > -60 && diffMins <= 30) addNotif(notifId + '_soon', 'match', 'Game Time!', `Match vs ${opponent} starts in ${Math.max(0, Math.round(diffMins))} mins!`, '⏰', 'ni-red');
                else if (diffMins > 30) addNotif(notifId + '_sched', 'match', 'Schedule Update', `Scheduled to play ${opponent} on ${new Date(m.scheduled_date).toLocaleDateString()}.`, '📅', 'ni-gold');
            }
        });
    }

    if (changed) {
        playerNotifs.sort((a, b) => b.ts - a.ts);
        localStorage.setItem(`sf_notifs_${user.id}`, JSON.stringify(playerNotifs));
    }
    renderTopbarNotifs();
}

function renderTopbarNotifs() {
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notif-list');
    if (!badge || !list) return;

    const unreadCount = playerNotifs.filter(n => !n.read).length;
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    badge.textContent = unreadCount;

    if (!playerNotifs.length) {
        list.innerHTML = `<div style="padding: 20px; text-align:center; color:var(--muted); font-size:13px;">No notifications.</div>`;
        return;
    }

    list.innerHTML = playerNotifs.slice(0, 6).map(n => `
        <div style="display:flex; gap:12px; padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.04); background: ${n.read ? 'transparent' : 'rgba(245, 184, 0, 0.04)'}; cursor: pointer;" onclick="window.markSingleNotifRead('${n.id}', event)">
            <div style="width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; border:1px solid rgba(255,255,255,0.1);" class="${n.iconClass || 'ni-blue'}">${n.icon}</div>
            <div style="flex:1;">
                <div style="font-weight:600; font-size:13px; margin-bottom:3px; color:${n.read ? 'var(--text)' : 'var(--gold)'};">${n.title}</div>
                <div style="font-size:12px; color:var(--text2); line-height:1.4; margin-bottom:3px;">${n.body}</div>
                <div style="font-size:10px; color:var(--muted);">${new Date(n.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        </div>
    `).join('');
}

window.toggleNotifDropdown = function (event) {
    if (event) event.stopPropagation();
    const dd = document.getElementById('notif-dropdown');
    if (dd) {
        dd.style.display = (dd.style.display === 'block') ? 'none' : 'block';
    }
};

window.markAllNotifsReadTopbar = function (event) {
    if (event) event.stopPropagation();
    playerNotifs = playerNotifs.map(n => ({ ...n, read: true }));
    localStorage.setItem(`sf_notifs_${playerProfileData.user.id}`, JSON.stringify(playerNotifs));
    renderTopbarNotifs();
    if (typeof renderNotifPage === 'function') renderNotifPage();
};

window.markSingleNotifRead = function (id, event) {
    if (event) event.stopPropagation();
    playerNotifs = playerNotifs.map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem(`sf_notifs_${playerProfileData.user.id}`, JSON.stringify(playerNotifs));
    renderTopbarNotifs();
    if (typeof renderNotifPage === 'function') renderNotifPage();
};

function toggleCollapse() {
    sidebarCollapsed = !sidebarCollapsed;
    document.querySelector('.sidebar')?.classList.toggle('collapsed', sidebarCollapsed);
    document.querySelector('.main-wrapper')?.classList.toggle('sidebar-collapsed', sidebarCollapsed);
}

function toggleSidebar() {
    sidebarMobileOpen = !sidebarMobileOpen;
    document.querySelector('.sidebar')?.classList.toggle('mobile-open', sidebarMobileOpen);
    document.getElementById('sidebar-overlay')?.classList.toggle('open', sidebarMobileOpen);
    document.getElementById('hamburger-btn')?.classList.toggle('open', sidebarMobileOpen);
}

function closeSidebar() {
    sidebarMobileOpen = false;
    document.querySelector('.sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebar-overlay')?.classList.remove('open');
    document.getElementById('hamburger-btn')?.classList.remove('open');
}

if (!window.Modal) {
    window.Modal = {
        confirm(message, title = 'Confirm action') {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.65);display:grid;place-items:center;padding:20px';
            overlay.innerHTML = '<div style="width:min(420px,100%);background:#171b24;color:#f0f2f8;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:20px;box-shadow:0 16px 40px rgba(0,0,0,.45)">' +
                '<h2 style="margin:0 0 12px;font-size:18px">' + title + '</h2>' +
                '<p style="margin:0;line-height:1.5;white-space:pre-wrap"></p>' +
                '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px"><button data-cancel type="button">Cancel</button><button data-ok type="button">Confirm</button></div></div>';
            overlay.querySelector('p').textContent = message;
            document.body.appendChild(overlay);
            return new Promise(resolve => {
                const finish = value => { overlay.remove(); resolve(value); };
                overlay.querySelector('[data-ok]').onclick = () => finish(true);
                overlay.querySelector('[data-cancel]').onclick = () => finish(false);
                overlay.onclick = event => { if (event.target === overlay) finish(false); };
                overlay.querySelector('[data-ok]').focus();
            });
        }
    };
}

async function confirmLogout() {
    const confirmed = await Modal.confirm('Sign out of SportFest 2025?', 'Sign out');
    if (confirmed) {
        localStorage.clear();
        window.location.href = '/login';
    }
}

window.addEventListener('click', function (event) {
    const dd = document.getElementById('notif-dropdown');
    const btn = document.querySelector('.nav-bell');
    if (dd && btn && !btn.contains(event.target) && !dd.contains(event.target)) {
        dd.style.display = 'none';
    }
});
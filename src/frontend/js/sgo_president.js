/* ============================================================
   SGO PRESIDENT SIDEBAR — PAC SCHED-SCORE
   Do NOT redeclare Modal/Toast with const — api.js may already
   define them. Always assign to window.*.
   ============================================================ */
(function () {
    'use strict';

    var SGO_PRESIDENT_NAV = [
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

    var sidebarRendered = false;

    function showPageLoader() {
        if (document.getElementById('page-loader')) return;
        var el = document.createElement('div');
        el.id = 'page-loader';
        el.className = 'page-loader';
        el.innerHTML =
            '<div class="page-loader-logo"><i class="fa-solid fa-building-columns"></i></div>' +
            '<div class="page-loader-text">PAC SCHED-SCORE</div>' +
            '<div class="page-loader-bar"><span></span></div>';
        document.body.appendChild(el);
    }

    function hidePageLoader() {
        var el = document.getElementById('page-loader');
        if (!el) return;
        el.classList.add('done');
        setTimeout(function () { el.remove(); }, 400);
    }

    function skeletonHtml(kind, count) {
        kind = kind || 'rows';
        count = count || 4;
        var i, html = '';
        if (kind === 'stats' || kind === 'cards') {
            var h = kind === 'cards' ? ' style="height:120px"' : '';
            for (i = 0; i < count; i++) html += '<div class="skeleton skeleton-card"' + h + '></div>';
            return html;
        }
        for (i = 0; i < count; i++) html += '<div class="skeleton skeleton-row"></div>';
        return html;
    }

    function toggleSidebar() {
        var sb = document.getElementById('app-sidebar');
        if (!sb) return;
        var open = !sb.classList.contains('sidebar-open');
        sb.classList.toggle('sidebar-open', open);

        var overlay = document.getElementById('sidebar-overlay');
        if (open) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'sidebar-overlay';
                overlay.className = 'sidebar-open-overlay';
                overlay.addEventListener('click', function () { toggleSidebar(); });
                document.body.appendChild(overlay);
            }
            requestAnimationFrame(function () { overlay.classList.add('show'); });
            document.body.style.overflow = 'hidden';
        } else {
            if (overlay) {
                overlay.classList.remove('show');
                setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 250);
            }
            document.body.style.overflow = '';
        }
    }

    function closeSidebarOnNavigate() {
        var sb = document.getElementById('app-sidebar');
        if (sb && sb.classList.contains('sidebar-open')) {
            sb.classList.remove('sidebar-open');
            var ov = document.getElementById('sidebar-overlay');
            if (ov) ov.remove();
            document.body.style.overflow = '';
        }
    }

    function renderSidebar(activePage) {
        if (sidebarRendered) {
            hidePageLoader();
            return;
        }

        showPageLoader();

        var user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
        var name = 'President';
        var avatar = 'P';
        if (user) {
            name = ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || user.username || 'President';
            avatar = ((user.first_name && user.first_name[0]) || (user.username && user.username[0]) || 'P').toUpperCase();
        }
        var currentPath = window.location.pathname;

        var navHtml = SGO_PRESIDENT_NAV.map(function (item) {
            if (item.section) {
                return '<div class="nav-section-title">' + item.section + '</div>';
            }
            var isActive =
                item.key === activePage ||
                currentPath === item.href ||
                currentPath.endsWith(item.href.split('/').pop()) ||
                (currentPath === '/president' && item.key === 'dashboard');
            var badgeHtml = item.badge === 'live'
                ? '<span class="nav-badge" id="sb-live-count" style="background:var(--red);display:none">0</span>'
                : '';
            return '<a class="nav-item' + (isActive ? ' active' : '') + '" href="' + item.href + '" data-nav="' + item.key + '">' +
                '<span class="nav-icon"><i class="' + item.icon + '"></i></span>' +
                item.label + badgeHtml +
                '</a>';
        }).join('\n');

        var sidebarHtml =
            '<aside class="sidebar" id="app-sidebar">' +
            '<div class="sidebar-logo">' +
            '<div class="logo-icon"><i class="fa-solid fa-building-columns"></i></div>' +
            '<div class="logo-text">PAC <span>SCHED-SCORE</span></div>' +
            '</div>' +
            '<div class="sidebar-role role-sgo_president">' +
            '<i class="fa-solid fa-user-tie"></i> SGO President' +
            '</div>' +
            '<nav class="sidebar-nav">' + navHtml + '</nav>' +
            '<div class="sidebar-footer">' +
            '<div class="user-card">' +
            '<div class="user-avatar" id="sb-avatar">' + avatar + '</div>' +
            '<div class="user-info">' +
            '<div class="user-name" id="sb-name">' + name + '</div>' +
            '<div class="user-role" id="sb-role">SGO President</div>' +
            '</div>' +
            '<button class="logout-btn" id="logout-btn" title="Logout" type="button">' +
            '<i class="fa-solid fa-right-from-bracket"></i>' +
            '</button>' +
            '</div></div></aside>';

        var existing = document.getElementById('app-sidebar');
        if (existing) existing.remove();

        var mainEl = document.querySelector('main.main') || document.querySelector('main');
        if (mainEl) {
            mainEl.insertAdjacentHTML('beforebegin', sidebarHtml);
        } else {
            document.body.insertAdjacentHTML('afterbegin', sidebarHtml);
        }

        var logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', confirmSgoPresidentLogout);

        var links = document.querySelectorAll('.sidebar-nav .nav-item');
        for (var i = 0; i < links.length; i++) {
            links[i].addEventListener('click', closeSidebarOnNavigate);
        }

        sidebarRendered = true;
        requestAnimationFrame(function () {
            setTimeout(hidePageLoader, 120);
        });
    }

    function confirmSgoPresidentLogout() {
        var old = document.querySelector('.logout-overlay');
        if (old) old.remove();
        var overlay = document.createElement('div');
        overlay.className = 'logout-overlay show';
        overlay.innerHTML =
            '<div class="logout-modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()">' +
            '<div class="logout-modal-icon"><i class="fa-solid fa-right-from-bracket"></i></div>' +
            '<div class="logout-modal-title">Sign Out</div>' +
            '<div class="logout-modal-text">Are you sure you want to leave your SGO President session?</div>' +
            '<div class="logout-modal-actions">' +
            '<button class="logout-cancel-btn" type="button">Cancel</button>' +
            '<button class="logout-confirm-btn" type="button">Sign Out</button>' +
            '</div></div>';
        function close() { overlay.remove(); }
        overlay.querySelector('.logout-cancel-btn').addEventListener('click', close);
        overlay.querySelector('.logout-confirm-btn').addEventListener('click', function () {
            if (typeof Auth !== 'undefined' && Auth.logout) Auth.logout();
        });
        overlay.addEventListener('click', close);
        document.body.appendChild(overlay);
    }

    function refreshSidebar(activePage) {
        sidebarRendered = false;
        renderSidebar(activePage);
    }

    function updateLiveBadge() {
        if (typeof api !== 'function') return;
        api('/matches/live').then(function (r) {
            var badge = document.getElementById('sb-live-count');
            if (!badge) return;
            var count = (r.data && r.data.length) || 0;
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-block' : 'none';
        }).catch(function () { });
    }

    if (!window.Modal) {
        window.Modal = {
            open: function (id) {
                var el = document.getElementById(id);
                if (!el) return;
                el.classList.add('open');
                document.body.style.overflow = 'hidden';
            },
            close: function (id) {
                var el = document.getElementById(id);
                if (!el) return;
                el.classList.remove('open');
                if (!document.querySelector('.modal-overlay.open')) {
                    document.body.style.overflow = '';
                }
            },
            closeAll: function () {
                document.querySelectorAll('.modal-overlay.open').forEach(function (el) {
                    el.classList.remove('open');
                });
                document.body.style.overflow = '';
            }
        };
    }

    if (!window.Toast) {
        window.Toast = {
            show: function (msg, type) {
                type = type || 'info';
                document.querySelectorAll('.toast').forEach(function (t) { t.remove(); });
                var el = document.createElement('div');
                el.className = 'toast ' + type;
                el.textContent = msg;
                document.body.appendChild(el);
                requestAnimationFrame(function () { el.classList.add('show'); });
                setTimeout(function () {
                    el.classList.remove('show');
                    setTimeout(function () { el.remove(); }, 300);
                }, 3200);
            }
        };
    }

    if (!window.formatDate) {
        window.formatDate = function (d) {
            if (!d) return '—';
            try {
                var dt = new Date(d);
                if (Number.isNaN(dt.getTime())) return d;
                return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            } catch (e) { return d; }
        };
    }
    if (!window.formatTime) {
        window.formatTime = function (t) {
            if (!t) return '—';
            var parts = String(t).split(':');
            if (parts.length >= 2) {
                var h = parseInt(parts[0], 10);
                var m = parts[1];
                var ampm = h >= 12 ? 'PM' : 'AM';
                h = h % 12 || 12;
                return h + ':' + m + ' ' + ampm;
            }
            return t;
        };
    }
    if (!window.initials) {
        window.initials = function (name) {
            if (!name) return '?';
            return String(name).split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
        };
    }
    if (!window.statusBadge) {
        window.statusBadge = function (status) {
            var map = {
                draft: 'badge-muted', registration: 'badge-blue', ongoing: 'badge-green badge-pulse',
                scheduled: 'badge-blue', completed: 'badge-muted', cancelled: 'badge-red', pending: 'badge-orange'
            };
            return '<span class="badge ' + (map[status] || 'badge-muted') + '">' + (status || '—') + '</span>';
        };
    }
    if (!window.sportIcon) {
        window.sportIcon = function (name) {
            var n = (name || '').toLowerCase();
            var map = {
                basketball: 'fa-basketball', volleyball: 'fa-volleyball', football: 'fa-futbol',
                soccer: 'fa-futbol', badminton: 'fa-feather-pointed', 'table tennis': 'fa-table-tennis-paddle-ball',
                chess: 'fa-chess', baseball: 'fa-baseball', swim: 'fa-person-swimming',
                track: 'fa-person-running', run: 'fa-person-running', dance: 'fa-music', esports: 'fa-gamepad'
            };
            for (var key in map) {
                if (n.indexOf(key) !== -1) return '<i class="fa-solid ' + map[key] + '"></i>';
            }
            return '<i class="fa-solid fa-medal"></i>';
        };
    }

    function renderFfaScoreboard(participants, opts) {
        opts = opts || {};
        var list = participants || [];
        if (!list.length) {
            return '<div class="section-empty">' + (opts.emptyText || 'No participants yet') + '</div>';
        }
        var sorted = list.slice().sort(function (a, b) {
            if (a.rank != null && b.rank != null) return a.rank - b.rank;
            if (a.score != null && b.score != null) return Number(b.score) - Number(a.score);
            return 0;
        });
        return '<div class="ffa-scoreboard">' + sorted.map(function (p, i) {
            var rank = p.rank != null ? p.rank : i + 1;
            var score = (p.score != null && p.score !== '') ? p.score : null;
            return '<div class="ffa-score-row' + (rank === 1 ? ' is-leader' : '') + '">' +
                '<div class="ffa-score-rank">' + rank + '</div>' +
                '<div class="ffa-score-name">' + (p.department_name || p.name || '—') + '</div>' +
                '<div class="ffa-score-value' + (score == null ? ' muted' : '') + '">' +
                (score == null ? '—' : score) + '</div></div>';
        }).join('') + '</div>';
    }

    if (!window.NotifBell) {
        window.NotifBell = {
            init: function () {
                var bell = document.getElementById('notif-bell');
                var dropdown = document.getElementById('notif-dropdown');
                if (!bell || !dropdown) return;
                bell.addEventListener('click', function (e) {
                    e.stopPropagation();
                    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                });
                document.addEventListener('click', function () {
                    dropdown.style.display = 'none';
                });
            }
        };
    }

    function bootSidebar() {
        showPageLoader();
        var currentPath = window.location.pathname;
        if (currentPath.indexOf('/president') === 0 || currentPath.indexOf('/SGO_PRESIDENT') === 0) {
            var activePage = currentPath.split('/').pop() || 'dashboard';
            var cleanPage = activePage.replace('.html', '');
            var pageMap = {
                dashboard: 'dashboard', sports: 'sports', bracketing: 'bracketing',
                'game-setup': 'game-setup', schedule: 'schedule', venues: 'venues',
                assignment: 'schedule', live: 'live', 'live-scores': 'live',
                reports: 'reports', notifications: 'notifications'
            };
            renderSidebar(pageMap[cleanPage] || 'dashboard');
            updateLiveBadge();
        } else {
            hidePageLoader();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootSidebar);
    } else {
        bootSidebar();
    }

    window.addEventListener('popstate', function () {
        var currentPath = window.location.pathname;
        if (currentPath.indexOf('/president') === 0 || currentPath.indexOf('/SGO_PRESIDENT') === 0) {
            document.querySelectorAll('.sidebar-nav .nav-item').forEach(function (el) {
                el.classList.toggle('active', el.getAttribute('href') === currentPath);
            });
        }
    });

    window.renderSidebar = renderSidebar;
    window.refreshSidebar = refreshSidebar;
    window.toggleSidebar = toggleSidebar;
    window.skeletonHtml = skeletonHtml;
    window.showPageLoader = showPageLoader;
    window.hidePageLoader = hidePageLoader;
    window.renderFfaScoreboard = renderFfaScoreboard;
    window.updateLiveBadge = updateLiveBadge;
})();
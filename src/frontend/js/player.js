'use strict';

const API = window.location.origin + '/api';

async function apiFetch(path, opts = {}) {

    const token = localStorage.getItem('sf_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');

    try {
        const res = await fetch(`${API}${path}`, {
            ...opts,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(opts.headers || {})
            }
        });
        const d = await res.json();
        return res.ok ? d : { success: false, data: null, ...d };
    } catch (err) {
        console.error(`API Fetch Error [${path}]:`, err);
        return { success: false, data: null, message: 'Network error' };
    }
}

const Store = {
    getPlayers() {
        try { return JSON.parse(localStorage.getItem('sf_players') || '[]'); } catch { return []; }
    },
    savePlayers(arr) { localStorage.setItem('sf_players', JSON.stringify(arr)); },

    getNotifs() {
        try { return JSON.parse(localStorage.getItem('sf_notifs') || '[]'); } catch { return []; }
    },
    saveNotifs(arr) { localStorage.setItem('sf_notifs', JSON.stringify(arr)); },
    addNotif(notif) {
        const arr = Store.getNotifs();
        arr.unshift({ id: Date.now(), read: false, ts: new Date().toISOString(), ...notif });
        if (arr.length > 50) arr.length = 50;
        Store.saveNotifs(arr);
        if (typeof Notif !== 'undefined') Notif.refresh();
    },
    markAllRead() {
        const arr = Store.getNotifs().map(n => ({ ...n, read: true }));
        Store.saveNotifs(arr);
        if (typeof Notif !== 'undefined') Notif.refresh();
    },

    getUser() {
        try {
            return JSON.parse(localStorage.getItem('sf_user')) ||
                JSON.parse(localStorage.getItem('user')) || null;
        } catch { return null; }
    },
    setUser(u) { localStorage.setItem('sf_user', JSON.stringify(u)); },
};

const Toast = {
    el: null,
    init() { this.el = document.getElementById('toast'); },
    show(msg, type = 'ok', dur = 3200) {
        if (!this.el) return;
        const icons = { ok: '✅', err: '❌', inf: 'ℹ️', warn: '⚠️' };
        this.el.innerHTML = `${icons[type] || ''} ${msg}`;
        this.el.className = `toast ${type} show`;
        clearTimeout(this.el._t);
        this.el._t = setTimeout(() => this.el.classList.remove('show'), dur);
    }
};

const Notif = {
    btn: null, badge: null, dropdown: null, list: null,
    init() {
        this.btn = document.getElementById('notif-btn');
        this.badge = document.getElementById('notif-badge');
        this.dropdown = document.getElementById('notif-dropdown');
        this.list = document.getElementById('notif-list');
        if (!this.btn) return;

        this.btn.addEventListener('click', (e) => { e.stopPropagation(); this.toggle(); });
        document.addEventListener('click', (e) => {
            if (this.dropdown && !this.dropdown.contains(e.target) && e.target !== this.btn) this.close();
        });

        const markAllBtn = document.getElementById('notif-mark-all');
        if (markAllBtn) markAllBtn.addEventListener('click', () => { Store.markAllRead(); Toast.show('All read', 'inf'); });

        this.refresh();
    },
    toggle() { this.dropdown.classList.contains('open') ? this.close() : this.open(); },
    open() { this.dropdown.classList.add('open'); this.render(); },
    close() { this.dropdown && this.dropdown.classList.remove('open'); },
    refresh() {
        const unread = Store.getNotifs().filter(n => !n.read).length;
        if (this.badge) {
            this.badge.textContent = unread > 9 ? '9+' : unread;
            this.badge.classList.toggle('visible', unread > 0);
        }
        if (this.dropdown && this.dropdown.classList.contains('open')) this.render();
    },
    render() {
        if (!this.list) return;
        const notifs = Store.getNotifs();
        if (!notifs.length) {
            this.list.innerHTML = `<div style="padding:28px 16px;text-align:center;color:var(--muted)"><div>🔔</div><div>No notifications</div></div>`;
            return;
        }
        this.list.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" onclick="Notif.markRead(${n.id})">
        <div class="notif-item__icon ${n.iconClass || 'ni-blue'}">${n.icon || '🔔'}</div>
        <div class="notif-item__body">
          <div class="notif-item__text">${n.body || n.title}</div>
          <div class="notif-item__time">${Notif.timeAgo(n.ts)}</div>
        </div>
        <div class="notif-item__dot"></div>
      </div>`).join('');
    },
    markRead(id) {
        const arr = Store.getNotifs().map(n => n.id === id ? { ...n, read: true } : n);
        Store.saveNotifs(arr);
        this.refresh();
    },
    timeAgo(iso) {
        const diff = Date.now() - new Date(iso).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'just now';
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        return `${Math.floor(h / 24)}d ago`;
    }
};

function setActiveNav() {
    const page = location.pathname.split('/').pop();
    document.querySelectorAll('.topbar__nav-link').forEach(link => {
        const href = link.getAttribute('href') || '';
        link.classList.toggle('active', href === page || href.endsWith(page));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    Toast.init();
    Notif.init();
    setActiveNav();
});
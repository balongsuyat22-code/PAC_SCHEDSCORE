/** Schedule page */
let allMatches = [];

function renderSchedule() {
    const el = document.getElementById('schedule-container');
    if (!el) return;
    if (!allMatches.length) {
        el.innerHTML = `<div class="empty-state"><span class="empty-icon">${I.calendar}</span><div class="empty-title">No schedule available</div><div class="empty-sub">Matches appear once scheduled by SGO</div></div>`;
        return;
    }
    const sorted = [...allMatches].sort((a, b) =>
        ((a.scheduled_date || '9999') + (a.scheduled_time || '99:99'))
            .localeCompare((b.scheduled_date || '9999') + (b.scheduled_time || '99:99'))
    );
    const grouped = {};
    sorted.forEach(m => {
        const d = m.scheduled_date || 'TBD';
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(m);
    });
    el.innerHTML = Object.entries(grouped).map(([date, matches]) => {
        const label = fmtDate(date);
        const tod = isToday(date);
        return `<div class="sched-group">
      <div class="sched-date-head">
        <div class="sched-date-label${tod ? ' today' : ''}">${label}${tod ? ' · Today' : ''}</div>
        <div class="sched-line"></div>
      </div>
      ${matches.map(m => {
            const na = esc(m.dept_a_name || m.dept_a || 'TBD');
            const nb = esc(m.dept_b_name || m.dept_b || 'TBD');
            const live = m.status === 'ongoing';
            const sport = esc(m.sport_name || '');
            const matchName = isFFA(m) ? `${sport} — Free-for-All` : `${na} vs ${nb}`;
            return `<div class="sched-card${live ? ' live-sched' : ''}"
          data-text="${na.toLowerCase()} ${nb.toLowerCase()} ${sport.toLowerCase()} ${esc((m.venue_name || '').toLowerCase())}">
          <div class="sched-time-col">${fmtTime(m.scheduled_time)}</div>
          <div class="sched-info">
            <div class="sched-match-name">${matchName}</div>
            <div class="sched-meta-row">
              <span>${sportIcon(m.sport_name)} ${sport}</span>
              ${m.venue_name ? `<span>${I.pin} ${esc(m.venue_name)}</span>` : ''}
            </div>
          </div>
          ${statusBadgeHTML(m.status)}
        </div>`;
        }).join('')}
    </div>`;
    }).join('');
}

function filterSchedule(q) {
    document.getElementById('sched-search-clear')?.classList.toggle('visible', q.length > 0);
    const ql = q.toLowerCase();
    document.querySelectorAll('.sched-card').forEach(c => {
        c.classList.toggle('hidden-by-search', !!ql && !c.dataset.text.includes(ql));
    });
}

function clearSearch() {
    const input = document.getElementById('sched-search');
    if (input) input.value = '';
    filterSchedule('');
}

async function loadMatches() {
    const el = document.getElementById('schedule-container');
    try {
        const r = await fetch(`${BASE}/api/matches`);
        const j = await r.json().catch(() => ({}));

        if (!r.ok) {
            if (el) {
                el.innerHTML = `<div class="empty-state">
          <span class="empty-icon">${I.calendar}</span>
          <div class="empty-title">Could not load schedule</div>
          <div class="empty-sub">API ${r.status}${j.message ? ': ' + esc(j.message) : ''} — matches may require login</div>
        </div>`;
            }
            return;
        }

        // Accept common response shapes
        allMatches = j.data || j.matches || j.rows || (Array.isArray(j) ? j : []) || [];

        // Normalize alternate field names from your API
        allMatches = allMatches.map(m => ({
            ...m,
            dept_a_name: m.dept_a_name || m.dept_a || m.department_a_name || m.participant_a_name,
            dept_b_name: m.dept_b_name || m.dept_b || m.department_b_name || m.participant_b_name,
            scheduled_date: m.scheduled_date || m.match_date || m.date,
            scheduled_time: m.scheduled_time || m.match_time || m.start_time || m.time,
            venue_name: m.venue_name || m.venue,
            sport_name: m.sport_name || m.sport,
        }));

        renderSchedule();
    } catch (err) {
        if (el) {
            el.innerHTML = `<div class="empty-state">
        <span class="empty-icon">${I.calendar}</span>
        <div class="empty-title">Could not load schedule</div>
        <div class="empty-sub">Network error — is the server running?</div>
      </div>`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setActiveNav('schedule');
    startClock();
    initSocket({ onMatchStarted: () => loadMatches(), onMatchCompleted: () => loadMatches() });
    loadMatches();
    setInterval(loadMatches, MATCHES_POLL_MS);
});
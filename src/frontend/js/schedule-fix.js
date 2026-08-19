function safeDate(val) {
    if (!val) return '';
    return String(val).split('T')[0];
}

// ── Utility: safe FK (never send 0 or "") ──────────────────────────
function safeFK(val) {
    const n = parseInt(val);
    return Number.isInteger(n) && n > 0 ? n : null;
}

// ── Global match schedule modal state ─────────────────────────────
let _scheduleMatchId = null;
let _scheduleVenues = [];
let _scheduleReferees = [];
let _scheduleLoaded = false;

// ── Load venues + referees once ────────────────────────────────────
async function ensureScheduleDropdowns() {
    if (_scheduleLoaded) return;
    try {
        // BUG FIX: this used to read localStorage 'token', but every other
        // page in the app (api.js / shared.js Auth.getToken()) stores the
        // JWT under 'sf_token'. With the wrong key this was always sending
        // "Authorization: Bearer null" — venues/officers loaded as silent
        // empty arrays instead of 401'ing loudly, so it was easy to miss.
        const token = localStorage.getItem('sf_token');
        const headers = { 'Authorization': `Bearer ${token}` };
        const [vRes, rRes] = await Promise.all([
            fetch('/api/venues', { headers }).then(r => r.json()),
            // BUG FIX: the officer role in this system is 'sgo_officer', not
            // 'referee' (see ALLOWED_ROLES in userController.js) — this
            // query always matched zero rows, so the Referee dropdown was
            // silently empty.
            fetch('/api/users?role=sgo_officer', { headers }).then(r => r.json()),
        ]);
        _scheduleVenues = vRes.data || [];
        _scheduleReferees = rRes.data || [];
        _scheduleLoaded = true;
    } catch (e) {
        console.warn('[schedule-fix] Could not load dropdowns:', e);
    }
}

// ── Inject modal HTML into the page if it doesn't already exist ───
function ensureScheduleModal() {
    if (document.getElementById('sf-modal-schedule')) return;

    const el = document.createElement('div');
    el.innerHTML = `
    <div class="modal-overlay" id="sf-modal-schedule"
         onclick="if(event.target===this)closeSFModal()"
         style="display:none">
        <div class="modal">
            <div class="modal-header">
                <div class="modal-title">📅 Schedule Match</div>
                <button class="modal-close" onclick="closeSFModal()">✕</button>
            </div>
            <div class="modal-body">
                <div id="sf-sched-preview" style="margin-bottom:16px"></div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Date</label>
                        <input type="date" id="sf-sched-date" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Time</label>
                        <input type="time" id="sf-sched-time" class="form-input">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Venue</label>
                        <select id="sf-sched-venue" class="form-select">
                            <option value="">No venue</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Referee</label>
                        <select id="sf-sched-referee" class="form-select">
                            <option value="">No referee</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Notes
                        <span style="color:var(--muted);font-weight:400;text-transform:none;letter-spacing:0">optional</span>
                    </label>
                    <textarea id="sf-sched-notes" class="form-textarea" rows="2"
                        placeholder="Any notes about this match..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeSFModal()">Cancel</button>
                <button class="btn btn-primary" onclick="saveSFSchedule()">💾 Save</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(el.firstElementChild);
}

function closeSFModal() {
    const el = document.getElementById('sf-modal-schedule');
    if (el) el.style.display = 'none';
}

// ── Open the schedule modal for a match from the tournament page ──
async function openEditMatch(matchId) {
    ensureScheduleModal();
    await ensureScheduleDropdowns();

    _scheduleMatchId = matchId;

    // Populate venue dropdown
    const vSel = document.getElementById('sf-sched-venue');
    vSel.innerHTML = '<option value="">No venue</option>' +
        _scheduleVenues.map(v =>
            `<option value="${v.id}">${v.name}${v.location ? ' \u2014 ' + v.location : ''}</option>`
        ).join('');

    // Populate referee dropdown
    const rSel = document.getElementById('sf-sched-referee');
    rSel.innerHTML = '<option value="">No referee</option>' +
        _scheduleReferees.map(r =>
            `<option value="${r.id}">${r.first_name} ${r.last_name}</option>`
        ).join('');

    // Fetch current match data
    try {
        const token = localStorage.getItem('sf_token');
        const res = await fetch(`/api/matches/${matchId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const m = data.data || {};

        // ── KEY FIX: always use safeDate() — strips "T00:00:00.000Z" ──
        document.getElementById('sf-sched-date').value = safeDate(m.scheduled_date);
        document.getElementById('sf-sched-time').value = m.scheduled_time
            ? String(m.scheduled_time).slice(0, 5)
            : '';
        document.getElementById('sf-sched-notes').value = m.notes || '';

        // Pre-select venue / referee only if valid IDs exist
        vSel.value = m.venue_id ? String(m.venue_id) : '';
        rSel.value = m.referee_id ? String(m.referee_id) : '';

        // Preview card
        const nA = m.team_a_name || m.dept_a_name || 'TBD';
        const nB = m.team_b_name || m.dept_b_name || 'TBD';
        const cA = m.dept_a_color || '#555';
        const cB = m.dept_b_color || '#555';
        document.getElementById('sf-sched-preview').innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;background:var(--bg3);
                        border-radius:10px;padding:14px 16px">
                <span style="width:10px;height:10px;border-radius:50%;
                             background:${cA};display:inline-block;flex-shrink:0"></span>
                <strong style="flex:1">${nA}</strong>
                <span style="color:var(--muted);font-size:13px">vs</span>
                <strong style="flex:1;text-align:right">${nB}</strong>
                <span style="width:10px;height:10px;border-radius:50%;
                             background:${cB};display:inline-block;flex-shrink:0"></span>
            </div>`;
    } catch (e) {
        console.warn('[schedule-fix] Could not load match:', e);
        document.getElementById('sf-sched-preview').innerHTML = '';
        document.getElementById('sf-sched-date').value = '';
        document.getElementById('sf-sched-time').value = '';
        document.getElementById('sf-sched-notes').value = '';
    }

    const modal = document.getElementById('sf-modal-schedule');
    modal.style.display = 'flex';
}

// ── Save the schedule ──────────────────────────────────────────────
async function saveSFSchedule() {
    if (!_scheduleMatchId) return;

    const rawDate = document.getElementById('sf-sched-date').value;
    const time = document.getElementById('sf-sched-time').value;
    const venueRaw = document.getElementById('sf-sched-venue').value;
    const refRaw = document.getElementById('sf-sched-referee').value;
    const notes = document.getElementById('sf-sched-notes').value;

    // ── KEY FIX: always strip to yyyy-MM-dd before sending ──────────
    const cleanDate = safeDate(rawDate) || null;

    const body = {
        scheduled_date: cleanDate,
        scheduled_time: time || null,
        venue_id: safeFK(venueRaw),
        referee_id: safeFK(refRaw),
        notes: notes || null,
    };

    try {
        const token = localStorage.getItem('sf_token');
        // BUG FIX: routes/matches.js registers this as
        // router.put('/:id/schedule', ...) — PUT, not PATCH. Express doesn't
        // fuzzy-match methods, so every save silently 404'd (caught below as
        // a generic "Failed to schedule match" toast with no indication the
        // endpoint itself was never actually reached).
        const res = await fetch(`/api/matches/${_scheduleMatchId}/schedule`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });
        const data = await res.json();

        if (data.success) {
            closeSFModal();

            if (typeof loadPage === 'function') await loadPage();
            if (typeof Toast !== 'undefined') Toast.show(data.message || 'Match scheduled!', 'success');
        } else {
            const msg = data.message || 'Failed to schedule match';
            if (typeof Toast !== 'undefined') Toast.show(msg, 'error');
            else alert('Error: ' + msg);
        }
    } catch (e) {
        console.error('[schedule-fix] Save error:', e);
        if (typeof Toast !== 'undefined') Toast.show('Network error — could not save', 'error');
    }
}
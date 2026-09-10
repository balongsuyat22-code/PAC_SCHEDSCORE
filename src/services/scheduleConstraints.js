const SGO_ALIASES = new Set(['sgo', 'selecom', 'supreme goat', 'sgo / selecom']);
const STALLIONS_ALIASES = new Set(['stallions', 'stallion']);
const CHEETAH_ALIASES = new Set(['cheetah', 'cheetahs']);

const FIXED_BLOCKS = [
    { sport: ['basketball'], opponent: STALLIONS_ALIASES, month: 9, day: 14, start: '10:30', end: '11:30', venue: 'Gymnasium' },
    { sport: ['volleyball'], opponent: STALLIONS_ALIASES, month: 9, day: 14, start: '11:30', end: '12:30' },
    { sport: ['mobile legends', 'mobile legends: bang bang', 'mlbb'], opponent: STALLIONS_ALIASES, month: 9, day: 14, start: '08:30', end: '09:30' },
    { sport: ['badminton'], opponent: STALLIONS_ALIASES, month: 9, day: 14, start: '11:30', end: '12:30' },
    { sport: ['table tennis', 'table-tennis'], opponent: STALLIONS_ALIASES, month: 9, day: 14, start: '11:30', end: '12:30' },
    { sport: ['sepak takraw', 'sepak-takraw'], opponent: STALLIONS_ALIASES, month: 9, day: 14, start: '08:30', end: '09:30' },
    { sport: ['chess', 'scrabble', 'checkers', 'darts', 'sudoku', 'sungka', 'board games', 'board game'], opponent: STALLIONS_ALIASES, month: 9, day: 14, start: '10:30', end: '11:30' },
    { sport: ['pickleball'], opponent: CHEETAH_ALIASES, month: 9, day: 15, start: '15:30', end: '16:00' },
    { sport: ['basketball'], bracket: 'game 5', month: 9, day: 14, start: '11:30', end: '12:30', venue: 'Gymnasium' },
];

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ');
const timeToMinutes = (value) => {
    const [hours, minutes] = String(value || '').slice(0, 5).split(':').map(Number);
    return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
};
const formatDate = (year, month, day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const aliasMatches = (name, aliases) => aliases.has(normalize(name)) || [...aliases].some((alias) => normalize(name).includes(alias));

function getFixedBlock(match) {
    const sideA = normalize(match.dept_a_name);
    const sideB = normalize(match.dept_b_name);
    const sgoIsA = aliasMatches(sideA, SGO_ALIASES);
    const sgoIsB = aliasMatches(sideB, SGO_ALIASES);
    if (!sgoIsA && !sgoIsB) return null;

    const opponent = sgoIsA ? sideB : sideA;
    const sport = normalize(match.sport_name);
    const bracket = normalize(match.bracket_position);
    const block = FIXED_BLOCKS.find((candidate) => {
        if (!candidate.sport.some((name) => sport === name || sport.includes(name))) return false;
        if (candidate.bracket && !bracket.includes(candidate.bracket)) return false;
        return candidate.opponent ? aliasMatches(opponent, candidate.opponent) : Boolean(candidate.bracket);
    });
    if (!block) return null;

    const startYear = String(match.tournament_start_date || '').slice(0, 4);
    const year = Number(startYear) || new Date().getFullYear();
    return {
        ...block,
        date: formatDate(year, block.month, block.day),
        sgo_department_id: sgoIsA ? match.participant_a_department_id : match.participant_b_department_id,
        opponent_department_id: sgoIsA ? match.participant_b_department_id : match.participant_a_department_id,
    };
}

function rangesOverlap(startA, endA, startB, endB) {
    return startA < endB && startB < endA;
}

function randomizeWithoutConsecutiveTeams(matches, attempts = 200) {
    if (matches.length < 2) return [...matches];

    const teamsFor = (match) => new Set([
        match.participant_a_department_id,
        match.participant_b_department_id,
    ].filter(Boolean));
    const sharesTeam = (left, right) => {
        const rightTeams = teamsFor(right);
        return [...teamsFor(left)].some((teamId) => rightTeams.has(teamId));
    };

    const search = (remaining, order) => {
        if (!remaining.length) return order;

        const previous = order[order.length - 1];
        const available = previous
            ? remaining.filter((match) => !sharesTeam(previous, match))
            : [...remaining];
        available.sort(() => Math.random() - 0.5);

        for (const next of available) {
            const nextRemaining = remaining.filter((match) => match !== next);
            const result = search(nextRemaining, [...order, next]);
            if (result) return result;
        }
        return null;
    };

    for (let attempt = 0; attempt < attempts; attempt++) {
        const result = search([...matches], []);
        if (result) return result;
    }

    return [];
}

async function findTeamConflict(pool, matchId, departmentId, date, start, end) {
    if (!departmentId || !date || !start || !end) return null;
    const [rows] = await pool.execute(
        `SELECT m.id, m.scheduled_time, s.name AS sport_name
         FROM matches m
         JOIN sports s ON s.id = m.sport_id
         WHERE m.id <> ? AND m.status IN ('pending', 'scheduled', 'ongoing')
           AND m.scheduled_date = ?
           AND (m.participant_a_department_id = ? OR m.participant_b_department_id = ?)
           AND m.scheduled_time IS NOT NULL`,
        [matchId, date, departmentId, departmentId]
    );
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    const conflict = rows.find((row) => {
        const existingStart = timeToMinutes(row.scheduled_time);
        return existingStart != null && startMinutes != null && endMinutes != null &&
            rangesOverlap(startMinutes, endMinutes, existingStart, existingStart + (endMinutes - startMinutes));
    });
    return conflict || null;
}

module.exports = {
    FIXED_BLOCKS,
    getFixedBlock,
    findTeamConflict,
    randomizeWithoutConsecutiveTeams,
    timeToMinutes,
};

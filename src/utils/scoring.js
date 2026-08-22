const DEFAULT_MEDAL_POINTS = { 1: 10, 2: 7, 3: 5 };

async function roundRobinStandings(conn, tournamentId) {
    const [rows] = await conn.execute(
        `SELECT department_id
         FROM round_robin_standings
         WHERE tournament_id = ?
         ORDER BY standing_points DESC, (points_for - points_against) DESC, points_for DESC`,
        [tournamentId]
    );
    return rows.map((r, i) => ({ department_id: r.department_id, rank: i + 1 }));
}

async function ffaStandings(conn, tournamentId) {
    const [rows] = await conn.execute(
        `SELECT department_id, rank_position
         FROM ffa_results
         WHERE tournament_id = ? AND rank_position IS NOT NULL
         ORDER BY rank_position ASC`,
        [tournamentId]
    );
    return rows.map((r) => ({ department_id: r.department_id, rank: r.rank_position }));
}
async function singleEliminationStandings(conn, tournamentId) {
    const [matches] = await conn.execute(
        `SELECT round_number, participant_a_department_id, participant_b_department_id, winner_department_id
         FROM matches
         WHERE tournament_id = ?
         ORDER BY round_number ASC, match_number ASC`,
        [tournamentId]
    );
    if (!matches.length) return [];

    const maxRound = Math.max(...matches.map((m) => m.round_number));
    const final = matches.find((m) => m.round_number === maxRound);
    if (!final || !final.winner_department_id) return [];

    const loserOf = (m) => {
        if (!m.participant_a_department_id || !m.participant_b_department_id) return null; // bye
        return m.participant_a_department_id === m.winner_department_id
            ? m.participant_b_department_id
            : m.participant_a_department_id;
    };

    const standings = [{ department_id: final.winner_department_id, rank: 1 }];
    const finalLoser = loserOf(final);
    if (finalLoser) standings.push({ department_id: finalLoser, rank: 2 });

    const semiRound = maxRound - 1;
    if (semiRound >= 1) {
        matches
            .filter((m) => m.round_number === semiRound && m.winner_department_id)
            .forEach((m) => {
                const loser = loserOf(m);
                if (loser) standings.push({ department_id: loser, rank: 3 });
            });
    }
    return standings;
}

async function computeFinalStandings(conn, tournamentId, format) {
    if (format === 'round_robin') return roundRobinStandings(conn, tournamentId);
    if (format === 'free_for_all') return ffaStandings(conn, tournamentId);
    return singleEliminationStandings(conn, tournamentId);
}
async function recordResultsAndRebuild(conn, tournamentId, pointsMap = DEFAULT_MEDAL_POINTS) {
    const [[t]] = await conn.execute('SELECT format FROM tournaments WHERE id = ?', [tournamentId]);
    if (!t) return { recorded: 0 };

    const standings = await computeFinalStandings(conn, tournamentId, t.format);

    await conn.execute('DELETE FROM tournament_results WHERE tournament_id = ?', [tournamentId]);

    for (const s of standings) {
        if (!s.department_id) continue;
        const medal = s.rank === 1 ? 'gold' : s.rank === 2 ? 'silver' : s.rank === 3 ? 'bronze' : null;
        const points = pointsMap[s.rank] || 0;
        await conn.execute(
            `INSERT INTO tournament_results (tournament_id, department_id, \`rank\`, medal, sport_fest_points, finalized_at)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [tournamentId, s.department_id, s.rank, medal, points]
        );
    }

    await rebuildDepartmentScores(conn);
    return { recorded: standings.length };
}
async function rebuildDepartmentScores(conn) {
    await conn.execute(
        `UPDATE department_scores
         SET total_points       = 0,
             gold_medals        = 0,
             silver_medals      = 0,
             bronze_medals      = 0,
             total_participations = 0,
             tournaments_entered  = 0`
    );

    const [results] = await conn.execute(
        `SELECT
            tr.department_id,
            sft.sport_fest_id,
            SUM(tr.sport_fest_points)                             AS total_points,
            SUM(CASE WHEN tr.medal = 'gold'   THEN 1 ELSE 0 END) AS gold,
            SUM(CASE WHEN tr.medal = 'silver' THEN 1 ELSE 0 END) AS silver,
            SUM(CASE WHEN tr.medal = 'bronze' THEN 1 ELSE 0 END) AS bronze,
            COUNT(*)                                                AS participations,
            COUNT(DISTINCT tr.tournament_id)                       AS tournaments
         FROM tournament_results tr
         LEFT JOIN sport_fest_tournaments sft ON tr.tournament_id = sft.tournament_id
         GROUP BY tr.department_id, sft.sport_fest_id`
    );

    for (const r of results) {
        await conn.execute(
            `INSERT INTO department_scores
             (department_id, sport_fest_id, total_points, gold_medals, silver_medals, bronze_medals, total_participations, tournaments_entered)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             total_points        = VALUES(total_points),
             gold_medals         = VALUES(gold_medals),
             silver_medals       = VALUES(silver_medals),
             bronze_medals       = VALUES(bronze_medals),
             total_participations = VALUES(total_participations),
             tournaments_entered  = VALUES(tournaments_entered)`,
            [r.department_id, r.sport_fest_id, r.total_points, r.gold, r.silver, r.bronze, r.participations, r.tournaments]
        );
    }
}

module.exports = {
    DEFAULT_MEDAL_POINTS,
    computeFinalStandings,
    recordResultsAndRebuild,
    rebuildDepartmentScores,
};
-- ============================================================
-- SGO DAYS 2026 — FIX SCORES + FORMAT
-- Keeps the results ladder from RESULTS_AND_SCORES.sql
-- ============================================================
SET @admin_id = (
    SELECT id
    FROM users
    WHERE role = 'admin'
    LIMIT 1
  );
SET @fest_id = (
    SELECT id
    FROM sport_fest_events
    WHERE year = 2026
      AND name = 'High School SGO Days 2026'
    LIMIT 1
  );
-- 1) All SGO tournaments → division_gauntlet + completed
UPDATE tournaments
SET format = 'division_gauntlet',
  status = 'completed'
WHERE sport_fest_id = @fest_id
  OR name LIKE '%SGO Days 2026%';
-- 2) Reset ghost matches (missing a side, no winner) to 'pending'
--    so they don't show a fake 0-0 in the UI.
UPDATE matches m
  JOIN tournaments t ON m.tournament_id = t.id
SET m.status = 'pending',
  m.completed_at = NULL,
  m.winner_department_id = NULL
WHERE (
    t.sport_fest_id = @fest_id
    OR t.name LIKE '%SGO Days 2026%'
  )
  AND m.winner_department_id IS NULL
  AND (
    m.participant_a_department_id IS NULL
    OR m.participant_b_department_id IS NULL
  );
-- 3) Fill winner for every completed 2-sided match from tournament_results ranks
UPDATE matches m
  JOIN tournaments t ON m.tournament_id = t.id
  LEFT JOIN tournament_results tra ON tra.tournament_id = t.id
  AND tra.department_id = m.participant_a_department_id
  LEFT JOIN tournament_results trb ON trb.tournament_id = t.id
  AND trb.department_id = m.participant_b_department_id
SET m.winner_department_id = CASE
    WHEN tra.`rank` IS NULL
    AND trb.`rank` IS NULL THEN m.participant_a_department_id
    WHEN tra.`rank` IS NULL THEN m.participant_b_department_id
    WHEN trb.`rank` IS NULL THEN m.participant_a_department_id
    WHEN tra.`rank` < trb.`rank` THEN m.participant_a_department_id
    WHEN trb.`rank` < tra.`rank` THEN m.participant_b_department_id
    ELSE m.participant_a_department_id
  END,
  m.status = 'completed',
  m.completed_at = COALESCE(
    m.completed_at,
    CONCAT(
      IFNULL(m.scheduled_date, '2026-09-15'),
      ' ',
      IFNULL(m.scheduled_time, '12:00:00')
    )
  )
WHERE (
    t.sport_fest_id = @fest_id
    OR t.name LIKE '%SGO Days 2026%'
  )
  AND m.participant_a_department_id IS NOT NULL
  AND m.participant_b_department_id IS NOT NULL
  AND m.winner_department_id IS NULL;
-- 4) NOWL exhibition: real team beats Night Owls
UPDATE matches m
  JOIN tournaments t ON m.tournament_id = t.id
  JOIN departments nb ON nb.id = m.participant_b_department_id
  AND nb.code = 'NOWL'
SET m.winner_department_id = m.participant_a_department_id,
  m.status = 'completed',
  m.completed_at = COALESCE(m.completed_at, '2026-09-14 12:00:00')
WHERE (
    t.sport_fest_id = @fest_id
    OR t.name LIKE '%SGO Days 2026%'
  )
  AND m.participant_a_department_id IS NOT NULL
  AND (
    m.winner_department_id IS NULL
    OR m.winner_department_id = nb.id
  );
UPDATE matches m
  JOIN tournaments t ON m.tournament_id = t.id
  JOIN departments na ON na.id = m.participant_a_department_id
  AND na.code = 'NOWL'
SET m.winner_department_id = m.participant_b_department_id,
  m.status = 'completed',
  m.completed_at = COALESCE(m.completed_at, '2026-09-14 12:00:00')
WHERE (
    t.sport_fest_id = @fest_id
    OR t.name LIKE '%SGO Days 2026%'
  )
  AND m.participant_b_department_id IS NOT NULL
  AND m.participant_b_department_id <> na.id;
-- 5) Rebuild match_results with scoring-type-aware scores that favour the winner
DELETE mr
FROM match_results mr
  JOIN matches m ON mr.match_id = m.id
  JOIN tournaments t ON m.tournament_id = t.id
WHERE t.sport_fest_id = @fest_id
  OR t.name LIKE '%SGO Days 2026%';
INSERT INTO match_results (
    match_id,
    total_score_a,
    total_score_b,
    final_score_display,
    winner_side,
    win_type,
    recorded_by
  )
SELECT m.id,
  CASE
    WHEN sp.scoring_type = 'points'
    AND m.winner_department_id = m.participant_a_department_id THEN FLOOR(18 + RAND() * 10)
    WHEN sp.scoring_type = 'points'
    AND m.winner_department_id = m.participant_b_department_id THEN FLOOR(5 + RAND() * 10)
    WHEN sp.scoring_type = 'sets'
    AND m.winner_department_id = m.participant_a_department_id THEN 2
    WHEN sp.scoring_type = 'sets'
    AND m.winner_department_id = m.participant_b_department_id THEN 1
    WHEN sp.scoring_type = 'time'
    AND m.winner_department_id = m.participant_a_department_id THEN FLOOR(10 + RAND() * 10)
    WHEN sp.scoring_type = 'time'
    AND m.winner_department_id = m.participant_b_department_id THEN FLOOR(20 + RAND() * 10)
    WHEN m.winner_department_id = m.participant_a_department_id THEN 1
    ELSE 0
  END,
  CASE
    WHEN sp.scoring_type = 'points'
    AND m.winner_department_id = m.participant_b_department_id THEN FLOOR(18 + RAND() * 10)
    WHEN sp.scoring_type = 'points'
    AND m.winner_department_id = m.participant_a_department_id THEN FLOOR(5 + RAND() * 10)
    WHEN sp.scoring_type = 'sets'
    AND m.winner_department_id = m.participant_b_department_id THEN 2
    WHEN sp.scoring_type = 'sets'
    AND m.winner_department_id = m.participant_a_department_id THEN 1
    WHEN sp.scoring_type = 'time'
    AND m.winner_department_id = m.participant_b_department_id THEN FLOOR(10 + RAND() * 10)
    WHEN sp.scoring_type = 'time'
    AND m.winner_department_id = m.participant_a_department_id THEN FLOOR(20 + RAND() * 10)
    WHEN m.winner_department_id = m.participant_b_department_id THEN 1
    ELSE 0
  END,
  CASE
    WHEN sp.scoring_type = 'sets'
    AND m.winner_department_id = m.participant_a_department_id THEN '2-1'
    WHEN sp.scoring_type = 'sets'
    AND m.winner_department_id = m.participant_b_department_id THEN '1-2'
    WHEN m.winner_department_id = m.participant_a_department_id THEN '1-0'
    WHEN m.winner_department_id = m.participant_b_department_id THEN '0-1'
    ELSE '0-0'
  END,
  CASE
    WHEN m.winner_department_id = m.participant_a_department_id THEN 'a'
    WHEN m.winner_department_id = m.participant_b_department_id THEN 'b'
  END,
  'normal',
  @admin_id
FROM matches m
  JOIN tournaments t ON m.tournament_id = t.id
  LEFT JOIN sports sp ON sp.id = m.sport_id
WHERE (
    t.sport_fest_id = @fest_id
    OR t.name LIKE '%SGO Days 2026%'
  )
  AND m.winner_department_id IS NOT NULL
  AND m.participant_a_department_id IS NOT NULL
  AND m.participant_b_department_id IS NOT NULL;
-- 6) Sanity-normalise sport scoring types
UPDATE sports
SET scoring_type = 'binary'
WHERE code IN ('CHESS', 'CHECKERS', 'MOBILE_LEGENDS', 'TUG_OF_WAR');
UPDATE sports
SET scoring_type = 'sets'
WHERE code IN (
    'VOLLEYBALL',
    'VOLLEYBALL_MEN',
    'VOLLEYBALL_WOMEN',
    'BADMINTON',
    'BADMINTON_SINGLES',
    'BADMINTON_DOUBLES',
    'TABLE_TENNIS',
    'TABLE_TENNIS_MEN',
    'TABLE_TENNIS_WOMEN',
    'SEPAK_TAKRAW',
    'PICKLEBALL'
  );
UPDATE sports
SET scoring_type = 'points'
WHERE code IN (
    'BASKETBALL',
    'DARTS',
    'DARTS_MIXED',
    'SCRABBLE',
    'SCRABBLE_MIXED',
    'SUNGKA',
    'QUIZ_BEE',
    'BIBLE_QUIZ',
    'BIG_VOLLEYBALL',
    'SPIN_WHEEL'
  );
UPDATE sports
SET scoring_type = 'time'
WHERE code IN (
    'SUDOKU',
    'TRACK_FIELD',
    'BANNER_RACING',
    'SACK_RACE'
  );
-- 7) Verification
SELECT (
    SELECT COUNT(*)
    FROM tournaments
    WHERE name LIKE '%SGO Days 2026%'
      AND format = 'division_gauntlet'
  ) AS dg_tournaments,
  (
    SELECT COUNT(*)
    FROM tournaments
    WHERE name LIKE '%SGO Days 2026%'
      AND format = 'free_for_all'
  ) AS ffa_tournaments,
  (
    SELECT COUNT(*)
    FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
    WHERE t.name LIKE '%SGO Days 2026%'
  ) AS matches,
  (
    SELECT COUNT(*)
    FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
    WHERE t.name LIKE '%SGO Days 2026%'
      AND m.status = 'completed'
  ) AS completed,
  (
    SELECT COUNT(*)
    FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
    WHERE t.name LIKE '%SGO Days 2026%'
      AND m.winner_department_id IS NOT NULL
  ) AS with_winner,
  (
    SELECT COUNT(*)
    FROM match_results mr
      JOIN matches m ON mr.match_id = m.id
      JOIN tournaments t ON m.tournament_id = t.id
    WHERE t.name LIKE '%SGO Days 2026%'
  ) AS scored;
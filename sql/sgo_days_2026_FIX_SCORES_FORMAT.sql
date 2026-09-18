-- ============================================================
-- SGO DAYS 2026 — FIX SCORES + FORMAT (run after COMPLETE_ALL + RESULTS)
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
-- 1) ALL SGO tournaments -> division_gauntlet (never free_for_all)
UPDATE tournaments
SET format = 'division_gauntlet',
  status = 'completed'
WHERE sport_fest_id = @fest_id
  OR name LIKE '%SGO Days 2026%';
-- 2) Remove FFA-style matches created by RESULTS ladder (bracket_side = results)
--    Keep real bracket matches from COMPLETE_ALL (JHS-A, SHS-B, G1, CH-JHS, etc.)
DELETE mr
FROM match_results mr
  JOIN matches m ON mr.match_id = m.id
  JOIN tournaments t ON m.tournament_id = t.id
WHERE (
    t.sport_fest_id = @fest_id
    OR t.name LIKE '%SGO Days 2026%'
  )
  AND (
    m.bracket_side = 'results'
    OR m.bracket_position LIKE '% R1:%'
    OR m.bracket_position LIKE '% R2:%'
    OR m.bracket_position LIKE '% R3:%'
    OR m.bracket_position LIKE '% R4:%'
    OR m.bracket_position LIKE '% R5:%'
    OR m.match_number >= 9000
  );
DELETE m
FROM matches m
  JOIN tournaments t ON m.tournament_id = t.id
WHERE (
    t.sport_fest_id = @fest_id
    OR t.name LIKE '%SGO Days 2026%'
  )
  AND (
    m.bracket_side = 'results'
    OR m.bracket_position LIKE '% R1:%'
    OR m.bracket_position LIKE '% R2:%'
    OR m.bracket_position LIKE '% R3:%'
    OR m.bracket_position LIKE '% R4:%'
    OR m.bracket_position LIKE '% R5:%'
    OR m.match_number >= 9000
  );
-- 3) Helper: mark match completed with score when we know winner code
--    Pattern applied per tournament / bracket_position
-- Generic: any match that already has winner_department_id gets proper match_results
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
    WHEN m.winner_department_id = m.participant_a_department_id THEN 2
    ELSE 0
  END,
  CASE
    WHEN m.winner_department_id = m.participant_b_department_id THEN 2
    ELSE 0
  END,
  CASE
    WHEN m.winner_department_id = m.participant_a_department_id THEN '2-0'
    WHEN m.winner_department_id = m.participant_b_department_id THEN '0-2'
    ELSE '0-0'
  END,
  CASE
    WHEN m.winner_department_id = m.participant_a_department_id THEN 'a'
    WHEN m.winner_department_id = m.participant_b_department_id THEN 'b'
    ELSE NULL
  END,
  'normal',
  @admin_id
FROM matches m
  JOIN tournaments t ON m.tournament_id = t.id
WHERE (
    t.sport_fest_id = @fest_id
    OR t.name LIKE '%SGO Days 2026%'
  )
  AND m.winner_department_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM match_results mr
    WHERE mr.match_id = m.id
  );
UPDATE matches m
  JOIN tournaments t ON m.tournament_id = t.id
SET m.status = 'completed',
  m.completed_at = COALESCE(
    m.completed_at,
    CONCAT(
      m.scheduled_date,
      ' ',
      IFNULL(m.scheduled_time, '12:00:00')
    )
  )
WHERE (
    t.sport_fest_id = @fest_id
    OR t.name LIKE '%SGO Days 2026%'
  )
  AND m.winner_department_id IS NOT NULL;
-- 4) Fill winners for core COMPLETE_ALL matches from official sheet ranks
--    Only when both sides known and no winner yet.
-- Chess Men (from sheet + earlier path)
UPDATE matches m
  JOIN tournaments t ON m.tournament_id = t.id
SET m.winner_department_id = (
    SELECT id
    FROM departments
    WHERE code = 'MANTIS'
  ),
  m.status = 'completed',
  m.completed_at = '2026-09-14 08:20:00'
WHERE t.name = 'Chess (Men) - SGO Days 2026'
  AND m.bracket_position = 'JHS-A'
  AND m.winner_department_id IS NULL;
UPDATE matches m
  JOIN tournaments t ON m.tournament_id = t.id
SET m.winner_department_id = (
    SELECT id
    FROM departments
    WHERE code = 'DOLPHIN'
  ),
  m.status = 'completed',
  m.completed_at = '2026-09-14 09:20:00'
WHERE t.name = 'Chess (Men) - SGO Days 2026'
  AND m.bracket_position = 'JHS-B'
  AND m.winner_department_id IS NULL;
UPDATE matches m
  JOIN tournaments t ON m.tournament_id = t.id
SET m.winner_department_id = (
    SELECT id
    FROM departments
    WHERE code = 'PANTHER'
  ),
  m.status = 'completed',
  m.completed_at = '2026-09-14 10:20:00'
WHERE t.name = 'Chess (Men) - SGO Days 2026'
  AND m.bracket_position = 'SHS-A'
  AND m.winner_department_id IS NULL;
UPDATE matches m
  JOIN tournaments t ON m.tournament_id = t.id
SET m.winner_department_id = (
    SELECT id
    FROM departments
    WHERE code = 'STALLION'
  ),
  m.status = 'completed',
  m.completed_at = '2026-09-14 11:20:00'
WHERE t.name = 'Chess (Men) - SGO Days 2026'
  AND m.bracket_position = 'SHS-B'
  AND m.winner_department_id IS NULL;
-- 5) For EVERY remaining scheduled/pending SGO match with both participants:
--    set winner = participant_a (placeholder) only if still null — better: use ranking from tournament_results
-- Prefer winner from tournament_results ranks: higher rank (lower number) beats lower rank
UPDATE matches m
  JOIN tournaments t ON m.tournament_id = t.id
  LEFT JOIN tournament_results tra ON tra.tournament_id = t.id
  AND tra.department_id = m.participant_a_department_id
  LEFT JOIN tournament_results trb ON trb.tournament_id = t.id
  AND trb.department_id = m.participant_b_department_id
SET m.winner_department_id = CASE
    WHEN tra.`rank` IS NOT NULL
    AND trb.`rank` IS NOT NULL
    AND tra.`rank` < trb.`rank` THEN m.participant_a_department_id
    WHEN tra.`rank` IS NOT NULL
    AND trb.`rank` IS NOT NULL
    AND trb.`rank` < tra.`rank` THEN m.participant_b_department_id
    WHEN tra.`rank` IS NOT NULL
    AND trb.`rank` IS NULL THEN m.participant_a_department_id
    WHEN trb.`rank` IS NOT NULL
    AND tra.`rank` IS NULL THEN m.participant_b_department_id
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
-- Exhibition vs Night Owls: real team wins
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
-- 6) Rebuild match_results with scoring type-aware displays
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
    AND m.winner_department_id = m.participant_a_department_id THEN 21
    WHEN sp.scoring_type = 'points'
    AND m.winner_department_id = m.participant_b_department_id THEN 14
    WHEN sp.scoring_type = 'sets'
    AND m.winner_department_id = m.participant_a_department_id THEN 2
    WHEN sp.scoring_type = 'sets'
    AND m.winner_department_id = m.participant_b_department_id THEN 1
    WHEN m.winner_department_id = m.participant_a_department_id THEN 1
    ELSE 0
  END,
  CASE
    WHEN sp.scoring_type = 'points'
    AND m.winner_department_id = m.participant_b_department_id THEN 21
    WHEN sp.scoring_type = 'points'
    AND m.winner_department_id = m.participant_a_department_id THEN 14
    WHEN sp.scoring_type = 'sets'
    AND m.winner_department_id = m.participant_b_department_id THEN 2
    WHEN sp.scoring_type = 'sets'
    AND m.winner_department_id = m.participant_a_department_id THEN 1
    WHEN m.winner_department_id = m.participant_b_department_id THEN 1
    ELSE 0
  END,
  CASE
    WHEN sp.scoring_type = 'points'
    AND m.winner_department_id = m.participant_a_department_id THEN '21-14'
    WHEN sp.scoring_type = 'points'
    AND m.winner_department_id = m.participant_b_department_id THEN '14-21'
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
    ELSE NULL
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
-- 7) Matches that only have one side (TBD / exhibition incomplete) stay pending
UPDATE matches m
  JOIN tournaments t ON m.tournament_id = t.id
SET m.status = 'completed'
WHERE (
    t.sport_fest_id = @fest_id
    OR t.name LIKE '%SGO Days 2026%'
  )
  AND m.winner_department_id IS NOT NULL
  AND m.status <> 'completed';
-- 8) Ensure sports scoring_type is sensible
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
    'SPIN_WHEEL',
    'MOBILE_LEGENDS'
  );
UPDATE sports
SET scoring_type = 'time'
WHERE code IN (
    'SUDOKU',
    'TRACK_FIELD',
    'BANNER_RACING',
    'SACK_RACE'
  );
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
    FROM match_results mr
      JOIN matches m ON mr.match_id = m.id
      JOIN tournaments t ON m.tournament_id = t.id
    WHERE t.name LIKE '%SGO Days 2026%'
  ) AS scored,
  (
    SELECT COUNT(*)
    FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
    WHERE t.name LIKE '%SGO Days 2026%'
      AND m.status = 'completed'
  ) AS completed;
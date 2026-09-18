-- ============================================================
-- FILE: sgo_days_2026_COMPLETE_ALL.sql
-- PURPOSE: Complete SGO Days 2026 seed — departments, sports,
--          venues, tournaments, teams, players, official results,
--          bonus points. Bracket-filling is done in
--          setupDatabase.js (fillBrackets) because DELIMITER /
--          CREATE PROCEDURE don't work through mysql2.
-- ============================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
-- ══════════════════════════════════════════════════════════════
-- SECTION 1 — DEPARTMENTS
-- ══════════════════════════════════════════════════════════════
INSERT INTO departments (
    name,
    short_name,
    code,
    division,
    is_exhibition,
    is_active
  )
VALUES (
    'College of Arts and Sciences',
    'CAS',
    'CAS',
    'college',
    0,
    1
  ),
  (
    'College of Business Administration',
    'CBA',
    'CBA',
    'college',
    0,
    1
  ),
  (
    'College of Education',
    'CED',
    'CED',
    'college',
    0,
    1
  ),
  (
    'College of Engineering',
    'CEN',
    'CEN',
    'college',
    0,
    1
  ),
  (
    'College of Nursing',
    'CON',
    'CON',
    'college',
    0,
    1
  ),
  (
    'College of Information Technology',
    'CIT',
    'CIT',
    'college',
    0,
    1
  ) ON DUPLICATE KEY
UPDATE name =
VALUES(name),
  is_active = 1;
INSERT INTO departments (
    name,
    short_name,
    code,
    division,
    is_exhibition,
    is_active
  )
VALUES (
    'Praying Mantis',
    'Praying Mantis',
    'MANTIS',
    'junior_high',
    0,
    1
  ),
  (
    'Buzzing Bees',
    'Buzzing Bees',
    'BBEES',
    'junior_high',
    0,
    1
  ),
  (
    'Dolphins',
    'Dolphins',
    'DOLPHIN',
    'junior_high',
    0,
    1
  ),
  (
    'Red Fox',
    'Red Fox',
    'REDFOX',
    'junior_high',
    0,
    1
  ),
  (
    'Panther',
    'Panther',
    'PANTHER',
    'senior_high',
    0,
    1
  ),
  (
    'Dashing Peacock',
    'Dashing Peacock',
    'DPEACOCK',
    'senior_high',
    0,
    1
  ),
  (
    'Stallions',
    'Stallions',
    'STALLION',
    'senior_high',
    0,
    1
  ),
  (
    'Supreme Goat',
    'Supreme Goat',
    'SGOAT',
    'senior_high',
    0,
    1
  ),
  (
    'Night Owls',
    'Night Owls',
    'NOWL',
    'senior_high',
    1,
    1
  ) ON DUPLICATE KEY
UPDATE name =
VALUES(name),
  short_name =
VALUES(short_name),
  division =
VALUES(division),
  is_exhibition =
VALUES(is_exhibition),
  is_active =
VALUES(is_active);
UPDATE departments
SET is_active = 0
WHERE division = 'college'
  OR code IN (
    'EAGLE',
    'PYTHON',
    'PHOENIX',
    'LYNX',
    'CHEETAH',
    'FAC',
    'SGO'
  );
-- ══════════════════════════════════════════════════════════════
-- SECTION 2 — SPORTS (authoritative scoring types)
-- ══════════════════════════════════════════════════════════════
INSERT INTO sports (
    name,
    code,
    category,
    scoring_type,
    min_players,
    max_players,
    team_size,
    is_team_sport,
    is_active
  )
VALUES (
    'Basketball',
    'BASKETBALL',
    'team',
    'points',
    5,
    15,
    5,
    1,
    1
  ),
  (
    'Volleyball Men',
    'VOLLEYBALL_MEN',
    'team',
    'sets',
    6,
    12,
    6,
    1,
    1
  ),
  (
    'Volleyball Women',
    'VOLLEYBALL_WOMEN',
    'team',
    'sets',
    6,
    12,
    6,
    1,
    1
  ),
  (
    'Badminton Singles',
    'BADMINTON_SINGLES',
    'individual',
    'sets',
    1,
    1,
    1,
    0,
    1
  ),
  (
    'Badminton Doubles',
    'BADMINTON_DOUBLES',
    'team',
    'sets',
    2,
    2,
    2,
    1,
    1
  ),
  (
    'Table Tennis Men',
    'TABLE_TENNIS_MEN',
    'individual',
    'sets',
    1,
    1,
    1,
    0,
    1
  ),
  (
    'Table Tennis Women',
    'TABLE_TENNIS_WOMEN',
    'individual',
    'sets',
    1,
    1,
    1,
    0,
    1
  ),
  (
    'Pickleball',
    'PICKLEBALL',
    'team',
    'sets',
    1,
    4,
    2,
    1,
    1
  ),
  (
    'Sepak Takraw',
    'SEPAK_TAKRAW',
    'team',
    'sets',
    3,
    6,
    3,
    1,
    1
  ),
  (
    'Mobile Legends',
    'MOBILE_LEGENDS',
    'team',
    'binary',
    5,
    7,
    5,
    1,
    1
  ),
  (
    'Track and Field',
    'TRACK_FIELD',
    'individual',
    'time',
    1,
    1,
    1,
    0,
    1
  ),
  (
    'Darts',
    'DARTS',
    'individual',
    'points',
    1,
    2,
    1,
    0,
    1
  ),
  (
    'Darts Mixed',
    'DARTS_MIXED',
    'team',
    'points',
    2,
    2,
    2,
    1,
    1
  ),
  (
    'Chess',
    'CHESS',
    'individual',
    'binary',
    1,
    1,
    1,
    0,
    1
  ),
  (
    'Checkers',
    'CHECKERS',
    'individual',
    'binary',
    1,
    1,
    1,
    0,
    1
  ),
  (
    'Scrabble',
    'SCRABBLE',
    'individual',
    'points',
    1,
    2,
    1,
    0,
    1
  ),
  (
    'Scrabble Mixed',
    'SCRABBLE_MIXED',
    'team',
    'points',
    2,
    2,
    2,
    1,
    1
  ),
  (
    'Sudoku',
    'SUDOKU',
    'individual',
    'time',
    1,
    1,
    1,
    0,
    1
  ),
  (
    'Sungka',
    'SUNGKA',
    'individual',
    'points',
    1,
    2,
    1,
    0,
    1
  ),
  (
    'Quiz Bee',
    'QUIZ_BEE',
    'individual',
    'points',
    1,
    5,
    1,
    0,
    1
  ),
  (
    'Bible Quiz',
    'BIBLE_QUIZ',
    'individual',
    'points',
    1,
    5,
    1,
    0,
    1
  ),
  (
    'Banner Racing',
    'BANNER_RACING',
    'team',
    'time',
    2,
    4,
    2,
    1,
    1
  ),
  (
    'Big Volleyball',
    'BIG_VOLLEYBALL',
    'team',
    'points',
    4,
    12,
    6,
    1,
    1
  ),
  (
    'Spin the Wheel',
    'SPIN_WHEEL',
    'team',
    'points',
    1,
    6,
    1,
    1,
    1
  ),
  (
    'Tug of War',
    'TUG_OF_WAR',
    'team',
    'binary',
    6,
    12,
    8,
    1,
    1
  ),
  (
    'Sack Race',
    'SACK_RACE',
    'team',
    'time',
    2,
    6,
    2,
    1,
    1
  ) ON DUPLICATE KEY
UPDATE scoring_type =
VALUES(scoring_type),
  category =
VALUES(category),
  min_players =
VALUES(min_players),
  max_players =
VALUES(max_players),
  team_size =
VALUES(team_size),
  is_team_sport =
VALUES(is_team_sport),
  is_active =
VALUES(is_active);
-- ══════════════════════════════════════════════════════════════
-- SECTION 3 — VENUES
-- ══════════════════════════════════════════════════════════════
INSERT INTO venues (name, location, is_active)
VALUES ('Board Games Area', 'Main Building', 1),
  ('Gym', 'Sports Complex', 1),
  ('Covered Court', 'Sports Complex', 1),
  ('Computer Lab', 'ICT Building', 1),
  ('Open Field', 'Campus Grounds', 1),
  ('Pickleball Court', 'Sports Complex', 1) ON DUPLICATE KEY
UPDATE is_active = 1;
-- ══════════════════════════════════════════════════════════════
-- SECTION 4 — SPORT FEST EVENT
-- ══════════════════════════════════════════════════════════════
INSERT INTO sport_fest_events (
    name,
    year,
    status,
    is_current,
    start_date,
    end_date,
    champion_count
  )
VALUES (
    'High School SGO Days 2026',
    2026,
    'ongoing',
    1,
    '2026-09-14',
    '2026-09-16',
    2
  ) ON DUPLICATE KEY
UPDATE is_current = 1,
  status = 'ongoing',
  champion_count = 2;
UPDATE sport_fest_events
SET is_current = 0
WHERE NOT (
    year = 2026
    AND name = 'High School SGO Days 2026'
  );
UPDATE sport_fest_events
SET is_current = 1
WHERE year = 2026
  AND name = 'High School SGO Days 2026';
SET @fest_id = (
    SELECT id
    FROM sport_fest_events
    WHERE year = 2026
      AND name = 'High School SGO Days 2026'
    LIMIT 1
  );
-- ══════════════════════════════════════════════════════════════
-- SECTION 5 — TOURNAMENTS
-- ══════════════════════════════════════════════════════════════
INSERT INTO tournaments (
    name,
    sport_id,
    sport_fest_id,
    format,
    gender,
    status,
    start_date,
    end_date,
    created_by
  )
SELECT CONCAT(s.name, ' (Men) - SGO Days 2026'),
  s.id,
  @fest_id,
  'division_gauntlet',
  'men',
  'ongoing',
  '2026-09-14',
  '2026-09-15',
  (
    SELECT id
    FROM users
    WHERE role = 'admin'
    LIMIT 1
  )
FROM sports s
WHERE s.code IN (
    'CHESS',
    'SCRABBLE',
    'CHECKERS',
    'DARTS',
    'SUDOKU',
    'SUNGKA',
    'TABLE_TENNIS_MEN'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM tournaments t
    WHERE t.name = CONCAT(s.name, ' (Men) - SGO Days 2026')
      AND t.sport_fest_id = @fest_id
  );
INSERT INTO tournaments (
    name,
    sport_id,
    sport_fest_id,
    format,
    gender,
    status,
    start_date,
    end_date,
    created_by
  )
SELECT CONCAT(s.name, ' (Women) - SGO Days 2026'),
  s.id,
  @fest_id,
  'division_gauntlet',
  'women',
  'ongoing',
  '2026-09-14',
  '2026-09-15',
  (
    SELECT id
    FROM users
    WHERE role = 'admin'
    LIMIT 1
  )
FROM sports s
WHERE s.code IN (
    'CHESS',
    'SCRABBLE',
    'CHECKERS',
    'DARTS',
    'SUDOKU',
    'SUNGKA',
    'TABLE_TENNIS_WOMEN'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM tournaments t
    WHERE t.name = CONCAT(s.name, ' (Women) - SGO Days 2026')
      AND t.sport_fest_id = @fest_id
  );
INSERT INTO tournaments (
    name,
    sport_id,
    sport_fest_id,
    format,
    gender,
    status,
    start_date,
    end_date,
    created_by
  )
SELECT CONCAT(s.name, ' - SGO Days 2026'),
  s.id,
  @fest_id,
  'division_gauntlet',
  'open',
  'ongoing',
  '2026-09-14',
  '2026-09-16',
  (
    SELECT id
    FROM users
    WHERE role = 'admin'
    LIMIT 1
  )
FROM sports s
WHERE s.code IN (
    'BASKETBALL',
    'VOLLEYBALL_MEN',
    'VOLLEYBALL_WOMEN',
    'BADMINTON_SINGLES',
    'BADMINTON_DOUBLES',
    'PICKLEBALL',
    'SEPAK_TAKRAW',
    'MOBILE_LEGENDS',
    'TRACK_FIELD'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM tournaments t
    WHERE t.name = CONCAT(s.name, ' - SGO Days 2026')
      AND t.sport_fest_id = @fest_id
  );
INSERT INTO tournaments (
    name,
    sport_id,
    sport_fest_id,
    format,
    gender,
    status,
    start_date,
    end_date,
    created_by
  )
SELECT CONCAT(s.name, ' - SGO Days 2026'),
  s.id,
  @fest_id,
  'free_for_all',
  'open',
  'ongoing',
  '2026-09-14',
  '2026-09-16',
  (
    SELECT id
    FROM users
    WHERE role = 'admin'
    LIMIT 1
  )
FROM sports s
WHERE s.code IN (
    'QUIZ_BEE',
    'BIBLE_QUIZ',
    'BANNER_RACING',
    'BIG_VOLLEYBALL',
    'SPIN_WHEEL',
    'TUG_OF_WAR',
    'SACK_RACE'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM tournaments t
    WHERE t.name = CONCAT(s.name, ' - SGO Days 2026')
      AND t.sport_fest_id = @fest_id
  );
INSERT IGNORE INTO sport_fest_tournaments (sport_fest_id, tournament_id)
SELECT @fest_id,
  id
FROM tournaments
WHERE sport_fest_id = @fest_id;
INSERT IGNORE INTO tournament_participants (tournament_id, department_id, status, no_points)
SELECT t.id,
  d.id,
  'active',
  CASE
    WHEN d.is_exhibition = 1 THEN 1
    ELSE 0
  END
FROM tournaments t
  JOIN departments d ON d.code IN (
    'MANTIS',
    'BBEES',
    'DOLPHIN',
    'REDFOX',
    'PANTHER',
    'DPEACOCK',
    'STALLION',
    'SGOAT',
    'NOWL'
  )
WHERE t.sport_fest_id = @fest_id;
-- ══════════════════════════════════════════════════════════════
-- SECTION 6 — TEAMS + PLAYERS
-- ══════════════════════════════════════════════════════════════
INSERT INTO teams (
    name,
    department_id,
    sport_id,
    gender,
    sport_fest_id
  )
SELECT CONCAT(
    COALESCE(d.short_name, d.name, d.code, 'Team'),
    ' - ',
    COALESCE(s.code, 'SPORT'),
    ' ',
    COALESCE(t.gender, 'open')
  ),
  d.id,
  s.id,
  CASE
    WHEN t.gender = 'men' THEN 'Men'
    WHEN t.gender = 'women' THEN 'Women'
    ELSE 'Mixed'
  END,
  @fest_id
FROM tournaments t
  JOIN sports s ON s.id = t.sport_id
  JOIN departments d ON d.code IN (
    'MANTIS',
    'BBEES',
    'DOLPHIN',
    'REDFOX',
    'PANTHER',
    'DPEACOCK',
    'STALLION',
    'SGOAT',
    'NOWL'
  )
WHERE t.sport_fest_id = @fest_id
  AND NOT EXISTS (
    SELECT 1
    FROM teams x
    WHERE x.department_id = d.id
      AND x.sport_id = s.id
      AND x.sport_fest_id = @fest_id
      AND x.gender = CASE
        WHEN t.gender = 'men' THEN 'Men'
        WHEN t.gender = 'women' THEN 'Women'
        ELSE 'Mixed'
      END
  );
INSERT INTO players (
    first_name,
    last_name,
    gender,
    department_id,
    sport_id,
    team_id,
    jersey_number,
    status,
    sport_fest_id
  )
SELECT CONCAT(
    COALESCE(d.code, 'TEAM'),
    ' ',
    COALESCE(s.code, 'SPORT'),
    ' P',
    seq.n
  ),
  CONCAT('Player ', seq.n),
  CASE
    WHEN t.gender = 'Women' THEN 'Female'
    ELSE 'Male'
  END,
  t.department_id,
  t.sport_id,
  t.id,
  LPAD(seq.n, 2, '0'),
  'approved',
  @fest_id
FROM teams t
  JOIN departments d ON d.id = t.department_id
  JOIN sports s ON s.id = t.sport_id
  JOIN (
    SELECT 1 AS n
    UNION ALL
    SELECT 2
    UNION ALL
    SELECT 3
    UNION ALL
    SELECT 4
    UNION ALL
    SELECT 5
  ) AS seq ON seq.n <= CASE
    WHEN s.is_team_sport = 1 THEN 5
    ELSE 2
  END
WHERE t.sport_fest_id = @fest_id
  AND NOT EXISTS (
    SELECT 1
    FROM players p
    WHERE p.team_id = t.id
  );
-- ══════════════════════════════════════════════════════════════
-- SECTION 7 — OFFICIAL TOURNAMENT RESULTS (from result sheets)
-- ══════════════════════════════════════════════════════════════
DROP TEMPORARY TABLE IF EXISTS tmp_results;
CREATE TEMPORARY TABLE tmp_results (
  sport_code VARCHAR(40) NOT NULL,
  gender VARCHAR(20) NOT NULL,
  division_code VARCHAR(20) NOT NULL,
  rank_pos INT NOT NULL,
  medal VARCHAR(20) NULL,
  points INT NOT NULL
);
-- MAJOR (100/90/80/70)
INSERT INTO tmp_results
VALUES ('BASKETBALL', 'open', 'STALLION', 1, 'gold', 100),
  ('BASKETBALL', 'open', 'PANTHER', 2, 'silver', 90),
  ('BASKETBALL', 'open', 'DPEACOCK', 3, 'bronze', 80),
  ('BASKETBALL', 'open', 'SGOAT', 4, NULL, 70),
  ('BASKETBALL', 'open', 'NOWL', 5, NULL, 60),
  ('BASKETBALL', 'open', 'REDFOX', 1, 'gold', 100),
  ('BASKETBALL', 'open', 'BBEES', 2, 'silver', 90),
  ('BASKETBALL', 'open', 'DOLPHIN', 3, 'bronze', 80),
  ('BASKETBALL', 'open', 'MANTIS', 4, NULL, 70),
  ('VOLLEYBALL_MEN', 'men', 'STALLION', 1, 'gold', 100),
  ('VOLLEYBALL_MEN', 'men', 'DPEACOCK', 2, 'silver', 90),
  ('VOLLEYBALL_MEN', 'men', 'SGOAT', 3, 'bronze', 80),
  ('VOLLEYBALL_MEN', 'men', 'PANTHER', 4, NULL, 70),
  ('VOLLEYBALL_MEN', 'men', 'REDFOX', 1, 'gold', 100),
  ('VOLLEYBALL_MEN', 'men', 'DOLPHIN', 2, 'silver', 90),
  ('VOLLEYBALL_MEN', 'men', 'BBEES', 3, 'bronze', 80),
  ('VOLLEYBALL_MEN', 'men', 'MANTIS', 4, NULL, 70),
  ('VOLLEYBALL_WOMEN', 'women', 'SGOAT', 1, 'gold', 100),
  (
    'VOLLEYBALL_WOMEN',
    'women',
    'DPEACOCK',
    2,
    'silver',
    90
  ),
  (
    'VOLLEYBALL_WOMEN',
    'women',
    'PANTHER',
    3,
    'bronze',
    80
  ),
  ('VOLLEYBALL_WOMEN', 'women', 'STALLION', 4, NULL, 70),
  ('VOLLEYBALL_WOMEN', 'women', 'NOWL', 5, NULL, 60),
  (
    'VOLLEYBALL_WOMEN',
    'women',
    'DOLPHIN',
    1,
    'gold',
    100
  ),
  (
    'VOLLEYBALL_WOMEN',
    'women',
    'REDFOX',
    2,
    'silver',
    90
  ),
  ('VOLLEYBALL_WOMEN', 'women', 'BBEES', 3, 'bronze', 80),
  ('VOLLEYBALL_WOMEN', 'women', 'MANTIS', 4, NULL, 70),
  ('BADMINTON_SINGLES', 'men', 'SGOAT', 1, 'gold', 100),
  (
    'BADMINTON_SINGLES',
    'men',
    'PANTHER',
    2,
    'silver',
    90
  ),
  (
    'BADMINTON_SINGLES',
    'men',
    'STALLION',
    3,
    'bronze',
    80
  ),
  ('BADMINTON_SINGLES', 'men', 'DPEACOCK', 4, NULL, 70),
  ('BADMINTON_SINGLES', 'men', 'NOWL', 5, NULL, 60),
  ('BADMINTON_SINGLES', 'men', 'MANTIS', 1, 'gold', 100),
  ('BADMINTON_SINGLES', 'men', 'BBEES', 2, 'silver', 90),
  ('BADMINTON_SINGLES', 'men', 'REDFOX', 3, 'bronze', 80),
  ('BADMINTON_SINGLES', 'men', 'DOLPHIN', 4, NULL, 70),
  (
    'BADMINTON_SINGLES',
    'women',
    'PANTHER',
    1,
    'gold',
    100
  ),
  (
    'BADMINTON_SINGLES',
    'women',
    'DPEACOCK',
    2,
    'silver',
    90
  ),
  (
    'BADMINTON_SINGLES',
    'women',
    'STALLION',
    3,
    'bronze',
    80
  ),
  ('BADMINTON_SINGLES', 'women', 'SGOAT', 4, NULL, 70),
  ('BADMINTON_SINGLES', 'women', 'NOWL', 5, NULL, 60),
  (
    'BADMINTON_SINGLES',
    'women',
    'DOLPHIN',
    1,
    'gold',
    100
  ),
  (
    'BADMINTON_SINGLES',
    'women',
    'REDFOX',
    2,
    'silver',
    90
  ),
  (
    'BADMINTON_SINGLES',
    'women',
    'BBEES',
    3,
    'bronze',
    80
  ),
  ('BADMINTON_SINGLES', 'women', 'MANTIS', 4, NULL, 70),
  ('BADMINTON_DOUBLES', 'men', 'SGOAT', 1, 'gold', 100),
  (
    'BADMINTON_DOUBLES',
    'men',
    'DPEACOCK',
    2,
    'silver',
    90
  ),
  (
    'BADMINTON_DOUBLES',
    'men',
    'PANTHER',
    3,
    'bronze',
    80
  ),
  ('BADMINTON_DOUBLES', 'men', 'NOWL', 4, NULL, 70),
  ('BADMINTON_DOUBLES', 'men', 'STALLION', 5, NULL, 60),
  ('BADMINTON_DOUBLES', 'men', 'BBEES', 1, 'gold', 100),
  ('BADMINTON_DOUBLES', 'men', 'REDFOX', 2, 'silver', 90),
  ('BADMINTON_DOUBLES', 'men', 'MANTIS', 3, 'bronze', 80),
  ('BADMINTON_DOUBLES', 'men', 'DOLPHIN', 4, NULL, 70),
  (
    'BADMINTON_DOUBLES',
    'women',
    'DPEACOCK',
    1,
    'gold',
    100
  ),
  (
    'BADMINTON_DOUBLES',
    'women',
    'SGOAT',
    2,
    'silver',
    90
  ),
  (
    'BADMINTON_DOUBLES',
    'women',
    'PANTHER',
    3,
    'bronze',
    80
  ),
  ('BADMINTON_DOUBLES', 'women', 'STALLION', 4, NULL, 70),
  ('BADMINTON_DOUBLES', 'women', 'NOWL', 5, NULL, 60),
  (
    'BADMINTON_DOUBLES',
    'women',
    'REDFOX',
    1,
    'gold',
    100
  ),
  (
    'BADMINTON_DOUBLES',
    'women',
    'MANTIS',
    2,
    'silver',
    90
  ),
  (
    'BADMINTON_DOUBLES',
    'women',
    'BBEES',
    3,
    'bronze',
    80
  ),
  ('BADMINTON_DOUBLES', 'women', 'DOLPHIN', 4, NULL, 70),
  ('TABLE_TENNIS_MEN', 'men', 'PANTHER', 1, 'gold', 100),
  ('TABLE_TENNIS_MEN', 'men', 'SGOAT', 2, 'silver', 90),
  ('TABLE_TENNIS_MEN', 'men', 'BBEES', 1, 'gold', 100),
  ('TABLE_TENNIS_MEN', 'men', 'DOLPHIN', 2, 'silver', 90),
  ('TABLE_TENNIS_MEN', 'men', 'REDFOX', 3, 'bronze', 80),
  ('TABLE_TENNIS_MEN', 'men', 'MANTIS', 4, NULL, 70),
  (
    'TABLE_TENNIS_WOMEN',
    'women',
    'PANTHER',
    1,
    'gold',
    100
  ),
  (
    'TABLE_TENNIS_WOMEN',
    'women',
    'SGOAT',
    2,
    'silver',
    90
  ),
  (
    'TABLE_TENNIS_WOMEN',
    'women',
    'DPEACOCK',
    3,
    'bronze',
    80
  ),
  ('PICKLEBALL', 'men', 'PANTHER', 1, 'gold', 100),
  ('PICKLEBALL', 'men', 'NOWL', 2, 'silver', 90),
  ('PICKLEBALL', 'men', 'SGOAT', 3, 'bronze', 80),
  ('PICKLEBALL', 'men', 'DPEACOCK', 4, NULL, 70),
  ('PICKLEBALL', 'men', 'STALLION', 5, NULL, 60),
  ('PICKLEBALL', 'men', 'REDFOX', 1, 'gold', 100),
  ('PICKLEBALL', 'men', 'MANTIS', 2, 'silver', 90),
  ('PICKLEBALL', 'men', 'BBEES', 3, 'bronze', 80),
  ('PICKLEBALL', 'men', 'DOLPHIN', 4, NULL, 70),
  ('PICKLEBALL', 'women', 'SGOAT', 1, 'gold', 100),
  ('PICKLEBALL', 'women', 'NOWL', 2, 'silver', 90),
  ('PICKLEBALL', 'women', 'PANTHER', 3, 'bronze', 80),
  ('PICKLEBALL', 'women', 'DPEACOCK', 4, NULL, 70),
  ('PICKLEBALL', 'women', 'STALLION', 5, NULL, 60),
  ('PICKLEBALL', 'women', 'REDFOX', 1, 'gold', 100),
  ('PICKLEBALL', 'women', 'DOLPHIN', 2, 'silver', 90),
  ('PICKLEBALL', 'women', 'MANTIS', 3, 'bronze', 80),
  ('PICKLEBALL', 'women', 'BBEES', 4, NULL, 70),
  ('PICKLEBALL', 'mixed', 'SGOAT', 1, 'gold', 100),
  ('PICKLEBALL', 'mixed', 'NOWL', 2, 'silver', 90),
  ('PICKLEBALL', 'mixed', 'DPEACOCK', 3, 'bronze', 80),
  ('PICKLEBALL', 'mixed', 'PANTHER', 4, NULL, 70),
  ('PICKLEBALL', 'mixed', 'STALLION', 5, NULL, 60),
  ('PICKLEBALL', 'mixed', 'REDFOX', 1, 'gold', 100),
  ('PICKLEBALL', 'mixed', 'DOLPHIN', 2, 'silver', 90),
  ('PICKLEBALL', 'mixed', 'MANTIS', 3, 'bronze', 80),
  ('PICKLEBALL', 'mixed', 'BBEES', 4, NULL, 70),
  ('SEPAK_TAKRAW', 'open', 'STALLION', 1, 'gold', 100),
  ('SEPAK_TAKRAW', 'open', 'SGOAT', 2, 'silver', 90),
  ('SEPAK_TAKRAW', 'open', 'DPEACOCK', 3, 'bronze', 80),
  ('SEPAK_TAKRAW', 'open', 'PANTHER', 4, NULL, 70),
  ('SEPAK_TAKRAW', 'open', 'NOWL', 5, NULL, 60),
  ('SEPAK_TAKRAW', 'open', 'REDFOX', 1, 'gold', 100),
  ('SEPAK_TAKRAW', 'open', 'BBEES', 2, 'silver', 90),
  ('MOBILE_LEGENDS', 'open', 'PANTHER', 1, 'gold', 100),
  ('MOBILE_LEGENDS', 'open', 'SGOAT', 2, 'silver', 90),
  ('MOBILE_LEGENDS', 'open', 'STALLION', 3, 'bronze', 80),
  ('MOBILE_LEGENDS', 'open', 'DPEACOCK', 4, NULL, 70),
  ('MOBILE_LEGENDS', 'open', 'NOWL', 5, NULL, 60),
  ('MOBILE_LEGENDS', 'open', 'REDFOX', 1, 'gold', 100),
  ('MOBILE_LEGENDS', 'open', 'DOLPHIN', 2, 'silver', 90),
  ('MOBILE_LEGENDS', 'open', 'MANTIS', 3, 'bronze', 80),
  ('MOBILE_LEGENDS', 'open', 'BBEES', 4, NULL, 70),
  ('TRACK_FIELD', 'women', 'PANTHER', 1, 'gold', 100),
  ('TRACK_FIELD', 'women', 'NOWL', 2, 'silver', 90),
  ('TRACK_FIELD', 'women', 'DPEACOCK', 3, 'bronze', 80),
  ('TRACK_FIELD', 'women', 'STALLION', 4, NULL, 70),
  ('TRACK_FIELD', 'women', 'BBEES', 1, 'gold', 100),
  ('TRACK_FIELD', 'women', 'REDFOX', 2, 'silver', 90),
  ('TRACK_FIELD', 'women', 'MANTIS', 3, 'bronze', 80),
  ('TRACK_FIELD', 'women', 'DOLPHIN', 4, NULL, 70),
  ('TRACK_FIELD', 'men', 'STALLION', 1, 'gold', 100),
  ('TRACK_FIELD', 'men', 'SGOAT', 2, 'silver', 90),
  ('TRACK_FIELD', 'men', 'DPEACOCK', 3, 'bronze', 80),
  ('TRACK_FIELD', 'men', 'PANTHER', 4, NULL, 70),
  ('TRACK_FIELD', 'men', 'NOWL', 5, NULL, 60),
  ('TRACK_FIELD', 'men', 'MANTIS', 1, 'gold', 100),
  ('TRACK_FIELD', 'men', 'DOLPHIN', 2, 'silver', 90),
  ('TRACK_FIELD', 'men', 'BBEES', 3, 'bronze', 80),
  ('TRACK_FIELD', 'men', 'REDFOX', 4, NULL, 70);
-- BOARD/MIND (50/40/30/20)
INSERT INTO tmp_results
VALUES ('DARTS', 'men', 'STALLION', 1, 'gold', 50),
  ('DARTS', 'men', 'SGOAT', 2, 'silver', 40),
  ('DARTS', 'men', 'DPEACOCK', 3, 'bronze', 30),
  ('DARTS', 'men', 'PANTHER', 4, NULL, 20),
  ('DARTS', 'men', 'BBEES', 1, 'gold', 50),
  ('DARTS', 'men', 'REDFOX', 2, 'silver', 40),
  ('DARTS', 'men', 'MANTIS', 3, 'bronze', 30),
  ('DARTS', 'men', 'DOLPHIN', 4, NULL, 20),
  ('DARTS', 'women', 'SGOAT', 1, 'gold', 50),
  ('DARTS', 'women', 'DPEACOCK', 2, 'silver', 40),
  ('DARTS', 'women', 'PANTHER', 3, 'bronze', 30),
  ('DARTS', 'women', 'STALLION', 4, NULL, 20),
  ('DARTS', 'women', 'REDFOX', 1, 'gold', 50),
  ('DARTS', 'women', 'DOLPHIN', 2, 'silver', 40),
  ('DARTS', 'women', 'MANTIS', 3, 'bronze', 30),
  ('DARTS', 'women', 'BBEES', 4, NULL, 20),
  ('DARTS_MIXED', 'mixed', 'SGOAT', 1, 'gold', 50),
  ('DARTS_MIXED', 'mixed', 'DPEACOCK', 2, 'silver', 40),
  ('DARTS_MIXED', 'mixed', 'STALLION', 3, 'bronze', 30),
  ('DARTS_MIXED', 'mixed', 'PANTHER', 4, NULL, 20),
  ('DARTS_MIXED', 'mixed', 'BBEES', 1, 'gold', 50),
  ('DARTS_MIXED', 'mixed', 'REDFOX', 2, 'silver', 40),
  ('DARTS_MIXED', 'mixed', 'DOLPHIN', 3, 'bronze', 30),
  ('DARTS_MIXED', 'mixed', 'MANTIS', 4, NULL, 20),
  ('CHESS', 'women', 'SGOAT', 1, 'gold', 50),
  ('CHESS', 'women', 'PANTHER', 2, 'silver', 40),
  ('CHESS', 'women', 'DPEACOCK', 3, 'bronze', 30),
  ('CHESS', 'women', 'STALLION', 4, NULL, 20),
  ('CHESS', 'women', 'BBEES', 1, 'gold', 50),
  ('CHESS', 'women', 'DOLPHIN', 2, 'silver', 40),
  ('CHESS', 'women', 'REDFOX', 3, 'bronze', 30),
  ('CHESS', 'women', 'MANTIS', 4, NULL, 20),
  ('CHESS', 'men', 'STALLION', 1, 'gold', 50),
  ('CHESS', 'men', 'PANTHER', 2, 'silver', 40),
  ('CHESS', 'men', 'SGOAT', 3, 'bronze', 30),
  ('CHESS', 'men', 'DPEACOCK', 4, NULL, 20),
  ('CHESS', 'men', 'REDFOX', 1, 'gold', 50),
  ('CHESS', 'men', 'BBEES', 2, 'silver', 40),
  ('CHESS', 'men', 'MANTIS', 3, 'bronze', 30),
  ('CHESS', 'men', 'DOLPHIN', 4, NULL, 20),
  ('CHECKERS', 'men', 'PANTHER', 1, 'gold', 50),
  ('CHECKERS', 'men', 'STALLION', 2, 'silver', 40),
  ('CHECKERS', 'men', 'DPEACOCK', 3, 'bronze', 30),
  ('CHECKERS', 'men', 'SGOAT', 4, NULL, 20),
  ('CHECKERS', 'men', 'REDFOX', 1, 'gold', 50),
  ('CHECKERS', 'men', 'MANTIS', 2, 'silver', 40),
  ('CHECKERS', 'men', 'DOLPHIN', 3, 'bronze', 30),
  ('CHECKERS', 'men', 'BBEES', 4, NULL, 20),
  ('CHECKERS', 'women', 'DPEACOCK', 1, 'gold', 50),
  ('CHECKERS', 'women', 'STALLION', 2, 'silver', 40),
  ('CHECKERS', 'women', 'PANTHER', 3, 'bronze', 30),
  ('CHECKERS', 'women', 'SGOAT', 4, NULL, 20),
  ('CHECKERS', 'women', 'REDFOX', 1, 'gold', 50),
  ('CHECKERS', 'women', 'DOLPHIN', 2, 'silver', 40),
  ('CHECKERS', 'women', 'BBEES', 3, 'bronze', 30),
  ('CHECKERS', 'women', 'MANTIS', 4, NULL, 20),
  ('SCRABBLE', 'women', 'SGOAT', 1, 'gold', 50),
  ('SCRABBLE', 'women', 'PANTHER', 2, 'silver', 40),
  ('SCRABBLE', 'women', 'DPEACOCK', 3, 'bronze', 30),
  ('SCRABBLE', 'women', 'NOWL', 4, NULL, 20),
  ('SCRABBLE', 'women', 'STALLION', 5, NULL, 10),
  ('SCRABBLE', 'women', 'REDFOX', 1, 'gold', 50),
  ('SCRABBLE', 'women', 'DOLPHIN', 2, 'silver', 40),
  ('SCRABBLE', 'women', 'MANTIS', 3, 'bronze', 30),
  ('SCRABBLE', 'men', 'SGOAT', 1, 'gold', 50),
  ('SCRABBLE', 'men', 'PANTHER', 2, 'silver', 40),
  ('SCRABBLE', 'men', 'DOLPHIN', 1, 'gold', 50),
  ('SCRABBLE_MIXED', 'mixed', 'SGOAT', 1, 'gold', 50),
  ('SCRABBLE_MIXED', 'mixed', 'PANTHER', 2, 'silver', 40),
  (
    'SCRABBLE_MIXED',
    'mixed',
    'DPEACOCK',
    3,
    'bronze',
    30
  ),
  ('SCRABBLE_MIXED', 'mixed', 'STALLION', 4, NULL, 20),
  ('SCRABBLE_MIXED', 'mixed', 'DOLPHIN', 1, 'gold', 50),
  ('SUDOKU', 'open', 'SGOAT', 1, 'gold', 50),
  ('SUDOKU', 'open', 'STALLION', 2, 'silver', 40),
  ('SUDOKU', 'open', 'PANTHER', 3, 'bronze', 30),
  ('SUDOKU', 'open', 'DPEACOCK', 4, NULL, 20),
  ('SUDOKU', 'open', 'DOLPHIN', 1, 'gold', 50),
  ('SUDOKU', 'open', 'REDFOX', 2, 'silver', 40),
  ('SUDOKU', 'open', 'MANTIS', 3, 'bronze', 30),
  ('SUDOKU', 'open', 'BBEES', 4, NULL, 20),
  ('QUIZ_BEE', 'open', 'PANTHER', 1, 'gold', 50),
  ('QUIZ_BEE', 'open', 'SGOAT', 2, 'silver', 40),
  ('QUIZ_BEE', 'open', 'STALLION', 3, 'bronze', 30),
  ('QUIZ_BEE', 'open', 'DOLPHIN', 1, 'gold', 50),
  ('QUIZ_BEE', 'open', 'REDFOX', 2, 'silver', 40),
  ('QUIZ_BEE', 'open', 'BBEES', 3, 'bronze', 30),
  ('BIBLE_QUIZ', 'open', 'STALLION', 1, 'gold', 50),
  ('BIBLE_QUIZ', 'open', 'PANTHER', 2, 'silver', 40),
  ('BIBLE_QUIZ', 'open', 'SGOAT', 3, 'bronze', 30),
  ('BIBLE_QUIZ', 'open', 'BBEES', 1, 'gold', 50),
  ('BIBLE_QUIZ', 'open', 'DOLPHIN', 2, 'silver', 40),
  ('BIBLE_QUIZ', 'open', 'MANTIS', 3, 'bronze', 30);
-- LARONG PINOY (25/20/15/10/5)
INSERT INTO tmp_results
VALUES ('BANNER_RACING', 'open', 'SGOAT', 1, 'gold', 25),
  ('BANNER_RACING', 'open', 'PANTHER', 2, 'silver', 20),
  ('BANNER_RACING', 'open', 'DPEACOCK', 3, 'bronze', 15),
  ('BANNER_RACING', 'open', 'NOWL', 4, NULL, 10),
  ('BANNER_RACING', 'open', 'STALLION', 5, NULL, 5),
  ('BANNER_RACING', 'open', 'DOLPHIN', 1, 'gold', 25),
  ('BANNER_RACING', 'open', 'BBEES', 2, 'silver', 20),
  ('BANNER_RACING', 'open', 'MANTIS', 3, 'bronze', 15),
  ('BANNER_RACING', 'open', 'REDFOX', 4, NULL, 10),
  ('BIG_VOLLEYBALL', 'open', 'DPEACOCK', 1, 'gold', 25),
  ('BIG_VOLLEYBALL', 'open', 'STALLION', 2, 'silver', 20),
  ('BIG_VOLLEYBALL', 'open', 'SGOAT', 3, 'bronze', 15),
  ('BIG_VOLLEYBALL', 'open', 'NOWL', 4, NULL, 10),
  ('BIG_VOLLEYBALL', 'open', 'PANTHER', 5, NULL, 5),
  ('BIG_VOLLEYBALL', 'open', 'REDFOX', 1, 'gold', 25),
  ('BIG_VOLLEYBALL', 'open', 'BBEES', 2, 'silver', 20),
  ('BIG_VOLLEYBALL', 'open', 'DOLPHIN', 3, 'bronze', 15),
  ('BIG_VOLLEYBALL', 'open', 'MANTIS', 4, NULL, 10),
  ('SPIN_WHEEL', 'open', 'DPEACOCK', 1, 'gold', 25),
  ('SPIN_WHEEL', 'open', 'STALLION', 2, 'silver', 20),
  ('SPIN_WHEEL', 'open', 'SGOAT', 3, 'bronze', 15),
  ('SPIN_WHEEL', 'open', 'REDFOX', 1, 'gold', 25),
  ('SPIN_WHEEL', 'open', 'DOLPHIN', 2, 'silver', 20),
  ('SPIN_WHEEL', 'open', 'BBEES', 3, 'bronze', 15),
  ('SPIN_WHEEL', 'open', 'MANTIS', 4, NULL, 10),
  ('TUG_OF_WAR', 'open', 'DPEACOCK', 1, 'gold', 25),
  ('TUG_OF_WAR', 'open', 'STALLION', 2, 'silver', 20),
  ('TUG_OF_WAR', 'open', 'PANTHER', 3, 'bronze', 15),
  ('TUG_OF_WAR', 'open', 'SGOAT', 4, NULL, 10),
  ('TUG_OF_WAR', 'open', 'NOWL', 5, NULL, 5),
  ('TUG_OF_WAR', 'open', 'DOLPHIN', 1, 'gold', 25),
  ('TUG_OF_WAR', 'open', 'BBEES', 2, 'silver', 20),
  ('TUG_OF_WAR', 'open', 'MANTIS', 3, 'bronze', 15),
  ('TUG_OF_WAR', 'open', 'REDFOX', 4, NULL, 10),
  ('SACK_RACE', 'open', 'STALLION', 1, 'gold', 25),
  ('SACK_RACE', 'open', 'DPEACOCK', 2, 'silver', 20),
  ('SACK_RACE', 'open', 'NOWL', 3, 'bronze', 15),
  ('SACK_RACE', 'open', 'DOLPHIN', 1, 'gold', 25),
  ('SACK_RACE', 'open', 'REDFOX', 2, 'silver', 20),
  ('SACK_RACE', 'open', 'BBEES', 3, 'bronze', 15),
  ('SACK_RACE', 'open', 'MANTIS', 4, NULL, 10);
DELETE tr
FROM tournament_results tr
  JOIN tournaments t ON tr.tournament_id = t.id
WHERE t.sport_fest_id = @fest_id;
INSERT INTO tournament_results (
    tournament_id,
    department_id,
    `rank`,
    medal,
    sport_fest_points,
    finalized_at
  )
SELECT t.id,
  d.id,
  r.rank_pos,
  r.medal,
  r.points,
  '2026-09-16 18:00:00'
FROM tmp_results r
  JOIN tournaments t ON t.sport_id = (
    SELECT id
    FROM sports
    WHERE code = r.sport_code
    LIMIT 1
  )
  AND t.sport_fest_id = @fest_id
  AND (
    (
      r.sport_code IN (
        'CHESS',
        'SCRABBLE',
        'CHECKERS',
        'DARTS',
        'SUDOKU',
        'SUNGKA',
        'TABLE_TENNIS_MEN',
        'TABLE_TENNIS_WOMEN',
        'BADMINTON_SINGLES',
        'BADMINTON_DOUBLES'
      )
      AND t.gender = r.gender
    )
    OR (
      r.sport_code NOT IN (
        'CHESS',
        'SCRABBLE',
        'CHECKERS',
        'DARTS',
        'SUDOKU',
        'SUNGKA',
        'TABLE_TENNIS_MEN',
        'TABLE_TENNIS_WOMEN',
        'BADMINTON_SINGLES',
        'BADMINTON_DOUBLES'
      )
      AND (
        t.gender = r.gender
        OR r.gender = 'open'
      )
    )
  )
  JOIN departments d ON d.code = r.division_code;
UPDATE tournaments
SET status = 'completed',
  updated_at = NOW()
WHERE sport_fest_id = @fest_id;
-- ══════════════════════════════════════════════════════════════
-- SECTION 8 — LITERARY / MUSICAL BONUS POINTS
-- ══════════════════════════════════════════════════════════════
DELETE FROM sport_fest_bonus_points
WHERE sport_fest_id = @fest_id;
INSERT INTO sport_fest_bonus_points (
    sport_fest_id,
    department_id,
    points,
    reason,
    created_by
  )
SELECT @fest_id,
  d.id,
  r.pts,
  r.reason,
  (
    SELECT id
    FROM users
    WHERE role = 'admin'
    LIMIT 1
  )
FROM (
    SELECT 'SGOAT' AS code,
      50 AS pts,
      'Literary/Musical — Mr. SGO (Champion)' AS reason
    UNION ALL
    SELECT 'STALLION',
      40,
      'Literary/Musical — Mr. SGO (1st RU)'
    UNION ALL
    SELECT 'DPEACOCK',
      30,
      'Literary/Musical — Mr. SGO (2nd RU)'
    UNION ALL
    SELECT 'PANTHER',
      20,
      'Literary/Musical — Mr. SGO (3rd RU)'
    UNION ALL
    SELECT 'SGOAT',
      50,
      'Literary/Musical — Ms. SGO (Champion)'
    UNION ALL
    SELECT 'STALLION',
      40,
      'Literary/Musical — Ms. SGO (1st RU)'
    UNION ALL
    SELECT 'PANTHER',
      30,
      'Literary/Musical — Ms. SGO (2nd RU)'
    UNION ALL
    SELECT 'DPEACOCK',
      20,
      'Literary/Musical — Ms. SGO (3rd RU)'
    UNION ALL
    SELECT 'NOWL',
      50,
      'Literary/Musical — Group Impersonation (Champion)'
    UNION ALL
    SELECT 'STALLION',
      40,
      'Literary/Musical — Group Impersonation (1st RU)'
    UNION ALL
    SELECT 'PANTHER',
      30,
      'Literary/Musical — Group Impersonation (2nd RU)'
    UNION ALL
    SELECT 'SGOAT',
      20,
      'Literary/Musical — Group Impersonation (3rd RU)'
    UNION ALL
    SELECT 'DPEACOCK',
      10,
      'Literary/Musical — Group Impersonation (4th RU)'
    UNION ALL
    SELECT 'PANTHER',
      50,
      'Literary/Musical — Theatrical Act (Champion)'
    UNION ALL
    SELECT 'DPEACOCK',
      40,
      'Literary/Musical — Theatrical Act (1st RU)'
    UNION ALL
    SELECT 'NOWL',
      30,
      'Literary/Musical — Theatrical Act (2nd RU)'
    UNION ALL
    SELECT 'STALLION',
      50,
      'Literary/Musical — Zumba (Champion)'
    UNION ALL
    SELECT 'PANTHER',
      40,
      'Literary/Musical — Zumba (1st RU)'
    UNION ALL
    SELECT 'NOWL',
      30,
      'Literary/Musical — Zumba (2nd RU)'
    UNION ALL
    SELECT 'DPEACOCK',
      20,
      'Literary/Musical — Zumba (3rd RU)'
    UNION ALL
    SELECT 'SGOAT',
      10,
      'Literary/Musical — Zumba (4th RU)'
    UNION ALL
    SELECT 'PANTHER',
      50,
      'Literary/Musical — Booth-Making (Champion)'
    UNION ALL
    SELECT 'SGOAT',
      40,
      'Literary/Musical — Booth-Making (1st RU)'
    UNION ALL
    SELECT 'DPEACOCK',
      30,
      'Literary/Musical — Booth-Making (2nd RU)'
    UNION ALL
    SELECT 'STALLION',
      20,
      'Literary/Musical — Booth-Making (3rd RU)'
    UNION ALL
    SELECT 'REDFOX',
      50,
      'Literary/Musical — Mr. SGO JHS (Champion)'
    UNION ALL
    SELECT 'DOLPHIN',
      40,
      'Literary/Musical — Mr. SGO JHS (1st RU)'
    UNION ALL
    SELECT 'MANTIS',
      30,
      'Literary/Musical — Mr. SGO JHS (2nd RU)'
    UNION ALL
    SELECT 'BBEES',
      20,
      'Literary/Musical — Mr. SGO JHS (3rd RU)'
    UNION ALL
    SELECT 'REDFOX',
      50,
      'Literary/Musical — Ms. SGO JHS (Champion)'
    UNION ALL
    SELECT 'BBEES',
      40,
      'Literary/Musical — Ms. SGO JHS (1st RU)'
    UNION ALL
    SELECT 'DOLPHIN',
      30,
      'Literary/Musical — Ms. SGO JHS (2nd RU)'
    UNION ALL
    SELECT 'MANTIS',
      20,
      'Literary/Musical — Ms. SGO JHS (3rd RU)'
    UNION ALL
    SELECT 'REDFOX',
      50,
      'Literary/Musical — Group Impersonation JHS (Champion)'
    UNION ALL
    SELECT 'MANTIS',
      50,
      'Literary/Musical — Theatrical Act JHS (Champion)'
    UNION ALL
    SELECT 'REDFOX',
      50,
      'Literary/Musical — Zumba JHS (Champion)'
    UNION ALL
    SELECT 'DOLPHIN',
      40,
      'Literary/Musical — Zumba JHS (1st RU)'
    UNION ALL
    SELECT 'MANTIS',
      30,
      'Literary/Musical — Zumba JHS (2nd RU)'
    UNION ALL
    SELECT 'BBEES',
      20,
      'Literary/Musical — Zumba JHS (3rd RU)'
    UNION ALL
    SELECT 'DOLPHIN',
      50,
      'Literary/Musical — Booth-Making JHS (Champion)'
    UNION ALL
    SELECT 'REDFOX',
      40,
      'Literary/Musical — Booth-Making JHS (1st RU)'
    UNION ALL
    SELECT 'BBEES',
      30,
      'Literary/Musical — Booth-Making JHS (2nd RU)'
    UNION ALL
    SELECT 'MANTIS',
      20,
      'Literary/Musical — Booth-Making JHS (3rd RU)'
  ) r
  JOIN departments d ON d.code = r.code;
-- ══════════════════════════════════════════════════════════════
-- SECTION 9 — REBUILD DEPARTMENT SCORES
-- ══════════════════════════════════════════════════════════════
INSERT INTO department_scores (
    department_id,
    sport_fest_id,
    total_points,
    bonus_points
  )
SELECT d.id,
  @fest_id,
  0,
  0
FROM departments d
WHERE d.is_active = 1 ON DUPLICATE KEY
UPDATE department_id = department_id;
UPDATE department_scores
SET total_points = 0,
  bonus_points = 0,
  gold_medals = 0,
  silver_medals = 0,
  bronze_medals = 0,
  total_participations = 0,
  tournaments_entered = 0
WHERE sport_fest_id = @fest_id;
UPDATE department_scores ds
  JOIN (
    SELECT tr.department_id,
      SUM(tr.sport_fest_points) AS pts,
      SUM(tr.medal = 'gold') AS g,
      SUM(tr.medal = 'silver') AS s,
      SUM(tr.medal = 'bronze') AS b,
      COUNT(*) AS cnt
    FROM tournament_results tr
      JOIN tournaments t ON tr.tournament_id = t.id
      JOIN sport_fest_tournaments sft ON sft.tournament_id = t.id
      AND sft.sport_fest_id = @fest_id
    GROUP BY tr.department_id
  ) x ON ds.department_id = x.department_id
  AND ds.sport_fest_id = @fest_id
SET ds.total_points = x.pts,
  ds.gold_medals = x.g,
  ds.silver_medals = x.s,
  ds.bronze_medals = x.b,
  ds.total_participations = x.cnt,
  ds.tournaments_entered = x.cnt;
UPDATE department_scores ds
  JOIN (
    SELECT department_id,
      SUM(points) AS bonus
    FROM sport_fest_bonus_points
    WHERE sport_fest_id = @fest_id
    GROUP BY department_id
  ) b ON ds.department_id = b.department_id
  AND ds.sport_fest_id = @fest_id
SET ds.bonus_points = b.bonus,
  ds.total_points = ds.total_points + b.bonus;
DROP TEMPORARY TABLE IF EXISTS tmp_results;
SET FOREIGN_KEY_CHECKS = 1;
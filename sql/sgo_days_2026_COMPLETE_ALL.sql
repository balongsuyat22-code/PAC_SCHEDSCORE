START TRANSACTION;

DELETE s FROM schedules s
JOIN tournaments t ON s.tournament_id = t.id
WHERE t.name LIKE '%SGO Days 2026%' OR t.sport_fest_id = (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1);

DELETE m FROM matches m
JOIN tournaments t ON m.tournament_id = t.id
WHERE t.name LIKE '%SGO Days 2026%' OR t.sport_fest_id = (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1);

DELETE tp FROM tournament_participants tp
JOIN tournaments t ON tp.tournament_id = t.id
WHERE t.name LIKE '%SGO Days 2026%' OR t.sport_fest_id = (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1);

DELETE sft FROM sport_fest_tournaments sft
JOIN tournaments t ON sft.tournament_id = t.id
WHERE t.name LIKE '%SGO Days 2026%' OR t.sport_fest_id = (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1);

DELETE p FROM players p
JOIN teams t ON p.team_id = t.id
WHERE t.sport_fest_id = (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
   OR t.name LIKE '%CHESS%' OR t.name LIKE '%SCRABBLE%' OR t.name LIKE '%CHECKERS%'
   OR t.name LIKE '%DARTS%' OR t.name LIKE '%SUDOKU%' OR t.name LIKE '%SUNGKA%'
   OR t.name LIKE '%Basketball%' OR t.name LIKE '%Volleyball%' OR t.name LIKE '%Badminton%'
   OR t.name LIKE '%Table Tennis%' OR t.name LIKE '%Sepak%' OR t.name LIKE '%Mobile%';

DELETE FROM teams
WHERE sport_fest_id = (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
   OR name LIKE '%CHESS%' OR name LIKE '%SCRABBLE%' OR name LIKE '%CHECKERS%'
   OR name LIKE '%DARTS%' OR name LIKE '%SUDOKU%' OR name LIKE '%SUNGKA%'
   OR name LIKE '%Basketball%' OR name LIKE '%Volleyball%' OR name LIKE '%Badminton%'
   OR name LIKE '%Table Tennis%' OR name LIKE '%Sepak%' OR name LIKE '%Mobile%';

DELETE FROM tournaments
WHERE name LIKE '%SGO Days 2026%' OR sport_fest_id = (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1);

INSERT INTO tournaments (name, sport_id, sport_fest_id, format, gender, status, start_date, end_date, created_by)
SELECT 'Chess (Men) - SGO Days 2026', (SELECT id FROM sports WHERE code='CHESS'),
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       'division_gauntlet','men','ongoing','2026-09-14','2026-09-15',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO sport_fest_tournaments (sport_fest_id, tournament_id)
SELECT (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1);

INSERT INTO tournament_participants (tournament_id, department_id)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1), d.id
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Chess (Men) Day 2 Game 1 - MANTIS vs BBEES',
       (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','07:30:00','08:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHESS'),1,1,'JHS-A',
       (SELECT id FROM departments WHERE code='MANTIS'),
       (SELECT id FROM departments WHERE code='BBEES'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Chess (Men) Day 2 Game 2 - DOLPHIN vs REDFOX',
       (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','08:30:00','09:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHESS'),1,2,'JHS-B',
       (SELECT id FROM departments WHERE code='DOLPHIN'),
       (SELECT id FROM departments WHERE code='REDFOX'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Chess (Men) Day 2 Game 3 - PANTHER vs DPEACOCK',
       (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','09:30:00','10:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHESS'),1,3,'SHS-A',
       (SELECT id FROM departments WHERE code='PANTHER'),
       (SELECT id FROM departments WHERE code='DPEACOCK'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','09:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Chess (Men) Day 2 Game 4 - STALLION vs SGOAT',
       (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','10:30:00','11:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHESS'),1,4,'SHS-B',
       (SELECT id FROM departments WHERE code='STALLION'),
       (SELECT id FROM departments WHERE code='SGOAT'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','10:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Chess (Men) Day 2 Game 5 - Winner SHS-B vs Night Owls',
       (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','11:30:00','12:30:00','Exhibition - Winner of SHS-B vs NOWL',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHESS'),1,5,'NOWL',
       NULL,
       (SELECT id FROM departments WHERE code='NOWL'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-14','11:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Chess (Men) Day 3 - LL-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','07:30:00','08:30:00','Loser vs Loser JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHESS'),2,0,'LL-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Chess (Men) Day 3 - WW-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','08:30:00','09:30:00','Winner vs Winner SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHESS'),2,0,'WW-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Chess (Men) Day 3 - CH-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','14:00:00','15:00:00','Championship JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHESS'),2,0,'CH-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','14:00:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Chess (Men) Day 3 - CH-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','15:00:00','16:00:00','Championship SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHESS'),2,0,'CH-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','15:00:00';

INSERT INTO teams (name, department_id, sport_id, gender, sport_fest_id)
SELECT CONCAT(d.name,' - CHESS (Men)'), d.id, (SELECT id FROM sports WHERE code='CHESS'), 'men',
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO tournaments (name, sport_id, sport_fest_id, format, gender, status, start_date, end_date, created_by)
SELECT 'Scrabble (Men) - SGO Days 2026', (SELECT id FROM sports WHERE code='SCRABBLE'),
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       'division_gauntlet','men','ongoing','2026-09-14','2026-09-15',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO sport_fest_tournaments (sport_fest_id, tournament_id)
SELECT (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1);

INSERT INTO tournament_participants (tournament_id, department_id)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1), d.id
FROM departments d WHERE d.code IN ('DOLPHIN','DPEACOCK','EAGLE','NOWL','PANTHER','PYTHON','REDFOX','SGOAT','STALLION');

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Scrabble (Men) Day 2 Game 1 - PYTHON vs EAGLE',
       (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','07:30:00','08:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SCRABBLE'),1,1,'JHS-A',
       (SELECT id FROM departments WHERE code='PYTHON'),
       (SELECT id FROM departments WHERE code='EAGLE'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='rmontemayor' LIMIT 1),
       'scheduled','2026-09-14','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Scrabble (Men) Day 2 Game 2 - DOLPHIN vs REDFOX',
       (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','08:30:00','09:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SCRABBLE'),1,2,'JHS-B',
       (SELECT id FROM departments WHERE code='DOLPHIN'),
       (SELECT id FROM departments WHERE code='REDFOX'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='mdumaboc' LIMIT 1),
       'scheduled','2026-09-14','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Scrabble (Men) Day 2 Game 3 - PANTHER vs DPEACOCK',
       (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','09:30:00','10:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SCRABBLE'),1,3,'SHS-A',
       (SELECT id FROM departments WHERE code='PANTHER'),
       (SELECT id FROM departments WHERE code='DPEACOCK'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='rmontemayor' LIMIT 1),
       'scheduled','2026-09-14','09:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Scrabble (Men) Day 2 Game 4 - STALLION vs SGOAT',
       (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','10:30:00','11:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SCRABBLE'),1,4,'SHS-B',
       (SELECT id FROM departments WHERE code='STALLION'),
       (SELECT id FROM departments WHERE code='SGOAT'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='mdumaboc' LIMIT 1),
       'scheduled','2026-09-14','10:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Scrabble (Men) Day 2 Game 5 - Winner SHS-B vs Night Owls',
       (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','11:30:00','12:30:00','Exhibition - Winner of SHS-B vs NOWL',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SCRABBLE'),1,5,'NOWL',
       NULL,
       (SELECT id FROM departments WHERE code='NOWL'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='rmontemayor' LIMIT 1),
       'pending','2026-09-14','11:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Scrabble (Men) Day 3 - LL-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','07:30:00','08:30:00','Loser vs Loser JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SCRABBLE'),2,0,'LL-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='rmontemayor' LIMIT 1),
       'pending','2026-09-15','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Scrabble (Men) Day 3 - WW-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','08:30:00','09:30:00','Winner vs Winner SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SCRABBLE'),2,0,'WW-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='rmontemayor' LIMIT 1),
       'pending','2026-09-15','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Scrabble (Men) Day 3 - CH-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','14:00:00','15:00:00','Championship JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SCRABBLE'),2,0,'CH-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='rmontemayor' LIMIT 1),
       'pending','2026-09-15','14:00:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Scrabble (Men) Day 3 - CH-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','15:00:00','16:00:00','Championship SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SCRABBLE'),2,0,'CH-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='rmontemayor' LIMIT 1),
       'pending','2026-09-15','15:00:00';

INSERT INTO teams (name, department_id, sport_id, gender, sport_fest_id)
SELECT CONCAT(d.name,' - SCRABBLE (Men)'), d.id, (SELECT id FROM sports WHERE code='SCRABBLE'), 'men',
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
FROM departments d WHERE d.code IN ('DOLPHIN','DPEACOCK','EAGLE','NOWL','PANTHER','PYTHON','REDFOX','SGOAT','STALLION');

INSERT INTO tournaments (name, sport_id, sport_fest_id, format, gender, status, start_date, end_date, created_by)
SELECT 'Checkers (Men) - SGO Days 2026', (SELECT id FROM sports WHERE code='CHECKERS'),
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       'division_gauntlet','men','ongoing','2026-09-14','2026-09-15',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO sport_fest_tournaments (sport_fest_id, tournament_id)
SELECT (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1);

INSERT INTO tournament_participants (tournament_id, department_id)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1), d.id
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Checkers (Men) Day 2 Game 1 - MANTIS vs BBEES',
       (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','07:30:00','08:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHECKERS'),1,1,'JHS-A',
       (SELECT id FROM departments WHERE code='MANTIS'),
       (SELECT id FROM departments WHERE code='BBEES'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Checkers (Men) Day 2 Game 2 - DOLPHIN vs REDFOX',
       (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','08:30:00','09:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHECKERS'),1,2,'JHS-B',
       (SELECT id FROM departments WHERE code='DOLPHIN'),
       (SELECT id FROM departments WHERE code='REDFOX'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Checkers (Men) Day 2 Game 3 - PANTHER vs DPEACOCK',
       (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','09:30:00','10:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHECKERS'),1,3,'SHS-A',
       (SELECT id FROM departments WHERE code='PANTHER'),
       (SELECT id FROM departments WHERE code='DPEACOCK'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','09:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Checkers (Men) Day 2 Game 4 - STALLION vs SGOAT',
       (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','10:30:00','11:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHECKERS'),1,4,'SHS-B',
       (SELECT id FROM departments WHERE code='STALLION'),
       (SELECT id FROM departments WHERE code='SGOAT'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','10:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Checkers (Men) Day 2 Game 5 - Winner SHS-B vs Night Owls',
       (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','11:30:00','12:30:00','Exhibition - Winner of SHS-B vs NOWL',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHECKERS'),1,5,'NOWL',
       NULL,
       (SELECT id FROM departments WHERE code='NOWL'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-14','11:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Checkers (Men) Day 3 - LL-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','07:30:00','08:30:00','Loser vs Loser JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHECKERS'),2,0,'LL-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Checkers (Men) Day 3 - WW-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','08:30:00','09:30:00','Winner vs Winner SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHECKERS'),2,0,'WW-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Checkers (Men) Day 3 - CH-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','14:00:00','15:00:00','Championship JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHECKERS'),2,0,'CH-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','14:00:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Checkers (Men) Day 3 - CH-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','15:00:00','16:00:00','Championship SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHECKERS'),2,0,'CH-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','15:00:00';

INSERT INTO teams (name, department_id, sport_id, gender, sport_fest_id)
SELECT CONCAT(d.name,' - CHECKERS (Men)'), d.id, (SELECT id FROM sports WHERE code='CHECKERS'), 'men',
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO tournaments (name, sport_id, sport_fest_id, format, gender, status, start_date, end_date, created_by)
SELECT 'Darts (Men) - SGO Days 2026', (SELECT id FROM sports WHERE code='DARTS'),
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       'division_gauntlet','men','ongoing','2026-09-14','2026-09-15',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO sport_fest_tournaments (sport_fest_id, tournament_id)
SELECT (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1);

INSERT INTO tournament_participants (tournament_id, department_id)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1), d.id
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Darts (Men) Day 2 Game 1 - MANTIS vs BBEES',
       (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','07:30:00','08:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='DARTS'),1,1,'JHS-A',
       (SELECT id FROM departments WHERE code='MANTIS'),
       (SELECT id FROM departments WHERE code='BBEES'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Darts (Men) Day 2 Game 2 - DOLPHIN vs REDFOX',
       (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','08:30:00','09:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='DARTS'),1,2,'JHS-B',
       (SELECT id FROM departments WHERE code='DOLPHIN'),
       (SELECT id FROM departments WHERE code='REDFOX'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Darts (Men) Day 2 Game 3 - PANTHER vs DPEACOCK',
       (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','09:30:00','10:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='DARTS'),1,3,'SHS-A',
       (SELECT id FROM departments WHERE code='PANTHER'),
       (SELECT id FROM departments WHERE code='DPEACOCK'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','09:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Darts (Men) Day 2 Game 4 - STALLION vs SGOAT',
       (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','10:30:00','11:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='DARTS'),1,4,'SHS-B',
       (SELECT id FROM departments WHERE code='STALLION'),
       (SELECT id FROM departments WHERE code='SGOAT'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','10:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Darts (Men) Day 2 Game 5 - Winner SHS-B vs Night Owls',
       (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','11:30:00','12:30:00','Exhibition - Winner of SHS-B vs NOWL',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='DARTS'),1,5,'NOWL',
       NULL,
       (SELECT id FROM departments WHERE code='NOWL'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-14','11:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Darts (Men) Day 3 - LL-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','07:30:00','08:30:00','Loser vs Loser JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='DARTS'),2,0,'LL-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Darts (Men) Day 3 - WW-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','08:30:00','09:30:00','Winner vs Winner SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='DARTS'),2,0,'WW-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Darts (Men) Day 3 - CH-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','14:00:00','15:00:00','Championship JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='DARTS'),2,0,'CH-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','14:00:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Darts (Men) Day 3 - CH-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','15:00:00','16:00:00','Championship SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='DARTS'),2,0,'CH-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','15:00:00';

INSERT INTO teams (name, department_id, sport_id, gender, sport_fest_id)
SELECT CONCAT(d.name,' - DARTS (Men)'), d.id, (SELECT id FROM sports WHERE code='DARTS'), 'men',
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO tournaments (name, sport_id, sport_fest_id, format, gender, status, start_date, end_date, created_by)
SELECT 'Sudoku (Men) - SGO Days 2026', (SELECT id FROM sports WHERE code='SUDOKU'),
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       'division_gauntlet','men','ongoing','2026-09-14','2026-09-15',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO sport_fest_tournaments (sport_fest_id, tournament_id)
SELECT (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1);

INSERT INTO tournament_participants (tournament_id, department_id)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1), d.id
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sudoku (Men) Day 2 Game 1 - MANTIS vs BBEES',
       (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','07:30:00','08:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUDOKU'),1,1,'JHS-A',
       (SELECT id FROM departments WHERE code='MANTIS'),
       (SELECT id FROM departments WHERE code='BBEES'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sudoku (Men) Day 2 Game 2 - DOLPHIN vs REDFOX',
       (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','08:30:00','09:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUDOKU'),1,2,'JHS-B',
       (SELECT id FROM departments WHERE code='DOLPHIN'),
       (SELECT id FROM departments WHERE code='REDFOX'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sudoku (Men) Day 2 Game 3 - PANTHER vs DPEACOCK',
       (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','09:30:00','10:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUDOKU'),1,3,'SHS-A',
       (SELECT id FROM departments WHERE code='PANTHER'),
       (SELECT id FROM departments WHERE code='DPEACOCK'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','09:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sudoku (Men) Day 2 Game 4 - STALLION vs SGOAT',
       (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','10:30:00','11:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUDOKU'),1,4,'SHS-B',
       (SELECT id FROM departments WHERE code='STALLION'),
       (SELECT id FROM departments WHERE code='SGOAT'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','10:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sudoku (Men) Day 2 Game 5 - Winner SHS-B vs Night Owls',
       (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','11:30:00','12:30:00','Exhibition - Winner of SHS-B vs NOWL',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUDOKU'),1,5,'NOWL',
       NULL,
       (SELECT id FROM departments WHERE code='NOWL'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-14','11:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sudoku (Men) Day 3 - LL-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','07:30:00','08:30:00','Loser vs Loser JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUDOKU'),2,0,'LL-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sudoku (Men) Day 3 - WW-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','08:30:00','09:30:00','Winner vs Winner SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUDOKU'),2,0,'WW-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sudoku (Men) Day 3 - CH-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','14:00:00','15:00:00','Championship JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUDOKU'),2,0,'CH-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','14:00:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sudoku (Men) Day 3 - CH-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','15:00:00','16:00:00','Championship SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUDOKU'),2,0,'CH-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','15:00:00';

INSERT INTO teams (name, department_id, sport_id, gender, sport_fest_id)
SELECT CONCAT(d.name,' - SUDOKU (Men)'), d.id, (SELECT id FROM sports WHERE code='SUDOKU'), 'men',
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO tournaments (name, sport_id, sport_fest_id, format, gender, status, start_date, end_date, created_by)
SELECT 'Sungka (Men) - SGO Days 2026', (SELECT id FROM sports WHERE code='SUNGKA'),
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       'division_gauntlet','men','ongoing','2026-09-14','2026-09-15',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO sport_fest_tournaments (sport_fest_id, tournament_id)
SELECT (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1);

INSERT INTO tournament_participants (tournament_id, department_id)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1), d.id
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sungka (Men) Day 2 Game 1 - MANTIS vs BBEES',
       (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','07:30:00','08:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUNGKA'),1,1,'JHS-A',
       (SELECT id FROM departments WHERE code='MANTIS'),
       (SELECT id FROM departments WHERE code='BBEES'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='eremollo' LIMIT 1),
       'scheduled','2026-09-14','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sungka (Men) Day 2 Game 2 - DOLPHIN vs REDFOX',
       (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','08:30:00','09:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUNGKA'),1,2,'JHS-B',
       (SELECT id FROM departments WHERE code='DOLPHIN'),
       (SELECT id FROM departments WHERE code='REDFOX'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='eremollo' LIMIT 1),
       'scheduled','2026-09-14','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sungka (Men) Day 2 Game 3 - PANTHER vs DPEACOCK',
       (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','09:30:00','10:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUNGKA'),1,3,'SHS-A',
       (SELECT id FROM departments WHERE code='PANTHER'),
       (SELECT id FROM departments WHERE code='DPEACOCK'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='eremollo' LIMIT 1),
       'scheduled','2026-09-14','09:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sungka (Men) Day 2 Game 4 - STALLION vs SGOAT',
       (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','10:30:00','11:30:00','Day 2 Men Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUNGKA'),1,4,'SHS-B',
       (SELECT id FROM departments WHERE code='STALLION'),
       (SELECT id FROM departments WHERE code='SGOAT'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='eremollo' LIMIT 1),
       'scheduled','2026-09-14','10:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sungka (Men) Day 2 Game 5 - Winner SHS-B vs Night Owls',
       (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','11:30:00','12:30:00','Exhibition - Winner of SHS-B vs NOWL',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUNGKA'),1,5,'NOWL',
       NULL,
       (SELECT id FROM departments WHERE code='NOWL'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='eremollo' LIMIT 1),
       'pending','2026-09-14','11:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sungka (Men) Day 3 - LL-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','07:30:00','08:30:00','Loser vs Loser JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUNGKA'),2,0,'LL-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='eremollo' LIMIT 1),
       'pending','2026-09-15','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sungka (Men) Day 3 - WW-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','08:30:00','09:30:00','Winner vs Winner SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUNGKA'),2,0,'WW-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='eremollo' LIMIT 1),
       'pending','2026-09-15','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sungka (Men) Day 3 - CH-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','14:00:00','15:00:00','Championship JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUNGKA'),2,0,'CH-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='eremollo' LIMIT 1),
       'pending','2026-09-15','14:00:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sungka (Men) Day 3 - CH-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','15:00:00','16:00:00','Championship SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Men) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUNGKA'),2,0,'CH-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='eremollo' LIMIT 1),
       'pending','2026-09-15','15:00:00';

INSERT INTO teams (name, department_id, sport_id, gender, sport_fest_id)
SELECT CONCAT(d.name,' - SUNGKA (Men)'), d.id, (SELECT id FROM sports WHERE code='SUNGKA'), 'men',
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO tournaments (name, sport_id, sport_fest_id, format, gender, status, start_date, end_date, created_by)
SELECT 'Chess (Women) - SGO Days 2026', (SELECT id FROM sports WHERE code='CHESS'),
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       'division_gauntlet','women','ongoing','2026-09-14','2026-09-15',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO sport_fest_tournaments (sport_fest_id, tournament_id)
SELECT (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1);

INSERT INTO tournament_participants (tournament_id, department_id)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1), d.id
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Chess (Women) Day 2 Game 1 - MANTIS vs BBEES',
       (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','07:30:00','08:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHESS'),1,1,'JHS-A',
       (SELECT id FROM departments WHERE code='MANTIS'),
       (SELECT id FROM departments WHERE code='BBEES'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Chess (Women) Day 2 Game 2 - DOLPHIN vs REDFOX',
       (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','08:30:00','09:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHESS'),1,2,'JHS-B',
       (SELECT id FROM departments WHERE code='DOLPHIN'),
       (SELECT id FROM departments WHERE code='REDFOX'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Chess (Women) Day 2 Game 3 - PANTHER vs DPEACOCK',
       (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','09:30:00','10:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHESS'),1,3,'SHS-A',
       (SELECT id FROM departments WHERE code='PANTHER'),
       (SELECT id FROM departments WHERE code='DPEACOCK'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','09:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Chess (Women) Day 2 Game 4 - STALLION vs SGOAT',
       (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','10:30:00','11:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHESS'),1,4,'SHS-B',
       (SELECT id FROM departments WHERE code='STALLION'),
       (SELECT id FROM departments WHERE code='SGOAT'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','10:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Chess (Women) Day 2 Game 5 - Winner SHS-B vs Night Owls',
       (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','11:30:00','12:30:00','Exhibition - Winner of SHS-B vs NOWL',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHESS'),1,5,'NOWL',
       NULL,
       (SELECT id FROM departments WHERE code='NOWL'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-14','11:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Chess (Women) Day 3 - LL-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','07:30:00','08:30:00','Loser vs Loser JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHESS'),2,0,'LL-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Chess (Women) Day 3 - WW-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','08:30:00','09:30:00','Winner vs Winner SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHESS'),2,0,'WW-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Chess (Women) Day 3 - CH-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','14:00:00','15:00:00','Championship JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHESS'),2,0,'CH-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','14:00:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Chess (Women) Day 3 - CH-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','15:00:00','16:00:00','Championship SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Chess (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHESS'),2,0,'CH-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','15:00:00';

INSERT INTO teams (name, department_id, sport_id, gender, sport_fest_id)
SELECT CONCAT(d.name,' - CHESS (Women)'), d.id, (SELECT id FROM sports WHERE code='CHESS'), 'women',
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO tournaments (name, sport_id, sport_fest_id, format, gender, status, start_date, end_date, created_by)
SELECT 'Scrabble (Women) - SGO Days 2026', (SELECT id FROM sports WHERE code='SCRABBLE'),
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       'division_gauntlet','women','ongoing','2026-09-14','2026-09-15',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO sport_fest_tournaments (sport_fest_id, tournament_id)
SELECT (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1);

INSERT INTO tournament_participants (tournament_id, department_id)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1), d.id
FROM departments d WHERE d.code IN ('DOLPHIN','DPEACOCK','EAGLE','NOWL','PANTHER','PYTHON','REDFOX','SGOAT','STALLION');

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Scrabble (Women) Day 2 Game 1 - PYTHON vs EAGLE',
       (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','07:30:00','08:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SCRABBLE'),1,1,'JHS-A',
       (SELECT id FROM departments WHERE code='PYTHON'),
       (SELECT id FROM departments WHERE code='EAGLE'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='rmontemayor' LIMIT 1),
       'scheduled','2026-09-14','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Scrabble (Women) Day 2 Game 2 - DOLPHIN vs REDFOX',
       (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','08:30:00','09:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SCRABBLE'),1,2,'JHS-B',
       (SELECT id FROM departments WHERE code='DOLPHIN'),
       (SELECT id FROM departments WHERE code='REDFOX'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='mdumaboc' LIMIT 1),
       'scheduled','2026-09-14','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Scrabble (Women) Day 2 Game 3 - PANTHER vs DPEACOCK',
       (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','09:30:00','10:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SCRABBLE'),1,3,'SHS-A',
       (SELECT id FROM departments WHERE code='PANTHER'),
       (SELECT id FROM departments WHERE code='DPEACOCK'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='rmontemayor' LIMIT 1),
       'scheduled','2026-09-14','09:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Scrabble (Women) Day 2 Game 4 - STALLION vs SGOAT',
       (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','10:30:00','11:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SCRABBLE'),1,4,'SHS-B',
       (SELECT id FROM departments WHERE code='STALLION'),
       (SELECT id FROM departments WHERE code='SGOAT'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='mdumaboc' LIMIT 1),
       'scheduled','2026-09-14','10:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Scrabble (Women) Day 2 Game 5 - Winner SHS-B vs Night Owls',
       (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','11:30:00','12:30:00','Exhibition - Winner of SHS-B vs NOWL',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SCRABBLE'),1,5,'NOWL',
       NULL,
       (SELECT id FROM departments WHERE code='NOWL'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='rmontemayor' LIMIT 1),
       'pending','2026-09-14','11:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Scrabble (Women) Day 3 - LL-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','07:30:00','08:30:00','Loser vs Loser JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SCRABBLE'),2,0,'LL-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='rmontemayor' LIMIT 1),
       'pending','2026-09-15','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Scrabble (Women) Day 3 - WW-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','08:30:00','09:30:00','Winner vs Winner SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SCRABBLE'),2,0,'WW-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='rmontemayor' LIMIT 1),
       'pending','2026-09-15','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Scrabble (Women) Day 3 - CH-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','14:00:00','15:00:00','Championship JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SCRABBLE'),2,0,'CH-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='rmontemayor' LIMIT 1),
       'pending','2026-09-15','14:00:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Scrabble (Women) Day 3 - CH-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','15:00:00','16:00:00','Championship SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Scrabble (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SCRABBLE'),2,0,'CH-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='rmontemayor' LIMIT 1),
       'pending','2026-09-15','15:00:00';

INSERT INTO teams (name, department_id, sport_id, gender, sport_fest_id)
SELECT CONCAT(d.name,' - SCRABBLE (Women)'), d.id, (SELECT id FROM sports WHERE code='SCRABBLE'), 'women',
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
FROM departments d WHERE d.code IN ('DOLPHIN','DPEACOCK','EAGLE','NOWL','PANTHER','PYTHON','REDFOX','SGOAT','STALLION');

INSERT INTO tournaments (name, sport_id, sport_fest_id, format, gender, status, start_date, end_date, created_by)
SELECT 'Checkers (Women) - SGO Days 2026', (SELECT id FROM sports WHERE code='CHECKERS'),
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       'division_gauntlet','women','ongoing','2026-09-14','2026-09-15',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO sport_fest_tournaments (sport_fest_id, tournament_id)
SELECT (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1);

INSERT INTO tournament_participants (tournament_id, department_id)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1), d.id
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Checkers (Women) Day 2 Game 1 - MANTIS vs BBEES',
       (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','07:30:00','08:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHECKERS'),1,1,'JHS-A',
       (SELECT id FROM departments WHERE code='MANTIS'),
       (SELECT id FROM departments WHERE code='BBEES'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Checkers (Women) Day 2 Game 2 - DOLPHIN vs REDFOX',
       (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','08:30:00','09:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHECKERS'),1,2,'JHS-B',
       (SELECT id FROM departments WHERE code='DOLPHIN'),
       (SELECT id FROM departments WHERE code='REDFOX'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Checkers (Women) Day 2 Game 3 - PANTHER vs DPEACOCK',
       (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','09:30:00','10:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHECKERS'),1,3,'SHS-A',
       (SELECT id FROM departments WHERE code='PANTHER'),
       (SELECT id FROM departments WHERE code='DPEACOCK'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','09:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Checkers (Women) Day 2 Game 4 - STALLION vs SGOAT',
       (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','10:30:00','11:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHECKERS'),1,4,'SHS-B',
       (SELECT id FROM departments WHERE code='STALLION'),
       (SELECT id FROM departments WHERE code='SGOAT'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','10:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Checkers (Women) Day 2 Game 5 - Winner SHS-B vs Night Owls',
       (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','11:30:00','12:30:00','Exhibition - Winner of SHS-B vs NOWL',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHECKERS'),1,5,'NOWL',
       NULL,
       (SELECT id FROM departments WHERE code='NOWL'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-14','11:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Checkers (Women) Day 3 - LL-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','07:30:00','08:30:00','Loser vs Loser JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHECKERS'),2,0,'LL-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Checkers (Women) Day 3 - WW-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','08:30:00','09:30:00','Winner vs Winner SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHECKERS'),2,0,'WW-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Checkers (Women) Day 3 - CH-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','14:00:00','15:00:00','Championship JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHECKERS'),2,0,'CH-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','14:00:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Checkers (Women) Day 3 - CH-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','15:00:00','16:00:00','Championship SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Checkers (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='CHECKERS'),2,0,'CH-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','15:00:00';

INSERT INTO teams (name, department_id, sport_id, gender, sport_fest_id)
SELECT CONCAT(d.name,' - CHECKERS (Women)'), d.id, (SELECT id FROM sports WHERE code='CHECKERS'), 'women',
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO tournaments (name, sport_id, sport_fest_id, format, gender, status, start_date, end_date, created_by)
SELECT 'Darts (Women) - SGO Days 2026', (SELECT id FROM sports WHERE code='DARTS'),
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       'division_gauntlet','women','ongoing','2026-09-14','2026-09-15',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO sport_fest_tournaments (sport_fest_id, tournament_id)
SELECT (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1);

INSERT INTO tournament_participants (tournament_id, department_id)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1), d.id
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Darts (Women) Day 2 Game 1 - MANTIS vs BBEES',
       (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','07:30:00','08:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='DARTS'),1,1,'JHS-A',
       (SELECT id FROM departments WHERE code='MANTIS'),
       (SELECT id FROM departments WHERE code='BBEES'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Darts (Women) Day 2 Game 2 - DOLPHIN vs REDFOX',
       (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','08:30:00','09:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='DARTS'),1,2,'JHS-B',
       (SELECT id FROM departments WHERE code='DOLPHIN'),
       (SELECT id FROM departments WHERE code='REDFOX'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Darts (Women) Day 2 Game 3 - PANTHER vs DPEACOCK',
       (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','09:30:00','10:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='DARTS'),1,3,'SHS-A',
       (SELECT id FROM departments WHERE code='PANTHER'),
       (SELECT id FROM departments WHERE code='DPEACOCK'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','09:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Darts (Women) Day 2 Game 4 - STALLION vs SGOAT',
       (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','10:30:00','11:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='DARTS'),1,4,'SHS-B',
       (SELECT id FROM departments WHERE code='STALLION'),
       (SELECT id FROM departments WHERE code='SGOAT'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','10:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Darts (Women) Day 2 Game 5 - Winner SHS-B vs Night Owls',
       (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','11:30:00','12:30:00','Exhibition - Winner of SHS-B vs NOWL',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='DARTS'),1,5,'NOWL',
       NULL,
       (SELECT id FROM departments WHERE code='NOWL'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-14','11:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Darts (Women) Day 3 - LL-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','07:30:00','08:30:00','Loser vs Loser JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='DARTS'),2,0,'LL-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Darts (Women) Day 3 - WW-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','08:30:00','09:30:00','Winner vs Winner SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='DARTS'),2,0,'WW-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Darts (Women) Day 3 - CH-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','14:00:00','15:00:00','Championship JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='DARTS'),2,0,'CH-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','14:00:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Darts (Women) Day 3 - CH-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','15:00:00','16:00:00','Championship SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Darts (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='DARTS'),2,0,'CH-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','15:00:00';

INSERT INTO teams (name, department_id, sport_id, gender, sport_fest_id)
SELECT CONCAT(d.name,' - DARTS (Women)'), d.id, (SELECT id FROM sports WHERE code='DARTS'), 'women',
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO tournaments (name, sport_id, sport_fest_id, format, gender, status, start_date, end_date, created_by)
SELECT 'Sudoku (Women) - SGO Days 2026', (SELECT id FROM sports WHERE code='SUDOKU'),
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       'division_gauntlet','women','ongoing','2026-09-14','2026-09-15',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO sport_fest_tournaments (sport_fest_id, tournament_id)
SELECT (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1);

INSERT INTO tournament_participants (tournament_id, department_id)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1), d.id
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sudoku (Women) Day 2 Game 1 - MANTIS vs BBEES',
       (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','07:30:00','08:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUDOKU'),1,1,'JHS-A',
       (SELECT id FROM departments WHERE code='MANTIS'),
       (SELECT id FROM departments WHERE code='BBEES'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sudoku (Women) Day 2 Game 2 - DOLPHIN vs REDFOX',
       (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','08:30:00','09:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUDOKU'),1,2,'JHS-B',
       (SELECT id FROM departments WHERE code='DOLPHIN'),
       (SELECT id FROM departments WHERE code='REDFOX'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sudoku (Women) Day 2 Game 3 - PANTHER vs DPEACOCK',
       (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','09:30:00','10:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUDOKU'),1,3,'SHS-A',
       (SELECT id FROM departments WHERE code='PANTHER'),
       (SELECT id FROM departments WHERE code='DPEACOCK'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','09:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sudoku (Women) Day 2 Game 4 - STALLION vs SGOAT',
       (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','10:30:00','11:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUDOKU'),1,4,'SHS-B',
       (SELECT id FROM departments WHERE code='STALLION'),
       (SELECT id FROM departments WHERE code='SGOAT'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','10:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sudoku (Women) Day 2 Game 5 - Winner SHS-B vs Night Owls',
       (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','11:30:00','12:30:00','Exhibition - Winner of SHS-B vs NOWL',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUDOKU'),1,5,'NOWL',
       NULL,
       (SELECT id FROM departments WHERE code='NOWL'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-14','11:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sudoku (Women) Day 3 - LL-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','07:30:00','08:30:00','Loser vs Loser JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUDOKU'),2,0,'LL-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sudoku (Women) Day 3 - WW-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','08:30:00','09:30:00','Winner vs Winner SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUDOKU'),2,0,'WW-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sudoku (Women) Day 3 - CH-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','14:00:00','15:00:00','Championship JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUDOKU'),2,0,'CH-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','14:00:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sudoku (Women) Day 3 - CH-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','15:00:00','16:00:00','Championship SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sudoku (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUDOKU'),2,0,'CH-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','15:00:00';

INSERT INTO teams (name, department_id, sport_id, gender, sport_fest_id)
SELECT CONCAT(d.name,' - SUDOKU (Women)'), d.id, (SELECT id FROM sports WHERE code='SUDOKU'), 'women',
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO tournaments (name, sport_id, sport_fest_id, format, gender, status, start_date, end_date, created_by)
SELECT 'Sungka (Women) - SGO Days 2026', (SELECT id FROM sports WHERE code='SUNGKA'),
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       'division_gauntlet','women','ongoing','2026-09-14','2026-09-15',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO sport_fest_tournaments (sport_fest_id, tournament_id)
SELECT (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1);

INSERT INTO tournament_participants (tournament_id, department_id)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1), d.id
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sungka (Women) Day 2 Game 1 - MANTIS vs BBEES',
       (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','07:30:00','08:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUNGKA'),1,1,'JHS-A',
       (SELECT id FROM departments WHERE code='MANTIS'),
       (SELECT id FROM departments WHERE code='BBEES'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='eremollo' LIMIT 1),
       'scheduled','2026-09-14','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sungka (Women) Day 2 Game 2 - DOLPHIN vs REDFOX',
       (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','08:30:00','09:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUNGKA'),1,2,'JHS-B',
       (SELECT id FROM departments WHERE code='DOLPHIN'),
       (SELECT id FROM departments WHERE code='REDFOX'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='eremollo' LIMIT 1),
       'scheduled','2026-09-14','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sungka (Women) Day 2 Game 3 - PANTHER vs DPEACOCK',
       (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','09:30:00','10:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUNGKA'),1,3,'SHS-A',
       (SELECT id FROM departments WHERE code='PANTHER'),
       (SELECT id FROM departments WHERE code='DPEACOCK'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='eremollo' LIMIT 1),
       'scheduled','2026-09-14','09:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sungka (Women) Day 2 Game 4 - STALLION vs SGOAT',
       (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','10:30:00','11:30:00','Day 2 Women Round 1',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUNGKA'),1,4,'SHS-B',
       (SELECT id FROM departments WHERE code='STALLION'),
       (SELECT id FROM departments WHERE code='SGOAT'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='eremollo' LIMIT 1),
       'scheduled','2026-09-14','10:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sungka (Women) Day 2 Game 5 - Winner SHS-B vs Night Owls',
       (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-14','11:30:00','12:30:00','Exhibition - Winner of SHS-B vs NOWL',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUNGKA'),1,5,'NOWL',
       NULL,
       (SELECT id FROM departments WHERE code='NOWL'),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='eremollo' LIMIT 1),
       'pending','2026-09-14','11:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sungka (Women) Day 3 - LL-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','07:30:00','08:30:00','Loser vs Loser JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUNGKA'),2,0,'LL-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='eremollo' LIMIT 1),
       'pending','2026-09-15','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sungka (Women) Day 3 - WW-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','08:30:00','09:30:00','Winner vs Winner SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUNGKA'),2,0,'WW-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='eremollo' LIMIT 1),
       'pending','2026-09-15','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sungka (Women) Day 3 - CH-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','14:00:00','15:00:00','Championship JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUNGKA'),2,0,'CH-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='eremollo' LIMIT 1),
       'pending','2026-09-15','14:00:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sungka (Women) Day 3 - CH-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       '2026-09-15','15:00:00','16:00:00','Championship SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sungka (Women) - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SUNGKA'),2,0,'CH-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name='Board Games Area' LIMIT 1),
       (SELECT id FROM users WHERE username='eremollo' LIMIT 1),
       'pending','2026-09-15','15:00:00';

INSERT INTO teams (name, department_id, sport_id, gender, sport_fest_id)
SELECT CONCAT(d.name,' - SUNGKA (Women)'), d.id, (SELECT id FROM sports WHERE code='SUNGKA'), 'women',
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
FROM departments d WHERE d.code IN ('BBEES','DOLPHIN','DPEACOCK','MANTIS','NOWL','PANTHER','REDFOX','SGOAT','STALLION');

INSERT INTO tournaments (name, sport_id, sport_fest_id, format, gender, status, start_date, end_date, created_by)
SELECT 'Basketball - SGO Days 2026', (SELECT id FROM sports WHERE code='BASKETBALL' OR code='BASKETBALL' LIMIT 1),
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       'division_gauntlet','open','ongoing','2026-09-14','2026-09-16',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO sport_fest_tournaments (sport_fest_id, tournament_id)
SELECT (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       (SELECT id FROM tournaments WHERE name='Basketball - SGO Days 2026' LIMIT 1);

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Basketball Day 2 Game 1 - MANTIS vs BBEES',
       (SELECT id FROM tournaments WHERE name='Basketball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' LIMIT 1),
       '2026-09-14','07:30:00','08:30:00','Day 2 Basketball',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Basketball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='BASKETBALL' OR code='BASKETBALL' LIMIT 1),1,1,'G1',
       (SELECT id FROM departments WHERE code='MANTIS'),
       (SELECT id FROM departments WHERE code='BBEES'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Basketball Day 2 Game 2 - DOLPHIN vs REDFOX',
       (SELECT id FROM tournaments WHERE name='Basketball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' LIMIT 1),
       '2026-09-14','08:30:00','09:30:00','Day 2 Basketball',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Basketball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='BASKETBALL' OR code='BASKETBALL' LIMIT 1),1,2,'G2',
       (SELECT id FROM departments WHERE code='DOLPHIN'),
       (SELECT id FROM departments WHERE code='REDFOX'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Basketball Day 2 Game 3 - PANTHER vs DPEACOCK',
       (SELECT id FROM tournaments WHERE name='Basketball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' LIMIT 1),
       '2026-09-14','09:30:00','10:30:00','Day 2 Basketball',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Basketball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='BASKETBALL' OR code='BASKETBALL' LIMIT 1),1,3,'G3',
       (SELECT id FROM departments WHERE code='PANTHER'),
       (SELECT id FROM departments WHERE code='DPEACOCK'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','09:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Basketball Day 2 Game 4 - STALLION vs SGOAT',
       (SELECT id FROM tournaments WHERE name='Basketball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' LIMIT 1),
       '2026-09-14','10:30:00','11:30:00','Day 2 Basketball',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Basketball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='BASKETBALL' OR code='BASKETBALL' LIMIT 1),1,4,'G4',
       (SELECT id FROM departments WHERE code='STALLION'),
       (SELECT id FROM departments WHERE code='SGOAT'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','10:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Basketball Day 2 - Winner G4 vs Night Owls',
       (SELECT id FROM tournaments WHERE name='Basketball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' LIMIT 1),
       '2026-09-14','11:30:00','12:30:00','Winner of G4 vs NOWL',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Basketball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='BASKETBALL' OR code='BASKETBALL' LIMIT 1),1,99,'NOWL',
       NULL,
       (SELECT id FROM departments WHERE code='NOWL'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-14','11:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Basketball Day 3 - LL-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Basketball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' LIMIT 1),
       '2026-09-15','07:30:00','08:30:00','Loser vs Loser JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Basketball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='BASKETBALL' OR code='BASKETBALL' LIMIT 1),2,0,'LL-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name LIKE '%Gym%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Basketball Day 3 - CH-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Basketball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' LIMIT 1),
       '2026-09-15','14:00:00','15:00:00','Championship JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Basketball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='BASKETBALL' OR code='BASKETBALL' LIMIT 1),2,0,'CH-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name LIKE '%Gym%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','14:00:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Basketball Day 3 - CH-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Basketball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' LIMIT 1),
       '2026-09-15','15:00:00','16:00:00','Championship SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Basketball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='BASKETBALL' OR code='BASKETBALL' LIMIT 1),2,0,'CH-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name LIKE '%Gym%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','15:00:00';

INSERT INTO tournaments (name, sport_id, sport_fest_id, format, gender, status, start_date, end_date, created_by)
SELECT 'Volleyball - SGO Days 2026', (SELECT id FROM sports WHERE code='VOLLEYBALL' OR code='VOLLEYBALL' LIMIT 1),
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       'division_gauntlet','open','ongoing','2026-09-14','2026-09-16',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO sport_fest_tournaments (sport_fest_id, tournament_id)
SELECT (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       (SELECT id FROM tournaments WHERE name='Volleyball - SGO Days 2026' LIMIT 1);

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Volleyball Day 2 Game 1 - DOLPHIN vs REDFOX',
       (SELECT id FROM tournaments WHERE name='Volleyball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       '2026-09-14','07:30:00','08:30:00','Day 2 Volleyball',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Volleyball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='VOLLEYBALL' OR code='VOLLEYBALL' LIMIT 1),1,1,'G1',
       (SELECT id FROM departments WHERE code='DOLPHIN'),
       (SELECT id FROM departments WHERE code='REDFOX'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Volleyball Day 2 Game 2 - MANTIS vs BBEES',
       (SELECT id FROM tournaments WHERE name='Volleyball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       '2026-09-14','08:30:00','09:30:00','Day 2 Volleyball',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Volleyball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='VOLLEYBALL' OR code='VOLLEYBALL' LIMIT 1),1,2,'G2',
       (SELECT id FROM departments WHERE code='MANTIS'),
       (SELECT id FROM departments WHERE code='BBEES'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Volleyball Day 2 Game 3 - PANTHER vs DPEACOCK',
       (SELECT id FROM tournaments WHERE name='Volleyball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       '2026-09-14','10:30:00','11:30:00','Day 2 Volleyball',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Volleyball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='VOLLEYBALL' OR code='VOLLEYBALL' LIMIT 1),1,3,'G4',
       (SELECT id FROM departments WHERE code='PANTHER'),
       (SELECT id FROM departments WHERE code='DPEACOCK'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','10:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Volleyball Day 2 Game 4 - STALLION vs SGOAT',
       (SELECT id FROM tournaments WHERE name='Volleyball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       '2026-09-14','11:30:00','12:30:00','Day 2 Volleyball',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Volleyball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='VOLLEYBALL' OR code='VOLLEYBALL' LIMIT 1),1,4,'G5',
       (SELECT id FROM departments WHERE code='STALLION'),
       (SELECT id FROM departments WHERE code='SGOAT'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','11:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Volleyball Day 2 - Winner G1 vs Night Owls',
       (SELECT id FROM tournaments WHERE name='Volleyball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       '2026-09-14','09:30:00','10:30:00','Winner of G1 vs NOWL',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Volleyball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='VOLLEYBALL' OR code='VOLLEYBALL' LIMIT 1),1,99,'NOWL',
       NULL,
       (SELECT id FROM departments WHERE code='NOWL'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-14','09:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Volleyball Day 3 - LL-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Volleyball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       '2026-09-15','07:30:00','08:30:00','Loser vs Loser JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Volleyball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='VOLLEYBALL' OR code='VOLLEYBALL' LIMIT 1),2,0,'LL-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Volleyball Day 3 - CH-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Volleyball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       '2026-09-15','14:00:00','15:00:00','Championship JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Volleyball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='VOLLEYBALL' OR code='VOLLEYBALL' LIMIT 1),2,0,'CH-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','14:00:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Volleyball Day 3 - CH-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Volleyball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       '2026-09-15','15:00:00','16:00:00','Championship SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Volleyball - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='VOLLEYBALL' OR code='VOLLEYBALL' LIMIT 1),2,0,'CH-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','15:00:00';

INSERT INTO tournaments (name, sport_id, sport_fest_id, format, gender, status, start_date, end_date, created_by)
SELECT 'Badminton - SGO Days 2026', (SELECT id FROM sports WHERE code='BADMINTON' OR code='BADMINTON' LIMIT 1),
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       'division_gauntlet','open','ongoing','2026-09-14','2026-09-16',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO sport_fest_tournaments (sport_fest_id, tournament_id)
SELECT (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       (SELECT id FROM tournaments WHERE name='Badminton - SGO Days 2026' LIMIT 1);

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Badminton Day 2 Game 1 - PANTHER vs DPEACOCK',
       (SELECT id FROM tournaments WHERE name='Badminton - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       '2026-09-14','07:30:00','08:30:00','Day 2 Badminton',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Badminton - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='BADMINTON' OR code='BADMINTON' LIMIT 1),1,1,'G1',
       (SELECT id FROM departments WHERE code='PANTHER'),
       (SELECT id FROM departments WHERE code='DPEACOCK'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Badminton Day 2 Game 2 - MANTIS vs BBEES',
       (SELECT id FROM tournaments WHERE name='Badminton - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       '2026-09-14','08:30:00','09:30:00','Day 2 Badminton',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Badminton - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='BADMINTON' OR code='BADMINTON' LIMIT 1),1,2,'G2',
       (SELECT id FROM departments WHERE code='MANTIS'),
       (SELECT id FROM departments WHERE code='BBEES'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Badminton Day 2 Game 3 - DOLPHIN vs REDFOX',
       (SELECT id FROM tournaments WHERE name='Badminton - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       '2026-09-14','09:30:00','10:30:00','Day 2 Badminton',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Badminton - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='BADMINTON' OR code='BADMINTON' LIMIT 1),1,3,'G3',
       (SELECT id FROM departments WHERE code='DOLPHIN'),
       (SELECT id FROM departments WHERE code='REDFOX'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','09:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Badminton Day 2 Game 4 - STALLION vs SGOAT',
       (SELECT id FROM tournaments WHERE name='Badminton - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       '2026-09-14','11:30:00','12:30:00','Day 2 Badminton',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Badminton - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='BADMINTON' OR code='BADMINTON' LIMIT 1),1,4,'G5',
       (SELECT id FROM departments WHERE code='STALLION'),
       (SELECT id FROM departments WHERE code='SGOAT'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','11:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Badminton Day 2 - Winner G2 vs Night Owls',
       (SELECT id FROM tournaments WHERE name='Badminton - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       '2026-09-14','10:30:00','11:30:00','Winner of G2 vs NOWL',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Badminton - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='BADMINTON' OR code='BADMINTON' LIMIT 1),1,99,'NOWL',
       NULL,
       (SELECT id FROM departments WHERE code='NOWL'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'pending','2026-09-14','10:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Badminton Day 3 - LL-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Badminton - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       '2026-09-15','07:30:00','08:30:00','Loser vs Loser JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Badminton - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='BADMINTON' OR code='BADMINTON' LIMIT 1),2,0,'LL-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'pending','2026-09-15','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Badminton Day 3 - CH-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Badminton - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       '2026-09-15','14:00:00','15:00:00','Championship JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Badminton - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='BADMINTON' OR code='BADMINTON' LIMIT 1),2,0,'CH-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'pending','2026-09-15','14:00:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Badminton Day 3 - CH-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Badminton - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       '2026-09-15','15:00:00','16:00:00','Championship SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Badminton - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='BADMINTON' OR code='BADMINTON' LIMIT 1),2,0,'CH-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Court%' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'pending','2026-09-15','15:00:00';

INSERT INTO tournaments (name, sport_id, sport_fest_id, format, gender, status, start_date, end_date, created_by)
SELECT 'Table Tennis - SGO Days 2026', (SELECT id FROM sports WHERE code='TABLE_TENNIS' OR code='TABLETENNIS' LIMIT 1),
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       'division_gauntlet','open','ongoing','2026-09-14','2026-09-16',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO sport_fest_tournaments (sport_fest_id, tournament_id)
SELECT (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       (SELECT id FROM tournaments WHERE name='Table Tennis - SGO Days 2026' LIMIT 1);

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Table Tennis Day 2 Game 1 - MANTIS vs BBEES',
       (SELECT id FROM tournaments WHERE name='Table Tennis - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Hall%' LIMIT 1),
       '2026-09-14','07:30:00','08:30:00','Day 2 Table Tennis',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Table Tennis - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='TABLE_TENNIS' OR code='TABLETENNIS' LIMIT 1),1,1,'G1',
       (SELECT id FROM departments WHERE code='MANTIS'),
       (SELECT id FROM departments WHERE code='BBEES'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Hall%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Table Tennis Day 2 Game 2 - DOLPHIN vs REDFOX',
       (SELECT id FROM tournaments WHERE name='Table Tennis - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Hall%' LIMIT 1),
       '2026-09-14','08:30:00','09:30:00','Day 2 Table Tennis',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Table Tennis - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='TABLE_TENNIS' OR code='TABLETENNIS' LIMIT 1),1,2,'G2',
       (SELECT id FROM departments WHERE code='DOLPHIN'),
       (SELECT id FROM departments WHERE code='REDFOX'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Hall%' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Table Tennis Day 2 Game 3 - PANTHER vs DPEACOCK',
       (SELECT id FROM tournaments WHERE name='Table Tennis - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Hall%' LIMIT 1),
       '2026-09-14','10:30:00','11:30:00','Day 2 Table Tennis',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Table Tennis - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='TABLE_TENNIS' OR code='TABLETENNIS' LIMIT 1),1,3,'G4',
       (SELECT id FROM departments WHERE code='PANTHER'),
       (SELECT id FROM departments WHERE code='DPEACOCK'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Hall%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','10:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Table Tennis Day 2 Game 4 - STALLION vs SGOAT',
       (SELECT id FROM tournaments WHERE name='Table Tennis - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Hall%' LIMIT 1),
       '2026-09-14','11:30:00','12:30:00','Day 2 Table Tennis',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Table Tennis - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='TABLE_TENNIS' OR code='TABLETENNIS' LIMIT 1),1,4,'G5',
       (SELECT id FROM departments WHERE code='STALLION'),
       (SELECT id FROM departments WHERE code='SGOAT'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Hall%' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','11:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Table Tennis Day 2 - Winner G2 vs Night Owls',
       (SELECT id FROM tournaments WHERE name='Table Tennis - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Hall%' LIMIT 1),
       '2026-09-14','09:30:00','10:30:00','Winner of G2 vs NOWL',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Table Tennis - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='TABLE_TENNIS' OR code='TABLETENNIS' LIMIT 1),1,99,'NOWL',
       NULL,
       (SELECT id FROM departments WHERE code='NOWL'),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Hall%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-14','09:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Table Tennis Day 3 - LL-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Table Tennis - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Hall%' LIMIT 1),
       '2026-09-15','07:30:00','08:30:00','Loser vs Loser JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Table Tennis - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='TABLE_TENNIS' OR code='TABLETENNIS' LIMIT 1),2,0,'LL-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Hall%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Table Tennis Day 3 - CH-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Table Tennis - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Hall%' LIMIT 1),
       '2026-09-15','14:00:00','15:00:00','Championship JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Table Tennis - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='TABLE_TENNIS' OR code='TABLETENNIS' LIMIT 1),2,0,'CH-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Hall%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','14:00:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Table Tennis Day 3 - CH-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Table Tennis - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Hall%' LIMIT 1),
       '2026-09-15','15:00:00','16:00:00','Championship SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Table Tennis - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='TABLE_TENNIS' OR code='TABLETENNIS' LIMIT 1),2,0,'CH-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name LIKE '%Gym%' OR name LIKE '%Hall%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','15:00:00';

INSERT INTO tournaments (name, sport_id, sport_fest_id, format, gender, status, start_date, end_date, created_by)
SELECT 'Sepak Takraw - SGO Days 2026', (SELECT id FROM sports WHERE code='SEPAK_TAKRAW' OR code='SEPAKTAKRAW' LIMIT 1),
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       'division_gauntlet','open','ongoing','2026-09-14','2026-09-16',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO sport_fest_tournaments (sport_fest_id, tournament_id)
SELECT (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       (SELECT id FROM tournaments WHERE name='Sepak Takraw - SGO Days 2026' LIMIT 1);

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sepak Takraw Day 2 Game 1 - DOLPHIN vs REDFOX',
       (SELECT id FROM tournaments WHERE name='Sepak Takraw - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Court%' OR name LIKE '%Field%' LIMIT 1),
       '2026-09-14','07:30:00','08:30:00','Day 2 Sepak Takraw',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sepak Takraw - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SEPAK_TAKRAW' OR code='SEPAKTAKRAW' LIMIT 1),1,1,'G1',
       (SELECT id FROM departments WHERE code='DOLPHIN'),
       (SELECT id FROM departments WHERE code='REDFOX'),
       (SELECT id FROM venues WHERE name LIKE '%Court%' OR name LIKE '%Field%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sepak Takraw Day 2 Game 2 - STALLION vs SGOAT',
       (SELECT id FROM tournaments WHERE name='Sepak Takraw - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Court%' OR name LIKE '%Field%' LIMIT 1),
       '2026-09-14','08:30:00','09:30:00','Day 2 Sepak Takraw',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sepak Takraw - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SEPAK_TAKRAW' OR code='SEPAKTAKRAW' LIMIT 1),1,2,'G2',
       (SELECT id FROM departments WHERE code='STALLION'),
       (SELECT id FROM departments WHERE code='SGOAT'),
       (SELECT id FROM venues WHERE name LIKE '%Court%' OR name LIKE '%Field%' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sepak Takraw Day 2 Game 3 - MANTIS vs BBEES',
       (SELECT id FROM tournaments WHERE name='Sepak Takraw - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Court%' OR name LIKE '%Field%' LIMIT 1),
       '2026-09-14','09:30:00','10:30:00','Day 2 Sepak Takraw',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sepak Takraw - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SEPAK_TAKRAW' OR code='SEPAKTAKRAW' LIMIT 1),1,3,'G3',
       (SELECT id FROM departments WHERE code='MANTIS'),
       (SELECT id FROM departments WHERE code='BBEES'),
       (SELECT id FROM venues WHERE name LIKE '%Court%' OR name LIKE '%Field%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','09:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sepak Takraw Day 2 Game 4 - PANTHER vs DPEACOCK',
       (SELECT id FROM tournaments WHERE name='Sepak Takraw - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Court%' OR name LIKE '%Field%' LIMIT 1),
       '2026-09-14','11:30:00','12:30:00','Day 2 Sepak Takraw',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sepak Takraw - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SEPAK_TAKRAW' OR code='SEPAKTAKRAW' LIMIT 1),1,4,'G5',
       (SELECT id FROM departments WHERE code='PANTHER'),
       (SELECT id FROM departments WHERE code='DPEACOCK'),
       (SELECT id FROM venues WHERE name LIKE '%Court%' OR name LIKE '%Field%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','11:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sepak Takraw Day 2 - Winner G2 vs Night Owls',
       (SELECT id FROM tournaments WHERE name='Sepak Takraw - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Court%' OR name LIKE '%Field%' LIMIT 1),
       '2026-09-14','10:30:00','11:30:00','Winner of G2 vs NOWL',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sepak Takraw - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SEPAK_TAKRAW' OR code='SEPAKTAKRAW' LIMIT 1),1,99,'NOWL',
       NULL,
       (SELECT id FROM departments WHERE code='NOWL'),
       (SELECT id FROM venues WHERE name LIKE '%Court%' OR name LIKE '%Field%' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'pending','2026-09-14','10:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sepak Takraw Day 3 - LL-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Sepak Takraw - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Court%' OR name LIKE '%Field%' LIMIT 1),
       '2026-09-15','07:30:00','08:30:00','Loser vs Loser JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sepak Takraw - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SEPAK_TAKRAW' OR code='SEPAKTAKRAW' LIMIT 1),2,0,'LL-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name LIKE '%Court%' OR name LIKE '%Field%' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'pending','2026-09-15','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sepak Takraw Day 3 - CH-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Sepak Takraw - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Court%' OR name LIKE '%Field%' LIMIT 1),
       '2026-09-15','14:00:00','15:00:00','Championship JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sepak Takraw - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SEPAK_TAKRAW' OR code='SEPAKTAKRAW' LIMIT 1),2,0,'CH-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name LIKE '%Court%' OR name LIKE '%Field%' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'pending','2026-09-15','14:00:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Sepak Takraw Day 3 - CH-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Sepak Takraw - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Court%' OR name LIKE '%Field%' LIMIT 1),
       '2026-09-15','15:00:00','16:00:00','Championship SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Sepak Takraw - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='SEPAK_TAKRAW' OR code='SEPAKTAKRAW' LIMIT 1),2,0,'CH-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name LIKE '%Court%' OR name LIKE '%Field%' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'pending','2026-09-15','15:00:00';

INSERT INTO tournaments (name, sport_id, sport_fest_id, format, gender, status, start_date, end_date, created_by)
SELECT 'Mobile Legends - SGO Days 2026', (SELECT id FROM sports WHERE code='MOBILE_LEGENDS' OR code='MOBILELEGENDS' LIMIT 1),
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       'division_gauntlet','open','ongoing','2026-09-14','2026-09-16',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO sport_fest_tournaments (sport_fest_id, tournament_id)
SELECT (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1),
       (SELECT id FROM tournaments WHERE name='Mobile Legends - SGO Days 2026' LIMIT 1);

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Mobile Legends Day 2 Game 1 - DOLPHIN vs REDFOX',
       (SELECT id FROM tournaments WHERE name='Mobile Legends - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Lab%' OR name LIKE '%Computer%' OR name LIKE '%Room%' LIMIT 1),
       '2026-09-14','07:30:00','08:30:00','Day 2 Mobile Legends',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Mobile Legends - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='MOBILE_LEGENDS' OR code='MOBILELEGENDS' LIMIT 1),1,1,'G1',
       (SELECT id FROM departments WHERE code='DOLPHIN'),
       (SELECT id FROM departments WHERE code='REDFOX'),
       (SELECT id FROM venues WHERE name LIKE '%Lab%' OR name LIKE '%Computer%' OR name LIKE '%Room%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Mobile Legends Day 2 Game 2 - STALLION vs SGOAT',
       (SELECT id FROM tournaments WHERE name='Mobile Legends - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Lab%' OR name LIKE '%Computer%' OR name LIKE '%Room%' LIMIT 1),
       '2026-09-14','08:30:00','09:30:00','Day 2 Mobile Legends',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Mobile Legends - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='MOBILE_LEGENDS' OR code='MOBILELEGENDS' LIMIT 1),1,2,'G2',
       (SELECT id FROM departments WHERE code='STALLION'),
       (SELECT id FROM departments WHERE code='SGOAT'),
       (SELECT id FROM venues WHERE name LIKE '%Lab%' OR name LIKE '%Computer%' OR name LIKE '%Room%' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','08:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Mobile Legends Day 2 Game 3 - MANTIS vs BBEES',
       (SELECT id FROM tournaments WHERE name='Mobile Legends - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Lab%' OR name LIKE '%Computer%' OR name LIKE '%Room%' LIMIT 1),
       '2026-09-14','10:30:00','11:30:00','Day 2 Mobile Legends',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Mobile Legends - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='MOBILE_LEGENDS' OR code='MOBILELEGENDS' LIMIT 1),1,3,'G4',
       (SELECT id FROM departments WHERE code='MANTIS'),
       (SELECT id FROM departments WHERE code='BBEES'),
       (SELECT id FROM venues WHERE name LIKE '%Lab%' OR name LIKE '%Computer%' OR name LIKE '%Room%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'scheduled','2026-09-14','10:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Mobile Legends Day 2 Game 4 - PANTHER vs DPEACOCK',
       (SELECT id FROM tournaments WHERE name='Mobile Legends - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Lab%' OR name LIKE '%Computer%' OR name LIKE '%Room%' LIMIT 1),
       '2026-09-14','11:30:00','12:30:00','Day 2 Mobile Legends',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Mobile Legends - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='MOBILE_LEGENDS' OR code='MOBILELEGENDS' LIMIT 1),1,4,'G5',
       (SELECT id FROM departments WHERE code='PANTHER'),
       (SELECT id FROM departments WHERE code='DPEACOCK'),
       (SELECT id FROM venues WHERE name LIKE '%Lab%' OR name LIKE '%Computer%' OR name LIKE '%Room%' LIMIT 1),
       (SELECT id FROM users WHERE username='klongakit' LIMIT 1),
       'scheduled','2026-09-14','11:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Mobile Legends Day 2 - Winner G1 vs Night Owls',
       (SELECT id FROM tournaments WHERE name='Mobile Legends - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Lab%' OR name LIKE '%Computer%' OR name LIKE '%Room%' LIMIT 1),
       '2026-09-14','09:30:00','10:30:00','Winner of G1 vs NOWL',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Mobile Legends - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='MOBILE_LEGENDS' OR code='MOBILELEGENDS' LIMIT 1),1,99,'NOWL',
       NULL,
       (SELECT id FROM departments WHERE code='NOWL'),
       (SELECT id FROM venues WHERE name LIKE '%Lab%' OR name LIKE '%Computer%' OR name LIKE '%Room%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-14','09:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Mobile Legends Day 3 - LL-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Mobile Legends - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Lab%' OR name LIKE '%Computer%' OR name LIKE '%Room%' LIMIT 1),
       '2026-09-15','07:30:00','08:30:00','Loser vs Loser JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Mobile Legends - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='MOBILE_LEGENDS' OR code='MOBILELEGENDS' LIMIT 1),2,0,'LL-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name LIKE '%Lab%' OR name LIKE '%Computer%' OR name LIKE '%Room%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','07:30:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Mobile Legends Day 3 - CH-JHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Mobile Legends - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Lab%' OR name LIKE '%Computer%' OR name LIKE '%Room%' LIMIT 1),
       '2026-09-15','14:00:00','15:00:00','Championship JHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Mobile Legends - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='MOBILE_LEGENDS' OR code='MOBILELEGENDS' LIMIT 1),2,0,'CH-JHS',NULL,NULL,
       (SELECT id FROM venues WHERE name LIKE '%Lab%' OR name LIKE '%Computer%' OR name LIKE '%Room%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','14:00:00';

INSERT INTO schedules (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by)
SELECT 'Mobile Legends Day 3 - CH-SHS (TBD)',
       (SELECT id FROM tournaments WHERE name='Mobile Legends - SGO Days 2026' LIMIT 1),
       (SELECT id FROM venues WHERE name LIKE '%Lab%' OR name LIKE '%Computer%' OR name LIKE '%Room%' LIMIT 1),
       '2026-09-15','15:00:00','16:00:00','Championship SHS - TBD',
       (SELECT id FROM users WHERE role='admin' LIMIT 1);

INSERT INTO matches (tournament_id, sport_id, round_number, match_number, bracket_position,
  participant_a_department_id, participant_b_department_id, venue_id, referee_id, status, scheduled_date, scheduled_time)
SELECT (SELECT id FROM tournaments WHERE name='Mobile Legends - SGO Days 2026' LIMIT 1),
       (SELECT id FROM sports WHERE code='MOBILE_LEGENDS' OR code='MOBILELEGENDS' LIMIT 1),2,0,'CH-SHS',NULL,NULL,
       (SELECT id FROM venues WHERE name LIKE '%Lab%' OR name LIKE '%Computer%' OR name LIKE '%Room%' LIMIT 1),
       (SELECT id FROM users WHERE username='aogarte' LIMIT 1),
       'pending','2026-09-15','15:00:00';

CREATE TEMPORARY TABLE IF NOT EXISTS tmp_men_names (name VARCHAR(50));
INSERT INTO tmp_men_names (name) VALUES ('Juan'),('Mark'),('Ken'),('Rey'),('Jhon'),('Kurt'),('Marco'),('Paolo'),('Angelo'),('Ivan'),('Miguel'),('Josh'),('Ralph'),('Nathan'),('Carlo'),('Xavier'),('Adrian'),('Louie'),('Bryan'),('Vince');

CREATE TEMPORARY TABLE IF NOT EXISTS tmp_women_names (name VARCHAR(50));
INSERT INTO tmp_women_names (name) VALUES ('Maria'),('Angel'),('Kyla'),('Nicole'),('Erika'),('Joyce'),('Precious'),('Shane'),('Trisha'),('Alexa'),('Angelica'),('Camille'),('Bea'),('Danica'),('Faith'),('Grace'),('Jasmine'),('Karen'),('Lianne'),('Rica');

CREATE TEMPORARY TABLE IF NOT EXISTS tmp_last_names (name VARCHAR(50));
INSERT INTO tmp_last_names (name) VALUES ('Delos Reyes'),('Santos'),('Reyes'),('Bautista'),('Garcia'),('Cruz'),('Mendoza'),('Torres'),('Flores'),('Ramos'),('Aquino'),('Castillo'),('Villanueva'),('Navarro'),('Salazar'),('Domingo'),('Pascual'),('Rivera'),('Fernandez'),('Gonzales');

CREATE TEMPORARY TABLE IF NOT EXISTS tmp_seq (n INT);
INSERT INTO tmp_seq (n) VALUES (1),(2);

INSERT INTO players (first_name, last_name, gender, department_id, sport_id, team_id, jersey_number, status, sport_fest_id)
SELECT (SELECT name FROM tmp_men_names ORDER BY RAND() LIMIT 1),
       (SELECT name FROM tmp_last_names ORDER BY RAND() LIMIT 1),
       t.gender, t.department_id, t.sport_id, t.id,
       LPAD(FLOOR(1 + RAND() * 99), 2, '0'), 'approved',
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
FROM teams t
JOIN tmp_seq seq ON seq.n <= (CASE (SELECT code FROM sports WHERE id = t.sport_id) WHEN 'SCRABBLE' THEN 2 ELSE 1 END)
WHERE t.sport_id IN (SELECT id FROM sports WHERE code IN ('CHESS','SCRABBLE','CHECKERS','DARTS','SUDOKU','SUNGKA'))
  AND t.gender = 'men'
  AND NOT EXISTS (SELECT 1 FROM players p WHERE p.team_id = t.id);

INSERT INTO players (first_name, last_name, gender, department_id, sport_id, team_id, jersey_number, status, sport_fest_id)
SELECT (SELECT name FROM tmp_women_names ORDER BY RAND() LIMIT 1),
       (SELECT name FROM tmp_last_names ORDER BY RAND() LIMIT 1),
       t.gender, t.department_id, t.sport_id, t.id,
       LPAD(FLOOR(1 + RAND() * 99), 2, '0'), 'approved',
       (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
FROM teams t
JOIN tmp_seq seq ON seq.n <= (CASE (SELECT code FROM sports WHERE id = t.sport_id) WHEN 'SCRABBLE' THEN 2 ELSE 1 END)
WHERE t.sport_id IN (SELECT id FROM sports WHERE code IN ('CHESS','SCRABBLE','CHECKERS','DARTS','SUDOKU','SUNGKA'))
  AND t.gender = 'women'
  AND NOT EXISTS (SELECT 1 FROM players p WHERE p.team_id = t.id);

DROP TEMPORARY TABLE IF EXISTS tmp_men_names;
DROP TEMPORARY TABLE IF EXISTS tmp_women_names;
DROP TEMPORARY TABLE IF EXISTS tmp_last_names;
DROP TEMPORARY TABLE IF EXISTS tmp_seq;

COMMIT;

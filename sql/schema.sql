SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(20) DEFAULT '#3B82F6',
    logo_url VARCHAR(255),
    short_name VARCHAR(50),
    division ENUM('junior_high', 'senior_high', 'college') NULL DEFAULT NULL,
    is_exhibition TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
CREATE TABLE IF NOT EXISTS sport_fest_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    year INT NOT NULL,
    theme VARCHAR(150),
    start_date DATE,
    end_date DATE,
    description TEXT,
    status VARCHAR(30) DEFAULT 'upcoming',
    is_current TINYINT(1) DEFAULT 0,
    champion_count TINYINT UNSIGNED NOT NULL DEFAULT 1,
    champion_department_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sfe_champion FOREIGN KEY (champion_department_id) REFERENCES departments(id) ON DELETE
    SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM(
        'admin',
        'dean_adviser',
        'sgo_president',
        'sgo_officer'
    ) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    profile_picture VARCHAR(255),
    department_id INT NULL,
    is_active TINYINT(1) DEFAULT 1,
    last_login DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE
    SET NULL,
        INDEX idx_users_role (role)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(512) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_rt_user (user_id),
    INDEX idx_rt_token (token(191))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_al_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE
    SET NULL,
        INDEX idx_al_created (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
CREATE TABLE IF NOT EXISTS sports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    category ENUM('individual', 'team') DEFAULT 'team',
    description TEXT,
    min_players INT DEFAULT 1,
    max_players INT DEFAULT 1,
    team_size INT DEFAULT 1,
    scoring_type ENUM('points', 'time', 'sets', 'binary', 'custom') DEFAULT 'points',
    sets_to_win INT NULL,
    icon VARCHAR(100),
    is_team_sport TINYINT(1) DEFAULT 1,
    max_entries INT NULL,
    current_entries INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
CREATE TABLE IF NOT EXISTS tournaments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    sport_id INT NOT NULL,
    sport_fest_id INT NULL,
    format VARCHAR(30) DEFAULT 'single_elimination',
    gender VARCHAR(20) DEFAULT 'open',
    status VARCHAR(30) DEFAULT 'draft',
    max_participants INT DEFAULT 0,
    start_date DATE NULL,
    end_date DATE NULL,
    description TEXT,
    created_by INT NULL,
    ffa_scoring VARCHAR(20) NULL,
    group_count INT NULL,
    advance_per_group INT NULL,
    min_players INT NULL,
    category VARCHAR(20) NULL,
    is_exhibition TINYINT(1) NOT NULL DEFAULT 0,
    points_config JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tour_sport FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE,
    CONSTRAINT fk_tour_fest FOREIGN KEY (sport_fest_id) REFERENCES sport_fest_events(id) ON DELETE
    SET NULL,
        CONSTRAINT fk_tour_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE
    SET NULL,
        INDEX idx_tour_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS points_config JSON NULL
AFTER is_exhibition;
CREATE TABLE IF NOT EXISTS sport_fest_tournaments (
    sport_fest_id INT NOT NULL,
    tournament_id INT NOT NULL,
    PRIMARY KEY (sport_fest_id, tournament_id),
    CONSTRAINT fk_sft_fest FOREIGN KEY (sport_fest_id) REFERENCES sport_fest_events(id) ON DELETE CASCADE,
    CONSTRAINT fk_sft_tour FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    department_id INT NOT NULL,
    sport_id INT NOT NULL,
    gender VARCHAR(20) NOT NULL,
    coach_name VARCHAR(150),
    logo_url VARCHAR(255),
    sport_fest_id INT NULL,
    roster_submitted TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_teams_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    CONSTRAINT fk_teams_sport FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE,
    CONSTRAINT fk_teams_fest FOREIGN KEY (sport_fest_id) REFERENCES sport_fest_events(id) ON DELETE
    SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
CREATE TABLE IF NOT EXISTS players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(20) NOT NULL,
    image_url VARCHAR(255),
    department_id INT NOT NULL,
    sport_id INT NOT NULL,
    team_id INT NULL,
    jersey_number VARCHAR(10),
    position VARCHAR(50),
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    rejection_reason VARCHAR(255),
    registered_by INT NULL,
    sport_fest_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_players_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    CONSTRAINT fk_players_sport FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE,
    CONSTRAINT fk_players_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE
    SET NULL,
        CONSTRAINT fk_players_registrar FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE
    SET NULL,
        CONSTRAINT fk_players_fest FOREIGN KEY (sport_fest_id) REFERENCES sport_fest_events(id) ON DELETE
    SET NULL,
        INDEX idx_players_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
CREATE TABLE IF NOT EXISTS venues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    location VARCHAR(255),
    capacity INT DEFAULT 0,
    description TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
CREATE TABLE IF NOT EXISTS tournament_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    department_id INT NOT NULL,
    seed INT NULL,
    status VARCHAR(20) DEFAULT 'active',
    no_points TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tp_tour FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    CONSTRAINT fk_tp_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE KEY uq_tp (tournament_id, department_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
ALTER TABLE tournament_participants
ADD COLUMN IF NOT EXISTS no_points TINYINT(1) NOT NULL DEFAULT 0
AFTER status;
CREATE TABLE IF NOT EXISTS matches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    sport_id INT NOT NULL,
    round_number INT DEFAULT 1,
    match_number INT DEFAULT 1,
    bracket_position VARCHAR(50),
    bracket_side VARCHAR(20),
    participant_a_department_id INT NULL,
    participant_b_department_id INT NULL,
    venue_id INT NULL,
    referee_id INT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    scheduled_date DATE NULL,
    scheduled_time TIME NULL,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    winner_department_id INT NULL,
    next_match_id INT NULL,
    next_match_slot ENUM('a', 'b') NULL,
    loser_next_match_id INT NULL,
    loser_next_match_slot ENUM('a', 'b') NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_matches_tour FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    CONSTRAINT fk_matches_sport FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE,
    CONSTRAINT fk_matches_deptA FOREIGN KEY (participant_a_department_id) REFERENCES departments(id) ON DELETE
    SET NULL,
        CONSTRAINT fk_matches_deptB FOREIGN KEY (participant_b_department_id) REFERENCES departments(id) ON DELETE
    SET NULL,
        CONSTRAINT fk_matches_venue FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE
    SET NULL,
        CONSTRAINT fk_matches_referee FOREIGN KEY (referee_id) REFERENCES users(id) ON DELETE
    SET NULL,
        CONSTRAINT fk_matches_winner FOREIGN KEY (winner_department_id) REFERENCES departments(id) ON DELETE
    SET NULL,
        INDEX idx_matches_status (status),
        INDEX idx_matches_date (scheduled_date)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS next_match_id INT NULL
AFTER winner_department_id,
    ADD COLUMN IF NOT EXISTS next_match_slot ENUM('a', 'b') NULL
AFTER next_match_id,
    ADD COLUMN IF NOT EXISTS loser_next_match_id INT NULL
AFTER next_match_slot,
    ADD COLUMN IF NOT EXISTS loser_next_match_slot ENUM('a', 'b') NULL
AFTER loser_next_match_id;
CREATE TABLE IF NOT EXISTS match_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT NOT NULL,
    period INT NOT NULL DEFAULT 1,
    period_label VARCHAR(50),
    score_a DECIMAL(10, 2) DEFAULT 0,
    score_b DECIMAL(10, 2) DEFAULT 0,
    updated_by INT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ms_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    CONSTRAINT fk_ms_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE
    SET NULL,
        UNIQUE KEY uq_match_period (match_id, period)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
CREATE TABLE IF NOT EXISTS match_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT NOT NULL UNIQUE,
    total_score_a DECIMAL(10, 2) DEFAULT 0,
    total_score_b DECIMAL(10, 2) DEFAULT 0,
    final_score_display VARCHAR(50),
    winner_side VARCHAR(10),
    win_type VARCHAR(30) DEFAULT 'normal',
    duration_minutes INT NULL,
    highlights TEXT,
    recorded_by INT NULL,
    mvp_player_id INT NULL,
    mvp_player_name VARCHAR(150),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mr_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    CONSTRAINT fk_mr_user FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE
    SET NULL,
        CONSTRAINT fk_mr_mvp FOREIGN KEY (mvp_player_id) REFERENCES players(id) ON DELETE
    SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
CREATE TABLE IF NOT EXISTS round_robin_standings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    department_id INT NOT NULL,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    draws INT DEFAULT 0,
    matches_played INT DEFAULT 0,
    standing_points INT DEFAULT 0,
    points_for DECIMAL(10, 2) DEFAULT 0,
    points_against DECIMAL(10, 2) DEFAULT 0,
    CONSTRAINT fk_rrs_tour FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    CONSTRAINT fk_rrs_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE KEY uq_rrs (tournament_id, department_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
CREATE TABLE IF NOT EXISTS ffa_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    department_id INT NOT NULL,
    result_value DECIMAL(12, 4) NULL,
    rank_position INT NULL,
    recorded_by INT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ffa_tour FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    CONSTRAINT fk_ffa_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    CONSTRAINT fk_ffa_user FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE
    SET NULL,
        UNIQUE KEY uq_ffa (tournament_id, department_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
CREATE TABLE IF NOT EXISTS tournament_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    department_id INT NOT NULL,
    team_id INT NULL,
    `rank` INT NULL,
    medal VARCHAR(20) NULL,
    sport_fest_points INT DEFAULT 0,
    finalized_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tr_tour FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    CONSTRAINT fk_tr_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    CONSTRAINT fk_tr_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE
    SET NULL,
        UNIQUE KEY uq_tr (tournament_id, department_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
CREATE TABLE IF NOT EXISTS department_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NOT NULL,
    sport_fest_id INT NULL,
    total_points INT DEFAULT 0,
    gold_medals INT DEFAULT 0,
    silver_medals INT DEFAULT 0,
    bronze_medals INT DEFAULT 0,
    total_participations INT DEFAULT 0,
    tournaments_entered INT DEFAULT 0,
    CONSTRAINT fk_ds_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    CONSTRAINT fk_ds_fest FOREIGN KEY (sport_fest_id) REFERENCES sport_fest_events(id) ON DELETE CASCADE,
    UNIQUE KEY uq_ds (department_id, sport_fest_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
CREATE TABLE IF NOT EXISTS schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    tournament_id INT NULL,
    venue_id INT NULL,
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    notes TEXT,
    created_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sch_tour FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE
    SET NULL,
        CONSTRAINT fk_sch_venue FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE
    SET NULL,
        CONSTRAINT fk_sch_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE
    SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;
CREATE TABLE IF NOT EXISTS notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    role VARCHAR(40) NULL,
    department_id INT UNSIGNED NULL,
    type VARCHAR(40) NOT NULL DEFAULT 'system',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255) NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    entity_type VARCHAR(40) NULL,
    entity_id INT UNSIGNED NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_by INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notif_user_read (user_id, is_read, created_at),
    INDEX idx_notif_role (role, is_read, created_at),
    INDEX idx_notif_dept (department_id, is_read, created_at),
    INDEX idx_notif_created (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS division ENUM('junior_high', 'senior_high', 'college') NULL DEFAULT NULL
AFTER short_name,
    ADD COLUMN IF NOT EXISTS is_exhibition TINYINT(1) NOT NULL DEFAULT 0
AFTER division;
CREATE TABLE IF NOT EXISTS sport_fest_champions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sport_fest_id INT NOT NULL,
    division VARCHAR(30) NOT NULL,
    department_id INT NOT NULL,
    total_points DECIMAL(10, 2) DEFAULT 0,
    gold_medals INT DEFAULT 0,
    declared_by INT NULL,
    declared_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_fest_division (sport_fest_id, division),
    CONSTRAINT fk_sfc_fest FOREIGN KEY (sport_fest_id) REFERENCES sport_fest_events(id) ON DELETE CASCADE,
    CONSTRAINT fk_sfc_department FOREIGN KEY (department_id) REFERENCES departments(id),
    CONSTRAINT fk_sfc_declared_by FOREIGN KEY (declared_by) REFERENCES users(id) ON DELETE
    SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
ALTER TABLE sport_fest_events
ADD COLUMN IF NOT EXISTS champion_count TINYINT UNSIGNED NOT NULL DEFAULT 1
AFTER is_current;
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS is_exhibition TINYINT(1) NOT NULL DEFAULT 0
AFTER category;
CREATE TABLE IF NOT EXISTS sport_fest_bonus_points (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sport_fest_id INT NOT NULL,
    department_id INT NOT NULL,
    points INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sfbp_fest FOREIGN KEY (sport_fest_id) REFERENCES sport_fest_events(id) ON DELETE CASCADE,
    CONSTRAINT fk_sfbp_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    CONSTRAINT fk_sfbp_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE
    SET NULL,
        INDEX idx_sfbp_fest (sport_fest_id),
        INDEX idx_sfbp_dept (department_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
ALTER TABLE department_scores
ADD COLUMN IF NOT EXISTS bonus_points INT NOT NULL DEFAULT 0
AFTER total_points;
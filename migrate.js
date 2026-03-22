// db/migrate.js  – run once:  node db/migrate.js
require('dotenv').config();
const pool = require('../src/config/db');

const SCHEMA = `
/* ─────────────────────────────────────────
   USERS
───────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS users (
  id          INT          AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(60)  NOT NULL UNIQUE,
  email       VARCHAR(120) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

/* ─────────────────────────────────────────
   TEAMS
───────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS teams (
  id          INT          AUTO_INCREMENT PRIMARY KEY,
  room_id     VARCHAR(36)  NOT NULL,
  name        VARCHAR(80)  NOT NULL,
  short_name  VARCHAR(10)  NOT NULL,
  color       VARCHAR(20)  DEFAULT '#FFFFFF',
  emoji       VARCHAR(10)  DEFAULT '🏏',
  budget      DECIMAL(8,2) NOT NULL DEFAULT 100.00,
  is_ai       TINYINT(1)   NOT NULL DEFAULT 1,
  user_id     INT          DEFAULT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_room (room_id)
);

/* ─────────────────────────────────────────
   PLAYERS  (master list – shared across rooms)
───────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS players (
  id          INT          AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  country     VARCHAR(60)  NOT NULL,
  role        ENUM('Batsman','Bowler','All-Rounder','Wicket-Keeper') NOT NULL,
  base_price  DECIMAL(6,2) NOT NULL,
  rating      TINYINT      NOT NULL DEFAULT 70,
  matches     SMALLINT     DEFAULT 0,
  batting_avg DECIMAL(5,2) DEFAULT NULL,
  strike_rate DECIMAL(6,2) DEFAULT NULL,
  economy     DECIMAL(5,2) DEFAULT NULL,
  wickets     SMALLINT     DEFAULT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

/* ─────────────────────────────────────────
   ROOMS
───────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS rooms (
  id          VARCHAR(36)  PRIMARY KEY,
  host_id     INT          NOT NULL,
  status      ENUM('waiting','auction','season','playoffs','finished')
              NOT NULL DEFAULT 'waiting',
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (host_id) REFERENCES users(id)
);

/* ─────────────────────────────────────────
   AUCTION RESULTS
───────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS auctions (
  id          INT          AUTO_INCREMENT PRIMARY KEY,
  room_id     VARCHAR(36)  NOT NULL,
  player_id   INT          NOT NULL,
  team_id     INT          DEFAULT NULL,   -- NULL = unsold
  sold_price  DECIMAL(6,2) DEFAULT NULL,
  sold_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id),
  FOREIGN KEY (team_id)   REFERENCES teams(id)   ON DELETE SET NULL,
  INDEX idx_room_auction (room_id)
);

/* ─────────────────────────────────────────
   MATCHES
───────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS matches (
  id          INT          AUTO_INCREMENT PRIMARY KEY,
  room_id     VARCHAR(36)  NOT NULL,
  stage       ENUM('league','qualifier1','eliminator','qualifier2','final')
              NOT NULL DEFAULT 'league',
  team1_id    INT          NOT NULL,
  team2_id    INT          NOT NULL,
  winner_id   INT          DEFAULT NULL,
  score1      SMALLINT     DEFAULT NULL,
  score2      SMALLINT     DEFAULT NULL,
  played_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team1_id)  REFERENCES teams(id),
  FOREIGN KEY (team2_id)  REFERENCES teams(id),
  FOREIGN KEY (winner_id) REFERENCES teams(id),
  INDEX idx_room_match (room_id)
);

/* ─────────────────────────────────────────
   POINTS TABLE
───────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS points (
  id          INT          AUTO_INCREMENT PRIMARY KEY,
  room_id     VARCHAR(36)  NOT NULL,
  team_id     INT          NOT NULL UNIQUE,
  matches     SMALLINT     NOT NULL DEFAULT 0,
  wins        SMALLINT     NOT NULL DEFAULT 0,
  losses      SMALLINT     NOT NULL DEFAULT 0,
  points      SMALLINT     NOT NULL DEFAULT 0,
  runs_for    INT          NOT NULL DEFAULT 0,
  runs_ag     INT          NOT NULL DEFAULT 0,
  overs_for   DECIMAL(6,1) NOT NULL DEFAULT 0.0,
  overs_ag    DECIMAL(6,1) NOT NULL DEFAULT 0.0,
  nrr         DECIMAL(7,3) NOT NULL DEFAULT 0.000,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  INDEX idx_room_pts (room_id)
);
`;

(async () => {
  const conn = await pool.getConnection();
  try {
    for (const stmt of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) {
      await conn.query(stmt);
    }
    console.log('✅  All tables created / already exist.');
  } catch (e) {
    console.error('Migration error:', e.message);
  } finally {
    conn.release();
    process.exit(0);
  }
})();

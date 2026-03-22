// src/routes/players.js
const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');

/* ── GET /api/players  – full master list ──── */
router.get('/', auth, async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM players ORDER BY rating DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── GET /api/players/:id ────────────────── */
router.get('/:id', auth, async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM players WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Player not found' });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;


// ─────────────────────────────────────────────
// src/routes/matches.js  (exported from same file for brevity)
// ─────────────────────────────────────────────
const mRouter = require('express').Router();

/* ── GET /api/matches/:roomId ──────────────── */
mRouter.get('/:roomId', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.*,
              t1.name AS team1_name, t1.short_name AS t1_short, t1.color AS t1_color,
              t2.name AS team2_name, t2.short_name AS t2_short, t2.color AS t2_color,
              w.name  AS winner_name
       FROM matches m
       JOIN teams t1 ON t1.id = m.team1_id
       JOIN teams t2 ON t2.id = m.team2_id
       LEFT JOIN teams w ON w.id = m.winner_id
       WHERE m.room_id = ?
       ORDER BY m.played_at DESC`,
      [req.params.roomId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── GET /api/points/:roomId ───────────────── */
const pRouter = require('express').Router();

pRouter.get('/:roomId', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT pt.*, t.name, t.short_name, t.color, t.emoji
       FROM points pt
       JOIN teams t ON t.id = pt.team_id
       WHERE pt.room_id = ?
       ORDER BY pt.points DESC, pt.nrr DESC`,
      [req.params.roomId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { playersRouter: router, matchesRouter: mRouter, pointsRouter: pRouter };

// src/routes/rooms.js
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const db     = require('../config/db');
const auth   = require('../middleware/auth');

const IPL_TEAMS = [
  { name:'Mumbai Indians',        short_name:'MI',   color:'#004BA0', emoji:'💙' },
  { name:'Chennai Super Kings',   short_name:'CSK',  color:'#F9CD05', emoji:'💛' },
  { name:'Royal Challengers',     short_name:'RCB',  color:'#EC1C24', emoji:'❤️' },
  { name:'Kolkata Knight Riders', short_name:'KKR',  color:'#3A225D', emoji:'💜' },
  { name:'Delhi Capitals',        short_name:'DC',   color:'#4169E1', emoji:'🔵' },
  { name:'Punjab Kings',          short_name:'PBKS', color:'#ED1F27', emoji:'🔴' },
];

/* ── POST /api/rooms  – create a new room ────── */
router.post('/', auth, async (req, res) => {
  const roomId  = uuid();
  const userId  = req.user.id;
  const { teamIndex = 0 } = req.body;   // host picks their team (0-7)

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Create room row
    await conn.query(
      'INSERT INTO rooms (id, host_id) VALUES (?,?)',
      [roomId, userId]
    );

    // 2. Create all 8 teams; mark host's team as human
    for (let i = 0; i < IPL_TEAMS.length; i++) {
      const t    = IPL_TEAMS[i];
      const isAI = i !== Number(teamIndex) ? 1 : 0;
      const uid  = isAI ? null : userId;
      await conn.query(
        `INSERT INTO teams (room_id,name,short_name,color,emoji,budget,is_ai,user_id)
         VALUES (?,?,?,?,?,100.00,?,?)`,
        [roomId, t.name, t.short_name, t.color, t.emoji, isAI, uid]
      );
    }

    // 3. Initialise points rows
    const [teams] = await conn.query(
      'SELECT id FROM teams WHERE room_id = ?', [roomId]
    );
    for (const { id } of teams) {
      await conn.query(
        'INSERT INTO points (room_id, team_id) VALUES (?,?)',
        [roomId, id]
      );
    }

    await conn.commit();
    res.status(201).json({ roomId, message: 'Room created' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});


// src/socket/auctionManager.js
/**
 * Real-time Auction Manager
 * ─────────────────────────
 * One AuctionRoom instance per active game room.
 * Manages: player queue · timer · human bids · AI bids · DB writes
 */

const db          = require('../config/db');
const { evaluate, calcNextBid } = require('../services/aiBidder');

const TIMER_SEC    = 15;
const AI_MIN_DELAY = 1200;
const AI_MAX_DELAY = 7000;

class AuctionRoom {
  constructor(io, roomId, teams, players) {
    this.io       = io;
    this.roomId   = roomId;
    this.teams    = teams;          // [{ id, name, short_name, budget, is_ai, squad:[] }]
    this.players  = players;        // shuffled array
    this.qIdx     = 0;
    this.curBid   = 0;
    this.leader   = null;           // team id
    this.timer    = null;
    this.aiTimers = [];
  }

  /* ── Start / next player ─────────────────── */
  start() { this._nextPlayer(); }

  _nextPlayer() {
    this._clearTimers();
    if (this.qIdx >= this.players.length) { this._endAuction(); return; }

    const p       = this.players[this.qIdx];
    this.curBid   = p.base_price;
    this.leader   = null;

    this.io.to(this.roomId).emit('auction:player', {
      player   : p,
      index    : this.qIdx,
      total    : this.players.length,
    });

    this._startTimer();
    this._scheduleAI();
  }

  /* ── Timer ───────────────────────────────── */
  _startTimer(sec = TIMER_SEC) {
    let remaining = sec;
    this.io.to(this.roomId).emit('auction:timer', { remaining });

    this.timer = setInterval(() => {
      remaining--;
      this.io.to(this.roomId).emit('auction:timer', { remaining });
      if (remaining <= 0) { clearInterval(this.timer); this._finalize(); }
    }, 1000);
  }

  _resetTimer() {
    clearInterval(this.timer);
    this._startTimer(12);           // shorter after each bid
    this._scheduleAI();
  }

  _clearTimers() {
    clearInterval(this.timer);
    this.aiTimers.forEach(t => clearTimeout(t));
    this.aiTimers = [];
  }

  /* ── Human bid ───────────────────────────── */
  humanBid(teamId) {
    const team   = this.teams.find(t => t.id === teamId);
    const nextB  = calcNextBid(this.curBid);
    if (!team)               return { error: 'Team not found' };
    if (team.id === this.leader) return { error: 'You are already the highest bidder' };
    if (nextB > team.budget) return { error: 'Insufficient budget' };
    if (team.squad.length >= 15) return { error: 'Squad full' };

    this._recordBid(team, nextB);
    this._resetTimer();
    return { ok: true };
  }

  /* ── AI bids ─────────────────────────────── */
  _scheduleAI() {
    const snap = this.qIdx;
    this.teams.filter(t => t.is_ai).forEach(t => {
      const delay = AI_MIN_DELAY + Math.random() * (AI_MAX_DELAY - AI_MIN_DELAY);
      const tid = setTimeout(() => {
        if (this.qIdx !== snap) return;
        const bid = evaluate(t, this.players[this.qIdx], this.curBid, this.leader);
        if (bid) { this._recordBid(t, bid); this._resetTimer(); }
      }, delay);
      this.aiTimers.push(tid);
    });
  }

  /* ── Internal bid recording ──────────────── */
  _recordBid(team, amount) {
    this.curBid = amount;
    this.leader = team.id;
    this.io.to(this.roomId).emit('auction:bid', {
      teamId   : team.id,
      teamName : team.name,
      teamShort: team.short_name,
      amount,
    });
  }

  /* ── Finalize player ─────────────────────── */
  async _finalize() {
    this._clearTimers();
    const p = this.players[this.qIdx];

    if (this.leader === null) {
      // UNSOLD
      await db.query(
        'INSERT INTO auctions (room_id,player_id) VALUES (?,?)',
        [this.roomId, p.id]
      );
      this.io.to(this.roomId).emit('auction:unsold', { player: p });
    } else {
      const team = this.teams.find(t => t.id === this.leader);
      team.budget = parseFloat((team.budget - this.curBid).toFixed(2));
      team.squad.push({ ...p, sold_price: this.curBid });

      await db.query(
        'INSERT INTO auctions (room_id,player_id,team_id,sold_price) VALUES (?,?,?,?)',
        [this.roomId, p.id, team.id, this.curBid]
      );
      await db.query(
        'UPDATE teams SET budget=? WHERE id=?',
        [team.budget, team.id]
      );

      this.io.to(this.roomId).emit('auction:sold', {
        player   : p,
        teamId   : team.id,
        teamName : team.name,
        price    : this.curBid,
        budgets  : this.teams.map(t => ({ id: t.id, budget: t.budget })),
      });
    }

    // Next player after a short display pause
    setTimeout(() => { this.qIdx++; this._nextPlayer(); }, 2500);
  }

  /* ── End of auction ──────────────────────── */
  async _endAuction() {
    await db.query("UPDATE rooms SET status='season' WHERE id=?", [this.roomId]);
    this.io.to(this.roomId).emit('auction:complete', {
      teams: this.teams.map(t => ({
        id    : t.id,
        name  : t.name,
        budget: t.budget,
        squad : t.squad.length,
      })),
    });
  }
}

/* ── Registry of active rooms ───────────────── */
const rooms = new Map();   // roomId → AuctionRoom

async function initRoom(io, roomId) {
  if (rooms.has(roomId)) return rooms.get(roomId);

  const [teams]   = await db.query(
    'SELECT * FROM teams WHERE room_id = ?', [roomId]
  );
  const [players] = await db.query('SELECT * FROM players');

  // Attach empty squad arrays
  for (const t of teams) {
    const [sq] = await db.query(
      `SELECT p.* FROM auctions a JOIN players p ON p.id=a.player_id
       WHERE a.room_id=? AND a.team_id=?`, [roomId, t.id]
    );
    t.squad = sq;
  }

  // Shuffle players
  const shuffled = players.sort(() => Math.random() - 0.5);

  const room = new AuctionRoom(io, roomId, teams, shuffled);
  rooms.set(roomId, room);
  return room;
}

function getRoom(roomId) { return rooms.get(roomId); }
function deleteRoom(roomId) { rooms.delete(roomId); }

module.exports = { initRoom, getRoom, deleteRoom };

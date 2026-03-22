// src/services/matchSimulator.js
/**
 * Match Simulation Engine
 * ──────────────────────
 * Simulates a T20 match result based on squad ratings.
 * Works for both league and playoff matches.
 */

const db = require('../config/db');

/**
 * Calculate the batting & bowling strength of a squad.
 * Returns a single "power" number (roughly 55–100).
 */
function squadStrength(squad) {
  if (!squad.length) return 52 + Math.random() * 18;

  const sorted = [...squad].sort((a, b) => b.rating - a.rating).slice(0, 11);
  const base   = sorted.reduce((s, p) => s + p.rating, 0) / sorted.length;

  // Bonus for role balance
  const counts = { Batsman:0, Bowler:0, 'All-Rounder':0, 'Wicket-Keeper':0 };
  squad.forEach(p => { if (counts[p.role] !== undefined) counts[p.role]++; });
  const balanced =
    counts.Batsman          >= 4 &&
    counts.Bowler           >= 4 &&
    counts['All-Rounder']   >= 2 &&
    counts['Wicket-Keeper'] >= 1;

  return base * (balanced ? 1.05 : 0.97);
}

/**
 * Generate a realistic-ish T20 scorecard line.
 * Winner scores 155–210, loser scores 10-25 less.
 */
function genScores(winnerStr, loserStr) {
  // More dominant the winner → bigger margin
  const gap     = Math.min(40, Math.max(5, (winnerStr - loserStr) * 0.6));
  const winScore = Math.floor(155 + Math.random() * 55);
  const loseScore= Math.floor(Math.max(90, winScore - gap - Math.random() * 25));
  return { winScore, loseScore };
}

/**
 * Simulate a single match between two teams.
 * Does NOT write to DB – caller handles persistence.
 *
 * @param {object[]} squad1  – array of player objects for team 1
 * @param {object[]} squad2  – array of player objects for team 2
 * @param {number}   id1     – team1 DB id
 * @param {number}   id2     – team2 DB id
 * @returns {{ winner:number, loser:number, score1:number, score2:number }}
 */
function simulate(squad1, squad2, id1, id2) {
  const s1 = squadStrength(squad1);
  const s2 = squadStrength(squad2);
  const p1wins = s1 / (s1 + s2);

  const winner = Math.random() < p1wins ? id1 : id2;
  const loser  = winner === id1 ? id2 : id1;

  const winStr  = winner === id1 ? s1 : s2;
  const loseStr = winner === id1 ? s2 : s1;
  const { winScore, loseScore } = genScores(winStr, loseStr);

  const score1 = id1 === winner ? winScore : loseScore;
  const score2 = id2 === winner ? winScore : loseScore;

  return { winner, loser, score1, score2 };
}

/**
 * Simulate full league stage for a room and persist results.
 */
async function simulateLeague(roomId) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Fetch teams
    const [teams] = await conn.query(
      'SELECT * FROM teams WHERE room_id = ?', [roomId]
    );

    // Fetch squads for each team
    const squads = {};
    for (const t of teams) {
      const [sq] = await conn.query(
        `SELECT p.* FROM auctions a
         JOIN players p ON p.id = a.player_id
         WHERE a.room_id = ? AND a.team_id = ?`,
        [roomId, t.id]
      );
      squads[t.id] = sq;
    }

    const results = [];
    // Round-robin: each pair plays once
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const t1 = teams[i], t2 = teams[j];
        const res = simulate(squads[t1.id], squads[t2.id], t1.id, t2.id);

        await conn.query(
          `INSERT INTO matches (room_id,stage,team1_id,team2_id,winner_id,score1,score2)
           VALUES (?,?,?,?,?,?,?)`,
          [roomId, 'league', t1.id, t2.id, res.winner, res.score1, res.score2]
        );

        // Update points
        const updatePts = async (tid, win) => {
          await conn.query(
            `UPDATE points SET
               matches  = matches  + 1,
               wins     = wins     + ?,
               losses   = losses   + ?,
               points   = points   + ?,
               runs_for = runs_for + ?,
               runs_ag  = runs_ag  + ?,
               overs_for= overs_for+ 20,
               overs_ag = overs_ag + 20
             WHERE room_id=? AND team_id=?`,
            [win?1:0, win?0:1, win?2:0,
             tid===t1.id?res.score1:res.score2,
             tid===t1.id?res.score2:res.score1,
             roomId, tid]
          );
        };
        await updatePts(t1.id, res.winner === t1.id);
        await updatePts(t2.id, res.winner === t2.id);

        results.push({ ...res, t1Name: t1.name, t2Name: t2.name });
      }
    }

    // Recalculate NRR for all teams
    await conn.query(
      `UPDATE points
       SET nrr = (runs_for / NULLIF(overs_for,0)) - (runs_ag / NULLIF(overs_ag,0))
       WHERE room_id = ?`,
      [roomId]
    );

    // Update room status
    await conn.query(
      "UPDATE rooms SET status='playoffs' WHERE id=?", [roomId]
    );

    await conn.commit();
    return results;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/**
 * Simulate playoffs for a room and persist results.
 * Returns { q1, eliminator, q2, final, champion }
 */
async function simulatePlayoffs(roomId) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Top 4 by points
    const [top4rows] = await conn.query(
      `SELECT pt.team_id FROM points pt
       WHERE pt.room_id = ?
       ORDER BY pt.points DESC, pt.nrr DESC
       LIMIT 4`,
      [roomId]
    );
    const top4 = top4rows.map(r => r.team_id);

    // Fetch squads
    const sqOf = async (tid) => {
      const [rows] = await conn.query(
        `SELECT p.* FROM auctions a JOIN players p ON p.id=a.player_id
         WHERE a.room_id=? AND a.team_id=?`, [roomId, tid]
      );
      return rows;
    };

    const persist = async (stage, t1, t2, res) => {
      await conn.query(
        `INSERT INTO matches (room_id,stage,team1_id,team2_id,winner_id,score1,score2)
         VALUES (?,?,?,?,?,?,?)`,
        [roomId, stage, t1, t2, res.winner, res.score1, res.score2]
      );
    };

    const sq = {};
    for (const tid of top4) sq[tid] = await sqOf(tid);

    // Q1: 1 vs 2
    const q1 = simulate(sq[top4[0]], sq[top4[1]], top4[0], top4[1]);
    await persist('qualifier1', top4[0], top4[1], q1);

    // Eliminator: 3 vs 4
    const el = simulate(sq[top4[2]], sq[top4[3]], top4[2], top4[3]);
    await persist('eliminator', top4[2], top4[3], el);

    // Q2: Q1 loser vs Eliminator winner
    const q1Loser = q1.winner === top4[0] ? top4[1] : top4[0];
    sq[q1Loser]  = sq[q1Loser]  || await sqOf(q1Loser);
    sq[el.winner]= sq[el.winner]|| await sqOf(el.winner);
    const q2 = simulate(sq[q1Loser], sq[el.winner], q1Loser, el.winner);
    await persist('qualifier2', q1Loser, el.winner, q2);

    // Final: Q1 winner vs Q2 winner
    const fin = simulate(sq[q1.winner], sq[q2.winner], q1.winner, q2.winner);
    await persist('final', q1.winner, q2.winner, fin);

    await conn.query("UPDATE rooms SET status='finished' WHERE id=?", [roomId]);
    await conn.commit();

    return { q1, eliminator:el, q2, final:fin, champion: fin.winner };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = { simulate, simulateLeague, simulatePlayoffs };

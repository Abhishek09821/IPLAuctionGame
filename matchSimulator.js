// src/services/simulationService.js

const db = require('../config/db');

/**
 * =========================================================
 * CONFIG
 * =========================================================
 */

const HOME_ADVANTAGE = 4;

const PITCH_TYPES = [
  'batting',
  'balanced',
  'spin',
  'pace'
];

const COMMENTARY = [
  'Massive six over long-on!',
  'Clean bowled!',
  'Brilliant yorker at the death!',
  'What a catch at deep midwicket!',
  'That is pure timing!',
  'Excellent slower ball!',
  'Pressure building in the chase!',
  'That changes the game completely!',
  'Back-to-back boundaries!',
  'Crowd going absolutely wild!'
];

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function oversToFloat(overs) {
  const full = Math.floor(overs);
  const balls = Math.floor((overs - full) * 10);

  return full + balls / 6;
}

function generateOvers(score) {
  // Team all out possibility
  if (Math.random() < 0.18) {
    const overs = rand(14, 20);
    return Number(overs.toFixed(1));
  }

  return 20;
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}


/**
 * =========================================================
 * SQUAD ANALYSIS
 * =========================================================
 */

function squadStrength(squad, pitchType = 'balanced') {
  if (!squad.length) {
    return {
      overall: 60,
      batting: 60,
      bowling: 60
    };
  }

  const playingXI = [...squad]
    .map(applyPlayerForm)
    .sort((a, b) => b.effectiveRating - a.effectiveRating)
    .slice(0, 11);

  let batting = 0;
  let bowling = 0;
  let allRound = 0;
  let keeping = 0;

  let batters = 0;
  let bowlers = 0;
  let allRounders = 0;
  let keepers = 0;

  for (const p of playingXI) {
    switch (p.role) {
      case 'Batsman':
        batting += p.effectiveRating * 1.2;
        batters++;
        break;

      case 'Bowler':
        bowling += p.effectiveRating * 1.2;
        bowlers++;
        break;

      case 'All-Rounder':
        batting += p.effectiveRating * 0.75;
        bowling += p.effectiveRating * 0.75;
        allRound += p.effectiveRating;
        allRounders++;
        break;

      case 'Wicket-Keeper':
        batting += p.effectiveRating;
        keeping += p.effectiveRating;
        keepers++;
        break;
    }
  }

  batting /= playingXI.length;
  bowling /= playingXI.length;

  /**
   * Pitch Impact
   */

  if (pitchType === 'batting') {
    batting += 8;
  }

  if (pitchType === 'pace') {
    bowling += 6;
  }

  if (pitchType === 'spin') {
    bowling += 4;
    allRound += 3;
  }

  

  /**
   * Random chaos / upset factor
   */

  const chaos = rand(-6, 6);

  const overall =
    batting * 0.45 +
    bowling * 0.35 +
    (allRound / playingXI.length) * 0.15 +
    (keeping / playingXI.length) * 0.05 +
    balanceBonus +
    chaos;

  return {
    overall,
    batting,
    bowling,
    playingXI
  };
}

/**
 * =========================================================
 * SCORE GENERATOR
 * =========================================================
 */

function generateScore({
  battingStrength,
  bowlingStrength,
  pitchType
}) {
  let base = 150;

  switch (pitchType) {
    case 'batting':
      base += 18;
      break;

    case 'pace':
      base -= 8;
      break;

    case 'spin':
      base -= 5;
      break;
  }

  const battingImpact = battingStrength * 0.95;
  const bowlingImpact = bowlingStrength * 0.72;

  let score =
    base +
    battingImpact -
    bowlingImpact +
    rand(-18, 22);

  score = clamp(Math.round(score), 85, 250);

  return score;
}

/**
 * =========================================================
 * PLAYER OF MATCH
 * =========================================================
 */

function getPlayerOfMatch(squad) {
  const weighted = squad.map(p => {
    let score = p.rating;

    if (p.role === 'All-Rounder') {
      score += 10;
    }

    score += rand(0, 15);

    return {
      ...p,
      performanceScore: score
    };
  });

  weighted.sort((a, b) => b.performanceScore - a.performanceScore);

  return weighted[0];
}

/**
 * =========================================================
 * MATCH SIMULATION
 * =========================================================
 */

function simulate({
  squad1,
  squad2,
  id1,
  id2,
  homeTeamId = null
}) {
  const pitchType = randomItem(PITCH_TYPES);

  const tossWinner = Math.random() < 0.5 ? id1 : id2;

  const tossDecision =
    Math.random() < 0.55 ? 'bat' : 'bowl';

  const team1 = squadStrength(squad1, pitchType);
  const team2 = squadStrength(squad2, pitchType);

  /**
   * Home Advantage
   */

  if (homeTeamId === id1) {
    team1.overall += HOME_ADVANTAGE;
  }

  if (homeTeamId === id2) {
    team2.overall += HOME_ADVANTAGE;
  }

  /**
   * First innings
   */

  const team1BattingFirst =
    (tossWinner === id1 && tossDecision === 'bat') ||
    (tossWinner === id2 && tossDecision === 'bowl');

  let score1;
  let score2;

  if (team1BattingFirst) {
    score1 = generateScore({
      battingStrength: team1.batting,
      bowlingStrength: team2.bowling,
      pitchType
    });

    score2 = generateScore({
      battingStrength: team2.batting,
      bowlingStrength: team1.bowling,
      pitchType
    });
  } else {
    score2 = generateScore({
      battingStrength: team2.batting,
      bowlingStrength: team1.bowling,
      pitchType
    });

    score1 = generateScore({
      battingStrength: team1.batting,
      bowlingStrength: team2.bowling,
      pitchType
    });
  }

  /**
   * Avoid ties mostly
   */

  if (score1 === score2) {
    score2 -= 1;
  }

  const winner = score1 > score2 ? id1 : id2;
  const loser = winner === id1 ? id2 : id1;

  const winnerSquad = winner === id1 ? squad1 : squad2;

  const playerOfMatch = getPlayerOfMatch(winnerSquad);

  const overs1 = generateOvers(score1);
  const overs2 = generateOvers(score2);

  return {
    pitchType,

    tossWinner,
    tossDecision,

    winner,
    loser,

    score1,
    score2,

    overs1,
    overs2,

    margin: Math.abs(score1 - score2),

    commentary: randomItem(COMMENTARY),

    playerOfMatch: {
      id: playerOfMatch.id,
      name: playerOfMatch.name,
      role: playerOfMatch.role
    }
  };
}

/**
 * =========================================================
 * UPDATE POINTS TABLE
 * =========================================================
 */

async function updatePoints({
  conn,
  roomId,
  teamId,
  win,
  runsFor,
  runsAgainst,
  oversFor,
  oversAgainst
}) {
  await conn.query(
    `
    UPDATE points
    SET
      matches     = matches + 1,
      wins        = wins + ?,
      losses      = losses + ?,
      points      = points + ?,
      runs_for    = runs_for + ?,
      runs_ag     = runs_ag + ?,
      overs_for   = overs_for + ?,
      overs_ag    = overs_ag + ?
    WHERE room_id = ?
      AND team_id = ?
    `,
    [
      win ? 1 : 0,
      win ? 0 : 1,
      win ? 2 : 0,

      runsFor,
      runsAgainst,

      oversToFloat(oversFor),
      oversToFloat(oversAgainst),

      roomId,
      teamId
    ]
  );
}

/**
 * =========================================================
 * LEAGUE SIMULATION
 * =========================================================
 */

async function simulateLeague(roomId) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [teams] = await conn.query(
      `SELECT * FROM teams WHERE room_id = ?`,
      [roomId]
    );

    /**
     * Fetch squads
     */

    const squads = {};

    for (const t of teams) {
      const [players] = await conn.query(
        `
        SELECT p.*
        FROM auctions a
        JOIN players p ON p.id = a.player_id
        WHERE a.room_id = ?
          AND a.team_id = ?
        `,
        [roomId, t.id]
      );

      squads[t.id] = players;
    }

    const results = [];

    /**
     * Round robin
     */

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const t1 = teams[i];
        const t2 = teams[j];

        const result = simulate({
          squad1: squads[t1.id],
          squad2: squads[t2.id],
          id1: t1.id,
          id2: t2.id,
          homeTeamId: Math.random() < 0.5
            ? t1.id
            : t2.id
        });

        /**
         * Save match
         */

        await conn.query(
          `
          INSERT INTO matches (
            room_id,
            stage,
            team1_id,
            team2_id,
            winner_id,
            score1,
            score2,
            overs1,
            overs2,
            pitch_type,
            commentary,
            pom_player_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            roomId,
            'league',

            t1.id,
            t2.id,

            result.winner,

            result.score1,
            result.score2,

            result.overs1,
            result.overs2,

            result.pitchType,

            result.commentary,

            result.playerOfMatch.id
          ]
        );

        /**
         * Update points
         */

        await updatePoints({
          conn,
          roomId,
          teamId: t1.id,
          win: result.winner === t1.id,

          runsFor: result.score1,
          runsAgainst: result.score2,

          oversFor: result.overs1,
          oversAgainst: result.overs2
        });

        await updatePoints({
          conn,
          roomId,
          teamId: t2.id,
          win: result.winner === t2.id,

          runsFor: result.score2,
          runsAgainst: result.score1,

          oversFor: result.overs2,
          oversAgainst: result.overs1
        });

        results.push({
          ...result,
          t1Name: t1.name,
          t2Name: t2.name
        });
      }
    }

    /**
     * Recalculate NRR
     */

    await conn.query(
      `
      UPDATE points
      SET nrr =
        (runs_for / NULLIF(overs_for, 0))
        -
        (runs_ag / NULLIF(overs_ag, 0))
      WHERE room_id = ?
      `,
      [roomId]
    );

    /**
     * Move to playoffs
     */

    await conn.query(
      `
      UPDATE rooms
      SET status = 'playoffs'
      WHERE id = ?
      `,
      [roomId]
    );

    await conn.commit();

    return results;

  } catch (err) {
    await conn.rollback();
    throw err;

  } finally {
    conn.release();
  }
}

/**
 * =========================================================
 * PLAYOFFS
 * =========================================================
 */

async function simulatePlayoffs(roomId) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    /**
     * Top 4
     */

    const [rows] = await conn.query(
      `
      SELECT team_id
      FROM points
      WHERE room_id = ?
      ORDER BY points DESC, nrr DESC
      LIMIT 4
      `,
      [roomId]
    );

    const top4 = rows.map(r => r.team_id);

    /**
     * Fetch squad
     */

    async function fetchSquad(teamId) {
      const [players] = await conn.query(
        `
        SELECT p.*
        FROM auctions a
        JOIN players p ON p.id = a.player_id
        WHERE a.room_id = ?
          AND a.team_id = ?
        `,
        [roomId, teamId]
      );

      return players;
    }

    const squads = {};

    for (const teamId of top4) {
      squads[teamId] = await fetchSquad(teamId);
    }

    async function persist(stage, t1, t2, result) {
      await conn.query(
        `
        INSERT INTO matches (
          room_id,
          stage,
          team1_id,
          team2_id,
          winner_id,
          score1,
          score2,
          overs1,
          overs2,
          pitch_type,
          commentary,
          pom_player_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          roomId,
          stage,

          t1,
          t2,

          result.winner,

          result.score1,
          result.score2,

          result.overs1,
          result.overs2,

          result.pitchType,

          result.commentary,

          result.playerOfMatch.id
        ]
      );
    }

    /**
     * QUALIFIER 1
     */

    const q1 = simulate({
      squad1: squads[top4[0]],
      squad2: squads[top4[1]],
      id1: top4[0],
      id2: top4[1]
    });

    await persist(
      'qualifier1',
      top4[0],
      top4[1],
      q1
    );

    /**
     * ELIMINATOR
     */

    const eliminator = simulate({
      squad1: squads[top4[2]],
      squad2: squads[top4[3]],
      id1: top4[2],
      id2: top4[3]
    });

    await persist(
      'eliminator',
      top4[2],
      top4[3],
      eliminator
    );

    /**
     * QUALIFIER 2
     */

    const q1Loser =
      q1.winner === top4[0]
        ? top4[1]
        : top4[0];

    const q2 = simulate({
      squad1: squads[q1Loser],
      squad2: squads[eliminator.winner],
      id1: q1Loser,
      id2: eliminator.winner
    });

    await persist(
      'qualifier2',
      q1Loser,
      eliminator.winner,
      q2
    );

    /**
     * FINAL
     */

    const final = simulate({
      squad1: squads[q1.winner],
      squad2: squads[q2.winner],
      id1: q1.winner,
      id2: q2.winner
    });

    await persist(
      'final',
      q1.winner,
      q2.winner,
      final
    );

    /**
     * Finish tournament
     */

    await conn.query(
      `
      UPDATE rooms
      SET status = 'finished'
      WHERE id = ?
      `,
      [roomId]
    );

    await conn.commit();

    return {
      q1,
      eliminator,
      q2,
      final,
      champion: final.winner
    };

  } catch (err) {
    await conn.rollback();
    throw err;

  } finally {
    conn.release();
  }
}

module.exports = {
  simulate,
  simulateLeague,
  simulatePlayoffs
};

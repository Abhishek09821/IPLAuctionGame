// src/services/aiBidder.js
/**
 * AI Bidding Engine
 * -----------------
 * Each AI team independently evaluates whether to bid on the current player.
 * Called from Socket.io auction service after a bid is placed or timer ticks.
 */

const ROLE_LIMITS = {
  Batsman:          6,
  Bowler:           5,
  'All-Rounder':    4,
  'Wicket-Keeper':  2,
};
const MAX_SQUAD = 15;

/**
 * @param {object} team        – { id, budget, squad:[] }
 * @param {object} player      – { id, role, base_price, rating }
 * @param {number} currentBid  – current highest bid amount
 * @param {number} currentLeader – team_id of current highest bidder (-1 if none)
 * @returns {number|null}  – bid amount, or null if AI passes
 */
function evaluate(team, player, currentBid, currentLeader) {
  if (team.id === currentLeader)   return null;  // Already leading
  if (team.squad.length >= MAX_SQUAD) return null;
  if (team.budget < 2)             return null;  // Keep emergency reserve

  // Role balance check
  const roleCount = team.squad.filter(p => p.role === player.role).length;
  const limit     = ROLE_LIMITS[player.role] || 3;
  if (roleCount >= limit) return null;

  // How desperate is the team for this role?
  const desperacy = team.squad.length < 5 ? 1.4 :
                    team.squad.length < 9 ? 1.1 : 0.95;

  // Max willingness to pay (based on rating, budget, desperation)
  const maxWilling = (player.rating / 100) * 20 * desperacy * (0.75 + Math.random() * 0.65);

  const nextBid = calcNextBid(currentBid);
  if (nextBid > maxWilling)         return null;
  if (nextBid > team.budget - 1.5)  return null;  // Always keep some float

  // Probabilistic: elite players (rt≥90) almost always get bids; weaker ones sometimes skip
  const bidProb = 0.25 + (player.rating - 60) / 120;
  if (Math.random() > bidProb) return null;

  return nextBid;
}

function calcNextBid(cur) {
  if (cur < 0.5)  return parseFloat((cur + 0.10).toFixed(2));
  if (cur < 2)    return parseFloat((cur + 0.25).toFixed(2));
  if (cur < 5)    return parseFloat((cur + 0.50).toFixed(2));
  return parseFloat((cur + 1.00).toFixed(2));
}

module.exports = { evaluate, calcNextBid };

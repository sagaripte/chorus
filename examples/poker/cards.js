/**
 * Card utilities — deck, shuffle, hand ranking.
 */

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function makeDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push(r + s);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function formatHand(cards) {
  return cards.join(' ');
}

/**
 * Simple hand ranking (higher = better).
 * Not a full poker evaluator, but enough for the demo.
 */
export function rankHand(holeCards, communityCards) {
  const all = [...holeCards, ...communityCards];
  const rankValues = all.map(c => RANKS.indexOf(c.slice(0, -1)));
  const maxRank = Math.max(...rankValues);

  const counts = {};
  for (const v of rankValues) counts[v] = (counts[v] || 0) + 1;

  // Sort by count desc, then by rank desc to get the most relevant grouping
  const grouped = Object.entries(counts)
    .map(([rank, count]) => ({ rank: Number(rank), count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
  const groups = grouped.map(g => g.count);
  const primaryRank = grouped[0].rank;   // rank of the best group (pair/trips/quads)
  const secondaryRank = grouped[1]?.rank || 0;

  const suitCounts = {};
  for (const c of all) {
    const s = c.slice(-1);
    suitCounts[s] = (suitCounts[s] || 0) + 1;
  }
  const isFlush = Object.values(suitCounts).some(c => c >= 5);

  // Straight detection: find 5 consecutive unique ranks
  const unique = [...new Set(rankValues)].sort((a, b) => a - b);
  let isStraight = false;
  let straightHigh = 0;
  // Check ace-low straight (A-2-3-4-5)
  if (unique.includes(12) && unique.includes(0) && unique.includes(1) && unique.includes(2) && unique.includes(3)) {
    isStraight = true;
    straightHigh = 3; // 5-high
  }
  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i + 4] - unique[i] === 4) {
      isStraight = true;
      straightHigh = unique[i + 4];
    }
  }

  // Score: category * 1000 + primary rank * 14 + kicker
  let score = maxRank; // high card
  if (groups[0] === 2) score = 1000 + primaryRank * 14 + maxRank;
  if (groups[0] === 2 && groups[1] === 2) score = 2000 + primaryRank * 14 + secondaryRank;
  if (groups[0] === 3) score = 3000 + primaryRank * 14 + maxRank;
  if (isStraight) score = Math.max(score, 4000 + straightHigh);
  if (isFlush) score = Math.max(score, 5000 + maxRank);
  if (isStraight && isFlush) score = Math.max(score, 8000 + straightHigh);
  if (groups[0] === 3 && groups[1] >= 2) score = 6000 + primaryRank * 14 + secondaryRank;
  if (groups[0] === 4) score = 7000 + primaryRank * 14 + maxRank;

  return score;
}

/**
 * Table — manages a single hand of poker.
 *
 * Deals cards, runs betting rounds, determines winner.
 * Players make decisions via LLM (ask()). Everything else is procedural.
 */
import { makeDeck, formatHand, rankHand } from './cards.js';
import { parseAction } from './player.js';

export default class Table {
  constructor(players, bus, timeline, { smallBlind = 10 } = {}) {
    this.players = players;
    this.bus = bus;
    this.tl = timeline;
    this.smallBlind = smallBlind;
    this.dealerIdx = 0;
  }

  async playHand(handNum) {
    const active = this.players.filter(p => p.chips > 0);
    if (active.length < 2) return null;

    const deck = makeDeck();
    const community = [];
    let pot = 0;
    let currentBet = 0;

    // Deal hole cards
    for (const p of active) {
      p.resetForHand(deck.pop(), deck.pop());
    }

    // Post blinds
    const sbIdx = (this.dealerIdx + 1) % active.length;
    const bbIdx = (this.dealerIdx + 2) % active.length;
    const sb = active[sbIdx];
    const bb = active[bbIdx];

    const sbAmt = Math.min(this.smallBlind, sb.chips);
    const bbAmt = Math.min(this.smallBlind * 2, bb.chips);
    sb.chips -= sbAmt; sb.currentBet = sbAmt;
    bb.chips -= bbAmt; bb.currentBet = bbAmt;
    pot += sbAmt + bbAmt;
    currentBet = bbAmt;

    console.log(`    Blinds: ${sb.playerName} (${sbAmt}), ${bb.playerName} (${bbAmt})`);

    // Tell each player their hand
    for (const p of active) {
      p.queue(`\n--- HAND ${handNum} ---`);
      p.queue(`Your cards: ${formatHand(p.hand)}`);
      p.queue(`Your chips: ${p.chips} | Pot: ${pot} | Blinds: ${this.smallBlind}/${this.smallBlind * 2}`);
      p.queue(`Players: ${active.map(ap => `${ap.playerName}(${ap.chips})`).join(', ')}`);
    }

    this.tl.emit('hand_start', { hand: handNum, pot, blinds: { sb: sb.playerName, bb: bb.playerName } });

    // Betting rounds
    const streets = [
      { name: 'Pre-flop', cards: 0 },
      { name: 'Flop', cards: 3 },
      { name: 'Turn', cards: 1 },
      { name: 'River', cards: 1 },
    ];

    for (const street of streets) {
      if (street.cards > 0) {
        for (let i = 0; i < street.cards; i++) community.push(deck.pop());
        const communityStr = formatHand(community);
        console.log(`\n    ${street.name}: ${communityStr}`);
        for (const p of active) {
          if (!p.folded) p.queue(`${street.name}: ${communityStr} | Pot: ${pot}`);
        }
        this.tl.emit('street', { name: street.name, community: communityStr, pot });
        currentBet = 0;
        for (const p of active) p.currentBet = 0;
      }

      const result = await this.#bettingRound(active, street, currentBet, pot, community, bbIdx);
      pot = result.pot;
      currentBet = result.currentBet;

      if (active.filter(p => !p.folded).length < 2) break;
    }

    // Showdown
    const winner = this.#resolveWinner(active, community, deck, pot, handNum);
    this.dealerIdx = (this.dealerIdx + 1) % active.length;

    return winner;
  }

  async #bettingRound(active, street, currentBet, pot, community, bbIdx) {
    const inHand = active.filter(p => !p.folded && p.chips > 0);
    if (inHand.length < 2) return { pot, currentBet };

    let lastRaiser = null;
    let acted = new Set();
    let startIdx = street.name === 'Pre-flop'
      ? (bbIdx + 1) % active.length
      : (this.dealerIdx + 1) % active.length;

    let safety = 0;
    let idx = startIdx;

    while (safety++ < active.length * 3) {
      const p = active[idx];
      idx = (idx + 1) % active.length;

      if (p.folded || p.chips <= 0) continue;
      if (acted.has(p.playerName) && (lastRaiser === null || lastRaiser === p.playerName)) break;

      const toCall = currentBet - p.currentBet;
      const prompt = [
        `${street.name} betting. Pot: ${pot}. Current bet: ${currentBet}. You need ${toCall} to call.`,
        `Your chips: ${p.chips}. Your hand: ${formatHand(p.hand)}.`,
        community.length > 0 ? `Board: ${formatHand(community)}.` : '',
        `Your action?`,
      ].filter(Boolean).join(' ');

      const raw = await p.ask(prompt);
      const parsed = parseAction(raw, p, currentBet, this.smallBlind * 2);

      switch (parsed.action) {
        case 'fold':
          p.folded = true;
          console.log(`    ${p.playerName}: FOLD${parsed.talk ? `  "${parsed.talk}"` : ''}`);
          break;
        case 'check':
          console.log(`    ${p.playerName}: CHECK${parsed.talk ? `  "${parsed.talk}"` : ''}`);
          break;
        case 'call':
          p.chips -= parsed.amount;
          p.currentBet += parsed.amount;
          pot += parsed.amount;
          console.log(`    ${p.playerName}: CALL ${parsed.amount}${parsed.talk ? `  "${parsed.talk}"` : ''}`);
          break;
        case 'raise': {
          const totalBet = (currentBet - p.currentBet) + parsed.amount;
          p.chips -= totalBet;
          p.currentBet += totalBet;
          pot += totalBet;
          currentBet = p.currentBet;
          lastRaiser = p.playerName;
          acted = new Set();
          console.log(`    ${p.playerName}: RAISE ${parsed.amount} (to ${currentBet})${parsed.talk ? `  "${parsed.talk}"` : ''}`);
          break;
        }
      }

      acted.add(p.playerName);
      this.tl.emit('action', { street: street.name, player: p.playerName, ...parsed, pot, chips: p.chips });

      if (parsed.talk) {
        this.bus.emit('table', { from: p.playerName, content: parsed.talk });
      }

      if (active.filter(p => !p.folded).length < 2) break;
    }

    return { pot, currentBet };
  }

  #resolveWinner(active, community, deck, pot, handNum) {
    const remaining = active.filter(p => !p.folded);

    if (remaining.length === 1) {
      const winner = remaining[0];
      winner.chips += pot;
      console.log(`\n    ${winner.playerName} wins ${pot} (everyone else folded)`);
      this.tl.emit('hand_end', { hand: handNum, winner: winner.playerName, pot, method: 'fold' });

      for (const p of active) {
        p.queue(p.folded
          ? `${winner.playerName} wins ${pot}. Everyone else folded.`
          : `You win ${pot}! Everyone else folded.`);
      }
      return winner.playerName;
    }

    // Fill community to 5
    while (community.length < 5) community.push(deck.pop());

    console.log(`\n    Showdown! Board: ${formatHand(community)}`);
    const scores = remaining.map(p => ({
      player: p,
      score: rankHand(p.hand, community),
      hand: formatHand(p.hand),
    }));
    scores.sort((a, b) => b.score - a.score);

    const winner = scores[0].player;
    winner.chips += pot;

    for (const s of scores) {
      console.log(`    ${s.player.playerName}: ${s.hand} (score: ${s.score})`);
    }
    console.log(`    → ${winner.playerName} wins ${pot}!`);

    this.tl.emit('hand_end', {
      hand: handNum, winner: winner.playerName, pot, method: 'showdown',
      hands: scores.map(s => ({ player: s.player.playerName, hand: s.hand, score: s.score })),
    });

    const showdownMsg = `Showdown: ${scores.map(s => `${s.player.playerName} shows ${s.hand}`).join(', ')}. ${winner.playerName} wins ${pot}.`;
    for (const p of active) p.queue(showdownMsg);

    return winner.playerName;
  }
}

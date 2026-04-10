/**
 * AI Poker Night — 5 agents play Texas Hold'em.
 *
 * Usage: node poker.js
 *
 * Demonstrates:
 *   - Private state (hands dealt via queue, only the agent sees them)
 *   - Public vs private channels (table talk vs hidden hands)
 *   - Session state (chip counts, pot, blinds)
 *   - Timeline logging (full game replay)
 *   - ask() for one-shot decisions
 *   - Agent subclassing with personality
 */
import PokerPlayer from './player.js';
import Table from './table.js';
import { setup } from '../runner.js';

// ─── Config ──────────────────────────────────────────────────────────────────

const STARTING_CHIPS = 1000;
const SMALL_BLIND = 10;
const HANDS_TO_PLAY = 5;

// Mixed mode: each player gets a different model
const MIXED_MODELS = {
  Vince: 'opus',           // aggressive bluffer on the smartest model
  Maya: 'sonnet',          // analytical player on the balanced model
  Dutch: 'grok-reason',    // old-school odds player on reasoning model
  Suki: 'haiku',           // chaotic player on the fastest model
  Rex: 'grok-fast',        // conservative player on fast non-reasoning
};

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { bus, tl, session, model, mixed } = await setup({
    name: 'poker',
    defaultModel: 'gpt-4.1-mini',
  });
  const baseOpts = { dataDir: './data', maxTokens: 150, temperature: 0.9, timeline: tl, startingChips: STARTING_CHIPS };

  const playerDefs = [
    ['Vince', 'Aggressive and unpredictable. You raise often and love to bluff. Talk trash.'],
    ['Maya', 'Tight and analytical. You only play strong hands. Quietly confident.'],
    ['Dutch', 'Old school. Reads people, plays the odds. Dry humor and backhanded compliments.'],
    ['Suki', 'Chaotic. You play for fun, not to win. Make wild calls just to see what happens.'],
    ['Rex', 'Conservative but dangerous. You slow-play strong hands. Rarely speak unless you mean it.'],
  ];

  const players = playerDefs.map(([name, style]) => {
    const playerModel = mixed ? MIXED_MODELS[name] : model;
    return new PokerPlayer(name, style, { ...baseOpts, model: playerModel });
  });

  if (mixed) {
    console.log(`  Models: ${playerDefs.map(([n]) => `${n}→${MIXED_MODELS[n]}`).join(', ')}\n`);
  } else {
    console.log(`  Model: ${model}\n`);
  }

  // Table talk: when someone speaks, everyone hears
  bus.on('table', ({ from, content }) => {
    for (const p of players) {
      if (p.playerName !== from && !p.folded) {
        p.queue(`${from}: ${content}`);
      }
    }
  });

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  AI POKER NIGHT — Texas Hold'em`);
  console.log(`  ${players.map(p => p.playerName).join(', ')}`);
  console.log(`  Starting chips: ${STARTING_CHIPS} each`);
  console.log(`${'═'.repeat(60)}\n`);

  tl.emit('game_start', { players: players.map(p => p.playerName), chips: STARTING_CHIPS });

  const table = new Table(players, bus, tl, { smallBlind: SMALL_BLIND });

  for (let hand = 1; hand <= HANDS_TO_PLAY; hand++) {
    const activePlayers = players.filter(p => p.chips > 0);
    if (activePlayers.length < 2) break;

    console.log(`  ── Hand ${hand} ──\n`);
    await table.playHand(hand);

    console.log(`\n    Chips: ${activePlayers.map(p => `${p.playerName}: ${p.chips}`).join(' | ')}`);

    session.set({
      hand,
      chips: Object.fromEntries(players.map(p => [p.playerName, p.chips])),
      eliminated: players.filter(p => p.chips <= 0).map(p => p.playerName),
    });
  }

  // Final standings
  const sorted = [...players].sort((a, b) => b.chips - a.chips);
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  FINAL STANDINGS`);
  for (let i = 0; i < sorted.length; i++) {
    console.log(`  ${i + 1}. ${sorted[i].playerName}: ${sorted[i].chips} chips`);
  }
  console.log(`${'═'.repeat(60)}\n`);

  tl.emit('game_end', { standings: sorted.map(p => ({ name: p.playerName, chips: p.chips })) });
  console.log(`  Timeline: ./data/poker.jsonl`);
  console.log(`  State: ./data/poker-state.json\n`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

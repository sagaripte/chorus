/**
 * Debate Club — 3 agents argue a topic, then vote on the winner.
 *
 * Usage: node debate.js "Should AI be open-sourced?"
 *
 * Demonstrates:
 *   - Multi-agent interaction via Bus
 *   - Agent subclassing with custom onMessage
 *   - Timeline event logging
 *   - Provider-agnostic model selection
 */
import { Agent, Bus, Timeline, loadProviders } from '../../index.js';

// ─── Config ──────────────────────────────────────────────────────────────────

const topic = process.argv[2] || 'Is social media making us smarter or dumber?';
const ROUNDS = 3;
const MODEL = process.env.MODEL || 'gpt-4.1-mini'; // or 'sonnet', 'grok', etc.
const DATA_DIR = './data';

const providers = {};
if (process.env.OPENAI_API_KEY) {
  providers.openai = {
    apiKey: process.env.OPENAI_API_KEY,
    models: { 'gpt-4.1-mini': 'gpt-4.1-mini', 'gpt-4.1': 'gpt-4.1' },
    enabled: ['gpt-4.1-mini', 'gpt-4.1'],
  };
}
if (process.env.ANTHROPIC_API_KEY) {
  providers.anthropic = {
    apiKey: process.env.ANTHROPIC_API_KEY,
    models: { sonnet: 'claude-sonnet-4-6', haiku: 'claude-haiku-4-5' },
    enabled: ['sonnet', 'haiku'],
  };
}
if (process.env.XAI_API_KEY) {
  providers.xai = {
    apiKey: process.env.XAI_API_KEY,
    baseUrl: 'https://api.x.ai/v1',
    models: { grok: 'grok-4.20-0309-non-reasoning' },
    enabled: ['grok'],
  };
}

// ─── Debater Agent ───────────────────────────────────────────────────────────

class Debater extends Agent {
  constructor(name, position, bus, opts) {
    const system = [
      `You are ${name}, a sharp debater.`,
      `Your position: ${position}`,
      `Rules:`,
      `- Keep each argument to 2-3 sentences max.`,
      `- Be persuasive but respectful.`,
      `- Respond to the other debaters' points when you can.`,
      `- When asked to vote, respond with only: VOTE: [name]`,
    ].join('\n');

    super(name, system, opts);
    this.agentName = name;
    this.bus = bus;
  }

  async onMessage(msg) {
    if (msg.startsWith('argue:') || msg.startsWith('vote:')) {
      this.queue(msg);
      const response = await this.send();
      this.bus.emit('speech', { from: this.agentName, content: response });
      return response;
    }
    // Accumulate context (other agents' speeches)
    this.queue(msg);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  await loadProviders(providers);

  const bus = new Bus();
  const timeline = new Timeline(`${DATA_DIR}/debate.jsonl`);
  const opts = { model: MODEL, dataDir: DATA_DIR, maxTokens: 300, temperature: 0.8 };

  // Create 3 debaters with different positions
  const debaters = [
    new Debater('Alex', `Argue FOR: "${topic}"`, bus, opts),
    new Debater('Sam', `Argue AGAINST: "${topic}"`, bus, opts),
    new Debater('Jordan', `Play devil's advocate on: "${topic}" — challenge both sides`, bus, opts),
  ];

  // Wire bus: when someone speaks, everyone else hears it
  bus.on('speech', (msg) => {
    timeline.emit('speech', msg);
    for (const d of debaters) {
      if (d.agentName !== msg.from) {
        d.onMessage(`${msg.from} said: ${msg.content}`);
      }
    }
  });

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  DEBATE: ${topic}`);
  console.log(`${'═'.repeat(60)}\n`);

  timeline.emit('debate_start', { topic, debaters: debaters.map(d => d.agentName) });

  // ─── Debate rounds ───
  for (let round = 1; round <= ROUNDS; round++) {
    console.log(`  ── Round ${round} ──\n`);
    timeline.emit('round_start', { round });

    for (const d of debaters) {
      const prompt = round === 1
        ? `argue: Make your opening case on "${topic}"`
        : `argue: Respond to the other debaters and strengthen your position.`;

      const response = await d.onMessage(prompt);
      console.log(`  ${d.agentName}: ${response}\n`);
    }
  }

  // ─── Voting ───
  console.log(`  ── Voting ──\n`);
  timeline.emit('vote_start', {});

  const votes = {};
  for (const d of debaters) {
    const response = await d.onMessage(
      `vote: The debate is over. Vote for who made the strongest argument (not yourself). Reply with only: VOTE: [name]`
    );
    const match = response.match(/VOTE:\s*(\w+)/i);
    const votedFor = match ? match[1] : '(invalid)';
    votes[d.agentName] = votedFor;
    timeline.emit('vote', { from: d.agentName, votedFor });
    console.log(`  ${d.agentName} votes for: ${votedFor}`);
  }

  // ─── Results ───
  const tally = {};
  Object.values(votes).forEach(v => tally[v] = (tally[v] || 0) + 1);
  const winner = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  WINNER: ${winner ? winner[0] : 'Tie'} (${winner ? winner[1] : 0} votes)`);
  console.log(`${'═'.repeat(60)}\n`);

  timeline.emit('debate_end', { votes, tally, winner: winner?.[0] });

  console.log(`  Timeline saved to ${DATA_DIR}/debate.jsonl`);
  console.log(`  Agent histories in ${DATA_DIR}/*.jsonl\n`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

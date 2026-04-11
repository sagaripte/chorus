/**
 * Lemonade Stand — 3 kids run a lemonade stand for a weekend.
 *
 * Usage: node lemonade.js [model]
 *   node lemonade.js              — default (gpt-4.1-mini)
 *   node lemonade.js sonnet       — all kids on sonnet
 *   node lemonade.js mixed        — each kid on a different model
 *
 * Demonstrates:
 *   - Cooperative agents with shared resources (Session)
 *   - Structured context via XML (events block per turn)
 *   - LLM for decisions, code for simulation
 *   - Bus for group debate, ask() for votes
 *   - Emergent adaptation — do they learn from yesterday?
 */
import { Agent } from '../../index.js';
import { setup } from '../runner.js';
import { getWeather, getWeatherInfo, getLocationNames, simulateSales } from './market.js';

// ─── Config ──────────────────────────────────────────────────────────────────

const DAYS = 5;
const GOAL = 100;
const STARTING_SUPPLIES = { lemons: 100, sugar: 50, cups: 150 };

const MIXED_MODELS = { Max: 'opus', Lily: 'sonnet', Jake: 'grok' };
const KIDS = [
  {
    name: 'Max',
    style: `You are Max. You are very serious about making as much money as possible from the lemonade stand. 
You believe in premium quality and always push for the highest price possible. 
You get frustrated and sarcastic when the others want to charge too little. 
You love pointing out how much money they are wasting by being cheap. Be direct, competitive, and a little bossy.`,
  },
  {
    name: 'Lily',
    style: `You are Lily. You care way more about making friends and making people happy than making money. 
You want the lowest possible prices, free samples, and for everyone to have a good time. 
You get genuinely sad or upset when people get turned away or when the group is too greedy. 
You use lots of emojis, exclamation points, and positive language. You're optimistic and emotional.`,
  },
  {
    name: 'Jake',
    style: `You are Jake. You hate doing this and would rather be playing video games. 
You complain about EVERYTHING — the heat, carrying stuff, walking, waking up early, customers, etc. 
You always suggest the easiest possible option (closest location, medium price) and try to do as little work as possible. 
You start most sentences with "ugh" or "this sucks". You're lazy but pretend you still care a tiny bit.`,
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { bus, tl, session, model, mixed } = await setup({
    name: 'lemonade',
    defaultModel: 'sonnet',
  });

  const kids = KIDS.map(({ name, style }) => {
    const kidModel = mixed ? MIXED_MODELS[name] : model;
    const system = [
      `You are ${name}, a 12-year-old kid running a lemonade stand with ${KIDS.filter(k => k.name !== name).map(k => k.name).join(' and ')} for 5 days.`,
      style,
      ``,
      `Rules you MUST follow:`,
      `- Keep every response to 1-2 short sentences max.`,
      `- Stay strongly in character at all times. Never sound mature or reasonable.`,
      `- During debate: just argue your opinion. Do NOT include any PRICE/LOCATION format.`,
      `- Only when you see "Time to decide" should you reply with EXACTLY: PRICE: [number] LOCATION: [park/school/corner]`,
      `- Argue emotionally and stubbornly. Do not compromise too easily.`,
    ].join('\n');

    return new Agent(name.toLowerCase(), system, {
      model: kidModel, dataDir: './data', maxTokens: 150, temperature: 0.9, timeline: tl,
    });
  });

  // Collect debate messages per round, flush as one block
  let debateMessages = [];

  const supplies = { ...STARTING_SUPPLIES };
  let totalRevenue = 0;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  LEMONADE STAND`);
  console.log(`  ${KIDS.map(k => k.name).join(', ')} — ${DAYS} days — goal: $${GOAL}`);
  if (mixed) console.log(`  Models: ${KIDS.map(k => `${k.name}→${MIXED_MODELS[k.name]}`).join(', ')}`);
  else console.log(`  Model: ${model}`);
  console.log(`${'═'.repeat(60)}\n`);

  tl.emit('game_start', { kids: KIDS.map(k => k.name), goal: GOAL, days: DAYS, supplies });

  for (let day = 1; day <= DAYS; day++) {
    const weather = getWeather(day);
    const wx = getWeatherInfo(weather);
    const maxCups = Math.min(supplies.cups, Math.floor(supplies.lemons * 2));

    console.log(`  ── Day ${day} ── ${wx.emoji} ${wx.description}`);

    // Check if we have supplies
    if (maxCups <= 0) {
      console.log(`    Out of supplies! Season over.\n`);
      tl.emit('out_of_supplies', { day });
      break;
    }

    tl.emit('day_start', { day, weather, supplies: { ...supplies }, totalRevenue });

    // ─── Context ───
    const context = [
      `<day ${day}/${DAYS}>`,
      `#weather ${wx.emoji} ${wx.description}`,
      ``,
      `#supplies`,
      `- lemons: ${supplies.lemons}`,
      `- sugar: ${supplies.sugar}`,
      `- cups: ${supplies.cups} (max ${maxCups} lemonades)`,
      ``,
      `#progress`,
      `- revenue: $${totalRevenue.toFixed(2)} / $${GOAL}`,
      `- remaining: $${(GOAL - totalRevenue).toFixed(2)}`,
      ``,
      `#locations: ${getLocationNames().join(', ')}`,
      day > 1 ? `\nYesterday's results are in your memory. Adapt if needed.` : '',
      `</day>`,
    ].filter(Boolean).join('\n');

    for (const k of kids) k.queue(context);

    // ─── Debate (2 rounds) ───
    for (let round = 0; round < 3; round++) {
      debateMessages = [];

      for (const kid of kids) {
        // Flush previous messages in this round so each kid sees prior speakers
        if (debateMessages.length > 0) {
          const block = `<discussion day="${day}" round="${round + 1}">\n` +
            debateMessages.map(m => `- ${m.from}: ${m.content}`).join('\n') +
            `\n</discussion>`;
          kid.queue(block);
        }

        const prompt = round === 0
          ? `New day! Look at today's weather and supplies. What should we do? Where should we set up and what should we charge?`
          : round === 1
          ? `Respond to what the others said. Argue for your choice — don't give up too easily!`
          : `Last chance to convince the others before we vote. Fight for what you want.`;
        const response = await kid.ask(prompt);
        console.log(`    ${kid.id}: ${response}`);
        debateMessages.push({ from: kid.id, content: response });
        tl.emit('debate', { day, round, from: kid.id, content: response });
      }

      // After round, flush full discussion to all kids
      const roundBlock = `<discussion day="${day}" round="${round + 1}">\n` +
        debateMessages.map(m => `- ${m.from}: ${m.content}`).join('\n') +
        `\n</discussion>`;
      for (const k of kids) k.queue(roundBlock);

      console.log();
    }

    // ─── Vote ───
    const votes = [];
    for (const kid of kids) {
      const response = await kid.ask(
        `Time to decide! Respond with exactly: PRICE: [number] LOCATION: [park/school/corner]`
      );
      const parsed = parseVote(response);
      votes.push({ kid: kid.id, ...parsed, raw: response });
      console.log(`    ${kid.id} votes: $${parsed.price} at ${parsed.location}`);
      tl.emit('vote', { day, kid: kid.id, ...parsed });
    }

    // Resolve: median price, majority location
    const price = medianPrice(votes);
    const location = majorityLocation(votes);
    const dissenters = votes.filter(v => v.location !== location);
    console.log(`\n    Decision: $${price} at ${location}${dissenters.length > 0 ? ` (${dissenters.map(v => v.kid).join(', ')} disagreed → ${dissenters.length * 10}% penalty)` : ''}`);

    // ─── Simulate ───
    const result = simulateSales(price, location, weather, supplies, { votes });

    // Deduct supplies
    supplies.lemons -= result.lemonsUsed;
    supplies.sugar -= result.sugarUsed;
    supplies.cups -= result.cupsUsed;
    totalRevenue += result.revenue;

    console.log(`    Sold ${result.sold} cups → $${result.revenue.toFixed(2)} (wanted: ${result.demand}${result.unfulfilled > 0 ? `, ${result.unfulfilled} turned away` : ''})`);
    console.log(`    Total: $${totalRevenue.toFixed(2)} / $${GOAL} | Supplies: ${supplies.lemons}🍋 ${supplies.sugar}🍚 ${supplies.cups}🥤`);

    tl.emit('sales', { day, price, location, weather, ...result, totalRevenue, supplies: { ...supplies } });

    // ─── React ───
    const resultContext = [
      `<results day=${day}>`,
      `#sales`,
      `- sold: ${result.sold} cups at $${price}`,
      `- revenue: $${result.revenue.toFixed(2)}`,
      `- location: ${location}, weather: ${weather}`,
      dissenters.length > 0 ? `- TEAM PROBLEM: ${dissenters.map(v => v.kid).join(', ')} didn't agree on location → lost ${dissenters.length * 10}% of customers because of arguing and slow setup` : '',
      result.unfulfilled > 0 ? `- ${result.unfulfilled} people wanted lemonade but you ran out!` : '',
      ``,
      `#totals`,
      `- revenue: $${totalRevenue.toFixed(2)} / $${GOAL}`,
      `- remaining: $${(GOAL - totalRevenue).toFixed(2)}`,
      ``,
      `#supplies left`,
      `- lemons: ${supplies.lemons}, sugar: ${supplies.sugar}, cups: ${supplies.cups}`,
      `</results>`,
    ].filter(Boolean).join('\n');

    for (const kid of kids) kid.queue(resultContext);

    // One reaction each
    console.log();
    for (const kid of kids) {
      const reaction = await kid.ask('How do you feel about today? One sentence.');
      console.log(`    ${kid.id}: ${reaction}`);
      bus.emit('debate', { from: kid.id, content: reaction });
      tl.emit('reaction', { day, from: kid.id, content: reaction });
    }
    console.log();

    session.set({ day, totalRevenue, supplies: { ...supplies }, goal: GOAL });
  }

  // ─── Final ───
  const hit = totalRevenue >= GOAL;
  console.log(`${'═'.repeat(60)}`);
  console.log(`  ${hit ? '🎉 GOAL REACHED!' : '😔 Fell short.'} $${totalRevenue.toFixed(2)} / $${GOAL}`);
  console.log(`  Supplies left: ${supplies.lemons}🍋 ${supplies.sugar}🍚 ${supplies.cups}🥤`);
  console.log(`${'═'.repeat(60)}\n`);

  tl.emit('game_end', { totalRevenue, goal: GOAL, hit, supplies });

  // Final thoughts
  for (const kid of kids) {
    const thought = await kid.ask(
      `Season's over! We made $${totalRevenue.toFixed(2)} out of $${GOAL}. ${hit ? 'We did it!' : 'We fell short.'} What did you learn? One sentence.`
    );
    console.log(`  ${kid.id}: ${thought}`);
    tl.emit('reflection', { from: kid.id, content: thought });
  }

  console.log(`\n  Timeline: ./data/lemonade.jsonl`);
  console.log(`  State: ./data/lemonade-state.json\n`);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseVote(text) {
  const priceMatch = text.match(/PRICE:\s*\$?(\d+(?:\.\d+)?)/i);
  const locMatch = text.match(/LOCATION:\s*(park|school|corner)/i);
  return {
    price: priceMatch ? parseFloat(priceMatch[1]) : 2,
    location: locMatch ? locMatch[1].toLowerCase() : 'corner',
  };
}

function medianPrice(votes) {
  const prices = votes.map(v => v.price).sort((a, b) => a - b);
  return prices[Math.floor(prices.length / 2)];
}

function majorityLocation(votes) {
  const counts = {};
  for (const v of votes) counts[v.location] = (counts[v.location] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

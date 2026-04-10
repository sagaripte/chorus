/**
 * 12 Angry Men — 12 AI jurors deliberate a murder verdict.
 *
 * Usage: node jury.js [model]
 *   node jury.js              — default (gpt-4.1-mini)
 *   node jury.js sonnet       — all jurors on sonnet
 *   node jury.js mixed        — each juror on a different model
 *
 * Demonstrates:
 *   - Large-group deliberation (12 agents)
 *   - Opinion tracking across rounds (Session)
 *   - Natural convergence / hung jury mechanics
 *   - Bus for public debate, ask() for secret ballots
 *   - Timeline for full transcript export
 */
import { Agent } from '../../index.js';
import { setup } from '../runner.js';

// ─── Config ──────────────────────────────────────────────────────────────────

const MAX_ROUNDS = 12;

// ─── The Case ────────────────────────────────────────────────────────────────

const CASE = [
  `A 19-year-old is accused of stabbing his father to death.`,
  `The prosecution presented two key witnesses:`,
  `  1. An elderly man in the apartment below claims he heard the defendant yell "I'm going to kill you" and heard a body hit the floor. He says he ran to the door and saw the defendant fleeing 15 seconds later.`,
  `  2. A woman across the street says she saw the stabbing through the windows of a passing elevated train.`,
  `Additional evidence:`,
  `  - The murder weapon is a switchblade knife. The defendant bought an identical knife that night but claims he lost it.`,
  `  - The defendant claims he was at the movies during the murder but cannot remember the films he saw.`,
  `  - The defendant has a history of violence and a troubled relationship with his father.`,
  `The defense argues the evidence is circumstantial. A guilty verdict means the death penalty.`,
].join('\n');

// ─── Juror Definitions ──────────────────────────────────────────────────────

const JURORS = [
  { num: 1,  name: 'The Foreman',       style: 'Organized and procedural. You run the deliberation fairly. You try to keep things on track.' },
  { num: 2,  name: 'The Quiet One',      style: 'Meek and soft-spoken. You avoid conflict but think carefully. When you do speak, it matters.' },
  { num: 3,  name: 'The Hardliner',      style: 'Loud and aggressive. You are certain the boy is guilty. This is personal — your own son walked out on you.' },
  { num: 4,  name: 'The Analyst',        style: 'Logical and composed. You rely on facts, not emotions. You rarely sweat — figuratively or literally.' },
  { num: 5,  name: 'The Kid from the Block', style: 'You grew up in the slums like the defendant. You know what that life is like. You resent assumptions about people from rough neighborhoods.' },
  { num: 6,  name: 'The Worker',         style: 'Blue-collar, honest, straightforward. You respect your elders and don\'t tolerate disrespect. You think carefully before speaking.' },
  { num: 7,  name: 'The Impatient One',  style: 'You want this over with. You have baseball tickets. You\'ll go with the majority just to get out of here.' },
  { num: 8,  name: 'The Holdout',        style: 'Calm, empathetic, and principled. You don\'t know if the boy is innocent, but you believe reasonable doubt deserves discussion. You ask probing questions.' },
  { num: 9,  name: 'The Elder',          style: 'Old, observant, and wise. You notice what others miss. You understand what it\'s like to be ignored and overlooked.' },
  { num: 10, name: 'The Bigot',          style: 'Prejudiced and vocal about it. You distrust "those people" from the slums. Your arguments are rooted in bias, not evidence.' },
  { num: 11, name: 'The Immigrant',      style: 'A watchmaker from Europe. You revere the justice system — you came from a place that didn\'t have one. You take this responsibility seriously.' },
  { num: 12, name: 'The Ad Man',         style: 'Slick, superficial, easily swayed. You talk in marketing metaphors. You flip-flop based on whoever spoke last.' },
];

// Mixed mode: spread across models
const MIXED_MODELS = {
  1: 'sonnet', 2: 'flash-3', 3: 'grok', 4: 'grok-reason',
  5: 'haiku', 6: 'flash-2', 7: 'flash-3', 8: 'opus',
  9: 'grok', 10: 'sonnet', 11: 'opus', 12: 'flash-2',
};

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { bus, tl, session, model, mixed } = await setup({
    name: 'jury',
    defaultModel: 'sonnet',
  });

  const jurors = JURORS.map(({ num, name, style }) => {
    const jurorModel = mixed ? MIXED_MODELS[num] : model;
    const system = [
      `You are Juror #${num} — "${name}".`,
      `${style}`,
      ``,
      `You are deliberating a murder trial with 11 other jurors.`,
      `The case: ${CASE}`,
      ``,
      `Rules:`,
      `- There are ${MAX_ROUNDS} rounds of deliberation. If no unanimous verdict, it's a hung jury and the case goes to retrial.`,
      `- Make substantive arguments of 3-5 sentences. Reference specific evidence from the case.`,
      `- Respond to other jurors' points — agree, challenge, or build on them.`,
      `- When asked to VOTE, respond with ONLY the word GUILTY or the words NOT GUILTY. Nothing else.`,
      `- You may change your vote between rounds if persuaded.`,
      `- A guilty verdict means the death penalty. Take this seriously.`,
    ].join('\n');

    const agent = new Agent(`juror-${num}`, system, {
      model: jurorModel, dataDir: './data', maxTokens: 400, temperature: 0.9, timeline: tl,
    });
    agent.jurorNum = num;
    agent.jurorName = name;
    return agent;
  });

  // Collect arguments per round (queued as structured <turn> blocks after each round)
  let roundArguments = [];
  bus.on('deliberation', ({ from, content }) => {
    roundArguments.push({ from, content });
  });

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  12 ANGRY MEN — JURY DELIBERATION`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`\n  The case: ${CASE.split('\n')[0]}`);
  if (mixed) {
    console.log(`  Models: ${JURORS.map(j => `#${j.num}→${MIXED_MODELS[j.num]}`).join(', ')}`);
  } else {
    console.log(`  Model: ${model}`);
  }
  console.log();

  tl.emit('trial_start', { case: CASE, jurors: JURORS.map(j => ({ num: j.num, name: j.name })) });

  // ─── Initial vote ───
  console.log(`  ── Initial Vote (secret ballot) ──\n`);
  let votes = await secretBallot(jurors, tl, 0);
  printVotes(votes);
  session.set({ round: 0, votes: formatVotes(votes) });

  if (isUnanimous(votes)) {
    announceVerdict(votes, 0, tl);
    return;
  }

  // Queue initial vote as turn 0
  queueTurnToJurors(jurors, 0, votes, []);

  // ─── Deliberation rounds ───
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    console.log(`\n  ── Round ${round} ──\n`);
    tl.emit('round_start', { round, votes: formatVotes(votes) });

    // Pick 3-4 jurors to speak each round (rotate + always include dissenters)
    const speakers = pickSpeakers(jurors, votes, round);
    roundArguments = [];

    for (const juror of speakers) {
      const guiltyCount = votes.filter(v => v.vote === 'GUILTY').length;
      const notGuiltyCount = votes.filter(v => v.vote === 'NOT GUILTY').length;

      const jurorVote = votes.find(v => v.num === juror.jurorNum)?.vote;
      const roundInfo = `Round ${round} of ${MAX_ROUNDS}.`;
      const prompt = round === 1 && juror.jurorNum === 8 && jurorVote === 'NOT GUILTY'
        ? `${roundInfo} The vote is ${guiltyCount}-${notGuiltyCount} guilty to not guilty. You voted not guilty. Make a substantive argument (at least 3 sentences) for why this case has reasonable doubt. Reference specific evidence from the case.`
        : `${roundInfo} The current vote is ${guiltyCount}-${notGuiltyCount} guilty to not guilty. You voted ${jurorVote}. Make your argument in at least 3 sentences — reference specific evidence from the case or challenge what other jurors have said.`;

      const response = await juror.ask(prompt);
      console.log(`    Juror #${juror.jurorNum} (${juror.jurorName}): ${response}\n`);
      bus.emit('deliberation', { from: juror.jurorNum, content: response });
      tl.emit('argument', { juror: juror.jurorNum, name: juror.jurorName, content: response });
    }

    // Vote
    console.log(`  ── Vote (round ${round}) ──\n`);
    votes = await secretBallot(jurors, tl, round);
    printVotes(votes);
    session.set({ round, votes: formatVotes(votes) });

    // Queue structured turn block to all jurors
    queueTurnToJurors(jurors, round, votes, roundArguments);

    if (isUnanimous(votes)) {
      announceVerdict(votes, round, tl);
      return;
    }
  }

  // Hung jury
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  HUNG JURY — no unanimous verdict after ${MAX_ROUNDS} rounds`);
  const guiltyCount = votes.filter(v => v.vote === 'GUILTY').length;
  const notGuiltyCount = votes.filter(v => v.vote === 'NOT GUILTY').length;
  console.log(`  Final vote: ${guiltyCount}-${notGuiltyCount} (guilty-not guilty)`);
  console.log(`${'═'.repeat(60)}\n`);
  tl.emit('hung_jury', { round: MAX_ROUNDS, votes: formatVotes(votes) });

  console.log(`  Timeline: ./data/jury.jsonl`);
  console.log(`  State: ./data/jury-state.json\n`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function secretBallot(jurors, tl, round) {
  const votes = [];
  for (const juror of jurors) {
    const response = await juror.ask(
      `SECRET BALLOT. One word only. No explanation. Reply: GUILTY or NOT GUILTY`,
      { maxTokens: 30 }
    );
    const vote = (response || '').toUpperCase().includes('NOT GUILTY') ? 'NOT GUILTY' : 'GUILTY';
    votes.push({ num: juror.jurorNum, name: juror.jurorName, vote });
    tl.emit('vote', { round, juror: juror.jurorNum, vote });
  }
  return votes;
}

function isUnanimous(votes) {
  return votes.every(v => v.vote === votes[0].vote);
}

function formatVotes(votes) {
  return Object.fromEntries(votes.map(v => [v.num, v.vote]));
}

function printVotes(votes) {
  const guilty = votes.filter(v => v.vote === 'GUILTY');
  const notGuilty = votes.filter(v => v.vote === 'NOT GUILTY');
  console.log(`    GUILTY (${guilty.length}): ${guilty.map(v => `#${v.num}`).join(', ') || '—'}`);
  console.log(`    NOT GUILTY (${notGuilty.length}): ${notGuilty.map(v => `#${v.num}`).join(', ') || '—'}`);
}

function queueTurnToJurors(jurors, round, votes, arguments_) {
  const guilty = votes.filter(v => v.vote === 'GUILTY');
  const notGuilty = votes.filter(v => v.vote === 'NOT GUILTY');

  const lines = [
    `## Round ${round}`,
    ``,
    `**Vote:** ${guilty.length}-${notGuilty.length} (guilty-not guilty)`,
    `- GUILTY: ${guilty.map(v => `#${v.num}`).join(', ') || 'none'}`,
    `- NOT GUILTY: ${notGuilty.map(v => `#${v.num}`).join(', ') || 'none'}`,
  ];

  if (arguments_.length > 0) {
    lines.push(``, `### Round ${round} Arguments`);
    for (const a of arguments_) {
      lines.push(``, `**Juror #${a.from}:** ${a.content}`);
    }
  }

  lines.push(``, `---`);

  for (const j of jurors) j.queue(lines.join('\n'));
}

function announceVerdict(votes, round, tl) {
  const verdict = votes[0].vote;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  VERDICT: ${verdict}`);
  console.log(`  Reached unanimously in ${round === 0 ? 'initial vote' : `round ${round}`}`);
  console.log(`${'═'.repeat(60)}\n`);
  tl.emit('verdict', { verdict, round, votes: formatVotes(votes) });
}

/**
 * Pick speakers for a round. Dissenters always speak,
 * majority rotates with stride 3 so everyone gets a turn.
 * Tracks who has spoken least and prioritizes them.
 */
const speakCounts = new Map();

function pickSpeakers(jurors, votes, round) {
  const guiltyCount = votes.filter(v => v.vote === 'GUILTY').length;
  const minority = guiltyCount <= 6 ? 'GUILTY' : 'NOT GUILTY';
  const dissenters = jurors.filter(j => votes.find(v => v.num === j.jurorNum)?.vote === minority);
  const others = jurors.filter(j => !dissenters.includes(j));

  // Sort majority by who has spoken least, then by rotation
  const sorted = [...others].sort((a, b) => {
    const ca = speakCounts.get(a.jurorNum) || 0;
    const cb = speakCounts.get(b.jurorNum) || 0;
    if (ca !== cb) return ca - cb;  // least spoken first
    return a.jurorNum - b.jurorNum;
  });
  const majorityPicks = sorted.slice(0, 3);

  // Dissenters always speak (up to 3), plus 3 from majority
  const speakers = [...new Set([...dissenters.slice(0, 3), ...majorityPicks])];

  // Track speak counts
  for (const s of speakers) {
    speakCounts.set(s.jurorNum, (speakCounts.get(s.jurorNum) || 0) + 1);
  }

  // Sort by juror number for consistent ordering
  return speakers.sort((a, b) => a.jurorNum - b.jurorNum);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

/**
 * Export jury deliberation timeline to readable markdown.
 *
 * Usage: node export.js [data/jury.jsonl]
 */
import { readFileSync, writeFileSync } from 'fs';

const input = process.argv[2] || './data/jury.jsonl';
const output = input.replace('.jsonl', '.md');

let events = readFileSync(input, 'utf8')
  .trim().split('\n').filter(Boolean)
  .map(line => { try { return JSON.parse(line); } catch { return null; } })
  .filter(Boolean);

// If there are multiple trial_start events (from reruns), keep only the last
const lastStart = events.findLastIndex(e => e.type === 'trial_start');
if (lastStart > 0) events = events.slice(lastStart);

const lines = [];
const push = (s = '') => lines.push(s);

// Track vote history for the summary table
const voteHistory = [];

for (const e of events) {
  switch (e.type) {
    case 'trial_start': {
      push(`# 12 Angry Men — AI Jury Deliberation`);
      push();
      push(`> *A 19-year-old is accused of stabbing his father to death. Two eyewitnesses, a matching switchblade, and a shaky alibi. A guilty verdict means the death penalty.*`);
      push();
      push(`**Jurors:**`);
      push();
      push(`| # | Name | Role |`);
      push(`|---|------|------|`);
      for (const j of e.jurors) {
        push(`| ${j.num} | **${j.name}** | Juror #${j.num} |`);
      }
      push();
      push('---');
      push();
      break;
    }

    case 'vote': {
      // Collected per-round, emitted in round_start or at end
      break;
    }

    case 'round_start': {
      const votes = e.votes;
      const guilty = Object.entries(votes).filter(([, v]) => v === 'GUILTY').map(([k]) => `#${k}`);
      const notGuilty = Object.entries(votes).filter(([, v]) => v === 'NOT GUILTY').map(([k]) => `#${k}`);

      voteHistory.push({ round: e.round, guilty: guilty.length, notGuilty: notGuilty.length });

      if (e.round === 1) {
        // Initial vote happened before round 1
        push(`## Initial Vote`);
        push();
        push(`| | Count | Jurors |`);
        push(`|---|---|---|`);
        push(`| **GUILTY** | ${guilty.length} | ${guilty.join(', ')} |`);
        push(`| **NOT GUILTY** | ${notGuilty.length} | ${notGuilty.join(', ')} |`);
        push();
        push('---');
        push();
      }

      push(`## Round ${e.round}`);
      push();

      if (e.round > 1) {
        push(`*Vote entering this round: ${guilty.length}-${notGuilty.length} (guilty-not guilty)*`);
        push();
      }

      break;
    }

    case 'argument': {
      push(`**Juror #${e.juror} (${e.name}):**`);
      push();
      // Indent the content as a blockquote for readability
      const argLines = e.content.split('\n').map(l => `> ${l}`);
      push(argLines.join('\n'));
      push();
      break;
    }

    case 'hung_jury': {
      const votes = e.votes;
      const guilty = Object.entries(votes).filter(([, v]) => v === 'GUILTY').map(([k]) => `#${k}`);
      const notGuilty = Object.entries(votes).filter(([, v]) => v === 'NOT GUILTY').map(([k]) => `#${k}`);

      voteHistory.push({ round: 'Final', guilty: guilty.length, notGuilty: notGuilty.length });

      push('---');
      push();
      push(`## Hung Jury`);
      push();
      push(`**No unanimous verdict after ${e.round} rounds.**`);
      push();
      push(`| | Count | Jurors |`);
      push(`|---|---|---|`);
      push(`| **GUILTY** | ${guilty.length} | ${guilty.join(', ')} |`);
      push(`| **NOT GUILTY** | ${notGuilty.length} | ${notGuilty.join(', ')} |`);
      push();
      break;
    }

    case 'verdict': {
      const votes = e.votes;
      const guilty = Object.entries(votes).filter(([, v]) => v === 'GUILTY').map(([k]) => `#${k}`);
      const notGuilty = Object.entries(votes).filter(([, v]) => v === 'NOT GUILTY').map(([k]) => `#${k}`);

      voteHistory.push({ round: 'Final', guilty: guilty.length, notGuilty: notGuilty.length });

      push('---');
      push();
      push(`## Verdict: ${e.verdict}`);
      push();
      push(`**Unanimous verdict reached in round ${e.round}.**`);
      push();
      break;
    }
  }
}

// Append vote progression table
if (voteHistory.length > 1) {
  push('---');
  push();
  push(`## Vote Progression`);
  push();
  push(`| Round | Guilty | Not Guilty |`);
  push(`|-------|--------|------------|`);
  for (const v of voteHistory) {
    const bar = g => '█'.repeat(g);
    push(`| ${v.round} | ${v.guilty} ${bar(v.guilty)} | ${v.notGuilty} ${bar(v.notGuilty)} |`);
  }
  push();
}

push('---');
push();
push(`*Generated from timeline by [Chorus](https://github.com/sagaripte/chorus) — the multi-agent LLM framework.*`);

writeFileSync(output, lines.join('\n'));
console.log(`Exported to ${output}`);

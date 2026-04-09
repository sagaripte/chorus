/**
 * Export poker timeline to readable markdown.
 *
 * Usage: node export.js [data/poker.jsonl]
 */
import { readFileSync, writeFileSync } from 'fs';

const input = process.argv[2] || './data/poker.jsonl';
const output = input.replace('.jsonl', '.md');

let events = readFileSync(input, 'utf8')
  .trim().split('\n').filter(Boolean)
  .map(line => { try { return JSON.parse(line); } catch { return null; } })
  .filter(Boolean);

// If there are multiple game_start events (from reruns), keep only the last game
const lastGameStart = events.findLastIndex(e => e.type === 'game_start');
if (lastGameStart > 0) events = events.slice(lastGameStart);

const lines = [];
const push = (s = '') => lines.push(s);

for (const e of events) {
  switch (e.type) {
    case 'game_start':
      push(`# AI Poker Night — Game Transcript`);
      push();
      push(`**Players:** ${e.players.join(', ')}`);
      push(`**Starting chips:** ${e.chips} each`);
      push();
      push('---');
      push();
      break;

    case 'hand_start':
      push(`## Hand ${e.hand}`);
      push();
      push(`Pot: ${e.pot} | Blinds: ${e.blinds.sb} (SB), ${e.blinds.bb} (BB)`);
      push();
      break;

    case 'street':
      push(`### ${e.name}`);
      push();
      push(`**Board:** ${e.community} | **Pot:** ${e.pot}`);
      push();
      break;

    case 'action': {
      const chip = e.chips !== undefined ? ` *(${e.chips} remaining)*` : '';
      let line = '';
      switch (e.action) {
        case 'fold':
          line = `**${e.player}:** FOLD`;
          break;
        case 'check':
          line = `**${e.player}:** CHECK`;
          break;
        case 'call':
          line = `**${e.player}:** CALL ${e.amount}${chip}`;
          break;
        case 'raise':
          line = `**${e.player}:** RAISE ${e.amount}${chip}`;
          break;
      }
      if (e.talk) line += `\n> *"${e.talk}"*`;
      push(line);
      push();
      break;
    }

    case 'hand_end':
      push('---');
      push();
      if (e.method === 'fold') {
        push(`**${e.winner}** wins **${e.pot}** — everyone else folded.`);
      } else {
        push(`**Showdown:**`);
        push();
        for (const h of e.hands || []) {
          const marker = h.player === e.winner ? ' 👑' : '';
          push(`- **${h.player}:** ${h.hand} *(score: ${h.score})*${marker}`);
        }
        push();
        push(`**${e.winner}** wins **${e.pot}**.`);
      }
      push();
      push('---');
      push();
      break;

    case 'game_end':
      push(`## Final Standings`);
      push();
      push('| # | Player | Chips |');
      push('|---|--------|-------|');
      e.standings.forEach((s, i) => {
        push(`| ${i + 1} | **${s.name}** | ${s.chips} |`);
      });
      push();
      break;
  }
}

writeFileSync(output, lines.join('\n'));
console.log(`Exported to ${output}`);

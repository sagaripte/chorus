/**
 * Simulation utilities — shared patterns for multi-agent examples.
 *
 * Not a framework primitive — just helpers that reduce boilerplate
 * across examples that share common patterns (agent creation,
 * mixed model resolution, vote parsing, console banners).
 *
 * Usage:
 *   import { createAgents, resolveVotes, banner } from '../sim.js';
 *
 *   const agents = createAgents(PLAYERS, {
 *     mixed, model, mixedModels: MIXED_MODELS,
 *     dataDir: './data', maxTokens: 200, temperature: 0.9, timeline: tl,
 *     system: (name, style) => `You are ${name}. ${style}\n\nRules:...`,
 *   });
 *
 *   const result = resolveVotes(votes, {
 *     price: 'median',     // median of numeric values
 *     location: 'majority', // most common value
 *   });
 */
import { Agent } from '../index.js';

/**
 * Create agents from an array of definitions.
 * Handles mixed model resolution and system prompt generation.
 *
 * @param {Array} defs — [{ name, style, ... }, ...]
 * @param {object} opts
 * @param {boolean} opts.mixed — use mixed models?
 * @param {string} opts.model — default model alias
 * @param {object} opts.mixedModels — { name: modelAlias }
 * @param {Function} opts.system — (name, style, def) => system prompt string
 * @param {string} [opts.dataDir] — data directory
 * @param {number} [opts.maxTokens]
 * @param {number} [opts.temperature]
 * @param {Timeline} [opts.timeline]
 * @returns {Agent[]} — agents with .playerName set
 */
export function createAgents(defs, opts) {
  const { mixed, model, mixedModels = {}, system, dataDir = './data', timeline, ...agentOpts } = opts;

  return defs.map((def) => {
    const { name, style } = def;
    const agentModel = mixed ? mixedModels[name] : model;
    const systemPrompt = system(name, style, def);

    const agent = new Agent(name.toLowerCase(), systemPrompt, {
      model: agentModel, dataDir, timeline, ...agentOpts,
    });
    agent.playerName = name;
    return agent;
  });
}

/**
 * Parse a structured response from an LLM using named regex patterns.
 *
 * @param {string} text — raw LLM response
 * @param {object} patterns — { fieldName: { regex, default, type } }
 * @returns {object} — parsed fields
 *
 * Example:
 *   parseResponse(text, {
 *     price: { regex: /PRICE:\s*\$?(\d+(?:\.\d+)?)/i, default: 2, type: 'number' },
 *     location: { regex: /LOCATION:\s*(park|school|corner)/i, default: 'corner' },
 *   })
 */
export function parseResponse(text, patterns) {
  const result = {};
  for (const [field, { regex, default: def, type }] of Object.entries(patterns)) {
    const match = text.match(regex);
    let value = match ? match[1] : def;
    if (type === 'number') value = parseFloat(value) || def;
    if (typeof value === 'string' && type !== 'number') value = value.toLowerCase();
    result[field] = value;
  }
  return result;
}

/**
 * Resolve votes using specified strategies per field.
 *
 * @param {object[]} votes — [{ kid: 'max', price: 2, location: 'park' }, ...]
 * @param {object} strategies — { fieldName: 'median' | 'majority' }
 * @returns {object} — resolved values
 */
export function resolveVotes(votes, strategies) {
  const result = {};
  for (const [field, strategy] of Object.entries(strategies)) {
    const values = votes.map(v => v[field]).filter(v => v !== undefined);
    if (strategy === 'median') {
      const sorted = [...values].sort((a, b) => a - b);
      result[field] = sorted[Math.floor(sorted.length / 2)];
    } else if (strategy === 'majority') {
      const counts = {};
      for (const v of values) counts[v] = (counts[v] || 0) + 1;
      result[field] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    }
  }
  return result;
}

/**
 * Print a console banner for a game.
 *
 * @param {object} opts
 * @param {string} opts.title — game title
 * @param {string[]} opts.players — player names
 * @param {boolean} opts.mixed — mixed model mode?
 * @param {string} opts.model — single model name
 * @param {object} opts.mixedModels — { name: model }
 * @param {object} [opts.extra] — additional key-value lines
 */
export function banner({ title, players, mixed, model, mixedModels, extra = {} }) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`  ${players.join(', ')}`);
  if (mixed) {
    console.log(`  Models: ${players.map(p => `${p}→${mixedModels[p]}`).join(', ')}`);
  } else {
    console.log(`  Model: ${model}`);
  }
  for (const [k, v] of Object.entries(extra)) {
    console.log(`  ${k}: ${v}`);
  }
  console.log(`${'═'.repeat(60)}\n`);
}

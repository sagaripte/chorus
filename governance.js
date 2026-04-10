/**
 * Governance — lightweight policy enforcement for multi-agent systems.
 *
 * Not a platform. Just a way to wire rules across all agents at once.
 * Uses the existing hook system under the hood.
 *
 * Usage:
 *   const gov = new Governance({ audit: new Timeline('audit.jsonl') });
 *
 *   // Budget: stop an agent after $5 spend
 *   gov.budget({ maxCostUsd: 5, costPerInputToken: 0.003/1000, costPerOutputToken: 0.015/1000 });
 *
 *   // Rate limit: max 10 calls per minute per agent
 *   gov.rateLimit({ maxCallsPerMinute: 10 });
 *
 *   // Content filter: block or redact
 *   gov.filter((content, agent) => {
 *     if (content.includes('CONFIDENTIAL')) return null; // block
 *     return content; // pass through
 *   });
 *
 *   // Custom policy: any beforeSend/afterSend/beforeQueue logic
 *   gov.policy('beforeSend', (messages, agent) => {
 *     // add compliance reminder, redact PII, enforce schema, etc.
 *     return messages;
 *   });
 *
 *   // Apply to agents
 *   gov.apply(agent1, agent2, agent3);
 *   gov.apply(...allAgents);
 */

export class Governance {
  #policies = [];
  #audit;

  /**
   * @param {object} [opts]
   * @param {Timeline} [opts.audit] — Timeline instance for audit events
   */
  constructor(opts = {}) {
    this.#audit = opts.audit || null;
  }

  /**
   * Budget enforcement. Blocks send() when an agent exceeds cost threshold.
   * @param {object} opts
   * @param {number} opts.maxCostUsd — maximum spend per agent in USD
   * @param {number} opts.costPerInputToken — cost per input token in USD
   * @param {number} opts.costPerOutputToken — cost per output token in USD
   */
  budget({ maxCostUsd, costPerInputToken, costPerOutputToken }) {
    this.#policies.push((agent) => {
      agent.hook('governance', (ctx) => {
        const { input, output } = ctx.usage;
        const spent = input * costPerInputToken + output * costPerOutputToken;
        if (spent >= maxCostUsd) {
          this.#log('budget_blocked', agent, { spent, maxCostUsd });
          throw new Error(`Budget exceeded: $${spent.toFixed(4)} >= $${maxCostUsd}`);
        }
        this.#log('budget_check', agent, { spent, maxCostUsd, remaining: maxCostUsd - spent });
      });
    });
    return this;
  }

  /**
   * Rate limiting. Blocks send() if agent exceeds calls per minute.
   * @param {object} opts
   * @param {number} opts.maxCallsPerMinute — max LLM calls per minute per agent
   */
  rateLimit({ maxCallsPerMinute }) {
    const windows = new Map(); // agentId → [timestamps]

    this.#policies.push((agent) => {
      agent.hook('governance', (ctx) => {
        const now = Date.now();
        const key = ctx.agent;
        const calls = windows.get(key) || [];

        // Prune calls older than 1 minute
        const recent = calls.filter(t => now - t < 60_000);

        if (recent.length >= maxCallsPerMinute) {
          this.#log('rate_blocked', agent, { calls: recent.length, maxCallsPerMinute });
          throw new Error(`Rate limit: ${recent.length} calls in last minute (max ${maxCallsPerMinute})`);
        }

        recent.push(now);
        windows.set(key, recent);
        this.#log('rate_check', agent, { calls: recent.length, maxCallsPerMinute });
      });
    });
    return this;
  }

  /**
   * Content filter. Runs on every queued message and every LLM response.
   * Return null to block, modified string to transform, or unchanged to pass through.
   * @param {Function} fn — (content, agent) => string | null
   */
  filter(fn) {
    this.#policies.push((agent) => {
      // Filter incoming messages
      agent.hook('beforeQueue', (content) => {
        const result = fn(content, agent);
        if (result === null) {
          this.#log('filter_blocked_input', agent, { preview: content.substring(0, 100) });
        }
        return result;
      });

      // Filter LLM responses
      agent.hook('afterSend', (text) => {
        const result = fn(text, agent);
        if (result === null) {
          this.#log('filter_blocked_output', agent, { preview: text.substring(0, 100) });
          return '[FILTERED]';
        }
        return result;
      });
    });
    return this;
  }

  /**
   * Custom policy. Wire any hook logic across all agents.
   * @param {string} hookName — governance, beforeSend, afterSend, onError, beforeQueue, afterCompact
   * @param {Function} fn — (value, agent) => modified value
   */
  policy(hookName, fn) {
    this.#policies.push((agent) => {
      agent.hook(hookName, (value) => fn(value, agent));
    });
    return this;
  }

  /**
   * Apply all registered policies to one or more agents.
   * @param {...Agent} agents
   */
  apply(...agents) {
    for (const agent of agents) {
      for (const install of this.#policies) {
        install(agent);
      }
    }
    return this;
  }

  #log(event, agent, data = {}) {
    if (this.#audit) {
      this.#audit.emit(event, { agent: agent.id, ...data });
    }
  }
}

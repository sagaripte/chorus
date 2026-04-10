/**
 * Chorus — multi-agent LLM framework.
 *
 * Core primitives:
 *   Agent    — message queue + LLM. queue()/send()/onMessage()/compact()
 *   Bus      — thin event pub/sub (~40 lines)
 *   Timeline — append-only event log (JSONL)
 *   Session  — state persistence + audit log
 *
 * Governance:
 *   Governance — policy enforcement (budget, rate limit, content filter)
 *
 * Persistence:
 *   Store     — abstract persistence interface
 *   FileStore — default file-backed implementation (JSONL on disk)
 *
 * Provider layer:
 *   registry      — model alias → provider + modelId
 *   loadProviders  — bulk-register from config object
 *
 * Usage:
 *   import { Agent, Bus, Timeline, Session, loadProviders } from './index.js';
 *
 *   await loadProviders({
 *     openai: { apiKey: '...', models: { mini: 'gpt-4.1-mini' }, enabled: ['mini'] }
 *   });
 *
 *   const agent = new Agent('alice', systemPrompt, { model: 'mini' });
 *   agent.queue('Bob said: hello');
 *   const response = await agent.send();
 */

export { Agent } from './agent.js';
export { Bus } from './bus.js';
export { Timeline } from './timeline.js';
export { Session } from './session.js';
export { Store, FileStore } from './store.js';
export { Governance } from './governance.js';
export { registry, loadProviders } from './providers/index.js';

/**
 * Timeline — append-only event log.
 *
 * Stored as JSONL (one JSON object per line).
 * Accepts a file path (default) or any Store implementation.
 *
 * Usage:
 *   const tl = new Timeline('data/timeline.jsonl');          // FileStore
 *   const tl = new Timeline(new KafkaStore('events-topic')); // custom
 *   tl.emit('research', { from: 'bull', content: 'buy AAPL' });
 *   tl.getAll();
 *   tl.byType('research');
 *   tl.byAgent('bull');
 */
import { resolveStore } from './store.js';

export class Timeline {
  #store;
  #events = [];

  constructor(storeOrPath = 'data/timeline.jsonl') {
    this.#store = resolveStore(storeOrPath, 'data/timeline.jsonl');
    this.#load();
  }

  #load() {
    const lines = this.#store.read();
    this.#events = lines.map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  }

  /**
   * Emit a typed event. Appended to store immediately.
   * @param {string} type — event type
   * @param {object} data — event-specific payload
   * @param {object} [context] — optional context (day, week, phase, etc.)
   */
  emit(type, data, context = {}) {
    const entry = {
      id: this.#events.length + 1,
      ts: Date.now(),
      type,
      ...context,
      ...data,
    };
    this.#events.push(entry);
    this.#store.append(JSON.stringify(entry));
    return entry;
  }

  getAll() { return this.#events; }

  filter(fn) { return this.#events.filter(fn); }

  last(n = 10) { return this.#events.slice(-n); }

  byType(type) { return this.#events.filter(e => e.type === type); }

  byAgent(name) {
    return this.#events.filter(e => e.from === name || e.to === name || e.agent === name);
  }

  clear() {
    this.#events = [];
    this.#store.clear();
  }
}

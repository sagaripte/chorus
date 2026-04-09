/**
 * Session — JSON state persistence with atomic updates and audit logging.
 *
 * Accepts a file path (default) or any Store implementation for both
 * state and the audit log.
 *
 * Usage:
 *   const session = new Session('data/state.json');               // FileStore
 *   const session = new Session(new RedisStore('session:state')); // custom
 *   session.set({ round: 1, agents: [...] });
 *   session.update(s => ({ ...s, round: s.round + 1 }));
 *   const state = session.get();
 */
import { resolveStore, FileStore } from './store.js';

export class Session {
  #store;
  #logStore;
  #state = {};

  /**
   * @param {string|Store} storeOrPath — state store (or file path)
   * @param {string|Store} [logStoreOrPath] — audit log store (optional, derived from state path if file-based)
   */
  constructor(storeOrPath = 'data/state.json', logStoreOrPath) {
    this.#store = resolveStore(storeOrPath, 'data/state.json');

    // Derive log store: if file-based and no log store given, use _log.jsonl sibling
    if (logStoreOrPath) {
      this.#logStore = resolveStore(logStoreOrPath);
    } else if (this.#store instanceof FileStore) {
      this.#logStore = new FileStore(this.#store.path.replace('.json', '_log.jsonl'));
    } else {
      this.#logStore = null; // no audit log for custom stores unless explicitly provided
    }
  }

  /** Load state from store. Returns true if state existed. */
  load() {
    const lines = this.#store.read();
    if (lines.length > 0) {
      try {
        // State is a single JSON object (not JSONL), so join all lines
        this.#state = JSON.parse(lines.join('\n'));
        return true;
      } catch { return false; }
    }
    return false;
  }

  /** Save state to store */
  save() {
    this.#store.write([JSON.stringify(this.#state, null, 2)]);
  }

  /** Get current state */
  get() { return this.#state; }

  /** Set entire state */
  set(state) {
    this.#state = state;
    this.save();
  }

  /** Update state via function: update(prev => newState) */
  update(fn) {
    this.#state = fn(this.#state);
    this.save();
    return this.#state;
  }

  /** Append an entry to the audit log */
  log(entry) {
    if (this.#logStore) {
      this.#logStore.append(JSON.stringify({ ts: Date.now(), ...entry }));
    }
  }

  /** Check if a saved session exists */
  exists() {
    return this.#store.exists();
  }
}

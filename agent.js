/**
 * Agent — a message queue with an LLM at the end.
 *
 * Core methods:
 *   queue(msg)    — append to conversation (no LLM call)
 *   send(opts)    — flush conversation to LLM, get response
 *   ask(msg,opts) — queue + send in one call
 *   pin(msg)      — append, survives compaction
 *   compact(fn,n) — summarize old messages
 *   onMessage(msg)— override in subclass
 *
 * The base class handles:
 *   - Append-only JSONL conversation (on disk or any Store)
 *   - Provider resolution via registry
 *   - Message merging (consecutive same-role)
 *   - Pinned messages that survive compaction
 *   - Archiving old messages on compact
 *   - Auto-logging to Timeline (if configured)
 */
import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { dirname, join } from 'path';
import { registry } from './providers/index.js';
import { FileStore } from './store.js';

const DEFAULTS = {
  maxHistory: 200,
  maxTokens: 600,
  temperature: 0.85,
  retryDelay: 2000,
  retryJitter: 3000,
  compactKeep: 40,
};

export class Agent {
  // Private fields
  #store;
  #file;
  #timeline;
  #prefix = '';
  #usageLog = [];
  #callCount = 0;
  #maxCalls;
  #hooks = {};

  /**
   * @param {string} id           — unique id (filename + provider session key)
   * @param {string} systemPrompt — full system prompt
   * @param {object} opts
   * @param {string}   opts.model      — model alias from registry
   * @param {string}   opts.dataDir    — JSONL directory (default 'data')
   * @param {Store}    opts.store      — custom Store instance (overrides dataDir)
   * @param {Timeline} opts.timeline   — auto-log every send() response
   * @param {number}   opts.maxHistory — max messages per LLM call
   * @param {number}   opts.maxTokens
   * @param {number}   opts.temperature
   */
  constructor(id, systemPrompt, opts = {}) {
    this.id = id;
    this.systemPrompt = systemPrompt;
    this.model = opts.model || null;
    this.opts = { ...DEFAULTS, ...opts };

    this.#store = opts.store || new FileStore(join(opts.dataDir || 'data', `${id}.jsonl`));
    this.#file = this.#store.path || null;
    this.#timeline = opts.timeline || null;
    this.#maxCalls = opts.maxCalls || Infinity;

    this.#ensureSystem();
    this.#initSession();
  }

  // =========================================================================
  // CORE
  // =========================================================================

  /**
   * Something arrived. Override in subclass to decide what to do.
   * Default: just queue it.
   */
  async onMessage(message) {
    this.queue(message);
  }

  /**
   * Flush conversation to LLM. Returns raw response text.
   * @param {object} [opts] — per-call overrides (maxTokens, temperature, event)
   */
  async send(opts = {}) {
    if (this.#callCount >= this.#maxCalls) {
      this.#log({ type: 'limit', callCount: this.#callCount, max: this.#maxCalls });
      const limitMsg = this.opts.limitResponse || '[LIMIT REACHED]';
      this.#append('assistant', limitMsg);
      return limitMsg;
    }

    const history = this.#readHistory();
    const chatMessages = history.filter(m => m.role !== 'system');
    const merged = Agent.mergeConsecutive(chatMessages);
    const trimmed = merged.slice(-this.opts.maxHistory);

    const messages = await this.#runHooks('beforeSend', trimmed);
    const { provider, modelId } = this.#resolve();

    const sendOpts = {
      maxTokens: opts.maxTokens || this.opts.maxTokens,
      temperature: opts.temperature ?? this.opts.temperature,
      responseFormat: opts.responseFormat,
    };

    // Governance gate — throw to block, return modified context to alter
    await this.#runHooks('governance', {
      agent: this.id,
      model: modelId,
      messages,
      opts: sendOpts,
      usage: this.totalUsage,
    });

    const t0 = Date.now();
    let result;
    try {
      result = await this.#sendWithRetry(provider, modelId, messages, sendOpts);
    } catch (err) {
      this.#log({ type: 'error', model: modelId, error: err.message, messageCount: messages.length });
      const fallback = await this.#runHooks('onError', err);
      if (typeof fallback === 'string') {
        this.#append('assistant', fallback);
        return fallback;
      }
      this.#append('assistant', `[ERROR: ${err.message}]`);
      throw err;
    }
    const elapsed = Date.now() - t0;

    this.#log({
      type: 'send',
      model: modelId,
      opts: sendOpts,
      messageCount: messages.length,
      lastUserMsg: messages[messages.length - 1]?.content?.substring(0, 200),
      rawRequest: messages,
      responsePreview: result.text?.substring(0, 200),
      rawResponse: result.text,
      usage: result.usage,
      elapsed,
    });

    const text = await this.#runHooks('afterSend', result.text);

    this.#append('assistant', text);
    this.#callCount++;
    this.#usageLog.push({
      ts: Date.now(), elapsed,
      input: result.usage?.input || 0,
      output: result.usage?.output || 0,
      cached: result.usage?.cached || 0,
    });

    // Auto-log to timeline if configured
    if (this.#timeline) {
      this.#timeline.emit(opts.event || this.id, { from: this.id, content: text });
    }

    return text;
  }

  /**
   * Queue a message and immediately send. Convenience for one-shot interactions.
   * @param {string} message — the message to queue
   * @param {object} [opts] — per-call overrides (same as send)
   */
  async ask(message, opts = {}) {
    this.queue(message);
    return this.send(opts);
  }

  // =========================================================================
  // QUEUE
  // =========================================================================

  /** Queue a user message (appended to conversation, no LLM call) */
  queue(content) {
    const line = this.#prefix ? `${this.#prefix} ${content}` : content;
    for (const fn of this.#hooks.beforeQueue || []) {
      const result = fn(line);
      if (result === null) return;
      if (result !== undefined) { this.#append('user', result); return; }
    }
    this.#append('user', line);
  }

  /** Queue a message that survives compaction forever */
  pin(content) {
    this.#append('user', content, true);
  }

  /** Set prefix for queued messages (e.g., "[09:00]") */
  setPrefix(prefix) { this.#prefix = prefix; }

  // =========================================================================
  // HOOKS
  // =========================================================================

  /** Register a hook callback */
  hook(name, fn) {
    (this.#hooks[name] ??= []).push(fn);
    return this;
  }

  /** Remove a hook callback */
  unhook(name, fn) {
    if (this.#hooks[name]) {
      this.#hooks[name] = this.#hooks[name].filter(f => f !== fn);
    }
    return this;
  }

  // =========================================================================
  // COMPACTION
  // =========================================================================

  /**
   * Compact old messages. Subclass decides when to call this.
   * @param {Function} summarize — async (oldMessages) => string
   * @param {number} [keep] — number of recent messages to preserve
   */
  async compact(summarize, keep) {
    keep = keep || this.opts.compactKeep || 40;
    const history = this.#readHistory();
    const nonSystem = history.filter(m => m.role !== 'system');
    const unpinned = nonSystem.filter(m => !m.pinned);

    if (unpinned.length <= keep) return;

    const oldMessages = unpinned.slice(0, -keep);
    const recentMessages = unpinned.slice(-keep);

    const summary = await summarize(oldMessages);
    if (!summary) return;

    // Archive (append-only, never lost)
    if (this.#file) {
      const archiveFile = this.#file.replace('.jsonl', '.archive.jsonl');
      appendFileSync(archiveFile, JSON.stringify({
        ts: Date.now(),
        count: oldMessages.length,
        messages: oldMessages,
      }) + '\n');
    }

    // Rewrite: system + pinned + summary + recent
    const pinnedMessages = nonSystem.filter(m => m.pinned);
    const newHistory = [
      { role: 'system', content: this.systemPrompt },
      ...pinnedMessages,
      { role: 'user', content: `[CONTEXT — previous events summarized]\n${summary}` },
      { role: 'assistant', content: 'Understood. I have the context from previous events. Continuing in character.' },
      ...recentMessages,
    ];

    this.#store.write(newHistory.map(m => JSON.stringify(m)));
    await this.#runHooks('afterCompact', summary);
  }

  // =========================================================================
  // READ
  // =========================================================================

  /** Message count (excluding system prompt) */
  get messageCount() {
    return this.#readHistory().filter(m => m.role !== 'system').length;
  }

  /** Total LLM usage across all calls */
  get totalUsage() {
    return this.#usageLog.reduce((acc, u) => ({
      input: acc.input + u.input,
      output: acc.output + u.output,
      cached: acc.cached + u.cached,
      calls: acc.calls + 1,
    }), { input: 0, output: 0, cached: 0, calls: 0 });
  }

  // =========================================================================
  // CLEANUP
  // =========================================================================

  async destroy() {
    try {
      const { provider } = this.#resolve();
      if (provider.hasSession(this.id)) {
        await provider.destroySession(this.id);
      }
    } catch { /* ok */ }
  }

  // =========================================================================
  // STATIC HELPERS
  // =========================================================================

  /** Extract JSON from LLM response (handles markdown, mixed text) */
  static parseJSON(text) {
    try { return JSON.parse(text); } catch {}
    const candidates = [];
    let depth = 0, start = -1;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') { if (depth === 0) start = i; depth++; }
      else if (text[i] === '}') { depth--; if (depth === 0 && start >= 0) candidates.push(text.slice(start, i + 1)); }
    }
    const best = candidates.sort((a, b) => b.length - a.length)[0];
    if (best) try { return JSON.parse(best); } catch {}
    return null;
  }

  /** Merge consecutive same-role messages (required by some providers) */
  static mergeConsecutive(messages) {
    const out = [];
    for (const msg of messages) {
      const prev = out[out.length - 1];
      if (prev && prev.role === msg.role) {
        prev.content += '\n' + msg.content;
      } else {
        out.push({ ...msg });
      }
    }
    return out;
  }

  // =========================================================================
  // PRIVATE
  // =========================================================================

  async #sendWithRetry(provider, modelId, messages, opts, attempt = 0) {
    try {
      return await provider.send(this.id, modelId, messages, opts);
    } catch (err) {
      const msg = err.message || '';
      const retryable = msg.includes('429') || msg.includes('500') || msg.includes('502')
        || msg.includes('503') || msg.includes('529') || msg.includes('rate');
      if (retryable && attempt < 1) {
        const delay = (this.opts.retryDelay || 2000) + Math.random() * (this.opts.retryJitter || 3000);
        this.#log({ type: 'retry', attempt: attempt + 1, delay: Math.round(delay), error: msg });
        await new Promise(r => setTimeout(r, delay));
        return this.#sendWithRetry(provider, modelId, messages, opts, attempt + 1);
      }
      throw err;
    }
  }

  async #runHooks(name, value) {
    for (const fn of this.#hooks[name] || []) {
      const result = await fn(value);
      if (result !== undefined) value = result;
    }
    return value;
  }

  #log(entry) {
    if (!this.#file) return;
    const dir = dirname(this.#file);
    const logDir = join(dir, 'logs');
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
    const logFile = join(logDir, `${this.id}.log.jsonl`);
    appendFileSync(logFile, JSON.stringify({ ts: Date.now(), agent: this.id, ...entry }) + '\n');
  }

  #readHistory() {
    const lines = this.#store.read();
    let corrupt = 0;
    const parsed = [];
    for (const line of lines) {
      try { parsed.push(JSON.parse(line)); }
      catch { corrupt++; }
    }
    if (corrupt > 0) {
      this.#log({ type: 'warn', corrupt_lines: corrupt, total_lines: lines.length });
    }
    return parsed;
  }

  #append(role, content, pinned = false) {
    const msg = { role, content };
    if (pinned) msg.pinned = true;
    this.#store.append(JSON.stringify(msg));
  }

  #ensureSystem() {
    const history = this.#readHistory();
    if (history.length === 0 || history[0].role !== 'system') {
      this.#append('system', this.systemPrompt);
      return;
    }

    if (this.opts.refreshSystem && history[0].content !== this.systemPrompt) {
      history[0] = { role: 'system', content: this.systemPrompt };
      this.#store.write(history.map(m => JSON.stringify(m)));
      this.#log({ type: 'system_refresh' });
    }
  }

  #initSession() {
    if (!this.model) return;
    try {
      const { provider } = this.#resolve();
      if (!provider.hasSession(this.id)) {
        provider.createSession(this.id, this.systemPrompt);
      }
    } catch { /* provider not registered yet */ }
  }

  #resolve() {
    if (!this.model) {
      const list = registry.list();
      if (list.length === 0) throw new Error(`No models registered and no model set for agent "${this.id}"`);
      this.model = list[0];
    }
    return registry.get(this.model);
  }
}

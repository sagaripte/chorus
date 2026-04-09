/**
 * Base provider. Each LLM backend implements:
 *
 *   createSession(id, systemPrompt)  — init conversation, set up caching
 *   send(id, model, messages, opts)  — call LLM, return { text, usage }
 *   destroySession(id)              — cleanup server-side resources
 *
 * Sessions are keyed by a caller-chosen ID (e.g., agent name).
 * Providers handle caching optimization internally:
 *   - Anthropic: ephemeral cache breakpoints on system + recent context
 *   - xAI/Grok: x-grok-conv-id header for prefix cache pinning
 *   - OpenAI: automatic prefix caching (no action needed)
 */
export class BaseProvider {
  constructor(name, apiKey, config = {}) {
    this.name = name;
    this.apiKey = apiKey;
    this.config = config;
    this.sessions = new Map();
  }

  async createSession(id, systemPrompt) {
    this.sessions.set(id, { systemPrompt });
  }

  async send(id, model, messages, opts = {}) {
    throw new Error(`${this.name}: send() not implemented`);
  }

  async destroySession(id) {
    this.sessions.delete(id);
  }

  getSession(id) {
    const s = this.sessions.get(id);
    if (!s) throw new Error(`${this.name}: no session "${id}"`);
    return s;
  }

  hasSession(id) {
    return this.sessions.has(id);
  }
}

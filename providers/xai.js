/**
 * xAI / Grok — OpenAI-compatible with conversation-pinned caching.
 * Uses x-grok-conv-id header to pin requests to the same server for cache hits.
 */
import { BaseProvider } from './base.js';
import { randomUUID } from 'crypto';

export class XAIProvider extends BaseProvider {
  constructor(apiKey, config = {}) {
    super('xai', apiKey, config);
    this.baseUrl = config.baseUrl || 'https://api.x.ai/v1';
  }

  async createSession(id, systemPrompt) {
    this.sessions.set(id, { systemPrompt, convId: randomUUID() });
  }

  async send(id, model, messages, opts = {}) {
    const session = this.getSession(id);

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'x-grok-conv-id': session.convId,
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens || 4096,
        temperature: opts.temperature ?? 0.85,
        messages: [
          { role: 'system', content: session.systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
        ...(opts.responseFormat ? { response_format: opts.responseFormat } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`xAI ${res.status}: ${body}`);
    }

    const json = await res.json();
    return {
      text: json.choices[0].message.content,
      usage: {
        input: json.usage?.prompt_tokens || 0,
        output: json.usage?.completion_tokens || 0,
        cached: json.usage?.prompt_tokens_details?.cached_tokens || 0,
      },
    };
  }
}

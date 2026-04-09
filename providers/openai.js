/**
 * OpenAI Chat Completions. Automatic prefix caching (no special handling needed).
 * Also works for any OpenAI-compatible API (local, ollama, etc.) via baseUrl.
 */
import { BaseProvider } from './base.js';

export class OpenAIProvider extends BaseProvider {
  constructor(apiKey, config = {}) {
    super('openai', apiKey, config);
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async send(id, model, messages, opts = {}) {
    const session = this.getSession(id);

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
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
      throw new Error(`OpenAI ${res.status}: ${body}`);
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

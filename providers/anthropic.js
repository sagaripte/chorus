/**
 * Anthropic Messages API with prompt caching and streaming.
 * Cache strategy: ephemeral breakpoints on system prompt + recent context.
 */
import { BaseProvider } from './base.js';

export class AnthropicProvider extends BaseProvider {
  constructor(apiKey, config = {}) {
    super('anthropic', apiKey, config);
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
  }

  async createSession(id, systemPrompt) {
    this.sessions.set(id, { systemPrompt, turnCount: 0 });
  }

  async send(id, model, messages, opts = {}) {
    const session = this.getSession(id);
    session.turnCount++;

    // System prompt with cache breakpoint
    const system = [{
      type: 'text',
      text: session.systemPrompt,
      cache_control: { type: 'ephemeral' },
    }];

    // Mark second-to-last user message as cache breakpoint
    const apiMessages = messages.map((m, i) => {
      const msg = { role: m.role, content: m.content };
      if (m.role === 'user' && i === messages.length - 3 && messages.length > 3) {
        msg.content = [{
          type: 'text',
          text: m.content,
          cache_control: { type: 'ephemeral' },
        }];
      }
      return msg;
    });

    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens || 4096,
        temperature: opts.temperature ?? 0.85,
        stream: true,
        system,
        messages: apiMessages,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Anthropic ${res.status}: ${body}`);
    }

    // Parse SSE stream
    let text = '';
    let usage = { input: 0, output: 0, cached: 0 };
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        processSSELine(line);
      }
    }

    // Process any remaining buffered data
    if (buffer.trim()) processSSELine(buffer);

    function processSSELine(line) {
      if (!line.startsWith('data: ')) return;
      const data = line.slice(6);
      if (data === '[DONE]') return;
      try {
        const event = JSON.parse(data);
        if (event.type === 'content_block_delta' && event.delta?.text) {
          text += event.delta.text;
        } else if (event.type === 'message_delta' && event.usage) {
          usage.output = event.usage.output_tokens || 0;
        } else if (event.type === 'message_start' && event.message?.usage) {
          usage.input = event.message.usage.input_tokens || 0;
          usage.cached = event.message.usage.cache_read_input_tokens || 0;
        }
      } catch { /* skip malformed */ }
    }

    return { text, usage };
  }
}

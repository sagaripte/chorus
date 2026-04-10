/**
 * Provider registry. Maps aliases → { provider, modelId }.
 *
 * Usage:
 *   import { registry } from '@agent-house/framework/providers';
 *   registry.register('grok', xaiProvider, 'grok-4.20-0309-non-reasoning');
 *   const { provider, modelId } = registry.get('grok');
 *   const result = await provider.send(sessionId, modelId, messages);
 */

export { BaseProvider } from './base.js';
export { XAIProvider } from './xai.js';
export { AnthropicProvider } from './anthropic.js';
export { OpenAIProvider } from './openai.js';

const models = new Map();

export const registry = {
  register(alias, provider, modelId) {
    models.set(alias, { provider, modelId });
  },

  get(alias) {
    const entry = models.get(alias);
    if (!entry) throw new Error(`Model "${alias}" not registered`);
    return entry;
  },

  has(alias) {
    return models.has(alias);
  },

  list() {
    return [...models.keys()];
  },

  clear() {
    models.clear();
  },
};

/**
 * Load providers from a config object.
 *
 * config shape:
 *   {
 *     xai:       { apiKey, baseUrl?, models: { alias: modelId }, enabled: ['alias'] },
 *     anthropic: { apiKey, baseUrl?, models: { alias: modelId }, enabled: ['alias'] },
 *     openai:    { apiKey, baseUrl?, models: { alias: modelId }, enabled: ['alias'] },
 *   }
 */
const PROVIDER_CLASSES = {
  xai: () => import('./xai.js').then(m => m.XAIProvider),
  anthropic: () => import('./anthropic.js').then(m => m.AnthropicProvider),
  openai: () => import('./openai.js').then(m => m.OpenAIProvider),
  gemini: () => import('./openai.js').then(m => m.OpenAIProvider),  // OpenAI-compatible
};

export async function loadProviders(config) {
  for (const [name, cfg] of Object.entries(config)) {
    if (!cfg.apiKey || !cfg.enabled?.length) continue;
    const ProviderClass = await PROVIDER_CLASSES[name]?.();
    if (!ProviderClass) continue;
    const instance = new ProviderClass(cfg.apiKey, cfg);
    for (const alias of cfg.enabled) {
      const modelId = cfg.models?.[alias];
      if (modelId) registry.register(alias, instance, modelId);
    }
  }
}

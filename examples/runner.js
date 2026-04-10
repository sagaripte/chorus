/**
 * Example runner — shared setup for all Chorus examples.
 *
 * Handles:
 *   - Loading providers from config.json + env vars
 *   - CLI argument parsing (model alias or 'mixed')
 *   - Data directory setup
 *   - Bus, Timeline, Session creation
 *
 * Usage:
 *   import { setup } from '../runner.js';
 *
 *   const { bus, tl, session, model, mixed } = await setup({
 *     name: 'poker',                       // used for timeline/session filenames
 *     defaultModel: 'sonnet',              // fallback if no CLI arg
 *   });
 *
 *   // model  = CLI arg or defaultModel (e.g. 'sonnet')
 *   // mixed  = true if CLI arg was 'mixed'
 *   // bus    = new Bus()
 *   // tl     = new Timeline('data/poker.jsonl')
 *   // session = new Session('data/poker-state.json')
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Bus, Timeline, Session, loadProviders, registry } from '../index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Map provider names to env var names
const API_KEY_ENV = {
  xai: 'XAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

/**
 * Load providers from config.json + environment variables.
 * Returns the parsed config object.
 */
async function loadConfig() {
  const configPath = join(__dirname, 'config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));

  const providers = {};
  for (const [name, cfg] of Object.entries(config.providers)) {
    const apiKey = process.env[API_KEY_ENV[name]];
    if (!apiKey || !cfg.enabled?.length) continue;

    providers[name] = {
      apiKey,
      baseUrl: cfg.base_url || undefined,
      models: cfg.models,
      enabled: cfg.enabled,
    };
  }

  await loadProviders(providers);
  return config;
}

/**
 * Full example setup. Call this at the top of your example.
 *
 * @param {object} opts
 * @param {string} opts.name          — example name (for filenames)
 * @param {string} [opts.defaultModel] — fallback model alias (default: first registered)
 * @param {string} [opts.dataDir]      — data directory (default: './data')
 * @returns {{ bus, tl, session, model, mixed, config }}
 */
export async function setup(opts = {}) {
  const { name, defaultModel, dataDir = './data' } = opts;

  const config = await loadConfig();

  const arg = process.argv[2] || defaultModel || registry.list()[0];
  const mixed = arg === 'mixed';
  const model = mixed ? null : arg;

  const bus = new Bus();
  const tl = new Timeline(join(dataDir, `${name}.jsonl`));
  const session = new Session(join(dataDir, `${name}-state.json`));

  return { bus, tl, session, model, mixed, config };
}

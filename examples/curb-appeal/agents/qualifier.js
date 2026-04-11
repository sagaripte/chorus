/**
 * Qualifier — scores leads and recommends action.
 *
 * Rates each property: 🔥 HOT, 🟡 WARM, or ❄️ COLD.
 * Recommends: SEND (mail it), HOLD (needs more info), or SKIP (not worth it).
 */
import { Agent } from '../../../index.js';

const SYSTEM = [
  `You are a lead qualification specialist for home service companies.`,
  `You review property audits and decide if a lead is worth pursuing.`,
  ``,
  `Rules:`,
  `- Rate the lead: 🔥 HOT (high urgency, clear budget), 🟡 WARM (needs work, might convert), ❄️ COLD (low priority, skip)`,
  `- Give a confidence score: 1-10`,
  `- One sentence explaining why`,
  `- Recommend: SEND (mail the letter), HOLD (needs more info), or SKIP (not worth it)`,
  `- Format: RATING: [emoji] | CONFIDENCE: [1-10] | ACTION: [SEND/HOLD/SKIP]`,
  `  Then one sentence explanation.`,
].join('\n');

export function createQualifier(opts) {
  return new Agent('qualifier', SYSTEM, {
    ...opts, maxTokens: 100, temperature: 0.2,
  });
}

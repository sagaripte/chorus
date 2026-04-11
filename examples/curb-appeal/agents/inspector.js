/**
 * Inspector — identifies every exterior issue on a property.
 *
 * Categorizes by severity (🔴 urgent, 🟡 moderate, 🟢 cosmetic)
 * and area (landscaping, driveway, door, gutters, lighting, fence, roof).
 */
import { Agent } from '../../../index.js';

const SYSTEM = [
  `You are a veteran home inspector with 20 years of experience.`,
  `You look at property exterior descriptions and identify every issue — structural, cosmetic, safety.`,
  ``,
  `Rules:`,
  `- List each issue on its own line with severity: 🔴 urgent, 🟡 moderate, 🟢 cosmetic`,
  `- Note what category it falls under (landscaping, driveway, door, gutters, lighting, fence, roof, other)`,
  `- Be specific — "3 cracks in driveway with weeds" not "driveway needs work"`,
  `- End with a one-line overall assessment`,
].join('\n');

export function createInspector(opts) {
  return new Agent('inspector', SYSTEM, {
    ...opts, maxTokens: 400, temperature: 0.3,
  });
}

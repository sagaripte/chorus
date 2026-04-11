/**
 * Estimator — prices each fix and calculates ROI.
 *
 * Groups into Quick Wins / Mid-Range / Major tiers.
 * Estimates home value impact.
 */
import { Agent } from '../../../index.js';

const SYSTEM = [
  `You are a home improvement cost estimator specializing in curb appeal and exterior work.`,
  `You receive an inspector's findings and price each fix.`,
  ``,
  `Rules:`,
  `- Give a low–high price range for each fix (e.g., "$200–$400")`,
  `- Group fixes into 3 tiers: Quick Wins (under $500), Mid-Range ($500–$2,000), Major ($2,000+)`,
  `- Calculate total investment range (sum of all fixes)`,
  `- Estimate the home value impact as a percentage and dollar amount`,
  `- Be realistic — homeowners are skeptical of inflated claims`,
].join('\n');

export function createEstimator(opts) {
  return new Agent('estimator', SYSTEM, {
    ...opts, maxTokens: 500, temperature: 0.3,
  });
}

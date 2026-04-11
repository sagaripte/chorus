/**
 * Curb Appeal Auditor — multi-agent lead generation pipeline.
 *
 * Pipeline:
 *   Crawler (stub) → Scanner (stub) → Inspector → Estimator → Writer → Qualifier
 *
 * Each agent is in its own file under agents/ — swap, modify, or reuse individually.
 *
 * Usage: node curb.js [model]
 */

import { setup } from '../runner.js';
import { PROPERTIES, NEIGHBORHOOD } from './properties.js';
import { createCrawler } from './agents/crawler.js';
import { createScanner } from './agents/scanner.js';
import { createInspector } from './agents/inspector.js';
import { createEstimator } from './agents/estimator.js';
import { createWriter } from './agents/writer.js';
import { createQualifier } from './agents/qualifier.js';

// ─── Config ──────────────────────────────────────────────────────────────────

const MIXED_MODELS = {
  Inspector: 'grok',
  Estimator: 'sonnet',
  Writer: 'opus',
  Qualifier: 'haiku',
};

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { tl, session, model, mixed } = await setup({
    name: 'curb-appeal',
    defaultModel: 'sonnet',
  });

  const agentOpts = (role) => ({
    model: mixed ? MIXED_MODELS[role] : model,
    dataDir: './data',
    timeline: tl,
  });

  // Create pipeline stages
  const crawler   = createCrawler(tl);
  const scanner   = createScanner(tl);
  const inspector = createInspector(agentOpts('Inspector'));
  const estimator = createEstimator(agentOpts('Estimator'));
  const writer    = createWriter(agentOpts('Writer'));
  const qualifier = createQualifier(agentOpts('Qualifier'));

  // ─── Process one property through the full pipeline ───
  async function processProperty(property) {
    console.log(`  ── ${property.address} ── (${property.owner}, est. $${property.homeValue.toLocaleString()})\n`);

    // Reset agents — each property is independent, no cross-contamination
    inspector.reset();
    estimator.reset();
    writer.reset();
    qualifier.reset();

    // Stage 0: Crawl + Scan
    const crawled = await crawler.crawl(property.address);
    if (!crawled) { console.log(`    ⚠ Address not found, skipping\n`); return null; }
    const scanResult = await scanner.scan(crawled);

    const brief = [
      `Address: ${property.address}`,
      `Owner: ${property.owner}`,
      `Estimated value: $${property.homeValue.toLocaleString()}`,
      `Year built: ${property.yearBuilt}`,
      ``,
      `Exterior scan (Google Maps Street View + Gemini):`,
      scanResult,
    ].join('\n');

    tl.emit('property_start', { address: property.address, owner: property.owner, homeValue: property.homeValue });

    // Stage 1: Inspector
    console.log(`    🔍 Inspector...`);
    const inspection = await inspector.ask(`Inspect this property:\n\n${brief}`);
    console.log(`    ${inspection.split('\n').join('\n    ')}\n`);
    tl.emit('inspection', { address: property.address, content: inspection });

    // Stage 2: Estimator
    console.log(`    💰 Estimator...`);
    const estimate = await estimator.ask(
      `Property: ${property.address} (value: $${property.homeValue.toLocaleString()})\n\nInspector findings:\n${inspection}`
    );
    console.log(`    ${estimate.split('\n').join('\n    ')}\n`);
    tl.emit('estimate', { address: property.address, content: estimate });

    // Stage 3: Writer
    console.log(`    ✉️  Writer...`);
    const outreach = await writer.ask(
      `Property: ${property.address}, Owner: ${property.owner}\n\nInspection:\n${inspection}\n\nEstimate:\n${estimate}`
    );
    console.log(`    ${outreach.split('\n').join('\n    ')}\n`);
    tl.emit('outreach', { address: property.address, content: outreach });

    // Stage 4: Qualifier
    console.log(`    🎯 Qualifier...`);
    const qualification = await qualifier.ask(
      `Property: ${property.address}, Owner: ${property.owner}, Value: $${property.homeValue.toLocaleString()}\n\nInspection:\n${inspection}\n\nEstimate:\n${estimate}\n\nOutreach draft:\n${outreach}`
    );
    console.log(`    ${qualification}\n`);
    tl.emit('qualification', { address: property.address, content: qualification });

    console.log(`    ─────────────────────────────────────\n`);
    return { address: property.address, owner: property.owner, homeValue: property.homeValue, inspection, estimate, outreach, qualification };
  }

  // ─── Banner ───
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  CURB APPEAL AUDITOR`);
  console.log(`  Neighborhood: ${NEIGHBORHOOD} | Properties: ${PROPERTIES.length}`);
  if (mixed) console.log(`  Models: Inspector→${MIXED_MODELS.Inspector}, Estimator→${MIXED_MODELS.Estimator}, Writer→${MIXED_MODELS.Writer}, Qualifier→${MIXED_MODELS.Qualifier}`);
  else console.log(`  Model: ${model}`);
  console.log(`${'═'.repeat(70)}\n`);

  tl.emit('run_start', { neighborhood: NEIGHBORHOOD, propertyCount: PROPERTIES.length });

  // ─── Run Pipeline ───
  const results = [];
  for (const property of PROPERTIES) {
    const result = await processProperty(property);
    if (result) results.push(result);
    session.set({ processed: results.length, total: PROPERTIES.length });
  }

  // ─── Summary ───
  const hot = results.filter(r => r.qualification.includes('🔥'));
  const warm = results.filter(r => !r.qualification.includes('🔥') && r.qualification.includes('🟡'));
  const cold = results.filter(r => !r.qualification.includes('🔥') && !r.qualification.includes('🟡'));

  console.log(`${'═'.repeat(70)}`);
  console.log(`  COMPLETE — ${results.length} properties audited`);
  console.log(`  🔥 Hot: ${hot.length} | 🟡 Warm: ${warm.length} | ❄️ Cold: ${cold.length}`);
  console.log(`  ${NEIGHBORHOOD}`);
  console.log(`${'═'.repeat(70)}\n`);

  tl.emit('run_end', { propertyCount: results.length, neighborhood: NEIGHBORHOOD, hot: hot.length, warm: warm.length });

  console.log(`  Timeline: ./data/curb-appeal.jsonl`);
  console.log(`  State: ./data/curb-appeal-state.json\n`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

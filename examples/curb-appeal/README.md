# Curb Appeal Lead Engine

Scan a neighborhood, identify every exterior problem, price the fixes, write personalized outreach, and score each lead — all automated with specialized agents.

This is the pattern behind real lead gen businesses that charge contractors $40–$150 per qualified lead.

## How It Works

```
Street View  →  Gemini Vision  →  Inspector  →  Estimator  →  Writer  →  Qualifier
  (crawl)        (describe)       (issues)      (pricing)    (letters)   (score + action)
```

The crawl + vision steps are simulated. In production, replace `agents/crawler.js` and `agents/scanner.js` with real Google Maps + Gemini Vision APIs. The four LLM agents stay exactly the same.

## Run It

```bash
node curb.js              # all agents on sonnet
node curb.js grok         # all agents on grok
node curb.js mixed        # Inspector→grok, Estimator→sonnet, Writer→opus, Qualifier→haiku
```

## The Agents

| Agent | Role | Key Strength |
|-------|------|--------------|
| **Inspector** | Finds every issue, ranks severity (🔴🟡🟢) | Precision, safety focus |
| **Estimator** | Prices fixes, groups into tiers, estimates ROI | Realistic market pricing |
| **Writer** | Crafts homeowner letter + contractor brief | Empathetic, persuasive copy |
| **Qualifier** | Scores lead (🔥 HOT / 🟡 WARM / ❄️ COLD), recommends action | Strategic sales decisioning |

Each agent is a separate file under `agents/` — swap one out, change its prompt, or reuse it in a different pipeline.

## What It Produces

For each property:

1. **Inspection report** — every issue categorized and severity-ranked
2. **Cost estimate** — Quick Wins / Mid-Range / Major tiers with price ranges and home value impact
3. **Homeowner letter** — personalized, specific, non-salesy ("I was driving past your place on Oak Lane...")
4. **Contractor brief** — what's wrong, estimated value, recommended sales approach
5. **Lead score** — HOT/WARM/COLD + confidence (1-10) + action: SEND / HOLD / SKIP

Full generated report: [data/curb-appeal.md](data/curb-appeal.md)

## The Business Model

- Contractors pay **$40–$150** per qualified lead with a pre-written audit
- One neighborhood scan (20 houses) produces 8–15 actionable leads
- At $60/lead → **$500–$900 revenue per run**
- API cost: under $1–$2 per property

This pattern works for: roofing, landscaping, fencing, painting, driveways, gutters, solar, pressure washing — swap the agent prompts, keep the pipeline.

## What It Demonstrates

- **Pipeline pattern** — linear chain where each agent's output feeds the next
- **Specialist agents** — each has its own file, system prompt, model, and temperature
- **`reset()`** — agents clear history between properties (no cross-contamination in pipelines)
- **Structured deliverables** — output is something you'd actually send to a customer
- **Production-ready architecture** — swap the stubs for real APIs and this is a real business

## Files

```
curb.js              — pipeline orchestration, main loop
properties.js        — simulated crawler output (5 sample properties)
export.js            — timeline → markdown report
agents/
  crawler.js         — Google Maps Street View fetcher (stub)
  scanner.js         — Gemini vision analyzer (stub)
  inspector.js       — finds issues, ranks severity
  estimator.js       — prices fixes, calculates ROI
  writer.js          — homeowner letter + contractor brief
  qualifier.js       — lead scoring + action recommendation
```

# Chorus

Four primitives for multi-agent LLM systems:

- **Agent** — message queue + LLM. `queue()`, `send()`, `ask()`.
- **Bus** — pub/sub event routing between agents.
- **Timeline** — append-only event log for replay and export.
- **Session** — shared state persistence with audit trail.

Zero dependencies. File-first by default. Bring your own backend if you want.

- Mix models freely — OpenAI, Anthropic, xAI, Gemini, Ollama
- Append-only JSONL persistence — debuggable and crash-safe
- Parallel by default — each agent owns its own state
- Hooks + governance for observability, budgets, and compliance

---

## 30 Seconds

```js
import { Agent, loadProviders } from './index.js';

await loadProviders({
  anthropic: { apiKey: process.env.ANTHROPIC_API_KEY, models: { sonnet: 'claude-sonnet-4-6' }, enabled: ['sonnet'] },
});

const agent = new Agent({ id: 'assistant', systemPrompt: 'You are helpful.', model: 'sonnet' });
console.log(await agent.ask('What is the capital of France?'));
```

One agent. One model. Done.

---

## What It Looks Like

A lead generation pipeline that turns public data into qualified contractor leads:

```js
import { Agent, loadProviders } from './index.js';

await loadProviders({ /* your providers */ });

const inspector = new Agent({ id: 'inspector', systemPrompt: 'You are a veteran home inspector...', model: 'grok' });
const estimator = new Agent({ id: 'estimator', systemPrompt: 'You are a cost estimator...', model: 'sonnet' });
const writer    = new Agent({ id: 'writer',    systemPrompt: 'You are a direct-response copywriter...', model: 'opus' });
const qualifier = new Agent({ id: 'qualifier', systemPrompt: 'You are a lead qualifier...', model: 'haiku' });

// Pipeline: each agent's output feeds the next
const inspection    = await inspector.ask(propertyBrief);
const estimate      = await estimator.ask(inspection);
const outreach      = await writer.ask(`${inspection}\n\n${estimate}`);
const qualification = await qualifier.ask(`${inspection}\n\n${estimate}\n\n${outreach}`);
```

Four agents, four models, one pipeline. Inspector finds problems, Estimator prices fixes, Writer crafts a personalized letter, Qualifier scores the lead. See the full [Curb Appeal example](examples/curb-appeal/) for the production-ready version.

Or three agents debating a stock:

```js
const bull = new Agent('bull', 'Argue why AAPL is a buy. Cite data.', { model: 'grok' });
const bear = new Agent('bear', 'Argue why AAPL is overvalued. Cite risks.', { model: 'mini' });
const pm   = new Agent('pm', 'Listen to both, then decide: BUY, HOLD, or SELL.', { model: 'sonnet' });

const bus = new Bus();
bus.on('research', ({ from, content }) => {
  for (const a of [bull, bear, pm]) if (a.id !== from) a.queue(`${from}: ${content}`);
});

for (let i = 0; i < 3; i++) {
  bus.emit('research', { from: 'bull', content: await bull.ask('Make your case.') });
  bus.emit('research', { from: 'bear', content: await bear.ask('Respond.') });
}

const verdict = await pm.ask('What is your position? BUY, HOLD, or SELL.');
```

### Examples

| Example | Agents | Pattern | Key Capability |
|---------|--------|---------|----------------|
| **[Curb Appeal](examples/curb-appeal/)** | 4 specialists | Pipeline | Lead gen, structured deliverables, production pattern |
| **[Poker](examples/poker/)** | 5 players | Adversarial | Private state, bluffing, game engine |
| **[Jury](examples/jury/)** | 12 jurors | Consensus | Large groups, opinion shifts, persuasion |
| **[Lemonade](examples/lemonade/)** | 3 kids | Cooperative | Shared resources, coordination tax, adaptation |
| **[Debate](examples/debate/)** | 3 debaters | Competitive | Argumentation, voting |

**Curb Appeal** is the most practical — it shows a complete revenue-generating pipeline using public data and specialized agents.

---

## Why Not LangGraph / CrewAI / AutoGen?

Those are platforms with their own opinions about orchestration, persistence, and agent lifecycles.

Chorus is a library. No runtime, no server, no config files. You write the engine loop. You decide the turn order. You control what agents see and when. Chorus gives you reliable plumbing — message queues, event routing, append-only logs, and a provider registry.

Platforms give you agents that work *their* way. Chorus gives you primitives to build agents that work *your* way.

---

## Core Primitives

### Agent

A message queue with an LLM consumer.

```js
const agent = new Agent({
  id: 'analyst',
  systemPrompt: 'You are a senior equity research analyst.',
  model: 'sonnet',
  dataDir: 'data',
  timeline: tl,
});

// One-shot
const response = await agent.ask('What is your view on AAPL?');

// Multi-message: accumulate context, then flush
agent.queue('AAPL revenue: $94.9B (+5% YoY)');
agent.queue('MSFT revenue: $65.6B (+16% YoY)');
const comparison = await agent.send();
```

**Core methods:**
- `ask(msg)` — queue + send in one call (most common)
- `queue(msg)` — add message without calling LLM
- `send()` — flush queue and get response
- `pin(msg)` — permanent context that survives compaction
- `compact(fn, keep?)` — you control summarization
- `reset()` — clear history to system prompt (for pipeline agents)

**Subclass** for custom behavior:

```js
class ResearchAnalyst extends Agent {
  async onMessage(msg) {
    this.queue(msg);
    if (msg.startsWith('analyze:')) {
      const response = await this.send();
      this.bus.emit('research', { from: this.id, content: response });
    }
  }
}
```

**Hooks** — intercept the lifecycle:

| Hook | When | Receives | Return |
|------|------|----------|--------|
| `beforeSend` | Before LLM call | `messages[]` | Modified messages |
| `afterSend` | After LLM responds | `text` | Modified text |
| `onError` | Provider throws | `Error` | Fallback string, or rethrow |
| `governance` | Before LLM call | `{ agent, model, messages, opts, usage }` | Throw to block |
| `beforeQueue` | Every `queue()` call | `content` | Modified content, or `null` to suppress |

### Bus

Pub/sub event routing (~50 lines):

```js
const bus = new Bus();
bus.on('research', (msg) => console.log(`${msg.from}: ${msg.content}`));
bus.on('*', (event, data) => console.log(`[${event}]`, data));
bus.once('done', () => console.log('finished'));
bus.emit('research', { from: 'bull', content: 'AAPL looks strong' });
```

### Timeline & Session

```js
const tl = new Timeline('data/timeline.jsonl');
tl.emit('decision', { agent: 'pm', verdict: 'BUY' });
tl.byType('decision');   tl.byAgent('pm');   tl.last(10);

const session = new Session('data/state.json');
session.update(s => ({ ...s, round: s.round + 1 }));
session.log({ event: 'rebalance', reason: 'Bull thesis accepted' });
```

### Governance

Budget caps, rate limits, content filters — applied across all agents:

```js
const gov = new Governance({ audit: new Timeline('data/audit.jsonl') });
gov.budget({ maxCostUsd: 5, costPerInputToken: 0.003/1000, costPerOutputToken: 0.015/1000 });
gov.rateLimit({ maxCallsPerMinute: 20 });
gov.filter((content) => content.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN REDACTED]'));
gov.apply(inspector, estimator, writer, qualifier);
```

---

## Bring Your Own Backend

**Providers** — register once, reference by alias:

```js
await loadProviders({
  anthropic: { apiKey: '...', models: { sonnet: 'claude-sonnet-4-6' }, enabled: ['sonnet'] },
  xai: { apiKey: '...', models: { grok: 'grok-4.20-0309-non-reasoning' }, enabled: ['grok'] },
});
```

Add your own by extending `BaseProvider` (Ollama, Azure, local models).

**Persistence** — everything defaults to JSONL on disk. Swap in Postgres, Kafka, Redis via the 5-method `Store` interface:

```js
class PostgresStore extends Store {
  append(line)  { db.query(`INSERT INTO ${this.table} (data) VALUES ($1)`, [line]); }
  read()        { return db.query(`SELECT data FROM ${this.table} ORDER BY id`).rows.map(r => r.data); }
  write(lines)  { /* ... */ }
  exists()      { /* ... */ }
  clear()       { /* ... */ }
}
```

**Your existing stack:**

| You have | Chorus gives you |
|----------|-----------------|
| Datadog / Prometheus | `afterSend` hook — emit tokens, latency, cost per call |
| Postgres / Redis / Kafka | `Store` interface — 5 methods for full persistence swap |
| Airflow / Temporal | Session JSON checkpoints between pipeline steps |
| ELK / Splunk | Timeline JSONL ships as-is — one JSON event per line |

---

## Patterns

The framework doesn't enforce architecture. These emerge from combining the primitives:

- **Pipeline** — Inspector → Estimator → Writer → Qualifier ([Curb Appeal](examples/curb-appeal/))
- **Generator → Evaluator** — draft, critique, iterate
- **Planner → Workers** — decompose tasks, synthesize results
- **Social Simulation** — debate, negotiation, consensus ([Jury](examples/jury/), [Lemonade](examples/lemonade/))

---

## Use Cases

- Lead generation and automated outreach
- Investment research and debate systems
- Product QA with persona agents
- Risk and scenario simulation
- Regulatory compliance auditing
- Training data generation

---

## Design

Chorus stays deliberately thin. Read [DESIGN.md](DESIGN.md) for the full rationale. See [MODEL_NOTES.md](MODEL_NOTES.md) for observations on how different LLMs behave in multi-agent systems.

### Principles

1. **Agent = queue + LLM.** Everything else is your decision.
2. **Thin middleware.** Bus is 50 lines. Logic lives in your engine loop.
3. **Append-only.** Conversations grow as JSONL. Full history always recoverable.
4. **Provider-agnostic.** Switch models by changing a string.
5. **Everything is a file.** Inspect with `cat`. Debug by reading JSONL. Or swap in any Store.
6. **Zero dependencies.** Native `fetch`, `fs`, `crypto`. No SDK lock-in.
7. **Parallel by default.** Each agent owns its state. Run N concurrently.

---

Made with curiosity and a healthy respect for tokens.

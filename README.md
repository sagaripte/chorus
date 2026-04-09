# Chorus

Build multi-agent LLM systems on your existing stack — or no stack at all.

Four primitives. Zero dependencies. Plug into Postgres, Kafka, Datadog, Airflow — or just use the filesystem. Chorus gives you the thinnest possible layer between LLM APIs and agents that collaborate, and gets out of the way.

```
Your Application (engine, rules, turns)
    │          │          │          │
 Agent      Bus      Timeline   Session
 (JSONL)  (pub/sub)  (event log) (state)
    │
 Registry ─── xAI / Anthropic / OpenAI / Ollama / ...
```

- Zero dependencies — just native Node.js
- Mix models from different providers in the same system
- File-first persistence (JSONL) — inspect with `cat`, resume instantly
- Bring your own backend via a 5-method `Store` interface
- Full conversation history with intelligent compaction
- Pub/sub messaging + immutable event timeline
- Hooks for observability, compliance, cost tracking
- Append-only everywhere — nothing is ever silently lost
- Parallel by default — each agent owns its state, run N concurrently

**Who it's for:** AI researchers studying emergent behavior. Fintech teams building analyst simulations. Game developers building NPC social systems. Companies running multi-agent testing. Anyone curious about what happens when you put 6 LLMs in a room together.

---

## What It Looks Like

A bull and a bear argue a stock. A portfolio manager listens, then decides.

```js
import { Agent, Bus, Timeline, loadProviders } from './index.js';

await loadProviders({
  openai: { apiKey: process.env.OPENAI_API_KEY, models: { mini: 'gpt-4.1-mini' }, enabled: ['mini'] },
  anthropic: { apiKey: process.env.ANTHROPIC_API_KEY, models: { sonnet: 'claude-sonnet-4-6' }, enabled: ['sonnet'] },
  xai: { apiKey: process.env.XAI_API_KEY, models: { grok: 'grok-4.20-0309-non-reasoning' }, enabled: ['grok'] },
});

const bus = new Bus();
const tl = new Timeline('data/timeline.jsonl');
const opts = { dataDir: 'data', timeline: tl };

// Three agents, three providers — mix models freely
const bull = new Agent('bull', 'You are a bull analyst. Argue why AAPL is a buy. Cite data. 2-3 sentences.', { ...opts, model: 'grok' });
const bear = new Agent('bear', 'You are a bear analyst. Argue why AAPL is overvalued. Cite risks. 2-3 sentences.', { ...opts, model: 'mini' });
const pm = new Agent('pm', 'You are a portfolio manager. Listen to both analysts, then give your verdict with reasoning.', { ...opts, model: 'sonnet' });

// When someone speaks, others hear
bus.on('research', ({ from, content }) => {
  for (const a of [bull, bear, pm]) if (a.id !== from) a.queue(`${from}: ${content}`);
});

// 3 rounds of debate
for (let i = 0; i < 3; i++) {
  bus.emit('research', { from: 'bull', content: await bull.ask('Make your case.') });
  bus.emit('research', { from: 'bear', content: await bear.ask('Respond and make your case.') });
}

// PM decides
const verdict = await pm.ask('Based on what you heard, what is your position? BUY, HOLD, or SELL. Explain.');
```

Three agents, three different LLMs, real debate. Timeline logs every response automatically. Every conversation is recoverable. Swap any model by changing one string.

### Examples

- **[examples/debate/](examples/debate/)** — 3 agents argue a topic and vote on the winner (~100 lines)
- **[examples/poker/](examples/poker/)** — 5 agents play Texas Hold'em with private hands, bluffing, and table talk. Shows private state, `ask()`, Bus for public chat, and the separation of LLM decisions from procedural game rules. [Read the transcript →](examples/poker/data/poker.md)

---

## Why Not [X]?

Most agent platforms are opinionated. They manage your agents for you: control the flow, own the context, handle persistence their way.

Chorus is for when you want multi-agent capabilities without a second operations stack. Agent platforms bring their own persistence, observability, and orchestration — now you're running two of everything. Chorus is just the agent layer. Everything else flows through what you already have.

---

## Core Primitives

### Agent

A message queue with an LLM at the end:

- **`queue(msg)`** — append to conversation (no LLM call)
- **`send()`** — flush conversation to LLM, get response
- **`ask(msg)`** — queue + send in one call

Messages accumulate passively. The LLM only fires when you call `send()`. Pass a `timeline` to auto-log every response.

```js
const analyst = new Agent('analyst', 'You are a senior equity research analyst covering US tech.', {
  model: 'sonnet',
  dataDir: 'data',
  timeline: tl,       // auto-logs every send() to timeline
});

// One-shot: ask() = queue + send
const response = await analyst.ask('AAPL reported Q3: revenue $94.9B (+5% YoY). What is your updated view?');

// Multi-message: queue context, then send
analyst.queue('AAPL reported Q3: revenue $94.9B (+5% YoY), services $24.2B (+14%)');
analyst.queue('MSFT reported Q3: revenue $65.6B (+16% YoY), Azure $38.9B (+33%)');
analyst.queue('Compare both. Which is the better buy?');
const comparison = await analyst.send();
```

**Subclassing** — Override `onMessage()` to encapsulate behavior:

```js
class ResearchAnalyst extends Agent {
  constructor(name, coverage, bus, opts) {
    super(name, `You are ${name}, covering ${coverage}. Cite data. Be specific.`, opts);
    this.bus = bus;
  }

  async onMessage(msg) {
    this.queue(msg);
    if (msg.startsWith('analyze:')) {
      const response = await this.send();
      this.bus.emit('research', { from: this.id, content: response });
      return response;
    }
    if (this.messageCount > 100) {
      await this.compact(async (old) =>
        old.filter(m => m.role === 'assistant').map(m => m.content).join('\n')
      );
    }
  }
}
```

**Conversation storage** — Each agent gets an append-only JSONL file. On `send()`, the LLM sees the full history. After compaction, old messages move to an archive — never deleted.

**Pinned messages** — Survive compaction forever. Use for identity, mandates, anything that must always be in context:

```js
agent.pin('Client mandate: no fossil fuel exposure. ESG score minimum BBB.');
agent.pin('Your coverage universe: AAPL, MSFT, GOOGL, AMZN, META');
```

**Compaction** — You decide when and how. The framework does the file surgery:

```js
await agent.compact(
  async (oldMessages) => {
    return oldMessages.filter(m => m.role === 'assistant')
      .map(m => m.content.substring(0, 100)).join('\n');
  },
  40 // keep 40 recent messages
);
// Result: system prompt → pinned → summary → recent
```

**Hooks** — Intercept the agent lifecycle. Piped — each return feeds into the next:

| Hook | When | Receives | Return |
|------|------|----------|--------|
| `beforeSend` | Before LLM call | `messages[]` | Modified messages |
| `afterSend` | After LLM responds | `text` | Modified text |
| `onError` | Provider throws | `Error` | Fallback string, or rethrow |
| `beforeQueue` | Every `queue()` call | `content` | Modified content, or `null` to suppress |
| `afterCompact` | After compaction | `summary` | (informational) |

```js
// Inject compliance reminder before every LLM call
agent.hook('beforeSend', (msgs) => [...msgs, { role: 'user', content: '[Remember: client mandate prohibits fossil fuel exposure]' }]);

// Track token spend per agent
agent.hook('afterSend', (text) => { logCost(agent.id, agent.totalUsage); return text; });
```

**Full API:**

```
Agent
├── queue(msg)              append to conversation
├── send(opts?)             flush to LLM, return response
├── ask(msg, opts?)         queue + send in one call
├── pin(msg)                append, survives compaction
├── compact(fn, keep?)      summarize old messages
├── onMessage(msg)          override this (default: queue)
├── hook(name, fn)          lifecycle callbacks
├── messageCount            count (excluding system)
├── totalUsage              { input, output, cached, calls }
├── Agent.parseJSON(text)   extract JSON from LLM text
│
│  Options
├── opts.timeline           auto-log every send() to Timeline
├── opts.store              custom Store backend
└── opts.model              model alias from registry
```

### Bus

Simple pub/sub event routing (~40 lines):

```js
const bus = new Bus();
bus.on('research', (msg) => console.log(`${msg.from}: ${msg.content}`));
bus.on('*', (event, data) => console.log(`[${event}]`, data));  // wildcard
bus.emit('research', { from: 'bull', content: 'AAPL FCF yield is 3.8% — still attractive.' });
```

The bus is the entire middleware layer. Routing logic is yours — the bus just delivers.

### Timeline

Append-only JSONL event log. Each line: `{ id, ts, type, ...payload }`.

```js
const tl = new Timeline('data/timeline.jsonl');
tl.emit('research', { from: 'bull', content: 'Reiterate BUY, PT $230.' });
tl.emit('decision', { from: 'pm', content: 'Adding 200bps to AAPL.' });

tl.getAll();           tl.byType('research');
tl.byAgent('bull');    tl.last(10);
```

### Session

JSON state persistence with functional updates:

```js
const session = new Session('data/state.json');
session.load();
session.set({ quarter: 'Q3-2026', portfolio: { AAPL: 0.052, MSFT: 0.048 } });
session.update(s => ({ ...s, portfolio: { ...s.portfolio, AAPL: 0.072 } }));
session.log({ event: 'rebalance', reason: 'Bull thesis accepted' });
```

---

## Bring Your Own Backend

### Providers

Register model aliases. Agents reference the alias — switch LLMs by changing one string. Each provider handles its own caching: xAI pins conversations for prefix cache hits, Anthropic uses cache breakpoints, OpenAI handles it automatically.

Add your own by extending `BaseProvider`:

```js
class OllamaProvider extends BaseProvider {
  async send(id, model, messages, opts = {}) {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST', body: JSON.stringify({ model, messages }),
    });
    return { text: (await res.json()).message.content, usage: {} };
  }
}
```

### Persistence

Everything defaults to files on disk (JSONL). Agent, Timeline, and Session all accept a custom `Store` — swap in Postgres, Kafka, S3, Redis, whatever you run.

```js
import { Store } from './index.js';

class PostgresStore extends Store {
  constructor(table) { super(); this.table = table; }
  append(line)  { db.query(`INSERT INTO ${this.table} (data) VALUES ($1)`, [line]); }
  read()        { return db.query(`SELECT data FROM ${this.table} ORDER BY id`).rows.map(r => r.data); }
  write(lines)  { db.query(`DELETE FROM ${this.table}`); lines.forEach(l => this.append(l)); }
  exists()      { return db.query(`SELECT 1 FROM ${this.table} LIMIT 1`).rows.length > 0; }
  clear()       { db.query(`DELETE FROM ${this.table}`); }
}

const tl = new Timeline(new PostgresStore('events'));
const session = new Session(new PostgresStore('state'));
const agent = new Agent('analyst', prompt, { store: new PostgresStore('analyst_conv'), model: 'sonnet' });
```

The `Store` interface — 5 methods: `append(line)`, `read()`, `write(lines)`, `exists()`, `clear()`. String paths are auto-wrapped in `FileStore`. Existing code doesn't change.

### Your Existing Stack

| You already have | Chorus gives you |
|------------------|-----------------|
| **Datadog / Prometheus** | `afterSend` hook — emit tokens, latency, cost per call. Bus wildcard captures all inter-agent traffic. |
| **Postgres / Redis / Kafka** | `Store` interface — 5 methods. Agent, Timeline, Session all accept it. |
| **Airflow / Temporal** | Each round is a shell command. Session JSON checkpoints between steps. |
| **ELK / Loki / Splunk** | Timeline JSONL ships as-is — one JSON event per line. No transformation. |
| **Express / Fastify** | WebSocket the bus for live updates. Session persists between requests. |

Adopting Chorus doesn't mean adopting a platform. It's library code that produces files and events your existing tools already know how to consume.

---

## Patterns

The framework doesn't enforce any architecture. These emerge from combining the primitives.

### Generator → Evaluator

One agent produces, another critiques. The evaluator scores against criteria, the generator iterates on feedback.

```js
const drafter = new Agent('drafter', 'Draft investment memos for institutional clients.', opts);
const reviewer = new Agent('reviewer', 'Review memos for accuracy, regulatory compliance, and clarity. Be critical.', opts);

for (let i = 0; i < 3; i++) {
  drafter.queue(i === 0 ? `Write a memo on AAPL Q3 results for ${clientProfile}` : `Reviewer feedback:\n${feedback}`);
  const memo = await drafter.send();
  reviewer.queue(`Draft ${i + 1}:\n${memo}\nScore accuracy, compliance, clarity (1-10). List issues.`);
  feedback = await reviewer.send();
}
```

### Planner → Workers

A supervisor decomposes a task, delegates to specialists with narrow context. Each worker sees only what it needs. The planner synthesizes results.

```js
const pm = new Agent('pm', 'Decompose portfolio reviews into research tasks.', opts);
const equity = new Agent('equity', 'Analyze equity positions. Data and risks only.', opts);
const compliance = new Agent('compliance', 'Check positions against client mandates.', opts);

pm.queue('Prepare CLI_XYZ quarterly review — focus on AAPL and MSFT exposure.');
const tasks = Agent.parseJSON(await pm.send());

for (const task of tasks) {
  const worker = task.type === 'compliance' ? compliance : equity;
  worker.queue(task.description);
  const result = await worker.send();
  pm.queue(`${task.type} result:\n${result}`);
}
const review = await pm.send();  // PM synthesizes
```

### Social Simulation

N agents interact freely — alliances, competition, negotiation. Bus routes public and private channels. Engine loop controls pacing.

```js
bus.on('public', (msg) => {
  for (const a of agents) if (a.id !== msg.from) a.queue(`${msg.from}: ${msg.content}`);
});
bus.on('private', (msg) => {
  agents.find(a => a.id === msg.to)?.queue(`[DM from ${msg.from}]: ${msg.content}`);
});

for (const agent of agents) {
  const response = await agent.send();
  parseAndRoute(response, bus);
}
```

### Context Reset

For long-running tasks where context fills up: create a fresh agent with a structured handoff instead of compacting. Clean slate, no drift.

```js
const handoff = {
  analyzed: ['AAPL', 'MSFT', 'GOOGL'],
  pending: ['AMZN', 'META'],
  key_findings: ['AAPL services growth accelerating', 'MSFT AI capex concerning'],
};

const next = new Agent('analyst-v2', systemPrompt, opts);
next.pin(`Handoff from previous session:\n${JSON.stringify(handoff, null, 2)}`);
next.queue('Continue analysis from where the previous session left off.');
```

---

## Use Cases

| Domain | How |
|--------|-----|
| **Investment research** | Bull/bear agents debate a thesis. PM agent synthesizes. Compliance agent checks mandates. Timeline is the audit trail. |
| **Risk simulation** | Agents role-play market scenarios — rate hikes, geopolitical shocks, liquidity events. Session tracks which portfolios survive. |
| **Client QA** | 50 persona agents (aggressive trader, conservative retiree, institutional PM) test your advisory product. Bus routes conversations. |
| **Regulatory review** | Agents probe a product for compliance gaps across jurisdictions. Hooks log every LLM call for audit. |
| **Training data** | Analyst agents produce multi-turn research dialogue. Export timeline JSONL as training pairs for fine-tuning. |
| **Prompt A/B testing** | Same scenario, different system prompts. Fan out 100 runs, diff the timelines programmatically. |

---

## Design

Chorus stays deliberately thin. Read [DESIGN.md](DESIGN.md) for the full rationale — why append-only JSONL, why message-queue semantics, why the framework avoids application logic.

### Principles

1. **Agent = queue + LLM.** Two methods. Everything else is your decision.
2. **Thin middleware.** Bus is 40 lines. Logic lives in prompts and your engine loop.
3. **Append-only.** Conversations grow as JSONL. Full history always recoverable.
4. **Provider-agnostic.** Switch models by changing a string.
5. **Everything is a file.** Inspect with `cat`. Resume by restarting. Debug by reading JSONL. Or swap in any Store.
6. **Zero dependencies.** Native `fetch`, `fs`, `crypto`. No SDK lock-in.
7. **Parallel by default.** Each agent owns its state — no shared memory. Run N agents concurrently.

### What the framework doesn't do

- **No application logic.** Turns, phases, voting, scoring — that's your engine.
- **No message routing.** The bus delivers. Your engine decides who hears what.
- **No prompt design.** System prompts, personas, protocols — your application.
- **No scheduling.** Who speaks when, how often — your engine.
- **No opinion on triggers.** What constitutes a "turn" — the subclass decides.

### Prior Art

| Pattern | Origin | Role in Chorus |
|---------|--------|----------------|
| Pub/sub messaging | MQTT (1999), Redis | Bus — event routing between agents |
| Append-only logs | Kafka, journald | Timeline + conversation files — immutable event history |
| Log compaction | Kafka | `compact()` — summarize old messages, keep recent |
| JSONL structured logging | Splunk, ELK | All persistence — one JSON object per line, greppable, shippable |
| Actor model | Erlang (1986), Akka | Agent — independent state, message-driven, no shared memory |
| Conversation-as-context | ChatML, OpenAI API | Agent — growing message array as the unit of LLM interaction |

---

Made with curiosity and a healthy respect for tokens.

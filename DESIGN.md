# Design Notes

Chorus is intentionally minimal. It gives you four powerful primitives and then gets completely out of your way. Everything else — turns, voting, routing logic, orchestration — belongs in **your application code**.

## Core Mental Model

An **Agent** is simply **a message queue with an LLM as the consumer**.

```
Producers (bus, engine, other agents, timers, etc.)
    │
    ▼
┌──────────────────────────────┐
│     Agent's JSONL file       │
│                              │
│  system prompt               │  ← always present
│  pinned messages             │  ← survive compaction forever
│  [compact summary]           │  ← replaces old history when needed
│  user messages...            │
│  assistant messages...       │
│  new queued messages         │  ← added via queue()
└──────────────┬───────────────┘
               │
            send()
               │
               ▼
            LLM call
               │
               ▼
     New assistant message appended
```

This design maps closely to familiar messaging concepts, but with one key difference: **messages are never deleted** after consumption. The LLM needs the full conversation history (or a compacted version of it) to maintain coherent behavior. This is closer to **Kafka log compaction** than traditional queue consumption.

### Queue Concepts in Chorus

| Traditional Queue Concept     | Chorus Equivalent                          |
|-------------------------------|--------------------------------------------|
| Enqueue                       | `queue()`                                  |
| Persistent storage            | JSONL file (or custom `Store`)             |
| Consumer pull                 | `send()`                                   |
| Enqueue + consume             | `ask()` — queue + send in one call         |
| Message listener              | `onMessage()` (subclass decides behavior)  |
| Sticky / priority messages    | `pin()`                                    |
| Log compaction                | `compact(fn, keep)`                        |
| Error handling                | `[ERROR: ...]` written as assistant msg    |

---

## Why This Shape?

### Why append-only JSONL?

- Survives crashes and restarts gracefully
- Fully debuggable (`cat data/agent-id.jsonl`)
- Human-inspectable and greppable
- Easy to ship to any logging or analytics system
- No hidden database or server process required

### Why `onMessage()` instead of many lifecycle hooks?

Early versions used separate hooks for every decision point. This led to fragile ordering and scattered logic.

`onMessage()` gives you **one clear place** to decide what an agent should do when it receives a message:

```js
async onMessage(msg) {
  this.queue(msg);                    // always accumulate

  if (msg.startsWith('analyze:')) {
    const response = await this.send();
    this.bus.emit('research', { from: this.id, content: response });
    return response;
  }

  if (this.messageCount > 120) {
    await this.compact(summarizeOldMessages, 40);
  }
}
```

This mirrors the classic `MessageListener` pattern from JMS and similar systems — one method, full control.

### Why `ask()` instead of just `queue()` + `send()`?

Most agent interactions are one-shot: send a message, get a response. `ask(msg)` is syntactic sugar for `queue(msg); return send()` — but it matters because it makes the common case a single call:

```js
const verdict = await pm.ask('What is your position? BUY, HOLD, or SELL.');
```

The two-step `queue()` / `send()` pattern exists for when you need to accumulate multiple messages before triggering an LLM call — batch context, then flush. `ask()` handles the other 80% of interactions.

### Why a pluggable `Store`?

The default `FileStore` (JSONL on disk) is good enough for prototyping, local development, and many production workloads. But some teams already run Postgres, Kafka, or Redis — they don't want a second persistence layer.

The `Store` interface is 5 methods: `append(line)`, `read()`, `write(lines)`, `exists()`, `clear()`. Agent, Timeline, and Session all accept a Store. String paths auto-wrap in FileStore, so existing code doesn't change when you add a custom backend.

### Why is compaction manual?

The framework cannot know:
- What makes a good summary for *your* domain
- Whether to use an LLM, rule-based extraction, or simple truncation
- The right threshold (messages? tokens? time?)
- When it's safe to compact (mid-turn vs natural breakpoint)

You call `compact()` when and how you want. The framework only handles the file surgery and guarantees pinned messages survive.

### Why `pin()`?

Some context must **never** be summarized away:
- Agent identity and role
- Client mandates or hard constraints
- Access rules or permissions
- Persistent goals

`pin()` makes this explicit instead of the framework guessing based on message content.

### Why hooks?

Hooks handle **cross-cutting concerns** that apply to all agents:
- Logging token usage
- Injecting compliance reminders
- Rate-limit retry logic
- Cost tracking
- Input/output filtering
- Governance — budget enforcement, access control, audit logging

These concerns shouldn't be duplicated in every `onMessage()` implementation. Hooks keep them orthogonal and reusable.

Supported hooks: `beforeSend`, `afterSend`, `onError`, `beforeQueue`, `afterCompact`, `governance`.

### Why a `governance` hook?

Enterprise teams need budget caps, content policies, rate limits, access control, and audit trails — but the right implementation depends entirely on their stack (Postgres, Redis, RBAC system, etc.). The `governance` hook fires after `beforeSend` builds the final message array and before the LLM call. It receives full context:

```js
agent.hook('governance', ({ agent, model, messages, opts, usage }) => {
  if (usage.input + usage.output > 1_000_000) throw new Error('Token budget exceeded');
  auditLog.write({ agent, model, messageCount: messages.length, ts: Date.now() });
});
```

Throw to block the call. The framework catches it through the normal error path — `onError` hooks can provide a fallback response, or the error propagates to the caller. Nothing is implemented by default — the hook is just a well-placed gate for teams that need it.

---

## Concurrency

Agents within a turn can run in parallel via `Promise.all()` because:

1. Each agent has its own JSONL file (or Store) — no shared mutable state.
2. `queue()` is append-only — concurrent appends don't conflict.
3. Agents see the **pre-turn** state (messages queued before the turn started). Their responses emit onto the bus after completion, cross-pollinating for the next turn.

Sequential turns would be more realistic (agent 3 sees agent 1's response within the same round) but parallel is Nx faster. The tradeoff is acceptable for most simulations — within a single turn, agents respond to the same snapshot.

---

## Engine as Message Broker

The `Bus` is deliberately simple — just a permissionless pub/sub.

**Important pattern:**

> Agents should **never** listen directly to the bus.
> The engine (your application code) subscribes to events and routes messages to the appropriate agents.

This keeps agents pure and focused while giving you full control over routing, permissions, and message flow in one place.

Example channel model:

| Channel       | Producers              | Subscribers                     | Visibility   |
|---------------|------------------------|---------------------------------|--------------|
| research      | Any analyst            | Other analysts + PM             | Public       |
| private       | Any agent              | Specific recipient              | Private      |
| decision      | PM only                | All analysts                    | Broadcast    |
| compliance    | Compliance agent       | PM only                         | Private      |
| vote          | Any agent              | Engine (for tallying)           | Private      |

The `Timeline` captures everything for audit, replay, and analysis. The `Bus` supports wildcard listeners (`*`) for cross-cutting concerns like logging all inter-agent traffic.

---

## Provider Design

Chorus uses a lightweight adapter pattern. Each provider manages its own caching strategy:

- **xAI** — uses conversation pinning for prefix cache hits
- **Anthropic** — uses cache breakpoints on system + recent messages
- **OpenAI** — automatic prefix caching
- **Ollama / local** — easy to extend via `BaseProvider`

You register providers and model aliases once. Agents then reference simple aliases (`'grok'`, `'sonnet'`, `'mini'`). Switching models or providers requires changing only the registry — never the agent code.

---

## What Chorus Deliberately Does **Not** Do

- No built-in turns, phases, or orchestration engine
- No automatic message routing between agents
- No prompt engineering or persona management
- No scheduling or timing logic
- No opinion on what triggers an agent to speak

These decisions belong to **your application**. Chorus only provides reliable plumbing:
- Persistent message queues
- Clean LLM interaction
- Event transport
- Immutable history

This separation is intentional. It keeps the core small, predictable, and composable — while giving you maximum flexibility for any multi-agent pattern you want to build.

---

## Prior Art

| Concept                    | Origin                          | Role in Chorus                              |
|----------------------------|---------------------------------|---------------------------------------------|
| Pub/sub messaging          | MQTT, Redis Pub/Sub             | `Bus` — lightweight event routing           |
| Append-only logs           | Kafka, journald                 | Timeline + Agent conversation files         |
| Log compaction             | Kafka                           | `compact()` — summarize old, keep recent    |
| JSONL structured logging   | ELK, Splunk                     | All persistence formats                     |
| Actor model                | Erlang, Akka                    | Independent agents with private state       |
| Conversation-as-context    | ChatML / OpenAI Messages API    | Agent's growing message array               |

Chorus combines these established ideas into the thinnest possible foundation for building custom multi-agent LLM systems — where context management and token cost are the central constraints.

---

**Philosophy in one sentence:**

> Give developers powerful primitives and trust them to build the interesting parts themselves.

Made with respect for tokens, debuggability, and the joy of seeing many LLMs talk to each other.

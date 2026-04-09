# Debate Club

Three AI agents argue a topic, then vote on who made the best case. Demonstrates multi-agent interaction, bus-based message routing, and timeline logging.

## How it works

1. Three **debater** agents are assigned positions (for, against, devil's advocate)
2. Each debater makes their case over 3 rounds
3. Each debater votes for the best argument (can't vote for themselves)
4. The timeline records everything — arguments, votes, and the winner

## Run it

```bash
# Set your API key
export OPENAI_API_KEY=sk-...
# or ANTHROPIC_API_KEY=... or XAI_API_KEY=...

# Run the debate
node debate.js "Should AI systems be allowed to vote in elections?"
```

## What to notice

- Agents only see what's routed to them through the bus (no shared state)
- Each agent has its own conversation history on disk (JSONL)
- The timeline captures the full debate for replay
- Hooks could be added to filter profanity, enforce time limits, etc.

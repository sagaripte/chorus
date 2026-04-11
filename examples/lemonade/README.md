# Lemonade Stand

Three AI kids with very different personalities run a lemonade stand for 5 days.

Max wants premium pricing and maximum profit.
Lily wants low prices, free samples, and to make friends with every customer.
Jake would rather be playing video games and complains about walking anywhere.

They have real supplies, real weather, and real money on the line. If anyone disagrees on location, the whole team loses 10% of customers — arguing wastes setup time and scares people away.

## What Happened

No scripting. No hand-holding.

- Jake (Grok) refused to walk to the park **4 days in a row** → cost the team real revenue every single day
- Lily (Sonnet) went from "25 cents!!" to begging: *"I WILL CARRY YOUR BAG AND MAX WILL CARRY THE SUPPLIES SO YOU LITERALLY JUST HAVE TO WALK THERE!! 😭"*
- Max (Opus) started guilt-tripping and threatening to dock Jake's share of the profits
- On the rainy final day, they **finally all agreed**… on the corner

Final result: **$218 / $100 goal**, with 83 cups left over.

None of the drama, negotiation, or character development was scripted. It emerged naturally from personalities + economic feedback.

## Run It

```bash
node lemonade.js              # all kids on default model (sonnet)
node lemonade.js grok         # all kids on grok
node lemonade.js mixed        # Max→opus, Lily→sonnet, Jake→grok
```

## The Kids

| Name | Personality | Model (mixed) |
|------|-------------|---------------|
| **Max** | Serious about money. Pushes premium pricing. Gets frustrated when outvoted. | Opus |
| **Lily** | Wants everyone to try it. Low prices, free samples, emojis. Gets sad when people are turned away. | Sonnet |
| **Jake** | Would rather be gaming. Complains about everything. Votes corner every single day. | Grok |

## How It Works

Each day:
1. Weather + supplies announced
2. Kids debate price and location (3 rounds)
3. They vote using `ask()`
4. Engine simulates sales (pure code, no LLM)
5. Discord penalty applied if they disagreed on location
6. Everyone reacts in character

Sales depend on weather, location, price, and randomness. The LLMs only handle arguing and decisions.

## Results

| Day | Weather | Price | Location | Sold | Revenue | Discord | Total |
|-----|---------|-------|----------|------|---------|---------|-------|
| 1 | ☀️ Sunny | $1.00 | Park | 49 | $49.00 | Jake disagreed, -10% | $49.00 |
| 2 | ☀️🔥 Scorching | $1.50 | Park | 62 | $93.00 | Jake disagreed, -10% | $142.00 |
| 3 | ☁️ Overcast | $1.25 | School | 15 | $18.75 | Jake disagreed, -10% | $160.75 |
| 4 | ☀️ Sunny | $1.50 | Park | 37 | $55.50 | Jake disagreed, -10% | $216.25 |
| 5 | 🌧️ Rainy | $0.50 | Corner | 4 | $2.00 | None! | $218.25 |

## Pressure Escalation

| Day | What happened |
|-----|---------------|
| 1 | Max notices: "Jake's whining literally cost us customers" |
| 2 | Max guilt-trips: "you lost us 10% yesterday so you OWE us" |
| 3 | Max threatens: "I'm telling everyone at school it's YOUR fault" |
| 4 | Lily begs: "I WILL CARRY YOUR BAG AND MAX WILL CARRY THE SUPPLIES SO YOU LITERALLY JUST HAVE TO WALK THERE!! 😭🥺" |
| 5 | Max gives in — picks corner himself to avoid the penalty |

## Why This Works in Chorus

- **Bus** handles the multi-round debate
- **`ask()`** handles private votes and decisions
- **Timeline** captures every exchange for replay and export
- **Session** tracks supplies, revenue, and state across days
- Personalities live entirely in system prompts — no custom orchestration needed

This is the kind of emergent group behavior that's surprisingly hard in heavy pipeline frameworks. Simple primitives. Real personality. Real consequences.

Full transcript: [data/lemonade.md](data/lemonade.md)

## Files

```
lemonade.js  — main loop, debate, voting
market.js    — sales simulation (pure code)
export.js    — turns JSONL into markdown
```

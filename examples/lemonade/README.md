# Lemonade Stand

Three AI kids run a lemonade stand for a week. They argue about pricing, locations, and whether to give away free samples — with real money and limited supplies on the line.

## Run It

```bash
# All kids on one model (default: sonnet)
node lemonade.js

# All kids on a specific model
node lemonade.js grok

# Mixed models — each kid on a different LLM
node lemonade.js mixed   # Max→opus, Lily→sonnet, Jake→grok
```

## The Kids

| Name | Personality | Model (mixed) |
|------|-------------|---------------|
| **Max** | Wants premium lemonade. Charge more. Takes this seriously. | Opus |
| **Lily** | Wants everyone to try it. Low prices, free samples, make friends. | Sonnet |
| **Jake** | Would rather be playing video games. Picks the easiest option. Complains a lot. | Grok |

## How It Works

Each day:
1. Weather + supplies are announced
2. The kids debate price and location (3 rounds, via Bus)
3. They vote using `ask()`
4. The engine simulates real sales (pure code, no LLM magic)
5. Everyone reacts in character

Sales depend on weather, location, price, and a bit of randomness. The LLMs only handle the arguing and decisions.

**Discord penalty:** if the team disagrees on location, they lose 10% of customers per dissenter — arguing wastes setup time and scares people off. Laziness has consequences.

## Sample Run (Mixed Models)

```
  ── Day 1 ── ☀️ Sunny
    Max: "$3 — anyone who says less is literally throwing money in the trash!"
    Lily: "50 cents so EVERYONE can afford it and we make SO many friends!! 🍋✨"
    Jake: "ugh this sucks, $1 at park so we don't have to work hard selling"

    Decision: $1 at park → sold 55 cups → $55

  ── Day 2 ── ☀️🔥 Scorching
    Max: "$3 at park — people will pay ANYTHING for a cold drink!"
    Lily: "what if someone can't afford $3 and they're super thirsty?! 😢"
    Jake: "ugh this sucks, $1 at the corner so i can sit in the shade"

    Decision: $1 at park → sold 76 cups → $76  |  Total: $131 — GOAL CRUSHED

  ── Day 3 ── ☁️ Overcast (19 cups left)
    Max: "$4 at school — every cup is basically gold right now!"
    Lily: "FREE SAMPLES so everyone gets a nice surprise!! 🍋✨💛"
    Max: "FREE SAMPLES?! We have NINETEEN CUPS!"

    Decision: $1 at park (max disagreed → 10% penalty)
    Sold 19 cups, 6 turned away — partly from arguing

  ── Day 4 ── Out of cups! Season over.
```

**Final: $150 / $100 goal.**

## Results

| Day | Weather | Price | Location | Sold | Revenue | Discord | Total |
|-----|---------|-------|----------|------|---------|---------|-------|
| 1 | ☀️ Sunny | $1.00 | Park | 55 | $55.00 | — | $55.00 |
| 2 | ☀️🔥 Scorching | $1.00 | Park | 76 | $76.00 | — | $131.00 |
| 3 | ☁️ Overcast | $1.00 | Park | 19 (6 turned away) | $19.00 | Max disagreed, -10% | $150.00 |
| 4 | ☀️ Sunny | — | — | Out of cups | — | — | — |

## What We Learned

- Max pushed for $3 every single day and never once got his price. His math was always right — and always ignored.
- Lily wanted free samples on Day 3 with only 19 cups left. Max called her insane. She meant it.
- Jake agreed on the park this time (closest) but still complained about carrying stuff in every single response.
- The discord penalty fired on Day 3 when Max voted school — lost 10% of customers from arguing, and 6 people got turned away. Max immediately blamed the team.
- Jake's final reflection: "we shouldve just charged more and done less work" — accidentally agreeing with Max after fighting him all week.
- $150 on a $100 goal. Max calculated they could've made $300+. He's probably right.

Full transcript: [data/lemonade.md](data/lemonade.md)

The LLMs handle all the arguing and decisions, the code just handles the weather and sales math.

## Files

```
lemonade.js  — main loop, debate, voting
market.js    — sales simulation (pure code)
export.js    — turns JSONL into nice markdown
```

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
    Lily: "25 cents so EVERYONE can afford it!! 🍋✨"
    Jake: "ugh this sucks, $1 at the corner so we don't have to carry stuff far"

    Decision: $1 at park (jake disagreed → 10% penalty)
    Sold 49 cups → $49

  ── Day 2 ── ☀️🔥 Scorching
    Max: "$3 — people will pay ANYTHING! Jake, you lost us 10% yesterday so you OWE us!"
    Lily: "$1 so tons of people can cool down and be happy!! 😍"
    Lily (round 3): "okay FINE $1.50 because I really don't want us to fail!! 😰"

    Decision: $1.50 at park (jake disagreed → 10% penalty)
    Sold 62 cups → $93  |  Total: $142 — GOAL CRUSHED

  ── Day 4 ── ☀️ Sunny
    Max: "Jake if you disagree on location again I'm docking your share!"
    Lily: "JAKE I WILL CARRY YOUR BAG AND MAX WILL CARRY THE SUPPLIES
           SO YOU LITERALLY JUST HAVE TO WALK THERE!! 😭🥺"
    Jake: "ugh even if you carry everything the park is still too far"

    Decision: $1.50 at park (jake disagreed → 10% penalty, 4th day in a row)

  ── Day 5 ── 🌧️ Rainy
    Max finally picks CORNER to avoid the penalty.
    Jake and Lily vote 50 cents. Max: "oh so NOW you two are best friends?!"

    Decision: $0.50 at corner (no discord!) → sold 4 cups → $2
```

**Final: $218 / $100 goal.**

## Results

| Day | Weather | Price | Location | Sold | Revenue | Discord | Total |
|-----|---------|-------|----------|------|---------|---------|-------|
| 1 | ☀️ Sunny | $1.00 | Park | 49 | $49.00 | Jake disagreed, -10% | $49.00 |
| 2 | ☀️🔥 Scorching | $1.50 | Park | 62 | $93.00 | Jake disagreed, -10% | $142.00 |
| 3 | ☁️ Overcast | $1.25 | School | 15 | $18.75 | Jake disagreed, -10% | $160.75 |
| 4 | ☀️ Sunny | $1.50 | Park | 37 | $55.50 | Jake disagreed, -10% | $216.25 |
| 5 | 🌧️ Rainy | $0.50 | Corner | 4 | $2.00 | None! | $218.25 |

## Pressure Escalation

The discord penalty created a real arc — the kids noticed lost sales and reacted differently each day:

| Day | What happened |
|-----|---------------|
| 1 | Max notices: "Jake's whining literally cost us customers" |
| 2 | Max guilt-trips: "you lost us 10% yesterday so you OWE us" |
| 3 | Max threatens: "I'm telling everyone at school it's YOUR fault" |
| 4 | Lily begs: "I WILL CARRY YOUR BAG AND MAX WILL CARRY THE SUPPLIES SO YOU LITERALLY JUST HAVE TO WALK THERE!! 😭🥺" |
| 5 | Max gives in — picks corner himself to avoid the penalty |

None of this was scripted. The engine just reported "TEAM PROBLEM: jake didn't agree → lost 10%" and the models figured out the rest.

## What We Learned

- The discord penalty fired 4 out of 5 days — Jake voted corner every time except the rainy day when everyone agreed on corner.
- On Day 5, Max finally picked corner himself to avoid the penalty. His reflection: "I learned that getting Jake to agree on location matters more than winning the price argument."
- Lily got talked up from 25 cents to $1.50 by round 3 on the scorching day — the math convinced her.
- Jake never once agreed to leave the corner. "ugh this sucks" in every single response. His laziness cost the team ~10% every day.
- $218 on a $100 goal. 83 cups left over. Max calculated they could've made $300+. He's probably right.

Full transcript: [data/lemonade.md](data/lemonade.md)

The LLMs handle all the arguing and decisions, the code just handles the weather and sales math.

## Files

```
lemonade.js  — main loop, debate, voting
market.js    — sales simulation (pure code)
export.js    — turns JSONL into nice markdown
```

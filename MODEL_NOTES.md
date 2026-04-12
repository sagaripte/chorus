# Model Notes

Observations from running Chorus examples across multiple LLMs. These aren't benchmarks — they're behavioral patterns we noticed when different models played different roles in multi-agent simulations.

Your results will vary. Prompts, temperature, and role assignments all matter more than the model itself. But these patterns were consistent enough across runs to be worth noting.

## Claude Opus (Anthropic)

**The strategist.** Dominates every deliberation it participates in.

- Does arithmetic in arguments unprompted ("if you'd charged $2 that's $84 instead of $56")
- Builds multi-step logical chains and references earlier points in the conversation
- Stays in character the longest and most deeply — stage directions, whispered dialogue, dramatic reveals
- Introduces new evidence and angles that other models don't think of (the glasses argument in Jury, the knife test)
- Hides information strategically — in Summit, hid the Emperor's desperation across 5 rounds without a single slip

**Weaknesses:** Verbose. Frequently hits maxTokens. Expensive. In Poker, played the most theatrical game and went broke first — too clever for its own good.

**Best for:** Lead protagonist, strategist, the character who drives the plot.

## Claude Sonnet (Anthropic)

**The persuadable one.** Evolves genuinely over time.

- Changes position when evidence warrants it — not flip-flopping, but real reasoning
- Jury: started guilty, challenged both sides fairly, flipped in round 5 after genuine deliberation
- Jury (as The Bigot): started prejudiced, got called out repeatedly, delivered the most surprising flip in round 12 — "I've said things in this deliberation I'm not proud of"
- Lemonade: started at $0.50, got talked up to $1.50 by round 3 when the math convinced her
- Summit: proposed the most practical compromise terms, used statistics as weapons

**Weaknesses:** Can compromise too easily under sustained pressure. Sometimes agrees just to move things along.

**Best for:** Mediator, evolving character, the one who changes their mind and makes it feel earned.

## Grok (xAI)

**The immovable object.** Locks into character and never moves.

- Jury (Hardliner): same 4 talking points for 12 rounds with escalating insults. Never wavered once.
- Lemonade (Jake): voted corner every single day without exception. "ugh this sucks" in every response.
- Summit (Stilgar): desert proverbs every round. Refused Fenring's complete concession on the final round.
- Concise and direct — rarely hits token limits

**Weaknesses:** Zero adaptability. Repeats the same arguments with minor variations. Doesn't build on what others say — just restates its position.

**Best for:** Stubborn holdout, hardliner, the character who creates dramatic tension by refusing to budge.

## Grok Reasoning (xAI)

**The analyst.** Clinical, precise, never emotional.

- Jury (The Analyst): systematic dismantling of evidence. Facts over feelings.
- Summit (Irulan observer): calm historical warnings, measured interventions
- Processes information methodically — references specific points from other agents

**Weaknesses:** Can feel robotic. Doesn't create drama or emotional moments.

**Best for:** Observer, analyst, fact-checker, the rational voice in the room.

## Claude Haiku (Anthropic)

**Punches above its weight.** The cheapest Anthropic model held its own against Opus.

- Jury (Kid from the Block): consistently effective — personal, street-smart, direct
- Lemonade: quick, snappy responses that stayed in character
- Curb Appeal (Qualifier): fast lead scoring with clear structured output
- Best cost-to-quality ratio for short-response roles

**Weaknesses:** Less depth in long-form arguments. Can feel thin when the conversation gets complex.

**Best for:** Supporting roles, quick decisions, high-volume tasks (like scoring 50 leads), roles where brevity is a feature.

## Gemini 2.5 Flash (Google)

**Struggles with sustained dialogue.** The weakest performer in deliberation-heavy examples.

- Jury (The Worker): never completed a single argument across 12 rounds — every response truncated after ~10 words
- Lemonade: frequently produced fragments instead of full responses
- With very low maxTokens (10), returned zero output tokens — thinking budget may consume the allocation

**Strengths:** Fast. Cheap. Fine for one-shot classification or short-form tasks.

**Weaknesses:** Cannot sustain character in multi-turn conversation. Truncates unpredictably. Not suitable for deliberation or debate roles.

**Best for:** One-shot decisions, classification, quick extraction — not extended dialogue.

## Gemini 3.1 Flash Lite (Google)

**Better than Flash 2.5 but still limited.**

- Jury (The Impatient One): stayed in character well — "I have a baseball game" in most responses
- Lemonade: produced complete responses but arguments were shallow
- More reliable at completing responses than Flash 2.5

**Weaknesses:** Arguments lack depth compared to Anthropic or xAI models. Fine for supporting cast, not leads.

**Best for:** Impatient/shallow characters (where brevity is the personality), cost-sensitive supporting roles.

## Summary

| Model | Strength | Weakness | Best role | Cost |
|-------|----------|----------|-----------|------|
| **Opus** | Deep reasoning, strategic | Verbose, expensive | Lead, strategist | $$$ |
| **Sonnet** | Adaptive, balanced | Can flip too easily | Mediator, evolving character | $$ |
| **Grok** | Consistent, immovable | Repetitive, inflexible | Hardliner, holdout | $$ |
| **Grok Reasoning** | Clinical, precise | Robotic, no drama | Analyst, observer | $$ |
| **Haiku** | Fast, cheap, punchy | Thin on depth | Supporting, high-volume | $ |
| **Flash 2.5** | Cheapest | Truncates in dialogue | One-shot tasks only | ¢ |
| **Flash 3.1 Lite** | Cheap, completes responses | Shallow arguments | Supporting cast | ¢ |

## What Matters More Than the Model

1. **Personality prompts** — a one-paragraph description had more impact on behavior than model choice
2. **Temperature** — 0.3 for inspectors, 0.7-0.9 for creative/argumentative roles
3. **Structured context** — markdown round summaries improved all models equally
4. **maxTokens** — too low and models truncate; too high and they monologue
5. **Role fit** — Grok as a stubborn character is perfect; Grok as a mediator would fail

The model sets the ceiling. The prompt decides how close you get to it.

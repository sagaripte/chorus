# 12 Angry Men — AI Jury Deliberation

12 AI jurors with distinct personalities debate a murder case. One holdout pushes for reasonable doubt. The room slowly shifts — or doesn’t.

## Run It

```bash
# All jurors on one model (default: sonnet)
node jury.js

# All jurors on a specific model
node jury.js grok

# Mixed models — 7 different LLMs across the jury
node jury.js mixed
```

## The Case

A 19-year-old is accused of stabbing his father to death.  
Two eyewitnesses, a matching switchblade, and a shaky alibi.  
Guilty = death penalty.

## The Jurors

| #  | Name                  | Personality                              | Model (mixed)       |
|----|-----------------------|------------------------------------------|---------------------|
| 1  | **The Foreman**       | Organized, fair, keeps order             | Sonnet              |
| 2  | **The Quiet One**     | Meek, avoids conflict, thinks carefully  | Flash 3.1 Lite      |
| 3  | **The Hardliner**     | Aggressive, certain of guilt — it's personal | Grok (non-reasoning)|
| 4  | **The Analyst**       | Logical, precise, facts over emotion     | Grok (reasoning)    |
| 5  | **The Kid from the Block** | Street-smart, resents assumptions     | Haiku               |
| 6  | **The Worker**        | Blue-collar, honest, respects elders     | Flash 2.5           |
| 7  | **The Impatient One** | Wants to leave, has baseball tickets     | Flash 3.1 Lite      |
| 8  | **The Holdout**       | Calm, principled, asks hard questions    | Opus                |
| 9  | **The Elder**         | Wise, observant, notices details         | Grok (non-reasoning)|
| 10 | **The Bigot**         | Prejudiced, vocal about "those people"   | Sonnet              |
| 11 | **The Immigrant**     | Deeply reveres justice and due process   | Opus                |
| 12 | **The Ad Man**        | Slick, superficial, easily swayed        | Flash 2.5           |

## How It Works

- Each juror starts with a secret vote (GUILTY / NOT GUILTY)
- If not unanimous, 5–6 jurors speak per round (dissenters always get a turn, majority rotates)
- All arguments are delivered as structured markdown round summaries via the Bus
- Secret ballot after every round
- Maximum 12 rounds — if still no unanimity → **hung jury**

## What It Demonstrates

- Running **12 agents** with strong personalities in one simulation
- Mixing **7 different LLMs** from 3 providers in the same deliberation
- Natural **opinion change** and vote shifts over time
- How **structured context** (markdown round summaries) improves long-form group reasoning
- **Private decisions** (`ask()`) vs public debate (Bus)
- Emergent drama — bias confrontation, emotional outbursts, and persuasion — without any scripted outcome

### How Chorus Powers This

- Every juror is a simple `Agent` with a one-paragraph personality prompt
- The `Bus` carries public arguments; the engine turns them into clean round summaries
- `ask()` handles private votes — keeping them secret and one-shot
- `Session` tracks vote history across rounds
- `Timeline` logs everything for perfect replay and export to markdown
- The engine only manages **who speaks when** and **when to vote** — the LLMs do all the arguing

Swap any juror’s model with one string change.

## Sample Run (Mixed Models)

```
Initial vote:     7–5 Guilty
Round 2:          Hardliner reveals personal bias about his son
Round 5:          Foreman flips after questioning the 15-second timeline
Round 7:          Worker quietly changes to Not Guilty
Round 12:         The Bigot flips — "I've said things I'm not proud of"

Final Result: **Hung Jury** — 3 Guilty vs 9 Not Guilty
```

Full transcript: [data/jury.md](data/jury.md)  
Detailed summary & model analysis: [data/summary.md](data/summary.md)

## Files

```
jury.js     — juror setup, round loop, speaker selection, voting logic
export.js   — converts Timeline JSONL into readable markdown
```

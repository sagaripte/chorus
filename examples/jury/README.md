# 12 Angry Men — AI Jury Deliberation

12 AI jurors deliberate a murder verdict. One holdout argues for reasonable doubt. The room shifts — or doesn't.

## Run It

```bash
# All jurors on one model (default: sonnet)
node jury.js

# All jurors on a specific model
node jury.js grok

# Mixed — jurors on different LLMs
node jury.js mixed
```

## The Case

A 19-year-old is accused of stabbing his father. Two eyewitnesses, a matching knife, and a shaky alibi. A guilty verdict means the death penalty.

## The Jurors

| # | Name | Personality | Model (mixed) |
|---|------|-------------|---------------|
| 1 | **The Foreman** | Organized, procedural, keeps things on track | Sonnet |
| 2 | **The Quiet One** | Meek, avoids conflict, but thinks carefully | Flash 3.1 Lite |
| 3 | **The Hardliner** | Loud, aggressive, certain of guilt — it's personal | Grok |
| 4 | **The Analyst** | Logical, composed, facts over feelings | Grok (reasoning) |
| 5 | **The Kid from the Block** | Grew up in the slums, resents assumptions | Haiku |
| 6 | **The Worker** | Blue-collar, honest, respects elders | Flash 2.5 |
| 7 | **The Impatient One** | Wants out, has baseball tickets, goes with majority | Flash 3.1 Lite |
| 8 | **The Holdout** | Calm, principled, asks probing questions | Opus |
| 9 | **The Elder** | Old, wise, notices what others miss | Grok |
| 10 | **The Bigot** | Prejudiced, vocal, arguments rooted in bias | Sonnet |
| 11 | **The Immigrant** | Reveres the justice system, takes it seriously | Opus |
| 12 | **The Ad Man** | Slick, superficial, flip-flops constantly | Flash 2.5 |

## How It Works

1. Each juror secretly votes GUILTY or NOT GUILTY
2. If not unanimous, 5-6 jurors argue (dissenters always speak, majority rotates by least-spoken)
3. All jurors hear every argument as structured markdown round summaries
4. Secret ballot after each round
5. Jurors know which round they're on and that 12 rounds max before hung jury
6. Unanimous → verdict. 12 rounds without unanimity → hung jury.

## What It Demonstrates

- **Large agent groups** — 12 agents with distinct personalities in the same system
- **Mixed models** — 7 different LLMs across 3 providers at the same table
- **Opinion dynamics** — track how votes shift over rounds via Session state
- **Secret ballots** — `ask()` for private one-shot decisions
- **Structured context** — arguments delivered as markdown round summaries, not flat message streams
- **Natural convergence** — no hardcoded outcome, the LLMs decide
- **Speaker selection** — engine controls pacing (who speaks when), not the LLMs

### How Chorus Powers This

- Each juror is an `Agent` with a one-paragraph personality prompt
- Arguments flow through the `Bus`, then get collected into structured markdown turn blocks
- Votes use `ask()` with capped tokens — private one-shot decisions, no cross-contamination
- `Session` tracks vote history across rounds for the final summary
- `Timeline` records every argument and vote for full replay and export
- The engine picks speakers and manages rounds — LLMs only argue and vote
- Swap any juror's model by changing one string

## Sample Game (Mixed Models)

```
Initial:  7-5 guilty
Round 2:  Juror #3 reveals "my own son walked out on me" — bias exposed
Round 5:  Foreman flips. Holdout buys identical knife from a shop.
Round 7:  Worker quietly flips to not guilty
Round 12: The Bigot flips — "I've said things I'm not proud of"

HUNG JURY: 3-9 (guilty-not guilty)
Holdouts: #3 (The Hardliner), #7 (The Impatient One), #12 (The Ad Man)
```

Full transcript: [data/jury.md](data/jury.md) | Summary: [data/summary.md](data/summary.md)

## Files

```
jury.js    — juror setup, deliberation loop, voting, speaker selection
export.js  — converts Timeline JSONL into readable markdown transcript
```

---

**Made with Chorus** — one file, 12 agents, 7 models, no framework opinions about who should win.

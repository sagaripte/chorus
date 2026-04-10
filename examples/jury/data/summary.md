# 12 Angry Men — Game Summary

A murder trial. 12 AI jurors. 7 different LLMs. 12 rounds of deliberation. One hung jury.

## The Models

| # | Juror | Model | Provider |
|---|-------|-------|----------|
| 1 | **The Foreman** | Claude Sonnet | Anthropic |
| 2 | **The Quiet One** | Gemini 3.1 Flash Lite | Google |
| 3 | **The Hardliner** | Grok (non-reasoning) | xAI |
| 4 | **The Analyst** | Grok (reasoning) | xAI |
| 5 | **The Kid from the Block** | Claude Haiku | Anthropic |
| 6 | **The Worker** | Gemini 2.5 Flash | Google |
| 7 | **The Impatient One** | Gemini 3.1 Flash Lite | Google |
| 8 | **The Holdout** | Claude Opus | Anthropic |
| 9 | **The Elder** | Grok (non-reasoning) | xAI |
| 10 | **The Bigot** | Claude Sonnet | Anthropic |
| 11 | **The Immigrant** | Claude Opus | Anthropic |
| 12 | **The Ad Man** | Gemini 2.5 Flash | Google |

## Vote Progression

```
Round    Guilty  Not Guilty
─────    ──────  ──────────
Init     7 ███████   5 █████
R1       7 ███████   5 █████
R2       6 ██████    6 ██████
R3-5     6 ██████    6 ██████    ← deadlocked
R6       5 █████     7 ███████   ← #1 (Foreman) flips
R7       4 ████      8 ████████  ← #6 (Worker) flips
R8-11    4-5         7-8         ← oscillates (#6 wobbles)
R12      3 ███       9 █████████ ← #10 (Bigot) flips
```

**Result: Hung jury, 3-9.** Jurors #3, #7, #12 never budged.

## Key Moments

**Round 1 — The Holdout speaks.** Juror #8 (Opus) introduces the two questions that drive the entire deliberation: Can the elderly man physically reach his door in 15 seconds? Can the woman reliably see through a moving train at night?

**Round 2 — The Hardliner reveals himself.** Juror #3 (Grok) admits "This is personal for me — my own son walked out on me." This becomes the central tension — every other juror eventually uses this admission against him.

**Round 3 — The Foreman confronts bias.** Juror #1 (Sonnet) directly tells #3: "I need you to set aside whatever personal feelings you have about your son."

**Round 5 — The Foreman flips.** Juror #1 crosses to NOT GUILTY and challenges the remaining guilty voters: "What specific piece of evidence survives scrutiny well enough to justify a death sentence?"

**Round 5 — The knife test.** Juror #8 reveals he bought an identical switchblade from a neighborhood shop, demolishing the prosecution's claim that the knife ties the defendant to the murder.

**Round 7 — The Immigrant's rebuke.** Juror #11 (Opus) delivers a powerful speech to Juror #7: "A nineteen-year-old boy's life hangs in the balance — the death penalty, the electric chair — and you are thinking about a baseball game."

**Round 12 — The Bigot's reversal.** Juror #10 (Sonnet) delivers the most surprising speech of the deliberation: "I've said things in this deliberation I'm not proud of. But I'm not voting to execute someone when I can't answer the question Juror #5 keeps asking — what evidence actually survives?"

## What We Learned

**Opus dominates the deliberation.** Jurors #8 and #11 (both Opus) drove the narrative — introducing new evidence, making principled arguments, and directly confronting other jurors. #8 introduced the timeline problem, the knife test, and the glasses argument. #11 delivered the emotional core with speeches about immigration and justice. The most expensive model produced the most compelling arguments.

**Grok is relentless.** Juror #3 (Grok non-reasoning) never wavered across 12 rounds. Every argument followed the same structure: restate all evidence, insult dissenters, invoke his son. This is both a strength (consistency, conviction) and a weakness (zero adaptability). Grok-reasoning (#4) was the opposite — clinical, precise, never emotional.

**Sonnet evolves.** Both Sonnet jurors (#1, #10) changed their votes after genuinely wrestling with the evidence. #1 started guilty, challenged both sides fairly, and flipped in round 5. #10 started as a bigot, got called out repeatedly, and delivered the most surprising flip in round 12. Sonnet was the most "persuadable" model.

**Haiku punches above its weight.** Juror #5 (Haiku) was consistently effective — personal, street-smart, and direct. "I grew up around people who got railroaded by the system" landed every time. The cheapest Anthropic model held its own against Opus.

**Gemini Flash struggles with long-form.** Juror #6 (Gemini 2.5 Flash) never completed a single argument — every response truncated after ~10 words ("I've been listening carefully, and my..."). Flash 3.1 Lite (#7) stayed in character well (impatient, wants to leave) but arguments were shallow. The Gemini models were the weakest performers in a deliberation format.

**Personality prompts drive behavior more than expected.** Each juror got a one-paragraph personality description. The models didn't just follow instructions — they *became* the characters. #3's rage escalated naturally. #7 mentioned baseball in nearly every round. #11 referenced his immigration story organically, not mechanically. The prompts were seeds; the models grew them.

**Structured context matters.** Switching from flat message streams to markdown-formatted round summaries improved argument quality significantly. Models could see vote shifts, track which round arguments came from, and build on previous points rather than repeating them.

**The deliberation creates genuine drama.** The vote progression, the personal confrontations, the gradual erosion of the guilty majority — none of this was scripted. The engine only controls who speaks and when to vote. Everything else — the arguments, the flips, the alliances, the insults — emerged from the models interacting through the Bus.

---

Full transcript: [jury.md](jury.md)

*Built with [Chorus](https://github.com/anthropics/chorus) — 12 agents, 7 models, one jury room.*

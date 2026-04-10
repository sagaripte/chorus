
# 12 Angry Men — AI Jury Summary

A 19-year-old stands accused of murdering his father. The penalty is death.  
12 AI jurors with distinct personalities and 7 different LLMs deliberate for 12 rounds.

**Final Result: Hung Jury (3 Guilty – 9 Not Guilty)**

## Models Used

| #  | Juror                    | Personality                  | Model                  | Provider   |
|----|--------------------------|------------------------------|------------------------|------------|
| 1  | **The Foreman**          | Fair leader                  | Claude Sonnet          | Anthropic  |
| 2  | **The Quiet One**        | Meek, thoughtful             | Gemini 3.1 Flash Lite  | Google     |
| 3  | **The Hardliner**        | Aggressive, personal         | Grok (non-reasoning)   | xAI        |
| 4  | **The Analyst**          | Logical, precise             | Grok (reasoning)       | xAI        |
| 5  | **The Kid from the Block** | Street-smart, skeptical    | Claude Haiku           | Anthropic  |
| 6  | **The Worker**           | Blue-collar, honest          | Gemini 2.5 Flash       | Google     |
| 7  | **The Impatient One**    | Rushed, wants to leave       | Gemini 3.1 Flash Lite  | Google     |
| 8  | **The Holdout**          | Principled, calm             | Claude Opus            | Anthropic  |
| 9  | **The Elder**            | Wise, observant              | Grok (non-reasoning)   | xAI        |
| 10 | **The Bigot**            | Prejudiced, outspoken        | Claude Sonnet          | Anthropic  |
| 11 | **The Immigrant**        | Idealistic, reveres justice  | Claude Opus            | Anthropic  |
| 12 | **The Ad Man**           | Slick, easily influenced     | Gemini 2.5 Flash       | Google     |

**Note:** Juror #6 (Gemini 2.5 Flash) frequently produced truncated responses during long deliberation.

## Vote Progression

| Round | Guilty | Not Guilty | Key Event |
|-------|--------|------------|-----------|
| Init | 7 ███████ | 5 █████ | |
| R1 | 7 ███████ | 5 █████ | |
| R2 | 7 ███████ | 5 █████ | Hardliner reveals personal bias about his son |
| R3 | 6 ██████ | 6 ██████ | |
| R4 | 6 ██████ | 6 ██████ | |
| R5 | 6 ██████ | 6 ██████ | Foreman flips after questioning timeline |
| R6 | 5 █████ | 7 ███████ | Worker flips |
| R7 | 5 █████ | 7 ███████ | |
| R8 | 4 ████ | 8 ████████ | |
| R9 | 5 █████ | 7 ███████ | Oscillates — Worker wobbles |
| R10 | 4 ████ | 8 ████████ | |
| R11 | 5 █████ | 7 ███████ | |
| R12 | 4 ████ | 8 ████████ | Bigot flips — "I've said things I'm not proud of" |
| **Final** | **3 ███** | **9 █████████** | **Hung Jury** |

## Key Moments

- **Round 2**: Juror #3 (Grok) admits “This is personal for me — my own son walked out on me.” This becomes the central emotional flashpoint of the deliberation.
- **Round 5**: Juror #8 (Opus) dramatically demonstrates that the switchblade is common by “buying” an identical one from a neighborhood shop.
- **Round 5**: Foreman (Sonnet) switches to Not Guilty after genuinely wrestling with the 15-second timeline.
- **Round 7**: Juror #11 (Opus) delivers a powerful rebuke to the Impatient One: “A boy’s life hangs in the balance… and you’re thinking about a baseball game.”
- **Round 12**: Juror #10 (Sonnet, the Bigot) surprises everyone by flipping: “I’ve said things in this deliberation I’m not proud of.”

## What We Learned

**Model Performance:**

- **Claude Opus** was the strongest performer. Both Opus jurors (#8 and #11) drove the deliberation with clear, principled, and emotionally intelligent arguments.
- **Grok (non-reasoning)** stayed relentlessly in character as the Hardliner — consistent, aggressive, and completely unmovable.
- **Grok (reasoning)** (#4) was clinical and precise, never emotional.
- **Claude Sonnet** proved most persuadable. Both Sonnet jurors changed their votes after honest examination of the evidence.
- **Claude Haiku** punched well above its weight — direct, street-smart, and consistently effective.
- **Gemini Flash models** struggled the most with sustained long-form deliberation. They often produced shallow or incomplete responses.

**Emergent Behavior:**

- Personality prompts had a massive impact. The models didn’t just follow their roles — they fully embodied them. Rage escalated naturally, bias surfaced organically, and principled arguments felt authentic.
- Structured markdown round summaries dramatically improved coherence compared to flat message streams.
- Real tension emerged: bias confrontations, emotional outbursts, alliances, and gradual shifts in opinion — all without any scripting.
- Vote changes felt earned. Jurors flipped only after sustained pressure and better arguments.

**Chorus Insight:**

This simulation shows the power of giving agents clear personalities, structured context, and a simple engine that only controls pacing. The drama, persuasion, and group dynamics came entirely from the models interacting through Chorus primitives.

Full deliberation transcript: [jury.md](./jury.md)
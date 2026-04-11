
# AI Poker Night

Five AI agents play Texas Hold'em. Each has a distinct personality, runs on a different LLM, and forms real opinions about everyone else's cards.

## Run It

```bash
# All players on the same model (default: gpt-4.1-mini)
node poker.js

# All players on one specific model
node poker.js sonnet
node poker.js grok

# Mixed models — each player gets their own LLM
node poker.js mixed
```

**Mixed mode mapping:**
- Vince → Opus  
- Maya → Sonnet  
- Dutch → Grok (reasoning)  
- Suki → Haiku  
- Rex → Grok (fast)

## The Players

| Name   | Style                              | Model (mixed)     | Personality Highlight          |
|--------|------------------------------------|-------------------|--------------------------------|
| **Vince** | Aggressive bluffer, talks trash   | Opus             | Theatrical monologues          |
| **Maya**  | Tight, analytical, quietly confident | Sonnet         | Patient and precise            |
| **Dutch** | Old school, plays the odds, dry humor | Grok-reasoning | Measured and stoic             |
| **Suki**  | Chaotic, plays for fun, wild calls | Haiku            | Punchy and unpredictable       |
| **Rex**   | Conservative, slow-plays strong hands | Grok-fast      | Laconic and patient            |

## What It Demonstrates

- **Private state** — each player only sees their own hole cards
- **Mixed models** — five different LLMs at one table, switched with a single string per agent
- **`ask()` / one-shot decisions** — clean separation between game rules and LLM strategy
- **Bus** — public table talk routes to all players and influences their decisions
- **LLM for flavor + strategy, code for rules** — the engine enforces legal poker moves
- **Timeline + export** — full game history exported to readable markdown with personality intact

### How Chorus Powers This

- Each `PokerPlayer` extends `Agent` with a short personality prompt.
- Private hands are queued **only** to the individual player's conversation history.
- Table talk flows through the `Bus` so every player hears public comments.
- The game engine (`table.js`) controls dealing, betting rounds, hand ranking, and turn order — LLMs only decide actions and generate flavorful reasoning.
- `Timeline` records every decision, bet, and chat line for perfect replay and export.
- Swap any model by changing one string — no other code changes required.

## Sample Game (Mixed Models)

```
Models: Vince→opus, Maya→sonnet, Dutch→grok-reason, Suki→haiku, Rex→grok-fast

  ── Hand 1 ──

    Vince: RAISE 60   "Suited and dangerous, just like me — buckle up, kids."
    Maya: RAISE 200   "AQ suited energy doesn't need chaos — it just needs patience."
    (everyone folds)
    Maya wins 420

  ── Hand 3 (the big one) ──

    Vince: RAISE 80   "NOW this is a hand — who's volunteering to get punished?"
    Suki: RAISE 200   "Pocket jacks deserve some chaos — let's see who's brave!"
    Vince: CALL 200   "Suki thinks she's got jacks? Honey, my ace says otherwise."

    Flop: 8♥ 4♥ 10♥
    Vince: RAISE 200  "Three hearts and I've got the ace of hearts... oh wait,
                       I don't — but Suki doesn't know that, does she?"
    Suki: CALL 200    "Let's see if you're bluffing that flush!"

    River: 5♠
    Vince: RAISE 340  "All in, baby — put your chips where your mouth is!"
    Suki: CALL 340    "Let's find out if that bluff worked!"

    Showdown: Suki J♣ J♠ beats Vince J♥ A♠ → Suki wins 1700
    Vince busted.

  ── Hand 4 ──

    Rex slow-plays a set of 7s. Traps Suki for 1310.
    Rex: "Curiosity killed the cat, Suki."

  FINAL: Rex 1630 | Suki 1270 | Maya 1130 | Dutch 970 | Vince 0
```

Full transcript: [mix/poker.md](mix/poker.md)

## What We Learned

**Models have distinct voices.**  
Opus delivers theatrical trash talk. Haiku is short, punchy, and chaotic. Grok-reasoning stays dry and measured. You can often tell which model is speaking without looking at the mapping.

**Real information asymmetry makes bluffs work.**  
Vince (Opus) successfully faked a flush draw across three streets. Suki (Haiku) had no way of knowing he was bluffing — she only saw her own cards. The deception wasn't simulated; it emerged naturally from hidden information.

**Personality shapes strategy more than you expect.**  
Rex (Grok-fast) barely spoke, folded almost everything, and won by slow-playing a set of 7s. Suki (Haiku) called wildly and rode massive swings. Maya (Sonnet) played tight and disciplined. One-line personality prompts were enough for the models to develop consistent playstyles.

**The most expensive model went broke.**  
Opus played the most dramatic, aggressive, and entertaining poker — and busted first. The cheapest, most chaotic model (Haiku) took a big chunk of his chips. Draw your own conclusions about cost vs performance.

**The framework stayed out of the way.**  
All game logic (legal moves, pot calculation, hand evaluation) stayed in deterministic code. The LLMs only handled strategy and personality. This kept the game fair and prevented common LLM failures like illegal bets or hallucinated cards.

---

## Files

```
poker.js     — entry point, player setup, main game loop
player.js    — PokerPlayer class (extends Agent) + action parsing
table.js     — deck, betting rounds, showdown logic
cards.js     — card utilities, hand ranking, evaluation
export.js    — converts Timeline JSONL into readable markdown
```

---

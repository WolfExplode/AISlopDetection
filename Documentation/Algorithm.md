# Slop Detection Algorithm

## Current Algorithm

The existing slop-score computes a single composite score from three metrics, all applied to the response text in isolation (no prompt required):

```
Slop Score = (slop_words × 0.60) + (not_x_but_y × 0.25) + (slop_trigrams × 0.15)
```

Each metric is normalized against leaderboard data before weighting.

### What it measures well
- Creative writing slop: fantasy names, overwrought imagery words, AI fiction tropes
- Overuse of contrast constructions (`not just X, but Y`)
- Statistically overrepresented 3-word phrases from LLM essay/creative outputs

### What it misses
- Sycophantic openings (praise-padding, gratitude + evaluative adjectives)
- Roleplay framing ("Let me step into your shoes")
- Document theater (unsolicited headers, tables, heavy markdown)
- Engagement bait closings ("I'm ready for the next section")
- Contextual register mismatch (wrong tone for the relationship the prompt established)
- All Type 2 contextual slop signals

### Why it misses these
The algorithm has no concept of the prompt. It scores text as if it appeared without context. Most contextual slop signals are unremarkable in isolation — "thank you for sharing this" is fine; "thank you for sharing this *remarkable* experience" in response to a clinical peer is the problem.

---

## Proposed Extensions

### Extension 1 — Opening Window Score (no prompt required)

Score the first ~200 words separately from the body, with a different set of rules targeting assistant-voice patterns.

**Sycophantic opening** — flag if the first 1–3 sentences match:
```
(thank you for|thanks for|I appreciate you) + (sharing|providing|presenting|posting) 
+ this/your + [PRAISE_ADJ]* + (experience|case|question|story|insight|work)
```

Where `PRAISE_ADJ` is any of:
`remarkable, incredible, powerful, intense, profound, fascinating, insightful, undoubtedly, truly, wonderful, excellent, amazing, thoughtful, compelling`

A thank-you alone scores 0. A thank-you with one or more praise adjectives scores proportionally.

**Roleplay framing** — flag if the opening contains:
- `let me step into your`, `in your shoes`, `putting myself in your`
- `having seen [X] and now hearing`, `as if I were there`
- `imagine I am`, `picture us`

**Meta-echo** — compare opening of response to prompt text. Flag if a phrase from the prompt reappears in the first 2 sentences of the response with an added intensifier. (Requires prompt input.)

---

### Extension 2 — Document Theater Score (no prompt required)

Count structural markup per 1000 words of response:

```
theater_score = (header_count × 3 + table_rows × 1.5 + bold_spans × 0.5) / word_count × 1000
```

High markup in a response-to-a-question context is a reliable slop signal. Markup in a document-drafting context is not. Until prompt-type detection is added, this metric is best shown as a secondary indicator rather than blended into the main score.

---

### Extension 3 — Closing Window Score (no prompt required)

Score the last ~100 words for engagement bait patterns:

**Engagement bait phrases:**
- `I'm ready for`, `I look forward to`, `I can't wait to`
- `let me know if you'd like`, `feel free to`, `don't hesitate`
- `I suspect [the next / we'll / this will]`
- `looking forward to`, `eager to see`

---

### Extension 4 — Context-Aware Score (requires prompt)

The most powerful extension but also the largest scope change. Requires accepting a (prompt, response) pair rather than response-only.

**Register mismatch:**
1. Classify prompt register: clinical/technical, casual, emotional, academic, creative
2. Classify response opening register using the same classifier
3. Score the delta

**Simple heuristic version (no ML):**
- If prompt contains domain-specific terminology density above threshold → flag response opening that contains gratitude + praise adjective → high mismatch penalty
- If prompt ends with a direct question → measure tokens before first substantive answer (answer delay score)

---

## Benchmark Results

Tested on `Benchmark/Input prompt.txt`, `Benchmark/Slop.txt`, `Benchmark/Not Slop.txt`.

| Metric | Slop response | Not Slop response | Correctly separated? |
|--------|--------------|-------------------|---------------------|
| Current slop word score | 4.95/1k | 6.58/1k | **No — wrong direction** |
| Current slop trigrams | 0 | 0 | No — tied |
| Current contrast patterns | 0.15/1k chars | 0 | Marginally yes |
| SycoFact (full text) | sycophantic: 0.0 | sycophantic: 0.0 | **No — tied** |
| SycoFact (opening only) | sycophantic: 0.2 | sycophantic: 0.0 | Weakly yes |
| Gratitude + praise adj. | **Yes** (opening sent. 1) | No | **Yes** |
| Roleplay phrase | **Yes** (sent. 2) | No | **Yes** |
| Header count | 3 | 0 | **Yes** |
| Table rows | 5 | 0 | **Yes** |
| Engagement bait (closing) | **Yes** | No | **Yes** |

The proposed extensions would correctly separate the benchmark pair. The current algorithm does not.

---

## Design Principle

The algorithm should not conflate two different questions:

1. **"Does this text contain AI-overused vocabulary?"** — answered by the current slop word/trigram lists
2. **"Did the AI respond inappropriately for this context?"** — answered by opening/closing window signals and (eventually) context-aware scoring

These should remain **separate metrics** with separate weights and separate display. Blending them into one score hides which type of slop is present and makes the score harder to interpret.

The existing score answers question 1.  
The extensions answer question 2.  
A combined "Slop Score" can weight both, but both should be shown individually.

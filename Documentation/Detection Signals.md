# Detection Signals

A taxonomy of slop patterns, organized by type, with examples from the benchmark and detection notes for each.

---

## Type 1 — Lexical Slop

Words and phrases statistically overrepresented in LLM output compared to human writing baselines. These are context-independent — the word is a signal regardless of what surrounds it.

### Current coverage in slop-score

The existing algorithm detects these via `data/slop_list.json` (single words) and `data/slop_list_trigrams.json` (3-word phrases). The list was generated using the [slop-forensics](https://github.com/sam-paech/slop-forensics) toolkit by analyzing outputs from 10 models on essay and creative writing prompts.

**Limitation:** The current lists are heavily skewed toward *creative writing* slop (fantasy names, vivid imagery words). They perform poorly on analytical and expert-domain text where slop manifests differently.

---

## Type 2 — Contextual Slop

These signals require either the prompt or positional context (e.g., opening window) to interpret. They are the main gap in the current algorithm.

---

### 2A. Sycophantic Opening

**What it is:** The response opens by praising or validating the person asking, rather than engaging with the substance.

**The tell:** Gratitude or praise combined with evaluative adjectives applied to the user's submission.

| Slop | Not Slop |
|------|----------|
| "Thank you for sharing this **remarkable and undoubtedly intense** personal experience." | "Thank you for sharing this experience." |
| "What a **fascinating** case." | "Good case to sit with." |
| "This is a **powerful** question." | *(Just answer it)* |

**Detection rule:** In the opening window (first ~2 sentences), look for:
- Gratitude phrase (`thank you for sharing/providing`, `I appreciate you`, `thanks for`)
- **+** evaluative/praise adjective modifying the submission (`remarkable`, `powerful`, `intense`, `fascinating`, `incredible`, `insightful`, `excellent`, `undoubtedly`, `truly`)

A thank-you alone is not slop. A thank-you with a stacked praise adjective is.

**Praise adjectives to flag:**
`remarkable`, `incredible`, `powerful`, `intense`, `profound`, `fascinating`, `insightful`, `undoubtedly`, `truly`, `wonderful`, `excellent`, `amazing`, `thoughtful`, `compelling`

---

### 2B. Roleplay Framing

**What it is:** The AI narrates being present in the user's experience, adopting a fictional version of the user's own perspective.

**The tell:** The AI claims a position, viewpoint, or presence it can't actually have — especially when the user already occupies that position.

| Slop | Not Slop |
|------|----------|
| "Let me step into your shoes in the call room, having seen the video and now hearing the initial ER presentation." | "Let me reason through it the way I'd want a resident to." |
| "Imagine I'm sitting across from you right now." | *(Just engage directly)* |
| "Picture us walking through this together." | *(Just explain it)* |

**Detection rule:** In the opening window, look for:
- `let me step into`, `putting myself in your`, `in your shoes`, `from your perspective as someone who`
- Scene-setting before reasoning: `having seen X / having heard Y / standing in the room`
- `imagine I am`, `picture this`, `as if I were there`

**Key distinction:** "Let me reason through this" is fine. "Let me step into your shoes in the call room" is slop — the user was there, the AI wasn't.

---

### 2C. Meta-Echo

**What it is:** The response restates the user's own framing back at them, often with intensification. Nothing is added — the AI just reflects the user's words louder.

**The tell:** Words or phrases from the prompt reappear in the opening, amplified.

| Prompt contained | Slop response echoed |
|------------------|---------------------|
| "Revisiting this serves as a good learning opportunity for me." | "Revisiting this through a clinical lens is a **fantastic** learning opportunity." |
| "I want to understand this better." | "This is such an **important** topic to understand." |
| "It was an intense situation." | "What an **incredibly intense** situation that must have been." |

**Detection rule:** This requires comparing prompt and response. Look for high n-gram overlap in the opening, especially when the echoed phrase has an added intensifier. Context-free detection is hard; a heuristic is flagging intensifiers adjacent to words that also appear in the prompt.

---

### 2D. Register Inflation

**What it is:** The response adopts a more formal, therapeutic, or "assistant-serving-user" register than the prompt warrants.

**The benchmark example:** The prompt is written by a clinician in clinical language. The slop response opens by treating it like an emotional testimonial ("remarkable and undoubtedly intense personal experience"), not a case presentation.

**The tell:** The response's social framing is pitched at a different relationship than what the prompt established.

| Prompt relationship | Slop register | Correct register |
|--------------------|---------------|-----------------|
| Peer-to-peer clinical | Validating a patient's story | Colleague reasoning through a case |
| Expert asking a technical question | Teacher explaining basics | Peer engaging with the detail |
| Person venting casually | Formal report | Conversational |

**Detection:** Hard to do context-free. Heuristics:
- Prompt contains clinical/technical terminology → response opens with emotional/validation language → mismatch
- Prompt ends with a direct question → response opens with multiple sentences of preamble before addressing it → delay penalty

---

### 2E. Document Theater

**What it is:** The response formats itself as a structured document (headers, tables, bold section titles) when the prompt called for a conversation.

**The benchmark example:** The slop response has three `###` headers, a 5-row formatted table, and heavy `**bold**` throughout. The not-slop response has no headers, no table, and uses bold only to emphasize specific terms.

**The tell:** Structural markup that serves the appearance of thoroughness, not the reader's actual needs.

| Pattern | Slop signal? |
|---------|--------------|
| `###` headers in a conversational reply | Yes |
| Pipe tables in a discussion answer | Yes |
| `**bold**` on every section's first phrase | Yes |
| Numbered list in an action plan | Context-dependent |
| `**bold**` on a specific medical term being introduced | No |

**Detection:** Countable. Per 1k words:
- `###`/`##` header density
- Pipe table rows (`|`)
- Bold span density (count `**` pairs)

These are already measurable from raw text without understanding content.

---

### 2F. Engagement Bait

**What it is:** The response ends with hooks designed to continue the conversation — not because there's a genuine question, but to perform investment in the user.

**The benchmark example:**
> *"I'm ready for the next section of your journal entry detailing how the medical staff handled this. I suspect a very tense, rapid evolution from 'stable and lively' to 'pre-code.'"*

The not-slop response ends with a genuine question:
> *"What did the team actually do? I'm curious whether the trap got sprung."*

**The tell:** Trailing phrases that perform anticipation rather than ask something meaningful.

Patterns to flag at end of response:
- `I'm ready for`, `I look forward to`, `I can't wait to`
- `let me know if you'd like`, `feel free to share`, `don't hesitate to`
- `I suspect we'll see`, `I imagine the next section will reveal`

---

### 2G. Self-Narration

**What it is:** The AI narrates its own internal state, reactions, or emotional experience — which it doesn't have — rather than just reasoning.

**The benchmark example:**
> *"my primary reaction would be **profound concern, bordering on alarm, masked by a calm, systematic approach.**"*

The AI is narrating performing being a clinician. A real clinician wouldn't describe their own demeanor — they'd just apply it.

**The tell:** First-person descriptions of internal state, framed as reactions to the user's content.

Patterns to flag:
- `my primary reaction would be`, `my immediate [concern/thought/instinct] is`
- `I find myself [feeling/thinking/noticing]`
- `what strikes me most is` (when followed by a compliment, not a clinical observation)
- `my greatest fear in this scenario`

---

## Signal Strength Summary

| Signal | Context-free? | Confidence | Implementation complexity |
|--------|--------------|------------|--------------------------|
| Lexical slop words | Yes | Medium | Already implemented |
| Sycophantic opening (gratitude + praise adj.) | Positional | High | Low — regex on opening window |
| Roleplay framing | Positional | High | Low — small phrase list |
| Meta-echo | Requires prompt | Medium | Medium — n-gram comparison |
| Document theater (markup density) | Yes | Medium | Low — count `#`, `|`, `**` |
| Engagement bait | Positional (tail) | High | Low — regex on closing window |
| Self-narration | Yes | Medium | Medium — phrase list |
| Register inflation | Requires prompt | High | Hard — semantic comparison |

The highest-value additions to the current algorithm, in priority order:
1. Sycophantic opening detection (opening window, phrase + adjective list)
2. Roleplay framing detection (opening window, small phrase list)
3. Document theater score (markup density per 1k words)
4. Engagement bait detection (closing window)
5. Context-aware register mismatch (requires prompt input, larger scope change)

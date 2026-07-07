# Slop Cop

Detects LLM-generated prose patterns in text and highlights them with color-coded annotations.

## Language

**Slop**:
Prose where a dial got turned up too far. Full philosophy and the "how much is too much" mechanism: [README.md § What is "Slop"?](README.md#what-is-slop).
_Avoid_: AI writing, LLM tell (too broad — includes neutral fingerprints that aren't slop)

**Rule**:
A single named detector for one slop pattern (e.g. `overused-intensifier`, `sycophantic-frame`). Defined once in `src/rules.ts`, detected either client-side (regex/structural) or via LLM call.
_Avoid_: Pattern, detector (detector is the code that implements a rule; keep them distinct)

**Violation**:
One concrete match of a Rule against a specific span of the user's text. A Rule can produce zero, one, or many Violations in a given document.
_Avoid_: Match, hit, flag

## Scoring

No single Violation makes a document slop — only the aggregate does. A rule fires per-instance, but a document only reads as "slop" once usage exceeds the free allowance a normal human writer would use anyway. This mechanism (per-rule excess-over-baseline, rolled up into one aggregate) is uniform across all 6 rule categories, including structural/formatting ones — a single bold-first bullet or a single rule-of-three list isn't slop, three in a row is.

**Free Allowance** (`freeRate`):
The quota of a Rule's uses per 1000 words that reads as ordinary human writing and is not penalized. Only usage past this quota (**Excess Weight**) contributes to the Slop Score.
_Avoid_: Threshold (ambiguous with `scoringMode: 'threshold'`), quota

**Rule Weight**:
How exclusively a Rule's pattern marks AI output, independent of how often it fires — a 0–5 scale from "weak, common in good human prose" to "definitive artifact, essentially never written by a human on purpose." Fixed per Rule.
_Avoid_: Severity, importance

**Instance Weight**:
The signal strength of one specific Violation — how strongly this particular occurrence (this word, this phrase) indicates AI writing, on a 0–1 scale. Varies per hit within the same Rule (e.g. "tapestry" carries more signal than "meaningful").
_Avoid_: Confidence, score (score is reserved for the aggregate)

**Slop Score**:
The 0–100 aggregate for a document: excess weight × rule weight, summed across every Rule, normalized by word count.
_Avoid_: Slop percentage, AI score

**Rating**:
The four-bucket read of a Slop Score: Clean, Moderate, Heavy, Slop. The top bucket reuses the umbrella term "Slop" deliberately — a document rated Slop has crossed from "has slop in it" to "is, itself, slop."
_Avoid_: Grade, tier (tier is reserved for detection tier, client-side vs semantic)

## Frequency

**Corpus Frequency**:
How common a word is in general English, on the Zipf scale (from the wordfreq dataset). Used to judge whether a document over-uses a word relative to normal English.
_Avoid_: Word frequency (ambiguous with Document Frequency)

**Document Frequency**:
How many times a term occurs within the user's document itself, matched by head noun with inflections folded ("volume knob" recurs when "knobs" appears elsewhere; "dial" does not count). A neutral measurement — each Rule interprets it its own way.
_Avoid_: Frequency (unqualified), occurrence count

**Hapax Guard**:
A suppression built on Document Frequency: a Violation survives only when its term occurs nowhere in the document outside the matched span. Recurrence anywhere — even once, paragraphs away — reads as the document being natively in that term's domain (literal vocabulary), while a one-off term was imported for effect. Applies only to Rules that flag *imported* vocabulary (a metaphor vehicle, a scare-quoted term later adopted unquoted); never to Rules that flag *invented* vocabulary (`invented-concept-label`) — recurrence of a coined term is not exculpatory. Recurring imports belong to document-tier recurrence Rules like `dead-metaphor`.
_Avoid_: Uniqueness check, one-off filter, hapax legomenon (the full jargon; "hapax" alone is the project term)

## Detection tiers

**Client-side Rule**:
A Rule detected instantly by regex or structural analysis in the browser, no API key needed (`requiresLLM: false`). Fires on every keystroke after debounce. The default, always-on layer.
_Avoid_: Regex rule (some client-side rules use NLP/structural analysis, not regex)

**Sentence-tier Rule**:
A Rule that needs semantic judgment but only within local context (a sentence or paragraph) — detected via LLM call, `llmTier: 'sentence'`, requires an API key. Called "fast pass" in older docs; the model (currently Haiku-class) is chosen for speed over document-scale reasoning.
_Avoid_: Fast pass (describes the UX timing, not what the rule detects)

**Document-tier Rule**:
A Rule that only becomes visible at whole-document scale — repetition or structure across paragraphs — detected via LLM call, `llmTier: 'document'`, requires an API key. Called "deep pass" in older docs.
_Avoid_: Deep pass (describes the UX timing, not what the rule detects)

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

**Unearned Intensity**:
The underlying failure mode that most rhetorical and framing Rules are surface forms of. Every intensity device — metaphor, personification, dramatic contrast, fragment rhythm, stakes-raising, second-person address — is a claim that *something here warrants heightened attention*. Human writers spend these devices against a budget: the drama arrives when the content earns it. LLM prose spends them on credit, per-sentence, because models were rewarded for engagingness per-sentence rather than per-document. Client-side Rules detect crystallized shapes of the spend (`decorative-metaphor` = intensity via image with zero information delta; `negation-pivot` = the structure of a plot twist around a claim never in doubt; `dramatic-fragment` = percussion signaling a beat the content lacks; `grandiose-stakes` = significance asserted, not demonstrated); the sentence-tier Rule `unearned-intensity` judges the general case. False positives cluster exactly where the intensity turns out to be backed — a real state change, a literal usage — which is why client-rule guards keep converging on the shape "suppress when the drama *is* the information."
_Avoid_: Drama, purple prose (both describe register; the concept is the missing collateral, not the heat)

## Failure modes

The conceptual hierarchy over the Rules. A Rule's `category` classifies its *surface unit* (what kind of span it matches — a word, a sentence shape, a structure) and drives the sidebar grouping; its failure mode classifies *which dial got turned up* — the underlying miscalibration the surface shape is a symptom of. The taxonomy is conceptual organization, not a code axis: nothing consumes it programmatically. New rules should identify their failure mode first; it predicts what the guards will look like (see each mode's FP note) and which general-case LLM rule covers the long tail the client rules miss.

**1. Unearned Intensity** (drama dial ↑) — defined in § Language. Rhetorical escalation not paid for by information. The general case is the sentence-tier `unearned-intensity` rule; the client-side crystallized shapes:
- *via image*: `decorative-metaphor`, `metaphor-crutch`, `dead-metaphor`
- *via rhythm*: `dramatic-fragment`, `triple-fragment`, `triple-construction`, `staccato-burst`, `anaphora-abuse`, `gerund-fragment-litany`, `short-hook-paragraph`, `colon-elaboration`, `question-then-answer`
- *via fake reversal*: `negation-pivot`, `fragment-negation`, `paired-negation`, `negation-countdown`, `heres-the-kicker`, `phantom-contrast`
- *via asserted significance*: `grandiose-stakes`, `significance-phrases`, `important-to-note`, `broader-implications`, `reality-claim`, `earned-claim`, `era-opener`, `imagine-world`
- *via borrowed authority*: `class-generalization`, `historical-analogy-stack`, `exemplar-cliche`, `vague-attribution`, `false-range`, `invented-concept-label`
- *via diction*: `overused-intensifier`, `stacked-intensifiers`, `filler-adjectives`, `filler-adverbs`, `elevated-register`, `serves-as`, `inline-emphasis`
FP shape: the intensity turns out to be backed (a real state change, a literal usage, genuinely earned drama).

**2. Reflexive De-risking** (hedge dial ↑) — Unearned Intensity's mirror twin: commitment refunded that was never demanded. `hedge-stack`, `almost-hedge`, `balanced-take`, `despite-challenges`, `parenthetical-qualifier`, `quote-overuse`, `professional-disclaimer`. FP shape: the hedge is genuine epistemic honesty (real uncertainty, real legal exposure).

**3. Performed Relationship** (warmth dial ↑) — the model playing a social role instead of conveying content. `sycophantic-phrases`, `sycophantic-words`, `sycophantic-frame`, `empathy-performance`, `false-vulnerability`, `pedagogical-aside`, `throat-clearing`. FP shape: the writer actually knows the reader (correspondence, not content).

**4. Redundant Scaffolding** (structure dial ↑) — words about the content instead of content; saying it again. `pivot-paragraph`, `fractal-summaries`, `one-point-dilution`, `unnecessary-elaboration`, `superficial-analysis`, `false-conclusion`, `connector-addiction`, `unnecessary-contrast`, `listicle-instinct`, `listicle-trench-coat`, `bold-first-bullets`. FP shape: the restatement carries new information (a summary that genuinely synthesizes).

**5. Statistical Fingerprints** (no dial) — neutral generation artifacts, not miscalibration; frequency is the whole signal. `slop-trigram`, `slop-bigram`, `slop-word-character-name`, `slop-word-atmospheric`, `slop-word-fantasy-vocab`, `slop-word-essay`, `fiction-body-language`, `em-dash-overuse`, `unicode-decoration`, `chatbot-artifact`, `knowledge-cutoff-disclaimer`. FP shape: a human who natively writes in the fingerprinted register.

`slop-cluster` sits outside the taxonomy — it is a density meta-rule over all the others. Assignments are primary, not exclusive: several rules genuinely straddle modes (`negation-pivot` is both a fake reversal and a restatement; `quote-overuse` is terminology hedging and ad-hoc coining; `throat-clearing` is warmth performance and scaffolding). A strict tree would fight reality — one primary mode per rule is the contract.

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

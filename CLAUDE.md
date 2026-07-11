# Slop Cop

Web app that detects LLM-generated prose patterns in text and highlights them with color-coded annotations.

## Stack

- **Vite + React 19 + TypeScript** — frontend only, no backend
- **pnpm** — use pnpm for all package operations, never npm or yarn
- `pnpm dev` — dev server on localhost:5173
- `pnpm build` — type-check + build to `dist/`
- `pnpm test` — Vitest unit tests (680 tests, all client-side detectors)

## Architecture

All detection runs client-side. No server required.

```
src/
  App.tsx                    # Root: state, editor, popover, apply-change wiring
  rules.ts                   # All rule definitions (id, name, tip, color, canRemove, requiresLLM)
  types.ts                   # ViolationRule, Violation, ViolationCategory
  detectors/
    index.ts                 # runClientDetectors() — calls all regex/structural detectors
    wordPatterns.ts          # All client-side detectors (word lists, regex, sentence analysis)
    nlpPatterns.ts           # NLP-assisted detectors using compromise (context-sensitive, sentence-chunked)
    llmDetectors.ts          # Claude API calls for semantic detections (two-tier)
    concreteNouns.ts         # GENERATED: ~5k concrete-object nouns (Brysbaert norms ≥4.2); regenerate via scripts/generate-concrete-nouns.mjs
  components/
    Toolbar.tsx              # Top bar: branding, API key management, LLM run button
    Sidebar.tsx              # Right panel: violation cards with counts and eye toggles
    Popover.tsx              # Click popover: rule name, explanation, inline diff, Apply button
  hooks/
    useHashText.ts           # Syncs text to URL hash via replaceState (debounced 600ms)
  utils/
    buildHighlightedHTML.ts  # Converts text + violations → HTML string with <mark> spans
    docFrequency.ts          # Document Frequency + Hapax Guard (CONTEXT.md § Frequency); full contract in its header
    maskCodeRegions.ts       # Length-preserving masking of markdown code (fences + inline spans) — code is never scanned
```

## Detection tiers

**Client-side (instant):** regex and structural analysis in `wordPatterns.ts`. Fire on every keystroke after a 350ms debounce.

**Semantic (optional):** requires an Anthropic API key entered in the toolbar. Two parallel API calls fire when the user clicks "Run semantic analysis":

1. **Fast pass** — `claude-haiku-4-5-20251001`, 30s timeout. Sentence and paragraph-level patterns (10 rules): throat-clearing, sycophantic frame, balanced take, unnecessary elaboration, empathy performance, pivot paragraph, grandiose stakes, historical analogy, false vulnerability, false range (subtle cases).
2. **Deep pass** — `claude-sonnet-4-6`, 60s timeout. Document-level structural patterns (3 rules): dead metaphor, one-point dilution, fractal summaries.

Both calls use `anthropic-dangerous-direct-browser-access: true` to enable CORS directly from the browser. No proxy needed. Results from the fast pass appear first; deep pass results merge in when Sonnet finishes. Status: `idle → loading → done/error`. Editing after analysis sets status to `stale`, showing a "Re-analyze" button.

## Rules

Each rule in `src/rules.ts` has:
- `id` — used as the key everywhere
- `name` — short display name
- `category` — `word-choice | sentence-structure | rhetorical | structural | framing`
- `description` — what the pattern is
- `tip` — actionable advice shown in the popover (italic, serif)
- `canRemove` — if true, Apply with empty replacement is offered (deletion)
- `color` / `bgColor` — highlight colors
- `requiresLLM` — if true, only detected via the API call; sidebar hides the rule when no API key

## Rules count

- **Client-side rules:** 41
- **LLM-required rules:** 12 (9 sentence-level + 3 document-level)
- **Total:** 53

## Adding a new rule

1. Add a `ViolationRule` entry to `src/rules.ts`
2. If client-side: write `detectXxx(text: string): Violation[]` in `wordPatterns.ts`, export it, add it to `runClientDetectors()` in `detectors/index.ts`
3. If LLM sentence-level: add the pattern description to `LLM_RULES_PROMPT` in `llmDetectors.ts`
4. If LLM document-level: add to `DOCUMENT_RULES_PROMPT` in `llmDetectors.ts`

## False positive risks

- **`anaphora-abuse` copula-cleft branch**: `twoWordOpener` skips the subject pronouns `it/i/we/he/she` so ordinary pronoun-subject narration ("He walked in. He sat down. He waited.") never fires. A separate cleft path (`CLEFT_OPENER_RE` + `cleftOpener()` in wordPatterns.ts) re-admits them when they open `<pronoun> <copula> <predicate>` 3+ times ("It is X. It is Y. It is Z.") — the copula (`is/are/was/were/am` + `'s/'m/'re`) is what separates a cleft from narration. Two guards keep it tight: a present participle after the copula is progressive narration, not a cleft, and is skipped ("It is raining. It is pouring."); and the contraction form requires an apostrophe so possessive "Its color…" is not read as "It's". Remaining FP surface: deliberate literary/rhetorical anaphora ("It is cold. It is dark. It is late.", memoir "I am tired. I am hungry. I am done.") fires by design — consistent with how the rule already flags "Every X… Every X…". Demonstratives (`this/that/there`) and `they` already fire via `twoWordOpener` and are untouched.
- **`dramatic-fragment`**: Any paragraph with ≤4 words fires, including intentional short paragraphs in prose. High-precision but accept occasional FPs in minimalist writing.
- **`class-generalization`** (in nlpPatterns.ts): Sentence-initial `[class adjective] + [agent noun] + [present verb]` ("Real experts hedge…"). The noun must look like a person: agentive suffix (-ers/-ors/-ists/-ians/-eurs) or an explicit person-noun set (`CLASS_GEN_EXTRA_NOUNS` — needed because "experts" has no agentive suffix). Non-agent suffix nouns are skip-listed (`CLASS_GEN_SKIP_NOUNS`: "real numbers", "great powers", "smart speakers"). Compromise confirms a present-tense verb — past-tense narrative and "of/who" continuations don't fire. Remaining FP surface: factual present-tense claims about groups ("Real users complain about load times" in a UX report). Legitimate-but-lost: person nouns without suffix coverage ("Great mentors" fires, "Great mentees" doesn't — accept misses over FPs).
- **`exemplar-cliche`** "case study in" branch: "published a case study in Nature" is a literal FP with no surface guard — carried at reduced instanceWeight (0.6) instead.
- **`decorative-metaphor`** (in nlpPatterns.ts): Copular metaphor sentences, two frames. (a) Anaphoric: "It's a volume knob stuck at max" — It/That/This + copula + optional adverb. (b) Definite-subject punchline: "The fan is now a convection heater aimed at your body" — The/This/That/Your/Our/My/His/Her/Its/Their + 1–2 lowercase subject words + is/are + **required** reframe adverb (now/just/basically/…) + a/an, and only when a preceding sentence exists in the same paragraph (the mandatory adverb + setup sentence is what separates a punchline restatement from a literal description — "The venue is a warehouse converted into a gallery" never fires). Shared gates: head noun in `CONCRETE_NOUNS` (generated, Brysbaert concreteness ≥4.2), a participle/preposition twist after the noun, and the Hapax Guard (vehicle noun recurring anywhere else in the doc suppresses — see `utils/docFrequency.ts`). Digits in the twist and any double quote in the sentence also suppress. Remaining FP surface: literal anaphoric descriptions of one-off objects outside dialogue ("It's a wedding planned for June" in a doc that never mentions the wedding again), and — definite branch only, carried at instanceWeight 0.85 — genuine state changes where "now" is temporal ("The fan is now a paperweight gathering dust" after "It broke"). Known misses: vehicles below the concreteness cutoff ("smoke detector" — detector scores 3.7), hyphenated heads ("band-aid" — the norms are single-word), adverb-less named-subject metaphors ("The gearbox is a bucket bolted to a prayer" — without the reframe adverb the literal-description FP surface is too large), and 3+-word definite subjects.
- **`concept-label`**: Matches `[content word] + [abstract suffix noun]` for ~35 suffix nouns (paradox, trap, treadmill, fatigue, tax, theater, syndrome, loop…) defined in `CONCEPT_LABEL_NOUNS` in wordPatterns.ts. A determiner/preposition before the noun never fires ("falls into the trap", "in limbo" — see `CONCEPT_LABEL_SKIP_PRECEDING`), and per-noun allowlists skip established literal compounds ("income tax", "chronic fatigue", "feedback loop", "movie theater"). Established-but-slop-adjacent coinages ("scope creep", "imposter syndrome") still fire by design; the rule targets LLM prose inflation. Remaining FP surface: literal compounds not on an allowlist ("castle moat", "suffered whiplash") and domain-heavy writing (medical "X syndrome", finance "X debt").
- **`superficial-analysis`**: The `, [participle] its/the/their/this [noun]` pattern can occasionally match legitimate summarizing phrases. `canRemove: true` lets users dismiss easily.
- **`triple-construction`**: Named-entity appositives are suppressed via a `#ProperNoun` check ("Dave Burwick, former CEO of Boston Beer, and Frank Luntz" does not fire), and comma-bracketed discourse markers are suppressed via exact match against `DISCOURSE_MARKER` ("In humid air, on the other hand, the atmosphere is packed with moisture, and evaporation slows" does not fire — the fronted parenthetical fakes a first list item; an item merely *containing* such a phrase still fires). Common-noun appositives ("Fermentation, a necessary step in brewing, and aging…") remain false positives — every surface heuristic (article presence, item length) has clear counterexamples, and fixing them requires semantic understanding beyond compromise/two.
- **`phantom-contrast`**: `[delimiter] [unit X] not [unit Y]` appositives where both units sit on the same ordered scale (time, tens→trillions, metric/imperial length) and the contrast direction *agrees* with an evaluative adjective earlier in the sentence ("short, hours not days" — the contrast restates "short"). Three gates keep it tight: bare contrasts with no adjective ("It took hours, not days") never fire — they may correct a stated estimate; disagreeing directions ("brief, days not minutes") never fire — those are informative; and a delimiter (comma/colon/dash) must precede unit X, so mid-clause phrasing ("lasted weeks not days") is out of scope. Remaining FP surface: the gating adjective can refer to a different dimension than the units ("the cheap venue was booked solid, months not weeks" — "cheap" gates a time contrast), and genuine corrections that happen to restate an in-sentence adjective still fire by design. The `think Xs, not Ys` branch requires both nouns plural, so "think big, not small" is intentionally missed; only the `, not Ys` tail is flagged so removal keeps "think Xs".
- **`false-range` client branches**: "everything/everyone/anything/anyone from X to Y" caps endpoints at 3 words and skips matches containing digits, but a movement sentence shaped like "everyone from interns went on to management" can still fire. "Xs and Ys alike" requires a plural-looking word (trailing single `s`, >3 chars) on one side to exclude the "similarly" sense ("look and act alike"), so plural-less flourishes ("young and old alike") are intentionally missed and s-ending verbs can rarely slip through. Bare "from X to Y" stays LLM-tier only — too ambiguous for regex.
- **`unicode-decoration`**: Any `\p{Extended_Pictographic}` run fires (©/®/™ excluded). A human deliberately using an emoji in casual prose is flagged the same as chatbot decoration — accepted; the rule targets prose, not chat messages.

## Key constraints on detectors

- **Code is never scanned.** `runClientDetectors()` masks markdown code regions (fenced blocks and inline backtick spans) to spaces via `maskCodeRegions()` before any detector runs — length-preserving, so offsets stay valid against the original text. App.tsx applies the same mask to the text sent to LLM detectors and to word count / writing metrics. Individual `detectXxx()` functions called directly (e.g. in unit tests) do NOT mask; only the `runClientDetectors()` pipeline does. Indented (4-space) code blocks are not masked — too ambiguous vs. list continuations.
- **Hapax Guard: imported vocabulary only.** (Terms defined in CONTEXT.md § Frequency.) A Violation whose term recurs anywhere else in the document — head-noun matched, inflections folded, doc-wide — is suppressed, because recurrence means the document is natively in that term's domain ("knob" elsewhere → "It's a volume knob stuck at max" is literal). Apply it only to rules that flag *imported* vocabulary (metaphor vehicles; scare-quoted terms later adopted unquoted). Never apply it to rules that flag *invented* vocabulary — recurrence of a coined label ("the attention paradox" ×5) is not exculpatory, so guarding `invented-concept-label` would create silent false negatives on the worst documents. A *recurring* imported vehicle is `dead-metaphor`'s jurisdiction (document-tier), not a client rule's.
- **Paragraph boundaries matter.** Detectors that operate on sentence pairs must use `splitParagraphs()` first, then split by sentence within each paragraph. Never pair sentences across `\n\n` boundaries.
- **Q→A: answer must be short, and dialogue never fires.** The question-then-answer detector requires the answer sentence to be ≤120 chars, and skips pairs where either sentence contains a double quote or opens with any quote character (quoted questions/answers are speech, not the rhetorical tell).
- **Modal verbs `should`/`would` are not hedges.** Only `might`, `could`, `may` count as hedging modals in the hedge stack detector.
- **"Kind of" as classifier is not a hedge.** "a kind of X" is precise categorization. Only match in filler positions.
- **Unicode apostrophes.** User text from contenteditable uses curly quotes (`'` U+2019). Any regex matching contractions must use `[\u2019']` not just `'`. Verified via byte inspection — `['']` written in source looks identical but may contain two straight quotes if editor normalizes them.
- **Use regex literals, not `new RegExp(string)`, for Unicode character classes.** `new RegExp('[\\u201c"]...')` silently fails to match in this Vite/TS build pipeline — the `\uXXXX` escapes inside the string are not reliably interpreted by the regex engine at runtime. Always write the pattern as a literal: `/["""][^"""]{2,40}["""]/g`. This was discovered when `detectScareQuotes` produced zero matches despite correct-looking source: the string-constructed regex matched in a standalone `re.test()` call but returned `null` on the actual editor text.
- **Avoid greedy cross-sentence regex.** `[^.!?]*` patterns cross paragraph and sentence boundaries silently. Work sentence-by-sentence or paragraph-by-paragraph.
- **LLM detectors: use matchedText, not offsets.** The model returns `matchedText` as an exact substring copy; we locate it with `text.indexOf()`. Do not ask the LLM for character offsets — it miscounts them.
- **LLM suggestedChange must be literal replacement text.** Both system prompts instruct the model explicitly. A `sanitizeSuggestedChange()` guard also catches instruction-prefixed suggestions (e.g. "Remove this…") and converts them to `""`.

## Editor model

The main editor is a `contenteditable` div. React does not control it directly:
- `onInput` reads `editor.innerText` and updates `text` state
- A `useEffect` rebuilds `editor.innerHTML` (via `buildHighlightedHTML`) when violations or hidden rules change
- Caret position is saved (character offset) before innerHTML replacement and restored after
- Custom undo/redo stack via refs — `innerHTML` replacement destroys native browser undo history. `handleKeyDown` intercepts Cmd+Z / Cmd+Shift+Z.

## Applying changes

`applyTextChange(startIndex, endIndex, replacement)` in App.tsx:
- Splices `replacement` into the text at the given character range
- Runs `cleanupAfterEdit()` to fix artifacts: space before punctuation, double spaces, space at line start, space before closing quote+punctuation
- Used for both "remove" (replacement = `""`) and "apply suggestion" flows

## Popover

Clicking a `<mark>` element opens a popover anchored below it. The popover shows:
1. Rule name + color swatch
2. Explanation (from LLM) or tip (from rule definition) in italic serif
3. Inline diff (`InlineDiff` component): common prefix/suffix in grey, removed text struck through in red, added text in green
4. Apply button (green) — calls `applyTextChange` with the suggestion or `""` for removal
5. Dismiss button

For `canRemove` rules with no LLM suggestion, `suggestedChange` defaults to `""` so the diff shows the full matched text struck through.

## URL sharing

Text is stored in the URL hash as `encodeURIComponent(text)`. On load, `useState` lazy initializer reads `window.location.hash` to restore it. The `useHashText` hook syncs changes back with a 600ms debounce via `history.replaceState` (no history entries added).

## Reference

- Source rules: https://git.eeqj.de/sneak/prompts/src/branch/main/prompts/LLM_PROSE_TELLS.md

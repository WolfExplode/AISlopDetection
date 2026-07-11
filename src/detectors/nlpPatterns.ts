/**
 * NLP-assisted detectors using compromise for context-sensitive slop words —
 * cases where simple word matching produces too many false positives.
 *
 * Performance: a trigger-word pre-filter (fast regex) identifies sentences that
 * contain any candidate word, then compromise runs only on those small chunks
 * rather than the full document. For a large document with few slop words, NLP
 * may run on 5–10 sentences instead of thousands of words.
 */

import nlp from './nlpInstance'
import type { Violation } from '../types'
import { VERB_INTENSIFIERS, ADJECTIVE_INTENSIFIERS, ADJECTIVE_PERMITTED_FOLLOWING, CONTEXT_SENSITIVE_ADVERBS } from '../scoring.config'
import { CONCRETE_NOUNS } from './concreteNouns'
import { isHapax } from '../utils/docFrequency'

// compromise .json({offset:true, tags:true}) shapes
interface TermJson {
  text: string
  tags: string[]
  offset: { start: number; length: number }
}
interface MatchJson {
  text: string
  offset: { start: number; length: number }
  terms: TermJson[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NlpDoc = any

// Simpler synonyms to suggest when flagging a slop verb, keyed by stem.
// undefined = no suggestion (verb is too context-dependent to auto-replace)
const VERB_REPLACEMENTS: Record<string, string | undefined> = {
  showcase:    'show',
  boast:       'have',
  leverage:    'use',
  harness:     'use',
  foster:      'build',
  underscore:  'show',
  navigate:    'handle',
  streamline:  'simplify',
  spearhead:   'lead',
  craft:       'make',
  bolster:     'support',
  emphasize:   'stress',
  enhance:     'improve',
  garner:      'get',
  delve:       undefined,
  embark:      undefined,
  resonate:    undefined,
}

// Per-verb signal strength in the overused-intensifier / elevated-register context
const VERB_WEIGHTS: Record<string, number> = {
  showcase:    0.70,
  boast:       0.65,
  leverage:    0.80,
  harness:     0.75,
  foster:      0.75,
  underscore:  0.70,
  navigate:    0.65,
  streamline:  0.70,
  spearhead:   0.75,
  craft:       0.60,
  bolster:     0.70,
  emphasize:   0.40,
  enhance:     0.45,
  garner:      0.80,
  delve:       1.00,
  embark:      0.90,
  resonate:    0.75,
  illuminate:  0.70,
  crystallize: 0.85,
}

// Strip trailing 'e' from a verb stem so the prefix matches all conjugated forms.
// Verbs ending in 'e' drop the 'e' before '-ing' (leverage→leveraging, not leverageing),
// so the stem prefix must be truncated to match all forms:
//   leverage  → leverag  matches leverage, leverages, leveraged, leveraging  ✓
//   showcase  → showcas  matches showcase, showcases, showcased, showcasing  ✓
//   streamline → streamlin matches all forms ✓
// Stems NOT ending in 'e' work as-is (foster → foster matches fostering etc.).
function toStemPrefix(s: string): string {
  return s.endsWith('e') ? s.slice(0, -1) : s
}

// All stems that can trigger an NLP violation. Any sentence containing one of
// these words is a candidate; sentences without them are skipped entirely.
// Verb stems are mapped through toStemPrefix so that gerunds and -s forms
// (e.g. "leveraging", "showcasing") are caught by the pre-filter.
const TRIGGER_STEMS = [
  'key',
  ...['highlight', 'showcase', 'boast', 'craft'].map(toStemPrefix),
  ...VERB_INTENSIFIERS.map(toStemPrefix),
  // "in a [adj] way/manner/sense" phrase detector (exact words, no conjugation)
  'way', 'manner', 'sense', 'fashion', 'regard',
  // Adjective intensifiers (context-sensitive): toStemPrefix strips trailing 'e',
  // so 'dynamic' → 'dynami' which prefix-matches dynamic/dynamics/dynamically.
  ...Object.keys(ADJECTIVE_INTENSIFIERS).map(toStemPrefix),
  // Context-sensitive adverbs: no conjugation, add exact words.
  ...Object.keys(CONTEXT_SENSITIVE_ADVERBS),
]

// Single fast regex used to pre-filter text before any NLP work
const TRIGGER_RE = new RegExp(`\\b(${TRIGGER_STEMS.join('|')})`, 'i')

/**
 * Given a character position in text, return the containing sentence —
 * the run of text bounded by .!?\n or document edges — with its start offset.
 */
function extractSentenceAt(text: string, pos: number): { text: string; offset: number } {
  let start = pos
  while (start > 0 && !/[.!?\n]/.test(text[start - 1])) start--
  while (start < pos && /\s/.test(text[start])) start++  // skip leading whitespace

  let end = pos
  while (end < text.length && !/[.!?\n]/.test(text[end])) end++
  if (end < text.length) end++  // include the terminating punctuation/newline

  return { text: text.slice(start, end), offset: start }
}

/** Conjugate baseVerb to match the tense tags of a detected verb term */
function conjugate(baseVerb: string, tags: string[]): string {
  const conj = nlp(baseVerb).verbs().conjugate()[0] as Record<string, string> | undefined
  if (!conj) return baseVerb
  if (tags.includes('Gerund'))       return conj['Gerund']       ?? baseVerb
  if (tags.includes('PastTense'))    return conj['PastTense']    ?? baseVerb
  // Infinitive must be checked before PresentTense — compromise tags both as PresentTense,
  // but adds Infinitive only for "to verb" / base form (not 3rd-person singular "verbs")
  if (tags.includes('Infinitive'))   return conj['Infinitive']   ?? baseVerb
  if (tags.includes('PresentTense')) return conj['PresentTense'] ?? baseVerb
  return conj['Infinitive'] ?? baseVerb
}

/**
 * Flag only the first term of a phrase match.
 * e.g. "key #Noun" → flags only "key", not "key challenge"
 * No suggestedChange — deletion of an adjective is usually safe.
 */
function firstTermViolations(doc: NlpDoc, pattern: string, ruleId: string): Violation[] {
  const violations: Violation[] = []
  doc.match(pattern).forEach((m: NlpDoc) => {
    const matches = m.json({ offset: true }) as MatchJson[]
    if (!matches.length) return
    const term = matches[0].terms?.[0]
    if (!term?.offset) return
    const { start, length } = term.offset
    violations.push({ ruleId, startIndex: start, endIndex: start + length, matchedText: term.text })
  })
  return violations
}

/**
 * Convert an adjective to its adverb form for phrase-collapse suggestions.
 * Uses compromise's built-in adjective→adverb derivation (handles irregular forms,
 * suffix rules, lexicon lookups). Falls back to simple suffix rules if compromise
 * doesn't recognise the word as an adjective in isolation.
 */
function toAdverb(adj: string): string {
  const result = nlp(adj).adjectives().toAdverb().text()
  if (result) return result
  // Fallback suffix rules for words compromise doesn't tag as adjectives in isolation
  const lower = adj.toLowerCase()
  if (lower.endsWith('ic')) return adj + 'ally'
  if (lower.endsWith('le')) return adj.slice(0, -1) + 'y'
  if (lower.endsWith('y') && lower.length > 2) return adj.slice(0, -1) + 'ily'
  return adj + 'ly'
}

/**
 * Find slop verbs among all #Verb-tagged terms and suggest simpler conjugated synonyms.
 *
 * Uses `doc.match('#Verb')` rather than `doc.verbs()` to avoid depending on the
 * three-tier chunker plugin. The chunker redefines how verb phrases are grouped
 * (changing `.verbs()` to use chunk-based matching via `<Verb>`), which requires
 * ALL three-tier plugins to be loaded for correct context-dependent tagging of
 * ambiguous nouns/verbs like "leverage" or "harness". The two-tier POS tagger
 * already tags each term with tense (Gerund, PastTense, Infinitive, PresentTense),
 * so we get the tense info we need without the chunk-level machinery.
 */
function verbViolations(doc: NlpDoc, stem: RegExp, ruleId: string): Violation[] {
  const violations: Violation[] = []
  const json = doc.match('#Verb').json({ offset: true, tags: true }) as MatchJson[]
  for (const phrase of json) {
    // Each phrase is a single term when matching #Verb (not a chunk)
    const term = phrase.terms?.[0]
    if (!term?.offset) continue
    if (!stem.test(term.text)) continue
    const { start, length } = term.offset
    // Find the base replacement and conjugate to match the detected tense
    const base = Object.keys(VERB_REPLACEMENTS).find(k => term.text.toLowerCase().startsWith(toStemPrefix(k)))
    const baseReplacement = base ? VERB_REPLACEMENTS[base] : undefined
    // null = explicitly no action (verb with no clean synonym — deletion would break the sentence)
    const suggestedChange = baseReplacement ? conjugate(baseReplacement, term.tags) : null
    violations.push({
      ruleId,
      startIndex: start,
      endIndex: start + length,
      matchedText: term.text,
      instanceWeight: VERB_WEIGHTS[base ?? ''] ?? 0.70,
      suggestedChange,
    })
  }
  return violations
}

/**
 * Detect "in a [adj] way/manner/sense/fashion/regard" constructions.
 * Flags the WHOLE phrase and suggests collapsing to an adverb
 * (e.g. "in a crucial way" → "crucially").
 */
function inAWayViolations(doc: NlpDoc, _chunkText: string, ruleId: string): Violation[] {
  const violations: Violation[] = []
  doc.match('in (a|an) #Adjective (way|manner|sense|fashion|regard)').forEach((m: NlpDoc) => {
    const matches = m.json({ offset: true, tags: true }) as MatchJson[]
    if (!matches.length) return
    const phrase = matches[0]
    if (!phrase.offset) return
    const { start, length } = phrase.offset
    const adjTerm = (phrase.terms ?? []).find((t: TermJson) => t.tags.includes('Adjective'))
    if (!adjTerm) return
    // compromise's phrase offset already includes trailing punctuation in `length`
    // (e.g. "in a crucial way." has length=17, spanning the period).
    // Check phrase.text's last character — NOT chunkText[start+length] which is
    // always the character AFTER the match (undefined at sentence end).
    const lastChar = phrase.text.slice(-1)
    const punct = /[.!?,;:]/.test(lastChar) ? lastChar : ''
    violations.push({
      ruleId,
      startIndex: start,
      endIndex: start + length,  // already includes punct
      matchedText: phrase.text,  // already includes punct
      suggestedChange: toAdverb(adjTerm.text) + punct,
    })
  })
  return violations
}

// All verb stems flagged as overused-intensifier, combined for a single regex pass
const OVERUSED_VERB_STEMS = ['showcase', 'boast', ...VERB_INTENSIFIERS]
const OVERUSED_VERB_RE = new RegExp(
  `^(${OVERUSED_VERB_STEMS.map(toStemPrefix).join('|')})`,
  'i',
)

// ── Regex fallback for verb conjugation ──────────────────────────────────────
//
// The NLP path (verbViolations) requires the POS tagger to tag the word as #Verb.
// For ambiguous words like "streamlines" / "fosters", the two-tier tagger sometimes
// tags them as Noun (especially 3rd-person singular forms, which look like plurals).
// This regex fallback catches -s/-es and -ing forms directly and provides the
// correctly conjugated replacement, covering the gap.
//
// Past tense (-ed/-d) is intentionally excluded: the NLP tagger correctly handles
// past tense forms (they're unambiguous), and past-tense substitutions for
// irregular replacements (get→got, build→built) would require a separate lookup.
// Base forms are also excluded: the NLP path handles them correctly.
//
// Deduplication in index.ts ensures no double-flagging when both paths fire.

function addS(verb: string): string {
  if (verb === 'have') return 'has'   // irregular: boast → have → has
  if (verb.endsWith('y') && !/[aeiou]y$/i.test(verb)) return verb.slice(0, -1) + 'ies'
  if (/([sxz]|[sc]h)$/i.test(verb)) return verb + 'es'
  return verb + 's'
}

function addIng(verb: string): string {
  if (verb === 'get') return 'getting'  // irregular: garner → get → getting
  if (verb.endsWith('e')) return verb.slice(0, -1) + 'ing'
  return verb + 'ing'
}

/**
 * Regex fallback: detect 3rd-person singular and gerund forms of VERB_INTENSIFIERS
 * that the NLP POS tagger misclassifies as nouns. Provides the conjugated replacement.
 */
export function detectVerbIntensifierForms(text: string): Violation[] {
  const violations: Violation[] = []
  for (const stem of OVERUSED_VERB_STEMS) {
    const replacement = VERB_REPLACEMENTS[stem]
    if (replacement === undefined) continue  // no clean swap (delve, embark, resonate)
    const weight = VERB_WEIGHTS[stem] ?? 0.70
    const prefix = toStemPrefix(stem)
    const sForm = stem.endsWith('e') ? prefix + 'es' : prefix + 's'
    const ingForm = prefix + 'ing'
    for (const [form, suggestion] of [[sForm, addS(replacement)], [ingForm, addIng(replacement)]] as [string, string][]) {
      const re = new RegExp(`\\b${form}\\b`, 'gi')
      let m: RegExpExecArray | null
      while ((m = re.exec(text)) !== null) {
        violations.push({
          ruleId: 'overused-intensifier',
          startIndex: m.index,
          endIndex: m.index + m[0].length,
          matchedText: m[0],
          instanceWeight: weight,
          suggestedChange: suggestion,
        })
      }
    }
  }
  return violations
}

// Semi-copular verbs that introduce predicate adjectives but may not be tagged
// as #Copula in compromise/two's two-tier POS tagger. #Copula covers the core
// set (is, are, was, were, am, be, been, being); the explicit list below adds
// extended linking verbs that are reliable enough to flag slop adjectives after.
const SEMI_COPULA_PAT = 'remain|remains|remained|seem|seems|seemed|appear|appears|appeared|become|becomes|became|look|looks|looked|feel|feels|felt|sound|sounds'

/**
 * Detect adjective intensifiers (vital, robust, dynamic, fundamental) only in
 * slop-indicative positions:
 *   1. Predicate: "(#Copula|SEMI_COPULA) #Adverb? [word]" — "is vital", "remains dynamic", "is highly robust"
 *   2. Attributive: "[word] #Noun" — "a vital role", "a dynamic approach"
 *      with per-adjective compound exclusions (vital signs, dynamic programming, etc.)
 *
 * suppressUnsafeDeletions in index.ts handles predicate cases automatically
 * (sets suggestedChange: null when a linking verb precedes the violation).
 */
function detectAdjectiveIntensifiers(doc: NlpDoc, ruleId: string): Violation[] {
  const violations: Violation[] = []
  for (const word of Object.keys(ADJECTIVE_INTENSIFIERS)) {
    const weight = ADJECTIVE_INTENSIFIERS[word]
    const permitted = ADJECTIVE_PERMITTED_FOLLOWING[word] ?? []

    // Build permitted compound positions via exact text matching — more reliable than
    // relying on #Noun tagging for domain-specific words like "theorem" or "signs"
    // that may not be in compromise's lexicon.
    // e.g. "vital (signs|organs|...)" matches regardless of how "signs" is tagged.
    const permittedPositions = new Set<number>()
    if (permitted.length > 0) {
      doc.match(`${word} (${permitted.join('|')})`).forEach((m: NlpDoc) => {
        const term = (m.json({ offset: true }) as MatchJson[])[0]?.terms?.[0]
        if (term?.offset) permittedPositions.add(term.offset.start)
      })
    }

    // Case 1: predicate — "(#Copula|semi-copula) #Adverb? [word]"
    // #Adverb? allows optional degree adverb ("is highly robust", "was quite vital").
    // Use slice(-1)[0] to get the last term (adjective), since adverb may or may not be present.
    // Skip if adjective's position is a permitted compound (e.g. "are fundamental rights").
    doc.match(`(#Copula|${SEMI_COPULA_PAT}) #Adverb? ${word}`).forEach((m: NlpDoc) => {
      const phrase = (m.json({ offset: true, tags: true }) as MatchJson[])[0]
      const term = phrase?.terms?.slice(-1)[0]  // last term = adjective
      if (!term?.offset) return
      if (permittedPositions.has(term.offset.start)) return
      const { start, length } = term.offset
      violations.push({ ruleId, startIndex: start, endIndex: start + length, matchedText: term.text, instanceWeight: weight })
    })

    // Case 2: attributive — "[word] #Noun", flag the adjective (terms[0]).
    // Skip if the position is a permitted compound (already identified above).
    doc.match(`${word} #Noun`).forEach((m: NlpDoc) => {
      const phrase = (m.json({ offset: true, tags: true }) as MatchJson[])[0]
      const terms = phrase?.terms ?? []
      if (terms.length < 2) return
      const [adjTerm] = terms
      if (!adjTerm?.offset) return
      if (permittedPositions.has(adjTerm.offset.start)) return
      const { start, length } = adjTerm.offset
      violations.push({ ruleId, startIndex: start, endIndex: start + length, matchedText: adjTerm.text, instanceWeight: weight })
    })
  }
  return violations
}

/**
 * Detect context-sensitive adverbs (quietly, deeply, remarkably, clearly) only
 * when they signal slop, not legitimate adverb-verb modification:
 *   FLAG: [adverb] #Adjective — "quietly powerful", "clearly superior"
 *   FLAG: [adverb] #Gerund   — "deeply concerning" (gerund used as adjective)
 *   FLAG: sentence-initial   — "Clearly, this approach..." (offset 0 in chunk)
 *   SKIP: [adverb] #Verb (non-gerund) — "quietly left", "clearly stated"
 */
function detectContextSensitiveAdverbs(doc: NlpDoc, ruleId: string): Violation[] {
  const candidates: Violation[] = []
  for (const adverb of Object.keys(CONTEXT_SENSITIVE_ADVERBS)) {
    // Modifying an adjective: "quietly powerful", "clearly superior"
    candidates.push(...firstTermViolations(doc, `${adverb} #Adjective`, ruleId))
    // Gerund used as adjective: "deeply concerning", "remarkably unsettling"
    // Compromise may tag -ing forms as #Gerund rather than #Adjective in some contexts.
    candidates.push(...firstTermViolations(doc, `${adverb} #Gerund`, ruleId))
    // Sentence-initial: adverb at chunk position 0 (extractSentenceAt strips leading whitespace).
    // Can't use "[adverb] ," because compromise two-tier may not match punctuation in patterns.
    doc.match(adverb).forEach((m: NlpDoc) => {
      const term = (m.json({ offset: true }) as MatchJson[])[0]?.terms?.[0]
      if (!term?.offset || term.offset.start !== 0) return
      candidates.push({ ruleId, startIndex: 0, endIndex: term.offset.length, matchedText: term.text })
    })
  }
  // Collect positions where adverb precedes a non-gerund action verb — those are legitimate.
  // Gerunds are excluded from this suppression because they often act as adjectives
  // ("deeply concerning", "quietly revolutionary") rather than action verbs.
  const beforeActionVerb = new Set<number>()
  for (const adverb of Object.keys(CONTEXT_SENSITIVE_ADVERBS)) {
    doc.match(`${adverb} #Verb`).forEach((m: NlpDoc) => {
      const matches = m.json({ offset: true, tags: true }) as MatchJson[]
      if (!matches.length) return
      const terms = matches[0].terms ?? []
      const adverbTerm = terms[0]
      const verbTerm = terms[1]
      if (!adverbTerm?.offset) return
      if (verbTerm?.tags?.includes('Gerund')) return  // gerund → may be adjective, don't suppress
      beforeActionVerb.add(adverbTerm.offset.start)
    })
  }
  return candidates
    .filter(v => !beforeActionVerb.has(v.startIndex))
    .map(v => ({ ...v, instanceWeight: CONTEXT_SENSITIVE_ADVERBS[v.matchedText.toLowerCase()] ?? 0.55 }))
}

/** Run all NLP sub-detectors on a pre-parsed doc; positions are chunk-relative */
function runNlpDetectors(doc: NlpDoc, chunkText: string): Violation[] {
  const v: Violation[] = []
  v.push(...firstTermViolations(doc, 'key #Noun', 'overused-intensifier').map(x => ({ ...x, instanceWeight: 0.60 })))
  v.push(...verbViolations(doc, OVERUSED_VERB_RE, 'overused-intensifier'))
  v.push(...verbViolations(doc, /^craft/i, 'elevated-register'))
  v.push(...inAWayViolations(doc, chunkText, 'overused-intensifier').map(x => ({ ...x, instanceWeight: 0.75 })))
  v.push(...detectAdjectiveIntensifiers(doc, 'overused-intensifier'))
  v.push(...detectContextSensitiveAdverbs(doc, 'filler-adverbs'))
  return v
}

export function detectContextualSlop(text: string): Violation[] {
  // Fast pre-check: bail immediately if no trigger words exist anywhere in the text
  if (!TRIGGER_RE.test(text)) return []

  // Scan for all trigger positions and collect the containing sentence for each.
  // Map key = sentence start offset → each sentence is parsed at most once.
  const triggerRe = new RegExp(TRIGGER_RE.source, 'gi')
  const windows = new Map<number, { text: string; offset: number }>()
  let m: RegExpExecArray | null
  while ((m = triggerRe.exec(text)) !== null) {
    const sentence = extractSentenceAt(text, m.index)
    windows.set(sentence.offset, sentence)
  }

  // Run NLP only on triggered sentences, then offset results back to document positions
  const violations: Violation[] = []
  for (const { text: chunk, offset } of windows.values()) {
    const doc = nlp(chunk)
    for (const v of runNlpDetectors(doc, chunk)) {
      violations.push({ ...v, startIndex: v.startIndex + offset, endIndex: v.endIndex + offset })
    }
  }
  return violations
}

// ── Negation pivot (structural) ───────────────────────────────────────────────

function splitSentencesWithOffsets(text: string): Array<{ text: string; start: number }> {
  const sentences: Array<{ text: string; start: number }> = []
  // A lone newline is a sentence boundary too (the contenteditable editor emits
  // single \n per line break, and lines often lack terminal punctuation) —
  // consistent with extractSentenceAt, which bounds sentences by [.!?\n].
  const splitRe = /(?<=[.!?])\s+(?=[A-Z"'])|\n+/g
  let prev = 0
  let m: RegExpExecArray | null
  while ((m = splitRe.exec(text)) !== null) {
    const sentText = text.slice(prev, m.index)
    if (sentText.trim()) sentences.push({ text: sentText, start: prev })
    prev = m.index + m[0].length
  }
  const last = text.slice(prev)
  if (last.trim()) sentences.push({ text: last, start: prev })
  return sentences
}

// The final `[’'](?:s|re)\s+not` alternative catches the contracted copula ("It's not",
// "they're not") that the "is not"/"isn't" forms miss. Without it the two-sentence guard
// below fails to recognize "It's not X, it's Y" as already-negated and folds the preceding
// sentence into the pivot span.
const NEG_PIVOT_RE = /\b(isn[’']?t|doesn[’']?t|aren[’']?t|wasn[’']?t|won[’']?t|can[’']?t|don[’']?t|didn[’']?t|is\s+not|does\s+not|are\s+not|was\s+not|do\s+not|will\s+not|cannot|never|no\s+longer)\b|[’'](?:s|re)\s+not\b/i
const COREFERENT_RE = /^(it|this|that|they|these|those|we)\b/i
const COPULA_PIVOT_RE = /^(it[’']?s|it\s+is|they[’']?re|that[’']?s|this\s+is)\b/i

/**
 * Detect the negation-pivot pattern using sentence structure rather than regex backreferences.
 *
 * Two cases:
 *   1. Two-sentence pivot: S1 contains a genuine negation; S2 opens with a coreferent pronoun
 *      (it, this, that, they, these, those, we) or the same first word as S1.
 *      e.g. "AI isn't just a productivity boost. It gets us closer to our mission."
 *           "This post isn't really about Bourdain. It's about what he opened up in me."
 *           "This doesn't solve the problem. This reframes it."
 *
 *   2. Single-sentence active-verb pivot: negation in the first clause, comma, then coreferent
 *      pronoun + active (non-copula) verb in the second clause.
 *      e.g. "AI isn't just a productivity boost, it gets us closer to our mission."
 *      (Copula forms — "it's", "it is", "they're" — are handled by reframeRe in wordPatterns.ts.)
 *
 * Compromise is used to confirm genuine negation (#Negative tag) and verb presence after the
 * pivot, filtering false positives from the regex pre-check.
 */
export function detectNegationPivotStructural(text: string): Violation[] {
  if (!NEG_PIVOT_RE.test(text)) return []

  const violations: Violation[] = []
  const parts = text.split(/(\n\n+)/)
  let docPos = 0

  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi]
    if (pi % 2 === 1) { docPos += part.length; continue }

    const paraOffset = docPos
    docPos += part.length

    if (!NEG_PIVOT_RE.test(part)) continue

    const sentences = splitSentencesWithOffsets(part)

    // ── Two-sentence pivot ────────────────────────────────────────────────────
    for (let i = 0; i < sentences.length - 1; i++) {
      const s1 = sentences[i]
      const s2 = sentences[i + 1]

      if (!NEG_PIVOT_RE.test(s1.text)) continue
      if (!nlp(s1.text).has('#Negative')) continue  // confirm genuine negation, not idiomatic "not bad"

      // S2 must not itself be negated — "It doesn't X. It doesn't Y." is not a pivot
      if (NEG_PIVOT_RE.test(s2.text) && nlp(s2.text).has('#Negative')) continue

      // S1 must be substantive (filters "Never." or "No." as opening sentences)
      if (s1.text.trim().split(/\s+/).length < 3) continue

      const s2trimmed = s2.text.trimStart()
      const s1trimmed = s1.text.trimStart()
      const s1firstWord = s1trimmed.match(/^\S+/)?.[0] ?? ''

      // "this/that/these/those" after a first-person negation ("I can't X. This is Y.")
      // almost always refers to the surrounding situation, not to the negated thing.
      // The classic slop pivot is third-person: "X isn't Y. It's Z."
      // Strip leading quote chars before the first-person check — sentence splitter
      // keeps opening quotes attached to the sentence start (e.g. `"I can't...`).
      const s1unquoted = s1trimmed.replace(/^\W+/, '')
      const FIRST_PERSON_RE = /^(I|We|My|Our)\b/
      const DEMONSTRATIVE_RE = /^(this|that|these|those)\b/i
      const startsWithCoreferent = COREFERENT_RE.test(s2trimmed) &&
        !(FIRST_PERSON_RE.test(s1unquoted) && DEMONSTRATIVE_RE.test(s2trimmed))

      // Articles ("The", "A", "An") carry no subject identity — exclude them from
      // same-subject matching so "The X... The Y." doesn't fire.
      const ARTICLE_RE = /^(the|a|an)\b$/i
      const startsWithSameSubject = s1firstWord.length > 1 &&
        !ARTICLE_RE.test(s1firstWord) &&
        s2trimmed.toLowerCase().startsWith(s1firstWord.toLowerCase())

      if (!startsWithCoreferent && !startsWithSameSubject) continue

      const start = paraOffset + s1.start
      const end = paraOffset + s2.start + s2.text.length
      violations.push({
        ruleId: 'negation-pivot',
        startIndex: start,
        endIndex: end,
        matchedText: text.slice(start, end),
      })
    }

    // ── Single-sentence active-verb pivot ─────────────────────────────────────
    // Copula forms ("it's", "it is", "they're", "that's", "this is") are handled
    // by the reframeRe regex in wordPatterns.ts. This catches active verbs only.
    for (const s of sentences) {
      const commaIdx = s.text.indexOf(',')
      if (commaIdx === -1) continue

      // Negation must be in the FIRST clause (before the comma), not the second.
      // "Without any instruction, it becomes clear he doesn't care" — negation is
      // after the comma, so this is not a pivot. Only flag when the negated claim
      // is what's being reframed: "AI isn't just X, it does Y."
      const beforeComma = s.text.slice(0, commaIdx)
      if (!NEG_PIVOT_RE.test(beforeComma)) continue
      if (!nlp(beforeComma).has('#Negative')) continue

      const afterComma = s.text.slice(commaIdx + 1).trimStart()
      if (!COREFERENT_RE.test(afterComma)) continue
      if (COPULA_PIVOT_RE.test(afterComma)) continue  // reframeRe handles these

      // Require 4+ words after comma (filters epistemic "it seems", "it appears")
      if (afterComma.trim().split(/\s+/).length < 4) continue

      // Confirm a verb is present after the pronoun
      if (!nlp('x ' + afterComma).has('#Verb')) continue

      const start = paraOffset + s.start
      const end = paraOffset + s.start + s.text.length
      violations.push({
        ruleId: 'negation-pivot',
        startIndex: start,
        endIndex: end,
        matchedText: text.slice(start, end),
      })
    }
  }

  return violations
}

// ── Fragment negation ─────────────────────────────────────────────────────────

/**
 * Detect "Not X. Y." fragment pairs: a bare negation fragment (no verb, starts
 * with "Not") followed immediately by a short positive reframe fragment.
 * e.g. "Not the shiny draft. The one that scared you."
 *      "Not what you know. What you do."
 */
export function detectFragmentNegation(text: string): Violation[] {
  if (!/\bNot\s/m.test(text)) return []

  const violations: Violation[] = []
  const parts = text.split(/(\n\n+)/)
  let docPos = 0

  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi]
    if (pi % 2 === 1) { docPos += part.length; continue }

    const paraOffset = docPos
    docPos += part.length

    if (!/\bNot\s/.test(part)) continue

    const sentences = splitSentencesWithOffsets(part)

    for (let i = 0; i < sentences.length - 1; i++) {
      const s1 = sentences[i]
      const s2 = sentences[i + 1]

      // S1: starts with "Not " and is a noun-phrase or noun-clause fragment (no main verb)
      if (!/^Not\s/i.test(s1.text.trimStart())) continue
      if (s1.text.trim().split(/\s+/).length > 8) continue  // too long to be a fragment

      // Allow "Not what/how/where/when/who..." — verb is inside a subordinate noun clause,
      // not the main clause. "Not what you know." is still a fragment rhetorically.
      const wordAfterNot = s1.text.trimStart().split(/\s+/)[1]?.toLowerCase().replace(/\W/g, '') ?? ''
      const NOUN_CLAUSE_STARTERS = new Set(['what', 'how', 'where', 'when', 'which', 'that', 'who', 'whom', 'whose'])
      if (nlp(s1.text).has('#Verb') && !NOUN_CLAUSE_STARTERS.has(wordAfterNot)) continue

      // S2: short positive fragment or clause, not itself negated
      if (s2.text.trim().split(/\s+/).length > 12) continue
      if (NEG_PIVOT_RE.test(s2.text) && nlp(s2.text).has('#Negative')) continue

      const start = paraOffset + s1.start
      const end = paraOffset + s2.start + s2.text.length
      violations.push({
        ruleId: 'fragment-negation',
        startIndex: start,
        endIndex: end,
        matchedText: text.slice(start, end),
      })
    }
  }

  return violations
}

// ── Short-hook paragraph ──────────────────────────────────────────────────────

/**
 * Detect the "short hook + evidence pile" paragraph rhythm:
 * a punchy opener of ≤8 words followed by 3+ substantially longer sentences.
 * Uses compromise sentence tokenization (handles abbreviations, initials, etc.)
 * rather than naive `.` splitting.
 */
export function detectShortHookParagraph(text: string): Violation[] {
  const violations: Violation[] = []
  // Split into paragraphs, preserving separator lengths for accurate offsets
  const parts = text.split(/(\n\n+)/)
  let pos = 0
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (i % 2 === 1) { pos += part.length; continue }  // separator
    const para = part
    const paraOffset = pos
    pos += para.length

    // Quick pre-filter: need at least 2 sentence-ending punctuation marks
    if ((para.match(/[.!?]/g) ?? []).length < 2) continue

    // Split on sentence-ending punctuation followed by whitespace + capital letter.
    // compromise/two doesn't include the sentences plugin; a regex split is
    // sufficient here since we only need sentence count and word counts.
    const sentences = para.split(/(?<=[.!?])\s+(?=[A-Z"'])/).map(s => s.trim()).filter(Boolean)
    if (sentences.length < 3) continue

    const wordCount = (s: string) => s.trim().split(/\s+/).length
    const firstWords = wordCount(sentences[0])
    if (firstWords > 10 || firstWords < 2) continue
    // Skip heading/label fragments like "### 4." or "**B." — markdown markers + short token
    if (/^[#*_\s]*\w{1,3}\.\s*$/.test(sentences[0])) continue

    const restLengths = sentences.slice(1).map(wordCount)
    const restAvg = restLengths.reduce((a, b) => a + b, 0) / restLengths.length
    if (restAvg < firstWords * 1.5 || restAvg < 12) continue

    const firstStart = para.indexOf(sentences[0])
    if (firstStart === -1) continue
    violations.push({
      ruleId: 'short-hook-paragraph',
      startIndex: paraOffset + firstStart,
      endIndex: paraOffset + firstStart + sentences[0].length,
      matchedText: sentences[0],
    })
  }
  return violations
}

// ── Triple construction ───────────────────────────────────────────────────────


export function detectTripleConstruction(text: string): Violation[] {
  if (!text.includes(',')) return []

  // Collect one sentence window per comma position (same pattern as detectContextualSlop)
  const windows = new Map<number, { text: string; offset: number }>()
  let pos = text.indexOf(',')
  while (pos !== -1) {
    const sentence = extractSentenceAt(text, pos)
    windows.set(sentence.offset, sentence)
    pos = text.indexOf(',', pos + 1)
  }

  // Appositive suppression for named-entity constructions.
  //
  // The Oxford comma regex can misfire on "Name, [appositive title], and Name" —
  // e.g. "Marcus Webb, head of product strategy, and Gina Torres" — where B is a
  // title phrase describing A rather than a parallel list item.
  //
  // The only reliable surface signal available in compromise/two is #ProperNoun:
  // if A ends with a proper noun and B does NOT start with one, B is almost
  // certainly an appositive of A. We suppress those cases.
  //
  // Known limitation — common-noun appositives are NOT suppressed:
  //   "Fermentation, a necessary step in brewing, and aging both take time."
  // B here ("a necessary step...") is also an appositive, but A ends with a
  // common noun, so the ProperNoun signal is absent. Every heuristic we evaluated
  // for the common-noun case (article presence, length ratio) had clear
  // counterexamples and would cause new false negatives. Fixing it requires
  // semantic understanding that compromise/two does not provide. Accepted as a
  // known false positive at this level of NLP tooling.
  //
  // The "x " prefix ensures the real first word is never at index 0, which would
  // bypass compromise/two's second-pass title-case ProperNoun tagger.
  function endsWithProperNoun(t: string): boolean {
    return nlp('x ' + t.trim()).terms().last().has('#ProperNoun')
  }
  function startsWithProperNoun(t: string): boolean {
    return nlp('x ' + t.trim()).terms().eq(1).has('#ProperNoun')
  }
  function endsWithAdjective(t: string): boolean {
    return nlp('x ' + t.trim()).terms().last().has('#Adjective')
  }

  const violations: Violation[] = []
  for (const { text: chunk, offset } of windows.values()) {
    let m: RegExpExecArray | null

    // Relative/subordinate clause openers — these are never list items.
    // Also covers "and as reported/stated/noted" (C starting with "as").
    const CLAUSE_OPENER = /^(?:which|that|who|whom|whose|where|when|because|although|since|though|while|as)\b/i

    // "A, B, and C" — Oxford comma form; all items up to 70 chars
    // Guard: skip if B or C starts with a clause opener
    // (e.g. "X, which does Y, and Z" or "Name, stated, and as reported by...")
    // Also skip if A ends with a proper noun but B does NOT start with one —
    // that pattern indicates B is an appositive title of A, not a parallel item.
    // (e.g. "Dave Burwick, former CEO of Boston Beer, and Frank Luntz")
    const oxfordRe = /([^,\n]{3,70}),\s+([^,\n]{3,70}),\s+(?:and|or)\s+([^,.!?\n]{3,70})/gi
    while ((m = oxfordRe.exec(chunk)) !== null) {
      if (CLAUSE_OPENER.test(m[2].trimStart()) || CLAUSE_OPENER.test(m[3].trimStart())) continue
      if (endsWithProperNoun(m[1]) && !startsWithProperNoun(m[2])) continue  // named-entity appositive
      violations.push({ ruleId: 'triple-construction', startIndex: offset + m.index, endIndex: offset + m.index + m[0].length, matchedText: m[0] })
    }

    // "A, B and C" — no Oxford comma; B must be short (1–3 words) to avoid matching
    // clause-internal "and" like "you absorb morale damage and replacement costs"
    // Guard: skip if B or C starts with a clause opener
    // Guard: skip if A ends with an adjective — that comma is stacking descriptors on
    // a noun ("stiff, elevated shoulders and…"), not separating parallel list items.
    const noOxfordRe = /([^,\n]{3,70}),\s+([\w-]+(?:\s+[\w-]+){0,2})\s+(?:and|or)\s+([^,.!?\n]{3,70})/gi
    while ((m = noOxfordRe.exec(chunk)) !== null) {
      if (CLAUSE_OPENER.test(m[2].trimStart()) || CLAUSE_OPENER.test(m[3].trimStart())) continue
      if (endsWithAdjective(m[1])) continue  // adjective-stacking comma, not a list separator
      violations.push({ ruleId: 'triple-construction', startIndex: offset + m.index, endIndex: offset + m.index + m[0].length, matchedText: m[0] })
    }
  }
  return violations
}

// ── Triple fragment ───────────────────────────────────────────────────────────

/**
 * Detect the anaphoric tricolon: exactly 3 consecutive short sentences (≤5 words)
 * within a paragraph that all start with the same word.
 * e.g. "Too raw. Too weird. Too true." / "No shortcuts. No compromise. No excuses."
 */
export function detectTripleFragment(text: string): Violation[] {
  const violations: Violation[] = []
  const parts = text.split(/(\n\n+)/)
  let docPos = 0

  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi]
    if (pi % 2 === 1) { docPos += part.length; continue }

    const paraOffset = docPos
    docPos += part.length

    const sentences = splitSentencesWithOffsets(part)
    if (sentences.length < 3) continue

    for (let i = 0; i <= sentences.length - 3; i++) {
      const trio = [sentences[i], sentences[i + 1], sentences[i + 2]]

      // All three must be short
      if (trio.some(s => s.text.trim().split(/\s+/).filter(Boolean).length > 5)) continue

      // Extract first alphabetic word from each sentence
      const firstWord = (s: string) => /^([A-Za-z]+)/.exec(s.trimStart())?.[1]?.toLowerCase()
      const leads = trio.map(s => firstWord(s.text))
      if (!leads[0] || leads[0].length < 2) continue

      // All three must share the same first word
      if (leads[1] !== leads[0] || leads[2] !== leads[0]) continue

      const start = paraOffset + trio[0].start
      const end = paraOffset + trio[2].start + trio[2].text.length
      violations.push({
        ruleId: 'triple-fragment',
        startIndex: start,
        endIndex: end,
        matchedText: text.slice(start, end),
      })
      i += 2  // skip consumed sentences
    }
  }

  return violations
}

// ── Class generalization ──────────────────────────────────────────────────────
//
// "Real experts hedge precision, not intensity." / "Great teams argue about
// ideas, not people." — an aphoristic normative claim about how an entire class
// of people behaves. The tell is specifically about *people*: "Serious injuries
// require care" is an ordinary factual claim. So the class noun must look
// agentive (-ers/-ors/-ists/-ians plurals, plus a small explicit set), with a
// skip-list for non-agent nouns sharing those suffixes ("real numbers", "true
// colors", "smart speakers"). Compromise then confirms a present-tense verb
// follows — "Great writers of the nineteenth century" (preposition) and
// "Experienced developers built it" (past-tense narrative) do not fire. Quoted
// sentences never fire: the quote mark breaks the sentence-initial match.

const CLASS_GEN_RE = /^(Real|True|Genuine|Actual|Serious|Great|Good|Smart|Strong|Seasoned|Experienced|Successful|Effective)\s+([a-z]+)\s+((?:(?:never|always|rarely|seldom|often|usually|don[\u2019']t|do|won[\u2019']t|can[\u2019']t)\s+)?[a-z\u2019']+)/

const CLASS_GEN_PREFILTER_RE = /\b(Real|True|Genuine|Actual|Serious|Great|Good|Smart|Strong|Seasoned|Experienced|Successful|Effective)\s/

const CLASS_GEN_AGENT_RE = /^[a-z]+(?:ers|ors|ists|ians|eurs)$/
// Person-nouns without an agentive suffix ("experts" ends in -ts, not -ers).
const CLASS_GEN_EXTRA_NOUNS = new Set([
  'people', 'professionals', 'pros', 'teams', 'companies', 'organizations',
  'men', 'women', 'experts', 'analysts', 'executives', 'athletes', 'coaches',
  'colleagues', 'veterans', 'champions', 'adults', 'parents', 'students',
  'employees', 'humans', 'kids', 'chefs', 'pilots', 'nurses', 'academics',
  'salespeople', 'geniuses', 'amateurs', 'novices', 'beginners',
])
// Nouns with an agentive-looking suffix that usually denote things, quantities,
// or fixed compounds ("real numbers", "great powers", "smart speakers/meters").
const CLASS_GEN_SKIP_NOUNS = new Set([
  'numbers', 'members', 'manners', 'letters', 'matters', 'papers', 'answers',
  'offers', 'orders', 'corners', 'quarters', 'waters', 'powers', 'wonders',
  'fingers', 'shoulders', 'colors', 'colours', 'doors', 'floors', 'factors',
  'errors', 'sensors', 'motors', 'mirrors', 'horrors', 'flavors', 'flavours',
  'favors', 'favours', 'honors', 'honours', 'rumors', 'rumours', 'computers',
  'containers', 'centers', 'centres', 'chapters', 'characters', 'borders',
  'layers', 'others', 'speakers', 'meters', 'monitors', 'processors',
  'printers', 'routers',
])

// Authenticity adjectives (real/true/genuine/actual) are the strongest form of
// the tell — they gatekeep who counts as a member of the class. "Good" is the
// weakest: "Good doctors listen" shades into ordinary advice.
function classGenWeight(adj: string): number {
  const a = adj.toLowerCase()
  if (a === 'real' || a === 'true' || a === 'genuine' || a === 'actual') return 1.0
  if (a === 'good') return 0.65
  return 0.8
}

export function detectClassGeneralization(text: string): Violation[] {
  if (!CLASS_GEN_PREFILTER_RE.test(text)) return []

  const violations: Violation[] = []
  const parts = text.split(/(\n\n+)/)
  let docPos = 0

  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi]
    if (pi % 2 === 1) { docPos += part.length; continue }

    const paraOffset = docPos
    docPos += part.length

    if (!CLASS_GEN_PREFILTER_RE.test(part)) continue

    for (const s of splitSentencesWithOffsets(part)) {
      const leadWs = s.text.length - s.text.trimStart().length
      const lead = s.text.slice(leadWs)
      const m = CLASS_GEN_RE.exec(lead)
      if (!m) continue

      const noun = m[2]
      if (CLASS_GEN_SKIP_NOUNS.has(noun)) continue
      if (!CLASS_GEN_AGENT_RE.test(noun) && !CLASS_GEN_EXTRA_NOUNS.has(noun)) continue

      // Confirm the candidate is a present-tense verb (copula included). Term
      // offsets from compromise are positions in `lead`, so char positions from
      // the regex match can be located directly.
      const termJsons = (nlp(lead).terms().json({ offset: true, tags: true }) as MatchJson[])
        .flatMap(p => p.terms ?? [])
      const isPresentVerbAt = (charPos: number): boolean => {
        const term = termJsons.find(
          t => t.offset && t.offset.start <= charPos && charPos < t.offset.start + t.offset.length,
        )
        if (!term) return false
        return term.tags.includes('Verb') && !term.tags.includes('PastTense') && !term.tags.includes('Gerund')
      }

      const verbTokens = m[3].split(/\s+/)
      const lastToken = verbTokens[verbTokens.length - 1]
      let endInLead = m[0].length
      let ok = isPresentVerbAt(m[0].length - lastToken.length)

      // "Great leaders do this before every meeting." — the intervener slot
      // consumed the actual verb ("do"); retry with it and shorten the span.
      if (!ok && verbTokens.length === 2) {
        const intervenerStart = m[0].length - m[3].length
        if (isPresentVerbAt(intervenerStart)) {
          ok = true
          endInLead = intervenerStart + verbTokens[0].length
        }
      }
      if (!ok) continue

      const start = paraOffset + s.start + leadWs
      violations.push({
        ruleId: 'class-generalization',
        startIndex: start,
        endIndex: start + endInLead,
        matchedText: lead.slice(0, endInLead),
        instanceWeight: classGenWeight(m[1]),
      })
    }
  }

  return violations
}

// ── Decorative metaphor ───────────────────────────────────────────────────────
//
// "It's a volume knob stuck at max." — an anaphoric copular sentence whose
// predicate head noun is a concrete object with a post-nominal "twist" modifier
// (participle or preposition phrase). The concreteness mismatch is the metaphor
// signal: an abstract tenor ("it" pointing at the previous claim) predicated as
// a concrete vehicle. Four gates, all required:
//
//   1. Frame — sentence-initial It/That/This + 's/is + a/an. Named subjects
//      ("The gearbox is a bucket…") are out of scope for v1.
//   2. Concreteness — the noun phrase's head noun is in CONCRETE_NOUNS
//      (Brysbaert norms, Conc.M >= 4.2). "It's an idea wrapped in jargon"
//      never fires; "idea" scores 1.61.
//   3. Twist — a participle (-ed/-ing or irregular: stuck, worn, torn…) or a
//      preposition phrase follows the noun. Separates the metaphor shape from
//      a terse literal answer ("It's a volume knob."). Digits in the twist
//      skip the match ("a house built in 1923" is a date, not a metaphor).
//   4. Hapax Guard (utils/docFrequency.ts) — the head noun occurs nowhere else
//      in the document. Recurrence means the document is natively in that
//      domain ("knob" elsewhere → hardware prose → literal). A recurring
//      vehicle is dead-metaphor's jurisdiction, not this rule's.
//
// Sentences containing double quotes never fire (dialogue: "It's a volume knob
// stuck at max," she said — a literal answer, not a rhetorical restatement).
// Known miss: vehicles whose head noun scores below the concreteness cutoff
// ("smoke detector" — detector is 3.7).

// Frame prefix: subject + copula + optional degree adverb + article. The rest
// of the sentence is token-walked in the detector \u2014 a single regex cannot split
// NP core from twist correctly, because greedy backtracking steals participles
// into the core ("a megaphone welded shut" would parse core="megaphone welded",
// head="welded", and fail the concreteness gate).
const DECOR_FRAME_RE = /^(?:It|That|This)(?:[\u2019']s|\s+is)\s+(?:just\s+|basically\s+|essentially\s+|really\s+|only\s+|simply\s+|effectively\s+)?an?\s+([^\n]+)$/

const DECOR_TWIST_STARTER_RE = /^(?:with|without|on|over|under|inside|behind|full|made|set|hung|stuck|worn|torn|shut|cut|held|kept|left|lost|built|bent|gone|thrown|drawn|blown|sworn|spun|wound|bound|[a-z]{3,}(?:ed|ing))$/

const DECOR_CORE_WORD_RE = /^[a-z]+(?:-[a-z]+)*$/

export function detectDecorativeMetaphor(text: string): Violation[] {
  if (!/\b(?:It|That|This)(?:[\u2019']s|\s+is)\s/.test(text)) return []

  const violations: Violation[] = []
  const parts = text.split(/(\n\n+)/)
  let docPos = 0

  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi]
    if (pi % 2 === 1) { docPos += part.length; continue }

    const paraOffset = docPos
    docPos += part.length

    for (const s of splitSentencesWithOffsets(part)) {
      const leadWs = s.text.length - s.text.trimStart().length
      const lead = s.text.slice(leadWs).replace(/\s+$/, '')
      if (/["“”]/.test(lead)) continue          // dialogue, not rhetoric
      if (lead.split(/\s+/).length > 16) continue          // the capper rhythm is short

      const m = DECOR_FRAME_RE.exec(lead)
      if (!m) continue

      // Token walk: try each head position 0..2. A hit needs the head token in
      // CONCRETE_NOUNS *and* the next token to open a twist — evaluating both
      // at the same split point is what a single regex could not do.
      //   "a volume knob stuck at max": volume fails concreteness → knob+stuck ✓
      //   "a megaphone welded shut":    megaphone+welded ✓ at position 0
      const tokens = m[1].split(/\s+/)
      let head = ''
      let twist = ''
      for (let i = 0; i <= 2 && i < tokens.length - 1; i++) {
        if (!DECOR_CORE_WORD_RE.test(tokens[i])) break     // punctuation/capital ends the NP
        const starter = tokens[i + 1].replace(/[^a-z-]+$/, '')
        if (CONCRETE_NOUNS.has(tokens[i]) && DECOR_TWIST_STARTER_RE.test(starter)) {
          head = tokens[i]
          twist = tokens.slice(i + 1).join(' ')
          break
        }
      }
      if (!head) continue
      if (/\d/.test(twist)) continue                       // dates, measurements

      const start = paraOffset + s.start + leadWs
      const end = start + lead.length
      if (!isHapax(text, head, start, end)) continue       // vehicle is native vocabulary

      violations.push({
        ruleId: 'decorative-metaphor',
        startIndex: start,
        endIndex: end,
        matchedText: lead,
        instanceWeight: 0.9,
      })
    }
  }

  return violations
}

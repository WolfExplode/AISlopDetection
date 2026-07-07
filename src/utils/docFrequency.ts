/**
 * Document Frequency + Hapax Guard (terms defined in CONTEXT.md § Frequency).
 *
 * Document Frequency is a neutral within-document measurement: how many times
 * a term occurs in the user's text, matched by head noun with inflections
 * folded. Each rule interprets the count its own way. The Hapax Guard is the
 * common interpretation: a Violation survives only when its term occurs
 * nowhere outside the matched span — recurrence anywhere reads as the document
 * being natively in that term's domain ("knob" mentioned elsewhere means
 * "It's a volume knob stuck at max" is literal hardware prose, not an imported
 * metaphor vehicle).
 *
 * Contract decisions and the alternatives rejected:
 *
 * - PRIMITIVE + GUARD, not guard-only: consumers disagree on direction. A
 *   metaphor rule treats recurrence as exculpatory; `dead-metaphor` treats
 *   recurrence as the violation itself. The count is neutral; the guard is one
 *   reading of it.
 *
 * - HEAD NOUN + INFLECTION FOLD, not exact-token and not domain clustering:
 *   "knobs" elsewhere must disarm a "volume knob" flag (the most common
 *   literal case is inflectional variation), but "dial" elsewhere must not —
 *   synonym/domain matching needs a shipped lexicon and makes the contract
 *   fuzzy. For multi-word terms only the head noun identifies the vehicle;
 *   "volume" recurring in an essay about writing volume is unrelated.
 *
 * - DOC-WIDE SCOPE, ANY OTHER USE DISARMS, not paragraph-scoped and not
 *   length-normalized: one literal use of the term 3000 words away still
 *   proves the domain is native (a hardware review names the knob in ¶1 and
 *   may mention it metaphorically in ¶6). Length-normalized thresholds add a
 *   tunable constant with no evidence yet that the simple contract leaks.
 *
 * - APPLICABILITY (enforced by callers, documented in CLAUDE.md): the guard
 *   protects IMPORTED vocabulary only — metaphor vehicles, scare-quoted terms
 *   later adopted unquoted. Never apply it to INVENTED vocabulary
 *   (`invented-concept-label`): recurrence of a coined label is not
 *   exculpatory, so guarding it would create silent false negatives on the
 *   worst documents. A RECURRING imported vehicle is `dead-metaphor`'s
 *   jurisdiction (document-tier), not a client rule's — the guard and that
 *   rule deliberately partition the space by recurrence.
 */

/** Last alphabetic word of a term — "volume knob" → "knob". */
export function headNoun(term: string): string {
  const words = term.toLowerCase().match(/[a-z\u2019']+/g) ?? []
  return words.length ? words[words.length - 1].replace(/[\u2019']s?$/, '') : ''
}

/**
 * Build a case-insensitive regex matching the word and its inflectional
 * variants (singular/plural in both directions): knob↔knobs, battery↔batteries,
 * knife/knives, box↔boxes. Deliberately shallow — no lemmatizer; spurious short
 * stems are avoided by only stripping a trailing 's' when ≥3 chars remain.
 */
function inflectionRegex(word: string): RegExp {
  const w = word.toLowerCase()
  let alts: string[]
  if (w.endsWith('ies') && w.length > 4) {
    const b = w.slice(0, -3)
    alts = [b + 'y', b + 'ies']
  } else if (w.endsWith('ves') && w.length > 4) {
    const b = w.slice(0, -3)
    alts = [b + 'f', b + 'fe', b + 'ves']
  } else if (/(?:[sxz]|[cs]h)es$/.test(w) && w.length > 4) {
    alts = [w.slice(0, -2), w]
  } else if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) {
    alts = [w.slice(0, -1), w]
  } else if (w.endsWith('y') && !/[aeiou]y$/.test(w)) {
    alts = [w, w.slice(0, -1) + 'ies']
  } else if (w.endsWith('fe')) {
    alts = [w, w.slice(0, -2) + 'ves']
  } else if (w.endsWith('f')) {
    alts = [w, w.slice(0, -1) + 'ves']
  } else if (/(?:[sxz]|[cs]h)$/.test(w)) {
    alts = [w, w + 'es']
  } else {
    alts = [w, w + 's']
  }
  return new RegExp(`\\b(?:${alts.join('|')})\\b`, 'gi')
}

/**
 * Document Frequency: total occurrences of the term's head noun in the text,
 * inflection-folded, case-insensitive, whole document. Includes the occurrence
 * inside any candidate Violation's own span — compare against it with isHapax.
 */
export function docFrequency(text: string, term: string): number {
  const head = headNoun(term)
  if (!head) return 0
  const re = inflectionRegex(head)
  let count = 0
  while (re.exec(text) !== null) count++
  return count
}

/**
 * Hapax Guard: true when the term's head noun occurs nowhere in the document
 * outside [spanStart, spanEnd) — i.e. the term was imported for effect and the
 * consuming rule's Violation should survive. False (recurrence found) means
 * the document is natively in the term's domain: suppress.
 */
export function isHapax(text: string, term: string, spanStart: number, spanEnd: number): boolean {
  const head = headNoun(term)
  if (!head) return true
  const re = inflectionRegex(head)
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index < spanStart || m.index >= spanEnd) return false
  }
  return true
}

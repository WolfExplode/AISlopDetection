import type { Violation } from '../types'
import {
  INTENSIFIERS,
  INTENSIFIER_PHRASES,
  ADJECTIVE_INTENSIFIERS,
  ADJECTIVE_PERMITTED_FOLLOWING,
  CONTEXT_SENSITIVE_ADVERBS,
  VERB_INTENSIFIERS,
  ELEVATED_REGISTER,
  FILLER_ADVERBS,
  FILLER_ADJECTIVES,
  METAPHOR_CRUTCHES,
  FALSE_CONCLUSION_PHRASES,
  CONNECTOR_WORDS,
  UNNECESSARY_CONTRAST_PHRASES,
  HEDGE_WORDS,
  MODAL_HEDGE_WEIGHTS,
  EVALUATIVE_INTENSIFIERS,
  SLOP_TRIGRAMS,
  SLOP_BIGRAMS,
  FICTION_BODY_LANGUAGE,
  RULE_SCORING,
  SLOP_WORDS_CHARACTER_NAMES,
  SLOP_WORDS_ATMOSPHERIC,
  SLOP_WORDS_FANTASY_VOCAB,
  SLOP_WORDS_ESSAY,
  EXEMPLAR_CLICHE_PHRASES,
  COMMA_QUALIFIERS,
  HERES_THE_KICKER_PHRASES,
  PEDAGOGICAL_PHRASES,
  VAGUE_ATTRIBUTION_PHRASES,
} from '../scoring.config'

export {
  ADJECTIVE_INTENSIFIERS,
  ADJECTIVE_PERMITTED_FOLLOWING,
  CONTEXT_SENSITIVE_ADVERBS,
  VERB_INTENSIFIERS,
}

// Helper: find all case-insensitive matches of a word/phrase in text
function findAll(text: string, pattern: RegExp, ruleId: string, weight?: number): Violation[] {
  const violations: Violation[] = []
  let m: RegExpExecArray | null
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
  while ((m = re.exec(text)) !== null) {
    const v: Violation = {
      ruleId,
      startIndex: m.index,
      endIndex: m.index + m[0].length,
      matchedText: m[0],
    }
    if (weight !== undefined) v.instanceWeight = weight
    violations.push(v)
  }
  return violations
}


// Abstract nouns that follow "highlight(s/ed/ing) the" in LLM slop constructions.
// Literal uses ("highlights the text", "highlights them") are excluded by this list.
const HIGHLIGHT_ABSTRACT_NOUNS = /^(importance|need|significance|value|role|impact|fact|challenges?|complexity|potential|limitations?|urgency|gaps?|contrast|tensions?|reality|severity|concern|problems?|issues?|difficulty|difficulties|dangers?|failures?|successes?|inequalit(?:y|ies)|disparit(?:y|ies)|tradeoffs?)$/i

export function detectHighlightSlop(text: string): Violation[] {
  const violations: Violation[] = []
  const re = /\b(highlights?|highlighted|highlighting)\s+the\s+(\w+)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (!HIGHLIGHT_ABSTRACT_NOUNS.test(m[2])) continue
    const verbText = m[1]
    let suggestion: string
    const lower = verbText.toLowerCase()
    if (lower.endsWith('ing')) suggestion = 'showing'
    else if (lower.endsWith('ed')) suggestion = 'showed'
    else if (lower.endsWith('s')) suggestion = 'shows'
    else suggestion = 'show'
    violations.push({
      ruleId: 'overused-intensifier',
      startIndex: m.index,
      endIndex: m.index + verbText.length,
      matchedText: verbText,
      suggestedChange: suggestion,
    })
  }
  return violations
}

export function detectOverusedIntensifiers(text: string): Violation[] {
  const violations: Violation[] = []
  for (const [word, weight] of Object.entries(INTENSIFIERS)) {
    const re = new RegExp(`\\b${word}s?(?:-\\w+)*\\b`, 'gi')
    violations.push(...findAll(text, re, 'overused-intensifier', weight))
  }
  for (const [phrase, weight] of Object.entries(INTENSIFIER_PHRASES)) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    violations.push(...findAll(text, new RegExp(`\\b${escaped}\\b`, 'gi'), 'overused-intensifier', weight))
  }
  return violations
}

export function detectElevatedRegister(text: string): Violation[] {
  const violations: Violation[] = []
  for (const [elevated, replacement, weight] of ELEVATED_REGISTER) {
    const escaped = elevated.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\b${escaped}\\b`, 'gi')
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      violations.push({
        ruleId: 'elevated-register',
        startIndex: m.index,
        endIndex: m.index + m[0].length,
        matchedText: m[0],
        instanceWeight: weight,
        suggestedChange: replacement === null ? null : (replacement || undefined),
      })
    }
  }
  return violations
}

export function detectFillerAdverbs(text: string): Violation[] {
  const violations: Violation[] = []
  for (const [word, weight] of Object.entries(FILLER_ADVERBS)) {
    const re = new RegExp(`\\b${word}\\b`, 'gi')
    violations.push(...findAll(text, re, 'filler-adverbs', weight))
  }
  // "rather" only as vague intensifier ("rather good") — not in "rather than"
  violations.push(...findAll(text, /\brather(?!\s+than)\b/gi, 'filler-adverbs', 0.40))
  return violations
}

export function detectFillerAdjectives(text: string): Violation[] {
  const violations: Violation[] = []
  for (const [word, weight] of Object.entries(FILLER_ADJECTIVES)) {
    const re = new RegExp(`\\b${word}\\b`, 'gi')
    violations.push(...findAll(text, re, 'filler-adjectives', weight))
  }
  return violations
}

export function detectAlmostHedge(text: string): Violation[] {
  const re = /\balmost\s+(always|never|certainly|exclusively|entirely|completely|always|invariably|universally)\b/gi
  return findAll(text, re, 'almost-hedge')
}

export function detectEraOpener(text: string): Violation[] {
  const re = /\bin\s+(?:an?\s+era\s+(?:of|where|when|in\s+which)|today[’']?s\s+(?:fast[-\s]paced|digital|modern|globalized|interconnected)\s+world)\b/gi
  return findAll(text, re, 'era-opener')
}

export function detectMetaphorCrutch(text: string): Violation[] {
  const violations: Violation[] = []
  for (const [phrase, weight] of Object.entries(METAPHOR_CRUTCHES)) {
    const escaped = phrase
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\./g, '[- ]?')
      .replace(/'/g, "[’']")
    const re = new RegExp(`\\b${escaped}\\b`, 'gi')
    violations.push(...findAll(text, re, 'metaphor-crutch', weight))
  }
  return violations
}

export function detectImportantToNote(text: string): Violation[] {
  const re = /\b(it('s| is)\s+important\s+to\s+note|it('s| is)\s+worth\s+noting|notably|note\s+that|it\s+should\s+be\s+noted)\b/gi
  return findAll(text, re, 'important-to-note')
}

export function detectBroaderImplications(text: string): Violation[] {
  const re = /\b(broader\s+implications?|wider\s+implications?|implications?\s+(for|of|on)\s+the\s+(broader|wider|larger)|reflects?\s+(broader|wider)\s+\w+)\b/gi
  return findAll(text, re, 'broader-implications')
}

export function detectFalseConclusion(text: string): Violation[] {
  const violations: Violation[] = []
  for (const [phrase, weight] of Object.entries(FALSE_CONCLUSION_PHRASES)) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Flag when used to open a sentence/paragraph
    const re = new RegExp(`(^|[.!?]\\s+|\\n\\s*)${escaped}\\b`, 'gi')
    violations.push(...findAll(text, re, 'false-conclusion', weight))
  }
  return violations
}

export function detectConnectorAddiction(text: string): Violation[] {
  // Flag connectors at start of paragraphs/sentences.
  // Highlight span = just the connector phrase ("For instance,").
  // Apply span = boundary + connector + next char, so Apply can drop the connector
  // and capitalize the following word without a separate cleanup step.
  const violations: Violation[] = []
  for (const [word, weight] of Object.entries(CONNECTOR_WORDS)) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(^|\\n\\s*|[.!?]\\s+)(${escaped}[,\\s]+)(\\w)`, 'gi')
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const [fullMatch, boundary, connector, nextChar] = m
      const highlightStart = m.index + boundary.length
      const highlightEnd = highlightStart + connector.trimEnd().length
      violations.push({
        ruleId: 'connector-addiction',
        startIndex: highlightStart,
        endIndex: highlightEnd,
        matchedText: text.slice(highlightStart, highlightEnd),
        instanceWeight: weight,
        suggestedChange: '',
        applyStartIndex: m.index,
        applyEndIndex: m.index + fullMatch.length,
        applyReplacement: boundary + nextChar.toUpperCase(),
      })
    }
  }
  return violations
}

export function detectUnnecessaryContrast(text: string): Violation[] {
  const violations: Violation[] = []
  for (const [phrase, weight] of Object.entries(UNNECESSARY_CONTRAST_PHRASES)) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\b${escaped}\\b`, 'gi')
    violations.push(...findAll(text, re, 'unnecessary-contrast', weight))
  }
  return violations
}

export function detectEmDashPivot(text: string): Violation[] {
  const violations: Violation[] = []

  // Find each em-dash or en-dash, but skip ones used as a standalone line separator
  const re = /[—–]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const lineStart = text.lastIndexOf('\n', m.index - 1) + 1
    const lineEnd = text.indexOf('\n', m.index)
    const line = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
    if (line.trim().replace(/[—–]/g, '').trim() === '') continue
    violations.push({
      ruleId: 'em-dash-overuse',
      startIndex: m.index,
      endIndex: m.index + 1,
      matchedText: m[0],
    })
  }

  return violations
}

export function detectNegationPivot(text: string): Violation[] {
  const violations: Violation[] = []
  const NEGATIONS = `not|don[\u2019']?t|doesn[\u2019']?t|isn[\u2019']?t|wasn[\u2019']?t|aren[\u2019']?t|do not|does not|is not|was not|never|no longer`
  // "not X, but Y" / "not X but Y" (comma optional)
  const commaButRe = new RegExp(`\\b(${NEGATIONS})\\b[^.!?\\n]{3,80},?\\s+but\\b`, 'gi')
  // "not X—Y" or "not X–Y" (em/en-dash pivot without "but") — capture one word after dash for clarity
  const emDashRe = new RegExp(`\\b(${NEGATIONS})\\b[^.!?\\n\u2014\u2013]{3,60}[\u2014\u2013]\\s*\\w+`, 'gi')
  // "X rather than Y" — preference framing used to show nuance; LLM rhetorical staple
  // Require 2+ words on each side to avoid short natural contrasts ("walk rather than run")
  const ratherThanRe = /\b\w+(?:\s+\w+){1,6}\s+rather\s+than\s+\w+(?:\s+\w+){1,5}/gi
  let m: RegExpExecArray | null
  while ((m = ratherThanRe.exec(text)) !== null) {
    violations.push({
      ruleId: 'negation-pivot',
      startIndex: m.index,
      endIndex: m.index + m[0].length,
      matchedText: m[0],
    })
  }
  for (const re of [commaButRe, emDashRe]) {
    while ((m = re.exec(text)) !== null) {
      violations.push({
        ruleId: 'negation-pivot',
        startIndex: m.index,
        endIndex: m.index + m[0].length,
        matchedText: m[0],
      })
    }
  }

  // "not X; Y" — negation in the first semicolon clause is the structural tell
  const semicolonPivotRe = new RegExp(
    `\\b(${NEGATIONS})\\b[^;.!?\\n]{3,80};`,
    'gi'
  )
  while ((m = semicolonPivotRe.exec(text)) !== null) {
    violations.push({
      ruleId: 'negation-pivot',
      startIndex: m.index,
      endIndex: m.index + m[0].length,
      matchedText: m[0],
    })
  }

  // "X, not a Y" / "X, not for Y" — trailing negation after a positive claim.
  // Requires an article or preposition after "not" to avoid flagging natural adjective contrasts ("fast, not slow").
  const trailingNotRe = /,\s+not\s+(?:just\s+|merely\s+|simply\s+)?(?:(?:a|an|the)|(?:for|in|by|with|to|about|on|of))\s+\w+(?:\s+\w+){0,3}/gi
  while ((m = trailingNotRe.exec(text)) !== null) {
    violations.push({
      ruleId: 'negation-pivot',
      startIndex: m.index,
      endIndex: m.index + m[0].length,
      matchedText: m[0],
    })
  }

  // "isn't [all/just/...] about X, it's about Y" \u2014 reframe construction: negates one framing, substitutes another.
  // Structural tell: [negation] + content + comma/semicolon + pronoun pivot. No constraint on intervening words.
  const reframeRe = /\b(isn[\u2019']?t|is not|doesn[\u2019']?t|does not|aren[\u2019']?t|are not|wasn[\u2019']?t|was not)\b[^.!?\n]{5,120}[,;]\s+(?:it[\u2019']?s|it is|they[\u2019']?re|that[\u2019']?s|this is)\b/gi
  while ((m = reframeRe.exec(text)) !== null) {
    violations.push({
      ruleId: 'negation-pivot',
      startIndex: m.index,
      endIndex: m.index + m[0].length,
      matchedText: m[0],
    })
  }

  // Contracted-copula reframe: "It's not X, it's Y" / "They're not X, they're Y". The copula contracts
  // onto the subject (\u2019s = is, \u2019re = are), so the reframe branch above \u2014 which matches "is not"/"are not" \u2014
  // can't see it. Treated identically to that branch (no intensifier required) for consistency: "It is not
  // immunity, it's family" already fires, so its contraction must too. Lookbehind excludes hortative "let's not".
  const contractedReframeRe = /(?<!\blet)[\u2019'](?:s|re)\s+not\b[^.!?\n]{3,120}[,;]\s+(?:it[\u2019']?s|it is|they[\u2019']?re|that[\u2019']?s|this is)\b/gi
  while ((m = contractedReframeRe.exec(text)) !== null) {
    violations.push({
      ruleId: 'negation-pivot',
      startIndex: m.index,
      endIndex: m.index + m[0].length,
      matchedText: m[0],
    })
  }

  return violations
}

export function detectColonElaboration(text: string): Violation[] {
  // Short clause (< 60 chars) followed by colon then longer explanation
  const re = /[^.!?\n]{5,50}:[^:\n]{20,}/g
  const violations: Violation[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const colonPos = m[0].indexOf(':')
    violations.push({
      ruleId: 'colon-elaboration',
      startIndex: m.index + colonPos,
      endIndex: m.index + colonPos + 1,
      matchedText: ':',
    })
  }
  return violations
}

export function detectParentheticalQualifier(text: string): Violation[] {
  // Paren-delimited qualifiers: (which has been widely discussed...)
  const violations = findAll(text, /\([^)]{20,}\)/g, 'parenthetical-qualifier')
  // Comma-offset qualifiers: "This is, of course, a simplification."
  for (const phrase of COMMA_QUALIFIERS) {
    const re = new RegExp(`,\\s*${phrase}\\s*,`, 'gi')
    violations.push(...findAll(text, re, 'parenthetical-qualifier'))
  }
  return violations
}

export function detectQuestionThenAnswer(text: string): Violation[] {
  const violations: Violation[] = []
  // Process each paragraph independently — cross-paragraph pairs are never the tell.
  const paragraphs = splitParagraphs(text)

  for (const para of paragraphs) {
    const sentenceRe = /[^.!?]*[.!?]+/g
    const sentences: Array<{ text: string; start: number }> = []
    let m: RegExpExecArray | null
    while ((m = sentenceRe.exec(para.text)) !== null) {
      sentences.push({ text: m[0], start: para.start + m.index })
    }
    // Dialogue suppression: a quoted question answered by quoted (or narrated)
    // speech is dialogue, not the rhetorical Q→A tell. Skip pairs where either
    // sentence contains a double quote or opens with any quote character.
    // (The sentence regex stops at ?, so a closing quote after a question mark
    // lands at the start of the next sentence — caught by the opening check.)
    const isDialogue = (t: string) =>
      /["“”]/.test(t) || /^['"‘’“”]/.test(t)

    for (let i = 0; i < sentences.length - 1; i++) {
      const s = sentences[i].text.trim()
      const next = sentences[i + 1].text.trim()
      // The answer must be short — a long sentence after a question is just the
      // next thought, not the LLM pat-answer tell ("What does this mean? It means X.")
      if (s.endsWith('?') && !next.endsWith('?') && next.length <= 120 && !isDialogue(s) && !isDialogue(next)) {
        const start = sentences[i].start
        const end = sentences[i + 1].start + sentences[i + 1].text.length
        violations.push({
          ruleId: 'question-then-answer',
          startIndex: start,
          endIndex: end,
          matchedText: text.slice(start, end),
        })
      }
    }
  }
  return violations
}


// Word-boundary anchored hedge matchers, compiled once. Boundaries stop
// substring false positives: "possibly" inside "impossibly", "sort of"
// inside "the resort offers".
const HEDGE_MATCHERS: Array<{ term: string; re: RegExp; weight: number }> = [
  ...Object.entries(HEDGE_WORDS),
  ...Object.entries(MODAL_HEDGE_WEIGHTS),
].map(([term, weight]) => ({
  term,
  re: new RegExp(`\\b${term.replace(/\s+/g, '\\s+')}\\b`, 'i'),
  weight,
}))

// Detect hedge stacks: sentences with 2+ hedge words
export function detectHedgeStack(text: string): Violation[] {
  const violations: Violation[] = []

  for (const para of splitParagraphs(text)) {
    let offset = para.start
    for (const sentence of splitSentences(para.text)) {
      const found = HEDGE_MATCHERS.filter(h => h.re.test(sentence))
      if (found.length >= 2) {
        const totalW = found.reduce((sum, h) => sum + h.weight, 0)
        violations.push({
          ruleId: 'hedge-stack',
          startIndex: offset,
          endIndex: offset + sentence.length,
          matchedText: sentence,
          instanceWeight: totalW / found.length,
          explanation: `Contains ${found.length} hedges: ${found.slice(0, 4).map(h => h.term).join(', ')}`,
        })
      }
      offset += sentence.length
    }
  }
  return violations
}

// Detect staccato burst: 3+ consecutive short sentences
export function detectStaccatoBurst(text: string): Violation[] {
  const violations: Violation[] = []
  const paragraphs = splitParagraphs(text)

  for (const para of paragraphs) {
    const sentences = splitSentences(para.text)
    const offsets: number[] = []
    let offset = 0
    for (const s of sentences) {
      offsets.push(para.start + offset)
      offset += s.length
    }

    const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length
    // A run member must read as a real sentence: 1–8 words ending in terminal
    // punctuation (paragraph-final sentences are exempt — the writer may still
    // be typing). Newline-split list/heading lines never join a staccato run.
    const isShort = (idx: number) => {
      const wc = wordCount(sentences[idx])
      if (wc < 1 || wc > 8) return false
      return /[.!?]["'”’)]*$/.test(sentences[idx].trim()) || idx === sentences.length - 1
    }
    let i = 0
    while (i < sentences.length) {
      if (isShort(i)) {
        let j = i + 1
        while (j < sentences.length && isShort(j)) j++
        if (j - i >= 3) {
          const start = offsets[i]
          const end = offsets[j - 1] + sentences[j - 1].length
          violations.push({
            ruleId: 'staccato-burst',
            startIndex: start,
            endIndex: end,
            matchedText: text.slice(start, end),
            explanation: `${j - i} consecutive short sentences`,
          })
          i = j
          continue
        }
      }
      i++
    }
  }
  return violations
}

// Detect listicle instinct: lists with exactly 3, 5, 7, or 10 items
export function detectListicleInstinct(text: string): Violation[] {
  const violations: Violation[] = []
  const MAGIC_COUNTS = new Set([3, 5, 7, 10])

  // Numbered lists — highlight only the first number marker (e.g. "1.")
  const numberedListRe = /(?:^|\n)(\s*\d+[.)]\s+[^\n]+)(\n\s*\d+[.)]\s+[^\n]+){2,}/gm
  let m: RegExpExecArray | null
  const re1 = new RegExp(numberedListRe.source, 'gm')
  while ((m = re1.exec(text)) !== null) {
    const items = m[0].trim().split('\n').filter(l => /^\s*\d+[.)]\s/.test(l))
    if (MAGIC_COUNTS.has(items.length)) {
      // Find the first marker character within the match
      const markerMatch = /\d+[.)]/.exec(m[0])
      const markerOffset = markerMatch ? markerMatch.index : 0
      const markerStart = m.index + markerOffset
      violations.push({
        ruleId: 'listicle-instinct',
        startIndex: markerStart,
        endIndex: markerStart + (markerMatch ? markerMatch[0].length : 1),
        matchedText: markerMatch ? markerMatch[0] : m[0][0],
        explanation: `Numbered list with exactly ${items.length} items`,
      })
    }
  }

  // Bulleted lists — highlight the text of the first bullet item (not the marker itself,
  // which gets replaced by a CM widget in live preview and suppresses Decoration.mark).
  const bulletRe = /(?:^|\n)(\s*[-*•]\s+[^\n]+)(\n\s*[-*•]\s+[^\n]+){2,}/gm
  const re2 = new RegExp(bulletRe.source, 'gm')
  while ((m = re2.exec(text)) !== null) {
    const items = m[0].trim().split('\n').filter(l => /^\s*[-*•]\s/.test(l))
    if (MAGIC_COUNTS.has(items.length)) {
      const markerMatch = /[-*•]\s+/.exec(m[0])
      const textOffset = markerMatch ? markerMatch.index + markerMatch[0].length : 0
      const startIndex = m.index + textOffset
      const lineEnd = m[0].indexOf('\n', textOffset)
      const endIndex = startIndex + (lineEnd >= 0 ? lineEnd - textOffset : m[0].length - textOffset)
      violations.push({
        ruleId: 'listicle-instinct',
        startIndex,
        endIndex: Math.max(startIndex + 1, endIndex),
        matchedText: text.slice(startIndex, Math.max(startIndex + 1, endIndex)),
        explanation: `Bullet list with exactly ${items.length} items`,
      })
    }
  }

  return violations
}

export function splitParagraphs(text: string): Array<{ text: string; start: number }> {
  const results: Array<{ text: string; start: number }> = []
  const re = /\n\s*\n/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const chunk = text.slice(last, m.index)
    if (chunk.trim()) results.push({ text: chunk, start: last })
    last = m.index + m[0].length
  }
  if (last < text.length && text.slice(last).trim()) {
    results.push({ text: text.slice(last), start: last })
  }
  return results
}

// Words whose trailing period is an abbreviation, not a sentence boundary.
const SENTENCE_ABBREVIATIONS = new Set([
  'dr', 'mr', 'mrs', 'ms', 'prof', 'rev', 'gen', 'sen', 'rep', 'st', 'mt', 'sr', 'jr',
  'vs', 'etc', 'e.g', 'i.e', 'cf', 'al', 'fig', 'vol', 'ch', 'pp', 'ca', 'approx',
  'dept', 'inc', 'ltd', 'co', 'corp', 'u.s', 'u.k', 'u.n', 'a.m', 'p.m', 'ph.d',
])

function splitSentences(text: string): string[] {
  // Sentence splitter: breaks after terminal punctuation + space, and at newlines
  // so headings and list lines are their own units, never glued to the next line.
  // Callers must pass a single paragraph (splitParagraphs first) — sentence-pair
  // detectors must never pair across \n\n boundaries.
  // Slices are contiguous: consumers compute offsets by summing lengths, so
  // whitespace-only slices are merged into the previous sentence, never dropped.
  const results: string[] = []
  const push = (seg: string) => {
    if (seg.trim().length === 0 && results.length > 0) results[results.length - 1] += seg
    else results.push(seg)
  }
  let last = 0
  const re = /[.!?]+[ \t]+|\n+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m[0][0] !== '\n') {
      const tail = text.slice(last, m.index).match(/([A-Za-z][A-Za-z.]*)$/)?.[1]
      // Abbreviations ("Dr.", "e.g.") and single-letter initials ("J. Smith")
      // do not end a sentence.
      if (tail && (/^[A-Z]$/.test(tail) || SENTENCE_ABBREVIATIONS.has(tail.toLowerCase()))) continue
    }
    push(text.slice(last, m.index + m[0].length))
    last = m.index + m[0].length
  }
  if (last < text.length) push(text.slice(last))
  return results
}

// ── New detectors ─────────────────────────────────────────────────────────

export function detectServesAs(text: string): Violation[] {
  const re = /\b(serves|stands|acts|functions|operates)\s+as\b/gi
  return findAll(text, re, 'serves-as')
}

export function detectNegationCountdown(text: string): Violation[] {
  const violations: Violation[] = []
  for (const para of splitParagraphs(text)) {
    const sentences = splitSentences(para.text)
    let offset = para.start
    const offsets: number[] = []
    for (const s of sentences) { offsets.push(offset); offset += s.length }

    let i = 0
    while (i < sentences.length) {
      if (/^\s*not\s+/i.test(sentences[i].trim())) {
        let j = i + 1
        while (j < sentences.length && /^\s*not\s+/i.test(sentences[j].trim())) j++
        if (j - i >= 2) {
          const start = offsets[i]
          const end = offsets[j - 1] + sentences[j - 1].length
          violations.push({ ruleId: 'negation-countdown', startIndex: start, endIndex: end, matchedText: text.slice(start, end) })
          i = j; continue
        }
      }
      i++
    }
  }
  return violations
}

// Function words and personal pronouns too generic to flag as anaphora —
// anything else repeated 3+ times is suspicious. Pronoun subjects are the
// default rhythm of narration ("He walked in. He sat down. He waited."),
// so they never count as single-word openers. Two-word openers have their
// own skip list, so "they assume … they assume …" still fires.
const ANAPHORA_SINGLE_WORD_SKIP = new Set([
  'a', 'an', 'the',
  'in', 'on', 'at', 'to', 'of', 'for', 'with', 'by', 'from',
  'is', 'are', 'was', 'were',
  'i', 'we', 'you', 'he', 'she', 'it', 'they',
])

// Copula-cleft anaphora: subject pronouns that twoWordOpener deliberately skips
// (to let ordinary narration through) but which DO signal the LLM tell when
// followed by a linking verb and repeated — "It is X. It is Y. It is Z."
// Demonstratives (this/that/there) and "they" already fire via twoWordOpener,
// so only the skipped subject pronouns need this extra path. A copula
// distinguishes a cleft ("He is a liar") from narration ("He walked in"); the
// -ing guard below drops progressive narration ("It is raining. It is pouring").
const CLEFT_PRONOUNS = new Set(['it', 'i', 'we', 'he', 'she'])
const CLEFT_OPENER_RE =
  /^(\s*)(?:(?:and|but|or)\s+)?(it|i|we|he|she)([’'](?:s|m|re)|\s+(?:is|are|was|were|am))(\s+)(\S+)/i

export function detectAnaphoraAbuse(text: string): Violation[] {
  const violations: Violation[] = []

  const CONJUNCTIONS = new Set(['and', 'but', 'or'])

  function normalize(s: string): string[] {
    const words = s.trim().split(/\s+/).filter(Boolean)
    // Strip a leading conjunction ("And both..." → ["both", ...])
    if (words.length > 1 && CONJUNCTIONS.has(words[0].toLowerCase().replace(/[^a-z]/g, ''))) {
      return words.slice(1)
    }
    return words
  }

  function twoWordOpener(s: string): string {
    const words = normalize(s)
    if (words.length < 2) return ''
    const first = words[0].toLowerCase().replace(/[^a-z]/g, '')
    const skip = new Set(['the', 'a', 'an', 'it', 'is', 'in', 'on', 'at', 'to', 'of', 'and', 'but', 'i', 'we', 'he', 'she'])
    if (skip.has(first) || first.length < 2) return ''
    return `${first} ${words[1].toLowerCase().replace(/[^a-z]/g, '')}`
  }

  function singleWordOpener(s: string): string {
    const words = normalize(s)
    if (words.length < 2) return ''
    const first = words[0].toLowerCase().replace(/[^a-z]/g, '')
    if (first.length < 2 || ANAPHORA_SINGLE_WORD_SKIP.has(first)) return ''
    return first
  }

  // Copula-cleft opener: "<pronoun> <copula> <predicate>" for the subject
  // pronouns twoWordOpener skips. Returns the normalized key (for run grouping)
  // and the character length of the "<pronoun> <copula>" span (for highlighting),
  // or null when the sentence is not a cleft. A predicate starting with a present
  // participle is progressive narration ("It is raining"), not a cleft — skip it.
  function cleftOpener(s: string): { key: string; length: number } | null {
    const m = CLEFT_OPENER_RE.exec(s)
    if (!m) return null
    const pron = m[2].toLowerCase()
    if (!CLEFT_PRONOUNS.has(pron)) return null
    if (/ing$/i.test(m[5])) return null
    let cop = m[3].toLowerCase().replace(/^[’']/, '').trim()
    if (cop === 's') cop = 'is'
    else if (cop === 'm') cop = 'am'
    else if (cop === 're') cop = 'are'
    return { key: `${pron} ${cop}`, length: m[0].length - m[4].length - m[5].length }
  }

  // Returns the character length of the opener (including any leading conjunction)
  // within sentence s, so we can highlight just that word or two-word span.
  function openerLength(s: string, wordCount: number): number {
    let pos = 0
    while (pos < s.length && /\s/.test(s[pos])) pos++
    // Skip a leading conjunction ("And they..." → skip "And ")
    const conjMatch = s.slice(pos).match(/^(\w+)(\s+)/)
    if (conjMatch && CONJUNCTIONS.has(conjMatch[1].toLowerCase())) {
      pos += conjMatch[1].length + conjMatch[2].length
    }
    for (let w = 0; w < wordCount; w++) {
      const wm = s.slice(pos).match(/^(\S+)/)
      if (!wm) break
      pos += wm[1].length
      if (w < wordCount - 1) {
        const ws = s.slice(pos).match(/^(\s+)/)
        if (ws) pos += ws[1].length
      }
    }
    return pos
  }

  for (const para of splitParagraphs(text)) {
    const sentences = splitSentences(para.text)
    let offset = para.start
    const offsets: number[] = []
    for (const s of sentences) { offsets.push(offset); offset += s.length }

    const flagRun = (i: number, j: number, opener: string, wordCount: number) => {
      const count = j - i
      for (let k = i; k < j; k++) {
        const sentStart = offsets[k]
        const end = sentStart + openerLength(sentences[k], wordCount)
        violations.push({
          ruleId: 'anaphora-abuse', startIndex: sentStart, endIndex: end,
          matchedText: text.slice(sentStart, end),
          explanation: `"${opener}..." repeated ${count} times`,
        })
      }
    }

    let i = 0
    while (i < sentences.length) {
      // Copula-cleft opener ("It is X. It is Y. It is Z.") — covers the subject
      // pronouns twoWordOpener skips, so try it before the generic openers.
      const cleft = cleftOpener(sentences[i])
      if (cleft) {
        let j = i + 1
        while (j < sentences.length && cleftOpener(sentences[j])?.key === cleft.key) j++
        if (j - i >= 3) {
          const count = j - i
          for (let k = i; k < j; k++) {
            const sentStart = offsets[k]
            const end = sentStart + cleftOpener(sentences[k])!.length
            violations.push({
              ruleId: 'anaphora-abuse', startIndex: sentStart, endIndex: end,
              matchedText: text.slice(sentStart, end),
              explanation: `"${cleft.key}..." repeated ${count} times`,
            })
          }
          i = j; continue
        }
      }
      // Two-word opener (more specific — try first)
      const two = twoWordOpener(sentences[i])
      if (two) {
        let j = i + 1
        while (j < sentences.length && twoWordOpener(sentences[j]) === two) j++
        if (j - i >= 3) { flagRun(i, j, two, 2); i = j; continue }
      }
      // Single-word opener not on the generic skip list
      const one = singleWordOpener(sentences[i])
      if (one) {
        let j = i + 1
        while (j < sentences.length && singleWordOpener(sentences[j]) === one) j++
        if (j - i >= 3) { flagRun(i, j, one, 1); i = j; continue }
      }
      i++
    }
  }
  return violations
}

export function detectGerundLitany(text: string): Violation[] {
  const violations: Violation[] = []

  const isGerund = (s: string) => {
    const trimmed = s.trim()
    const words = trimmed.split(/\s+/).filter(Boolean)
    return words.length <= 8 && /^[A-Z][a-z]+ing\b/.test(trimmed)
  }

  for (const para of splitParagraphs(text)) {
    const sentences = splitSentences(para.text)
    let offset = para.start
    const offsets: number[] = []
    for (const s of sentences) { offsets.push(offset); offset += s.length }

    let i = 0
    while (i < sentences.length) {
      if (isGerund(sentences[i])) {
        let j = i + 1
        while (j < sentences.length && isGerund(sentences[j])) j++
        if (j - i >= 2) {
          const start = offsets[i]
          const end = offsets[j - 1] + sentences[j - 1].length
          violations.push({ ruleId: 'gerund-fragment-litany', startIndex: start, endIndex: end, matchedText: text.slice(start, end) })
          i = j; continue
        }
      }
      i++
    }
  }
  return violations
}

export function detectHeresTheKicker(text: string): Violation[] {
  const violations: Violation[] = []
  const lower = text.toLowerCase()
  for (const phrase of HERES_THE_KICKER_PHRASES) {
    let idx = lower.indexOf(phrase)
    while (idx !== -1) {
      violations.push({
        ruleId: 'heres-the-kicker',
        startIndex: idx,
        endIndex: idx + phrase.length,
        matchedText: text.slice(idx, idx + phrase.length),
      })
      idx = lower.indexOf(phrase, idx + 1)
    }
  }
  return violations
}

export function detectPedagogicalAside(text: string): Violation[] {
  const violations: Violation[] = []
  const lower = text.toLowerCase()
  for (const phrase of PEDAGOGICAL_PHRASES) {
    let idx = lower.indexOf(phrase)
    while (idx !== -1) {
      violations.push({
        ruleId: 'pedagogical-aside',
        startIndex: idx,
        endIndex: idx + phrase.length,
        matchedText: text.slice(idx, idx + phrase.length),
      })
      idx = lower.indexOf(phrase, idx + 1)
    }
  }
  return violations
}

export function detectImagineWorld(text: string): Violation[] {
  const re = /\bImagine\s+(a world|if you|what would|a future)/gi
  return findAll(text, re, 'imagine-world')
}

export function detectListicleTrenchCoat(text: string): Violation[] {
  const violations: Violation[] = []
  const re = /(^|[.!?]\s+|\n\s*)the\s+(first|second|third|fourth|fifth)\b/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const offset = m[1]?.length ?? 0
    violations.push({
      ruleId: 'listicle-trench-coat',
      startIndex: m.index + offset,
      endIndex: m.index + m[0].length,
      matchedText: m[0].slice(offset),
    })
  }
  if (violations.length < 2) return []
  return violations
}

export function detectVagueAttribution(text: string): Violation[] {
  const violations: Violation[] = []
  const lower = text.toLowerCase()
  for (const phrase of VAGUE_ATTRIBUTION_PHRASES) {
    let idx = lower.indexOf(phrase)
    while (idx !== -1) {
      violations.push({
        ruleId: 'vague-attribution',
        startIndex: idx,
        endIndex: idx + phrase.length,
        matchedText: text.slice(idx, idx + phrase.length),
      })
      idx = lower.indexOf(phrase, idx + 1)
    }
  }
  return violations
}

export function detectBoldFirstBullets(text: string): Violation[] {
  const re = /^([ \t]*)([-*•])([ \t]+\*\*[^*\n]+\*\*)/gm
  const violations: Violation[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    // Highlight the bold text itself (between ** markers), not the bullet character.
    // The bullet char gets replaced by a CM widget in live preview, which suppresses
    // any Decoration.mark on that same range.
    const group3Start = m.index + m[1].length + m[2].length
    const group3 = m[3]
    const star1 = group3.indexOf('**')
    const star2 = group3.lastIndexOf('**')
    const startIndex = group3Start + star1 + 2
    const endIndex = group3Start + star2
    if (startIndex >= endIndex) continue
    violations.push({
      ruleId: 'bold-first-bullets',
      startIndex,
      endIndex,
      matchedText: text.slice(startIndex, endIndex),
    })
  }
  return violations
}

export function detectUnicodeDecoration(text: string): Violation[] {
  const violations: Violation[] = []
  // Arrow/pointer glyphs used as prose connectors: → ⇒ ⟶ ⟹ ► ▸ ➤ ↳
  // (▶ U+25B6 and ➡ U+27A1 are Extended_Pictographic — the emoji pass catches them.)
  violations.push(...findAll(text, /[→⇒⟶⟹►▸➤↳]/g, 'unicode-decoration'))
  // Emoji decoration: any Extended_Pictographic run (checkmarks, rockets,
  // sparkles, lightbulbs...). © ® ™ are technically Extended_Pictographic but
  // legitimate in prose — excluded. U+FE0F (variation selector) and U+200D (ZWJ)
  // glue multi-codepoint emoji so a run or ZWJ sequence highlights as one span.
  violations.push(...findAll(text, /(?:(?![\u00A9\u00AE\u2122])\p{Extended_Pictographic}[\uFE0F\u200D]*)+/gu, 'unicode-decoration'))
  return violations
}

export function detectDespiteChallenges(text: string): Violation[] {
  const re = /\bDespite (these|its|the|their|all|such)\b[^.!?]{0,80}\b(challenge|obstacle|limitation|difficult|drawback|shortcoming)/gi
  return findAll(text, re, 'despite-challenges')
}

// Abstract suffix nouns LLMs attach to a content word to coin pseudo-analytical
// terms: "the attention paradox", "productivity theater", "decision fatigue".
// Values list preceding words that form established literal compounds ("income
// tax", "chronic fatigue") — real terms, not coined labels, so they're skipped.
// Established-but-slop-adjacent compounds ("scope creep", "imposter syndrome",
// "technical debt") stay flagged on purpose: the rule targets prose inflation.
const CONCEPT_LABEL_NOUNS: Record<string, string[]> = {
  // original six
  paradox:   [],
  trap:      ['booby', 'bear', 'mouse', 'speed', 'sand', 'steam', 'tourist'],
  creep:     [],
  vacuum:    [],
  inversion: ['temperature'],
  chasm:     [],
  // motion / feedback metaphors
  treadmill: [],
  flywheel:  [],
  spiral:    [],
  vortex:    ['polar'],
  cascade:   ['signaling', 'signalling', 'trophic', 'clotting', 'coagulation'],
  whiplash:  [],
  loop:      ['feedback', 'for', 'while', 'event', 'infinite', 'inner', 'outer', 'closed', 'open', 'main', 'game', 'render', 'training', 'retry'],
  // hazard-terrain metaphors
  minefield: [],
  quicksand: [],
  tightrope: [],
  moat:      [],
  mirage:    [],
  purgatory: [],
  limbo:     [],
  // cost / pressure metaphors
  tax:     ['income', 'sales', 'property', 'estate', 'payroll', 'carbon', 'corporate', 'inheritance', 'excise', 'council', 'poll', 'road', 'gas', 'flat', 'federal', 'state'],
  debt:    ['national', 'student', 'credit', 'card', 'household', 'consumer', 'public', 'sovereign', 'government', 'medical', 'mortgage', 'foreign'],
  deficit: ['budget', 'trade', 'fiscal', 'federal', 'attention', 'calorie', 'caloric'],
  fatigue: ['chronic', 'adrenal', 'muscle', 'metal', 'battle', 'compassion', 'combat'],
  // pseudo-clinical / pseudo-academic labels
  syndrome: ['down', 'tourette', 'asperger', 'metabolic', 'tunnel', 'alcohol', 'bowel', 'leg', 'shock', 'distress', 'fatigue'],
  fallacy:  ['logical', 'formal', 'informal'],
  dilemma:  ['moral', 'ethical'],
  illusion: ['optical', 'auditory'],
  inertia:  ['thermal', 'rotational'],
  // decay / growth labels
  drift:   ['genetic', 'continental', 'snow'],
  sprawl:  ['urban', 'suburban'],
  bloat:   [],
  theater: ['movie', 'home', 'musical', 'operating', 'community', 'dinner', 'amateur', 'regional', 'lecture'],
  theatre: ['movie', 'home', 'musical', 'operating', 'community', 'dinner', 'amateur', 'regional', 'lecture', 'west'],
}

// A coined label needs a content word in front. A determiner, preposition, or
// quantifier before the noun signals ordinary usage ("falls into the trap",
// "in a vacuum", "left in limbo") — never the invented-concept tell.
const CONCEPT_LABEL_SKIP_PRECEDING = new Set([
  'the', 'an', 'this', 'that', 'these', 'those',
  'my', 'your', 'his', 'her', 'its', 'our', 'their', 'whose',
  'of', 'in', 'into', 'from', 'with', 'without', 'about', 'over', 'under',
  'through', 'like', 'unlike', 'as', 'at', 'by', 'on', 'to', 'for', 'per', 'than',
  'and', 'or', 'nor', 'but',
  'any', 'no', 'some', 'every', 'each', 'one', 'another', 'such', 'own', 'said', 'same',
])

const CONCEPT_LABEL_RE = new RegExp(
  `\\b([a-z][a-z-]+)\\s+(${Object.keys(CONCEPT_LABEL_NOUNS).join('|')})\\b`,
  'gi',
)

export function detectConceptLabel(text: string): Violation[] {
  const violations: Violation[] = []
  const re = new RegExp(CONCEPT_LABEL_RE.source, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const preceding = m[1].toLowerCase()
    const noun = m[2].toLowerCase()
    if (CONCEPT_LABEL_SKIP_PRECEDING.has(preceding)) continue
    if (CONCEPT_LABEL_NOUNS[noun]?.includes(preceding)) continue
    violations.push({
      ruleId: 'invented-concept-label',
      startIndex: m.index,
      endIndex: m.index + m[0].length,
      matchedText: m[0],
    })
  }
  return violations
}

export function detectDramaticFragment(text: string): Violation[] {
  const violations: Violation[] = []
  for (const para of splitParagraphs(text)) {
    const trimmed = para.text.trim()
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length
    if (wordCount >= 1 && wordCount <= 4 && !trimmed.endsWith(':')) {
      // Skip title-like paragraphs: no terminal punctuation and either first in document
      // or all significant words are capitalised (section headings)
      const hasTerminalPunct = /[.!?]/.test(trimmed)
      const isFirstPara = text.slice(0, para.start).trim() === ''
      const allWordsCapped = trimmed.split(/\s+/).every(w => /^[A-Z0-9\-–—"''""\[]/.test(w))
      if (!hasTerminalPunct && (isFirstPara || allWordsCapped)) continue
      violations.push({
        ruleId: 'dramatic-fragment',
        startIndex: para.start,
        endIndex: para.start + para.text.length,
        matchedText: trimmed,
      })
    }
  }
  // "Just... there." — ellipsis used as dramatic pause between short fragments inline
  violations.push(...findAll(text, /\b\w{1,12}(?:\.{3}|…)\s+\w{1,12}(?:\s+\w{1,10})?[.!?]/g, 'dramatic-fragment'))
  return violations
}

export function detectPairedNegation(text: string): Violation[] {
  return findAll(text, /\bnot \w+,\s*not \w+/gi, 'paired-negation')
}

export function detectRealityClaim(text: string): Violation[] {
  // "The gap is real", "they are legitimate", "this cannot be dismissed", "this actually matters", "the response was real"
  return findAll(text,
    /\b(?:(?:the|a|an)\s+(?:\w+\s+){0,2}\w+|(?:this|that|these|those)(?:\s+\w+)?|it|they)\s+(?:(?:is|are|was|were)\s+(?:(?:very|truly|genuinely|so)\s+)?(?:real|undeniable|significant|legitimate|genuine|tangible|palpable|profound|urgent)|cannot\s+be\s+(?:ignored|overstated|denied|understated|dismissed|overlooked|minimized|trivialized)|(?:actually\s+|truly\s+|deeply\s+)?matters)\b/gi,
    'reality-claim')
}

export function detectSuperficialAnalysis(text: string): Violation[] {
  const re = /,\s+(highlighting|underscoring|showcasing|reflecting|cementing|embodying|encapsulating)\s+(its|the|their|this)\s+(importance|role|significance|legacy|power|spirit|nature|value)\b/gi
  return findAll(text, re, 'superficial-analysis')
}

// ── Phantom contrast ──────────────────────────────────────────────────────────
// "These events were short, hours not days" — a scale-contrast appositive that
// restates the evaluative adjective before it, negating an expectation the text
// never raised. The redundancy is provable when (a) both endpoints sit on the
// same ordered unit scale and (b) the contrast direction agrees with the
// adjective (small adjective + smaller-unit-first, or big + bigger-unit-first).
// A disagreeing direction ("brief, days not minutes") is informative and never
// fires; a bare contrast with no adjective ("It took hours, not days") may be
// a genuine correction of a stated estimate and never fires.

// Ordered smallest → largest within each scale. Same-scale membership is the
// precision engine: "hours, not overtime" can never fire.
const PHANTOM_CONTRAST_SCALES: string[][] = [
  ['moment', 'second', 'minute', 'hour', 'day', 'week', 'month', 'year', 'decade', 'century', 'millennium'],
  ['ten', 'dozen', 'hundred', 'thousand', 'million', 'billion', 'trillion'],
  ['millimeter', 'centimeter', 'meter', 'kilometer'],
  ['inch', 'foot', 'yard', 'mile'],
]

const PHANTOM_UNIT_INDEX = new Map<string, { scale: number; idx: number }>()
PHANTOM_CONTRAST_SCALES.forEach((scale, s) =>
  scale.forEach((unit, i) => PHANTOM_UNIT_INDEX.set(unit, { scale: s, idx: i })),
)

// Irregular plurals fold to the scale's canonical singular; British -tre
// spellings fold to -ter.
const PHANTOM_UNIT_FOLDS: Record<string, string> = {
  feet: 'foot',
  inches: 'inch',
  centuries: 'century',
  millennia: 'millennium',
}

function foldUnit(word: string): string {
  const lower = word.toLowerCase()
  return PHANTOM_UNIT_FOLDS[lower] ?? lower.replace(/s$/, '').replace(/tre$/, 'ter')
}

const PHANTOM_SMALL_ADJ_RE =
  /\b(short|brief|quick|quickly|fast|rapid|rapidly|soon|swift|swiftly|cheap|tiny|small|minor|modest|close|tight|marginal|low|trivial|fleeting|near|imminent)\b/i
const PHANTOM_BIG_ADJ_RE =
  /\b(long|slow|slowly|massive|huge|enormous|vast|large|major|expensive|costly|high|staggering|astronomical|distant|far)\b/i

// Delimiter, optional filler ("a matter of", "within"), unit X, "not", unit Y.
// The delimiter requirement keeps mid-clause contrasts ("lasted weeks, not
// days") out of scope — only the detached appositive is the tell. The span
// starts at the delimiter so canRemove deletion excises the whole appositive:
// "short, hours not days." → "short."
const PHANTOM_CONTRAST_RE =
  /([,:—–])\s*((?:(?:a|an|the|mere|merely|just|maybe|perhaps|within|in|of|matter)\s+){0,4})(\w+),?\s+not\s+(?:even\s+|the\s+)?(\w+)/gi

export function detectPhantomContrast(text: string): Violation[] {
  const violations: Violation[] = []

  for (const para of splitParagraphs(text)) {
    let offset = 0
    for (const sentence of splitSentences(para.text)) {
      const sentenceStart = para.start + offset
      offset += sentence.length

      PHANTOM_CONTRAST_RE.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = PHANTOM_CONTRAST_RE.exec(sentence)) !== null) {
        const unitX = PHANTOM_UNIT_INDEX.get(foldUnit(m[3]))
        const unitY = PHANTOM_UNIT_INDEX.get(foldUnit(m[4]))
        if (!unitX || !unitY || unitX.scale !== unitY.scale || unitX.idx === unitY.idx) continue

        // Adjective gate: fire only when the clause before the contrast
        // already made the evaluation the contrast restates.
        const before = sentence.slice(0, m.index)
        const agrees =
          (unitX.idx < unitY.idx && PHANTOM_SMALL_ADJ_RE.test(before)) ||
          (unitX.idx > unitY.idx && PHANTOM_BIG_ADJ_RE.test(before))
        if (!agrees) continue

        violations.push({
          ruleId: 'phantom-contrast',
          startIndex: sentenceStart + m.index,
          endIndex: sentenceStart + m.index + m[0].length,
          matchedText: m[0],
        })
      }
    }
  }

  // "Think ecosystems, not pipelines." — imperative phantom contrast; slop
  // regardless of scale. Both words must look plural so "I think so, not
  // really" stays silent. Only the ", not Y" tail is flagged so canRemove
  // deletion keeps "think X".
  const thinkRe = /\bthink\s+\w+s(,\s*not\s+\w+s)\b/gi
  let m: RegExpExecArray | null
  while ((m = thinkRe.exec(text)) !== null) {
    const start = m.index + m[0].length - m[1].length
    violations.push({
      ruleId: 'phantom-contrast',
      startIndex: start,
      endIndex: m.index + m[0].length,
      matchedText: m[1],
    })
  }

  return violations
}

// ── Exemplar clichés ──────────────────────────────────────────────────────────
// From slopbuster + universal AI tell: labelling something as proof without arguing why.
// "A textbook example of X" performs analysis rather than doing it.
// Phrase list and per-phrase weights live in scoring.config.ts (EXEMPLAR_CLICHE_PHRASES).

export function detectExemplarCliche(text: string): Violation[] {
  const violations: Violation[] = []
  const lower = text.toLowerCase()
  for (const [phrase, weight] of Object.entries(EXEMPLAR_CLICHE_PHRASES)) {
    let idx = lower.indexOf(phrase)
    while (idx !== -1) {
      violations.push({
        ruleId: 'exemplar-cliche',
        startIndex: idx,
        endIndex: idx + phrase.length,
        matchedText: text.slice(idx, idx + phrase.length),
        instanceWeight: weight,
      })
      idx = lower.indexOf(phrase, idx + 1)
    }
  }

  // "Exhibit A" — rhetorical canonicity claim. Capital A required (the courtroom
  // usage is always capitalized), and the lookahead demands of/for/in or trailing
  // punctuation so "fish exhibit a preference" never matches.
  const exhibitARe = /\b[Ee]xhibit A\b(?=\s+(?:of|for|in)\b|\s*[.,:;!?)—–]|\s*$)/g
  let m: RegExpExecArray | null
  while ((m = exhibitARe.exec(text)) !== null) {
    violations.push({
      ruleId: 'exemplar-cliche',
      startIndex: m.index,
      endIndex: m.index + m[0].length,
      matchedText: m[0],
      instanceWeight: 0.9,
    })
  }

  // "(straight) out of the X playbook" / "from the X playbook" — borrowed-authority
  // frame with a variable middle, so it can't live in the substring list.
  const playbookRe = /\b(?:out of|from) the [\w\u2019']+(?:[ -][\w\u2019']+){0,3} playbook\b/gi
  while ((m = playbookRe.exec(text)) !== null) {
    violations.push({
      ruleId: 'exemplar-cliche',
      startIndex: m.index,
      endIndex: m.index + m[0].length,
      matchedText: m[0],
      instanceWeight: 1.0,
    })
  }

  return violations
}

// ── Chatbot artifacts ─────────────────────────────────────────────────────────
// From slopbuster Rule 19: conversational scaffolding pasted into written content.
// These are response-to-a-prompt phrases, not prose.

export function detectChatbotArtifact(text: string): Violation[] {
  const violations: Violation[] = []
  const lower = text.toLowerCase()

  const exactPhrases = [
    // Conversational scaffolding
    'i hope this helps',
    'feel free to',
    'let me know if you',
    'happy to help',
    'is there anything else',
    'i hope that helps',
    'hope this helps',
    // AI self-identification
    'as an ai language model',
    'as a large language model',
    'as an ai assistant',
    'as an artificial intelligence',
    'as an ai,',
    'as an ai.',
    // Prompt refusal / capability disclaimers
    'i cannot fulfill this request',
    'i cannot assist with that',
    'i cannot provide information',
    'i do not have the ability to',
    'i am unable to provide',
    'i am unable to assist',
    'i should note that as an ai',
  ]
  for (const phrase of exactPhrases) {
    let idx = lower.indexOf(phrase)
    while (idx !== -1) {
      violations.push({
        ruleId: 'chatbot-artifact',
        startIndex: idx,
        endIndex: idx + phrase.length,
        matchedText: text.slice(idx, idx + phrase.length),
      })
      idx = lower.indexOf(phrase, idx + 1)
    }
  }

  // Apostrophe variants — use regex to handle straight vs. curly quotes
  const regexPhrases = [
    /\bdon[’']t\s+hesitate\s+to\b/gi,
    /\bi[’']d\s+be\s+(?:glad|happy|delighted)\s+to\b/gi,
    /\bhere[’']s\s+a\s+(?:breakdown|summary|quick\s+overview)\b/gi,
    // AI self-ID with apostrophe
    /\bas\s+an\s+ai[,.]?\s+i[’'](?:m|ve|ll|d)\b/gi,
    // Prompt refusal with apostrophe
    /\bi[’']m\s+unable\s+to\s+(?:provide|assist|help|fulfill|generate|create)\b/gi,
    /\bi[’']m\s+not\s+able\s+to\s+(?:provide|assist|help|fulfill|generate|create)\b/gi,
    /\bi\s+can[’']t\s+(?:assist\s+with|provide|help\s+with|fulfill|generate\s+content)\b/gi,
  ]
  for (const re of regexPhrases) {
    violations.push(...findAll(text, re, 'chatbot-artifact'))
  }

  return violations
}

// ── Knowledge-cutoff disclaimers ─────────────────────────────────────────────
// From slopbuster Rule 20: AI hedging about its own knowledge limits.
// Humans either know something or don't mention it — they don't hedge about the
// limits of their own knowledge the way an LLM does.

export function detectKnowledgeCutoffDisclaimer(text: string): Violation[] {
  const violations: Violation[] = []
  const lower = text.toLowerCase()

  const exactPhrases = [
    'as of my last training',
    'as of my knowledge cutoff',
    'up to my knowledge cutoff',
    'to my knowledge',
    'as far as i know',
    'based on available information',
    'while specific details are',
    'at the time of writing',
    'as of this writing',
  ]
  for (const phrase of exactPhrases) {
    let idx = lower.indexOf(phrase)
    while (idx !== -1) {
      violations.push({
        ruleId: 'knowledge-cutoff-disclaimer',
        startIndex: idx,
        endIndex: idx + phrase.length,
        matchedText: text.slice(idx, idx + phrase.length),
      })
      idx = lower.indexOf(phrase, idx + 1)
    }
  }

  // "as of [month/year]" — e.g. "as of January 2024", "as of 2023"
  violations.push(...findAll(text,
    /\bas\s+of\s+(?:(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+)?\d{4}\b/gi,
    'knowledge-cutoff-disclaimer'))

  // "my last update", "my training data", "my training cutoff"
  violations.push(...findAll(text,
    /\bmy\s+(?:last\s+)?(?:training(?:\s+(?:data|cutoff|update))?|knowledge\s+(?:base|cutoff))\b/gi,
    'knowledge-cutoff-disclaimer'))

  return violations
}

// ── Professional disclaimers ──────────────────────────────────────────────────
// AI disclaiming its own non-professional status before answering: "I am an AI,
// not a doctor," "this is not medical advice." A human writing in their own
// voice doesn't caveat their identity this way.

export function detectProfessionalDisclaimer(text: string): Violation[] {
  const violations: Violation[] = []
  violations.push(...findAll(text,
    /\bi(?:['’]m| am)\s+an\s+ai,?\s+not\s+a\s+(?:doctor|lawyer|therapist|physician|attorney|accountant|financial\s+advisor|nutritionist|psychologist|licensed\s+\w+)\b/gi,
    'professional-disclaimer'))
  violations.push(...findAll(text,
    /\b(?:this\s+is\s+)?(?:not|isn['’]t)\s+(?:medical|legal|financial|professional|psychiatric|clinical)\s+advice\b/gi,
    'professional-disclaimer'))
  return violations
}

// ── Earned claims ─────────────────────────────────────────────────────────────
// Bare assertion of legitimacy for an outcome ("was earned", "is earned")
// without demonstrating how — asserting deservingness rather than showing it.

export function detectEarnedClaim(text: string): Violation[] {
  return findAll(text,
    /\b(?:the|this|that|his|her|their|its)\s+\w+(?:\s+\w+)?\s+(?:was|is|were|are|has\s+been|have\s+been)\s+(?:truly\s+|genuinely\s+|rightfully\s+|richly\s+|hard[- ]?)?earned\b/gi,
    'earned-claim')
}

// ── Inline Emphasis Spam ──────────────────────────────────────────────────────
// Flags **bold** and *italic* spans used mid-sentence in prose — a formatting
// tic LLMs use to make arbitrary phrases seem important.
// Excludes bullet-start bolds (handled by bold-first-bullets).
export function detectInlineEmphasis(text: string): Violation[] {
  const violations: Violation[] = []

  const boldRe = /\*\*([^*\n]{1,60})\*\*/g
  const italicRe = /(?<!\*)\*(?![\s*])([^*\n]{1,60})\*(?!\*)/g

  for (const re of [boldRe, italicRe]) {
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      // Skip if this is at the start of a bullet line (bold-first-bullets handles those)
      const lineStart = text.lastIndexOf('\n', m.index - 1) + 1
      const lineEnd = text.indexOf('\n', m.index)
      const fullLine = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd)
      const beforeMatch = text.slice(lineStart, m.index)
      if (/^[ \t]*[-*•][ \t]+$/.test(beforeMatch)) continue

      // Skip only when the emphasis span IS the entire heading content
      if (/^#{1,6}\s/.test(fullLine)) {
        const headingContent = fullLine.replace(/^#{1,6}\s+/, '').trim()
        if (m[0] === headingContent) continue
      }

      // Skip title-cased spans — every word starts uppercase, so it's a heading/label
      const inner = m[1]
      const words = inner.split(/\s+/).filter(w => /^[a-zA-Z]/.test(w))
      if (words.length >= 2 && words.every(w => /^[A-Z]/.test(w))) continue

      // Skip numbered/lettered list labels: "A. ...", "1. ...", "B) ..."
      if (/^[A-Za-z0-9]+[.)]\s/.test(inner)) continue

      violations.push({
        ruleId: 'inline-emphasis',
        startIndex: m.index,
        endIndex: m.index + m[0].length,
        matchedText: m[0],
        suggestedChange: m[1],
      })
    }
  }

  return violations
}

// ── Significance phrases ──────────────────────────────────────────────────────
// From slopbuster Rule 1 / slopsquid academic preset: verb phrases that inflate
// significance without substance. Handles common conjugation forms via regex.

export function detectSignificancePhrases(text: string): Violation[] {
  const violations: Violation[] = []
  // "plays/played/playing a [adj] role"
  violations.push(...findAll(text,
    /\b(?:plays?|played|playing)\s+a\s+(?:key|crucial|vital|pivotal|central|significant|important|integral)\s+role\b/gi,
    'significance-phrases'))
  // "sheds/shed/shedding light on"
  violations.push(...findAll(text,
    /\b(?:sheds?|shed(?:ding)?)\s+light\s+on\b/gi,
    'significance-phrases'))
  // "paves/paved/paving the way"
  violations.push(...findAll(text,
    /\b(?:paves?|paved|paving)\s+the\s+way\b/gi,
    'significance-phrases'))
  // "sets/set/setting the stage"
  violations.push(...findAll(text,
    /\b(?:sets?|set(?:ting)?)\s+the\s+stage\b/gi,
    'significance-phrases'))
  return violations
}

export function detectFalseRange(text: string): Violation[] {
  const violations: Violation[] = []

  // "from nowhere" hollow idiom — e.g. "doesn't emerge from nowhere", "came from nowhere"
  // Match: optional negation + motion/emergence verb + "from nowhere"
  const negation = `(?:doesn[\u2019']?t|didn[\u2019']?t|don[\u2019']?t|does\\s+not|did\\s+not|isn[\u2019']?t|wasn[\u2019']?t|aren[\u2019']?t|is\\s+not|was\\s+not)\\s+`
  const verb = `(?:emerge[sd]?|comes?|came|appear[sed]*|spring[s]?|sprung|arose?|arise[s]?|materialize[sd]?|happen[sed]*|develop[sed]*|exist[sed]*)`
  const re = new RegExp(`(?:${negation})?${verb}\\s+from\\s+nowhere`, 'gi')

  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    violations.push({
      ruleId: 'false-range',
      startIndex: m.index,
      endIndex: m.index + m[0].length,
      matchedText: m[0],
    })
  }

  // "everything/everyone/anything/anyone from X to Y" — categorical scope claim.
  // Endpoints capped at 3 words each. Matches containing digits are skipped:
  // "everything from $5 to $500" is a real range, not a rhetorical one.
  const scopeRe = /\b(?:everything|everyone|anything|anyone)\s+from\s+(?:[\w’'$-]+\s+){0,2}[\w’'$-]+\s+to\s+(?:[\w’'$-]+\s+){0,2}[\w’'$-]+/gi
  while ((m = scopeRe.exec(text)) !== null) {
    if (/\d/.test(m[0])) continue
    violations.push({
      ruleId: 'false-range',
      startIndex: m.index,
      endIndex: m.index + m[0].length,
      matchedText: m[0],
    })
  }

  // "whether you're a X or (a/just) Y" — persona false range addressing the
  // reader ("whether you're a startup founder or a Fortune 500 executive").
  const personaRe = /\bwhether\s+you(?:[’']re|\s+are)\s+an?\s+(?:[\w’'-]+\s+){0,4}[\w’'-]+\s+or\s+(?:(?:an?|just)\s+)?(?:[\w’'-]+\s+){0,4}[\w’'-]+/gi
  while ((m = personaRe.exec(text)) !== null) {
    violations.push({
      ruleId: 'false-range',
      startIndex: m.index,
      endIndex: m.index + m[0].length,
      matchedText: m[0],
    })
  }

  // "Xs and Ys alike" — comprehensiveness flourish ("critics and fans alike").
  // Require a plural-looking word (trailing single s, length > 3) on at least
  // one side to avoid the "similarly" sense ("they look and act alike").
  const alikeRe = /\b([\w’'-]+)\s+and\s+([\w’'-]+)\s+alike\b/gi
  const pluralLike = (w: string) => w.length > 3 && /[^s]s$/i.test(w)
  while ((m = alikeRe.exec(text)) !== null) {
    if (!pluralLike(m[1]) && !pluralLike(m[2])) continue
    violations.push({
      ruleId: 'false-range',
      startIndex: m.index,
      endIndex: m.index + m[0].length,
      matchedText: m[0],
    })
  }

  return violations
}

// \u2500\u2500 Stacked intensifiers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Evaluative praise adjectives, certainty adverbs, register/degree intensifiers,
// and intensifier phrases — individually borderline but strongly signal AI
// amplification (sycophantic or dramatic) when 3+ appear within a 3-sentence
// window. Merged from multiple word pools; later spreads win on key overlap
// so EVALUATIVE_INTENSIFIERS' hand-tuned weights take priority.
const STACKED_WORD_WEIGHTS: Record<string, number> = {
  ...INTENSIFIERS,
  ...FILLER_ADVERBS,
  ...ADJECTIVE_INTENSIFIERS,
  ...EVALUATIVE_INTENSIFIERS,
}
const STACKED_WORD_RE = new RegExp(`\\b(${Object.keys(STACKED_WORD_WEIGHTS).join('|')})s?(?:-\\w+)*\\b`, 'gi')

const STACKED_PHRASE_WEIGHTS = INTENSIFIER_PHRASES
const STACKED_PHRASE_RE = new RegExp(
  `\\b(${Object.keys(STACKED_PHRASE_WEIGHTS)
    .map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})\\b`,
  'gi',
)

export function detectStackedIntensifiers(text: string): Violation[] {
  const violations: Violation[] = []
  const WINDOW_SIZE = 3
  const THRESHOLD = 3

  for (const para of splitParagraphs(text)) {
    const sentences = splitSentences(para.text)

    // Build sentence start offsets within para.text
    const sentenceOffsets: number[] = []
    let off = 0
    for (const s of sentences) {
      sentenceOffsets.push(off)
      off += s.length
    }

    // Find all word + phrase intensifier matches per sentence: {word, offsetInPara}
    type Hit = { word: string; offsetInPara: number; length: number; weight: number }
    const hitsPerSentence: Hit[][] = sentences.map((s, si) => {
      const byOffset = new Map<number, Hit>()

      const wordRe = new RegExp(STACKED_WORD_RE.source, 'gi')
      let m: RegExpExecArray | null
      while ((m = wordRe.exec(s)) !== null) {
        const offsetInPara = sentenceOffsets[si] + m.index
        byOffset.set(offsetInPara, {
          word: m[0].toLowerCase(),
          offsetInPara,
          length: m[0].length,
          weight: STACKED_WORD_WEIGHTS[m[1].toLowerCase()] ?? 0.50,
        })
      }

      const phraseRe = new RegExp(STACKED_PHRASE_RE.source, 'gi')
      while ((m = phraseRe.exec(s)) !== null) {
        const offsetInPara = sentenceOffsets[si] + m.index
        if (byOffset.has(offsetInPara)) continue
        byOffset.set(offsetInPara, {
          word: m[0].toLowerCase(),
          offsetInPara,
          length: m[0].length,
          weight: STACKED_PHRASE_WEIGHTS[m[0].toLowerCase()] ?? 0.50,
        })
      }

      return [...byOffset.values()].sort((a, b) => a.offsetInPara - b.offsetInPara)
    })

    // Sliding window: when a window hits threshold, flag each word individually
    // but share a groupKey so they count as one logical violation in the sidebar/scorer.
    const flaggedOffsets = new Set<number>()
    let clusterIndex = 0
    let i = 0
    while (i < sentences.length) {
      const end = Math.min(i + WINDOW_SIZE, sentences.length)
      const windowHits = hitsPerSentence.slice(i, end).flat()

      if (windowHits.length >= THRESHOLD) {
        const unique = [...new Set(windowHits.map(h => h.word))]
        const explanation = `Stacked with ${windowHits.length} intensifiers: ${unique.slice(0, 4).join(', ')}`
        const groupKey = `stacked-${para.start}-${clusterIndex++}`
        for (const hit of windowHits) {
          if (!flaggedOffsets.has(hit.offsetInPara)) {
            flaggedOffsets.add(hit.offsetInPara)
            violations.push({
              ruleId: 'stacked-intensifiers',
              groupKey,
              startIndex: para.start + hit.offsetInPara,
              endIndex: para.start + hit.offsetInPara + hit.length,
              matchedText: text.slice(para.start + hit.offsetInPara, para.start + hit.offsetInPara + hit.length),
              instanceWeight: hit.weight,
              explanation,
            })
          }
        }
        i = end
      } else {
        i++
      }
    }
  }
  return violations
}

// ── AI trigrams ───────────────────────────────────────────────────────────────
// Three-word sequences statistically overrepresented in AI creative writing
// relative to human baselines (Paech et al., 2025).

// Separator between n-gram tokens: spaces/tabs, optionally around a comma,
// em-dash, or en-dash — "voice, barely a whisper" and "voice—barely a whisper"
// are the same tell as the unpunctuated form. Newlines never join an n-gram.
// Built from regex-literal .source so the Unicode dashes never pass through
// string-escape handling (see the new RegExp + \uXXXX constraint in CLAUDE.md).
const NGRAM_SEP = /(?:[ \t]*[,—–][ \t]*|[ \t]+)/.source
// An intervening word, possibly with an apostrophe or hyphen ("wolf’s", "half-heard").
const NGRAM_FILLER = /[\w’'-]+/.source
// Gap between anchor tokens: a separator plus up to two intervening words, so
// "glimmer of hope", "glimmer of faint hope", and "voice, barely a whisper"
// all match while longer insertions ("barely more than a faint whisper"
// between anchors) stay excluded.
const NGRAM_GAP = `${NGRAM_SEP}(?:${NGRAM_FILLER}${NGRAM_SEP}){0,2}`

export function detectSlopTrigrams(text: string): Violation[] {
  const violations: Violation[] = []
  for (const [phrase, weight] of Object.entries(SLOP_TRIGRAMS)) {
    const words = phrase.split(' ')
    // Join anchor words with the shared gap: "voice barely whisper" matches
    // "voice barely a whisper", "voice was barely a whisper", and punctuated
    // variants like "voice, barely a whisper".
    const pattern = words.map(w => `\\b${w}\\b`).join(NGRAM_GAP)
    const re = new RegExp(pattern, 'gi')
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      violations.push({
        ruleId: 'slop-trigram',
        startIndex: m.index,
        endIndex: m.index + m[0].length,
        matchedText: m[0],
        instanceWeight: weight,
      })
    }
  }
  return violations
}

export function detectSlopBigrams(text: string): Violation[] {
  const violations: Violation[] = []
  for (const [phrase, weight] of Object.entries(SLOP_BIGRAMS)) {
    const [w1, w2] = phrase.split(' ')
    // Shared gap between the pair so stopword-stripped entries like
    // "glimmer hope" match "glimmer of hope", "glimmer of faint hope",
    // and punctuated variants like "brow, furrowed".
    const pattern = `\\b${w1}\\b${NGRAM_GAP}\\b${w2}\\b`
    const re = new RegExp(pattern, 'gi')
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      violations.push({
        ruleId: 'slop-bigram',
        startIndex: m.index,
        endIndex: m.index + m[0].length,
        matchedText: m[0],
        instanceWeight: weight,
      })
    }
  }
  return violations
}

export function detectScareQuotes(text: string): Violation[] {
  const violations: Violation[] = []
  // Regex literals only -- new RegExp() with \uXXXX silently fails in this Vite/TS pipeline.
  // Double-quote pass: straight (U+0022), left curly (U+201C), right curly (U+201D).
  const reDouble = /[“”"]([^“”"\r\n]{2,40})[“”"]/g
  // Single-quote pass: opening must be U+2018 so U+2019 (apostrophe) can't open a span.
  const reSingle = /‘([^‘’\r\n]{2,40})’/g
  let m: RegExpExecArray | null
  for (const re of [reDouble, reSingle]) {
    while ((m = re.exec(text)) !== null) {
      const inner = m[1].trim()
      const wordCount = inner.split(/\s+/).filter(Boolean).length
      if (wordCount < 1 || wordCount > 4) continue
      violations.push({
        ruleId: 'quote-overuse',
        startIndex: m.index,
        endIndex: m.index + m[0].length,
        matchedText: m[0],
        instanceWeight: 0.3,
      })
    }
  }
  return violations
}

// ── Fiction body language cluster ─────────────────────────────────────────────
// Flags paragraphs with ≥3 body-language / dialogue-attribution verbs. Individual
// occurrences are normal in fiction; the density (60–98× human baseline in AI models)
// is the signal.

export function detectFictionBodyLanguage(text: string): Violation[] {
  const violations: Violation[] = []

  for (const para of splitParagraphs(text)) {
    type Hit = { start: number; end: number; weight: number; baseWord: string }
    const hits: Hit[] = []

    for (const [word, weight] of Object.entries(FICTION_BODY_LANGUAGE)) {
      // Match base form and common inflections (murmured, murmuring, murmurs)
      const re = new RegExp(`\\b${word}(?:s|ed|ing)?\\b`, 'gi')
      let m: RegExpExecArray | null
      while ((m = re.exec(para.text)) !== null) {
        hits.push({
          start: para.start + m.index,
          end: para.start + m.index + m[0].length,
          weight,
          baseWord: word,
        })
      }
    }

    if (hits.length < 2) continue

    const wordList = [...new Set(hits.map(h => h.baseWord))].slice(0, 4).join(', ')
    const groupKey = `fiction-body-${para.start}`
    const explanation = `${hits.length} body language clichés in this paragraph: ${wordList}`
    const flagged = new Set<number>()

    for (const hit of hits) {
      if (flagged.has(hit.start)) continue
      flagged.add(hit.start)
      violations.push({
        ruleId: 'fiction-body-language',
        groupKey,
        startIndex: hit.start,
        endIndex: hit.end,
        matchedText: text.slice(hit.start, hit.end),
        instanceWeight: hit.weight,
        explanation,
      })
    }
  }

  return violations
}

// ── Slop word lists (eqbench Slop Score) ─────────────────────────────────────
// Three detectors, one per category. Character names are matched case-sensitively
// (proper-noun usage only). Atmospheric and genre/essay words are case-insensitive.
// Single regex alternation per category is far faster than N individual regexes.

const _namePattern = new RegExp(
  `\\b(${SLOP_WORDS_CHARACTER_NAMES.join('|')})\\b`,
  'g',
)
const _atmosphericPattern = new RegExp(
  `\\b(${SLOP_WORDS_ATMOSPHERIC.join('|')})\\b`,
  'gi',
)
const _fantasyVocabPattern = new RegExp(
  `\\b(${SLOP_WORDS_FANTASY_VOCAB.join('|')})\\b`,
  'gi',
)
const _essayPattern = new RegExp(
  `\\b(${Object.keys(SLOP_WORDS_ESSAY).join('|')})\\b`,
  'gi',
)

function matchSlopList(
  text: string,
  pattern: RegExp,
  ruleId: string,
  instanceWeight: number,
  weightMap?: Record<string, number>,
): Violation[] {
  const violations: Violation[] = []
  // Reset lastIndex so the module-level regex is safe to reuse across calls.
  pattern.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = pattern.exec(text)) !== null) {
    violations.push({
      ruleId,
      startIndex: m.index,
      endIndex: m.index + m[0].length,
      matchedText: m[0],
      // Per-word weight when the list is weighted; otherwise the uniform fallback.
      instanceWeight: weightMap ? (weightMap[m[0].toLowerCase()] ?? instanceWeight) : instanceWeight,
    })
  }
  return violations
}

function slopWeight(ruleId: string, fallback: number): number {
  return RULE_SCORING[ruleId]?.instanceWeight ?? fallback
}

export function detectSlopWords(text: string): Violation[] {
  return [
    ...matchSlopList(text, _namePattern,        'slop-word-character-name', slopWeight('slop-word-character-name', 0.75)),
    ...matchSlopList(text, _atmosphericPattern, 'slop-word-atmospheric',    slopWeight('slop-word-atmospheric',    0.5)),
    ...matchSlopList(text, _fantasyVocabPattern,'slop-word-fantasy-vocab',  slopWeight('slop-word-fantasy-vocab',  0.6)),
    ...matchSlopList(text, _essayPattern,       'slop-word-essay',          slopWeight('slop-word-essay',          0.6), SLOP_WORDS_ESSAY),
  ]
}

// ── Sycophantic phrases ──────────────────────────────────────────────────────
// Explicit multi-word validation of the reader or their input. These are
// nearly always AI slop — humans don't open paragraphs by complimenting the
// question they're answering.

export function detectSycophanticPhrases(text: string): Violation[] {
  const violations: Violation[] = []
  // Normalize curly apostrophes so exact-phrase indexOf matching works regardless
  // of whether the text comes from contenteditable (curly) or plain input (straight).
  const lower = text.toLowerCase().replace(/[’']/g, "'")

  const exactPhrases = [
    "you're absolutely right",
    "you are absolutely right",
    "you're so right",
    "you are so right",
    "you're completely right",
    "you are completely right",
    "you're 100% right",
    "you are 100% right",
    "that's exactly right",
    "that is exactly right",
    "that's a great point",
    "that is a great point",
    "that's an excellent point",
    "that is an excellent point",
    "that's a fantastic point",
    "that is a fantastic point",
    "that's a brilliant point",
    "that is a brilliant point",
    "that's a valid point",
    "that is a valid point",
    "that's an excellent observation",
    "that is an excellent observation",
    "that's a great observation",
    "that is a great observation",
    "that's an insightful observation",
    "that is an insightful observation",
    "that's a thoughtful question",
    "that is a thoughtful question",
    "what a great question",
    "what an excellent question",
    "what a thoughtful question",
    "what a wonderful question",
    "what a fantastic question",
    "what a great point",
    "what an excellent point",
    "what a thoughtful observation",
    "you raise a great point",
    "you raise an excellent point",
    "you raise a valid point",
    "you make a great point",
    "you make an excellent point",
    "you've really thought this through",
    "you have really thought this through",
    "you're very insightful",
    "you are very insightful",
    "you're very self-aware",
    "you are very self-aware",
    "i love that question",
    "i love this question",
    "great question",
    "excellent question",
    "fascinating question",
    "wonderful question",
    "hats off to",
    "tip my hat to",
    "tip my hat",
    "could not agree more",
    "beautifully put",
    "perfectly put",
    "elegantly put",
  ]

  for (const phrase of exactPhrases) {
    let idx = lower.indexOf(phrase)
    while (idx !== -1) {
      violations.push({
        ruleId: 'sycophantic-phrases',
        startIndex: idx,
        endIndex: idx + phrase.length,
        matchedText: text.slice(idx, idx + phrase.length),
      })
      idx = lower.indexOf(phrase, idx + 1)
    }
  }

  // Regex for variable-form patterns. Apostrophe classes are written with a
  // literal U+2019 (right single quotation mark) plus straight quote. Editors
  // and edit tooling have silently normalized U+2019 to a straight quote here
  // before, making the classes never match curly-quote contenteditable text.
  // Verify via byte inspection after touching these lines.
  const regexPhrases = [
    /\byou[’']re\s+absolutely\s+right\b/gi,
    /\byou[’']re\s+so\s+right\b/gi,
    /\byou[’']re\s+completely\s+right\b/gi,
    /\byou[’']re\s+(?:very\s+)?insightful\b/gi,
    /\byou[’']re\s+(?:very\s+)?self-aware\b/gi,
    /\bthat[’']s\s+(?:a\s+)?(?:great|excellent|fantastic|brilliant|valid|wonderful|thoughtful|insightful)\s+(?:point|observation|question|insight)\b/gi,
    /\bthat[’']s\s+exactly\s+right\b/gi,
    /\byou[’']ve\s+really\s+thought\s+this\s+through\b/gi,
    /\bi\s+love\s+(?:that|this)\s+question\b/gi,
    // Broadened "that's a great point": subject variants, "such a", degree
    // adverbs, and a wider adjective/noun set than the exact-phrase list.
    /\b(?:that[’']s|that is|this is)\s+(?:such\s+an?|an?)\s+(?:really\s+|very\s+|truly\s+|genuinely\s+|incredibly\s+)?(?:great|excellent|fantastic|brilliant|valid|wonderful|thoughtful|insightful|astute|keen|fascinating)\s+(?:point|observation|question|insight|idea|catch)\b/gi,
    // "what a(n) [adj] [noun]" — wider than the exact-phrase list
    /\bwhat\s+an?\s+(?:great|excellent|thoughtful|wonderful|fantastic|brilliant|fascinating|astute|insightful|interesting)\s+(?:question|point|observation|idea|insight|catch)\b/gi,
    // "you raise/make/bring up a [adj] [noun]" — wider verbs and adjectives
    /\byou\s+(?:raise[ds]?|make|made|bring\s+up|brought\s+up)\s+(?:such\s+an?|an?)\s+(?:really\s+|very\s+|truly\s+)?(?:great|excellent|good|valid|fair|important|interesting|compelling|strong|solid|fascinating|astute|insightful|crucial|key|wonderful|brilliant|thoughtful)\s+(?:point|question|issue|concern|observation|distinction)\b/gi,
    // "is/are spot on" — copula anchor avoids literal spots ("a spot on the wall")
    /(?:\b(?:is|are|was|were)|[’'](?:s|re))\s+(?:absolutely\s+|completely\s+|exactly\s+|dead\s+)?spot[- ]on\b/gi,
    // "hit the nail on the head"
    /\b(?:hit|hits|hitting)\s+the\s+nail\s+(?:right\s+|squarely\s+)?on\s+the\s+head\b/gi,
    // Performed agreement: "couldn't agree more", "I completely agree"
    /\b(?:i\s+)?couldn[’']t\s+agree\s+(?:with\s+(?:you|that|this)\s+)?more\b/gi,
    /\bi\s+(?:completely|totally|wholeheartedly|absolutely|fully|100%)\s+agree\b/gi,
    // "you're asking (exactly) the right question(s)"
    /\byou(?:[’']re|\s+are)\s+asking\s+(?:exactly\s+|precisely\s+)?(?:all\s+)?the\s+right\s+questions?\b/gi,
    // Flattering attribution: "as you rightly point out", "you correctly note"
    /\byou\s+(?:rightly|correctly|astutely|aptly|wisely|perceptively|brilliantly)\s+(?:point(?:ed)?\s+out|note[ds]?|observe[ds]?|say|said|put\s+it|identif(?:y|ied)|recognize[ds]?|highlight(?:ed)?)\b/gi,
    // Instinct validation: "your instincts are spot on / right / sound"
    /\byour\s+(?:instincts?|intuition|gut)\s+(?:is|are|was|were)\s+(?:spot[- ]on|right|correct|good|sound|dead[- ]on)\b/gi,
    // Competence flattery: "you clearly understand", "you obviously know"
    /\byou\s+(?:clearly|obviously|evidently)\s+(?:understand|know|grasp|care)\b/gi,
    // Praising the reader's work: "you've done / you're doing a great job"
    /\byou(?:[’'](?:ve|re)|\s+(?:have|are))?\s+(?:done|did|doing|do)\s+an?\s+(?:great|good|fantastic|wonderful|amazing|excellent|incredible|phenomenal)\s+job\b/gi,
    /\byou\s+(?:absolutely\s+|totally\s+|really\s+)?nailed\s+it\b/gi,
    // Encouragement staples
    /\byou\s+should\s+be\s+(?:really\s+|very\s+|incredibly\s+|extremely\s+)?proud\b/gi,
    /\bgive\s+yourself\s+(?:more\s+|some\s+)?credit\b/gi,
    /\b(?:off\s+to|that[’']s)\s+a\s+(?:great|good|strong|solid|fantastic|promising)\s+start\b/gi,
    /\byou(?:[’']re|\s+are)\s+(?:really\s+)?on\s?to\s+something\b/gi,
    // Modern praise slop
    /\bchef[’']s\s+kiss\b/gi,
    /\bkudos\b/gi,
  ]
  for (const re of regexPhrases) {
    violations.push(...findAll(text, re, 'sycophantic-phrases'))
  }

  return violations
}

// ── Sycophantic word openers ─────────────────────────────────────────────────
// Single-word affirmations and evaluative praise at sentence boundaries.
// "Absolutely," and "Perfect." as openers are near-exclusively AI performing
// eagerness or grading the previous turn — not a pattern of human prose.

export function detectSycophanticWords(text: string): Violation[] {
  // Anchored at text start, line start (m flag), or after sentence-ending
  // punctuation + whitespace. Requires [,.!] immediately after so
  // "Absolutely, X" / "Absolutely." fire but "absolutely fundamental" never
  // does. The period form ("Perfect. Now...") is the one-word-sentence
  // variant of the same eager-assistant tic.
  const affirmations =
    /(?:^|(?<=[.!?]\s{1,3}))(?:Absolutely|Certainly|Exactly|Definitely|Precisely|Indeed|Of course)(?=[,.!])/gim
  // Evaluative praise graded onto whatever preceded it ("Excellent! Next...").
  // The boundary anchor keeps quoted dialogue silent: in dialogue like
  // < He grinned. "Nice catch!" > the quote character sits between the
  // punctuation and the word, so the lookbehind never matches.
  const praise =
    /(?:^|(?<=[.!?]\s{1,3}))(?:Perfect|Excellent|Brilliant|Fantastic|Wonderful|Amazing|Spot on|Well said|Well put|Well done|Great catch|Good catch|Nice catch)(?=[,.!])/gim

  const violations: Violation[] = []
  for (const re of [affirmations, praise]) {
    violations.push(...findAll(text, re, 'sycophantic-words'))
  }
  return violations
}

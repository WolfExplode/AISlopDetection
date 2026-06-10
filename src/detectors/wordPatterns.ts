import type { Violation } from '../types'

// Helper: find all case-insensitive matches of a word/phrase in text
function findAll(text: string, pattern: RegExp, ruleId: string): Violation[] {
  const violations: Violation[] = []
  let m: RegExpExecArray | null
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
  while ((m = re.exec(text)) !== null) {
    violations.push({
      ruleId,
      startIndex: m.index,
      endIndex: m.index + m[0].length,
      matchedText: m[0],
    })
  }
  return violations
}

const INTENSIFIERS = [
  'crucial', 'comprehensive',
  'arguably', 'straightforward', 'noteworthy', 'realm', 'landscape',
  'tapestry', 'multifaceted', 'nuanced', 'pivotal',
  'unprecedented', 'paradigm', 'synergy',
  'holistic', 'transformative', 'cutting-edge', 'innovative',
  // From "words to watch" list
  'enduring', 'interplay', 'intricate', 'intricacies',
  'meticulous', 'meticulously', 'valuable', 'vibrant',
  // From slopbuster/slopsquid: additional analytical prose markers
  'paramount', 'overarching', 'actionable', 'seamless', 'salient',
  'ubiquitous', 'myriad', 'aforementioned', 'quintessential',
  // vital, robust, dynamic, fundamental moved to NLP layer (context-sensitive)
]

// Multi-word phrases that are overused LLM clichés
const INTENSIFIER_PHRASES = [
  'align with',
  'testament to',
  // From slopbuster Rule 1 (significance inflation) / slopsquid academic preset
  'indelible mark',
  'key turning point',
  'setting the stage',
]

// Adjective intensifiers moved to NLP layer: flagged only in predicate position
// (after copula) or attributive before non-excluded nouns. These words have
// legitimate technical uses in specific compounds (vital signs, dynamic programming).
export const ADJECTIVE_INTENSIFIERS = [
  'vital', 'robust', 'dynamic', 'fundamental',
  // Evaluative praise adjectives: individually borderline, suspicious when stacked
  'remarkable', 'fantastic', 'powerful',
]

// Per-adjective permitted following nouns. "[word] #Noun" is suppressed when the
// noun (lowercase) appears in this list — established domain compounds where the
// word carries a specialized, non-slop meaning.
export const ADJECTIVE_PERMITTED_FOLLOWING: Record<string, string[]> = {
  vital:       ['signs', 'sign', 'organs', 'organ', 'statistics', 'records', 'record', 'capacity', 'functions', 'function', 'force', 'forces'],
  robust:      ['security', 'authentication', 'encryption'],
  dynamic:     ['programming', 'range', 'memory', 'allocation', 'dispatch', 'typing'],
  fundamental: ['theorem', 'theorems', 'rights', 'frequency', 'frequencies', 'forces', 'force', 'particles', 'particle'],
}

// Adverbs moved to NLP layer: flagged only when modifying an adjective or
// appearing sentence-initial before a comma — NOT when modifying an action verb.
export const CONTEXT_SENSITIVE_ADVERBS = ['quietly', 'deeply', 'remarkably', 'clearly']

// Verb-type intensifiers — moved to NLP detector so deletion is replaced
// with a correctly-conjugated simpler synonym (deleting a verb breaks the sentence)
export const VERB_INTENSIFIERS = [
  'leverage', 'delve', 'navigate', 'foster', 'underscore', 'resonate',
  'embark', 'streamline', 'spearhead', 'harness',
  'bolster', 'emphasize', 'enhance', 'garner',
  // From slopbuster Tier 1 / slopsquid word list
  'showcase', 'illuminate', 'crystallize',
]

const ELEVATED_REGISTER: [string, string | null][] = [
  ['utilize', 'use'],
  ['utilise', 'use'],
  ['utilization', 'use'],
  ['commence', 'start'],
  ['commencement', 'start'],
  ['facilitate', 'help'],
  ['endeavor', 'try'],
  ['endeavour', 'try'],
  ['demonstrate', 'show'],
  ['ascertain', 'find out'],
  ['ameliorate', 'improve'],
  ['elucidate', 'explain'],
  ['promulgate', 'spread'],
  ['cognizant', 'aware'],
  ['pertaining to', 'about'],
  ['in regards to', 'about'],
  ['with regards to', 'about'],
  ['with regard to', 'about'],
  ['with respect to', 'about'],
  ['in the context of', null],  // replacement is too context-dependent to automate
  ['at this juncture', 'now'],
  ['at this point in time', 'now'],
  ['going forward', 'in future'],
  ['moving forward', 'in future'],
  ['in terms of', ''],
  ['it is worth noting', ''],
  ['it should be noted', ''],
  ['one must consider', ''],
  ['in light of', 'given'],
  ['in the realm of', 'in'],
  ['due to the fact that', 'because'],
  // From slopbuster Rule 22 (filler phrases) — delete on apply
  ['notwithstanding', 'despite'],
  ['hitherto', 'until now'],
  ['heretofore', 'until now'],
  ['as a matter of fact', null],
  ['the fact of the matter is', null],
  ['for all intents and purposes', null],
  ['at its core', null],
  ['it goes without saying', null],
]

const FILLER_ADVERBS = [
  'importantly', 'essentially', 'fundamentally', 'ultimately',
  'inherently', 'particularly', 'increasingly', 'certainly',
  'undoubtedly', 'obviously', 'simply', 'basically',
  'quite', 'very', 'really', 'truly', 'genuinely',
  // quietly, deeply, remarkably, clearly moved to NLP layer (context-sensitive)
]

const METAPHOR_CRUTCHES = [
  'double-edged sword', 'tip of the iceberg', 'north star',
  'building blocks', 'elephant in the room', 'perfect storm',
  'game.changer', 'game changer', 'low.hanging fruit', 'low hanging fruit',
  'move the needle', 'think outside the box', 'at the end of the day',
  'paradigm shift', 'silver bullet', 'boiling the ocean',
  'drinking the kool.aid', 'drinking the kool aid',
  'put it on the back burner', 'circle back', 'deep dive',
  'level up', 'hit the ground running', 'move fast and break things',
  'the devil is in the details', 'on the same page',
  'reinvent the wheel', 'touch base', 'bandwidth',
  'bleeding edge', 'best of breed', 'boil down',
  // From slopbuster/slopsquid: additional clichéd frames
  'food for thought', 'the bigger picture', 'ahead of the curve',
  'writing on the wall', 'canary in the coal mine',
]

const FALSE_CONCLUSION_PHRASES = [
  'in conclusion', 'to conclude', 'in summary', 'to summarize',
  'to sum up', 'in closing', 'overall,', 'all in all',
  'at the end of the day', 'when all is said and done',
  'taking everything into account', 'taking everything into consideration',
  'all things considered', 'moving forward', 'going forward',
  // From slopbuster Rule 24 (generic positive conclusions) / Rule 6 (formulaic future prospects)
  'the future looks bright', 'exciting times ahead', 'exciting times lie ahead',
  'only time will tell', 'remains to be seen', 'poised for growth',
  'poised for success', 'continues to thrive', 'moving in the right direction',
]

const CONNECTOR_WORDS = [
  'furthermore', 'moreover', 'additionally', 'however', 'nevertheless',
  'nonetheless', 'consequently', 'therefore', 'thus', 'hence',
  'in addition', 'as a result', 'for instance', 'for example',
  'in contrast', 'on the other hand', 'on the contrary', 'that said',
  'having said that', 'with that in mind', 'it follows that',
  'interestingly', 'notably', 'significantly',
  // From slopbuster Rule 22: over-explaining transitions
  'in other words', 'to put it another way', 'that is to say',
]

const UNNECESSARY_CONTRAST_PHRASES = [
  'whereas', 'as opposed to', 'unlike', 'in contrast to',
  'contrary to', 'conversely',
]

const HEDGE_WORDS = [
  'perhaps', 'arguably', 'seemingly', 'apparently', 'ostensibly',
  'possibly', 'potentially', 'conceivably', 'presumably', 'supposedly',
  'it could be argued', 'it might be', 'it may be', 'it seems',
  'it appears', 'one might', 'some would say', 'in some ways',
  'to some extent', 'in a sense', 'sort of',
  // "kind of" only as a filler qualifier, not as a classifier ("a kind of X")
  'is kind of', 'are kind of', 'was kind of', 'were kind of',
  'feels kind of', 'seems kind of', 'sounds kind of', 'looks kind of',
]

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
      ruleId: 'overused-intensifiers',
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
  for (const word of INTENSIFIERS) {
    const re = new RegExp(`\\b${word}s?(?:-\\w+)*\\b`, 'gi')
    violations.push(...findAll(text, re, 'overused-intensifiers'))
  }
  for (const phrase of INTENSIFIER_PHRASES) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    violations.push(...findAll(text, new RegExp(`\\b${escaped}\\b`, 'gi'), 'overused-intensifiers'))
  }
  return violations
}

export function detectElevatedRegister(text: string): Violation[] {
  const violations: Violation[] = []
  for (const [elevated, replacement] of ELEVATED_REGISTER) {
    const escaped = elevated.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\b${escaped}\\b`, 'gi')
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      violations.push({
        ruleId: 'elevated-register',
        startIndex: m.index,
        endIndex: m.index + m[0].length,
        matchedText: m[0],
        suggestedChange: replacement === null ? null : (replacement || undefined),
      })
    }
  }
  return violations
}

export function detectFillerAdverbs(text: string): Violation[] {
  const violations: Violation[] = []
  for (const word of FILLER_ADVERBS) {
    const re = new RegExp(`\\b${word}\\b`, 'gi')
    violations.push(...findAll(text, re, 'filler-adverbs'))
  }
  // "rather" only as vague intensifier ("rather good") — not in "rather than"
  violations.push(...findAll(text, /\brather(?!\s+than)\b/gi, 'filler-adverbs'))
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
  for (const phrase of METAPHOR_CRUTCHES) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\./g, '[- ]?')
    const re = new RegExp(`\\b${escaped}\\b`, 'gi')
    violations.push(...findAll(text, re, 'metaphor-crutch'))
  }
  return violations
}

export function detectImportantToNote(text: string): Violation[] {
  const re = /\b(it('s| is)\s+important\s+to\s+note|it('s| is)\s+worth\s+noting|notably|note\s+that|it\s+should\s+be\s+noted)\b/gi
  return findAll(text, re, 'important-to-note')
}

export function detectBroaderImplications(text: string): Violation[] {
  const re = /\b(broader\s+implications?|wider\s+implications?|implications?\s+(for|of|on)\s+the\s+(broader|wider|larger))\b/gi
  return findAll(text, re, 'broader-implications')
}

export function detectFalseConclusion(text: string): Violation[] {
  const violations: Violation[] = []
  for (const phrase of FALSE_CONCLUSION_PHRASES) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Flag when used to open a sentence/paragraph
    const re = new RegExp(`(^|[.!?]\\s+|\\n\\s*)${escaped}\\b`, 'gi')
    violations.push(...findAll(text, re, 'false-conclusion'))
  }
  return violations
}

export function detectConnectorAddiction(text: string): Violation[] {
  // Flag connectors at start of paragraphs/sentences.
  // Highlight span = just the connector phrase ("For instance,").
  // Apply span = boundary + connector + next char, so Apply can drop the connector
  // and capitalize the following word without a separate cleanup step.
  const violations: Violation[] = []
  for (const word of CONNECTOR_WORDS) {
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
  for (const phrase of UNNECESSARY_CONTRAST_PHRASES) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\b${escaped}\\b`, 'gi')
    violations.push(...findAll(text, re, 'unnecessary-contrast'))
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
      ruleId: 'em-dash-pivot',
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

  // Two-sentence variant: "It doesn't X. It does Y."
  // Same subject opens both sentences; first negates, second affirms.
  const NEG = `(?:doesn[\u2019']?t|isn[\u2019']?t|won[\u2019']?t|can[\u2019']?t|don[\u2019']?t|does\\s+not|is\\s+not|was\\s+not|did\\s+not|will\\s+not)`
  const twoSentenceRe = new RegExp(
    `(([A-Z][\\w\u2019']*)\\s+${NEG}\\b[^.!?\\n]{5,120}[.!?])[ \\t]+(\\2\\b[^.!?\\n]{5,120}[.!?])`,
    'g'
  )
  while ((m = twoSentenceRe.exec(text)) !== null) {
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

const COMMA_QUALIFIERS = [
  'of course', 'to be fair', 'it should be said', 'needless to say',
  'in fairness', 'admittedly', 'to be sure', 'it must be said',
  'after all', 'as we know', 'as everyone knows',
]

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
    for (let i = 0; i < sentences.length - 1; i++) {
      const s = sentences[i].text.trim()
      const next = sentences[i + 1].text.trim()
      // The answer must be short — a long sentence after a question is just the
      // next thought, not the LLM pat-answer tell ("What does this mean? It means X.")
      if (s.endsWith('?') && !next.endsWith('?') && next.length <= 120) {
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

// Detect hedge stacks: sentences with 2+ hedge words
export function detectHedgeStack(text: string): Violation[] {
  const sentences = splitSentences(text)
  const violations: Violation[] = []
  let offset = 0

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase()
    const found: string[] = []
    for (const hedge of HEDGE_WORDS) {
      if (lower.includes(hedge)) found.push(hedge)
    }
    // Also check modal verbs
    // Only genuinely hedging modals; "should"/"would" are normative/conditional, not hedges
    const modals = ['might', 'could', 'may']
    for (const m of modals) {
      if (new RegExp(`\\b${m}\\b`).test(lower)) found.push(m)
    }
    if (found.length >= 2) {
      violations.push({
        ruleId: 'hedge-stack',
        startIndex: offset,
        endIndex: offset + sentence.length,
        matchedText: sentence,
        explanation: `Contains ${found.length} hedges: ${found.slice(0, 4).join(', ')}`,
      })
    }
    offset += sentence.length
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
    let i = 0
    while (i < sentences.length) {
      if (wordCount(sentences[i]) <= 8) {
        let j = i + 1
        while (j < sentences.length && wordCount(sentences[j]) <= 8) j++
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

  // Bulleted lists — highlight only the first bullet marker character
  const bulletRe = /(?:^|\n)(\s*[-*•]\s+[^\n]+)(\n\s*[-*•]\s+[^\n]+){2,}/gm
  const re2 = new RegExp(bulletRe.source, 'gm')
  while ((m = re2.exec(text)) !== null) {
    const items = m[0].trim().split('\n').filter(l => /^\s*[-*•]\s/.test(l))
    if (MAGIC_COUNTS.has(items.length)) {
      const markerMatch = /[-*•]/.exec(m[0])
      const markerOffset = markerMatch ? markerMatch.index : 0
      const markerStart = m.index + markerOffset
      violations.push({
        ruleId: 'listicle-instinct',
        startIndex: markerStart,
        endIndex: markerStart + 1,
        matchedText: markerMatch ? markerMatch[0] : m[0][0],
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

function splitSentences(text: string): string[] {
  // Simple sentence splitter - preserves whitespace/punctuation
  const results: string[] = []
  let last = 0
  const re = /[.!?]+\s+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    results.push(text.slice(last, m.index + m[0].length))
    last = m.index + m[0].length
  }
  if (last < text.length) results.push(text.slice(last))
  return results.filter(s => s.trim().length > 0)
}

// ── New detectors ─────────────────────────────────────────────────────────

export function detectServesAs(text: string): Violation[] {
  const re = /\b(serves|stands|acts|functions|operates)\s+as\b/gi
  return findAll(text, re, 'serves-as')
}

export function detectNegationCountdown(text: string): Violation[] {
  const violations: Violation[] = []
  const sentences = splitSentences(text)
  let offset = 0
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
  return violations
}

// Function words too generic to flag as anaphora — anything else repeated 3+ times is suspicious
const ANAPHORA_SINGLE_WORD_SKIP = new Set([
  'a', 'an', 'the',
  'in', 'on', 'at', 'to', 'of', 'for', 'with', 'by', 'from',
  'is', 'are', 'was', 'were',
])

export function detectAnaphoraAbuse(text: string): Violation[] {
  const violations: Violation[] = []
  const sentences = splitSentences(text)
  let offset = 0
  const offsets: number[] = []
  for (const s of sentences) { offsets.push(offset); offset += s.length }

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

  function flagRun(i: number, j: number, opener: string, wordCount: number) {
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
    // Two-word opener (more specific — try first)
    const two = twoWordOpener(sentences[i])
    if (two) {
      let j = i + 1
      while (j < sentences.length && twoWordOpener(sentences[j]) === two) j++
      if (j - i >= 3) { flagRun(i, j, two, 2); i = j; continue }
    }
    // Single-word opener from curated slop-indicative list
    const one = singleWordOpener(sentences[i])
    if (one) {
      let j = i + 1
      while (j < sentences.length && singleWordOpener(sentences[j]) === one) j++
      if (j - i >= 3) { flagRun(i, j, one, 1); i = j; continue }
    }
    i++
  }
  return violations
}

export function detectGerundLitany(text: string): Violation[] {
  const violations: Violation[] = []
  const sentences = splitSentences(text)
  let offset = 0
  const offsets: number[] = []
  for (const s of sentences) { offsets.push(offset); offset += s.length }

  const isGerund = (s: string) => {
    const trimmed = s.trim()
    const words = trimmed.split(/\s+/).filter(Boolean)
    return words.length <= 8 && /^[A-Z][a-z]+ing\b/.test(trimmed)
  }

  let i = 0
  while (i < sentences.length) {
    if (isGerund(sentences[i])) {
      let j = i + 1
      while (j < sentences.length && isGerund(sentences[j])) j++
      if (j - i >= 2) {
        const start = offsets[i]
        const end = offsets[j - 1] + sentences[j - 1].length
        violations.push({ ruleId: 'gerund-litany', startIndex: start, endIndex: end, matchedText: text.slice(start, end) })
        i = j; continue
      }
    }
    i++
  }
  return violations
}

const HERES_THE_KICKER_PHRASES = [
  "here's the kicker",
  "here's the thing",
  "here's where it gets interesting",
  "here's what most people miss",
  "here's the real",
]

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

const PEDAGOGICAL_PHRASES = [
  "let's break this down",
  "let's unpack",
  "let's explore",
  "let's dive in",
  "let's examine",
  "think of it as",
  "think of it like",
  "think of this as",
  // From slopbuster text-communication: additional teacher-mode openers
  "let's consider",
  "let's walk through",
  "let's look at",
]

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

const VAGUE_ATTRIBUTION_PHRASES = [
  'experts argue', 'experts say', 'experts suggest', 'experts believe', 'experts note',
  'industry analysts', 'observers have noted', 'observers have cited', 'observers argue',
  'analysts note', 'analysts suggest', 'many experts', 'several experts', 'some experts',
  'according to experts', 'studies show', 'research suggests',
  // From slopbuster Rule 2 (notability name-dropping) / Rule 5 (vague attributions)
  'industry reports', 'it is widely believed', 'widely recognized',
  'many argue', 'some critics argue', 'some argue', 'widely regarded',
]

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
  // Match the full pattern to confirm it's bold-first, but highlight only the bullet marker
  const re = /^([ \t]*)([-*•])([ \t]+\*\*[^*\n]+\*\*)/gm
  const violations: Violation[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const bulletStart = m.index + m[1].length
    violations.push({
      ruleId: 'bold-first-bullets',
      startIndex: bulletStart,
      endIndex: bulletStart + 1,
      matchedText: m[2],
    })
  }
  return violations
}

export function detectUnicodeArrows(text: string): Violation[] {
  return findAll(text, /→/g, 'unicode-arrows')
}

export function detectDespiteChallenges(text: string): Violation[] {
  const re = /\bDespite (these|its|the|their|all|such)\b[^.!?]{0,80}\b(challenge|obstacle|limitation|difficult|drawback|shortcoming)/gi
  return findAll(text, re, 'despite-challenges')
}

export function detectConceptLabel(text: string): Violation[] {
  const re = /\b[a-z]+\s+(paradox|trap|creep|vacuum|inversion|chasm)\b/gi
  return findAll(text, re, 'concept-label')
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
  return violations
}

export function detectSuperficialAnalysis(text: string): Violation[] {
  const re = /,\s+(highlighting|underscoring|showcasing|reflecting|cementing|embodying|encapsulating)\s+(its|the|their|this)\s+(importance|role|significance|legacy|power|spirit|nature|value)\b/gi
  return findAll(text, re, 'superficial-analysis')
}

// ── Exemplar clichés ──────────────────────────────────────────────────────────
// From slopbuster + universal AI tell: labelling something as proof without arguing why.
// "A textbook example of X" performs analysis rather than doing it.

const EXEMPLAR_CLICHE_PHRASES = [
  'textbook example',
  'classic example',
  'prime example',
  'perfect example',
  'quintessential example',
  'poster child',
  'hallmark of',
  'case in point',
]

export function detectExemplarCliche(text: string): Violation[] {
  const violations: Violation[] = []
  const lower = text.toLowerCase()
  for (const phrase of EXEMPLAR_CLICHE_PHRASES) {
    let idx = lower.indexOf(phrase)
    while (idx !== -1) {
      violations.push({
        ruleId: 'exemplar-cliche',
        startIndex: idx,
        endIndex: idx + phrase.length,
        matchedText: text.slice(idx, idx + phrase.length),
      })
      idx = lower.indexOf(phrase, idx + 1)
    }
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
    'i hope this helps',
    'feel free to',
    'let me know if you',
    'happy to help',
    'is there anything else',
    'great question',
    'excellent question',
    'i hope that helps',
    'hope this helps',
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
  ]
  for (const re of regexPhrases) {
    violations.push(...findAll(text, re, 'chatbot-artifact'))
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
    /\b(?:plays?|played|playing)\s+a\s+(?:key|crucial|vital|pivotal|central|significant|important)\s+role\b/gi,
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

  return violations
}

// \u2500\u2500 Stacked intensifiers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Evaluative praise adjectives and certainty amplifiers that are individually
// borderline but strongly signal AI sycophantic amplification when 3+ appear
// within a 3-sentence window.

const EVALUATIVE_INTENSIFIERS = [
  'remarkable', 'fantastic', 'powerful', 'extraordinary', 'incredible',
  'amazing', 'profound', 'compelling', 'striking', 'brilliant', 'stunning',
  'exceptional', 'groundbreaking', 'inspiring', 'masterful', 'impressive',
  'breathtaking', 'fascinating', 'outstanding', 'impactful', 'insightful',
  'invaluable', 'superb', 'phenomenal', 'marvelous', 'wonderful', 'magnificent',
  'undoubtedly', 'unquestionably', 'unmistakably',
]

const EVALUATIVE_RE = new RegExp(`\\b(${EVALUATIVE_INTENSIFIERS.join('|')})\\b`, 'gi')

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

    // Find all individual word matches per sentence: {word, offsetInPara}
    type Hit = { word: string; offsetInPara: number; length: number }
    const hitsPerSentence: Hit[][] = sentences.map((s, si) => {
      const hits: Hit[] = []
      const re = new RegExp(EVALUATIVE_RE.source, 'gi')
      let m: RegExpExecArray | null
      while ((m = re.exec(s)) !== null) {
        hits.push({ word: m[0].toLowerCase(), offsetInPara: sentenceOffsets[si] + m.index, length: m[0].length })
      }
      return hits
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
        const explanation = `Stacked with ${windowHits.length} evaluative intensifiers: ${unique.slice(0, 4).join(', ')}`
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

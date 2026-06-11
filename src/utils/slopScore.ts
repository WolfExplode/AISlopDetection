import type { Violation, ViolationCategory } from '../types'
import { RULES_BY_ID } from '../rules'
import type { WordfreqEn } from './wordfreq'

export type SlopRating = 'Clean' | 'Moderate' | 'Heavy' | 'Slop'

export interface RuleBreakdown {
  ruleId: string
  ruleName: string
  category: ViolationCategory
  ruleWeight: number
  totalWeight: number
  freeCount: number
  excessWeight: number
  scoringMode: string
  contribution: number
}

export interface SlopScore {
  score: number       // 0–100
  rating: SlopRating
  weightedHits: number
  breakdown: RuleBreakdown[]
}

// Full weight for excess instances 1–3, then decay by 1/sqrt(i-2) for i > 3.
// excessCount may be fractional (e.g. 0.5) when partially past the freeRate allowance.
function applyDiminishing(weight: number, excessCount: number): number {
  let total = 0
  const full = Math.floor(excessCount)
  const frac = excessCount - full
  for (let i = 1; i <= full; i++) {
    total += weight * (i <= 3 ? 1 : 1 / Math.sqrt(i - 2))
  }
  if (frac > 0) {
    const next = full + 1
    total += weight * frac * (next <= 3 ? 1 : 1 / Math.sqrt(next - 2))
  }
  return total
}

// Geometric decay: each successive instance contributes factor× the previous.
// Sum of geometric series: ruleWeight × avgInstanceWeight × (1 − factor^count) / (1 − factor).
// Caps naturally at ruleWeight × avgInstanceWeight / (1 − factor) as count → ∞.
function applyGeometricDiminishing(
  ruleWeight: number,
  avgInstanceWeight: number,
  count: number,
  factor: number,
): number {
  if (count <= 0) return 0
  return ruleWeight * avgInstanceWeight * (1 - Math.pow(factor, count)) / (1 - factor)
}

/**
 * Count violations per rule, treating grouped violations (same ruleId+groupKey)
 * as a single logical incident regardless of how many highlight spans they produce.
 */
export function countViolationsByRule(
  violations: Violation[],
  hiddenRules?: Set<string>,
): Map<string, number> {
  const countByRule = new Map<string, number>()
  const seenGroups = new Set<string>()
  for (const v of violations) {
    if (hiddenRules?.has(v.ruleId)) continue
    if (v.groupKey) {
      const id = `${v.ruleId}:${v.groupKey}`
      if (seenGroups.has(id)) continue
      seenGroups.add(id)
    }
    countByRule.set(v.ruleId, (countByRule.get(v.ruleId) ?? 0) + 1)
  }
  return countByRule
}

export function computeSlopScore(
  violations: Violation[],
  wordCount: number,
  hiddenRules: Set<string>,
): SlopScore {
  if (wordCount === 0) return { score: 0, rating: 'Clean', weightedHits: 0, breakdown: [] }

  // Sum each rule's instanceWeights into a per-rule total, and count instances.
  // Grouped violations (same ruleId+groupKey) are one logical incident; their
  // contribution is the average of the individual instanceWeights in the group.
  const weightByRule = new Map<string, number>()
  const countByRule  = new Map<string, number>()
  const groupData = new Map<string, { ruleId: string; weights: number[] }>()

  for (const v of violations) {
    if (hiddenRules.has(v.ruleId)) continue
    if (v.groupKey) {
      const key = `${v.ruleId}::${v.groupKey}`
      const entry = groupData.get(key) ?? { ruleId: v.ruleId, weights: [] }
      entry.weights.push(v.instanceWeight ?? 1.0)
      groupData.set(key, entry)
    } else {
      weightByRule.set(v.ruleId, (weightByRule.get(v.ruleId) ?? 0) + (v.instanceWeight ?? 1.0))
      countByRule.set(v.ruleId, (countByRule.get(v.ruleId) ?? 0) + 1)
    }
  }

  // Fold each group in as a single incident with average word weight
  for (const { ruleId, weights } of groupData.values()) {
    const avg = weights.reduce((a, b) => a + b, 0) / weights.length
    weightByRule.set(ruleId, (weightByRule.get(ruleId) ?? 0) + avg)
    countByRule.set(ruleId, (countByRule.get(ruleId) ?? 0) + 1)
  }

  let weightedHits = 0
  const breakdown: RuleBreakdown[] = []

  for (const [ruleId, totalWeight] of weightByRule) {
    const rule = RULES_BY_ID[ruleId]
    if (!rule) continue
    const ruleWeight = rule.ruleWeight

    const freeCount = (wordCount / 1000) * rule.freeRate
    const excessWeight = Math.max(0, totalWeight - freeCount)

    let contribution: number
    if (rule.scoringMode === 'diminishing' && rule.diminishingFactor !== undefined) {
      const count = countByRule.get(ruleId) ?? 0
      const avgInstanceWeight = count > 0 ? totalWeight / count : 0
      contribution = applyGeometricDiminishing(ruleWeight, avgInstanceWeight, count, rule.diminishingFactor)
    } else if (rule.scoringMode === 'diminishing') {
      contribution = applyDiminishing(ruleWeight, excessWeight)
    } else {
      contribution = excessWeight * ruleWeight
    }

    weightedHits += contribution
    breakdown.push({
      ruleId,
      ruleName: rule.name,
      category: rule.category,
      ruleWeight,
      totalWeight,
      freeCount,
      excessWeight,
      scoringMode: rule.scoringMode,
      contribution,
    })
  }

  breakdown.sort((a, b) => b.contribution - a.contribution)

  const score = Math.min(100, Math.round((weightedHits / wordCount) * 500))

  let rating: SlopRating
  if (score <= 29) rating = 'Clean'
  else if (score <= 50) rating = 'Moderate'
  else if (score <= 70) rating = 'Heavy'
  else rating = 'Slop'

  return { score, rating, weightedHits, breakdown }
}

export interface WritingMetrics {
  fkGrade: number           // Flesch-Kincaid grade level
  avgSentenceLength: number // words per sentence
  sentenceLengthCV: number  // coefficient of variation of sentence lengths; >0.3 = varied rhythm
  avgParagraphLength: number // words per paragraph
  dialogueFrequency: number  // quote pairs per 1000 chars
}

function countSyllables(word: string): number {
  word = word.toLowerCase()
  if (word.length <= 3) return 1
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
  word = word.replace(/^y/, '')
  const m = word.match(/[aeiouy]{1,2}/g)
  return m ? m.length : 1
}

export function computeWritingMetrics(text: string): WritingMetrics | null {
  const words = text.match(/\b\w+\b/g) || []
  if (words.length < 20) return null

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)
  const quotes = (text.match(/["""]/g) || []).length

  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0)
  const avgSPW = totalSyllables / words.length
  const avgWPS = sentences.length > 0 ? words.length / sentences.length : words.length

  // Coefficient of variation of sentence lengths (stdDev / mean).
  // CV > 0.3 = naturally varied rhythm; < 0.2 = suspiciously uniform (slopbuster scoring).
  const sentenceLengths = sentences.map(s => (s.match(/\b\w+\b/g) || []).length)
  const mean = avgWPS
  const sentenceLengthCV = sentenceLengths.length >= 2
    ? Math.sqrt(sentenceLengths.reduce((sum, l) => sum + (l - mean) ** 2, 0) / sentenceLengths.length) / mean
    : 0

  return {
    fkGrade: Math.max(0, 0.39 * avgWPS + 11.8 * avgSPW - 15.59),
    avgSentenceLength: avgWPS,
    sentenceLengthCV,
    avgParagraphLength: paragraphs.length > 0 ? words.length / paragraphs.length : words.length,
    dialogueFrequency: text.length > 0 ? (quotes / 2 / text.length) * 1000 : 0,
  }
}

export interface MattrResult {
  value: number       // 0–1
  isFullTTR: boolean  // true when text is shorter than the window (no sliding)
  tokenCount: number
}

/**
 * Moving Average Type-Token Ratio (MATTR-500).
 * Slides a 500-word window across the token stream and averages the TTR per window.
 * Falls back to full-text TTR for texts shorter than the window.
 * Returns null when the text is too short to be meaningful (< 20 words).
 */
export function computeMATTR(text: string, windowSize = 500): MattrResult | null {
  const tokens = text.toLowerCase().match(/\b[a-z']+\b/g)
  if (!tokens || tokens.length < 20) return null

  if (tokens.length < windowSize) {
    return {
      value: new Set(tokens).size / tokens.length,
      isFullTTR: true,
      tokenCount: tokens.length,
    }
  }

  // O(n) sliding window: maintain a frequency map and unique count
  const freq = new Map<string, number>()
  let uniqueCount = 0
  let sum = 0

  for (let i = 0; i < windowSize; i++) {
    const t = tokens[i]
    const prev = freq.get(t) ?? 0
    if (prev === 0) uniqueCount++
    freq.set(t, prev + 1)
  }
  sum += uniqueCount / windowSize

  for (let i = 1; i <= tokens.length - windowSize; i++) {
    const out = tokens[i - 1]
    const outCount = freq.get(out)!
    if (outCount === 1) { uniqueCount--; freq.delete(out) }
    else freq.set(out, outCount - 1)

    const inp = tokens[i + windowSize - 1]
    const inCount = freq.get(inp) ?? 0
    if (inCount === 0) uniqueCount++
    freq.set(inp, inCount + 1)

    sum += uniqueCount / windowSize
  }

  const windows = tokens.length - windowSize + 1
  return { value: sum / windows, isFullTTR: false, tokenCount: tokens.length }
}

export const RATING_COLOR: Record<SlopRating, string> = {
  Clean: '#16a34a',
  Moderate: '#ca8a04',
  Heavy: '#ea580c',
  Slop: '#dc2626',
}

// ── Human Baseline Word Overuse ───────────────────────────────────────────────

export interface OverusedWord {
  word: string
  count: number
  ratio: number  // observed rate / expected rate from human corpus
  zipf: number   // expected Zipf score (higher = more common in English)
}

// NLTK English stopwords — same set as eqbench metrics.js
const STOPWORDS = new Set([
  'i','me','my','myself','we','our','ours','ourselves','you','your','yours',
  'yourself','yourselves','he','him','his','himself','she','her','hers','herself',
  'it','its','itself','they','them','their','theirs','themselves','what','which',
  'who','whom','this','that','these','those','am','is','are','was','were','be',
  'been','being','have','has','had','having','do','does','did','doing','a','an',
  'the','and','but','if','or','because','as','until','while','of','at','by','for',
  'with','about','against','between','into','through','during','before','after',
  'above','below','to','from','up','down','in','out','on','off','over','under',
  'again','further','then','once','here','there','when','where','why','how','all',
  'any','both','each','few','more','most','other','some','such','no','nor','not',
  'only','own','same','so','than','too','very','s','t','can','will','just','don',
  'should','now','said','also','like','one','would','could','even','much','back',
  'well','still','way','get','got','go','went','come','came','see','saw','know',
  'knew','take','took','make','made','think','thought','look','looked','want',
  'wanted','tell','told','ask','asked','seem','seemed','feel','felt','try','tried',
  'leave','left','put','keep','kept','let','begin','began','show','showed','hear',
  'heard','play','played','run','ran','move','moved','live','lived','believe',
  'hold','held','bring','brought','happen','happened','write','wrote','provide',
  'sit','sat','stand','stood','lose','lost','pay','paid','meet','met','include',
  'continue','set','turn','turned','call','called','people','time','year','day',
  'man','woman','child','world','life','hand','part','place','case','week','company',
  'system','program','question','work','government','number','night','point','home',
  'water','room','mother','area','money','story','fact','month','lot','right','study',
  'book','eye','job','word','business','issue','side','kind','head','house','service',
  'friend','father','power','hour','game','line','end','member','city','community',
  'name','president','team','minute','idea','body','information','back','parent',
  'face','others','level','office','door','health','person','art','war','history',
  'party','result','change','morning','reason','research','girl','guy','moment',
  'air','teacher','force','education','never','always','away','off','often','maybe',
])

/**
 * Compute which content words in the text are most over-represented
 * relative to their expected frequency in general English (from wordfreq).
 *
 * ratio = (observed word count / total words) / wordfreq.frequency(word)
 *
 * A ratio of 10 means the word appears 10× more often than expected.
 * Requires ≥50 words and a loaded WordfreqEn instance.
 */
export function computeWordOveruse(
  text: string,
  wf: WordfreqEn,
  topK = 8,
): OverusedWord[] {
  const tokens = text.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? []
  const totalWords = tokens.length
  if (totalWords < 50) return []

  const counts = new Map<string, number>()
  for (const t of tokens) {
    if (STOPWORDS.has(t)) continue
    counts.set(t, (counts.get(t) ?? 0) + 1)
  }

  const results: OverusedWord[] = []
  for (const [word, count] of counts) {
    // Require at least 2 occurrences, more for short texts
    const minCount = totalWords < 200 ? 2 : 3
    if (count < minCount) continue

    const zipf = wf.zipfFrequency(word)
    // Skip unknown words (zipf=0) and ultra-rare terms (zipf<1.5) — likely proper nouns/jargon
    if (zipf < 1.5) continue

    const expectedRate = wf.frequency(word)
    if (expectedRate === 0) continue

    const observedRate = count / totalWords
    const ratio = observedRate / expectedRate
    // Only surface meaningful overuse (at least 3× expected)
    if (ratio < 3) continue

    results.push({ word, count, ratio, zipf })
  }

  return results.sort((a, b) => b.ratio - a.ratio).slice(0, topK)
}

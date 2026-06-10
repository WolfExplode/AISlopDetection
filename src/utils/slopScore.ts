import type { Violation, ViolationCategory } from '../types'
import { RULES_BY_ID } from '../rules'
import { CATEGORY_WEIGHT } from '../scoring.config'

export { CATEGORY_WEIGHT }

export type SlopRating = 'Clean' | 'Moderate' | 'Heavy' | 'Slop'

export interface RuleBreakdown {
  ruleId: string
  ruleName: string
  category: ViolationCategory
  catWeight: number
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

  // Sum per-violation weights per rule.
  // Grouped violations (same ruleId+groupKey) are one logical incident; their
  // weight contribution is the average of the individual word weights in the group.
  const weightByRule = new Map<string, number>()
  const groupData = new Map<string, { ruleId: string; weights: number[] }>()

  for (const v of violations) {
    if (hiddenRules.has(v.ruleId)) continue
    if (v.groupKey) {
      const key = `${v.ruleId}::${v.groupKey}`
      const entry = groupData.get(key) ?? { ruleId: v.ruleId, weights: [] }
      entry.weights.push(v.weight ?? 1.0)
      groupData.set(key, entry)
    } else {
      weightByRule.set(v.ruleId, (weightByRule.get(v.ruleId) ?? 0) + (v.weight ?? 1.0))
    }
  }

  // Fold each group in as a single incident with average word weight
  for (const { ruleId, weights } of groupData.values()) {
    const avg = weights.reduce((a, b) => a + b, 0) / weights.length
    weightByRule.set(ruleId, (weightByRule.get(ruleId) ?? 0) + avg)
  }

  let weightedHits = 0
  const breakdown: RuleBreakdown[] = []

  for (const [ruleId, totalWeight] of weightByRule) {
    const rule = RULES_BY_ID[ruleId]
    if (!rule) continue
    const catWeight = CATEGORY_WEIGHT[rule.category]

    const freeCount = (wordCount / 1000) * rule.freeRate
    const excessWeight = Math.max(0, totalWeight - freeCount)

    let contribution: number
    if (rule.scoringMode === 'diminishing') {
      contribution = applyDiminishing(catWeight, excessWeight)
    } else {
      contribution = excessWeight * catWeight
    }

    weightedHits += contribution
    breakdown.push({
      ruleId,
      ruleName: rule.name,
      category: rule.category,
      catWeight,
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
  Moderate: '#d97706',
  Heavy: '#dc2626',
  Slop: '#7c3aed',
}

import type { Violation, ViolationCategory } from '../types'
import { RULES_BY_ID } from '../rules'

const CATEGORY_WEIGHT: Record<ViolationCategory, number> = {
  'word-choice': 1,
  'sentence-structure': 2,
  'rhetorical': 2,
  'framing': 2,
  'structural': 3,
}

export type SlopRating = 'Clean' | 'Moderate' | 'Heavy' | 'Slop'

export interface SlopScore {
  score: number       // 0–100
  rating: SlopRating
  weightedHits: number
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
  if (wordCount === 0) return { score: 0, rating: 'Clean', weightedHits: 0 }

  const countByRule = countViolationsByRule(violations, hiddenRules)

  let weightedHits = 0
  for (const [ruleId, count] of countByRule) {
    const rule = RULES_BY_ID[ruleId]
    if (!rule) continue
    const weight = CATEGORY_WEIGHT[rule.category]

    // How many instances are "free" at this text length
    const freeCount = (wordCount / 1000) * rule.freeRate
    const excessCount = Math.max(0, count - freeCount)

    if (rule.scoringMode === 'diminishing') {
      weightedHits += applyDiminishing(weight, excessCount)
    } else {
      // 'linear' (freeRate always 0) and 'threshold' both apply full weight per excess instance
      weightedHits += excessCount * weight
    }
  }

  const score = Math.min(100, Math.round((weightedHits / wordCount) * 500))

  let rating: SlopRating
  if (score <= 29) rating = 'Clean'
  else if (score <= 50) rating = 'Moderate'
  else if (score <= 70) rating = 'Heavy'
  else rating = 'Slop'

  return { score, rating, weightedHits }
}

export const RATING_COLOR: Record<SlopRating, string> = {
  Clean: '#16a34a',
  Moderate: '#d97706',
  Heavy: '#dc2626',
  Slop: '#7c3aed',
}

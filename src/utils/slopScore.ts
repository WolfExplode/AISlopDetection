import type { Violation, ViolationCategory } from '../types'
import { RULES } from '../rules'

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

const ruleCategory = new Map(RULES.map(r => [r.id, r.category]))

export function computeSlopScore(
  violations: Violation[],
  wordCount: number,
  hiddenRules: Set<string>,
): SlopScore {
  if (wordCount === 0) return { score: 0, rating: 'Clean', weightedHits: 0 }

  let weightedHits = 0
  for (const v of violations) {
    if (hiddenRules.has(v.ruleId)) continue
    const cat = ruleCategory.get(v.ruleId) ?? 'word-choice'
    weightedHits += CATEGORY_WEIGHT[cat]
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

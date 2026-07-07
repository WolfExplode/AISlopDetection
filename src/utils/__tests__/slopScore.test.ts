import { describe, it, expect } from 'vitest'
import { computeSlopScore } from '../slopScore'
import type { Violation } from '../../types'

// em-dash-overuse: scoringMode 'diminishing', freeRate 2.0, diminishingFactor 0.93
function emDashViolations(n: number): Violation[] {
  return Array.from({ length: n }, (_, i) => ({
    ruleId: 'em-dash-overuse',
    startIndex: i * 10,
    endIndex: i * 10 + 1,
    matchedText: '—',
  })) as Violation[]
}

describe('computeSlopScore geometric diminishing + freeRate', () => {
  it('gives zero contribution when hits are within the free allowance', () => {
    // 2000 words × freeRate 2.0 / 1000 = 4 free instances
    const { breakdown } = computeSlopScore(emDashViolations(3), 2000, new Set())
    const row = breakdown.find(b => b.ruleId === 'em-dash-overuse')
    expect(row).toBeDefined()
    expect(row!.contribution).toBe(0)
  })

  it('only scores instances past the free allowance', () => {
    // 5 hits, 4 free → geometric sum over 1 excess instance
    const withAllowance = computeSlopScore(emDashViolations(5), 2000, new Set())
      .breakdown.find(b => b.ruleId === 'em-dash-overuse')!
    // Same 5 hits in a short doc (nearly no allowance) must contribute more
    const withoutAllowance = computeSlopScore(emDashViolations(5), 100, new Set())
      .breakdown.find(b => b.ruleId === 'em-dash-overuse')!
    expect(withAllowance.contribution).toBeGreaterThan(0)
    expect(withoutAllowance.contribution).toBeGreaterThan(withAllowance.contribution)
  })

  it('handles a fractional excess count smoothly', () => {
    // 750 words → 1.5 free; 2 hits → 0.5 excess instances
    const row = computeSlopScore(emDashViolations(2), 750, new Set())
      .breakdown.find(b => b.ruleId === 'em-dash-overuse')!
    const full = computeSlopScore(emDashViolations(2), 100, new Set())
      .breakdown.find(b => b.ruleId === 'em-dash-overuse')!
    expect(row.contribution).toBeGreaterThan(0)
    expect(row.contribution).toBeLessThan(full.contribution)
  })
})

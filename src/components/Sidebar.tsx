import { useState } from 'react'
import type { Violation, ViolationCategory } from '../types'
import { RULES } from '../rules'
import { computeSlopScore, RATING_COLOR } from '../utils/slopScore'

interface Props {
  violations: Violation[]
  hiddenRules: Set<string>
  onToggleRule: (ruleId: string) => void
  onRuleHover: (ruleId: string | null) => void
  wordCount: number
  hasApiKey: boolean
  llmStatus: 'idle' | 'loading' | 'done' | 'stale' | 'error'
}

const CATEGORY_LABELS: Record<ViolationCategory, string> = {
  'word-choice': 'Word Choice',
  'sentence-structure': 'Sentence Structure',
  'rhetorical': 'Rhetorical Patterns',
  'structural': 'Structural Tells',
  'framing': 'Framing Tells',
}

const CATEGORY_ORDER: ViolationCategory[] = [
  'sentence-structure', 'word-choice', 'rhetorical', 'framing', 'structural',
]

export default function Sidebar({ violations, hiddenRules, onToggleRule, onRuleHover, wordCount, hasApiKey, llmStatus }: Props) {
  const countByRule = new Map<string, number>()
  for (const v of violations) {
    countByRule.set(v.ruleId, (countByRule.get(v.ruleId) ?? 0) + 1)
  }

  const totalHits = violations.filter(v => !hiddenRules.has(v.ruleId)).length
  const { score, rating } = computeSlopScore(violations, wordCount, hiddenRules)
  const scoreColor = RATING_COLOR[rating]
  const [showScoreInfo, setShowScoreInfo] = useState(false)

  // Group rules by category, only show rules with hits (or LLM rules if unlocked)
  const byCategory = new Map<ViolationCategory, typeof RULES>()
  for (const rule of RULES) {
    const count = countByRule.get(rule.id) ?? 0
    if (rule.requiresLLM && !hasApiKey && count === 0) continue
    if (count === 0) continue
    if (!byCategory.has(rule.category)) byCategory.set(rule.category, [])
    byCategory.get(rule.category)!.push(rule)
  }

  return (
    <div className="violations-sidebar" style={{
      width: '260px',
      flexShrink: 0,
      borderLeft: '1px solid #e0e0e0',
      background: '#fff',
      overflowY: 'auto',
      flexDirection: 'column',
    }}>
      {/* Stats header */}
      <div style={{ padding: '20px 20px 0' }}>
        {/* Slop score */}
        {wordCount > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '32px', fontWeight: '700', color: scoreColor, fontFamily: 'monospace', lineHeight: 1 }}>
                {score}
              </span>
              <span style={{ fontSize: '16px', fontWeight: '600', color: scoreColor, fontFamily: 'sans-serif' }}>
                / 100
              </span>
              <span style={{
                fontSize: '11px', fontWeight: '700', fontFamily: 'sans-serif',
                color: '#fff', background: scoreColor, borderRadius: '4px',
                padding: '2px 6px', letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>
                {rating}
              </span>
            </div>
            {/* Score bar */}
            <div style={{ marginTop: '6px', height: '4px', background: '#eee', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${score}%`,
                background: scoreColor, borderRadius: '2px',
                transition: 'width 0.3s ease, background 0.3s ease',
              }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', color: '#aaa', fontFamily: 'sans-serif' }}>Slop score</span>
              <button
                onClick={() => setShowScoreInfo(v => !v)}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '14px', height: '14px', borderRadius: '50%',
                  border: '1px solid #ccc', background: 'transparent',
                  fontSize: '9px', fontWeight: '700', color: '#aaa',
                  cursor: 'default', padding: 0, lineHeight: 1,
                }}
              >
                ?
              </button>
            </div>
            {showScoreInfo && (
              <div style={{
                marginTop: '8px', padding: '10px 12px',
                background: '#f9f9f9', border: '1px solid #e8e8e8',
                borderRadius: '6px', fontSize: '11px', color: '#555',
                fontFamily: 'sans-serif', lineHeight: '1.6',
              }}>
                <strong style={{ display: 'block', marginBottom: '5px', color: '#333' }}>How it's calculated</strong>
                Each detected pattern is weighted by category, then divided by word count and scaled to 0–100.
                <div style={{ marginTop: '7px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {([
                    ['Word Choice', '×1'],
                    ['Sentence Structure', '×2'],
                    ['Rhetorical Patterns', '×2'],
                    ['Framing Tells', '×2'],
                    ['Structural Tells', '×3'],
                  ] as const).map(([label, weight]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#777' }}>{label}</span>
                      <span style={{ fontWeight: '600', color: '#444', fontFamily: 'monospace' }}>{weight}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '8px', borderTop: '1px solid #e8e8e8', paddingTop: '7px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {([
                    ['0 – 29', 'Clean', RATING_COLOR.Clean],
                    ['30 – 50', 'Moderate', RATING_COLOR.Moderate],
                    ['51 – 70', 'Heavy', RATING_COLOR.Heavy],
                    ['71 – 100', 'Slop', RATING_COLOR.Slop],
                  ] as const).map(([range, label, color]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#777' }}>{range}</span>
                      <span style={{ fontWeight: '700', color, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                    </div>
                  ))}
                </div>
                {!hasApiKey && (
                  <div style={{ marginTop: '7px', borderTop: '1px solid #e8e8e8', paddingTop: '7px', color: '#aaa', fontSize: '10px' }}>
                    Add an API key to include semantic patterns in the score.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#444', fontFamily: 'sans-serif', marginBottom: '2px' }}>
          Words: {wordCount}
        </div>
        {totalHits > 0 && (
          <div style={{ fontSize: '12px', color: '#888', fontFamily: 'sans-serif' }}>
            {totalHits} pattern{totalHits !== 1 ? 's' : ''} detected
          </div>
        )}
        {totalHits === 0 && violations.length === 0 && (
          <div style={{ fontSize: '12px', color: '#aaa', fontFamily: 'sans-serif' }}>
            No patterns detected
          </div>
        )}
        <div style={{ height: '1px', background: '#eee', margin: '14px 0' }} />
      </div>

      {/* Violation cards */}
      <div style={{ padding: '0 12px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {CATEGORY_ORDER.map(cat => {
          const rules = byCategory.get(cat)
          if (!rules || rules.length === 0) return null

          return (
            <div key={cat}>
              <div style={{
                fontSize: '10px', fontFamily: 'sans-serif', textTransform: 'uppercase',
                letterSpacing: '0.08em', color: '#bbb', padding: '8px 8px 4px',
              }}>
                {CATEGORY_LABELS[cat]}
              </div>
              {rules.map(rule => {
                const count = countByRule.get(rule.id) ?? 0
                if (count === 0) return null
                const hidden = hiddenRules.has(rule.id)

                return (
                  <div
                    key={rule.id}
                    onMouseEnter={() => onRuleHover(rule.id)}
                    onMouseLeave={() => onRuleHover(null)}
                    style={{
                      background: hidden ? '#f8f8f8' : rule.bgColor,
                      borderLeft: `4px solid ${hidden ? '#ddd' : rule.color}`,
                      borderRadius: '4px',
                      padding: '10px 10px 10px 12px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      marginBottom: '4px',
                      opacity: hidden ? 0.5 : 1,
                      transition: 'opacity 0.15s',
                      cursor: 'default',
                    }}
                  >
                    {/* Count badge */}
                    <div style={{
                      background: rule.color,
                      color: '#fff',
                      borderRadius: '4px',
                      minWidth: '22px',
                      height: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: '700',
                      fontFamily: 'monospace',
                      flexShrink: 0,
                    }}>
                      {count}
                    </div>

                    {/* Label */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '12px', fontWeight: '600',
                        fontFamily: 'sans-serif', color: '#2a2a2a', lineHeight: '1.3',
                      }}>
                        {rule.name}
                      </div>
                      <div style={{
                        fontSize: '11px', color: '#666',
                        fontFamily: 'sans-serif', lineHeight: '1.4', marginTop: '2px',
                      }}>
                        {rule.description}
                      </div>
                    </div>

                    {/* Eye toggle */}
                    <button
                      onClick={() => onToggleRule(rule.id)}
                      title={hidden ? 'Show highlights' : 'Hide highlights'}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        flexShrink: 0,
                        opacity: 0.5,
                        fontSize: '14px',
                        lineHeight: 1,
                      }}
                    >
                      {hidden ? '🙈' : '👁'}
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* Empty state */}
        {byCategory.size === 0 && (
          <div style={{
            padding: '20px 8px', fontSize: '13px', color: '#aaa',
            fontFamily: 'sans-serif', textAlign: 'center', lineHeight: '1.6',
          }}>
            Paste text to detect LLM prose patterns.
          </div>
        )}

        {/* LLM upsell */}
        {!hasApiKey && violations.length > 0 && (
          <div style={{
            marginTop: '8px',
            padding: '10px 12px',
            background: '#f8f8f8',
            border: '1px solid #e8e8e8',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#888',
            fontFamily: 'sans-serif',
            lineHeight: '1.5',
          }}>
            Add an Anthropic or OpenAI API key, or configure a local model, to unlock semantic pattern detection (Triple Construction, Throat-Clearing, Sycophantic Frame, and more).
          </div>
        )}

        {llmStatus === 'loading' && (
          <div style={{
            padding: '10px 12px', background: '#f0fdf4',
            border: '1px solid #bbf7d0', borderRadius: '6px',
            fontSize: '11px', color: '#16a34a', fontFamily: 'sans-serif',
          }}>
            Running semantic analysis…
          </div>
        )}
      </div>
    </div>
  )
}

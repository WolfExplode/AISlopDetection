import { useState } from 'react'
import type { Violation, ViolationCategory } from '../types'
import { RULES } from '../rules'
import { computeSlopScore, countViolationsByRule, RATING_COLOR } from '../utils/slopScore'
import { useTheme } from '../theme'

interface Props {
  violations: Violation[]
  hiddenRules: Set<string>
  onToggleRule: (ruleId: string) => void
  onRuleHover: (ruleId: string | null) => void
  onViolationBadgeClick: (ruleId: string) => void
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

export default function Sidebar({ violations, hiddenRules, onToggleRule, onRuleHover, onViolationBadgeClick, wordCount, hasApiKey, llmStatus }: Props) {
  const t = useTheme()
  const countByRule = countViolationsByRule(violations)
  const totalHits = Array.from(countViolationsByRule(violations, hiddenRules).values())
    .reduce((sum, n) => sum + n, 0)
  const { score, rating } = computeSlopScore(violations, wordCount, hiddenRules)
  const scoreColor = RATING_COLOR[rating]
  const [showScoreInfo, setShowScoreInfo] = useState(false)

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
      borderLeft: `1px solid ${t.border}`,
      background: t.surface,
      overflowY: 'auto',
      flexDirection: 'column',
    }}>
      {/* Stats header */}
      <div style={{ padding: '20px 20px 0' }}>
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
            <div style={{ marginTop: '6px', height: '4px', background: t.border, borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${score}%`,
                background: scoreColor, borderRadius: '2px',
                transition: 'width 0.3s ease, background 0.3s ease',
              }} />
            </div>
            {wordCount < 75 && (
              <div style={{
                marginTop: '6px', fontSize: '11px', color: t.amber,
                fontFamily: 'sans-serif', lineHeight: '1.4',
                background: t.amberBg, border: `1px solid ${t.amberBorder}`,
                borderRadius: '4px', padding: '5px 8px',
              }}>
                Score is more reliable with 75+ words ({wordCount} so far).
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', color: t.textFaintest, fontFamily: 'sans-serif' }}>Slop score</span>
              <button
                onClick={() => setShowScoreInfo(v => !v)}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '14px', height: '14px', borderRadius: '50%',
                  border: `1px solid ${t.border}`, background: 'transparent',
                  fontSize: '9px', fontWeight: '700', color: t.textFaintest,
                  cursor: 'default', padding: 0, lineHeight: 1,
                }}
              >
                ?
              </button>
            </div>
            {showScoreInfo && (
              <div style={{
                marginTop: '8px', padding: '10px 12px',
                background: t.surfaceAlt, border: `1px solid ${t.border}`,
                borderRadius: '6px', fontSize: '11px', color: t.textFaint,
                fontFamily: 'sans-serif', lineHeight: '1.6',
              }}>
                <strong style={{ display: 'block', marginBottom: '5px', color: t.text }}>How it's calculated</strong>
                Each violation carries a signal weight (0–1). That weight is multiplied by the rule's category weight, then scoring mode controls how repeated hits accumulate. The total is divided by word count, multiplied by 500, and capped at 100.
                <div style={{ marginTop: '7px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {([
                    ['Word Choice', '×1'],
                    ['Sentence Structure', '×2'],
                    ['Rhetorical Patterns', '×2'],
                    ['Framing Tells', '×2'],
                    ['Structural Tells', '×3'],
                  ] as const).map(([label, weight]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: t.textFainter }}>{label}</span>
                      <span style={{ fontWeight: '600', color: t.textMuted, fontFamily: 'monospace' }}>{weight}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '8px', borderTop: `1px solid ${t.border}`, paddingTop: '7px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {([
                    ['Linear', 'every instance counts'],
                    ['Threshold', 'weighting does not apply until N/1k instances'],
                    ['Diminishing', 'decays after 3 excess instances'],
                  ] as const).map(([mode, desc]) => (
                    <div key={mode} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontWeight: '600', color: t.textMuted, fontFamily: 'monospace', flexShrink: 0 }}>{mode}</span>
                      <span style={{ color: t.textFainter, textAlign: 'right' }}>{desc}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '8px', borderTop: `1px solid ${t.border}`, paddingTop: '7px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {([
                    ['0 – 29', 'Clean', RATING_COLOR.Clean],
                    ['30 – 50', 'Moderate', RATING_COLOR.Moderate],
                    ['51 – 70', 'Heavy', RATING_COLOR.Heavy],
                    ['71 – 100', 'Slop', RATING_COLOR.Slop],
                  ] as const).map(([range, label, color]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: t.textFainter }}>{range}</span>
                      <span style={{ fontWeight: '700', color, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                    </div>
                  ))}
                </div>
                {!hasApiKey && (
                  <div style={{ marginTop: '7px', borderTop: `1px solid ${t.border}`, paddingTop: '7px', color: t.textFaintest, fontSize: '10px' }}>
                    Add an API key to include semantic patterns in the score.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div style={{ fontSize: '13px', fontWeight: '600', color: t.textMuted, fontFamily: 'sans-serif', marginBottom: '2px' }}>
          Words: {wordCount}
        </div>
        {totalHits > 0 && (
          <div style={{ fontSize: '12px', color: t.textFainter, fontFamily: 'sans-serif' }}>
            {totalHits} pattern{totalHits !== 1 ? 's' : ''} detected
          </div>
        )}
        {totalHits === 0 && violations.length === 0 && (
          <div style={{ fontSize: '12px', color: t.textFaintest, fontFamily: 'sans-serif' }}>
            No patterns detected
          </div>
        )}
        <div style={{ height: '1px', background: t.border, margin: '14px 0' }} />
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
                letterSpacing: '0.08em', color: t.textFaintest, padding: '8px 8px 4px',
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
                      background: hidden ? t.surfaceAlt : rule.bgColor,
                      borderLeft: `4px solid ${hidden ? t.border : rule.color}`,
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
                    {/* Count badge — click to cycle through instances */}
                    <button
                      onClick={() => onViolationBadgeClick(rule.id)}
                      title="Jump to next instance"
                      style={{
                        background: rule.color,
                        color: '#fff',
                        border: 'none',
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
                        cursor: 'pointer',
                        padding: '0 4px',
                        transition: 'filter 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
                      onMouseLeave={e => (e.currentTarget.style.filter = '')}
                    >
                      {count}
                    </button>

                    {/* Label */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '12px', fontWeight: '600',
                        fontFamily: 'sans-serif', color: t.text, lineHeight: '1.3',
                      }}>
                        {rule.name}
                      </div>
                      <div style={{
                        fontSize: '11px', color: t.textFaint,
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
            padding: '20px 8px', fontSize: '13px', color: t.textFaintest,
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
            background: t.surfaceAlt,
            border: `1px solid ${t.border}`,
            borderRadius: '6px',
            fontSize: '11px',
            color: t.textFainter,
            fontFamily: 'sans-serif',
            lineHeight: '1.5',
          }}>
            Add an Anthropic or OpenAI API key, or configure a local model, to unlock semantic pattern detection (Triple Construction, Throat-Clearing, Sycophantic Frame, and more).
          </div>
        )}

        {llmStatus === 'loading' && (
          <div style={{
            padding: '10px 12px', background: t.greenBg,
            border: `1px solid ${t.greenBorder}`, borderRadius: '6px',
            fontSize: '11px', color: t.green, fontFamily: 'sans-serif',
          }}>
            Running semantic analysis…
          </div>
        )}
      </div>
    </div>
  )
}

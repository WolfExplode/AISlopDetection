import { useState } from 'react'
import type { Violation, ViolationCategory } from '../types'
import { RULES } from '../rules'
import { computeSlopScore, countViolationsByRule, RATING_COLOR, type MattrResult, type WritingMetrics, type OverusedWord } from '../utils/slopScore'
import type { WordfreqStatus } from '../hooks/useWordfreq'
import { useTheme } from '../theme'

interface Props {
  violations: Violation[]
  hiddenRules: Set<string>
  onToggleRule: (ruleId: string) => void
  onRuleHover: (ruleId: string | null) => void
  onViolationBadgeClick: (ruleId: string) => void
  wordCount: number
  mattr: MattrResult | null
  writingMetrics: WritingMetrics | null
  wordOveruse: OverusedWord[] | null
  wordfreqStatus: WordfreqStatus
  hasApiKey: boolean
  llmStatus: 'idle' | 'loading' | 'done' | 'stale' | 'error'
  width?: number
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

export default function Sidebar({ violations, hiddenRules, onToggleRule, onRuleHover, onViolationBadgeClick, wordCount, mattr, writingMetrics, wordOveruse, wordfreqStatus, hasApiKey, llmStatus, width = 350 }: Props) {
  const t = useTheme()
  const countByRule = countViolationsByRule(violations)
  const totalHits = Array.from(countViolationsByRule(violations, hiddenRules).values())
    .reduce((sum, n) => sum + n, 0)
  const { score, rating, weightedHits, breakdown } = computeSlopScore(violations, wordCount, hiddenRules)
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
      width: `${width}px`,
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
              {totalHits > 0 && (
                <span style={{ fontSize: '11px', color: t.textFaintest, fontFamily: 'sans-serif' }}>
                  · {totalHits} pattern{totalHits !== 1 ? 's' : ''} detected
                </span>
              )}
            </div>
            {showScoreInfo && (
              <div style={{
                marginTop: '8px', padding: '10px 12px',
                background: t.surfaceAlt, border: `1px solid ${t.border}`,
                borderRadius: '6px', fontSize: '11px', color: t.textFaint,
                fontFamily: 'sans-serif', lineHeight: '1.5',
              }}>
                {/* Per-rule breakdown table */}
                {breakdown.length > 0 ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto auto auto auto auto auto auto', gap: '1px 3px', alignItems: 'baseline', marginBottom: '6px' }}>
                      {/* Header — operators columns left blank */}
                      <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', color: t.textFaintest }}>Rule</span>
                      <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', color: t.textFaintest, textAlign: 'right', cursor: 'help', borderBottom: `1px dotted ${t.textFaintest}` }} title="Each instance of a violation has a weight, this weight is the sum of all instances">w</span>
                      <span />
                      <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', color: t.textFaintest, textAlign: 'right', cursor: 'help', borderBottom: `1px dotted ${t.textFaintest}` }} title="Weighted instances allowed free at this word count (wordCount ÷ 1000 × freeRate)">free</span>
                      <span />
                      <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', color: t.textFaintest, textAlign: 'right', cursor: 'help', borderBottom: `1px dotted ${t.textFaintest}` }} title="Excess weight after subtracting free allowance (w − free)">exc</span>
                      <span />
                      <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', color: t.textFaintest, textAlign: 'right', cursor: 'help', borderBottom: `1px dotted ${t.textFaintest}` }} title="Rule weight — float multiplier applied to excess. * means diminishing returns were applied after 3 excess instances.">wt</span>
                      <span />
                      <span />
                      <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', color: t.textFaintest, textAlign: 'right', cursor: 'help', borderBottom: `1px dotted ${t.textFaintest}` }} title="This rule's contribution to the total weighted hit count">pts</span>

                      {/* Rows */}
                      {breakdown.map(row => {
                        const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)
                        const op: React.CSSProperties = { fontFamily: 'monospace', color: t.textFaintest, fontSize: '10px', textAlign: 'center' }
                        const val: React.CSSProperties = { fontFamily: 'monospace', color: t.textFainter, fontSize: '10px', textAlign: 'right' }
                        return (
                          <>
                            <span key={row.ruleId + '-name'} style={{ color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '10px' }} title={row.ruleName}>{row.ruleName}</span>
                            <span key={row.ruleId + '-w'} style={val}>{fmt(row.totalWeight)}</span>
                            <span key={row.ruleId + '-minus'} style={op}>−</span>
                            <span key={row.ruleId + '-free'} style={val}>{fmt(row.freeCount)}</span>
                            <span key={row.ruleId + '-eq1'} style={op}>=</span>
                            <span key={row.ruleId + '-exc'} style={val}>{fmt(row.excessWeight)}</span>
                            <span key={row.ruleId + '-times'} style={op}>×</span>
                            <span key={row.ruleId + '-cat'} style={val}>{row.ruleWeight}{row.scoringMode === 'diminishing' ? '*' : ''}</span>
                            <span key={row.ruleId + '-eq2'} style={op}>=</span>
                            <span />
                            <span key={row.ruleId + '-pts'} style={{ fontFamily: 'monospace', fontWeight: '600', color: t.text, textAlign: 'right', fontSize: '10px' }}>{row.contribution.toFixed(2)}</span>
                          </>
                        )
                      })}
                    </div>

                    {/* Totals */}
                    <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ color: t.textFainter, fontSize: '10px' }}>Σ weighted pts</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: '600', color: t.text, fontSize: '10px' }}>{weightedHits.toFixed(3)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ color: t.textFainter, fontSize: '10px' }}>÷ {wordCount} words × 500</span>
                        <span style={{ fontFamily: 'monospace', color: t.textFainter, fontSize: '10px' }}>{((weightedHits / wordCount) * 500).toFixed(3)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ color: t.textFainter, fontSize: '10px' }}>round + cap at 100</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: '700', color: scoreColor, fontSize: '11px' }}>{score}</span>
                      </div>
                    </div>

                    <div style={{ marginTop: '6px', fontSize: '9px', color: t.textFaintest }}>
                      * diminishing returns applied after 3 excess instances
                    </div>
                  </>
                ) : (
                  <span style={{ color: t.textFaintest }}>No violations contributing to score yet.</span>
                )}

                {/* Rating thresholds */}
                <div style={{ marginTop: '8px', borderTop: `1px solid ${t.border}`, paddingTop: '7px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {([
                    ['0 – 29', 'Clean', RATING_COLOR.Clean],
                    ['30 – 50', 'Moderate', RATING_COLOR.Moderate],
                    ['51 – 70', 'Heavy', RATING_COLOR.Heavy],
                    ['71 – 100', 'Slop', RATING_COLOR.Slop],
                  ] as const).map(([range, label, color]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: t.textFainter, fontFamily: 'monospace', fontSize: '10px' }}>{range}</span>
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
        {mattr && (
          <div style={{ marginBottom: '2px' }}
            title={`${mattr.isFullTTR ? 'Type-Token Ratio (text too short for MATTR-500)' : 'Moving Average Type-Token Ratio, 500-word window'} — measures vocabulary variety. Lower = more repetitive, higher = more varied.`}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: t.textMuted, fontFamily: 'sans-serif' }}>
                Lexical diversity: {mattr.value.toFixed(3)}
              </span>
              <span style={{ fontSize: '10px', color: t.textFaintest, fontFamily: 'sans-serif' }}>{mattr.isFullTTR ? 'TTR' : 'MATTR-500'}</span>
            </div>
            <div style={{ height: '3px', background: t.border, borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.round(mattr.value * 100)}%`,
                background: t.link,
                borderRadius: '2px',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}
        <div style={{ fontSize: '11px', color: t.textFaintest, fontFamily: 'sans-serif', marginTop: '6px', marginBottom: '2px' }}>
          Words: {wordCount}
        </div>
        {writingMetrics && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: t.textFaintest, fontFamily: 'sans-serif', marginBottom: '5px' }}>
              Writing style
            </div>
            {([
              ['Vocab level',      writingMetrics.fkGrade,            20,  1,   'Flesch-Kincaid grade level'],
              ['Sentence length',  writingMetrics.avgSentenceLength,  50,  1,   'Average words per sentence'],
              ['Rhythm variety',   writingMetrics.sentenceLengthCV,   0.8, 2,   'Sentence length CV — coefficient of variation. >0.3 = varied rhythm, <0.2 = suspiciously uniform'],
              ['Paragraph length', writingMetrics.avgParagraphLength, 200, 1,   'Average words per paragraph'],
              ['Dialogue freq',    writingMetrics.dialogueFrequency,  5,   1,   'Quoted dialogue per 1000 characters'],
            ] as [string, number, number, number, string][]).map(([label, value, max, decimals, tip]) => (
              <div key={label} title={tip} style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center', marginBottom: '2px', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: t.link, opacity: 0.12, width: `${Math.min(100, (value / max) * 100).toFixed(1)}%`, borderRadius: '3px', transition: 'width 0.3s ease' }} />
                <span style={{ position: 'relative', fontSize: '11px', color: t.textFaint, fontFamily: 'sans-serif', paddingLeft: '6px', flex: 1 }}>{label}</span>
                <span style={{ position: 'relative', fontSize: '11px', fontFamily: 'monospace', color: t.textFainter, paddingRight: '6px' }}>{value.toFixed(decimals)}</span>
              </div>
            ))}
          </div>
        )}
        {/* Word overuse vs human baseline */}
        {wordCount >= 50 && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: t.textFaintest, fontFamily: 'sans-serif', marginBottom: '5px' }}>
              Word overuse vs human baseline
            </div>
            {wordfreqStatus === 'loading' && (
              <div style={{ fontSize: '11px', color: t.textFaintest, fontFamily: 'sans-serif', fontStyle: 'italic' }}>
                Loading frequency data…
              </div>
            )}
            {wordfreqStatus === 'error' && (
              <div style={{ fontSize: '11px', color: t.textFaintest, fontFamily: 'sans-serif', fontStyle: 'italic' }}>
                Frequency data unavailable.
              </div>
            )}
            {wordfreqStatus === 'ready' && wordOveruse !== null && wordOveruse.length === 0 && (
              <div style={{ fontSize: '11px', color: t.textFaintest, fontFamily: 'sans-serif', fontStyle: 'italic' }}>
                No words overused vs typical English.
              </div>
            )}
            {wordfreqStatus === 'ready' && wordOveruse && wordOveruse.length > 0 && (() => {
              const maxRatio = wordOveruse[0].ratio
              return wordOveruse.map(({ word, count, ratio }) => {
                const pct = Math.min(100, (ratio / maxRatio) * 100)
                // Color scale: green → amber → red by ratio magnitude
                const barColor = ratio >= 20 ? '#dc2626' : ratio >= 8 ? '#d97706' : '#2563eb'
                return (
                  <div
                    key={word}
                    title={`"${word}" appears ${count}× in this text — ${ratio.toFixed(1)}× more often than expected in typical English prose`}
                    style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center', marginBottom: '2px', borderRadius: '3px', overflow: 'hidden', cursor: 'default' }}
                  >
                    <div style={{ position: 'absolute', inset: 0, background: barColor, opacity: 0.12, width: `${pct.toFixed(1)}%`, borderRadius: '3px', transition: 'width 0.3s ease' }} />
                    <span style={{ position: 'relative', fontSize: '11px', color: t.textFaint, fontFamily: 'sans-serif', paddingLeft: '6px', flex: 1 }}>{word}</span>
                    <span style={{ position: 'relative', fontSize: '11px', fontFamily: 'monospace', color: barColor, fontWeight: '600', paddingRight: '6px' }}>{ratio.toFixed(1)}×</span>
                  </div>
                )
              })
            })()}
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

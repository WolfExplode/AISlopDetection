import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ViolationRule } from '../types'
import { useTheme } from '../theme'

export interface PopoverViolationData {
  startIndex: number
  endIndex: number
  matchedText: string
  instanceWeight?: number  // this single instance's signal strength (0–1)
  clusterWeight?: number   // average instanceWeight across the group (stacked-intensifiers etc.)
  clusterSize?: number     // how many violations share the group
  explanation?: string
  suggestedChange?: string | null
  applyStartIndex?: number
  applyEndIndex?: number
  applyReplacement?: string
}

export interface PopoverState {
  rules: ViolationRule[]
  violations: PopoverViolationData[]
  anchorRect: DOMRect
  ruleIndex: number
}

interface Props {
  state: PopoverState
  onClose: () => void
  onApply: (startIndex: number, endIndex: number, replacement: string) => void
  onNextRule: () => void
  onPrevRule: () => void
}

function InlineDiff({ before, after }: { before: string; after: string }) {
  let prefixLen = 0
  while (prefixLen < before.length && prefixLen < after.length && before[prefixLen] === after[prefixLen]) {
    prefixLen++
  }
  let suffixLen = 0
  while (
    suffixLen < before.length - prefixLen &&
    suffixLen < after.length - prefixLen &&
    before[before.length - 1 - suffixLen] === after[after.length - 1 - suffixLen]
  ) {
    suffixLen++
  }

  const t = useTheme()
  const prefix = before.slice(0, prefixLen)
  const removed = before.slice(prefixLen, before.length - suffixLen || undefined)
  const added = after.slice(prefixLen, after.length - suffixLen || undefined)
  const suffix = suffixLen > 0 ? before.slice(before.length - suffixLen) : ''

  if (!removed && !added) {
    return <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', lineHeight: '1.6', color: t.textFaint }}>{before}</span>
  }

  return (
    <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', lineHeight: '1.6' }}>
      <span style={{ color: t.textFainter }}>{prefix}</span>
      {removed && (
        <span style={{
          textDecoration: 'line-through',
          color: '#dc2626',
          background: 'rgba(220,38,38,0.12)',
          borderRadius: '2px',
          padding: '0 1px',
        }}>
          {removed}
        </span>
      )}
      {added && (
        <span style={{
          color: '#16a34a',
          background: 'rgba(22,163,74,0.12)',
          borderRadius: '2px',
          padding: '0 1px',
          fontWeight: '500',
        }}>
          {added}
        </span>
      )}
      <span style={{ color: t.textFainter }}>{suffix}</span>
    </span>
  )
}

function signalTier(w: number): { label: string; color: string } {
  if (w >= 0.85) return { label: 'Near-exclusive tell', color: '#dc2626' }
  if (w >= 0.65) return { label: 'Strong tell',         color: '#d97706' }
  if (w >= 0.35) return { label: 'Moderate tell',       color: '#ca8a04' }
  return               { label: 'Weak tell',            color: '#6b7280' }
}

function SignalStrength({ instanceWeight, clusterWeight, clusterSize, t }: {
  instanceWeight: number
  clusterWeight?: number
  clusterSize?: number
  t: ReturnType<typeof useTheme>
}) {
  const isCluster = clusterWeight !== undefined && clusterSize !== undefined && clusterSize > 1
  const effective = isCluster ? clusterWeight! : instanceWeight
  const { label, color } = signalTier(effective)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{
          fontSize: '10px', fontFamily: 'sans-serif', textTransform: 'uppercase',
          letterSpacing: '0.08em', color: t.textFaintest, fontWeight: 600,
        }}>
          {isCluster ? `Signal strength (${clusterSize}-word cluster avg)` : 'Signal strength'}
        </span>
        <span style={{ fontSize: '11px', fontFamily: 'sans-serif', fontWeight: 600, color }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, height: '4px', background: t.borderLight, borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${effective * 100}%`, height: '100%', background: color, borderRadius: '2px' }} />
        </div>
        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: t.textFaintest, width: '28px', textAlign: 'right' }}>
          {effective.toFixed(2)}
        </span>
      </div>
    </div>
  )
}

function scoringModeLabel(mode: ViolationRule['scoringMode'], freeRate: number): string {
  if (mode === 'linear') return 'Linear — every instance counts'
  if (mode === 'threshold') return `Threshold — ${freeRate}/1k words free`
  return 'Diminishing — decays after 3 instances'
}

function ScoringBreakdown({ rule, t }: { rule: ViolationRule; t: ReturnType<typeof useTheme> }) {
  const modeLabel = scoringModeLabel(rule.scoringMode, rule.freeRate)

  const lineStyle: React.CSSProperties = {
    fontSize: '11px', fontFamily: 'sans-serif', color: t.textFaint,
  }
  const valueStyle: React.CSSProperties = { fontWeight: 600, color: t.textMuted }

  return (
    <div style={{
      background: t.surfaceAlt, border: `1px solid ${t.borderLight}`,
      borderRadius: '6px', padding: '8px 10px',
      display: 'flex', flexDirection: 'column', gap: '3px',
    }}>
      <span style={{
        fontSize: '10px', fontFamily: 'sans-serif', textTransform: 'uppercase',
        letterSpacing: '0.08em', color: t.textFaintest, fontWeight: 600,
        marginBottom: '2px',
      }}>
        Scoring
      </span>
      <div style={lineStyle}>Category: <span style={valueStyle}>{rule.category}</span></div>
      <div style={lineStyle}>Rule weight: <span style={valueStyle}>×{rule.ruleWeight}</span></div>
      <div style={lineStyle}>Mode: <span style={valueStyle}>{modeLabel}</span></div>
    </div>
  )
}

const POPOVER_WIDTH = 380

export default function Popover({ state, onClose, onApply, onNextRule, onPrevRule }: Props) {
  const t = useTheme()
  const { rules, violations, anchorRect, ruleIndex } = state
  const rule = rules[ruleIndex]
  const { startIndex, endIndex, matchedText, instanceWeight, clusterWeight, clusterSize,
          explanation, suggestedChange, applyStartIndex, applyEndIndex, applyReplacement } = violations[ruleIndex] ?? violations[0]
  const popoverRef = useRef<HTMLDivElement>(null)

  const top = anchorRect.bottom + window.scrollY + 8
  const rawLeft = anchorRect.left + window.scrollX
  const left = Math.min(rawLeft, window.innerWidth - POPOVER_WIDTH - 16)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement
        if (target.tagName === 'MARK' || target.closest('mark')) return
        if (target.closest('[data-rules]')) return
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  const navBtnStyle: React.CSSProperties = {
    background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '3px',
    cursor: 'pointer', fontSize: '14px', color: t.textFaint, padding: '0 4px', lineHeight: '18px',
  }

  const closeBtnStyle: React.CSSProperties = {
    background: 'transparent', border: 'none', cursor: 'pointer',
    fontSize: '14px', color: t.textFaintest, padding: '2px 4px', lineHeight: 1,
    borderRadius: '4px', flexShrink: 0,
  }

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        top,
        left,
        width: POPOVER_WIDTH,
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: '10px',
        boxShadow: t.isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.15)',
        zIndex: 9999,
        overflow: 'hidden',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '14px 16px 10px', borderBottom: `1px solid ${t.borderLight}`, gap: '8px',
      }}>
        <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: rule.color, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: '15px', fontWeight: '700', fontFamily: 'sans-serif', color: t.text }}>
          {rule.name}
        </span>
        {rules.length > 1 && (
          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            <button onClick={onPrevRule} style={navBtnStyle}>‹</button>
            <span style={{ fontSize: '11px', color: t.textFaintest, fontFamily: 'monospace', padding: '0 2px' }}>
              {ruleIndex + 1}/{rules.length}
            </span>
            <button onClick={onNextRule} style={navBtnStyle}>›</button>
          </div>
        )}
        <button onClick={onClose} style={closeBtnStyle}>✕</button>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {instanceWeight !== undefined && (
          <SignalStrength instanceWeight={instanceWeight} clusterWeight={clusterWeight} clusterSize={clusterSize} t={t} />
        )}

        <ScoringBreakdown rule={rule} t={t} />

        <p style={{ margin: 0, fontSize: '13px', fontStyle: 'italic', fontFamily: 'Georgia, serif', color: t.textMuted, lineHeight: '1.6' }}>
          {explanation ?? rule.tip}
        </p>

        {(() => {
          const effectiveSuggestion = suggestedChange === null ? null : (suggestedChange ?? (rule.canRemove ? '' : null))
          if (effectiveSuggestion === null) return null
          return (
            <div style={{
              background: t.surfaceAlt,
              border: `1px solid ${t.border}`,
              borderRadius: '6px',
              padding: '10px 12px',
              lineHeight: '1.7',
            }}>
              <div style={{ fontSize: '10px', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', color: t.textFaintest, marginBottom: '6px', fontWeight: '600' }}>
                Suggested change
              </div>
              <InlineDiff before={matchedText} after={effectiveSuggestion} />
            </div>
          )
        })()}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {suggestedChange !== null && (suggestedChange !== undefined || rule.canRemove) && (
            <button
              onClick={() => onApply(
                applyStartIndex ?? startIndex,
                applyEndIndex ?? endIndex,
                applyReplacement ?? suggestedChange ?? '',
              )}
              style={{
                background: '#16a34a', color: '#fff', border: 'none',
                borderRadius: '6px', padding: '8px 16px', cursor: 'pointer',
                fontSize: '13px', fontFamily: 'sans-serif', fontWeight: '600',
              }}
            >
              Apply
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'transparent', color: t.textFainter, border: `1px solid ${t.border}`,
              borderRadius: '6px', padding: '8px 12px', cursor: 'pointer',
              fontSize: '13px', fontFamily: 'sans-serif',
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

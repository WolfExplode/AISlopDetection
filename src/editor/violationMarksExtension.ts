import { StateField, StateEffect, RangeSetBuilder } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'
import type { DecorationSet } from '@codemirror/view'
import { RULES_BY_ID } from '../rules'
import type { Violation } from '../types'

export interface ViolationUpdate {
  violations: Violation[]
  activeRules: Set<string>
}

export const setViolationsEffect = StateEffect.define<ViolationUpdate>()

// Mirrors the buildHighlightedHTML segmentation logic so overlapping violations
// produce combined data-rules on each segment, matching the original click behavior.
function buildViolationDecorations(violations: Violation[], activeRules: Set<string>): DecorationSet {
  const active = violations.filter(v => activeRules.has(v.ruleId))
  if (active.length === 0) return Decoration.none

  const events = new Set<number>()
  for (const v of active) {
    events.add(Math.max(0, v.startIndex))
    events.add(v.endIndex)
  }
  const sorted = Array.from(events).sort((a, b) => a - b)

  const builder = new RangeSetBuilder<Decoration>()

  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i]
    const to = sorted[i + 1]
    if (from >= to) continue

    const matching = active.filter(v => v.startIndex <= from && v.endIndex >= to)
    if (matching.length === 0) continue

    // Use shortest-span violation as the primary (most specific)
    const primary = matching.reduce((a, b) =>
      (a.endIndex - a.startIndex) <= (b.endIndex - b.startIndex) ? a : b
    )
    const rule = RULES_BY_ID[primary.ruleId]
    const ruleIds = matching.map(v => v.ruleId).join(',')

    builder.add(from, to, Decoration.mark({
      class: 'cm-violation',
      attributes: {
        'data-rules': ruleIds,
        'data-start': String(from),
        'data-end': String(to),
        style: [
          `background:${rule?.bgColor ?? 'rgba(255,220,0,0.35)'}`,
          `border-bottom:2px solid ${rule?.color ?? '#f59e0b'}`,
          'border-radius:2px',
          'cursor:pointer',
          'padding:0 1px',
        ].join(';'),
      },
    }))
  }

  return builder.finish()
}

export const violationsDataField = StateField.define<ViolationUpdate>({
  create() {
    return { violations: [], activeRules: new Set() }
  },
  update(data, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setViolationsEffect)) return effect.value
    }
    return data
  },
})

export const violationMarksField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(marks, tr) {
    marks = marks.map(tr.changes)
    for (const effect of tr.effects) {
      if (effect.is(setViolationsEffect)) {
        const { violations, activeRules } = effect.value
        marks = buildViolationDecorations(violations, activeRules)
      }
    }
    return marks
  },
  provide: f => EditorView.decorations.from(f),
})

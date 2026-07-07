import { describe, it, expect } from 'vitest'
import { headNoun, docFrequency, isHapax } from '../docFrequency'

describe('headNoun', () => {
  it('returns the last word of a multi-word term', () => {
    expect(headNoun('volume knob')).toBe('knob')
  })
  it('returns a single word unchanged', () => {
    expect(headNoun('treadmill')).toBe('treadmill')
  })
  it('lowercases', () => {
    expect(headNoun('Volume Knob')).toBe('knob')
  })
  it('strips possessives', () => {
    expect(headNoun("the engine's")).toBe('engine')
  })
  it('returns empty string for no alphabetic content', () => {
    expect(headNoun('42 —')).toBe('')
  })
})

describe('docFrequency', () => {
  it('counts exact occurrences', () => {
    expect(docFrequency('The knob broke. Another knob arrived.', 'knob')).toBe(2)
  })
  it('folds plural onto singular', () => {
    expect(docFrequency('The knobs on the mixer. One knob broke.', 'knob')).toBe(2)
  })
  it('folds singular onto plural input', () => {
    expect(docFrequency('One knob broke.', 'knobs')).toBe(1)
  })
  it('folds y/ies', () => {
    expect(docFrequency('The battery died. Batteries are cheap.', 'battery')).toBe(2)
  })
  it('folds f/ves', () => {
    expect(docFrequency('A knife. Two knives.', 'knife')).toBe(2)
  })
  it('folds es-plurals after sibilants', () => {
    expect(docFrequency('A box of boxes.', 'box')).toBe(2)
  })
  it('uses only the head noun of multi-word terms', () => {
    expect(docFrequency('The volume was loud. No dials here.', 'volume knob')).toBe(0)
  })
  it('is case-insensitive', () => {
    expect(docFrequency('Knob. KNOB. knob.', 'knob')).toBe(3)
  })
  it('does not match substrings', () => {
    expect(docFrequency('doorknob and knobbly things', 'knob')).toBe(0)
  })
  it('matches possessive forms via the word boundary', () => {
    expect(docFrequency("the knob's finish", 'knob')).toBe(1)
  })
})

describe('isHapax', () => {
  const text = 'The argument never lands. It is a volume knob stuck at max. We tried anyway.'
  const spanStart = text.indexOf('It is')
  const spanEnd = text.indexOf('max.') + 4

  it('true when the head noun occurs only inside the span', () => {
    expect(isHapax(text, 'volume knob', spanStart, spanEnd)).toBe(true)
  })
  it('false when the head noun recurs after the span', () => {
    const t = text + ' The knob on the amp was unrelated.'
    expect(isHapax(t, 'volume knob', spanStart, spanEnd)).toBe(false)
  })
  it('false when an inflected form recurs before the span', () => {
    const t = 'We sell mixer knobs. ' + text
    const start = t.indexOf('It is')
    const end = t.indexOf('max.') + 4
    expect(isHapax(t, 'volume knob', start, end)).toBe(false)
  })
  it('recurrence of a non-head word does not disarm', () => {
    const t = text + ' The volume of complaints grew.'
    expect(isHapax(t, 'volume knob', spanStart, spanEnd)).toBe(true)
  })
})

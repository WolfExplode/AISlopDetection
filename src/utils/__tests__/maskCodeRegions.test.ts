import { describe, it, expect } from 'vitest'
import { maskCodeRegions } from '../maskCodeRegions'

describe('maskCodeRegions', () => {
  it('returns text unchanged when there is no code', () => {
    const text = 'Just some plain prose.\n\nWith two paragraphs.'
    expect(maskCodeRegions(text)).toBe(text)
  })

  it('masks a fenced code block including the fence lines', () => {
    const text = 'Before.\n\n```js\nconst x = "leverage"\n```\n\nAfter.'
    const masked = maskCodeRegions(text)
    expect(masked.length).toBe(text.length)
    expect(masked).not.toContain('leverage')
    expect(masked).not.toContain('```')
    expect(masked.startsWith('Before.')).toBe(true)
    expect(masked.endsWith('After.')).toBe(true)
  })

  it('preserves newlines inside masked blocks (offsets stay valid)', () => {
    const text = 'A.\n\n```\nline one\nline two\n```\n\nB.'
    const masked = maskCodeRegions(text)
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') expect(masked[i]).toBe('\n')
    }
    expect(masked.indexOf('B.')).toBe(text.indexOf('B.'))
  })

  it('masks an unclosed fence to the end of the document', () => {
    const text = 'Prose.\n\n```\nrobust delve tapestry'
    const masked = maskCodeRegions(text)
    expect(masked).not.toContain('delve')
    expect(masked.startsWith('Prose.')).toBe(true)
  })

  it('supports ~~~ fences', () => {
    const text = 'Prose.\n\n~~~\ndelve\n~~~\n\nMore.'
    const masked = maskCodeRegions(text)
    expect(masked).not.toContain('delve')
    expect(masked).toContain('More.')
  })

  it('requires the closing fence to be at least as long as the opener', () => {
    const text = '````\ndelve\n```\nstill code\n````\nAfter.'
    const masked = maskCodeRegions(text)
    expect(masked).not.toContain('still code')
    expect(masked).toContain('After.')
  })

  it('does not treat a backtick run with a backtick in the info string as a fence', () => {
    // CommonMark: a backtick fence info string cannot contain backticks,
    // so this line is not a fence opener and the following prose is scanned
    const text = '``` not`a`fence\nNext line delve stays.'
    const masked = maskCodeRegions(text)
    expect(masked).toContain('delve stays')
  })

  it('treats a mid-line triple-backtick pair as an inline span, not a fence', () => {
    const text = 'Run ``` `foo` ``` here.\nNext line delve stays.'
    const masked = maskCodeRegions(text)
    expect(masked).toContain('delve stays')
    expect(masked).not.toContain('foo')
  })

  it('masks inline code spans', () => {
    const text = 'Use `leverage()` to start.'
    const masked = maskCodeRegions(text)
    expect(masked.length).toBe(text.length)
    expect(masked).not.toContain('leverage')
    expect(masked).toContain('Use')
    expect(masked).toContain('to start.')
  })

  it('matches double-backtick spans containing single backticks', () => {
    const text = 'The span ``a ` b`` is code.'
    const masked = maskCodeRegions(text)
    expect(masked).not.toContain('a ` b')
    expect(masked).toContain('is code.')
  })

  it('leaves an unmatched backtick alone', () => {
    const text = 'A stray ` backtick and some delve prose.'
    expect(maskCodeRegions(text)).toBe(text)
  })

  it('does not let inline spans cross a blank line', () => {
    const text = 'One `unclosed here.\n\nAnother paragraph` with prose.'
    expect(maskCodeRegions(text)).toBe(text)
  })

  it('masks multiple regions independently', () => {
    const text = 'Say `foo` then:\n\n```\nbar\n```\n\nThen `baz` ends.'
    const masked = maskCodeRegions(text)
    expect(masked).not.toContain('foo')
    expect(masked).not.toContain('bar')
    expect(masked).not.toContain('baz')
    expect(masked).toContain('Say')
    expect(masked).toContain('then:')
    expect(masked).toContain('ends.')
  })
})

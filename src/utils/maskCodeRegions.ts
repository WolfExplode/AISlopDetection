/**
 * Replace markdown code regions with spaces so detectors never scan or label
 * code. Length-preserving: every masked character becomes a space, newlines
 * are kept, so all violation offsets remain valid against the original text.
 *
 * Handles:
 * - Fenced code blocks (``` or ~~~, up to 3 leading spaces, incl. fence lines).
 *   An unclosed fence masks to the end of the document.
 * - Inline code spans (`x`, ``x``, …). Per CommonMark the closing run must be
 *   the same length as the opener; spans cannot cross a blank line.
 *
 * Not handled (accepted): 4-space indented code blocks — indentation is too
 * ambiguous against list continuations and pasted prose.
 */
export function maskCodeRegions(text: string): string {
  if (!text.includes('`') && !text.includes('~~~')) return text

  const chars = text.split('')
  const maskRange = (start: number, end: number) => {
    for (let i = start; i < end; i++) {
      if (chars[i] !== '\n') chars[i] = ' '
    }
  }

  // Pass 1: fenced blocks, line by line
  let pos = 0
  let inFence = false
  let fenceChar = ''
  let fenceLen = 0
  while (pos < text.length) {
    let lineEnd = text.indexOf('\n', pos)
    if (lineEnd === -1) lineEnd = text.length
    const line = text.slice(pos, lineEnd)

    if (!inFence) {
      const m = line.match(/^ {0,3}(`{3,}|~{3,})/)
      // Backtick fence info strings cannot contain backticks (CommonMark)
      if (m && !(m[1][0] === '`' && line.slice(m.index! + m[1].length).includes('`'))) {
        inFence = true
        fenceChar = m[1][0]
        fenceLen = m[1].length
        maskRange(pos, lineEnd)
      }
    } else {
      maskRange(pos, lineEnd)
      const m = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/)
      if (m && m[1][0] === fenceChar && m[1].length >= fenceLen) inFence = false
    }
    pos = lineEnd + 1
  }

  // Pass 2: inline code spans, on the fence-masked text (fence backticks are
  // already spaces, so any remaining backtick run is a potential inline span)
  const masked = chars.join('')
  let i = masked.indexOf('`')
  while (i !== -1) {
    let runEnd = i
    while (runEnd < masked.length && masked[runEnd] === '`') runEnd++
    const runLen = runEnd - i

    // Find a closing run of exactly runLen backticks, with no blank line between
    let close = -1
    let j = runEnd
    while (j < masked.length) {
      const next = masked.indexOf('`', j)
      if (next === -1) break
      if (/\n[ \t]*\n/.test(masked.slice(runEnd, next))) break
      let nextEnd = next
      while (nextEnd < masked.length && masked[nextEnd] === '`') nextEnd++
      if (nextEnd - next === runLen) { close = next; break }
      j = nextEnd
    }

    if (close !== -1) {
      maskRange(i, close + runLen)
      i = chars.indexOf('`', close + runLen)
    } else {
      i = masked.indexOf('`', runEnd)
    }
  }

  return chars.join('')
}

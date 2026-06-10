import { ViewPlugin, Decoration, WidgetType, EditorView } from '@codemirror/view'
import type { DecorationSet } from '@codemirror/view'
import { StateField } from '@codemirror/state'
import type { EditorState } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { RangeSetBuilder } from '@codemirror/state'
import { RULES_BY_ID } from '../rules'
import type { Violation } from '../types'
import { violationsDataField, setViolationsEffect } from './violationMarksExtension'

// ── Widgets ──────────────────────────────────────────────────────────────────

type Alignment = 'left' | 'center' | 'right' | ''

interface CellInfo {
  trimmed: string
  from: number  // doc offset of trimmed content start
  to: number    // doc offset of trimmed content end
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function renderCellHTML(
  cell: CellInfo,
  violations: Violation[],
  activeRules: Set<string>,
): string {
  const active = violations.filter(v =>
    activeRules.has(v.ruleId) && v.startIndex < cell.to && v.endIndex > cell.from
  )
  if (active.length === 0) return renderInlineMarkdown(cell.trimmed)

  const events = new Set<number>([cell.from, cell.to])
  for (const v of active) {
    if (v.startIndex > cell.from) events.add(v.startIndex)
    if (v.endIndex < cell.to) events.add(v.endIndex)
  }
  const sorted = Array.from(events).sort((a, b) => a - b)

  let html = ''
  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i]
    const to = sorted[i + 1]
    const chunk = cell.trimmed.slice(from - cell.from, to - cell.from)
    if (!chunk) continue
    const matching = active.filter(v => v.startIndex <= from && v.endIndex >= to)
    if (matching.length === 0) {
      html += renderInlineMarkdown(chunk)
    } else {
      const primary = matching.reduce((a, b) =>
        (a.endIndex - a.startIndex) <= (b.endIndex - b.startIndex) ? a : b
      )
      const rule = RULES_BY_ID[primary.ruleId]
      const ruleIds = matching.map(v => v.ruleId).join(',')
      html += `<mark data-rules="${escapeAttr(ruleIds)}" data-start="${from}" data-end="${to}" style="background:${rule?.bgColor ?? 'rgba(255,220,0,0.35)'};border-bottom:2px solid ${rule?.color ?? '#f59e0b'};border-radius:2px;cursor:pointer;padding:0 1px;color:inherit;">${renderInlineMarkdown(chunk)}</mark>`
    }
  }
  return html
}

class TableWidget extends WidgetType {
  cells: CellInfo[][]  // rows (header + data), separator excluded
  alignments: Alignment[]
  violations: Violation[]
  activeRules: Set<string>
  private _sig: string

  constructor(cells: CellInfo[][], alignments: Alignment[], violations: Violation[], activeRules: Set<string>) {
    super()
    this.cells = cells
    this.alignments = alignments
    this.violations = violations
    this.activeRules = activeRules
    this._sig = TableWidget.sig(cells, alignments, violations, activeRules)
  }

  private static sig(cells: CellInfo[][], alignments: Alignment[], violations: Violation[], activeRules: Set<string>): string {
    const cellSig = cells.map(row => row.map(c => `${c.trimmed}@${c.from}`).join('|')).join('\n')
    const vSig = violations.map(v => `${v.ruleId}:${v.startIndex}:${v.endIndex}`).join(',')
    const rSig = [...activeRules].sort().join(',')
    return `${cellSig}§${alignments.join(',')}§${vSig}§${rSig}`
  }

  toDOM() {
    const wrapper = document.createElement('div')
    wrapper.className = 'cm-md-table-wrap'
    const table = wrapper.appendChild(document.createElement('table'))
    table.className = 'cm-md-table'

    const thead = table.appendChild(document.createElement('thead'))
    const headerRow = thead.appendChild(document.createElement('tr'))
    for (let i = 0; i < this.cells[0].length; i++) {
      const th = headerRow.appendChild(document.createElement('th'))
      th.innerHTML = renderCellHTML(this.cells[0][i], this.violations, this.activeRules)
      if (this.alignments[i]) th.style.textAlign = this.alignments[i]
    }

    if (this.cells.length > 1) {
      const tbody = table.appendChild(document.createElement('tbody'))
      for (let r = 1; r < this.cells.length; r++) {
        const tr = tbody.appendChild(document.createElement('tr'))
        for (let i = 0; i < this.cells[r].length; i++) {
          const td = tr.appendChild(document.createElement('td'))
          td.innerHTML = renderCellHTML(this.cells[r][i] ?? { trimmed: '', from: 0, to: 0 }, this.violations, this.activeRules)
          if (this.alignments[i]) td.style.textAlign = this.alignments[i]
        }
      }
    }
    return wrapper
  }

  eq(other: TableWidget) {
    return other instanceof TableWidget && other._sig === this._sig
  }

  ignoreEvent() { return false }
}

function parseTableCells(line: string): string[] {
  return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
}

function parseTableCellsWithOffsets(lineText: string, lineFrom: number): CellInfo[] {
  const cells: CellInfo[] = []
  let i = lineText[0] === '|' ? 1 : 0
  while (i < lineText.length) {
    const cellStart = i
    while (i < lineText.length && lineText[i] !== '|') i++
    const raw = lineText.slice(cellStart, i)
    const leading = raw.length - raw.trimStart().length
    const trimmed = raw.trim()
    cells.push({
      trimmed,
      from: lineFrom + cellStart + leading,
      to: lineFrom + cellStart + leading + trimmed.length,
    })
    i++ // skip |
  }
  return cells
}

function renderInlineMarkdown(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

function parseAlignment(cell: string): Alignment {
  const c = cell.trim()
  if (c.startsWith(':') && c.endsWith(':')) return 'center'
  if (c.endsWith(':')) return 'right'
  if (c.startsWith(':')) return 'left'
  return ''
}

function isTableRow(line: string): boolean {
  return line.includes('|') && line.trim().startsWith('|')
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s:|-]+\|/.test(line) && /[-]/.test(line) && !/[a-zA-Z0-9]/.test(line)
}

class HrWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement('hr')
    hr.className = 'cm-md-hr-widget'
    return hr
  }
  ignoreEvent() { return false }
  eq(other: HrWidget) { return other instanceof HrWidget }
}

class BulletWidget extends WidgetType {
  depth: number
  constructor(depth: number) { super(); this.depth = depth }
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-md-bullet'
    span.textContent = this.depth % 3 === 0 ? '•' : this.depth % 3 === 1 ? '◦' : '▸'
    return span
  }
  ignoreEvent() { return false }
  eq(other: BulletWidget) { return other instanceof BulletWidget && other.depth === this.depth }
}

// ── Cursor helpers ────────────────────────────────────────────────────────────

function cursorIn(state: EditorState, from: number, to: number): boolean {
  return state.selection.ranges.some(r => r.from <= to && r.to >= from)
}

// ── Inline decorations (ViewPlugin) ──────────────────────────────────────────
// Only mark/replace decorations — NO Decoration.line() or block: true here.

interface RangeDeco { from: number; to: number; value: Decoration }

function buildInlineDecorations(view: EditorView): DecorationSet {
  const decos: RangeDeco[] = []
  const { state } = view
  const tree = syntaxTree(state)
  const doc = state.doc

  let hiddenEmphDepth = 0
  let cursorEmphDepth = 0

  tree.iterate({
    enter(node) {
      const { from, to, name } = node

      // ── ATX Heading: hide HeaderMark (# chars + space) ───────────────────
      if (name.match(/^ATXHeading[1-6]$/)) {
        if (!cursorIn(state, from, to)) {
          const cn = node.node.cursor()
          if (cn.firstChild()) {
            do {
              if (cn.name === 'HeaderMark') {
                let markEnd = cn.to
                const after = doc.sliceString(markEnd, markEnd + 1)
                if (after === ' ' || after === '\t') markEnd++
                decos.push({ from: cn.from, to: markEnd, value: Decoration.replace({}) })
                break
              }
            } while (cn.nextSibling())
          }
        }
        return false
      }

      // ── Bold / Italic ─────────────────────────────────────────────────────
      if (name === 'StrongEmphasis' || name === 'Emphasis') {
        if (cursorIn(state, from, to)) {
          cursorEmphDepth++
        } else {
          hiddenEmphDepth++
          decos.push({ from, to, value: Decoration.mark({ class: name === 'StrongEmphasis' ? 'cm-md-strong' : 'cm-md-em' }) })
        }
        return
      }

      if (name === 'EmphasisMark' && hiddenEmphDepth > 0 && cursorEmphDepth === 0) {
        decos.push({ from, to, value: Decoration.replace({}) })
        return false
      }

      // ── Inline code ───────────────────────────────────────────────────────
      if (name === 'InlineCode') {
        if (!cursorIn(state, from, to)) {
          decos.push({ from, to, value: Decoration.mark({ class: 'cm-md-code' }) })
          const cn = node.node.cursor()
          if (cn.firstChild()) {
            do {
              if (cn.name === 'CodeMark') decos.push({ from: cn.from, to: cn.to, value: Decoration.replace({}) })
            } while (cn.nextSibling())
          }
        }
        return false
      }

      // ── Bullet list mark (-, *, +) → replace with bullet widget ──────────
      if (name === 'ListMark') {
        const list = node.node.parent?.parent
        if (list?.name !== 'BulletList') return
        let depth = 0
        let ancestor = list.parent
        while (ancestor) {
          if (ancestor.name === 'BulletList' || ancestor.name === 'OrderedList') depth++
          ancestor = ancestor.parent
        }
        const line = doc.lineAt(from)
        if (!cursorIn(state, line.from, line.to)) {
          decos.push({ from, to, value: Decoration.replace({ widget: new BulletWidget(depth) }) })
          if (doc.sliceString(to, to + 1) === ' ') {
            decos.push({ from: to, to: to + 1, value: Decoration.replace({}) })
          }
        }
        return false
      }

      // ── Blockquote mark (>) → hide the > and space ────────────────────────
      if (name === 'QuoteMark') {
        const line = doc.lineAt(from)
        if (!cursorIn(state, line.from, line.to)) {
          let markEnd = to
          if (doc.sliceString(markEnd, markEnd + 1) === ' ') markEnd++
          decos.push({ from, to: markEnd, value: Decoration.replace({}) })
        }
        return false
      }

      // ── Links: hide [ ]( url ) markup, keep link text ─────────────────────
      if (name === 'Link') {
        if (!cursorIn(state, from, to)) {
          decos.push({ from, to, value: Decoration.mark({ class: 'cm-md-link' }) })
          const cn = node.node.cursor()
          if (cn.firstChild()) {
            do {
              if (cn.name === 'LinkMark' || cn.name === 'URL') {
                decos.push({ from: cn.from, to: cn.to, value: Decoration.replace({}) })
              }
            } while (cn.nextSibling())
          }
        }
        return false
      }
    },
    leave(node) {
      if (node.name === 'StrongEmphasis' || node.name === 'Emphasis') {
        if (cursorIn(state, node.from, node.to)) {
          cursorEmphDepth = Math.max(0, cursorEmphDepth - 1)
        } else {
          hiddenEmphDepth = Math.max(0, hiddenEmphDepth - 1)
        }
      }
    },
  })

  decos.sort((a, b) => a.from !== b.from ? a.from - b.from : a.to - b.to)
  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to, value } of decos) builder.add(from, to, value)
  return builder.finish()
}

export const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) { this.decorations = buildInlineDecorations(view) }
    update(u: { docChanged: boolean; selectionSet: boolean; viewportChanged: boolean; view: EditorView }) {
      if (u.docChanged || u.selectionSet || u.viewportChanged) {
        this.decorations = buildInlineDecorations(u.view)
      }
    }
  },
  { decorations: (v) => v.decorations }
)

// ── Block decorations (StateField) ────────────────────────────────────────────
// Decoration.line() and Decoration.replace({block:true}) MUST be in a StateField.

function buildBlockDecorations(state: EditorState): DecorationSet {
  const decos: RangeDeco[] = []
  const tree = syntaxTree(state)
  const doc = state.doc

  tree.iterate({
    enter(node) {
      const { from, to, name } = node

      // Heading line decoration
      const hm = name.match(/^ATXHeading([1-6])$/)
      if (hm) {
        if (!cursorIn(state, from, to)) {
          const lineFrom = doc.lineAt(from).from
          decos.push({ from: lineFrom, to: lineFrom, value: Decoration.line({ class: `cm-md-h${hm[1]}` }) })
        }
        return false
      }

      // Blockquote line decoration
      if (name === 'QuoteMark') {
        const line = doc.lineAt(from)
        if (!cursorIn(state, line.from, line.to)) {
          decos.push({ from: line.from, to: line.from, value: Decoration.line({ class: 'cm-md-blockquote' }) })
        }
        return false
      }

      // Horizontal rule: block replace widget
      if (name === 'HorizontalRule') {
        if (!cursorIn(state, from, to)) {
          decos.push({ from, to, value: Decoration.replace({ widget: new HrWidget(), block: true }) })
        }
        return false
      }
    },
  })

  // Scan for markdown tables (line-by-line, no lezer table nodes needed)
  const numLines = doc.lines
  const { violations, activeRules } = state.field(violationsDataField, false) ?? { violations: [] as Violation[], activeRules: new Set<string>() }
  let li = 1
  while (li <= numLines) {
    const line1 = doc.line(li)
    if (!isTableRow(line1.text) || li + 1 > numLines) { li++; continue }
    const line2 = doc.line(li + 1)
    if (!isTableSeparator(line2.text)) { li++; continue }

    const tableLines = [line1, line2]
    let j = li + 2
    while (j <= numLines && isTableRow(doc.line(j).text)) {
      tableLines.push(doc.line(j))
      j++
    }

    const tableFrom = line1.from
    const tableTo = tableLines[tableLines.length - 1].to

    if (!cursorIn(state, tableFrom, tableTo)) {
      const alignments = parseTableCells(tableLines[1].text).map(parseAlignment)
      const headerCells = parseTableCellsWithOffsets(tableLines[0].text, tableLines[0].from)
      const dataRows = tableLines.slice(2).map(l => parseTableCellsWithOffsets(l.text, l.from))
      const tableViolations = violations.filter(v => v.startIndex < tableTo && v.endIndex > tableFrom)
      decos.push({
        from: tableFrom,
        to: tableTo,
        value: Decoration.replace({
          widget: new TableWidget([headerCells, ...dataRows], alignments, tableViolations, activeRules),
          block: true,
        }),
      })
    }

    li = j
  }

  decos.sort((a, b) => a.from !== b.from ? a.from - b.from : a.to - b.to)
  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to, value } of decos) builder.add(from, to, value)
  return builder.finish()
}

export const blockDecorationsField = StateField.define<DecorationSet>({
  create: (state) => buildBlockDecorations(state),
  update: (decos, tr) => {
    if (tr.docChanged || tr.selection || tr.effects.some(e => e.is(setViolationsEffect)))
      return buildBlockDecorations(tr.state)
    return decos.map(tr.changes)
  },
  provide: (f) => EditorView.decorations.from(f),
})

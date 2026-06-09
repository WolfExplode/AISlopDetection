import { ViewPlugin, Decoration, WidgetType, EditorView } from '@codemirror/view'
import type { DecorationSet } from '@codemirror/view'
import { StateField } from '@codemirror/state'
import type { EditorState } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { RangeSetBuilder } from '@codemirror/state'

// ── Widgets ──────────────────────────────────────────────────────────────────

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

  decos.sort((a, b) => a.from !== b.from ? a.from - b.from : a.to - b.to)
  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to, value } of decos) builder.add(from, to, value)
  return builder.finish()
}

export const blockDecorationsField = StateField.define<DecorationSet>({
  create: (state) => buildBlockDecorations(state),
  update: (decos, tr) => {
    if (tr.docChanged || tr.selection) return buildBlockDecorations(tr.state)
    return decos.map(tr.changes)
  },
  provide: (f) => EditorView.decorations.from(f),
})

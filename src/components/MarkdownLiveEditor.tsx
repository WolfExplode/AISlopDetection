import { useEffect, useRef } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { history, historyKeymap, defaultKeymap } from '@codemirror/commands'
import type { Violation } from '../types'
import { livePreviewPlugin, blockDecorationsField } from '../editor/livePreviewPlugin'
import { violationMarksField, violationsDataField, setViolationsEffect } from '../editor/violationMarksExtension'
import { buildEditorTheme } from '../editor/editorTheme'

interface ViolationClickInfo {
  ruleIds: string[]
  startIndex: number
  endIndex: number
  anchorRect: DOMRect
}

interface Props {
  initialText: string
  violations: Violation[]
  activeRules: Set<string>
  dark: boolean
  onChange: (text: string) => void
  onViolationClick: (info: ViolationClickInfo) => void
  onMount?: (view: EditorView) => void
}

export default function MarkdownLiveEditor({
  initialText,
  violations,
  activeRules,
  dark,
  onChange,
  onViolationClick,
  onMount,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const onViolationClickRef = useRef(onViolationClick)
  const textRef = useRef(initialText)
  const themeCompartmentRef = useRef(new Compartment())

  onChangeRef.current = onChange
  onViolationClickRef.current = onViolationClick

  useEffect(() => {
    if (!containerRef.current) return
    const themeCompartment = themeCompartmentRef.current

    const view = new EditorView({
      state: EditorState.create({
        doc: initialText,
        extensions: [
          markdown(),
          livePreviewPlugin,
          blockDecorationsField,
          violationsDataField,
          violationMarksField,
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          themeCompartment.of(buildEditorTheme(dark)),
          EditorView.updateListener.of(update => {
            if (!update.docChanged) return
            const newText = update.state.doc.toString()
            if (newText === textRef.current) return
            textRef.current = newText
            onChangeRef.current(newText)
          }),
          EditorView.domEventHandlers({
            mousedown(event) {
              const target = event.target as HTMLElement
              const violationEl = target.closest('[data-rules]') as HTMLElement | null
              if (!violationEl) return false
              const ruleIds = (violationEl.getAttribute('data-rules') ?? '').split(',').filter(Boolean)
              const startIndex = parseInt(violationEl.getAttribute('data-start') ?? '0', 10)
              const endIndex = parseInt(violationEl.getAttribute('data-end') ?? '0', 10)
              const anchorRect = violationEl.getBoundingClientRect()
              const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
              if (pos !== null) view.dispatch({ selection: { anchor: pos } })
              onViolationClickRef.current({ ruleIds, startIndex, endIndex, anchorRect })
              event.preventDefault()
              return true
            },
          }),
          EditorView.contentAttributes.of({ spellcheck: 'true' }),
        ],
      }),
      parent: containerRef.current,
    })

    viewRef.current = view
    onMount?.(view)

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reconfigure theme when dark mode changes
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: themeCompartmentRef.current.reconfigure(buildEditorTheme(dark)),
    })
  }, [dark])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: setViolationsEffect.of({ violations, activeRules }) })
  }, [violations, activeRules])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === initialText) return
    textRef.current = initialText
    view.dispatch({
      changes: { from: 0, to: current.length, insert: initialText },
    })
  }, [initialText])

  return (
    <div
      ref={containerRef}
      className="cm-editor-container"
      style={{ flex: 1, minHeight: '400px' }}
    />
  )
}

import { useEffect, useRef } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { history, historyKeymap, defaultKeymap } from '@codemirror/commands'
import type { Violation } from '../types'
import { livePreviewPlugin, blockDecorationsField } from '../editor/livePreviewPlugin'
import { violationMarksField, setViolationsEffect } from '../editor/violationMarksExtension'
import { editorTheme } from '../editor/editorTheme'

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
  onChange: (text: string) => void
  onViolationClick: (info: ViolationClickInfo) => void
  onMount?: (view: EditorView) => void
}

export default function MarkdownLiveEditor({
  initialText,
  violations,
  activeRules,
  onChange,
  onViolationClick,
  onMount,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const onViolationClickRef = useRef(onViolationClick)
  const textRef = useRef(initialText)

  // Keep callback refs current without recreating the CM6 view
  onChangeRef.current = onChange
  onViolationClickRef.current = onViolationClick

  // Create the CM6 view once on mount
  useEffect(() => {
    if (!containerRef.current) return

    const view = new EditorView({
      state: EditorState.create({
        doc: initialText,
        extensions: [
          // Language + live preview
          markdown(),
          livePreviewPlugin,
          blockDecorationsField,

          // Violation marks
          violationMarksField,

          // Undo/redo history
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),

          // Theme
          editorTheme,

          // Notify React of text changes
          EditorView.updateListener.of(update => {
            if (!update.docChanged) return
            const newText = update.state.doc.toString()
            if (newText === textRef.current) return
            textRef.current = newText
            onChangeRef.current(newText)
          }),

          // Click handler: detect clicks on violation marks
          EditorView.domEventHandlers({
            mousedown(event) {
              const target = event.target as HTMLElement
              const violationEl = target.closest('[data-rules]') as HTMLElement | null
              if (!violationEl) return false
              const ruleIds = (violationEl.getAttribute('data-rules') ?? '').split(',').filter(Boolean)
              const startIndex = parseInt(violationEl.getAttribute('data-start') ?? '0', 10)
              const endIndex = parseInt(violationEl.getAttribute('data-end') ?? '0', 10)
              const anchorRect = violationEl.getBoundingClientRect()
              onViolationClickRef.current({ ruleIds, startIndex, endIndex, anchorRect })
              event.preventDefault()
              return true
            },
          }),

          // Disable spellcheck override if needed; CM6 enables it by default
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
  }, []) // only on mount

  // Sync violations into CM6 state when they change
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: setViolationsEffect.of({ violations, activeRules }) })
  }, [violations, activeRules])

  // Sync text from React into CM6 when it changes externally (e.g., apply change, undo)
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

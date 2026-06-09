import { EditorView } from '@codemirror/view'

export const editorTheme = EditorView.theme({
  // ── Editor shell ─────────────────────────────────────────────────────────
  '&': {
    fontSize: '18px',
    fontFamily: "'Georgia', 'Times New Roman', serif",
    color: '#1a1a1a',
    background: 'transparent',
    flex: '1',
    width: '100%',
    minWidth: '0',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    overflow: 'visible',
    fontFamily: 'inherit',
    lineHeight: '1.9',
    width: '100%',
  },
  '.cm-content': {
    caretColor: '#2563eb',
    minHeight: '400px',
    padding: '0',
    paddingLeft: '52px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    width: '100%',
    boxSizing: 'border-box',
  },
  '.cm-line': {
    padding: '0',
  },
  '.cm-cursor': {
    borderLeftColor: '#2563eb',
  },
  // Hide CM6's default focus outline
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    background: 'rgba(37, 99, 235, 0.15)',
  },
  '.cm-gutters': { display: 'none' },
  '.cm-activeLineGutter': { display: 'none' },

  // ── Heading styles ────────────────────────────────────────────────────────
  '.cm-md-h1': {
    fontSize: '2em',
    fontWeight: '700',
    lineHeight: '1.3',
    color: '#111',
  },
  '.cm-md-h2': {
    fontSize: '1.6em',
    fontWeight: '700',
    lineHeight: '1.35',
    color: '#1a1a1a',
  },
  '.cm-md-h3': {
    fontSize: '1.3em',
    fontWeight: '600',
    lineHeight: '1.4',
  },
  '.cm-md-h4': {
    fontSize: '1.1em',
    fontWeight: '600',
  },
  '.cm-md-h5': {
    fontSize: '1em',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  '.cm-md-h6': {
    fontSize: '0.9em',
    fontWeight: '600',
    color: '#555',
  },

  // ── Inline markdown styles ─────────────────────────────────────────────────
  '.cm-md-strong': {
    fontWeight: '700',
  },
  '.cm-md-em': {
    fontStyle: 'italic',
  },
  '.cm-md-code': {
    fontFamily: "'SF Mono', Consolas, 'Courier New', monospace",
    fontSize: '0.85em',
    background: 'rgba(0,0,0,0.06)',
    borderRadius: '3px',
    padding: '1px 4px',
  },
  '.cm-md-link': {
    color: '#2563eb',
    textDecoration: 'underline',
    textDecorationColor: 'rgba(37,99,235,0.4)',
    cursor: 'pointer',
  },

  // ── Block element styles ───────────────────────────────────────────────────
  '.cm-md-blockquote': {
    borderLeft: '3px solid #d0ccc5',
    paddingLeft: '1em',
    color: '#666',
    fontStyle: 'italic',
    marginLeft: '0',
  },

  // ── Widget styles ─────────────────────────────────────────────────────────
  '.cm-md-hr-widget': {
    border: 'none',
    borderTop: '1px solid #d0ccc5',
    display: 'block',
    margin: '0.5em 0',
    width: '100%',
  },
  '.cm-md-bullet': {
    color: '#888',
    userSelect: 'none',
    marginRight: '0.1em',
  },

  // ── Violation marks (from violationMarksExtension) ────────────────────────
  '.cm-violation': {
    // Base style — each span overrides with inline style from the rule
  },
})

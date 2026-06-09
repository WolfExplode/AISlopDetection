import { EditorView } from '@codemirror/view'

export function buildEditorTheme(dark: boolean) {
  const text = dark ? '#e8e8e0' : '#1a1a1a'
  const muted = dark ? '#999' : '#666'
  const faint = dark ? '#777' : '#888'
  const link = dark ? '#60a5fa' : '#2563eb'
  const caret = dark ? '#60a5fa' : '#2563eb'
  const selection = dark ? 'rgba(96, 165, 250, 0.2)' : 'rgba(37, 99, 235, 0.15)'
  const codeBg = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const blockquoteBorder = dark ? '#555' : '#d0ccc5'
  const hrBorder = dark ? '#444' : '#d0ccc5'

  return EditorView.theme({
    '&': {
      fontSize: '18px',
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: text,
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
      caretColor: caret,
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
      borderLeftColor: caret,
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      background: selection,
    },
    '.cm-gutters': { display: 'none' },
    '.cm-activeLineGutter': { display: 'none' },

    '.cm-md-h1': {
      fontSize: '2em',
      fontWeight: '700',
      lineHeight: '1.3',
      color: dark ? '#f0f0e8' : '#111',
    },
    '.cm-md-h2': {
      fontSize: '1.6em',
      fontWeight: '700',
      lineHeight: '1.35',
      color: text,
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
      color: faint,
    },
    '.cm-md-strong': {
      fontWeight: '700',
    },
    '.cm-md-em': {
      fontStyle: 'italic',
    },
    '.cm-md-code': {
      fontFamily: "'SF Mono', Consolas, 'Courier New', monospace",
      fontSize: '0.85em',
      background: codeBg,
      borderRadius: '3px',
      padding: '1px 4px',
    },
    '.cm-md-link': {
      color: link,
      textDecoration: 'underline',
      textDecorationColor: dark ? 'rgba(96,165,250,0.4)' : 'rgba(37,99,235,0.4)',
      cursor: 'pointer',
    },
    '.cm-md-blockquote': {
      borderLeft: `3px solid ${blockquoteBorder}`,
      paddingLeft: '1em',
      color: muted,
      fontStyle: 'italic',
      marginLeft: '0',
    },
    '.cm-md-hr-widget': {
      border: 'none',
      borderTop: `1px solid ${hrBorder}`,
      display: 'block',
      margin: '0.5em 0',
      width: '100%',
    },
    '.cm-md-bullet': {
      color: faint,
      userSelect: 'none',
      marginRight: '0.1em',
    },
    '.cm-violation': {
      // Base style — each span overrides with inline style from the rule
    },
  })
}

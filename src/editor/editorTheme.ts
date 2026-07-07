import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

export function buildEditorTheme(dark: boolean) {
  const text = dark ? '#e8e8e0' : '#1a1a1a'
  const muted = dark ? '#999' : '#666'
  const faint = dark ? '#777' : '#888'
  const link = dark ? '#60a5fa' : '#2563eb'
  const caret = dark ? '#60a5fa' : '#2563eb'
  const selection = dark ? 'rgba(96, 165, 250, 0.2)' : 'rgba(37, 99, 235, 0.15)'
  const codeBg = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const codeBlockBg = dark ? 'rgba(255,255,255,0.055)' : 'rgba(17,24,39,0.055)'
  const codeBlockBorder = dark ? 'rgba(255,255,255,0.11)' : 'rgba(17,24,39,0.11)'
  const codeText = dark ? '#e6edf3' : '#111827'
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
    '.cm-md-code-block': {
      fontFamily: "'SF Mono', Consolas, 'Liberation Mono', 'Courier New', monospace",
      fontSize: '0.82em',
      lineHeight: '1.65',
      color: codeText,
      background: codeBlockBg,
      borderLeft: `1px solid ${codeBlockBorder}`,
      borderRight: `1px solid ${codeBlockBorder}`,
      padding: '0 14px',
      whiteSpace: 'pre-wrap',
      overflowWrap: 'anywhere',
    },
    '.cm-md-code-block.cm-md-code-block-first': {
      borderTop: `1px solid ${codeBlockBorder}`,
      borderTopLeftRadius: '6px',
      borderTopRightRadius: '6px',
      paddingTop: '8px',
      marginTop: '0.4em',
    },
    '.cm-md-code-block.cm-md-code-block-last': {
      borderBottom: `1px solid ${codeBlockBorder}`,
      borderBottomLeftRadius: '6px',
      borderBottomRightRadius: '6px',
      paddingBottom: '8px',
      marginBottom: '0.4em',
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
    '.cm-md-hr-line': {
      color: faint,
      textDecoration: `line-through ${hrBorder}`,
      textDecorationThickness: '1px',
    },
    '.cm-md-bullet': {
      color: faint,
      userSelect: 'none',
      marginRight: '0.1em',
    },
    '.cm-violation': {
      // Base style — each span overrides with inline style from the rule
    },
    '.cm-md-table-wrap': {
      overflowX: 'auto',
      width: '100%',
      margin: '0.5em 0',
      whiteSpace: 'normal',
    },
    '.cm-md-table': {
      borderCollapse: 'collapse',
      width: '100%',
      margin: '0',
      fontSize: '1em',
      lineHeight: '1.6',
      fontFamily: 'inherit',
    },
    '.cm-md-table th, .cm-md-table td': {
      border: `1px solid ${dark ? '#3a3a3a' : '#ddd'}`,
      padding: '6px 16px',
      textAlign: 'left',
      verticalAlign: 'top',
    },
    '.cm-md-table th': {
      background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      fontWeight: '700',
      whiteSpace: 'nowrap',
    },
    '.cm-md-table tbody tr:hover td': {
      background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    },
  })
}

export function buildSyntaxHighlighting(dark: boolean) {
  const keyword = dark ? '#ff9d8f' : '#b91c1c'
  const string = dark ? '#9dd672' : '#15803d'
  const number = dark ? '#f0c36a' : '#a16207'
  const functionName = dark ? '#7dd3fc' : '#0369a1'
  const typeName = dark ? '#c4b5fd' : '#7c3aed'
  const propertyName = dark ? '#93c5fd' : '#1d4ed8'
  const variableName = dark ? '#e6edf3' : '#111827'
  const comment = dark ? '#8f9788' : '#6b7280'
  const punctuation = dark ? '#c9c9bd' : '#4b5563'
  const meta = dark ? '#a3a3a3' : '#6b7280'
  const invalid = dark ? '#f87171' : '#dc2626'

  return syntaxHighlighting(HighlightStyle.define([
    { tag: tags.comment, color: comment, fontStyle: 'italic' },
    {
      tag: [
        tags.keyword,
        tags.operatorKeyword,
        tags.controlKeyword,
        tags.definitionKeyword,
        tags.moduleKeyword,
        tags.modifier,
        tags.self,
        tags.unit,
      ],
      color: keyword,
      fontWeight: '600',
    },
    {
      tag: [
        tags.string,
        tags.docString,
        tags.character,
        tags.attributeValue,
        tags.regexp,
        tags.escape,
        tags.special(tags.string),
      ],
      color: string,
    },
    {
      tag: [
        tags.number,
        tags.integer,
        tags.float,
        tags.bool,
        tags.null,
        tags.atom,
        tags.literal,
      ],
      color: number,
    },
    {
      tag: [
        tags.definition(tags.variableName),
        tags.function(tags.variableName),
        tags.function(tags.propertyName),
        tags.labelName,
        tags.macroName,
      ],
      color: functionName,
    },
    { tag: [tags.className, tags.typeName, tags.namespace], color: typeName },
    { tag: [tags.propertyName, tags.attributeName], color: propertyName },
    { tag: tags.variableName, color: variableName },
    {
      tag: [
        tags.operator,
        tags.arithmeticOperator,
        tags.logicOperator,
        tags.compareOperator,
        tags.bitwiseOperator,
        tags.punctuation,
        tags.bracket,
        tags.separator,
      ],
      color: punctuation,
    },
    { tag: [tags.tagName, tags.heading, tags.link], color: functionName },
    { tag: [tags.meta, tags.processingInstruction, tags.annotation], color: meta },
    { tag: tags.invalid, color: invalid, textDecoration: 'underline wavy' },
  ]))
}

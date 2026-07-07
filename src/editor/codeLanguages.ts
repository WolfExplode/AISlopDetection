import { LanguageDescription, LanguageSupport, StreamLanguage } from '@codemirror/language'

function legacy(parser: Parameters<typeof StreamLanguage.define>[0]) {
  return new LanguageSupport(StreamLanguage.define(parser))
}

export const commonCodeLanguages = [
  LanguageDescription.of({
    name: 'JavaScript',
    alias: ['js', 'node', 'mjs', 'cjs'],
    extensions: ['js', 'mjs', 'cjs'],
    load: () => import('@codemirror/lang-javascript').then(m => m.javascript()),
  }),
  LanguageDescription.of({
    name: 'TypeScript',
    alias: ['ts'],
    extensions: ['ts', 'mts', 'cts'],
    load: () => import('@codemirror/lang-javascript').then(m => m.javascript({ typescript: true })),
  }),
  LanguageDescription.of({
    name: 'JSX',
    extensions: ['jsx'],
    load: () => import('@codemirror/lang-javascript').then(m => m.javascript({ jsx: true })),
  }),
  LanguageDescription.of({
    name: 'TSX',
    extensions: ['tsx'],
    load: () => import('@codemirror/lang-javascript').then(m => m.javascript({ jsx: true, typescript: true })),
  }),
  LanguageDescription.of({
    name: 'HTML',
    alias: ['htm', 'xhtml'],
    extensions: ['html', 'htm', 'xhtml'],
    load: () => import('@codemirror/lang-html').then(m => m.html()),
  }),
  LanguageDescription.of({
    name: 'CSS',
    extensions: ['css'],
    load: () => import('@codemirror/lang-css').then(m => m.css()),
  }),
  LanguageDescription.of({
    name: 'SCSS',
    extensions: ['scss'],
    load: () => import('@codemirror/lang-sass').then(m => m.sass()),
  }),
  LanguageDescription.of({
    name: 'Sass',
    extensions: ['sass'],
    load: () => import('@codemirror/lang-sass').then(m => m.sass({ indented: true })),
  }),
  LanguageDescription.of({
    name: 'JSON',
    alias: ['json5'],
    extensions: ['json', 'json5', 'map'],
    load: () => import('@codemirror/lang-json').then(m => m.json()),
  }),
  LanguageDescription.of({
    name: 'YAML',
    alias: ['yml'],
    extensions: ['yaml', 'yml'],
    load: () => import('@codemirror/lang-yaml').then(m => m.yaml()),
  }),
  LanguageDescription.of({
    name: 'XML',
    extensions: ['xml', 'svg', 'rss'],
    load: () => import('@codemirror/lang-xml').then(m => m.xml()),
  }),
  LanguageDescription.of({
    name: 'Python',
    alias: ['py'],
    extensions: ['py', 'pyw'],
    load: () => import('@codemirror/lang-python').then(m => m.python()),
  }),
  LanguageDescription.of({
    name: 'Go',
    alias: ['golang'],
    extensions: ['go'],
    load: () => import('@codemirror/lang-go').then(m => m.go()),
  }),
  LanguageDescription.of({
    name: 'Rust',
    alias: ['rs'],
    extensions: ['rs'],
    load: () => import('@codemirror/lang-rust').then(m => m.rust()),
  }),
  LanguageDescription.of({
    name: 'Java',
    extensions: ['java'],
    load: () => import('@codemirror/lang-java').then(m => m.java()),
  }),
  LanguageDescription.of({
    name: 'C',
    extensions: ['c', 'h'],
    load: () => import('@codemirror/lang-cpp').then(m => m.cpp()),
  }),
  LanguageDescription.of({
    name: 'C++',
    alias: ['cpp', 'cxx', 'cc', 'hpp'],
    extensions: ['cpp', 'cxx', 'cc', 'hpp', 'hh', 'hxx'],
    load: () => import('@codemirror/lang-cpp').then(m => m.cpp()),
  }),
  LanguageDescription.of({
    name: 'C#',
    alias: ['csharp', 'cs'],
    extensions: ['cs'],
    load: () => import('@codemirror/legacy-modes/mode/clike').then(m => legacy(m.csharp)),
  }),
  LanguageDescription.of({
    name: 'Kotlin',
    alias: ['kt'],
    extensions: ['kt', 'kts'],
    load: () => import('@codemirror/legacy-modes/mode/clike').then(m => legacy(m.kotlin)),
  }),
  LanguageDescription.of({
    name: 'PHP',
    extensions: ['php'],
    load: () => import('@codemirror/lang-php').then(m => m.php({ plain: true })),
  }),
  LanguageDescription.of({
    name: 'SQL',
    extensions: ['sql'],
    load: () => import('@codemirror/lang-sql').then(m => m.sql({ dialect: m.StandardSQL })),
  }),
  LanguageDescription.of({
    name: 'MySQL',
    extensions: ['mysql'],
    load: () => import('@codemirror/lang-sql').then(m => m.sql({ dialect: m.MySQL })),
  }),
  LanguageDescription.of({
    name: 'PostgreSQL',
    alias: ['postgres', 'pgsql'],
    extensions: ['pgsql'],
    load: () => import('@codemirror/lang-sql').then(m => m.sql({ dialect: m.PostgreSQL })),
  }),
  LanguageDescription.of({
    name: 'SQLite',
    extensions: ['sqlite', 'sqlite3'],
    load: () => import('@codemirror/lang-sql').then(m => m.sql({ dialect: m.SQLite })),
  }),
  LanguageDescription.of({
    name: 'Shell',
    alias: ['sh', 'bash', 'zsh'],
    extensions: ['sh', 'bash', 'zsh'],
    load: () => import('@codemirror/legacy-modes/mode/shell').then(m => legacy(m.shell)),
  }),
  LanguageDescription.of({
    name: 'PowerShell',
    alias: ['ps1', 'pwsh'],
    extensions: ['ps1', 'psm1'],
    load: () => import('@codemirror/legacy-modes/mode/powershell').then(m => legacy(m.powerShell)),
  }),
  LanguageDescription.of({
    name: 'Ruby',
    alias: ['rb'],
    extensions: ['rb'],
    load: () => import('@codemirror/legacy-modes/mode/ruby').then(m => legacy(m.ruby)),
  }),
  LanguageDescription.of({
    name: 'Lua',
    extensions: ['lua'],
    load: () => import('@codemirror/legacy-modes/mode/lua').then(m => legacy(m.lua)),
  }),
  LanguageDescription.of({
    name: 'Vue',
    extensions: ['vue'],
    load: () => import('@codemirror/lang-vue').then(m => m.vue()),
  }),
]

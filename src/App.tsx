import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { EditorView } from '@codemirror/view'
import { RULES, RULES_BY_ID } from './rules'
import type { Violation } from './types'
import { runClientDetectors } from './detectors/index'
import { runLLMDetectors, runDocumentDetectors, rewriteParagraph, buildRewriteSystemPrompt, type LLMProvider, type LocalConfig } from './detectors/llmDetectors'
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import Popover, { type PopoverState } from './components/Popover'
import ParaRewritePopover from './components/ParaRewritePopover'
import MarkdownLiveEditor from './components/MarkdownLiveEditor'
import { useHashText } from './hooks/useHashText'
import { useDarkMode } from './hooks/useDarkMode'
import { ThemeContext, lightTheme, darkTheme } from './theme'
import { SAMPLE_TEXT } from './data/sampleText'
import SAMPLE_VIOLATIONS from './data/sampleViolations.json'

const DEBOUNCE_MS = 350
const LEGACY_ANTHROPIC_API_KEY_STORAGE = 'anthropic-api-key'
const LLM_API_KEY_STORAGE = 'llm-api-key'
const LLM_PROVIDER_STORAGE = 'llm-provider'
const LLM_LOCAL_CONFIG_STORAGE = 'llm-local-config'

function isLLMProvider(value: string | null): value is LLMProvider {
  return value === 'anthropic' || value === 'openai' || value === 'local'
}

export default function App() {
  const [darkMode, toggleDark] = useDarkMode()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const [text, setText] = useState(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return SAMPLE_TEXT
    try { return decodeURIComponent(hash) } catch { return SAMPLE_TEXT }
  })
  useHashText(text)
  const isDefaultText = text === SAMPLE_TEXT
  const [clientViolations, setClientViolations] = useState<Violation[]>([])
  const [llmViolations, setLlmViolations] = useState<Violation[]>(
    isDefaultText ? (SAMPLE_VIOLATIONS as Violation[]) : []
  )
  const [hiddenRules, setHiddenRules] = useState<Set<string>>(new Set())
  const [provider, setProvider] = useState<LLMProvider>(() => {
    const stored = localStorage.getItem(LLM_PROVIDER_STORAGE)
    if (isLLMProvider(stored)) return stored
    return 'anthropic'
  })
  const [apiKey, setApiKey] = useState(() => (
    localStorage.getItem(LLM_API_KEY_STORAGE)
    ?? localStorage.getItem(LEGACY_ANTHROPIC_API_KEY_STORAGE)
    ?? ''
  ))
  const [localConfig, setLocalConfig] = useState<LocalConfig | null>(() => {
    const stored = localStorage.getItem(LLM_LOCAL_CONFIG_STORAGE)
    if (!stored) return null
    try { return JSON.parse(stored) as LocalConfig } catch { return null }
  })
  const [llmStatus, setLlmStatus] = useState<'idle' | 'loading' | 'done' | 'stale' | 'error'>(
    isDefaultText ? 'done' : 'idle'
  )
  const [llmError, setLlmError] = useState('')
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const [hoveredRuleId, setHoveredRuleId] = useState<string | null>(null)

  // CM6 EditorView instance — populated when MarkdownLiveEditor mounts
  const editorViewRef = useRef<EditorView | null>(null)
  const editorScrollRef = useRef<HTMLDivElement>(null)
  const violationCursorRef = useRef<Map<string, number>>(new Map())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track current text immediately (not just on re-render) for use in callbacks
  const textRef = useRef(text)
  textRef.current = text
  const violationsRef = useRef<Violation[]>([])
  const lastAnalyzedTextRef = useRef<string>(isDefaultText ? SAMPLE_TEXT : '')

  // Paragraph rewrite state
  const [hoveredPara, setHoveredPara] = useState<{
    idx: number; text: string; start: number; end: number
    buttonLeft: number; buttonTop: number
  } | null>(null)
  const [rewritePopover, setRewritePopover] = useState<{
    paraText: string; paraStart: number; paraEnd: number
    buttonLeft: number; buttonTop: number
    rewritten: string | null; error: string | null; loading: boolean
    debugPrompt: string
    noApiKey?: boolean
  } | null>(null)
  const sparkleButtonRef = useRef<HTMLDivElement>(null)

  const [sidebarWidth, setSidebarWidth] = useState(350)
  const isDraggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartWidthRef = useRef(0)

  const [sparkleHovered, setSparkleHovered] = useState(false)
  const [paraHighlightRect, setParaHighlightRect] = useState<DOMRect | null>(null)
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; text: string; top: number; height: number; buttonLeft: number } | null>(null)
  const [selectionBtnHovered, setSelectionBtnHovered] = useState(false)
  const rewritePopoverRef = useRef(rewritePopover)
  const mouseMoveThrottleRef = useRef<number>(0)

  // Re-resolve LLM violation positions from matchedText on every text change.
  const allViolations = useMemo(() => {
    const resolved = llmViolations.flatMap(v => {
      if (!v.matchedText) return [v]
      const hint = Math.max(0, v.startIndex - 200)
      let idx = text.indexOf(v.matchedText, hint)
      if (idx === -1) idx = text.indexOf(v.matchedText)
      if (idx !== -1) return [{ ...v, startIndex: idx, endIndex: idx + v.matchedText.length }]
      return []
    })
    return [...clientViolations, ...resolved]
  }, [clientViolations, llmViolations, text])

  violationsRef.current = allViolations

  const activeRules = useMemo(
    () => new Set(RULES.filter(r => !hiddenRules.has(r.id)).map(r => r.id)),
    [hiddenRules]
  )

  // Run client detectors on text change (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setClientViolations(text.trim() ? runClientDetectors(text) : [])
    }, DEBOUNCE_MS)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [text])

  // Dim all text and non-matching marks when hovering a sidebar rule
  useEffect(() => {
    const view = editorViewRef.current
    if (!view) return
    const contentDOM = view.contentDOM

    if (!hoveredRuleId) {
      contentDOM.style.color = ''
      contentDOM.querySelectorAll<HTMLElement>('[data-rules]').forEach(m => {
        m.style.opacity = ''
        m.style.color = ''
        if (m.dataset.hoverOverridden) {
          m.style.background = m.dataset.origBg ?? ''
          m.style.borderBottom = m.dataset.origBorderBottom ?? ''
          delete m.dataset.hoverOverridden
          delete m.dataset.origBg
          delete m.dataset.origBorderBottom
        }
      })
      return
    }
    const hoveredRule = RULES_BY_ID[hoveredRuleId]
    const dimColor = darkMode ? 'rgba(232,232,224,0.12)' : 'rgba(26,26,26,0.15)'
    const activeTextColor = darkMode ? '#e8e8e0' : '#1a1a1a'
    contentDOM.style.color = dimColor
    contentDOM.querySelectorAll<HTMLElement>('[data-rules]').forEach(m => {
      const rules = (m.getAttribute('data-rules') ?? '').split(',')
      if (rules.includes(hoveredRuleId)) {
        m.style.opacity = '1'
        m.style.color = activeTextColor
        if (hoveredRule && !m.dataset.hoverOverridden) {
          m.dataset.hoverOverridden = '1'
          m.dataset.origBg = m.style.background
          m.dataset.origBorderBottom = m.style.borderBottom
          m.style.background = hoveredRule.bgColor
          m.style.borderBottom = `2px solid ${hoveredRule.color}`
        }
      } else {
        m.style.opacity = '0.45'
        m.style.color = ''
      }
    })

    // Scroll a matching mark into view if none are visible
    const scroll = editorScrollRef.current
    if (!scroll) return
    const matchingMarks = Array.from(
      contentDOM.querySelectorAll<HTMLElement>('[data-rules]')
    ).filter(m => (m.getAttribute('data-rules') ?? '').split(',').includes(hoveredRuleId))
    if (matchingMarks.length === 0) return
    const scrollRect = scroll.getBoundingClientRect()
    const anyVisible = matchingMarks.some(m => {
      const r = m.getBoundingClientRect()
      return r.bottom > scrollRect.top && r.top < scrollRect.bottom
    })
    if (!anyVisible) {
      const target = matchingMarks[0]
      const targetRect = target.getBoundingClientRect()
      const targetMid = targetRect.top - scrollRect.top + scroll.scrollTop + targetRect.height / 2
      scroll.scrollTo({ top: targetMid - scroll.clientHeight / 2, behavior: 'smooth' })
    }
  }, [hoveredRuleId, darkMode])

  // Reset sparkle hover state when the paragraph changes
  useEffect(() => {
    setSparkleHovered(false)
    setParaHighlightRect(null)
  }, [hoveredPara?.idx])

  // Dim violation marks within the hovered paragraph when sparkle button is hovered
  useEffect(() => {
    const view = editorViewRef.current
    if (!sparkleHovered || !hoveredPara || !view) return
    const marks = view.contentDOM.querySelectorAll<HTMLElement>('[data-rules]')
    const affected: HTMLElement[] = []
    marks.forEach(mark => {
      const s = parseInt(mark.getAttribute('data-start') ?? '-1')
      const e = parseInt(mark.getAttribute('data-end') ?? '-1')
      if (s >= hoveredPara.start && e <= hoveredPara.end) {
        mark.classList.add('mark-dimmed')
        affected.push(mark)
      }
    })
    return () => { affected.forEach(m => m.classList.remove('mark-dimmed')) }
  }, [sparkleHovered, hoveredPara])

  const applyTextChange = useCallback((startIndex: number, endIndex: number, replacement: string) => {
    const current = textRef.current
    const newText = cleanupAfterEdit(current.slice(0, startIndex) + replacement + current.slice(endIndex))
    textRef.current = newText
    // Run detectors immediately (avoids flash before debounce)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setClientViolations(newText.trim() ? runClientDetectors(newText) : [])
    setText(newText)
    setPopover(null)
    setLlmStatus(s => (s === 'done' || s === 'error') ? 'stale' : s)
  }, [])

  const runLLM = useCallback(async () => {
    if (!apiKey || !text.trim()) return
    lastAnalyzedTextRef.current = text
    setLlmStatus('loading')
    setLlmError('')

    const collected: Violation[] = []
    let pending = 2
    const errors: string[] = []

    const oneDone = () => {
      pending--
      if (pending === 0) {
        setLlmViolations(collected)
        setLlmStatus(errors.length > 0 ? 'error' : 'done')
        if (errors.length > 0) setLlmError(errors.join(' | '))
      }
    }

    runLLMDetectors(text, apiKey, undefined, provider, localConfig ?? undefined)
      .then(results => { collected.push(...results) })
      .catch(e => { errors.push(e instanceof Error ? e.message : String(e)) })
      .finally(oneDone)

    runDocumentDetectors(text, apiKey, undefined, provider, localConfig ?? undefined)
      .then(results => { collected.push(...results) })
      .catch(e => { errors.push(e instanceof Error ? e.message : String(e)) })
      .finally(oneDone)
  }, [apiKey, localConfig, provider, text])

  const handleEditorChange = useCallback((newText: string) => {
    textRef.current = newText
    setText(newText)
    setPopover(null)
    setLlmStatus(s => (s === 'done' || s === 'error') ? 'stale' : s)
  }, [])

  // Click on a violation mark → open popover (called by MarkdownLiveEditor)
  const handleViolationClick = useCallback(({ ruleIds, startIndex, endIndex, anchorRect }: {
    ruleIds: string[]
    startIndex: number
    endIndex: number
    anchorRect: DOMRect
  }) => {
    const rules = ruleIds
      .map(id => RULES_BY_ID[id])
      .filter((r): r is NonNullable<typeof r> => !!r)
    if (rules.length === 0) return

    const violations = ruleIds.map(ruleId => {
      const v = violationsRef.current.find(
        v2 => v2.ruleId === ruleId && v2.startIndex <= startIndex && v2.endIndex >= endIndex
      ) ?? violationsRef.current.find(
        v2 => v2.ruleId === ruleId && Math.abs(v2.startIndex - startIndex) < 20
      )

      let clusterWeight: number | undefined
      let clusterSize: number | undefined
      if (v?.groupKey) {
        const group = violationsRef.current.filter(
          x => x.ruleId === ruleId && x.groupKey === v.groupKey
        )
        clusterSize = group.length
        clusterWeight = group.reduce((sum, x) => sum + (x.weight ?? 1.0), 0) / group.length
      }

      return {
        startIndex: v?.startIndex ?? startIndex,
        endIndex: v?.endIndex ?? endIndex,
        matchedText: v?.matchedText ?? textRef.current.slice(startIndex, endIndex),
        weight: v?.weight,
        clusterWeight,
        clusterSize,
        explanation: v?.explanation,
        suggestedChange: v?.suggestedChange,
        applyStartIndex: v?.applyStartIndex,
        applyEndIndex: v?.applyEndIndex,
        applyReplacement: v?.applyReplacement,
      }
    })

    setPopover({ rules, violations, anchorRect, ruleIndex: 0 })
  }, [])

  const handleEditorMouseMove = useCallback((e: React.MouseEvent) => {
    if (rewritePopover) return
    const now = Date.now()
    if (now - mouseMoveThrottleRef.current < 60) return
    mouseMoveThrottleRef.current = now

    const view = editorViewRef.current
    if (!view || !textRef.current.trim()) { setHoveredPara(null); return }

    const target = e.target as Node
    if (sparkleButtonRef.current?.contains(target)) return

    // Use CM6 to convert mouse coords to document position
    const pos = view.posAtCoords({ x: e.clientX, y: e.clientY })
    if (pos === null) { setHoveredPara(null); return }

    const para = findParagraphAtOffset(textRef.current, pos)

    const scroll = editorScrollRef.current
    const scrollTop = scroll ? scroll.scrollTop : 0
    const scrollRect = scroll ? scroll.getBoundingClientRect() : { top: 0, left: 0 }

    const coords = view.coordsAtPos(Math.min(para.start, view.state.doc.length))
    if (!coords) { setHoveredPara(null); return }

    if (e.clientY < coords.top - 5) { setHoveredPara(null); return }

    const editorDomRect = view.dom.getBoundingClientRect()
    const buttonTop = coords.top - scrollRect.top + scrollTop
    const buttonLeft = editorDomRect.left + 44 - scrollRect.left

    setHoveredPara(prev => {
      if (prev?.idx === para.idx && Math.abs(prev.buttonTop - buttonTop) < 2) return prev
      return { idx: para.idx, text: para.text, start: para.start, end: para.end, buttonLeft, buttonTop }
    })
  }, [rewritePopover])

  const handleEditorMouseLeave = useCallback(() => {
    setHoveredPara(null)
  }, [])

  useEffect(() => { rewritePopoverRef.current = rewritePopover }, [rewritePopover])

  const checkEditorSelection = useCallback(() => {
    const view = editorViewRef.current
    if (!view || rewritePopover) return

    const { main } = view.state.selection
    if (main.empty) { setSelectionRange(null); return }

    const start = main.from
    const end = main.to
    const selectedText = textRef.current.slice(start, end)
    if (selectedText.trim().length < 80) { setSelectionRange(null); return }

    // Use DOM selection for the bounding rect (CM6 keeps a real DOM selection)
    const domSel = window.getSelection()
    if (!domSel || domSel.isCollapsed || domSel.rangeCount === 0) { setSelectionRange(null); return }
    const domRange = domSel.getRangeAt(0)
    if (!view.dom.contains(domRange.commonAncestorContainer)) { setSelectionRange(null); return }

    const validRects = Array.from(domRange.getClientRects()).filter(r => r.height > 0)
    if (!validRects.length) { setSelectionRange(null); return }

    const scroll = editorScrollRef.current
    const scrollTop = scroll ? scroll.scrollTop : 0
    const scrollRect = scroll ? scroll.getBoundingClientRect() : { top: 0, left: 0 }

    const top = validRects[0].top - scrollRect.top + scrollTop
    const height = validRects[validRects.length - 1].bottom - validRects[0].top
    const buttonLeft = view.dom.getBoundingClientRect().left + 44 - scrollRect.left

    setSelectionRange({ start, end, text: selectedText, top, height, buttonLeft })
  }, [rewritePopover])

  const handleEditorMouseUp = checkEditorSelection

  useEffect(() => {
    const handle = () => {
      if (rewritePopoverRef.current) return
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) { setSelectionRange(null); return }
      checkEditorSelection()
    }
    document.addEventListener('selectionchange', handle)
    return () => document.removeEventListener('selectionchange', handle)
  }, [checkEditorSelection])

  const handleSelectionRewrite = useCallback(async () => {
    if (!selectionRange) return
    const { text: paraText, start: paraStart, end: paraEnd, top, height, buttonLeft } = selectionRange
    const scroll = editorScrollRef.current
    const scrollTop = scroll ? scroll.scrollTop : 0
    const scrollRectTop = scroll ? scroll.getBoundingClientRect().top : 0
    const scrollRectLeft = scroll ? scroll.getBoundingClientRect().left : 0
    const buttonTop = top - scrollTop + scrollRectTop + height / 2
    const buttonLeftViewport = buttonLeft + scrollRectLeft

    if (!apiKey) {
      setRewritePopover({ paraText, paraStart, paraEnd, buttonLeft: buttonLeftViewport, buttonTop, rewritten: null, error: null, loading: false, debugPrompt: '', noApiKey: true })
      return
    }

    const paraViolations = violationsRef.current.filter(
      v => v.startIndex >= paraStart && v.endIndex <= paraEnd + 2
    )
    const byRule = new Map<string, string[]>()
    for (const v of paraViolations) {
      if (!byRule.has(v.ruleId)) byRule.set(v.ruleId, [])
      byRule.get(v.ruleId)!.push(v.matchedText.trim())
    }
    const ruleHints: string[] = []
    for (const [ruleId, matches] of byRule) {
      const hint = RULES_BY_ID[ruleId]?.rewriteHint
      if (!hint) continue
      const directive = RULES_BY_ID[ruleId]?.llmDirective ?? hint
      const cited = matches.slice(0, 4).map(m => `"${m.length > 70 ? m.slice(0, 70) + '…' : m}"`).join(', ')
      ruleHints.push(`${directive} — flagged in this selection: ${cited}`)
    }

    const debugPrompt = buildRewriteSystemPrompt(ruleHints)
    setRewritePopover({ paraText, paraStart, paraEnd, buttonLeft: buttonLeftViewport, buttonTop, rewritten: null, error: null, loading: true, debugPrompt })

    try {
      const result = await rewriteParagraph(paraText, ruleHints, apiKey, provider, localConfig ?? undefined)
      setRewritePopover(prev => prev ? { ...prev, rewritten: result, loading: false } : null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setRewritePopover(prev => prev ? { ...prev, error: msg, loading: false } : null)
    }
  }, [selectionRange, apiKey, localConfig, provider])

  const handleSparkleClick = useCallback(async () => {
    if (!hoveredPara) return
    const { text: paraText, start: paraStart, end: paraEnd, buttonLeft, buttonTop } = hoveredPara
    const scroll = editorScrollRef.current
    const scrollTop = scroll ? scroll.scrollTop : 0
    const scrollRect = scroll ? scroll.getBoundingClientRect() : { top: 0, left: 0 }
    const buttonTopVp = buttonTop - scrollTop + scrollRect.top
    const buttonLeftVp = buttonLeft + scrollRect.left

    if (!apiKey) {
      setRewritePopover({ paraText, paraStart, paraEnd, buttonLeft: buttonLeftVp, buttonTop: buttonTopVp, rewritten: null, error: null, loading: false, debugPrompt: '', noApiKey: true })
      setHoveredPara(null)
      return
    }

    const paraViolations = violationsRef.current.filter(
      v => v.startIndex >= paraStart && v.endIndex <= paraEnd + 2
    )
    const byRule = new Map<string, string[]>()
    for (const v of paraViolations) {
      if (!byRule.has(v.ruleId)) byRule.set(v.ruleId, [])
      byRule.get(v.ruleId)!.push(v.matchedText.trim())
    }
    const ruleHints: string[] = []
    for (const [ruleId, matches] of byRule) {
      const hint = RULES_BY_ID[ruleId]?.rewriteHint
      if (!hint) continue
      const directive = RULES_BY_ID[ruleId]?.llmDirective ?? hint
      const cited = matches.slice(0, 4).map(m => `"${m.length > 70 ? m.slice(0, 70) + '…' : m}"`).join(', ')
      ruleHints.push(`${directive} — flagged in this paragraph: ${cited}`)
    }

    const debugPrompt = buildRewriteSystemPrompt(ruleHints)
    setRewritePopover({ paraText, paraStart, paraEnd, buttonLeft: buttonLeftVp, buttonTop: buttonTopVp, rewritten: null, error: null, loading: true, debugPrompt })
    setHoveredPara(null)

    try {
      const result = await rewriteParagraph(paraText, ruleHints, apiKey, provider, localConfig ?? undefined)
      setRewritePopover(prev => prev ? { ...prev, rewritten: result, loading: false } : null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setRewritePopover(prev => prev ? { ...prev, error: msg, loading: false } : null)
    }
  }, [hoveredPara, apiKey, localConfig, provider])

  const applyRewrite = useCallback(() => {
    if (!rewritePopover || rewritePopover.rewritten === null) return
    const { paraStart, paraEnd, rewritten } = rewritePopover
    applyTextChange(paraStart, paraEnd, rewritten)
    setRewritePopover(null)
  }, [rewritePopover, applyTextChange])

  const handleViolationBadgeClick = useCallback((ruleId: string) => {
    const view = editorViewRef.current
    const scroll = editorScrollRef.current
    if (!view || !scroll) return
    const marks = Array.from(
      view.contentDOM.querySelectorAll<HTMLElement>('[data-rules]')
    ).filter(m => (m.getAttribute('data-rules') ?? '').split(',').includes(ruleId))
    if (marks.length === 0) return
    const cursor = violationCursorRef.current
    const idx = (cursor.get(ruleId) ?? 0) % marks.length
    cursor.set(ruleId, idx + 1)
    const target = marks[idx]
    // Scroll the target to the center of the editor scroll container directly,
    // bypassing scrollIntoView which can mis-target when elements are above the viewport.
    const containerRect = scroll.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const targetMid = targetRect.top - containerRect.top + scroll.scrollTop + targetRect.height / 2
    scroll.scrollTo({ top: targetMid - scroll.clientHeight / 2, behavior: 'smooth' })
    target.classList.remove('mark-flash')
    // Force reflow so re-clicking the same mark re-triggers the animation
    void target.offsetWidth
    target.classList.add('mark-flash')
    target.addEventListener('animationend', () => target.classList.remove('mark-flash'), { once: true })
  }, [])

  const toggleRule = (ruleId: string) => {
    setHiddenRules(prev => {
      const next = new Set(prev)
      if (next.has(ruleId)) next.delete(ruleId)
      else next.add(ruleId)
      return next
    })
    setPopover(null)
  }

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    dragStartXRef.current = e.clientX
    dragStartWidthRef.current = sidebarWidth

    const onMouseMove = (me: MouseEvent) => {
      if (!isDraggingRef.current) return
      const delta = dragStartXRef.current - me.clientX
      setSidebarWidth(Math.max(180, Math.min(520, dragStartWidthRef.current + delta)))
    }
    const onMouseUp = () => {
      isDraggingRef.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [sidebarWidth])

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length
  const stalePct = llmStatus === 'stale' ? stalePercent(lastAnalyzedTextRef.current, text) : 0

  const theme = darkMode ? darkTheme : lightTheme

  return (
    <ThemeContext.Provider value={theme}>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: theme.bg }}>
      <Toolbar
        apiKey={apiKey}
        provider={provider}
        localConfig={localConfig}
        darkMode={darkMode}
        onToggleDark={toggleDark}
        onCredentialsSave={(nextProvider, key, nextLocalConfig) => {
          setProvider(nextProvider)
          localStorage.setItem(LLM_PROVIDER_STORAGE, nextProvider)
          if (nextProvider === 'local') {
            setApiKey(key || 'local')
            setLocalConfig(nextLocalConfig ?? null)
            localStorage.removeItem(LLM_API_KEY_STORAGE)
            localStorage.removeItem(LEGACY_ANTHROPIC_API_KEY_STORAGE)
            if (nextLocalConfig) localStorage.setItem(LLM_LOCAL_CONFIG_STORAGE, JSON.stringify(nextLocalConfig))
          } else {
            setApiKey(key)
            setLocalConfig(null)
            localStorage.setItem(LLM_API_KEY_STORAGE, key)
            if (nextProvider === 'anthropic') localStorage.setItem(LEGACY_ANTHROPIC_API_KEY_STORAGE, key)
            else localStorage.removeItem(LEGACY_ANTHROPIC_API_KEY_STORAGE)
            localStorage.removeItem(LLM_LOCAL_CONFIG_STORAGE)
          }
        }}
        onApiKeyRemove={() => {
          setApiKey('')
          setProvider('anthropic')
          setLocalConfig(null)
          localStorage.removeItem(LLM_API_KEY_STORAGE)
          localStorage.removeItem(LLM_PROVIDER_STORAGE)
          localStorage.removeItem(LEGACY_ANTHROPIC_API_KEY_STORAGE)
          localStorage.removeItem(LLM_LOCAL_CONFIG_STORAGE)
        }}
        onRunLLM={runLLM}
        llmStatus={llmStatus}
        stalePct={stalePct}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main editor scroll container */}
        <div
          ref={editorScrollRef}
          className="editor-scroll"
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '48px 64px 80px', position: 'relative' }}
          onMouseMove={handleEditorMouseMove}
          onMouseLeave={handleEditorMouseLeave}
          onMouseUp={handleEditorMouseUp}
        >
          <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', minWidth: '0' }}>
            {llmError && (
              <div style={{
                marginBottom: '16px', padding: '10px 14px',
                background: theme.redBg, border: `1px solid ${theme.redBorder}`,
                borderRadius: '6px', fontSize: '13px', color: theme.red,
                fontFamily: 'sans-serif',
              }}>
                API error: {llmError}
              </div>
            )}
            {!text.trim() && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: '52px',
                pointerEvents: 'none',
                fontSize: '18px',
                lineHeight: '1.9',
                fontFamily: "'Georgia', 'Times New Roman', serif",
                color: theme.textFaintest,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '22px', opacity: 0.4 }}>✏</span>
                Write here…
              </div>
            )}

            <MarkdownLiveEditor
              initialText={text}
              violations={allViolations}
              activeRules={activeRules}
              dark={darkMode}
              onChange={handleEditorChange}
              onViolationClick={handleViolationClick}
              onMount={(view) => { editorViewRef.current = view }}
            />
          </div>

          {/* Selection rewrite button */}
          {selectionRange && !rewritePopover && (
            <div
              style={{
                position: 'absolute',
                left: selectionRange.buttonLeft,
                top: selectionRange.top + selectionRange.height / 2,
                transform: 'translate(-100%, -50%)',
                zIndex: 50,
              }}
            >
              <button
                onMouseDown={e => { e.preventDefault(); handleSelectionRewrite() }}
                onMouseEnter={() => setSelectionBtnHovered(true)}
                onMouseLeave={() => setSelectionBtnHovered(false)}
                style={{
                  position: 'relative',
                  background: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  padding: '4px 10px 4px 9px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontFamily: 'sans-serif',
                  color: theme.textFaint,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  whiteSpace: 'nowrap',
                  minWidth: '120px',
                }}
              >
                <span style={{ fontSize: '12px', lineHeight: 1 }}>✨</span>
                <span style={{ color: selectionBtnHovered ? theme.text : theme.textFaint }}>Rewrite selection</span>
                <div style={{ position: 'absolute', right: '-8px', top: '50%', marginTop: '-6px', width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: `8px solid ${theme.border}` }} />
                <div style={{ position: 'absolute', right: '-7px', top: '50%', marginTop: '-6px', width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: `8px solid ${theme.surface}` }} />
              </button>
            </div>
          )}

          {/* Sparkle paragraph rewrite button */}
          {hoveredPara && !rewritePopover && !selectionRange && (
            <div
              ref={sparkleButtonRef}
              style={{
                position: 'absolute',
                left: hoveredPara.buttonLeft,
                top: hoveredPara.buttonTop,
                transform: 'translateX(-100%)',
                zIndex: 50,
              }}
            >
              <button
                onMouseDown={handleSparkleClick}
                onMouseEnter={() => {
                  setSparkleHovered(true)
                  const view = editorViewRef.current
                  if (view && hoveredPara) {
                    setParaHighlightRect(getParagraphBoundingRectFromView(view, hoveredPara.start, hoveredPara.end))
                  }
                }}
                onMouseLeave={() => { setSparkleHovered(false); setParaHighlightRect(null) }}
                title="Rewrite this paragraph with AI"
                style={{
                  position: 'relative',
                  background: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  padding: '4px 10px 4px 9px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontFamily: 'sans-serif',
                  color: theme.textFaint,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                  whiteSpace: 'nowrap',
                  minWidth: '80px',
                }}
              >
                <span style={{ fontSize: '12px', lineHeight: 1 }}>✨</span>
                <span style={{ color: sparkleHovered ? theme.text : theme.textFaint }}>Rewrite</span>
                <div style={{ position: 'absolute', right: '-8px', top: '50%', marginTop: '-6px', width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: `8px solid ${theme.border}` }} />
                <div style={{ position: 'absolute', right: '-7px', top: '50%', marginTop: '-6px', width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: `8px solid ${theme.surface}` }} />
              </button>
            </div>
          )}

          {/* Yellow paragraph highlight on sparkle hover */}
          {paraHighlightRect && (
            <div style={{
              position: 'fixed',
              left: paraHighlightRect.left - 4,
              top: paraHighlightRect.top - 2,
              width: paraHighlightRect.width + 8,
              height: paraHighlightRect.height + 4,
              background: darkMode ? 'rgba(254, 240, 138, 0.08)' : 'rgba(254, 240, 138, 0.35)',
              mixBlendMode: darkMode ? 'screen' : 'multiply',
              borderRadius: '3px',
              pointerEvents: 'none',
              zIndex: 10,
            }} />
          )}
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={handleDividerMouseDown}
          style={{
            width: '5px',
            flexShrink: 0,
            cursor: 'col-resize',
            background: 'transparent',
            position: 'relative',
            zIndex: 10,
          }}
          title="Drag to resize sidebar"
        />

        {/* Right sidebar */}
        <Sidebar
          violations={allViolations}
          hiddenRules={hiddenRules}
          onToggleRule={toggleRule}
          onRuleHover={setHoveredRuleId}
          onViolationBadgeClick={handleViolationBadgeClick}
          wordCount={wordCount}
          hasApiKey={!!apiKey}
          llmStatus={llmStatus}
          width={sidebarWidth}
        />
      </div>

      {/* Violation popover */}
      {popover && (
        <Popover
          state={popover}
          onClose={() => setPopover(null)}
          onApply={applyTextChange}
          onNextRule={() => setPopover(p => p ? { ...p, ruleIndex: (p.ruleIndex + 1) % p.rules.length } : p)}
          onPrevRule={() => setPopover(p => p ? { ...p, ruleIndex: (p.ruleIndex - 1 + p.rules.length) % p.rules.length } : p)}
        />
      )}

      {/* Paragraph rewrite popover */}
      {rewritePopover && (
        <ParaRewritePopover
          original={rewritePopover.paraText}
          rewritten={rewritePopover.rewritten}
          error={rewritePopover.error}
          debugPrompt={rewritePopover.debugPrompt}
          buttonPos={{ left: rewritePopover.buttonLeft, top: rewritePopover.buttonTop }}
          noApiKey={rewritePopover.noApiKey}
          onApply={applyRewrite}
          onDismiss={() => { setRewritePopover(null); setHoveredPara(null) }}
        />
      )}

      {/* GitHub link */}
      <a
        href="https://github.com/awnist/slop-cop"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: theme.text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.15,
          transition: 'opacity 0.2s',
          zIndex: 100,
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.15')}
        title="View on GitHub"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
        </svg>
      </a>
    </div>
    </ThemeContext.Provider>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function findParagraphAtOffset(text: string, offset: number): {
  idx: number; start: number; end: number; text: string
} {
  const paras = text.split('\n\n')
  let pos = 0
  for (let i = 0; i < paras.length; i++) {
    const end = pos + paras[i].length
    if (offset <= end || i === paras.length - 1) {
      return { idx: i, start: pos, end, text: paras[i] }
    }
    pos = end + 2
  }
  return { idx: 0, start: 0, end: text.length, text }
}

// Use CM6's domAtPos to create a DOM Range spanning the paragraph, then getBoundingClientRect
function getParagraphBoundingRectFromView(view: EditorView, paraStart: number, paraEnd: number): DOMRect | null {
  try {
    const maxPos = view.state.doc.length
    const startPos = Math.min(paraStart, maxPos)
    const endPos = Math.min(paraEnd, maxPos)
    const fromDOM = view.domAtPos(startPos)
    const toDOM = view.domAtPos(endPos)
    const range = document.createRange()
    range.setStart(fromDOM.node, fromDOM.offset)
    range.setEnd(toDOM.node, toDOM.offset)
    return range.getBoundingClientRect()
  } catch {
    return null
  }
}

function cleanupAfterEdit(text: string): string {
  return text
    .replace(/ +([.,;:!?])/g, '$1')
    .replace(/ +(["”’\)\]])\s*([.,;:!?])/g, '$1$2')
    .replace(/  +/g, ' ')
    .replace(/\n /g, '\n')
}

// Levenshtein distance with early exit — kept for potential future fuzzy matching
// @ts-expect-error — unused until fuzzy matching is re-enabled
function boundedLevenshtein(a: string, b: string, maxDist: number): number {
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1
  const n = a.length, m = b.length
  const row = Array.from({ length: m + 1 }, (_, i) => i)
  for (let i = 1; i <= n; i++) {
    let prev = i
    let rowMin = prev
    for (let j = 1; j <= m; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], row[j], prev) + 1
      row[j - 1] = prev
      prev = val
      rowMin = Math.min(rowMin, val)
    }
    row[m] = prev
    if (rowMin > maxDist) return maxDist + 1
  }
  return row[m]
}

function stalePercent(a: string, b: string): number {
  if (a === b) return 0
  const maxLen = Math.max(a.length, b.length, 1)
  const lenDiff = Math.abs(a.length - b.length)
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length - 1, endB = b.length - 1
  while (endA > start && endB > start && a[endA] === b[endB]) { endA--; endB-- }
  const changed = Math.max(lenDiff, Math.min(endA - start + 1, endB - start + 1, maxLen))
  return Math.min(100, Math.round(changed / maxLen * 20) * 5)
}

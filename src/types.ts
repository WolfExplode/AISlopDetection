export type ViolationCategory =
  | 'word-choice'
  | 'sentence-structure'
  | 'rhetorical'
  | 'structural'
  | 'framing'

export type ScoringMode =
  | 'linear'      // freeRate=0; full weight every instance (near-exclusive AI tells)
  | 'threshold'   // first (wordCount/1000 * freeRate) instances free; full weight beyond
  | 'diminishing' // freeRate=0; full weight for excess instances 1-3, then 1/√(i-2) decay

export interface ViolationRule {
  id: string
  name: string
  category: ViolationCategory
  description: string
  tip: string          // actionable advice shown in popover
  canRemove: boolean   // whether "Remove" deletes the matched text
  color: string        // CSS hsl or hex
  bgColor: string      // highlight background
  requiresLLM: boolean
  llmTier?: 'sentence' | 'document'   // which LLM call detects this rule
  llmDetectionHint?: string           // detection description used in LLM analysis prompts
  rewriteHint?: string                // human-readable description shown in rewrite debug panel
  llmDirective?: string               // terse imperative sent to the model in rewrite prompts
  scoringMode: ScoringMode
  freeRate: number     // instances per 1000 words that cost nothing (0 for linear/diminishing)
}

export interface Violation {
  ruleId: string
  startIndex: number
  endIndex: number
  matchedText: string
  explanation?: string
  suggestedChange?: string | null  // null = explicitly no action (don't fall back to canRemove deletion)
  // When present, Apply uses this range + applyReplacement instead of the highlight span.
  // Allows highlighting just the problematic text while acting on a wider context
  // (e.g. highlight "For instance," but also remove the boundary and capitalize next word).
  applyStartIndex?: number
  applyEndIndex?: number
  applyReplacement?: string
}

export interface AnnotatedSpan {
  text: string
  start: number
  end: number
  violations: string[] // ruleIds
}

import type { ScoringMode } from './types'

// Per-rule scoring config. `ruleWeight` is the multiplier applied to a rule's
// excess violation weight when computing its score contribution (replaces the
// old category-wide multiplier). It is the weight of the violation *type* —
// distinct from Violation.instanceWeight, the per-hit signal strength summed
// into that excess. It encodes how exclusively the pattern marks AI output,
// on a rough scale:
//
//   ~5.0  Definitive artifact — essentially never written by a human on purpose
//   ~3.0  Strong tell — highly characteristic of LLM prose, rare in good writing
//   ~2.5  Characteristic — AI-leaning, but humans do it occasionally
//   ~1.8  Moderate — common pattern that AI overuses
//   ~1.2  Weak / lexical — frequent in good human prose, or the per-word weights
//         (INTENSIFIERS, SLOP_BIGRAMS, etc.) already carry most of the signal
//
// These are judgment calls, not empirically fitted. The rating thresholds in
// computeSlopScore assume roughly this scale; retune them if weights shift a lot.
export const RULE_SCORING: Record<string, { ruleWeight: number; scoringMode: ScoringMode; freeRate: number; instanceWeight?: number; diminishingFactor?: number }> = {
  // ── Word choice (lexical; per-word weights carry most of the signal) ────────
  'overused-intensifier':     { ruleWeight: 1.3, scoringMode: 'diminishing', freeRate: 0 },
  'elevated-register':        { ruleWeight: 1.5, scoringMode: 'diminishing', freeRate: 0 },
  'filler-adverbs':           { ruleWeight: 1.2, scoringMode: 'diminishing', freeRate: 0 },
  'filler-adjectives':        { ruleWeight: 1.3, scoringMode: 'diminishing', freeRate: 0 },
  'quote-overuse':            { ruleWeight: 1.4, scoringMode: 'linear',      freeRate: 0 },
  'almost-hedge':             { ruleWeight: 1.5, scoringMode: 'threshold',   freeRate: 0.5 },

  // ── Statistical n-gram / name tells (validated against human baselines) ─────
  'slop-trigram':               { ruleWeight: 3.5, scoringMode: 'linear', freeRate: 0 },
  'slop-bigram':                { ruleWeight: 2.5, scoringMode: 'linear', freeRate: 0 },
  'fiction-body-language':      { ruleWeight: 2.4, scoringMode: 'diminishing', freeRate: 0 },
  'slop-word-character-name':   { ruleWeight: 3.2, scoringMode: 'diminishing', freeRate: 0, diminishingFactor: 0.3 },
  'slop-word-atmospheric':      { ruleWeight: 1.2, scoringMode: 'diminishing', freeRate: 0 },
  'slop-word-fantasy-vocab':    { ruleWeight: 1.5, scoringMode: 'diminishing', freeRate: 0 },
  'slop-word-essay':            { ruleWeight: 1.5, scoringMode: 'diminishing', freeRate: 0 },

  // ── Definitive artifacts — a human almost never produces these ──────────────
  'chatbot-artifact':         { ruleWeight: 5.0, scoringMode: 'linear',      freeRate: 0 },
  'knowledge-cutoff-disclaimer': { ruleWeight: 5.0, scoringMode: 'linear',   freeRate: 0 },

  // ── Sentence structure ──────────────────────────────────────────────────────
  'negation-pivot':           { ruleWeight: 3.5, scoringMode: 'linear',      freeRate: 0 },
  'fragment-negation':        { ruleWeight: 3.0, scoringMode: 'threshold',   freeRate: 0.5 },
  'negation-countdown':       { ruleWeight: 3.2, scoringMode: 'linear',      freeRate: 0 },
  'serves-as':                { ruleWeight: 2.2, scoringMode: 'diminishing', freeRate: 0 },
  'superficial-analysis':     { ruleWeight: 2.6, scoringMode: 'diminishing', freeRate: 0 },
  'unnecessary-elaboration':  { ruleWeight: 2.4, scoringMode: 'diminishing', freeRate: 0 },
  'gerund-fragment-litany':   { ruleWeight: 2.3, scoringMode: 'threshold',   freeRate: 0.5 },
  'anaphora-abuse':           { ruleWeight: 2.0, scoringMode: 'threshold',   freeRate: 0.5 },
  'short-hook-paragraph':     { ruleWeight: 2.5, scoringMode: 'threshold',   freeRate: 0.5 },
  'staccato-burst':           { ruleWeight: 2.1, scoringMode: 'threshold',   freeRate: 0.5 },
  'hedge-stack':              { ruleWeight: 1.8, scoringMode: 'threshold',   freeRate: 0.5 },
  'unnecessary-contrast':     { ruleWeight: 1.7, scoringMode: 'threshold',   freeRate: 0.5 },
  'parenthetical-qualifier':  { ruleWeight: 1.6, scoringMode: 'threshold',   freeRate: 0 },
  'question-then-answer':     { ruleWeight: 1.6, scoringMode: 'threshold',   freeRate: 1.5 },
  'false-range':              { ruleWeight: 2.3, scoringMode: 'threshold',   freeRate: 0.5 },
  'colon-elaboration':        { ruleWeight: 1.3, scoringMode: 'threshold',   freeRate: 1.0 },
  'em-dash-overuse':          { ruleWeight: 1.2, scoringMode: 'threshold',   freeRate: 1.0 },
  'triple-fragment':          { ruleWeight: 2.4, scoringMode: 'threshold',   freeRate: 0.5 },
  'triple-construction':      { ruleWeight: 2.0, scoringMode: 'threshold',   freeRate: 1.5 },

  // ── Sycophancy ──────────────────────────────────────────────────────────────
  'sycophantic-phrases':      { ruleWeight: 4.0, scoringMode: 'linear',      freeRate: 0 },
  'sycophantic-words':        { ruleWeight: 3.2, scoringMode: 'linear',      freeRate: 0 },
  'sycophantic-frame':        { ruleWeight: 3.5, scoringMode: 'linear',      freeRate: 0 },

  // ── Rhetorical ──────────────────────────────────────────────────────────────
  'empathy-performance':      { ruleWeight: 3.2, scoringMode: 'linear',      freeRate: 0 },
  'false-vulnerability':      { ruleWeight: 3.0, scoringMode: 'linear',      freeRate: 0 },
  'throat-clearing':          { ruleWeight: 3.0, scoringMode: 'linear',      freeRate: 0 },
  'historical-analogy-stack': { ruleWeight: 2.6, scoringMode: 'linear',      freeRate: 0 },
  'balanced-take':            { ruleWeight: 2.6, scoringMode: 'linear',      freeRate: 0 },
  'significance-phrases':     { ruleWeight: 2.8, scoringMode: 'diminishing', freeRate: 0 },
  'important-to-note':        { ruleWeight: 2.9, scoringMode: 'diminishing', freeRate: 0 },
  'despite-challenges':       { ruleWeight: 2.6, scoringMode: 'threshold',   freeRate: 0.5 },
  'pedagogical-aside':        { ruleWeight: 2.5, scoringMode: 'linear',      freeRate: 0 },
  'imagine-world':            { ruleWeight: 2.5, scoringMode: 'linear',      freeRate: 0 },
  'heres-the-kicker':         { ruleWeight: 2.1, scoringMode: 'linear',      freeRate: 0 },
  'exemplar-cliche':          { ruleWeight: 2.4, scoringMode: 'diminishing', freeRate: 0 },
  'vague-attribution':        { ruleWeight: 2.3, scoringMode: 'threshold',   freeRate: 1.0 },
  'false-conclusion':         { ruleWeight: 1.9, scoringMode: 'diminishing', freeRate: 0 },
  'connector-addiction':      { ruleWeight: 1.9, scoringMode: 'threshold',   freeRate: 0.5 },

  // ── Framing ─────────────────────────────────────────────────────────────────
  'grandiose-stakes':         { ruleWeight: 3.0, scoringMode: 'linear',      freeRate: 0 },
  'dead-metaphor':            { ruleWeight: 2.8, scoringMode: 'linear',      freeRate: 0 },
  'broader-implications':     { ruleWeight: 2.6, scoringMode: 'diminishing', freeRate: 0 },
  'invented-concept-label':   { ruleWeight: 2.6, scoringMode: 'threshold',   freeRate: 0.5 },
  'metaphor-crutch':          { ruleWeight: 2.5, scoringMode: 'threshold',   freeRate: 0.5 },
  'era-opener':               { ruleWeight: 2.9, scoringMode: 'threshold',   freeRate: 0.5 },
  'stacked-intensifiers':     { ruleWeight: 2.4, scoringMode: 'linear',      freeRate: 0 },

  // ── Structural ──────────────────────────────────────────────────────────────
  'fractal-summaries':        { ruleWeight: 3.2, scoringMode: 'linear',      freeRate: 0 },
  'pivot-paragraph':          { ruleWeight: 3.0, scoringMode: 'linear',      freeRate: 0 },
  'one-point-dilution':       { ruleWeight: 3.0, scoringMode: 'linear',      freeRate: 0 },
  'listicle-trench-coat':     { ruleWeight: 2.5, scoringMode: 'threshold',   freeRate: 0.5 },
  'bold-first-bullets':       { ruleWeight: 2.4, scoringMode: 'threshold',   freeRate: 1.0 },
  'listicle-instinct':        { ruleWeight: 2.0, scoringMode: 'threshold',   freeRate: 0.5 },
  'unicode-decoration':       { ruleWeight: 2.0, scoringMode: 'threshold',   freeRate: 0.5 },
  'dramatic-fragment':        { ruleWeight: 2.5, scoringMode: 'threshold',   freeRate: 0.5 },
  'paired-negation':          { ruleWeight: 2.2, scoringMode: 'threshold',   freeRate: 0.5 },
  'reality-claim':            { ruleWeight: 2.0, scoringMode: 'threshold',   freeRate: 0.5 },
}

// vital, robust, dynamic, fundamental moved to NLP layer (context-sensitive)
export const INTENSIFIERS: Record<string, number> = {
  'crucial':       0.50,
  'comprehensive': 0.55,
  'arguably':      0.60,
  'straightforward': 0.30,
  'noteworthy':    0.65,
  'realm':         0.70,
  'landscape':     0.75,
  'tapestry':      0.95,
  'multifaceted':  0.85,
  'nuanced':       0.80,
  'pivotal':       0.70,
  'unprecedented': 0.65,
  'paradigm':      0.75,
  'synergy':       0.70,
  'holistic':      0.65,
  'transformative': 0.80,
  'cutting-edge':  0.60,
  'innovative':    0.50,
  'enduring':      0.55,
  'interplay':     0.75,
  'intricate':     0.65,
  'intricacies':   0.70,
  'meticulous':    0.75,
  'meticulously':  0.80,
  'valuable':      0.45,
  'vibrant':       0.70,
  'paramount':     0.80,
  'overarching':   0.85,
  'actionable':    0.65,
  'seamless':      0.70,
  'salient':       0.75,
  'ubiquitous':    0.70,
  'myriad':        0.75,
  'aforementioned': 0.90,
  'quintessential': 0.80,
  // Missing from eqbench slop list — essay/corporate register
  'burgeoning':     0.80,
  'nascent':        0.75,
  'cornerstone':    0.80,
  'bedrock':        0.78,
  'foundational':   0.70,
  'resilience':     0.72,
  'resilient':      0.70,
  'proactive':      0.75,
  'scalable':       0.72,
  'linchpin':       0.85,
  'lifeblood':      0.85,
  'underpinning':   0.75,
  'underpinnings':  0.75,
  'wellspring':     0.88,
  'groundwork':     0.65,
  'meaningful':     0.42,
  'renowned':       0.65,
  'nestled':        0.88,
}

// Multi-word phrases that are overused LLM clichés
export const INTENSIFIER_PHRASES: Record<string, number> = {
  'align with':        0.60,
  'testament to':      0.85,
  'indelible mark':    0.90,
  'key turning point': 0.75,
  'setting the stage': 0.70,
  'in the heart of':   0.75,
  'diverse array':     0.82,
  'rich history':      0.72,
  'rich tradition':    0.72,
}

// Adjective intensifiers moved to NLP layer: flagged only in predicate position
// (after copula) or attributive before non-excluded nouns. These words have
// legitimate technical uses in specific compounds (vital signs, dynamic programming).
export const ADJECTIVE_INTENSIFIERS: Record<string, number> = {
  'vital':        0.55,
  'robust':       0.65,
  'dynamic':      0.60,
  'fundamental':  0.55,
  // Evaluative praise adjectives: individually borderline, suspicious when stacked
  'remarkable':   0.80,
  'fantastic':    0.35,
  'powerful':     0.40,
}

// Per-adjective permitted following nouns. "[word] #Noun" is suppressed when the
// noun (lowercase) appears in this list — established domain compounds where the
// word carries a specialized, non-slop meaning.
export const ADJECTIVE_PERMITTED_FOLLOWING: Record<string, string[]> = {
  vital:       ['signs', 'sign', 'organs', 'organ', 'statistics', 'records', 'record', 'capacity', 'functions', 'function', 'force', 'forces'],
  robust:      ['security', 'authentication', 'encryption'],
  dynamic:     ['programming', 'range', 'memory', 'allocation', 'dispatch', 'typing'],
  fundamental: ['theorem', 'theorems', 'rights', 'frequency', 'frequencies', 'forces', 'force', 'particles', 'particle'],
}

// Adverbs moved to NLP layer: flagged only when modifying an adjective or
// appearing sentence-initial before a comma — NOT when modifying an action verb.
export const CONTEXT_SENSITIVE_ADVERBS: Record<string, number> = {
  'quietly':    0.60,
  'deeply':     0.55,
  'remarkably': 0.75,
  'clearly':    0.50,
}

// Verb-type intensifiers — moved to NLP detector so deletion is replaced
// with a correctly-conjugated simpler synonym (deleting a verb breaks the sentence)
export const VERB_INTENSIFIERS: string[] = [
  'leverage', 'delve', 'navigate', 'foster', 'underscore', 'resonate',
  'embark', 'streamline', 'spearhead', 'harness',
  'bolster', 'emphasize', 'enhance', 'garner',
  // From slopbuster Tier 1 / slopsquid word list
  'showcase', 'illuminate', 'crystallize',
  // From eqbench slop list — missing corporate/analytical verbs
  'optimize', 'amplify', 'empower',
  // Promotional copula avoidance (Wikipedia: AI substitutes "boasts" for "has")
  'boasts',
]

export const ELEVATED_REGISTER: [string, string | null, number][] = [
  ['utilize',                      'use',       0.75],
  ['utilise',                      'use',       0.75],
  ['utilization',                  'use',       0.75],
  ['commence',                     'start',     0.80],
  ['commencement',                 'start',     0.80],
  ['facilitate',                   'help',      0.65],
  ['endeavor',                     'try',       0.75],
  ['endeavour',                    'try',       0.75],
  ['demonstrate',                  'show',      0.45],
  ['ascertain',                    'find out',  0.85],
  ['ameliorate',                   'improve',   0.95],
  ['elucidate',                    'explain',   0.85],
  ['promulgate',                   'spread',    0.90],
  ['cognizant',                    'aware',     0.85],
  ['pertaining to',                'about',     0.70],
  ['in regards to',                'about',     0.55],
  ['with regards to',              'about',     0.55],
  ['with regard to',               'about',     0.50],
  ['with respect to',              'about',     0.50],
  ['in the context of',            null,        0.50],
  ['at this juncture',             'now',       0.90],
  ['at this point in time',        'now',       0.75],
  ['going forward',                'in future', 0.70],
  ['moving forward',               'in future', 0.75],
  ['in terms of',                  '',          0.45],
  ['it is worth noting',           '',          0.85],
  ['it should be noted',           '',          0.85],
  ['one must consider',            '',          0.80],
  ['in light of',                  'given',     0.55],
  ['in the realm of',              'in',        0.80],
  ['due to the fact that',         'because',   0.70],
  ['notwithstanding',              'despite',   0.75],
  ['hitherto',                     'until now', 0.95],
  ['heretofore',                   'until now', 0.95],
  ['as a matter of fact',          null,        0.60],
  ['the fact of the matter is',    null,        0.75],
  ['for all intents and purposes', null,        0.70],
  ['at its core',                  null,        0.75],
  ['it goes without saying',       null,        0.80],
]

// quietly, deeply, remarkably, clearly moved to NLP layer (context-sensitive)
export const FILLER_ADVERBS: Record<string, number> = {
  'importantly':  0.65,
  'essentially':  0.60,
  'fundamentally': 0.70,
  'ultimately':   0.70,
  'inherently':   0.75,
  'particularly': 0.40,
  'increasingly': 0.45,
  'certainly':    0.55,
  'undoubtedly':  0.90,
  'obviously':    0.45,
  'simply':       0.40,
  'basically':    0.35,
  'quite':        0.25,
  'very':         0.20,
  'really':       0.20,
  'truly':        0.60,
  'genuinely':    0.55,
}

export const FILLER_ADJECTIVES: Record<string, number> = {
  'remarkable':      0.75,
  'fantastic':       0.20,
  'powerful':        0.50,
  'extraordinary':   0.75,
  'incredible':      0.55,
  'amazing':         0.45,
  'profound':        0.80,
  'compelling':      0.75,
  'striking':        0.70,
  'brilliant':       0.65,
  'stunning':        0.70,
  'exceptional':     0.75,
  'groundbreaking':  0.90,
  'inspiring':       0.65,
  'masterful':       0.85,
  'impressive':      0.55,
  'breathtaking':    0.85,
  'fascinating':     0.70,
  'outstanding':     0.75,
  'impactful':       0.95,
  'insightful':      0.90,
  'invaluable':      0.85,
  'superb':          0.75,
  'phenomenal':      0.80,
  'marvelous':       0.80,
  'wonderful':       0.50,
  'magnificent':     0.75,
}

export const METAPHOR_CRUTCHES: Record<string, number> = {
  'double-edged sword':          0.75,
  'tip of the iceberg':          0.70,
  'north star':                  0.80,
  'building blocks':             0.65,
  'elephant in the room':        0.65,
  'perfect storm':               0.70,
  'game.changer':                0.70,
  'game changer':                0.70,
  'low.hanging fruit':           0.75,
  'low hanging fruit':           0.75,
  'move the needle':             0.75,
  'think outside the box':       0.65,
  'at the end of the day':       0.60,
  'paradigm shift':              0.80,
  'silver bullet':               0.70,
  'boiling the ocean':           0.75,
  'drinking the kool.aid':       0.65,
  'drinking the kool aid':       0.65,
  'put it on the back burner':   0.65,
  'circle back':                 0.70,
  'deep dive':                   0.80,
  'level up':                    0.60,
  'hit the ground running':      0.65,
  'move fast and break things':  0.55,
  'the devil is in the details': 0.65,
  'on the same page':            0.60,
  'reinvent the wheel':          0.65,
  'touch base':                  0.65,
  'bandwidth':                   0.55,
  'bleeding edge':               0.65,
  'best of breed':               0.65,
  'boil down':                   0.60,
  'food for thought':            0.65,
  'the bigger picture':          0.70,
  'ahead of the curve':          0.70,
  'writing on the wall':         0.65,
  'canary in the coal mine':     0.70,
}

export const FALSE_CONCLUSION_PHRASES: Record<string, number> = {
  'in conclusion':                       0.90,
  'to conclude':                         0.85,
  'in summary':                          0.85,
  'to summarize':                        0.85,
  'to sum up':                           0.80,
  'in closing':                          0.85,
  'overall,':                            0.60,
  'all in all':                          0.75,
  'at the end of the day':               0.60,
  'when all is said and done':           0.80,
  'taking everything into account':      0.85,
  'taking everything into consideration': 0.85,
  'all things considered':               0.75,
  'moving forward':                      0.70,
  'going forward':                       0.70,
  'the future looks bright':             0.95,
  'exciting times ahead':                0.95,
  'exciting times lie ahead':            0.95,
  'only time will tell':                 0.85,
  'remains to be seen':                  0.80,
  'poised for growth':                   0.90,
  'poised for success':                  0.90,
  'continues to thrive':                 0.85,
  'moving in the right direction':       0.85,
}

export const CONNECTOR_WORDS: Record<string, number> = {
  'furthermore':          0.70,
  'moreover':             0.70,
  'additionally':         0.65,
  'however':              0.30,
  'nevertheless':         0.65,
  'nonetheless':          0.65,
  'consequently':         0.60,
  'therefore':            0.40,
  'thus':                 0.45,
  'hence':                0.55,
  'in addition':          0.50,
  'as a result':          0.40,
  'for instance':         0.45,
  'for example':          0.35,
  'in contrast':          0.45,
  'on the other hand':    0.45,
  'on the contrary':      0.55,
  'that said':            0.60,
  'having said that':     0.70,
  'with that in mind':    0.75,
  'it follows that':      0.70,
  'interestingly':        0.75,
  'notably':              0.60,
  'significantly':        0.55,
  'in other words':       0.60,
  'to put it another way': 0.80,
  'that is to say':       0.70,
}

export const UNNECESSARY_CONTRAST_PHRASES: Record<string, number> = {
  'whereas':       0.50,
  'as opposed to': 0.55,
  'unlike':        0.35,
  'in contrast to': 0.55,
  'contrary to':   0.60,
  'conversely':    0.70,
}

// "kind of" only as a filler qualifier, not as a classifier ("a kind of X")
export const HEDGE_WORDS: Record<string, number> = {
  'perhaps':           0.40,
  'arguably':          0.65,
  'seemingly':         0.60,
  'apparently':        0.45,
  'ostensibly':        0.75,
  'possibly':          0.35,
  'potentially':       0.50,
  'conceivably':       0.75,
  'presumably':        0.60,
  'supposedly':        0.50,
  'it could be argued': 0.70,
  'it might be':       0.55,
  'it may be':         0.50,
  'it seems':          0.45,
  'it appears':        0.50,
  'one might':         0.65,
  'some would say':    0.75,
  'in some ways':      0.60,
  'to some extent':    0.60,
  'in a sense':        0.55,
  'sort of':           0.35,
  'is kind of':        0.30,
  'are kind of':       0.30,
  'was kind of':       0.30,
  'were kind of':      0.30,
  'feels kind of':     0.30,
  'seems kind of':     0.30,
  'sounds kind of':    0.30,
  'looks kind of':     0.30,
}

// Only genuinely hedging modals; "should"/"would" are normative/conditional, not hedges
export const MODAL_HEDGE_WEIGHTS: Record<string, number> = { 'might': 0.50, 'could': 0.50, 'may': 0.45 }

// Evaluative praise adjectives and certainty amplifiers that are individually
// borderline but strongly signal AI sycophantic amplification when 3+ appear
// within a 3-sentence window.
// Three-word sequences statistically overrepresented in AI creative writing
// relative to human baselines (Paech et al., 2025 — Antislop paper, Table 5).
// Weights derived from pct_models field (% of 67 models that overuse the trigram).
export const SLOP_TRIGRAMS: Record<string, number> = {
  // ── Tier 1: >35% of models ────────────────────────────────────────────────
  'voice barely whisper':    0.92,
  'said voice low':          0.88,
  'air thick scent':         0.85,
  'took deep breath':        0.82,
  'smile playing lips':      0.82,
  'said voice barely':       0.80,
  'voice barely audible':    0.80,
  'take deep breath':        0.78,
  'could shake feeling':     0.78,
  // ── Tier 2: 15–35% of models ──────────────────────────────────────────────
  'eyes never leaving':      0.75,
  'casting long shadows':    0.72,
  'says voice low':          0.75,
  'heart pounding chest':    0.72,
  'spreading across face':   0.72,
  'air thick smell':         0.70,
  'long shadows across':     0.68,
  'heart hammered ribs':     0.78,
  'voice trembling slightly': 0.75,
  'said voice devoid':       0.75,
  'felt profound sense':     0.72,
  'a profound sense':        0.65,
  // ── Tier 3: extended narrative list ──────────────────────────────────────
  'taking deep breath':      0.78,
  'breath caught throat':    0.80,
  'room fell silent':        0.70,
  'heart skipped beat':      0.72,
  'blood ran cold':          0.78,
  'sun dipped horizon':      0.72,
  'chill run spine':         0.78,
  'shiver run spine':        0.72,
  'dust motes danced':       0.82,
  'words hung air':          0.72,
  'growing sense unease':    0.72,
  'renewed sense purpose':   0.72,
  'newfound sense purpose':  0.72,
  'air thick tension':       0.72,
  'piercing blue eyes':      0.78,
  'door creaked open':       0.70,
  'small smile playing':     0.80,
  'smile spread across':     0.70,
  'heart pounded chest':     0.72,
}

export const EVALUATIVE_INTENSIFIERS: Record<string, number> = {
  'remarkable':      0.75,
  'fantastic':       0.20,
  'powerful':        0.50,
  'extraordinary':   0.75,
  'incredible':      0.55,
  'amazing':         0.45,
  'profound':        0.80,
  'compelling':      0.75,
  'striking':        0.70,
  'brilliant':       0.65,
  'stunning':        0.70,
  'exceptional':     0.75,
  'groundbreaking':  0.90,
  'inspiring':       0.65,
  'masterful':       0.85,
  'impressive':      0.55,
  'breathtaking':    0.85,
  'fascinating':     0.70,
  'outstanding':     0.75,
  'impactful':       0.95,
  'insightful':      0.90,
  'invaluable':      0.85,
  'superb':          0.75,
  'phenomenal':      0.80,
  'marvelous':       0.80,
  'wonderful':       0.50,
  'magnificent':     0.75,
  'undoubtedly':     1.00,
  'unquestionably':  1.00,
  'unmistakably':    0.95,
}

// Two-word sequences statistically overrepresented in AI prose relative to human
// baselines (eqbench Slop Score / Paech et al., 2025). Stopwords ("of", "the",
// "a") are stripped in the source data; the detector allows one optional word
// between each pair so "glimmer hope" matches "glimmer of hope".
// Body language / physical reaction verbs statistically overrepresented in AI fiction
// (slopsquid + eqbench data). Individually common in fiction; flagged when ≥3 cluster
// in one paragraph — that density is the AI signal, not any single occurrence.
export const FICTION_BODY_LANGUAGE: Record<string, number> = {
  // Dialogue attribution overuse
  'stammered': 0.88,
  'murmured':  0.75,
  'rasped':    0.85,
  'growled':   0.72,
  'snarled':   0.78,
  'hissed':    0.72,
  'bellowed':  0.75,
  'chuckled':  0.82,
  'scoffed':   0.80,
  'huffed':    0.78,
  'snorted':   0.72,
  'chimed':    0.72,
  // Physical reaction / motion tells
  'flickered': 0.90,
  'flinched':  0.72,
  'recoiled':  0.78,
  'trembled':  0.78,
  'quivered':  0.82,
  'tensed':    0.72,
  'stiffened': 0.78,
  'faltered':  0.80,
  'lurched':   0.80,
  'winced':    0.75,
  'bristled':  0.80,
  // Expression tells
  'smirked':   0.75,
  'sneered':   0.75,
  'quirked':   0.88,
  // Atmosphere / setting
  'shimmered': 0.82,
  'beckoned':  0.75,
}

// ── Slop word lists (eqbench slop_list.json) ────────────────────────────────
// Source: https://github.com/sam-paech/slop-score (MIT License)
// Words statistically overrepresented in LLM output vs human baselines.

// AI-default fantasy/sci-fi character and place names.
// Stored Title Case; detector matches these case-sensitively (proper-noun usage only).
export const SLOP_WORDS_CHARACTER_NAMES: string[] = [
  // Ael- / Aether- family
  'Adira', 'Aedan', 'Aelara', 'Aeldrin', 'Aeliana', 'Aelion', 'Aelius', 'Aella',
  'Aeloria', 'Aelric', 'Aelyn', 'Aelwyn', 'Aerion',
  'Aeternum', 'Aeternus', 'Aethel', 'Aethelburg', 'Aethelgard', 'Aethelred',
  'Aethera', 'Aethereia', 'Aetheria', 'Aetherium', 'Aetherius', 'Aethon',
  // Al- family
  'Alara', 'Alaric', 'Alayna', 'Aldric', 'Aldwyn', 'Aleron', 'Amara',
  // C- names
  'Caelan', 'Caelum',
  // D- names / IP references
  'Dovahkiin', 'Drakon', 'Draven',
  // E- / El- / Ely- family
  'Eadric', 'Eamon', 'Eira',
  'Elara', 'Eldarion', 'Elderglen', 'Eldergrove', 'Eldermere', 'Elderton',
  'Eldoria', 'Eldrath', 'Eldric', 'Eldrid', 'Eldrin', 'Eldrion', 'Eldrith',
  'Elian', 'Eliana', 'Elion', 'Eliora', 'Elira', 'Ellaria', 'Elliana',
  'Elmsworth', 'Elowen', 'Elros', 'Elyas', 'Elyndor', 'Elyndra', 'Elyon',
  'Elyra', 'Elys', 'Elysia', 'Elysion', 'Elysium',
  'Eolan', 'Eolande', 'Eremon', 'Eridan', 'Eridani', 'Eryndor',
  // F- names
  'Finnian', 'Finnigan',
  // G- names / IP
  'Geralt', 'Gerta', 'Godric',
  'Gorok', 'Gorthok', 'Grath', 'Grimbold', 'Grimgold', 'Grogg', 'Grognak', 'Grolak', 'Gruuz',
  // H- place names
  'Hargrove', 'Havenwood',
  // I- names
  'Ignarion', 'Ignis', 'Isolde',
  // J- names
  'Jarek', 'Jaxon', 'Joren',
  // K- family
  'Kael', 'Kaela', 'Kaelan', 'Kaelen', 'Kaelin', 'Kaelor', 'Kaelthar',
  'Kaida', 'Kaito', 'Kalel', 'Kessari', 'Keth', 'Kethra',
  'Krael', 'Kraelion', 'Kragoth', 'Krel', 'Krixon', 'Kryll',
  // L- family
  'Liora', 'Lira', 'Lirael', 'Liran', 'Lirien', 'Lirin', 'Lorian',
  'Lumin', 'Lumina', 'Luminara', 'Luminari',
  'Lyra', 'Lyrien', 'Lysander', 'Lysandra', 'Lysara',
  // Mal- villains
  'Malachai', 'Malachar', 'Malachor', 'Malakai', 'Malakar', 'Malakor',
  'Malazar', 'Malkor', 'Malphas', 'Malric', 'Malus',
  // M- other
  'Meadowgrove', 'Morwen', 'Moros',
  // N- / O- place names
  'Nightshade', 'Oakhaven', 'Oelia',
  // P- / R- names
  'Penhaligon', 'Petrova', 'Renn', 'Ryker', 'Ryla',
  // S- family
  'Sadim', 'Seraphiel', 'Seraphina', 'Seraphine', 'Silas', 'Solara', 'Sylas', 'Sylvani',
  // Thal- / Thor- / Th- family
  'Taehal', 'Taren',
  'Thalassa', 'Thalen', 'Thalion', 'Thalor', 'Thalos', 'Tharivol', 'Tharos', 'Tharros',
  'Theron', 'Thog', 'Thoran', 'Thoren', 'Thorgar', 'Thorgrim', 'Thorne', 'Thrain', 'Thrax',
  'Torvin',
  // U- names
  'Uthgar',
  // V- family (villains / warriors)
  'Vael', 'Valerius', 'Valoria', 'Valtor', 'Varek', 'Varen', 'Varyn', 'Vance',
  'Veridia', 'Veridian', 'Veridium', 'Verran', 'Vespera', 'Vexar',
  'Veyl', 'Veyn', 'Veyne', 'Veyra', 'Veyth',
  'Vorath', 'Vorlag', 'Vorn', 'Vorne', 'Voryn', 'Voss', 'Vrook', 'Vrykali', 'Vrynn',
  // W- place names
  'Whisperwind', 'Whisperwood', 'Whiterun',
  // X- sci-fi / fantasy names
  'Xandros', 'Xaphan', 'Xaren', 'Xavius', 'Xendari',
  'Xyla', 'Xylar', 'Xylara', 'Xylia', 'Xyra',
  // Z- family
  'Zafir', 'Zalrex', 'Zarek', 'Zarthus',
  'Zephyr', 'Zephyra', 'Zephyria', 'Zephyrion', 'Zephyros', 'Zephyrus',
  'Zorath', 'Zorax', 'Zorgon', 'Zorp', 'Zorvath',
  'Zyla', 'Zylar', 'Zylara', 'Zyloth', 'Zylth', 'Zyn', 'Zyra',
  // AI place name compounds
  'Ashwood', 'Blackwood', 'Darkwood', 'Grimstone', 'Heartstone',
  'Ironforge', 'Silverwood',
]

// Genre-specific vocabulary overrepresented in AI fantasy/sci-fi prose.
// Matched case-insensitively.
export const SLOP_WORDS_FANTASY_VOCAB: string[] = [
  // Magic / arcane
  'arcane', 'arcanus', 'archdemon', 'archmage', 'eldritch', 'enchantments',
  'grimoire', 'grimoires', 'incantation', 'incantations', 'mages', 'necromancer',
  'necromantic', 'runes', 'sigil', 'sigils', 'spellbook', 'spellbooks',
  'spellcasting', 'tomes',
  // Weapons / items
  'greatsword', 'hilt', 'lockpick', 'lockpicking', 'lockpicks', 'sellsword', 'tankards',
  // Fantasy world-building nouns
  'allfather', 'bioluminescent', 'cartographer', 'chitinous', 'clockmaker',
  'cobblestone', 'cobblestones', 'cultists', 'daedra', 'daedric', 'einherjar',
  'guildmaster', 'guildmates', 'hivemind', 'ichor', 'insectoid', 'labyrinthine',
  'mandibles', 'merfolk', 'orcish', 'tenebrous', 'townsfolk', 'treant', 'undercity',
  // Sci-fi / cyberpunk vocabulary
  'commlink', 'datapad', 'holographic', 'interdimensional', 'keycard', 'medbay',
  'megacorps', 'plasteel', 'pyrokinetic', 'railguns', 'terrans', 'viewport',
  'viewscreen', 'xenobiologist', 'xenobiology', 'xenolinguist', 'xenos',
  // Light / atmosphere (fantasy-specific)
  'firelight', 'lamplight', 'torchlight',
]

// Dramatic sensory and atmospheric words overrepresented in AI creative writing.
// Matched case-insensitively.
export const SLOP_WORDS_ATMOSPHERIC: string[] = [
  // Motion / body language verbs
  'absently', 'animatedly', 'arced', 'barked', 'blinked', 'blurted', 'boomed',
  'bustled', 'bustling', 'buzzed', 'cackled', 'cascaded', 'clacked', 'clanged',
  'clasped', 'clattered', 'clattering', 'clawed', 'clawing', 'clenched',
  'coiling', 'crept', 'croaked', 'crouched', 'darted', 'darting', 'drawled',
  'droned', 'echoed', 'echoing', 'erupted', 'exclaimed', 'faltered',
  'fidgeted', 'flinched', 'flitted', 'fluttered', 'froze', 'furrowed', 'furrowing',
  'gaped', 'gasped', 'gestured', 'gesturing', 'glanced', 'glances', 'glancing',
  'glared', 'glided', 'grinned', 'gripped', 'groaned', 'growled', 'grumbled',
  'grunted', 'gurgled', 'hefted', 'hefting', 'hesitantly', 'hesitated',
  'hissed', 'hitched', 'hovered', 'howled', 'huddled', 'hummed', 'humming',
  'hunched', 'hurried', 'hurtled', 'interjected', 'intoned', 'jolted',
  'knelt', 'lanced', 'leaned', 'lingered', 'loomed', 'lunged', 'lurched',
  'lurked', 'marveled', 'marveling', 'materialized', 'materializing',
  'mingling', 'mumbled', 'mused', 'muttered', 'narrowed', 'narrowing',
  'nestled', 'nodded', 'nuzzled', 'panted', 'pattered', 'paused', 'peered',
  'perked', 'piqued', 'pored', 'poring', 'pounded', 'pounding',
  'pulsated', 'pulsating', 'pulsed', 'pulsing', 'purred', 'quaked',
  'quickened', 'quickening', 'quirked', 'quivered', 'raced', 'raged',
  'rasped', 'rasping', 'recoiled', 'recoiling', 'reeked', 'reeled', 'reeling',
  'resonated', 'resonating', 'reveled', 'rippled', 'rippling', 'roared',
  'rumbled', 'rumbling', 'rummaged', 'savoring', 'scavenged', 'scoffed',
  'scowled', 'scrawled', 'screeched', 'scribbled', 'scurried', 'sighed',
  'silhouetted', 'sipped', 'skittered', 'skittering', 'slithered', 'slumped',
  'smirked', 'smoldered', 'snaked', 'snarled', 'sneered', 'snorted',
  'softened', 'softening', 'sparkled', 'spasmed', 'spiraled', 'sprawled',
  'sprawling', 'sprinted', 'sputtered', 'squinted', 'squinting', 'stammered',
  'stared', 'steeled', 'steeling', 'steepled', 'steepling', 'stilled',
  'streaked', 'strode', 'stumbled', 'surged', 'swirled', 'swirling',
  'swiveled', 'teemed', 'teetered', 'thrummed', 'thrumming', 'thudded',
  'thudding', 'tightened', 'tilted', 'tingled', 'tousled', 'transcended',
  'transfixed', 'trembled', 'trembling', 'trudged', 'tugged', 'twitched',
  'wafted', 'wailed', 'wavered', 'wavering', 'welled', 'wheezed', 'whimpered',
  'whirled', 'whirred', 'whirring', 'widened', 'winced', 'wincing',
  'writhe', 'writhed', 'yawned', 'yearned', 'yelped', 'yowled',
  // Sensory / atmospheric adjectives
  'abuzz', 'acrid', 'agonizing', 'agonizingly', 'ashen', 'audible', 'bated',
  'bewildered', 'bewilderment', 'billowed', 'billowing', 'blankly', 'blinding',
  'cacophony', 'calloused', 'cautiously', 'cavernous', 'chillingly',
  'conspiratorial', 'conspiratorially', 'contorted', 'contorting', 'crimson',
  'crinkled', 'crinkling', 'crookedly', 'crumbling', 'crumpled', 'crumpling',
  'dampness', 'dappling', 'deafening', 'desolate', 'dimly', 'dimmed', 'dimness',
  'disbelief', 'disconcertingly', 'discordant', 'disheveled', 'dismissively',
  'disorientation', 'disoriented', 'disorienting', 'dizzying', 'dread',
  'echoes', 'eerie', 'eerily', 'elongating', 'enigmatic', 'ethereal',
  'exhilaration', 'expanse', 'faded', 'faint', 'faintly', 'festered',
  'fleeting', 'frantic', 'frayed', 'fraying', 'frowned', 'gaped',
  'gaze', 'gazed', 'gazes', 'gleamed', 'gleaming', 'glimmer', 'glimmered',
  'glimmering', 'glint', 'glinted', 'glinting', 'glistened', 'glistening',
  'gloved', 'gnarled', 'gnawed', 'gnawing', 'gravelly', 'grimly', 'grizzled',
  'groggily', 'gruff', 'guttered', 'guttural', 'hoarse', 'hollowly',
  'holstered', 'hues', 'hulking', 'humorless', 'hushed', 'impassive',
  'imperceptible', 'impossibly', 'inky', 'insistent', 'instinctively',
  'intently', 'intricate', 'intricately', 'iridescent', 'jagged',
  'jolt', 'kaleidoscope', 'laced', 'luminescence', 'luminescent',
  'malevolence', 'malevolent', 'meticulously', 'meticulousness', 'mirroring',
  'mirthless', 'motes', 'mournful', 'muffled', 'murmur', 'murmured', 'murmurs',
  'mutely', 'newfound', 'nocked', 'numbly', 'oblivious', 'obsidian',
  'ominously', 'otherworldly', 'paled', 'palpable', 'pang', 'perpetually',
  'placating', 'precariously', 'precipice', 'prickle', 'prickled', 'prickling',
  'protectiveness', 'punctuated', 'quietude', 'radiating', 'rasp', 'raspy',
  'resonant', 'reverberate', 'reverberated', 'reverberating', 'reverie',
  'rhythmic', 'rusted', 'rustle', 'rustled', 'rustling', 'scent', 'searing',
  'seep', 'seeped', 'seeping', 'shadows', 'shambled', 'shambling',
  'shimmer', 'shimmered', 'shimmering', 'shiver', 'shivered', 'shivers',
  'shockwaves', 'shrieked', 'shrouded', 'shuddered', 'sickly', 'sidestepped',
  'skeptically', 'sleek', 'slicked', 'slicking', 'slitted', 'slumbered',
  'soundlessly', 'spires', 'starlit', 'staticky', 'steadier', 'steadying',
  'stillness', 'streetlamp', 'streetlamps', 'streetlights', 'suffocating',
  'sulfurous', 'tapestry', 'tattered', 'tendril', 'tendrils', 'terrifyingly',
  'threadbare', 'throbbed', 'throngs', 'thrum', 'thud', 'thunderous',
  'ticked', 'tinged', 'tousling', 'towering', 'tremor', 'trepidation',
  'twinge', 'twinkled', 'twinkling', 'unassuming', 'unbidden', 'unblinking',
  'unburdened', 'unclenching', 'uncurled', 'underbrush', 'undercurrent',
  'unease', 'unfazed', 'unfurling', 'unmarred', 'unmoving', 'unnerving',
  'unnervingly', 'unravel', 'unraveling', 'unreadable', 'unremarkable',
  'unseeing', 'unsettling', 'unsettlingly', 'unshaken', 'unshed',
  'unspoken', 'unspooled', 'unwavering', 'unyielding', 'vastness', 'verdant',
  'vibrant', 'vibrated', 'warily', 'wariness', 'weariness', 'weathered',
  'whir', 'whirs', 'whisper', 'whispered', 'whispering', 'whispers',
  'windowpane', 'windowpanes', 'wizened', 'woodsmoke',
  // Misc atmospheric nouns
  'alleyway', 'armrest', 'armrests', 'brushstroke', 'cityscape', 'clatter',
  'clang', 'clinked', 'clinking', 'coalesced', 'coalescing', 'coursed',
  'coursing', 'crackle', 'crackled', 'crackling', 'cradled', 'cradling',
  'creak', 'creaked', 'creaking', 'crescendoed', 'doorframe', 'drumbeat',
  'emanate', 'emanated', 'encroaching', 'enveloped', 'eons', 'etched',
  'facepalmed', 'flicker', 'flickered', 'flickering', 'floorboards',
  'glow', 'glowed', 'locket', 'mirroring', 'nocked', 'outmaneuver',
  'outmatched', 'peephole', 'pinpricks', 'planchette', 'pixelated',
  'spiderwebbed', 'warred', 'yellowed',
]

// AI academic / analytical buzzwords overrepresented in LLM essay and non-fiction prose.
// Matched case-insensitively. Source: eqbench slop_list.json (bottom section).
// Per-word weight = how AI-exclusive the word is in essay/non-fiction register:
//   ~0.78–0.92  AI-signature buzzword, vanishingly rare in careful human prose
//   ~0.62–0.75  strong AI-essay register; real in academic writing but overused
//   ~0.48–0.60  AI-leaning but genuinely common in professional/academic prose
//   ~0.40–0.47  normal professional vocabulary that barely discriminates
export const SLOP_WORDS_ESSAY: Record<string, number> = {
  'actionable': 0.70, 'adaptability': 0.50, 'adaptable': 0.45, 'adeptly': 0.72, 'adherence': 0.45,
  'algorithmic': 0.45, 'aligning': 0.55, 'aligns': 0.52, 'alleviates': 0.55, 'amplified': 0.55,
  'amplifies': 0.58, 'amplify': 0.58, 'amplifying': 0.58, 'anomie': 0.78, 'aspirational': 0.62,
  'astutely': 0.72, 'asymmetries': 0.58, 'actualization': 0.72, 'absenteeism': 0.45,
  'bedrock': 0.72, 'biometric': 0.40, 'blending': 0.45, 'bolstered': 0.68, 'bolstering': 0.68,
  'bolsters': 0.68, 'borderless': 0.65, 'bottlenecks': 0.45, 'bridging': 0.55, 'broader': 0.42,
  'broadens': 0.55, 'burgeoning': 0.80, 'burdening': 0.50, 'burdens': 0.45,
  'cementing': 0.65, 'centricity': 0.78, 'characterized': 0.48, 'cohesion': 0.52,
  'collaboratively': 0.62, 'commodification': 0.82, 'commodified': 0.80, 'commoditization': 0.78,
  'communicative': 0.50, 'competencies': 0.60, 'complemented': 0.48, 'complementing': 0.50,
  'complexities': 0.55, 'conducive': 0.60, 'confluence': 0.72, 'congruence': 0.68,
  'constructionism': 0.80, 'constructivist': 0.75, 'contextualize': 0.70, 'contextualized': 0.70,
  'contextualizing': 0.70, 'contextually': 0.65, 'conversely': 0.55, 'cornerstone': 0.75,
  'correlating': 0.50, 'correlational': 0.55, 'counterarguments': 0.55, 'countertransference': 0.78,
  'critiqued': 0.50, 'critiquing': 0.52, 'crucially': 0.68, 'cultivate': 0.58, 'cultivates': 0.58,
  'cultivating': 0.60, 'curricula': 0.45,
  'decentrailizing': 0.60, 'decentralizing': 0.55, 'deconstruct': 0.65, 'deconstructs': 0.65,
  'delineate': 0.70, 'delineates': 0.70, 'delineating': 0.70, 'deliverables': 0.62,
  'democratize': 0.72, 'democratized': 0.70, 'democratizes': 0.72, 'democratizing': 0.72,
  'demonstrable': 0.58, 'demonstrably': 0.60, 'deontological': 0.80, 'determinant': 0.52,
  'determinants': 0.55, 'differentiator': 0.62, 'dilemmas': 0.45, 'diminish': 0.42,
  'disengagement': 0.50, 'disparities': 0.55, 'disruptions': 0.48, 'disrupts': 0.50,
  'disruptors': 0.62, 'dissecting': 0.55, 'dissects': 0.55, 'distills': 0.62, 'divergences': 0.55,
  'diversification': 0.50, 'diversifies': 0.52, 'diversifying': 0.52, 'dynamism': 0.65,
  'elevates': 0.60, 'elucidates': 0.78, 'elucidating': 0.78, 'embed': 0.42, 'embedding': 0.45,
  'embodies': 0.58, 'embodying': 0.58, 'empathetic': 0.55, 'empowers': 0.65, 'encapsulate': 0.65,
  'encapsulates': 0.65, 'encapsulating': 0.65, 'encompasses': 0.58, 'encompass': 0.55,
  'encompassing': 0.58, 'endures': 0.50, 'enduring': 0.58, 'engenders': 0.72, 'enhances': 0.55,
  'enhancing': 0.55, 'ensuring': 0.42, 'entails': 0.48, 'equitable': 0.58, 'equipping': 0.52,
  'equips': 0.52, 'erode': 0.50, 'erodes': 0.52, 'eroding': 0.52, 'ethical': 0.40, 'ethically': 0.45,
  'evolve': 0.40, 'evolves': 0.42, 'evolving': 0.45, 'evidenced': 0.52, 'evoking': 0.55,
  'exacerbate': 0.62, 'exacerbated': 0.62, 'exacerbates': 0.62, 'exacerbating': 0.62,
  'exemplified': 0.58, 'exemplifies': 0.60, 'exemplify': 0.58, 'exemplifying': 0.58,
  'experiential': 0.62, 'exigencies': 0.78, 'externalities': 0.62,
  'facilitating': 0.60, 'falters': 0.50, 'foregrounds': 0.68, 'foregrounding': 0.68,
  'fostered': 0.60, 'fostering': 0.65, 'fosters': 0.62, 'foundational': 0.65, 'fourthly': 0.70,
  'fragmented': 0.45, 'fraught': 0.58, 'frameworks': 0.45, 'frictions': 0.55, 'fueled': 0.45,
  'functionalities': 0.55,
  'gamification': 0.65, 'gamified': 0.65, 'generalizability': 0.62, 'generalizable': 0.60,
  'geopolitical': 0.48, 'globalization': 0.50, 'globalized': 0.52, 'grapple': 0.62, 'grappled': 0.60,
  'grapples': 0.62, 'greenwashing': 0.55, 'groundwork': 0.58, 'groupthink': 0.55,
  'hampers': 0.55, 'heterogeneity': 0.65, 'hierarchies': 0.45, 'highlighting': 0.45,
  'hindering': 0.52, 'hinges': 0.55, 'holistic': 0.80, 'holistically': 0.80, 'homogenization': 0.68,
  'humanized': 0.58, 'humanizes': 0.58, 'humanizing': 0.58, 'hurdles': 0.45,
  'illuminates': 0.65, 'illustrating': 0.45, 'imbue': 0.70, 'imbues': 0.70, 'imbuing': 0.70,
  'immense': 0.50, 'impacting': 0.50, 'impactful': 0.82, 'impairs': 0.50, 'impairing': 0.50,
  'imperatives': 0.60, 'impermanence': 0.65, 'inadequacy': 0.48, 'incentivize': 0.62,
  'incentivized': 0.60, 'incentivizes': 0.62, 'incentivizing': 0.62, 'inclusivity': 0.60,
  'indelible': 0.82, 'indispensable': 0.62, 'inequalities': 0.48, 'inequities': 0.55,
  'inefficiencies': 0.48, 'inferential': 0.58, 'infuses': 0.62, 'ingrained': 0.58, 'inherent': 0.45,
  'inherently': 0.60, 'initiatives': 0.42, 'innovate': 0.58, 'insidiously': 0.65,
  'institutionalize': 0.58, 'institutionalizing': 0.58, 'intergroup': 0.62, 'internalize': 0.58,
  'internalizing': 0.58, 'interconnected': 0.65, 'interconnectedness': 0.82, 'interconnections': 0.65,
  'interdependence': 0.65, 'interdependencies': 0.65, 'interplay': 0.75, 'interrelated': 0.62,
  'intersectionality': 0.72, 'intersects': 0.50, 'intertwined': 0.70, 'intertwines': 0.68,
  'intertwining': 0.68, 'intrinsically': 0.62, 'intricacies': 0.72, 'irrevocably': 0.62,
  'iterative': 0.55, 'iteratively': 0.55, 'iterate': 0.48,
  'journaling': 0.45, 'judicious': 0.68, 'judiciously': 0.68, 'juxtaposing': 0.68, 'juxtaposes': 0.68,
  'leverages': 0.72, 'leveraging': 0.78, 'lifecycle': 0.48, 'lifeblood': 0.78, 'linchpin': 0.80,
  'logistical': 0.45,
  'maladaptive': 0.65, 'maleficence': 0.78, 'manifests': 0.55, 'marginalization': 0.58,
  'marginalized': 0.52, 'marginalizing': 0.55, 'masterclass': 0.70, 'masterfully': 0.72,
  'masterstroke': 0.72, 'measurable': 0.40, 'meaningfully': 0.55, 'mentorship': 0.45,
  'meritocratic': 0.62, 'methodological': 0.52, 'methodologies': 0.52, 'metrics': 0.40,
  'mitigate': 0.55, 'mitigating': 0.55, 'mitigates': 0.55, 'misalignment': 0.55, 'misaligned': 0.52,
  'misalignments': 0.55, 'monolithic': 0.62, 'multifaceted': 0.85, 'multifactorial': 0.65,
  'multipronged': 0.65, 'multilingualism': 0.50,
  'narratives': 0.52, 'navigate': 0.65, 'navigated': 0.62, 'navigates': 0.65, 'navigating': 0.70,
  'nascent': 0.75, 'necessitate': 0.65, 'necessitates': 0.65, 'necessitating': 0.65,
  'neurobiological': 0.55, 'neuroplasticity': 0.58, 'neurodevelopmental': 0.52, 'nuanced': 0.80,
  'nuances': 0.70,
  'obsolescence': 0.52, 'oligopoly': 0.55, 'oligopolistic': 0.58, 'onboarding': 0.45,
  'operant': 0.62, 'operationalize': 0.72, 'operationalized': 0.70, 'optimize': 0.58,
  'optimizing': 0.58, 'optimizes': 0.58, 'organizational': 0.42, 'outcomes': 0.40, 'outpacing': 0.55,
  'overarching': 0.82, 'overemphasis': 0.55, 'overreliance': 0.58, 'oversimplification': 0.58,
  'oversimplifies': 0.58, 'oversimplify': 0.55,
  'paradigm': 0.78, 'paradigms': 0.75, 'paradoxical': 0.58, 'paradoxically': 0.62, 'paramount': 0.80,
  'pedagogical': 0.65, 'performative': 0.62, 'permeates': 0.65, 'permeating': 0.65,
  'personalization': 0.50, 'personalized': 0.45, 'pervasive': 0.55, 'pervasiveness': 0.60,
  'pivotal': 0.78, 'pivots': 0.50, 'pivoted': 0.48, 'poignantly': 0.68, 'policymakers': 0.45,
  'positing': 0.62, 'posits': 0.62, 'predicated': 0.62, 'proactive': 0.72, 'proactively': 0.72,
  'profound': 0.78, 'profoundly': 0.70, 'propels': 0.58, 'psychosocial': 0.55, 'prioritize': 0.45,
  'prioritized': 0.45, 'prioritizes': 0.45, 'prioritizing': 0.48, 'prioritization': 0.52,
  'qualitative': 0.45, 'quantifiable': 0.52, 'quintessential': 0.78,
  'recalibrate': 0.62, 'recalibration': 0.62, 'redefines': 0.60, 'reframe': 0.58, 'reframes': 0.58,
  'reframing': 0.58, 'reimagining': 0.65, 'reinforces': 0.50, 'reinforcing': 0.50, 'relentless': 0.62,
  'reliant': 0.45, 'resilience': 0.70, 'resilient': 0.65, 'reshaping': 0.60, 'resonate': 0.65,
  'resonates': 0.65, 'resonated': 0.60, 'responsiveness': 0.50, 'revolutionized': 0.68,
  'revolutionizing': 0.70, 'rigorous': 0.45, 'rigor': 0.48, 'robust': 0.65, 'rooted': 0.50,
  'safeguarding': 0.55, 'scalable': 0.70, 'scalability': 0.62, 'scrutinize': 0.55,
  'scrutinizing': 0.55, 'seamless': 0.72, 'shaping': 0.42, 'siloed': 0.58, 'silos': 0.55,
  'socioeconomic': 0.48, 'solidify': 0.58, 'solidifies': 0.58, 'solidifying': 0.58,
  'stakeholder': 0.55, 'stakeholders': 0.55, 'starkly': 0.58, 'strategic': 0.42,
  'strategically': 0.50, 'streamline': 0.68, 'streamlines': 0.68, 'streamlining': 0.68,
  'sustainability': 0.48, 'synergies': 0.75, 'synergistic': 0.78, 'synergistically': 0.80,
  'systemic': 0.45,
  'tailored': 0.55, 'tangible': 0.50, 'tapestry': 0.92, 'technological': 0.40, 'thirdly': 0.68,
  'thrives': 0.55, 'timelines': 0.42, 'touchpoints': 0.62, 'traceability': 0.50, 'transcends': 0.68,
  'transcending': 0.68, 'transformative': 0.82, 'transactional': 0.55, 'triangulation': 0.58,
  'unaddressed': 0.50, 'undeniable': 0.65, 'undeniably': 0.68, 'underpin': 0.70, 'underpins': 0.70,
  'underpinned': 0.70, 'underpinning': 0.72, 'underpinnings': 0.72, 'underscore': 0.72,
  'underscored': 0.70, 'underscores': 0.72, 'underscoring': 0.72, 'underserved': 0.55,
  'unflinching': 0.65, 'unmet': 0.48, 'unparalleled': 0.75, 'upheavals': 0.58, 'utilizing': 0.78,
  'utilizes': 0.75,
  'vulnerabilities': 0.45, 'wellspring': 0.85, 'workflows': 0.42,
}

export const SLOP_BIGRAMS: Record<string, number> = {
  // ── Creative writing / narrative tells ──────────────────────────────────────
  'brow furrowed':         0.82,
  'eyes widened':          0.78,
  'eyes narrowed':         0.75,
  'swallowed hard':        0.85,
  'cleared throat':        0.80,
  'tilted head':           0.75,
  'raised eyebrow':        0.80,
  'mind racing':           0.72,
  'dimly lit':             0.78,
  'air crackled':          0.82,
  'almost imperceptible':  0.85,
  'glimmer hope':          0.75,
  'beacon hope':           0.78,
  'fabric reality':        0.85,
  'felt surge':            0.75,
  'face etched':           0.78,
  'fell silent':           0.68,
  'something akin':        0.70,
  'beneath surface':       0.72,
  'heart raced':           0.68,
  'voice steady':          0.72,
  'mind reeling':          0.75,
  'eyes gleaming':         0.78,
  // ── Essay / analytical tells ─────────────────────────────────────────────────
  'inextricably linked':   0.85,
  'unwavering commitment': 0.90,
  'relentless pursuit':    0.85,
  'deeply rooted':         0.75,
  'deeply ingrained':      0.80,
  'deeply embedded':       0.78,
  'deeply intertwined':    0.82,
  'fostering culture':     0.82,
  'stakeholder engagement': 0.80,
  'proactive approach':    0.78,
}

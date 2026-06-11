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
export const RULE_SCORING: Record<string, { ruleWeight: number; scoringMode: ScoringMode; freeRate: number }> = {
  // ── Word choice (lexical; per-word weights carry most of the signal) ────────
  'overused-intensifier':     { ruleWeight: 1.3, scoringMode: 'diminishing', freeRate: 0 },
  'elevated-register':        { ruleWeight: 1.5, scoringMode: 'diminishing', freeRate: 0 },
  'filler-adverbs':           { ruleWeight: 1.2, scoringMode: 'diminishing', freeRate: 0 },
  'filler-adjectives':        { ruleWeight: 1.3, scoringMode: 'diminishing', freeRate: 0 },
  'quote-overuse':            { ruleWeight: 1.4, scoringMode: 'linear',      freeRate: 0 },
  'almost-hedge':             { ruleWeight: 1.5, scoringMode: 'threshold',   freeRate: 0.5 },

  // ── Statistical n-gram / name tells (validated against human baselines) ─────
  'slop-trigram':             { ruleWeight: 3.2, scoringMode: 'diminishing', freeRate: 0 },
  'slop-bigram':              { ruleWeight: 2.5, scoringMode: 'diminishing', freeRate: 0 },
  'fiction-body-language':    { ruleWeight: 2.4, scoringMode: 'diminishing', freeRate: 0 },
  'ai-character-name':        { ruleWeight: 2.8, scoringMode: 'diminishing', freeRate: 0 },

  // ── Definitive artifacts — a human almost never produces these ──────────────
  'chatbot-artifact':         { ruleWeight: 5.0, scoringMode: 'linear',      freeRate: 0 },
  'knowledge-cutoff-disclaimer': { ruleWeight: 5.0, scoringMode: 'linear',   freeRate: 0 },

  // ── Sentence structure ──────────────────────────────────────────────────────
  'negation-pivot':           { ruleWeight: 3.0, scoringMode: 'linear',      freeRate: 0 },
  'negation-countdown':       { ruleWeight: 3.2, scoringMode: 'linear',      freeRate: 0 },
  'serves-as':                { ruleWeight: 2.6, scoringMode: 'diminishing', freeRate: 0 },
  'superficial-analysis':     { ruleWeight: 3.0, scoringMode: 'diminishing', freeRate: 0 },
  'unnecessary-elaboration':  { ruleWeight: 2.4, scoringMode: 'diminishing', freeRate: 0 },
  'gerund-fragment-litany':   { ruleWeight: 2.3, scoringMode: 'threshold',   freeRate: 0.5 },
  'anaphora-abuse':           { ruleWeight: 1.9, scoringMode: 'threshold',   freeRate: 0.5 },
  'short-hook-paragraph':     { ruleWeight: 2.5, scoringMode: 'threshold',   freeRate: 0.5 },
  'staccato-burst':           { ruleWeight: 1.7, scoringMode: 'threshold',   freeRate: 0.5 },
  'hedge-stack':              { ruleWeight: 1.8, scoringMode: 'threshold',   freeRate: 0.5 },
  'unnecessary-contrast':     { ruleWeight: 1.7, scoringMode: 'threshold',   freeRate: 0.5 },
  'parenthetical-qualifier':  { ruleWeight: 1.6, scoringMode: 'threshold',   freeRate: 0 },
  'question-then-answer':     { ruleWeight: 1.6, scoringMode: 'threshold',   freeRate: 1.5 },
  'false-range':              { ruleWeight: 2.3, scoringMode: 'threshold',   freeRate: 0.5 },
  'colon-elaboration':        { ruleWeight: 1.3, scoringMode: 'threshold',   freeRate: 1.0 },
  'em-dash-overuse':          { ruleWeight: 1.2, scoringMode: 'threshold',   freeRate: 1.0 },
  'triple-construction':      { ruleWeight: 1.2, scoringMode: 'threshold',   freeRate: 1.5 },

  // ── Rhetorical ──────────────────────────────────────────────────────────────
  'sycophantic-frame':        { ruleWeight: 3.5, scoringMode: 'linear',      freeRate: 0 },
  'empathy-performance':      { ruleWeight: 3.2, scoringMode: 'linear',      freeRate: 0 },
  'false-vulnerability':      { ruleWeight: 3.0, scoringMode: 'linear',      freeRate: 0 },
  'throat-clearing':          { ruleWeight: 3.0, scoringMode: 'linear',      freeRate: 0 },
  'historical-analogy-stack': { ruleWeight: 2.6, scoringMode: 'linear',      freeRate: 0 },
  'balanced-take':            { ruleWeight: 2.6, scoringMode: 'linear',      freeRate: 0 },
  'significance-phrases':     { ruleWeight: 2.8, scoringMode: 'diminishing', freeRate: 0 },
  'important-to-note':        { ruleWeight: 2.6, scoringMode: 'diminishing', freeRate: 0 },
  'despite-challenges':       { ruleWeight: 2.6, scoringMode: 'threshold',   freeRate: 0.5 },
  'pedagogical-aside':        { ruleWeight: 2.5, scoringMode: 'linear',      freeRate: 0 },
  'imagine-world':            { ruleWeight: 2.5, scoringMode: 'linear',      freeRate: 0 },
  'heres-the-kicker':         { ruleWeight: 2.4, scoringMode: 'linear',      freeRate: 0 },
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
  'era-opener':               { ruleWeight: 2.5, scoringMode: 'threshold',   freeRate: 0.5 },
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
}

// vital, robust, dynamic, fundamental moved to NLP layer (context-sensitive)
export const INTENSIFIERS: Record<string, number> = {
  'crucial':       0.50,
  'comprehensive': 0.55,
  'arguably':      0.60,
  'straightforward': 0.40,
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
  'meaningful':     0.50,
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
  'overall,':                            0.70,
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

// AI-default fantasy character names (eqbench slop_list.json, Ael-/Kael-/El- families
// + high-frequency AI names). Match only when capitalised — proper-noun usage.
export const AI_CHARACTER_NAMES: string[] = [
  // Ael- family (near-exclusively AI-invented)
  'Aelara', 'Aeldrin', 'Aeliana', 'Aelion', 'Aella', 'Aelyn', 'Aelwyn',
  // Kael- family
  'Kael', 'Kaela', 'Kaelan', 'Kaelen', 'Kaelin', 'Kaelor',
  // High-frequency AI defaults
  'Elara', 'Theron', 'Lysander', 'Lysandra', 'Seraphina', 'Solara',
  'Lyrien', 'Elysia', 'Elira', 'Eliora', 'Eldarion',
  // AI villain / warrior names
  'Malachor', 'Malazar', 'Draven', 'Vorlag', 'Zorax',
  // AI sci-fi names
  'Xyla', 'Xylar', 'Xylara', 'Zyla', 'Zylar', 'Caelum',
  // Fantasy staples with very high AI frequency
  'Zephyr', 'Aldric', 'Aldwyn',
]

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

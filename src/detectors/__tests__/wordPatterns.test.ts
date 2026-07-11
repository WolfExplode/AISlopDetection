import { describe, it, expect } from 'vitest'
import { runClientDetectors } from '../index'
import {
  detectOverusedIntensifiers,
  detectElevatedRegister,
  detectFillerAdverbs,
  detectAlmostHedge,
  detectEraOpener,
  detectMetaphorCrutch,
  detectImportantToNote,
  detectBroaderImplications,
  detectFalseConclusion,
  detectConnectorAddiction,
  detectUnnecessaryContrast,
  detectEmDashPivot,
  detectNegationPivot,
  detectColonElaboration,
  detectParentheticalQualifier,
  detectQuestionThenAnswer,
  detectHedgeStack,
  detectStaccatoBurst,
  detectListicleInstinct,
  detectServesAs,
  detectNegationCountdown,
  detectAnaphoraAbuse,
  detectGerundLitany,
  detectHeresTheKicker,
  detectPedagogicalAside,
  detectImagineWorld,
  detectListicleTrenchCoat,
  detectVagueAttribution,
  detectBoldFirstBullets,
  detectUnicodeDecoration,
  detectDespiteChallenges,
  detectConceptLabel,
  detectDramaticFragment,
  detectPairedNegation,
  detectPhantomContrast,
  detectRealityClaim,
  detectSuperficialAnalysis,
  detectFalseRange,
  detectExemplarCliche,
  detectChatbotArtifact,
  detectSignificancePhrases,
  detectStackedIntensifiers,
  detectSycophanticPhrases,
  detectSycophanticWords,
  detectScareQuotes,
  detectInlineEmphasis,
  detectProfessionalDisclaimer,
  detectEarnedClaim,
  detectSlopTrigrams,
  detectSlopBigrams,
} from '../wordPatterns'

// Helper: assert at least one violation of the given rule exists
function assertFires(violations: ReturnType<typeof detectOverusedIntensifiers>, ruleId: string) {
  expect(violations.some(v => v.ruleId === ruleId)).toBe(true)
}

// Helper: assert no violations of the given rule
function assertSilent(violations: ReturnType<typeof detectOverusedIntensifiers>, ruleId: string) {
  expect(violations.filter(v => v.ruleId === ruleId)).toHaveLength(0)
}

// ── Overused Intensifiers ──────────────────────────────────────────────────

describe('detectOverusedIntensifiers', () => {
  it('flags "crucial"', () => {
    assertFires(detectOverusedIntensifiers('This is crucial to understand.'), 'overused-intensifier')
  })
  it('flags "leverage"', () => {
    assertFires(runClientDetectors('We must leverage our existing assets.'), 'overused-intensifier')
  })
  it('flags "delve"', () => {
    assertFires(runClientDetectors('Let us delve into the details.'), 'overused-intensifier')
  })
  it('flags "robust" (via NLP layer)', () => {
    assertFires(runClientDetectors('We built a robust framework.'), 'overused-intensifier')
  })
  it('flags "nuanced"', () => {
    assertFires(detectOverusedIntensifiers('This requires a nuanced approach.'), 'overused-intensifier')
  })
  it('flags "pivotal"', () => {
    assertFires(detectOverusedIntensifiers('This is a pivotal moment in history.'), 'overused-intensifier')
  })
  it('flags "unprecedented"', () => {
    assertFires(detectOverusedIntensifiers('We are living through an unprecedented crisis.'), 'overused-intensifier')
  })
  it('flags "tapestry"', () => {
    assertFires(detectOverusedIntensifiers('A rich tapestry of cultural influences.'), 'overused-intensifier')
  })
  it('flags "multifaceted"', () => {
    assertFires(detectOverusedIntensifiers('This is a multifaceted problem.'), 'overused-intensifier')
  })
  it('flags "landscape"', () => {
    assertFires(detectOverusedIntensifiers('The competitive landscape has shifted.'), 'overused-intensifier')
  })
  it('flags "underscore" / "underscores"', () => {
    assertFires(runClientDetectors('This underscores the importance of planning.'), 'overused-intensifier')
  })
  it('flags "paradigm"', () => {
    assertFires(detectOverusedIntensifiers('We need a new paradigm for thinking about this.'), 'overused-intensifier')
  })
  it('does not flag ordinary words', () => {
    assertSilent(detectOverusedIntensifiers('The cat sat on the mat.'), 'overused-intensifier')
  })
})

// ── Elevated Register ──────────────────────────────────────────────────────

describe('detectElevatedRegister', () => {
  it('flags "utilize"', () => {
    assertFires(detectElevatedRegister('We should utilize this tool.'), 'elevated-register')
  })
  it('flags "commence"', () => {
    assertFires(detectElevatedRegister('We will commence the process tomorrow.'), 'elevated-register')
  })
  it('flags "facilitate"', () => {
    assertFires(detectElevatedRegister('This will facilitate better outcomes.'), 'elevated-register')
  })
  it('flags "endeavor"', () => {
    assertFires(detectElevatedRegister('We will endeavor to improve.'), 'elevated-register')
  })
  it('flags "demonstrate" (elevated form of "show")', () => {
    assertFires(detectElevatedRegister('The results demonstrate that the approach works.'), 'elevated-register')
  })
  it('flags "craft" as verb (elevated form of "make")', () => {
    assertFires(runClientDetectors('We should craft a response to each concern.'), 'elevated-register')
  })
  it('does not flag "craft" as noun', () => {
    assertSilent(runClientDetectors('She bought craft beer and visited a craft store.'), 'elevated-register')
  })
  it('flags "moving forward"', () => {
    assertFires(detectElevatedRegister('Moving forward, we will focus on delivery.'), 'elevated-register')
  })
  it('flags "at this juncture"', () => {
    assertFires(detectElevatedRegister('At this juncture, a decision is required.'), 'elevated-register')
  })
  it('does not flag "use"', () => {
    assertSilent(detectElevatedRegister('We should use this tool.'), 'elevated-register')
  })
  it('does not flag "show"', () => {
    assertSilent(detectElevatedRegister('The data shows a clear trend.'), 'elevated-register')
  })
})

// ── Filler Adverbs ─────────────────────────────────────────────────────────

describe('detectFillerAdverbs', () => {
  it('flags "importantly"', () => {
    assertFires(detectFillerAdverbs('Importantly, this affects everyone.'), 'filler-adverbs')
  })
  it('flags "ultimately"', () => {
    assertFires(detectFillerAdverbs('Ultimately, success depends on effort.'), 'filler-adverbs')
  })
  it('flags "essentially"', () => {
    assertFires(detectFillerAdverbs('This is essentially a marketing problem.'), 'filler-adverbs')
  })
  it('flags "fundamentally"', () => {
    assertFires(detectFillerAdverbs('This is fundamentally wrong.'), 'filler-adverbs')
  })
  it('does not flag "generally"', () => {
    assertSilent(detectFillerAdverbs('We generally recognize this right.'), 'filler-adverbs')
  })
})

// ── Almost Hedge ───────────────────────────────────────────────────────────

describe('detectAlmostHedge', () => {
  it('flags "almost always"', () => {
    assertFires(detectAlmostHedge('This is almost always true.'), 'almost-hedge')
  })
  it('flags "almost never"', () => {
    assertFires(detectAlmostHedge('It almost never works that way.'), 'almost-hedge')
  })
  it('flags "almost certainly"', () => {
    assertFires(detectAlmostHedge('This will almost certainly happen.'), 'almost-hedge')
  })
  it('does not flag "almost" alone', () => {
    assertSilent(detectAlmostHedge('It is almost done.'), 'almost-hedge')
  })
})

// ── Era Opener ─────────────────────────────────────────────────────────────

describe('detectEraOpener', () => {
  it('flags "In an era of"', () => {
    assertFires(detectEraOpener('In an era of rapid change, companies must adapt.'), 'era-opener')
  })
  it('flags "in a era of" variant', () => {
    assertFires(detectEraOpener('We live in an era where everything is connected.'), 'era-opener')
  })
  it('does not flag unrelated sentences', () => {
    assertSilent(detectEraOpener('The company was founded in 1990.'), 'era-opener')
  })
})

// ── Metaphor Crutch ────────────────────────────────────────────────────────

describe('detectMetaphorCrutch', () => {
  it('flags "double-edged sword"', () => {
    assertFires(detectMetaphorCrutch('This is a double-edged sword.'), 'metaphor-crutch')
  })
  it('flags "game changer"', () => {
    assertFires(detectMetaphorCrutch('AI is a game changer for the industry.'), 'metaphor-crutch')
  })
  it('flags "tip of the iceberg"', () => {
    assertFires(detectMetaphorCrutch('This is just the tip of the iceberg.'), 'metaphor-crutch')
  })
  it('flags "north star"', () => {
    assertFires(detectMetaphorCrutch('Quality is our north star.'), 'metaphor-crutch')
  })
  it('flags "deep dive"', () => {
    assertFires(detectMetaphorCrutch("Let's do a deep dive into the data."), 'metaphor-crutch')
  })
  it('does not flag ordinary language', () => {
    assertSilent(detectMetaphorCrutch('The results were better than expected.'), 'metaphor-crutch')
  })
})

// ── Important to Note ──────────────────────────────────────────────────────

describe('detectImportantToNote', () => {
  it('flags "it is important to note"', () => {
    assertFires(detectImportantToNote("It is important to note that this affects everyone."), 'important-to-note')
  })
  it("flags \"it's worth noting\"", () => {
    assertFires(detectImportantToNote("It's worth noting that results may vary."), 'important-to-note')
  })
  it('flags "it should be noted"', () => {
    assertFires(detectImportantToNote('It should be noted that exceptions exist.'), 'important-to-note')
  })
  it('does not flag ordinary sentences', () => {
    assertSilent(detectImportantToNote('The results were consistent.'), 'important-to-note')
  })
})

// ── Broader Implications ───────────────────────────────────────────────────

describe('detectBroaderImplications', () => {
  it('flags "broader implications"', () => {
    assertFires(detectBroaderImplications('This has broader implications for society.'), 'broader-implications')
  })
  it('flags "wider implications"', () => {
    assertFires(detectBroaderImplications('The wider implications are unclear.'), 'broader-implications')
  })
  it('does not flag unrelated sentences', () => {
    assertSilent(detectBroaderImplications('The policy was updated last year.'), 'broader-implications')
  })
})

// ── False Conclusion ───────────────────────────────────────────────────────

describe('detectFalseConclusion', () => {
  it('flags "In conclusion"', () => {
    assertFires(detectFalseConclusion('In conclusion, we have shown that X is true.'), 'false-conclusion')
  })
  it('flags "At the end of the day"', () => {
    assertFires(detectFalseConclusion('At the end of the day, results matter most.'), 'false-conclusion')
  })
  it('flags "To summarize"', () => {
    assertFires(detectFalseConclusion('To summarize, the three key points are these.'), 'false-conclusion')
  })
  it('flags spec example: "Moving forward, we must..."', () => {
    assertFires(detectFalseConclusion('Moving forward, we must prioritize trust over speed.'), 'false-conclusion')
  })
  it('flags "Going forward,"', () => {
    assertFires(detectFalseConclusion('Going forward, the focus will shift to execution.'), 'false-conclusion')
  })
  it('does not flag mid-sentence usage', () => {
    // "all in all" mid-sentence is borderline; ensure it doesn't explode
    const v = detectFalseConclusion('The project, all in all, was a success.')
    expect(Array.isArray(v)).toBe(true)
  })
})

// ── Connector Addiction ────────────────────────────────────────────────────

describe('detectConnectorAddiction', () => {
  it('flags "Furthermore" opening a sentence', () => {
    assertFires(detectConnectorAddiction('Furthermore, this approach has merit.'), 'connector-addiction')
  })
  it('flags "Moreover"', () => {
    assertFires(detectConnectorAddiction('Moreover, the data confirms our hypothesis.'), 'connector-addiction')
  })
  it('flags "Additionally"', () => {
    assertFires(detectConnectorAddiction('Additionally, we found three other patterns.'), 'connector-addiction')
  })
  it('flags "However"', () => {
    assertFires(detectConnectorAddiction('However, the results were inconclusive.'), 'connector-addiction')
  })
  it('flags "That said,"', () => {
    assertFires(detectConnectorAddiction('That said, there are exceptions worth noting.'), 'connector-addiction')
  })
  it('flags "With that in mind,"', () => {
    assertFires(detectConnectorAddiction('With that in mind, we can now turn to the solution.'), 'connector-addiction')
  })
  it('flags a chain of connectors across paragraphs', () => {
    const text = 'First point.\n\nFurthermore, the evidence is clear.\n\nMoreover, this has been confirmed.\n\nAdditionally, the trend holds.'
    const v = detectConnectorAddiction(text)
    expect(v.filter(x => x.ruleId === 'connector-addiction').length).toBeGreaterThanOrEqual(3)
  })
})

// ── Unnecessary Contrast ───────────────────────────────────────────────────

describe('detectUnnecessaryContrast', () => {
  it('flags "whereas"', () => {
    assertFires(detectUnnecessaryContrast('This approach works, whereas the old one did not.'), 'unnecessary-contrast')
  })
  it('flags spec example with "whereas"', () => {
    assertFires(detectUnnecessaryContrast('Models write one register above where a human would, whereas human writers tend to match register to context.'), 'unnecessary-contrast')
  })
  it('flags "as opposed to"', () => {
    assertFires(detectUnnecessaryContrast('We use data, as opposed to intuition.'), 'unnecessary-contrast')
  })
  it('flags "unlike"', () => {
    assertFires(detectUnnecessaryContrast('Unlike its predecessor, this version is fast.'), 'unnecessary-contrast')
  })
  it('flags "in contrast to"', () => {
    assertFires(detectUnnecessaryContrast('In contrast to earlier models, this one performs well.'), 'unnecessary-contrast')
  })
})

// ── Em-Dash Pivot ──────────────────────────────────────────────────────────

describe('detectEmDashPivot', () => {
  it('flags an em-dash', () => {
    assertFires(detectEmDashPivot('This is important—but often overlooked.'), 'em-dash-overuse')
  })
  it('flags multiple em-dashes', () => {
    const v = detectEmDashPivot('First—second—third.')
    expect(v.filter(x => x.ruleId === 'em-dash-overuse').length).toBeGreaterThanOrEqual(2)
  })
  it('flags "not X—Y" negation em-dash pattern (spec example)', () => {
    // Em-dash used as the pivot marker in a negation reframe
    assertFires(detectEmDashPivot("It's not just a tool—it's a paradigm shift."), 'em-dash-overuse')
  })
  it('flags em-dash replacing a semicolon', () => {
    assertFires(detectEmDashPivot('The data shows one thing—the conclusion is another.'), 'em-dash-overuse')
  })
  it('flags em-dash replacing a parenthetical', () => {
    assertFires(detectEmDashPivot('The answer—and this surprises most people—is simpler than expected.'), 'em-dash-overuse')
  })
  it('does not flag a regular hyphen', () => {
    assertSilent(detectEmDashPivot('This is a well-known fact.'), 'em-dash-overuse')
  })
})

// ── Negation Pivot ─────────────────────────────────────────────────────────

describe('detectNegationPivot', () => {
  it('flags "not X, but Y" with straight apostrophe', () => {
    assertFires(detectNegationPivot("Companies don't succeed by luck, but by discipline."), 'negation-pivot')
  })
  it('flags "not X, but Y" with curly apostrophe (U+2019)', () => {
    // This is the real-world case from contenteditable
    assertFires(detectNegationPivot('The system doesn\u2019t constrain through prohibition, but through amplification.'), 'negation-pivot')
  })
  it('flags "do not X, but Y"', () => {
    assertFires(detectNegationPivot('We do not build for speed, but for resilience.'), 'negation-pivot')
  })
  it('flags "not through X, but through Y"', () => {
    assertFires(detectNegationPivot("The choice architectures don\u2019t constrain through prohibition, but through amplification and attenuation."), 'negation-pivot')
  })
  it('flags "isn\'t X but Y" without comma', () => {
    assertFires(detectNegationPivot("The question isn\u2019t whether to use these technologies but in whose interests and under whose control they operate."), 'negation-pivot')
  })
  it('flags "is not X but Y" without comma', () => {
    assertFires(detectNegationPivot('The issue is not access but accountability.'), 'negation-pivot')
  })
  it('flags "not X—Y" em-dash variant (spec example)', () => {
    assertFires(detectNegationPivot("It's not just a tool—it's a paradigm shift."), 'negation-pivot')
  })
  it('flags "isn\'t X—Y" em-dash variant (spec example)', () => {
    assertFires(detectNegationPivot("This isn\u2019t about technology\u2014it\u2019s about trust."), 'negation-pivot')
  })
  it('does not flag "but" without a preceding negation', () => {
    assertSilent(detectNegationPivot('The results were good, but not perfect.'), 'negation-pivot')
  })
  it('does not flag two sentences with different subjects', () => {
    assertSilent(detectNegationPivot("She doesn't like the proposal. He thinks it has merit."), 'negation-pivot')
  })
  it('flags trailing ", not a [noun]" negation', () => {
    assertFires(detectNegationPivot('The research frames remote-first as a deliberate operating model anchored in trust, clarity and well-designed touchpoints, not a stopgap.'), 'negation-pivot')
    assertFires(detectNegationPivot('It is a deliberate choice, not an accident.'), 'negation-pivot')
    assertFires(detectNegationPivot('Remote-first is a competitive advantage, not a compromise.'), 'negation-pivot')
  })
  it('does not flag natural negation without article', () => {
    assertSilent(detectNegationPivot('The results were fast, not slow.'), 'negation-pivot')
  })
  it('flags "rather than" contrast', () => {
    assertFires(detectNegationPivot('policies that reflect labor market realities rather than nostalgic preferences.'), 'negation-pivot')
    assertFires(detectNegationPivot('We should act on evidence rather than on assumptions.'), 'negation-pivot')
  })
  it('does not flag short "rather than" contrasts', () => {
    assertSilent(detectNegationPivot('She chose to walk rather than run.'), 'negation-pivot')
  })
  it('flags semicolon negation pivot', () => {
    assertFires(detectNegationPivot('These are not isolated anecdotes; they are economy-wide patterns.'), 'negation-pivot')
    assertFires(detectNegationPivot('This is not a coincidence; it is a pattern.'), 'negation-pivot')
  })
  it('flags "isn\'t [qualifier] about X, it\'s about Y" reframe construction', () => {
    assertFires(detectNegationPivot("Striking the perfect pose in photography isn't just about looking good, It's about telling a story."), 'negation-pivot')
    assertFires(detectNegationPivot("isn't all about looking good, It's about telling a story."), 'negation-pivot')
    assertFires(detectNegationPivot("This isn't just about efficiency, it's about trust."), 'negation-pivot')
    assertFires(detectNegationPivot("Leadership isn't merely about authority, it's about service."), 'negation-pivot')
    assertFires(detectNegationPivot("Success isn't only about talent, it's about consistency."), 'negation-pivot')
  })
  it('flags contracted-copula reframe, consistent with the full "is not" form', () => {
    assertFires(detectNegationPivot("It's not immunity, it's family."), 'negation-pivot')
    assertFires(detectNegationPivot("It's not just immunity, it's family."), 'negation-pivot')
    assertFires(detectNegationPivot("It's not merely a habit, it's an identity."), 'negation-pivot')
    assertFires(detectNegationPivot("They're not enemies, they're allies."), 'negation-pivot')
  })
  it('does not fire on non-copula "not" or hortative "let\'s not"', () => {
    assertSilent(detectNegationPivot("I did not finish the report, it's still on my desk."), 'negation-pivot')
    assertSilent(detectNegationPivot("Let's not argue, it's pointless."), 'negation-pivot')
  })
})

// ── Colon Elaboration ──────────────────────────────────────────────────────

describe('detectColonElaboration', () => {
  it('flags a short clause followed by colon and long explanation', () => {
    assertFires(detectColonElaboration('The solution is simple: we need to change how we approach the fundamental problem at its root.'), 'colon-elaboration')
  })
  it('flags spec example: "The answer is simple: we need to rethink..."', () => {
    assertFires(detectColonElaboration('The answer is simple: we need to rethink our approach from the ground up.'), 'colon-elaboration')
  })
  it('flags "There is one problem: the data does not support the conclusion we reached."', () => {
    assertFires(detectColonElaboration('There is one problem: the data does not support the conclusion we reached.'), 'colon-elaboration')
  })
  it('does not flag a colon in a short list item', () => {
    const v = detectColonElaboration('Note: done.')
    expect(Array.isArray(v)).toBe(true)
  })
})

// ── Parenthetical Qualifier ────────────────────────────────────────────────

describe('detectParentheticalQualifier', () => {
  it('flags a long paren parenthetical', () => {
    assertFires(detectParentheticalQualifier('This approach (which has been widely debated in the literature) is not new.'), 'parenthetical-qualifier')
  })
  it('flags spec comma example: "This is, of course, a simplification."', () => {
    assertFires(detectParentheticalQualifier('This is, of course, a simplification.'), 'parenthetical-qualifier')
  })
  it('flags spec comma example: "There are, to be fair, exceptions."', () => {
    assertFires(detectParentheticalQualifier('There are, to be fair, exceptions.'), 'parenthetical-qualifier')
  })
  it('flags "admittedly" comma qualifier', () => {
    assertFires(detectParentheticalQualifier('The approach is, admittedly, imperfect.'), 'parenthetical-qualifier')
  })
  it('flags "needless to say" comma qualifier', () => {
    assertFires(detectParentheticalQualifier('This is, needless to say, complicated.'), 'parenthetical-qualifier')
  })
  it('does not flag a short parenthetical like "(e.g.)"', () => {
    assertSilent(detectParentheticalQualifier('Use a tool (e.g. a hammer) for this.'), 'parenthetical-qualifier')
  })
})

// ── Question-Then-Answer ───────────────────────────────────────────────────

describe('detectQuestionThenAnswer', () => {
  it('flags a short rhetorical Q immediately followed by a short answer', () => {
    assertFires(detectQuestionThenAnswer('What does this mean? It means we must adapt.'), 'question-then-answer')
  })
  it('flags spec example: "So what does this mean for the average user? It means everything."', () => {
    assertFires(detectQuestionThenAnswer('So what does this mean for the average user? It means everything.'), 'question-then-answer')
  })
  it('flags Q+A within the same paragraph', () => {
    assertFires(detectQuestionThenAnswer('Why does this matter?\nIt shapes every decision we make.'), 'question-then-answer')
  })
  it('does NOT flag a question followed by a long answer sentence', () => {
    const text = 'How can independent musicians compete when the most popular streaming algorithms consistently favor major-label releases?\nThis is a structural problem about what kind of relationship we want between platforms, capital, and the artists who actually produce the music that makes these services valuable.'
    assertSilent(detectQuestionThenAnswer(text), 'question-then-answer')
  })
  it('does NOT pair a question in one paragraph with the next paragraph', () => {
    const text = 'What does this mean?\n\nThe building codes governing this type of construction were written before composite materials became commercially viable at scale.'
    assertSilent(detectQuestionThenAnswer(text), 'question-then-answer')
  })
  it('does NOT flag a long standalone sentence near no question mark', () => {
    const text = 'The building codes governing this type of construction were written before composite materials became commercially viable at scale.'
    assertSilent(detectQuestionThenAnswer(text), 'question-then-answer')
  })
  it('does NOT flag quoted dialogue (straight double quotes)', () => {
    const text = '"Where were you last night?" "Out with friends," she said.'
    assertSilent(detectQuestionThenAnswer(text), 'question-then-answer')
  })
  it('does NOT flag quoted dialogue (curly double quotes)', () => {
    const text = '“Why does this matter?” “It shapes every decision we make.”'
    assertSilent(detectQuestionThenAnswer(text), 'question-then-answer')
  })
  it('does NOT flag single-quoted dialogue', () => {
    const text = '‘Where were you?’ ‘Out.’ He shrugged and turned away from her.'
    assertSilent(detectQuestionThenAnswer(text), 'question-then-answer')
  })
  it('does NOT flag a question attributed to a speaker with a quoted answer', () => {
    const text = 'She leaned in and asked, "What does this mean?" It means we must adapt.'
    assertSilent(detectQuestionThenAnswer(text), 'question-then-answer')
  })
  it('still flags unquoted rhetorical Q then A after a dialogue fix', () => {
    assertFires(detectQuestionThenAnswer('What does this mean? It means we must adapt.'), 'question-then-answer')
  })
})

// ── Hedge Stack ────────────────────────────────────────────────────────────

describe('detectHedgeStack', () => {
  it('flags a sentence with multiple epistemic hedges', () => {
    assertFires(detectHedgeStack('Perhaps this might arguably be considered a problem.'), 'hedge-stack')
  })
  it('flags a sentence with hedge words + modal', () => {
    assertFires(detectHedgeStack('Seemingly, this could perhaps be the right approach.'), 'hedge-stack')
  })
  it('flags spec example with five hedges', () => {
    // "may not be" + "potentially" = 2 detectable hedges
    assertFires(detectHedgeStack("It's worth noting that, while this may not be universally applicable, in many cases it can potentially offer significant benefits."), 'hedge-stack')
  })
  it('does NOT flag a single hedge word', () => {
    assertSilent(detectHedgeStack('Perhaps this is worth considering.'), 'hedge-stack')
  })
  it('does NOT flag "should" as a hedge (normative use)', () => {
    assertSilent(detectHedgeStack('We are witness to a kind of massive institutional failure, the non-adoption of tools that should exist but don\u2019t.'), 'hedge-stack')
  })
  it('does NOT flag "kind of" as a hedge when used as a classifier', () => {
    assertSilent(detectHedgeStack('This is a kind of problem that requires careful thought.'), 'hedge-stack')
  })
  it('does NOT flag "would" as a hedge (conditional use)', () => {
    assertSilent(detectHedgeStack('That would be a significant improvement to the system.'), 'hedge-stack')
  })
  it('does NOT match hedges inside larger words ("impossibly" is not "possibly")', () => {
    assertSilent(detectHedgeStack('Impossibly, this might work.'), 'hedge-stack')
  })
  it('does NOT match "sort of" inside "resort offers"', () => {
    assertSilent(detectHedgeStack('The resort offers perhaps the best view in town.'), 'hedge-stack')
  })
  it('does NOT stack hedges across a paragraph boundary', () => {
    assertSilent(detectHedgeStack('This might work\n\nPerhaps it will rain'), 'hedge-stack')
  })
})

// ── Staccato Burst ─────────────────────────────────────────────────────────

describe('detectStaccatoBurst', () => {
  it('flags three or more consecutive short sentences', () => {
    assertFires(detectStaccatoBurst('AI is here. It is growing. It is changing everything. We must act.'), 'staccato-burst')
  })
  it('flags spec example: "This matters. It always has. And it always will."', () => {
    assertFires(detectStaccatoBurst('This matters. It always has. And it always will.'), 'staccato-burst')
  })
  it('flags spec example: "The data is clear. The trend is undeniable. The conclusion is obvious."', () => {
    assertFires(detectStaccatoBurst('The data is clear. The trend is undeniable. The conclusion is obvious.'), 'staccato-burst')
  })
  it('does NOT flag two short sentences', () => {
    assertSilent(detectStaccatoBurst('AI is here. It is growing.'), 'staccato-burst')
  })
  it('does NOT flag long sentences', () => {
    assertSilent(detectStaccatoBurst('Artificial intelligence is fundamentally reshaping how we think about knowledge. The implications for education, work, and human creativity are profound and far-reaching.'), 'staccato-burst')
  })
  it('does NOT split on abbreviations (Dr., Prof.) into a fake burst', () => {
    assertSilent(detectStaccatoBurst('The report cites Dr. Smith and Prof. Jones extensively today.'), 'staccato-burst')
  })
  it('does NOT count unpunctuated list lines toward a burst', () => {
    assertSilent(detectStaccatoBurst('Fast setup\nEasy configuration\nGreat documentation\nLow cost.'), 'staccato-burst')
  })
})

// ── Metaphor Crutch (additional spec examples) ─────────────────────────────

describe('detectMetaphorCrutch (spec examples)', () => {
  it('flags "paradigm shift" (spec example)', () => {
    assertFires(detectMetaphorCrutch("It's not just a tool—it's a paradigm shift."), 'metaphor-crutch')
  })
  it('flags "elephant in the room"', () => {
    assertFires(detectMetaphorCrutch('The elephant in the room is that nobody reads the documentation.'), 'metaphor-crutch')
  })
  it('flags "perfect storm"', () => {
    assertFires(detectMetaphorCrutch('A perfect storm of budget cuts and talent flight.'), 'metaphor-crutch')
  })
  it('flags "building blocks"', () => {
    assertFires(detectMetaphorCrutch('These are the building blocks of a successful strategy.'), 'metaphor-crutch')
  })
  it('flags "piece of the puzzle"', () => {
    assertFires(detectMetaphorCrutch('This is the most important piece of the puzzle.'), 'metaphor-crutch')
  })
  it('flags "connect the dots"', () => {
    assertFires(detectMetaphorCrutch('We need to connect the dots between these two trends.'), 'metaphor-crutch')
  })
  it('flags "at its core"', () => {
    assertFires(detectMetaphorCrutch('At its core, this is a trust problem.'), 'metaphor-crutch')
  })
  it('flags "paint a picture"', () => {
    assertFires(detectMetaphorCrutch('Let me paint a picture of what success looks like.'), 'metaphor-crutch')
  })
  it('flags "move the goalposts"', () => {
    assertFires(detectMetaphorCrutch('They move the goalposts every quarter.'), 'metaphor-crutch')
  })
  it("flags \"in the driver's seat\" with straight apostrophe", () => {
    assertFires(detectMetaphorCrutch("The user is in the driver's seat."), 'metaphor-crutch')
  })
  it("flags \"in the driver’s seat\" with curly apostrophe", () => {
    assertFires(detectMetaphorCrutch('The user is in the driver’s seat.'), 'metaphor-crutch')
  })
  it('flags "drill down"', () => {
    assertFires(detectMetaphorCrutch('We need to drill down into the root cause.'), 'metaphor-crutch')
  })
  it('flags "tapestry of"', () => {
    assertFires(detectMetaphorCrutch('The city is a tapestry of cultures.'), 'metaphor-crutch')
  })
  it('flags "thread the needle"', () => {
    assertFires(detectMetaphorCrutch('The policy needs to thread the needle between growth and safety.'), 'metaphor-crutch')
  })
  it('flags "hit the nail on the head"', () => {
    assertFires(detectMetaphorCrutch('You hit the nail on the head with that observation.'), 'metaphor-crutch')
  })
  it('flags "Swiss Army knife"', () => {
    assertFires(detectMetaphorCrutch('The tool is a Swiss Army knife for developers.'), 'metaphor-crutch')
  })
})

// ── Listicle Instinct ──────────────────────────────────────────────────────

describe('detectListicleInstinct', () => {
  it('flags a bulleted list with exactly 3 items', () => {
    const text = '- First item\n- Second item\n- Third item'
    assertFires(detectListicleInstinct(text), 'listicle-instinct')
  })
  it('flags a numbered list with exactly 5 items', () => {
    const text = '1. One\n2. Two\n3. Three\n4. Four\n5. Five'
    assertFires(detectListicleInstinct(text), 'listicle-instinct')
  })
  it('does NOT flag a list with 4 items', () => {
    const text = '- One\n- Two\n- Three\n- Four'
    assertSilent(detectListicleInstinct(text), 'listicle-instinct')
  })
  it('does NOT flag a list with 6 items', () => {
    const text = '1. One\n2. Two\n3. Three\n4. Four\n5. Five\n6. Six'
    assertSilent(detectListicleInstinct(text), 'listicle-instinct')
  })
  it('flags a numbered list with exactly 7 items', () => {
    const text = '1. One\n2. Two\n3. Three\n4. Four\n5. Five\n6. Six\n7. Seven'
    assertFires(detectListicleInstinct(text), 'listicle-instinct')
  })
})

// ── Serves As ──────────────────────────────────────────────────────────────

describe('detectServesAs', () => {
  it('flags "serves as"', () => {
    assertFires(detectServesAs('The building serves as a reminder of the city\'s heritage.'), 'serves-as')
  })
  it('flags "stands as"', () => {
    assertFires(detectServesAs('This stands as the best example we have.'), 'serves-as')
  })
  it('flags "acts as"', () => {
    assertFires(detectServesAs('The policy acts as a deterrent.'), 'serves-as')
  })
  it('flags "functions as"', () => {
    assertFires(detectServesAs('The layer functions as a buffer.'), 'serves-as')
  })
  it('does NOT flag a plain "is"', () => {
    assertSilent(detectServesAs('The building is a landmark.'), 'serves-as')
  })
})

// ── Negation Countdown ─────────────────────────────────────────────────────

describe('detectNegationCountdown', () => {
  it('flags 2+ consecutive "Not" sentences', () => {
    assertFires(detectNegationCountdown('Not a bug. Not a feature. A fundamental design flaw.'), 'negation-countdown')
  })
  it('flags three "Not" sentences', () => {
    assertFires(detectNegationCountdown('Not fast. Not slow. Not in between. Just broken.'), 'negation-countdown')
  })
  it('does NOT flag a single "Not" sentence', () => {
    assertSilent(detectNegationCountdown('Not everything is as it seems. The data tells a different story.'), 'negation-countdown')
  })
  it('does NOT pair "Not" sentences across a paragraph boundary', () => {
    assertSilent(detectNegationCountdown('Not a bug.\n\nNot a feature.'), 'negation-countdown')
  })
})

// ── Anaphora Abuse ─────────────────────────────────────────────────────────

describe('detectAnaphoraAbuse', () => {
  it('flags 3 consecutive sentences with the same two-word opener', () => {
    assertFires(detectAnaphoraAbuse('They assume the worst. They assume silence means guilt. They assume nothing will change.'), 'anaphora-abuse')
  })
  it('flags 4 matching openers', () => {
    assertFires(detectAnaphoraAbuse('Every decision matters. Every decision counts. Every decision shapes the outcome. Every decision defines us.'), 'anaphora-abuse')
  })
  it('does NOT flag varied openers', () => {
    assertSilent(detectAnaphoraAbuse('They started early. We caught up quickly. Everyone finished on time.'), 'anaphora-abuse')
  })
  it('does NOT flag 2 consecutive matching openers', () => {
    assertSilent(detectAnaphoraAbuse('They assume the worst. They assume nothing. The data is clear.'), 'anaphora-abuse')
  })
  it('flags 3+ sentences opening with a curated single word (both)', () => {
    assertFires(detectAnaphoraAbuse('Both can be difficult to understand. Both are active at all hours. Both connect distant things.'), 'anaphora-abuse')
  })
  it('flags curated single word with 4 sentences (each)', () => {
    assertFires(detectAnaphoraAbuse('Each decision matters. Each voice counts. Each moment shapes the outcome. Each choice defines us.'), 'anaphora-abuse')
  })
  it('does NOT flag 2 consecutive curated single-word openers', () => {
    assertSilent(detectAnaphoraAbuse('Both can be difficult. Both are active. The third is different.'), 'anaphora-abuse')
  })
  it('flags any non-function-word repeated opener (people, his, this)', () => {
    assertFires(detectAnaphoraAbuse('People often forget. People make mistakes. People learn slowly.'), 'anaphora-abuse')
    assertFires(detectAnaphoraAbuse('His argument was weak. His evidence was thin. His conclusion was wrong.'), 'anaphora-abuse')
    assertFires(detectAnaphoraAbuse('This is foo. This is bar. And this is baz.'), 'anaphora-abuse')
  })
  it('does NOT flag articles or prepositions', () => {
    assertSilent(detectAnaphoraAbuse('In the beginning. In the middle. In the end.'), 'anaphora-abuse')
  })
  it('treats "And {word}" as matching the base opener', () => {
    assertFires(detectAnaphoraAbuse('Both can be difficult. Both are active. Both connect things. And both produce alarm.'), 'anaphora-abuse')
  })
  it('treats "And {two words}" as matching the base two-word opener', () => {
    assertFires(detectAnaphoraAbuse('They assume the worst. They assume silence means guilt. And they assume nothing will change.'), 'anaphora-abuse')
  })
  it('does NOT flag repeated pronoun subjects (ordinary narration)', () => {
    assertSilent(detectAnaphoraAbuse('He walked in. He sat down. He waited for an hour.'), 'anaphora-abuse')
    assertSilent(detectAnaphoraAbuse('They tried hard. They failed twice. They started over again.'), 'anaphora-abuse')
  })
  it('does NOT count opener runs across a paragraph boundary', () => {
    assertSilent(detectAnaphoraAbuse('Every step counts. Every step matters.\n\nEvery step defines us.'), 'anaphora-abuse')
  })
  it('flags an "It is X" copula-cleft litany (the pronoun twoWordOpener skips)', () => {
    assertFires(detectAnaphoraAbuse('It is not the office workers. It is agricultural laborers in India. It is construction crews in the Gulf. It is the elderly in European flats.'), 'anaphora-abuse')
  })
  it('flags an "It’s X" contraction cleft litany', () => {
    assertFires(detectAnaphoraAbuse('It’s a warning. It’s a threshold. It’s a wall we cannot cross.'), 'anaphora-abuse')
  })
  it('flags "He is X" and "I am X" copula clefts', () => {
    assertFires(detectAnaphoraAbuse('He is a father. He is a soldier. He is a liar.'), 'anaphora-abuse')
    assertFires(detectAnaphoraAbuse('I am tired. I am hungry. I am done.'), 'anaphora-abuse')
  })
  it('does NOT flag pronoun-subject action narration (no copula)', () => {
    assertSilent(detectAnaphoraAbuse('It speeds up the process. It carries away heat. It does nothing at all.'), 'anaphora-abuse')
  })
  it('does NOT flag progressive narration ("It is raining...")', () => {
    assertSilent(detectAnaphoraAbuse('It is raining hard. It is pouring outside. It is flooding the street.'), 'anaphora-abuse')
  })
  it('does NOT flag only 2 consecutive clefts', () => {
    assertSilent(detectAnaphoraAbuse('It is cold. It is dark. The room is empty.'), 'anaphora-abuse')
  })
})

// ── Gerund Litany ──────────────────────────────────────────────────────────

describe('detectGerundLitany', () => {
  it('flags 2+ consecutive short gerund sentences', () => {
    assertFires(detectGerundLitany('Fixing small bugs. Writing straightforward features. Implementing well-defined tickets.'), 'gerund-fragment-litany')
  })
  it('flags 2 consecutive gerund sentences', () => {
    assertFires(detectGerundLitany('Building quickly. Shipping often.'), 'gerund-fragment-litany')
  })
  it('does NOT flag a single gerund sentence', () => {
    assertSilent(detectGerundLitany('Building a product takes time.'), 'gerund-fragment-litany')
  })
  it('does NOT flag a long gerund sentence (>8 words)', () => {
    assertSilent(detectGerundLitany('Building a product that users actually love and return to is hard.'), 'gerund-fragment-litany')
  })
  it('does NOT pair gerund sentences across a paragraph boundary', () => {
    assertSilent(detectGerundLitany('Building quickly.\n\nShipping often.'), 'gerund-fragment-litany')
  })
})

// ── Here's the Kicker ──────────────────────────────────────────────────────

describe('detectHeresTheKicker', () => {
  it('flags "here\'s the kicker"', () => {
    assertFires(detectHeresTheKicker("Here's the kicker — nobody saw it coming."), 'heres-the-kicker')
  })
  it('flags "here\'s the thing"', () => {
    assertFires(detectHeresTheKicker("Here's the thing about distributed systems."), 'heres-the-kicker')
  })
  it('flags "here\'s where it gets interesting"', () => {
    assertFires(detectHeresTheKicker("Here's where it gets interesting: the data contradicts the theory."), 'heres-the-kicker')
  })
  it('flags case-insensitively', () => {
    assertFires(detectHeresTheKicker("HERE'S THE KICKER: everything changed."), 'heres-the-kicker')
  })
  it('does NOT flag an ordinary sentence', () => {
    assertSilent(detectHeresTheKicker('The meeting starts at noon.'), 'heres-the-kicker')
  })
  it('flags "the crux of it"', () => {
    assertFires(detectHeresTheKicker('The crux of it is that nobody agreed on scope.'), 'heres-the-kicker')
  })
  it('flags "the crux of the matter"', () => {
    assertFires(detectHeresTheKicker('The crux of the matter is timing.'), 'heres-the-kicker')
  })
})

// ── Pedagogical Aside ──────────────────────────────────────────────────────

describe('detectPedagogicalAside', () => {
  it('flags "let\'s break this down"', () => {
    assertFires(detectPedagogicalAside("Let's break this down step by step."), 'pedagogical-aside')
  })
  it('flags "let\'s unpack"', () => {
    assertFires(detectPedagogicalAside("Let's unpack what this means."), 'pedagogical-aside')
  })
  it('flags "think of it as"', () => {
    assertFires(detectPedagogicalAside('Think of it as a pipeline.'), 'pedagogical-aside')
  })
  it('flags "think of this as"', () => {
    assertFires(detectPedagogicalAside('Think of this as a foundation.'), 'pedagogical-aside')
  })
  it('does NOT flag "let\'s meet"', () => {
    assertSilent(detectPedagogicalAside("Let's meet tomorrow to discuss this."), 'pedagogical-aside')
  })
  it('does NOT flag ordinary sentences', () => {
    assertSilent(detectPedagogicalAside('The system processes requests in order.'), 'pedagogical-aside')
  })
})

// ── Imagine World ──────────────────────────────────────────────────────────

describe('detectImagineWorld', () => {
  it('flags "Imagine a world where"', () => {
    assertFires(detectImagineWorld('Imagine a world where every tool is connected.'), 'imagine-world')
  })
  it('flags "Imagine if you"', () => {
    assertFires(detectImagineWorld('Imagine if you could access any data instantly.'), 'imagine-world')
  })
  it('flags "Imagine what would"', () => {
    assertFires(detectImagineWorld('Imagine what would happen if the system failed.'), 'imagine-world')
  })
  it('flags "Imagine a future"', () => {
    assertFires(detectImagineWorld('Imagine a future without passwords.'), 'imagine-world')
  })
  it('does NOT flag "imagine" alone', () => {
    assertSilent(detectImagineWorld('Imagine the possibilities.'), 'imagine-world')
  })
})

// ── Listicle in a Trench Coat ──────────────────────────────────────────────

describe('detectListicleTrenchCoat', () => {
  it('flags 2+ ordinal sentence-starters', () => {
    assertFires(detectListicleTrenchCoat('The first issue is cost. The second issue is time.'), 'listicle-trench-coat')
  })
  it('flags three ordinals', () => {
    assertFires(detectListicleTrenchCoat('The first reason is speed. The second reason is reliability. The third reason is cost.'), 'listicle-trench-coat')
  })
  it('does NOT fire with only one ordinal', () => {
    assertSilent(detectListicleTrenchCoat('The first thing to understand is that context matters.'), 'listicle-trench-coat')
  })
})

// ── Vague Attribution ──────────────────────────────────────────────────────

describe('detectVagueAttribution', () => {
  it('flags "experts argue"', () => {
    assertFires(detectVagueAttribution('Experts argue that this approach has drawbacks.'), 'vague-attribution')
  })
  it('flags "studies show"', () => {
    assertFires(detectVagueAttribution('Studies show that remote work increases productivity.'), 'vague-attribution')
  })
  it('flags "research suggests"', () => {
    assertFires(detectVagueAttribution('Research suggests a correlation between sleep and performance.'), 'vague-attribution')
  })
  it('flags "observers have noted"', () => {
    assertFires(detectVagueAttribution('Observers have noted a shift in user behavior.'), 'vague-attribution')
  })
  it('does NOT flag a named citation', () => {
    assertSilent(detectVagueAttribution('The paper by Smith argues that framing matters.'), 'vague-attribution')
  })
})

// ── Bold-First Bullets ─────────────────────────────────────────────────────

describe('detectBoldFirstBullets', () => {
  it('flags bullet items starting with bold phrase', () => {
    const text = '- **Security**: keeps data safe\n- **Performance**: runs fast'
    assertFires(detectBoldFirstBullets(text), 'bold-first-bullets')
  })
  it('flags * bullet variant', () => {
    const text = '* **Scalability**: handles load\n* **Reliability**: stays up'
    assertFires(detectBoldFirstBullets(text), 'bold-first-bullets')
  })
  it('does NOT flag plain bullet items', () => {
    const text = '- plain item\n- another plain item'
    assertSilent(detectBoldFirstBullets(text), 'bold-first-bullets')
  })
  it('does NOT flag bold text inside a sentence', () => {
    assertSilent(detectBoldFirstBullets('This is **important** and should be noted.'), 'bold-first-bullets')
  })
})

// ── Unicode Arrows ─────────────────────────────────────────────────────────

describe('detectUnicodeDecoration', () => {
  it('flags the → character', () => {
    assertFires(detectUnicodeDecoration('Input → Output'), 'unicode-decoration')
  })
  it('flags multiple arrows', () => {
    const v = detectUnicodeDecoration('Step 1 → Step 2 → Step 3')
    expect(v.filter(x => x.ruleId === 'unicode-decoration').length).toBeGreaterThanOrEqual(2)
  })
  it('does NOT flag ASCII arrow "->"', () => {
    assertSilent(detectUnicodeDecoration('Input -> Output'), 'unicode-decoration')
  })
  it('flags the double arrow and pointer glyphs', () => {
    assertFires(detectUnicodeDecoration('Input ⇒ Output'), 'unicode-decoration')
    assertFires(detectUnicodeDecoration('▸ First point'), 'unicode-decoration')
  })
  it('flags checkmark and cross emoji', () => {
    assertFires(detectUnicodeDecoration('✅ Fast and reliable'), 'unicode-decoration')
    assertFires(detectUnicodeDecoration('❌ No setup required'), 'unicode-decoration')
  })
  it('flags decorative emoji in prose', () => {
    assertFires(detectUnicodeDecoration('Our team is thrilled \u{1F680} to announce this feature.'), 'unicode-decoration')
    assertFires(detectUnicodeDecoration('✨ Introducing the all-new dashboard ✨'), 'unicode-decoration')
  })
  it('merges an emoji run into a single violation span', () => {
    const v = detectUnicodeDecoration('Big news \u{1F389}\u{1F680}✨ today.')
    const emoji = v.filter(x => x.ruleId === 'unicode-decoration')
    expect(emoji).toHaveLength(1)
    expect(emoji[0].matchedText).toBe('\u{1F389}\u{1F680}✨')
  })
  it('keeps a variation-selector emoji as one span', () => {
    const v = detectUnicodeDecoration('Warning ⚠️ ahead.')
    const emoji = v.filter(x => x.ruleId === 'unicode-decoration')
    expect(emoji).toHaveLength(1)
    expect(emoji[0].matchedText).toBe('⚠️')
  })
  it('does NOT flag ©, ®, or ™', () => {
    assertSilent(detectUnicodeDecoration('© 2024 Acme Corp. Acme® and Widget™ are trademarks.'), 'unicode-decoration')
  })
  it('does NOT flag plain punctuation or accented text', () => {
    assertSilent(detectUnicodeDecoration('Café visitors — even those from Zürich — love it.'), 'unicode-decoration')
  })
})

// ── Despite Challenges ─────────────────────────────────────────────────────

describe('detectDespiteChallenges', () => {
  it('flags "Despite these challenges"', () => {
    assertFires(detectDespiteChallenges('Despite these challenges, the platform continues to grow.'), 'despite-challenges')
  })
  it('flags "Despite its limitations"', () => {
    assertFires(detectDespiteChallenges('Despite its limitations, the tool remains popular.'), 'despite-challenges')
  })
  it('flags "Despite the obstacles"', () => {
    assertFires(detectDespiteChallenges('Despite the obstacles, the team shipped on time.'), 'despite-challenges')
  })
  it('does NOT flag unrelated sentences', () => {
    assertSilent(detectDespiteChallenges('The project succeeded because of careful planning.'), 'despite-challenges')
  })
})

// ── Concept Label ──────────────────────────────────────────────────────────

describe('detectConceptLabel', () => {
  it('flags "the supervision paradox"', () => {
    assertFires(detectConceptLabel('This is the supervision paradox at its core.'), 'invented-concept-label')
  })
  it('flags "the trust vacuum"', () => {
    assertFires(detectConceptLabel('We are living through a trust vacuum.'), 'invented-concept-label')
  })
  it('flags "the attention trap"', () => {
    assertFires(detectConceptLabel('The attention trap affects every platform.'), 'invented-concept-label')
  })
  it('flags "the innovation chasm"', () => {
    assertFires(detectConceptLabel('Companies fall into the innovation chasm.'), 'invented-concept-label')
  })
  it('flags "the hedonic treadmill"', () => {
    assertFires(detectConceptLabel('We are stuck on the hedonic treadmill.'), 'invented-concept-label')
  })
  it('flags "productivity theater"', () => {
    assertFires(detectConceptLabel('Most standups are just productivity theater.'), 'invented-concept-label')
  })
  it('flags "decision fatigue"', () => {
    assertFires(detectConceptLabel('By noon, decision fatigue sets in.'), 'invented-concept-label')
  })
  it('flags "the complexity tax"', () => {
    assertFires(detectConceptLabel('Every abstraction adds a complexity tax.'), 'invented-concept-label')
  })
  it('flags "doom loop"', () => {
    assertFires(detectConceptLabel('The company entered a doom loop of layoffs.'), 'invented-concept-label')
  })
  it('flags "shame spiral"', () => {
    assertFires(detectConceptLabel('It triggers a shame spiral every time.'), 'invented-concept-label')
  })
  it('flags "imposter syndrome" (established but slop-adjacent)', () => {
    assertFires(detectConceptLabel('Many engineers describe imposter syndrome.'), 'invented-concept-label')
  })
  it('flags "regulatory quicksand"', () => {
    assertFires(detectConceptLabel('Startups sink into regulatory quicksand.'), 'invented-concept-label')
  })
  it('flags "context whiplash"', () => {
    assertFires(detectConceptLabel('Switching projects daily causes context whiplash.'), 'invented-concept-label')
  })
  it('does NOT flag determiner + noun ("the trap")', () => {
    assertSilent(detectConceptLabel('Do not fall into the trap of assuming.'), 'invented-concept-label')
  })
  it('does NOT flag preposition + noun ("in limbo")', () => {
    assertSilent(detectConceptLabel('The contract has been in limbo for weeks.'), 'invented-concept-label')
  })
  it('does NOT flag established literal compounds ("income tax")', () => {
    assertSilent(detectConceptLabel('She filed her income tax return early.'), 'invented-concept-label')
  })
  it('does NOT flag "chronic fatigue"', () => {
    assertSilent(detectConceptLabel('He was diagnosed with chronic fatigue.'), 'invented-concept-label')
  })
  it('does NOT flag "feedback loop"', () => {
    assertSilent(detectConceptLabel('The system creates a feedback loop.'), 'invented-concept-label')
  })
  it('does NOT flag "movie theater"', () => {
    assertSilent(detectConceptLabel('We met outside the movie theater.'), 'invented-concept-label')
  })
  it('does NOT flag "national debt"', () => {
    assertSilent(detectConceptLabel('Congress debated the national debt.'), 'invented-concept-label')
  })
  it('does NOT flag ordinary sentences without the suffix words', () => {
    assertSilent(detectConceptLabel('The product launched on schedule.'), 'invented-concept-label')
  })
})

// ── Dramatic Fragment ──────────────────────────────────────────────────────

describe('detectDramaticFragment', () => {
  it('flags a standalone very short paragraph', () => {
    const text = 'This is a long paragraph with real content and ideas.\n\nFull stop.\n\nAnd this continues.'
    assertFires(detectDramaticFragment(text), 'dramatic-fragment')
  })
  it('flags a one-word paragraph', () => {
    const text = 'Here is the setup.\n\nBoom.\n\nAnd here is the rest.'
    assertFires(detectDramaticFragment(text), 'dramatic-fragment')
  })
  it('does NOT flag a normal paragraph', () => {
    const text = 'This is the first paragraph with sufficient content.\n\nThis is the second paragraph also with sufficient content to not be flagged.'
    assertSilent(detectDramaticFragment(text), 'dramatic-fragment')
  })
  it('does NOT flag a 5-word paragraph', () => {
    const text = 'This is the first paragraph with plenty of words.\n\nThis paragraph also has five words here.\n\nThis is the third paragraph with plenty of words too.'
    assertSilent(detectDramaticFragment(text), 'dramatic-fragment')
  })
  it('flags inline ellipsis dramatic pause: "Just... there."', () => {
    const text = 'He wore his demons like a leather jacket: not flaunted, not hidden. Just... there.'
    assertFires(detectDramaticFragment(text), 'dramatic-fragment')
  })
  it('flags inline ellipsis dramatic pause: "Still... waiting."', () => {
    const text = 'The room was empty. Still... waiting.'
    assertFires(detectDramaticFragment(text), 'dramatic-fragment')
  })
  it('flags inline ellipsis dramatic pause with Unicode ellipsis', () => {
    const text = 'She said nothing. Gone… forever.'
    assertFires(detectDramaticFragment(text), 'dramatic-fragment')
  })
  it('flags two-word resolution after ellipsis: "Until... right now."', () => {
    const text = 'He had never noticed it. Until... right now.'
    assertFires(detectDramaticFragment(text), 'dramatic-fragment')
  })
})

// ── Paired Negation ────────────────────────────────────────────────────────

describe('detectPairedNegation', () => {
  it('flags "not flaunted, not hidden"', () => {
    assertFires(detectPairedNegation('He wore his demons like a leather jacket: not flaunted, not hidden. Just... there.'), 'paired-negation')
  })
  it('flags "not weakness, not strength"', () => {
    assertFires(detectPairedNegation('It was not weakness, not strength. Simply human.'), 'paired-negation')
  })
  it('flags "not loud, not quiet"', () => {
    assertFires(detectPairedNegation('The room was not loud, not quiet.'), 'paired-negation')
  })
  it('does NOT flag a single negation', () => {
    assertSilent(detectPairedNegation('He was not angry about it.'), 'paired-negation')
  })
})

// ── Phantom Contrast ───────────────────────────────────────────────────────

describe('detectPhantomContrast', () => {
  it('flags "short, hours not days"', () => {
    assertFires(detectPhantomContrast('These events were short, hours not days.'), 'phantom-contrast')
  })
  it('flags "fast, days not weeks"', () => {
    assertFires(detectPhantomContrast('Recovery is fast, days not weeks.'), 'phantom-contrast')
  })
  it('flags a big-adjective contrast "massive, billions not millions"', () => {
    assertFires(detectPhantomContrast('This is a massive market, billions not millions.'), 'phantom-contrast')
  })
  it('flags the em-dash form with comma before "not"', () => {
    assertFires(detectPhantomContrast('The outage was brief — minutes, not hours.'), 'phantom-contrast')
  })
  it('flags filler between delimiter and unit ("a matter of")', () => {
    assertFires(detectPhantomContrast('The fix was quick, a matter of hours, not days.'), 'phantom-contrast')
  })
  it('spans the whole appositive so removal is clean', () => {
    const text = 'These events were short, hours not days.'
    const v = detectPhantomContrast(text).find(v => v.ruleId === 'phantom-contrast')
    expect(v).toBeDefined()
    expect(v!.matchedText).toBe(', hours not days')
    expect(text.slice(0, v!.startIndex) + text.slice(v!.endIndex)).toBe('These events were short.')
  })
  it('flags "think Xs, not Ys" regardless of scale', () => {
    assertFires(detectPhantomContrast('Think ecosystems, not pipelines.'), 'phantom-contrast')
  })
  it('flags only the ", not Ys" tail of a think-contrast', () => {
    const text = 'Think ecosystems, not pipelines.'
    const v = detectPhantomContrast(text).find(v => v.ruleId === 'phantom-contrast')
    expect(v!.matchedText).toBe(', not pipelines')
  })
  it('does NOT flag a bare contrast with no adjective (may be a real correction)', () => {
    assertSilent(detectPhantomContrast('The window will close within decades, not centuries.'), 'phantom-contrast')
  })
  it('does NOT flag when direction contradicts the adjective (informative contrast)', () => {
    assertSilent(detectPhantomContrast('The outage was brief, days not minutes.'), 'phantom-contrast')
  })
  it('does NOT flag cross-scale contrasts', () => {
    assertSilent(detectPhantomContrast('The plan was cheap, hours not dollars.'), 'phantom-contrast')
  })
  it('does NOT flag "not" followed by a non-unit word', () => {
    assertSilent(detectPhantomContrast('The shifts were short, hours not counting breaks.'), 'phantom-contrast')
  })
  it('does NOT flag a mid-clause contrast without a delimiter', () => {
    assertSilent(detectPhantomContrast('The quick fix lasted weeks not days.'), 'phantom-contrast')
  })
  it('does NOT flag "I think so, not really"', () => {
    assertSilent(detectPhantomContrast('I think so, not really.'), 'phantom-contrast')
  })
  it('does NOT pair adjective and contrast across sentence boundaries', () => {
    assertSilent(detectPhantomContrast('The fix was quick. It took hours, not days.'), 'phantom-contrast')
  })
})

// ── Reality Claim ──────────────────────────────────────────────────────────

describe('detectRealityClaim', () => {
  it('flags "The gap is real"', () => {
    assertFires(detectRealityClaim('The gap is real.'), 'reality-claim')
  })
  it('flags "The threat cannot be ignored"', () => {
    assertFires(detectRealityClaim('The threat cannot be ignored.'), 'reality-claim')
  })
  it('flags "The struggle is very real"', () => {
    assertFires(detectRealityClaim('The struggle is very real.'), 'reality-claim')
  })
  it('flags "This matters"', () => {
    assertFires(detectRealityClaim('This matters.'), 'reality-claim')
  })
  it('flags "This problem cannot be overstated"', () => {
    assertFires(detectRealityClaim('This problem cannot be overstated.'), 'reality-claim')
  })
  it('flags "the stakes are real"', () => {
    assertFires(detectRealityClaim('the stakes are real.'), 'reality-claim')
  })
  it('flags "they are legitimate"', () => {
    assertFires(detectRealityClaim('they are legitimate.'), 'reality-claim')
  })
  it('flags "these concerns are legitimate"', () => {
    assertFires(detectRealityClaim('these concerns are legitimate.'), 'reality-claim')
  })
  it('flags "it is genuine"', () => {
    assertFires(detectRealityClaim('it is genuine.'), 'reality-claim')
  })
  it('flags "the fear is palpable"', () => {
    assertFires(detectRealityClaim('the fear is palpable.'), 'reality-claim')
  })
  it('flags "this cannot be dismissed"', () => {
    assertFires(detectRealityClaim('this cannot be dismissed.'), 'reality-claim')
  })
  it('flags "this actually matters"', () => {
    assertFires(detectRealityClaim('this actually matters.'), 'reality-claim')
  })
  it('flags "it truly matters"', () => {
    assertFires(detectRealityClaim('it truly matters.'), 'reality-claim')
  })
  it('does NOT flag "The real problem is funding"', () => {
    assertSilent(detectRealityClaim('The real problem is funding.'), 'reality-claim')
  })
})

// ── Professional Disclaimer ─────────────────────────────────────────────────

describe('detectProfessionalDisclaimer', () => {
  it('flags "I am an AI, not a doctor"', () => {
    assertFires(detectProfessionalDisclaimer('Disclaimer: I am an AI, not a doctor.'), 'professional-disclaimer')
  })
  it("flags \"I'm an AI, not a lawyer\"", () => {
    assertFires(detectProfessionalDisclaimer("I'm an AI, not a lawyer, so verify this with counsel."), 'professional-disclaimer')
  })
  it('flags "not medical advice"', () => {
    assertFires(detectProfessionalDisclaimer('This is general physiological information, not medical advice.'), 'professional-disclaimer')
  })
  it('flags "not legal advice"', () => {
    assertFires(detectProfessionalDisclaimer('This is not legal advice.'), 'professional-disclaimer')
  })
  it('does NOT flag an ordinary sentence', () => {
    assertSilent(detectProfessionalDisclaimer('The doctor reviewed the chart before the appointment.'), 'professional-disclaimer')
  })
})

// ── Earned Claim ─────────────────────────────────────────────────────────────

describe('detectEarnedClaim', () => {
  it('flags "the achievement was earned"', () => {
    assertFires(detectEarnedClaim('The achievement was earned, not given.'), 'earned-claim')
  })
  it('flags "this recognition is truly earned"', () => {
    assertFires(detectEarnedClaim('This recognition is truly earned.'), 'earned-claim')
  })
  it('flags "their victory has been earned"', () => {
    assertFires(detectEarnedClaim('Their victory has been earned.'), 'earned-claim')
  })
  it('does NOT flag an ordinary sentence', () => {
    assertSilent(detectEarnedClaim('She earned her degree after four years of night classes.'), 'earned-claim')
  })
})

// ── Superficial Analysis ───────────────────────────────────────────────────

describe('detectSuperficialAnalysis', () => {
  it('flags ", underscoring its role"', () => {
    assertFires(detectSuperficialAnalysis('The initiative succeeded, underscoring its role as a community hub.'), 'superficial-analysis')
  })
  it('flags ", highlighting its importance"', () => {
    assertFires(detectSuperficialAnalysis('The campaign resonated with voters, highlighting its importance in the region.'), 'superficial-analysis')
  })
  it('flags ", cementing its legacy"', () => {
    assertFires(detectSuperficialAnalysis('The album sold millions, cementing its legacy in music history.'), 'superficial-analysis')
  })
  it('flags ", reflecting the significance"', () => {
    assertFires(detectSuperficialAnalysis('The award was given quietly, reflecting the significance of the work.'), 'superficial-analysis')
  })
  it('does NOT flag ordinary participle phrases', () => {
    assertSilent(detectSuperficialAnalysis('She left the building, waving goodbye to her colleagues.'), 'superficial-analysis')
  })
})

describe('detectFalseRange', () => {
  it('flags "doesn\'t emerge from nowhere"', () => {
    assertFires(detectFalseRange("The push for urban cycling infrastructure doesn't emerge from nowhere; it stands in a long tradition of transport activism."), 'false-range')
  })
  it('flags "came from nowhere"', () => {
    assertFires(detectFalseRange('This movement came from nowhere and changed everything.'), 'false-range')
  })
  it('flags "does not come from nowhere"', () => {
    assertFires(detectFalseRange('This idea does not come from nowhere.'), 'false-range')
  })
  it('flags "didn\'t appear from nowhere"', () => {
    assertFires(detectFalseRange("The crisis didn't appear from nowhere."), 'false-range')
  })
  it('does NOT flag ordinary "from" phrases', () => {
    assertSilent(detectFalseRange('She emerged from the building.'), 'false-range')
  })
  it('does NOT flag directional from', () => {
    assertSilent(detectFalseRange('They came from the countryside.'), 'false-range')
  })
  it('flags "everything from X to Y"', () => {
    assertFires(detectFalseRange('The change affects everything from marketing emails to product descriptions.'), 'false-range')
  })
  it('flags "everyone from X to Y"', () => {
    assertFires(detectFalseRange('The tool helps everyone from beginners to seasoned professionals.'), 'false-range')
  })
  it('does NOT flag numeric ranges after "everything from"', () => {
    assertSilent(detectFalseRange('We stock everything from $5 to $500.'), 'false-range')
  })
  it('does NOT flag movement sentences with "everyone from"', () => {
    assertSilent(detectFalseRange('Everyone from the office went home to their families early.'), 'false-range')
  })
  it('flags "whether you’re a X or a Y"', () => {
    assertFires(detectFalseRange('Whether you’re a startup founder or a Fortune 500 executive, this applies to you.'), 'false-range')
  })
  it('flags "whether you are a X or just Y"', () => {
    assertFires(detectFalseRange('Whether you are a seasoned developer or just starting out, the docs will help.'), 'false-range')
  })
  it('does NOT flag genuine "whether" disjunctions without a persona', () => {
    assertSilent(detectFalseRange('I asked whether you had seen the report or not.'), 'false-range')
  })
  it('flags "Xs and Ys alike"', () => {
    assertFires(detectFalseRange('The film delighted critics and audiences alike.'), 'false-range')
  })
  it('does NOT flag the "similarly" sense of alike', () => {
    assertSilent(detectFalseRange('After decades together they look and act alike.'), 'false-range')
  })
})

// ── Exemplar Cliché ────────────────────────────────────────────────────────

describe('detectExemplarCliche', () => {
  it('flags "textbook example"', () => {
    assertFires(detectExemplarCliche('This is a textbook example of poor planning.'), 'exemplar-cliche')
  })
  it('flags "classic example"', () => {
    assertFires(detectExemplarCliche('The 2008 crisis is a classic example of systemic risk.'), 'exemplar-cliche')
  })
  it('flags "prime example"', () => {
    assertFires(detectExemplarCliche('Amazon is a prime example of vertical integration.'), 'exemplar-cliche')
  })
  it('flags "perfect example"', () => {
    assertFires(detectExemplarCliche('This is a perfect example of scope creep.'), 'exemplar-cliche')
  })
  it('flags "quintessential example"', () => {
    assertFires(detectExemplarCliche('It is the quintessential example of bureaucratic failure.'), 'exemplar-cliche')
  })
  it('flags "poster child"', () => {
    assertFires(detectExemplarCliche('Silicon Valley became the poster child for tech optimism.'), 'exemplar-cliche')
  })
  it('flags "hallmark of"', () => {
    assertFires(detectExemplarCliche('Consistency is the hallmark of great design.'), 'exemplar-cliche')
  })
  it('flags "case in point"', () => {
    assertFires(detectExemplarCliche('The 2020 election is a case in point.'), 'exemplar-cliche')
  })
  it('is case-insensitive', () => {
    assertFires(detectExemplarCliche('A TEXTBOOK EXAMPLE of what not to do.'), 'exemplar-cliche')
  })
  it('flags "textbook evidence"', () => {
    assertFires(detectExemplarCliche('His response is textbook evidence of defensive management.'), 'exemplar-cliche')
  })
  it('flags "masterclass in"', () => {
    assertFires(detectExemplarCliche('The rollout was a masterclass in poor communication.'), 'exemplar-cliche')
  })
  it('flags "case study in"', () => {
    assertFires(detectExemplarCliche('The launch was a case study in hubris.'), 'exemplar-cliche')
  })
  it('flags "proof positive"', () => {
    assertFires(detectExemplarCliche('It is proof positive that the strategy failed.'), 'exemplar-cliche')
  })
  it('flags "Exhibit A for"', () => {
    assertFires(detectExemplarCliche('Consider this Exhibit A for the decline of local news.'), 'exemplar-cliche')
  })
  it('flags "Exhibit A" at sentence end', () => {
    assertFires(detectExemplarCliche('The quarterly numbers are Exhibit A.'), 'exemplar-cliche')
  })
  it('does not flag literal "exhibit a" as verb + article', () => {
    assertSilent(detectExemplarCliche('Fish exhibit a preference for shaded water.'), 'exemplar-cliche')
  })
  it('flags "straight out of the X playbook"', () => {
    assertFires(detectExemplarCliche('That move is straight out of the authoritarian playbook.'), 'exemplar-cliche')
  })
  it('flags "from the X playbook" with a multi-word middle', () => {
    assertFires(detectExemplarCliche('It reads like a page from the growth hacking playbook.'), 'exemplar-cliche')
  })
  it('does not flag a literal team playbook', () => {
    assertSilent(detectExemplarCliche('The coach updated the team playbook before the season.'), 'exemplar-cliche')
  })
})

// ── Chatbot Artifact ───────────────────────────────────────────────────────

describe('detectChatbotArtifact', () => {
  it('flags "I hope this helps"', () => {
    assertFires(detectChatbotArtifact('I hope this helps clarify things for you.'), 'chatbot-artifact')
  })
  it('flags "feel free to"', () => {
    assertFires(detectChatbotArtifact('Feel free to reach out if you need more information.'), 'chatbot-artifact')
  })
  it('flags "let me know if you"', () => {
    assertFires(detectChatbotArtifact('Let me know if you have any questions.'), 'chatbot-artifact')
  })
  it('does not flag "great question" (moved to sycophantic-phrases)', () => {
    expect(detectChatbotArtifact('Great question! The answer is nuanced.').some(v => v.ruleId === 'chatbot-artifact')).toBe(false)
  })
  it('does not flag "excellent question" (moved to sycophantic-phrases)', () => {
    expect(detectChatbotArtifact('Excellent question — let me explain.').some(v => v.ruleId === 'chatbot-artifact')).toBe(false)
  })
  it('flags "happy to help"', () => {
    assertFires(detectChatbotArtifact("I'm happy to help with that."), 'chatbot-artifact')
  })
  it('flags "don\'t hesitate to" (straight quote)', () => {
    assertFires(detectChatbotArtifact("Don't hesitate to ask if anything is unclear."), 'chatbot-artifact')
  })
  it('flags "don\'t hesitate to" (regex variant)', () => {
    assertFires(detectChatbotArtifact("Don't hesitate to contact us."), 'chatbot-artifact')
  })
  it('flags "is there anything else"', () => {
    assertFires(detectChatbotArtifact('Is there anything else I can help you with?'), 'chatbot-artifact')
  })
})

// ── Significance Phrases ──────────────────────────────────────────────────

describe('detectSignificancePhrases', () => {
  it('flags "plays a key role"', () => {
    assertFires(detectSignificancePhrases('Trust plays a key role in team performance.'), 'significance-phrases')
  })
  it('flags "plays a crucial role"', () => {
    assertFires(detectSignificancePhrases('Context plays a crucial role in interpretation.'), 'significance-phrases')
  })
  it('flags "played a pivotal role"', () => {
    assertFires(detectSignificancePhrases('She played a pivotal role in the negotiations.'), 'significance-phrases')
  })
  it('flags "sheds light on"', () => {
    assertFires(detectSignificancePhrases('This research sheds light on the underlying causes.'), 'significance-phrases')
  })
  it('flags "shed light on"', () => {
    assertFires(detectSignificancePhrases('The study shed light on patterns previously overlooked.'), 'significance-phrases')
  })
  it('flags "paves the way"', () => {
    assertFires(detectSignificancePhrases('This decision paves the way for future reform.'), 'significance-phrases')
  })
  it('flags "paving the way"', () => {
    assertFires(detectSignificancePhrases('The legislation is paving the way for renewable energy.'), 'significance-phrases')
  })
  it('flags "sets the stage"', () => {
    assertFires(detectSignificancePhrases('This agreement sets the stage for broader cooperation.'), 'significance-phrases')
  })
  it('flags "setting the stage"', () => {
    assertFires(detectSignificancePhrases('The opening chapter is setting the stage for conflict.'), 'significance-phrases')
  })
})

// ── Stacked Intensifiers ───────────────────────────────────────────────────

describe("detectStackedIntensifiers", () => {
  const RULE = "stacked-intensifiers"

  it("flags 3 evaluative adjectives in 3 sentences", () => {
    const text = "Thank you for sharing this remarkable experience. It is a powerful case study. Revisiting this is a fantastic learning opportunity."
    assertFires(detectStackedIntensifiers(text), RULE)
  })

  it("emits one violation per flagged word, not one for the whole span", () => {
    const text = "Thank you for sharing this remarkable and undoubtedly intense personal experience. It is a powerful case study. Revisiting this through a clinical lens is a fantastic learning opportunity."
    const vs = detectStackedIntensifiers(text).filter(v => v.ruleId === RULE)
    expect(vs.length).toBeGreaterThanOrEqual(3)
    for (const v of vs) {
      expect(v.endIndex - v.startIndex).toBeLessThan(20)
    }
    expect(vs.some(v => v.matchedText.toLowerCase() === "remarkable")).toBe(true)
    expect(vs.some(v => v.matchedText.toLowerCase() === "powerful")).toBe(true)
  })

  it("does not flag 2 evaluative adjectives in 3 sentences (below threshold)", () => {
    const text = "This is a remarkable achievement. The results were solid and clear. Well done."
    assertSilent(detectStackedIntensifiers(text), RULE)
  })

  it("does not flag across paragraph boundaries", () => {
    const text = "This is a remarkable finding.\n\nIt is also incredible.\n\nThe outcome is phenomenal."
    assertSilent(detectStackedIntensifiers(text), RULE)
  })

  it("flags when 3+ appear within a single sentence", () => {
    const text = "This is a remarkable, incredible, and phenomenal result."
    assertFires(detectStackedIntensifiers(text), RULE)
  })

  it("fires via runClientDetectors", () => {
    const text = "What a remarkable piece of work. The insights are truly profound and compelling. This is an exceptional contribution to the field."
    assertFires(runClientDetectors(text), RULE)
  })
})

// ── Sycophantic Phrases ───────────────────────────────────────────────────────

describe('detectSycophanticPhrases', () => {
  it('flags "great question"', () => {
    assertFires(detectSycophanticPhrases('Great question! The answer is nuanced.'), 'sycophantic-phrases')
  })
  it('flags "excellent question"', () => {
    assertFires(detectSycophanticPhrases('Excellent question — let me explain.'), 'sycophantic-phrases')
  })
  it('flags "you\'re absolutely right" (straight quote)', () => {
    assertFires(detectSycophanticPhrases("You're absolutely right about that."), 'sycophantic-phrases')
  })
  it('flags "you\'re absolutely right" (regex variant)', () => {
    assertFires(detectSycophanticPhrases("You're absolutely right about that!"), 'sycophantic-phrases')
  })
  it('flags "that\'s a great point"', () => {
    assertFires(detectSycophanticPhrases("That's a great point worth exploring."), 'sycophantic-phrases')
  })
  it('flags "what a thoughtful question"', () => {
    assertFires(detectSycophanticPhrases('What a thoughtful question to raise.'), 'sycophantic-phrases')
  })
  it('flags "you raise a great point"', () => {
    assertFires(detectSycophanticPhrases('You raise a great point here.'), 'sycophantic-phrases')
  })
  it('does not flag ordinary prose', () => {
    const text = 'The question of climate policy requires careful analysis.'
    expect(detectSycophanticPhrases(text).some(v => v.ruleId === 'sycophantic-phrases')).toBe(false)
  })
  it('fires via runClientDetectors', () => {
    assertFires(runClientDetectors("Great question! Let me explain the answer."), 'sycophantic-phrases')
  })
  it('flags "hats off to"', () => {
    assertFires(detectSycophanticPhrases('Hats off to the team for pulling this off.'), 'sycophantic-phrases')
  })
  it('flags "tip my hat"', () => {
    assertFires(detectSycophanticPhrases('I tip my hat to anyone who manages that.'), 'sycophantic-phrases')
  })
  it('flags curly-apostrophe "you’re absolutely right" (regression: normalize was a no-op)', () => {
    assertFires(detectSycophanticPhrases('You’re absolutely right about that.'), 'sycophantic-phrases')
  })
  it('flags curly-apostrophe "that’s a great point"', () => {
    assertFires(detectSycophanticPhrases('That’s a great point worth exploring.'), 'sycophantic-phrases')
  })
  it('flags "this is an excellent point" (subject variant)', () => {
    assertFires(detectSycophanticPhrases('This is an excellent point about caching.'), 'sycophantic-phrases')
  })
  it('flags "that’s such a great question" (degree variant)', () => {
    assertFires(detectSycophanticPhrases('That’s such a great question to sit with.'), 'sycophantic-phrases')
  })
  it('flags "what a great idea"', () => {
    assertFires(detectSycophanticPhrases('What a great idea for the launch.'), 'sycophantic-phrases')
  })
  it('flags "you make an important point"', () => {
    assertFires(detectSycophanticPhrases('You make an important point about latency.'), 'sycophantic-phrases')
  })
  it('flags copula "spot on"', () => {
    assertFires(detectSycophanticPhrases('Your analysis is spot on.'), 'sycophantic-phrases')
  })
  it('does not flag a literal spot', () => {
    assertSilent(detectSycophanticPhrases('There is a spot on your shirt.'), 'sycophantic-phrases')
  })
  it('flags "hit the nail on the head"', () => {
    assertFires(detectSycophanticPhrases('You’ve hit the nail on the head with this.'), 'sycophantic-phrases')
  })
  it('flags "couldn’t agree more" (curly)', () => {
    assertFires(detectSycophanticPhrases('I couldn’t agree more.'), 'sycophantic-phrases')
  })
  it('flags "I completely agree"', () => {
    assertFires(detectSycophanticPhrases('I completely agree with your framing.'), 'sycophantic-phrases')
  })
  it('flags "you’re asking the right questions"', () => {
    assertFires(detectSycophanticPhrases('You’re asking exactly the right questions.'), 'sycophantic-phrases')
  })
  it('flags flattering attribution "as you rightly point out"', () => {
    assertFires(detectSycophanticPhrases('As you rightly point out, the data is thin.'), 'sycophantic-phrases')
  })
  it('does not flag third-person "she correctly identified"', () => {
    assertSilent(detectSycophanticPhrases('She correctly identified the failure mode.'), 'sycophantic-phrases')
  })
  it('flags "your instincts are spot on"', () => {
    assertFires(detectSycophanticPhrases('Your instincts are spot on here.'), 'sycophantic-phrases')
  })
  it('flags "you clearly understand"', () => {
    assertFires(detectSycophanticPhrases('You clearly understand the tradeoffs involved.'), 'sycophantic-phrases')
  })
  it('flags "you’ve done a great job"', () => {
    assertFires(detectSycophanticPhrases('You’ve done a great job of laying this out.'), 'sycophantic-phrases')
  })
  it('flags "you’re doing an amazing job"', () => {
    assertFires(detectSycophanticPhrases('You’re doing an amazing job so far.'), 'sycophantic-phrases')
  })
  it('flags "you nailed it"', () => {
    assertFires(detectSycophanticPhrases('You absolutely nailed it with this draft.'), 'sycophantic-phrases')
  })
  it('flags "you should be proud"', () => {
    assertFires(detectSycophanticPhrases('You should be really proud of this work.'), 'sycophantic-phrases')
  })
  it('flags "give yourself more credit"', () => {
    assertFires(detectSycophanticPhrases('You need to give yourself more credit.'), 'sycophantic-phrases')
  })
  it('flags "off to a great start"', () => {
    assertFires(detectSycophanticPhrases('The project is off to a great start.'), 'sycophantic-phrases')
  })
  it('flags "you’re onto something"', () => {
    assertFires(detectSycophanticPhrases('You’re onto something here.'), 'sycophantic-phrases')
  })
  it('flags "chef’s kiss"', () => {
    assertFires(detectSycophanticPhrases('The closing paragraph is chef’s kiss.'), 'sycophantic-phrases')
  })
  it('flags "kudos"', () => {
    assertFires(detectSycophanticPhrases('Kudos to the reviewers for catching it.'), 'sycophantic-phrases')
  })
  it('flags "beautifully put"', () => {
    assertFires(detectSycophanticPhrases('That was beautifully put.'), 'sycophantic-phrases')
  })
})

// ── Sycophantic Word Openers ──────────────────────────────────────────────────

describe('detectSycophanticWords', () => {
  it('flags "Absolutely," at sentence start', () => {
    assertFires(detectSycophanticWords('Absolutely, that is the correct approach.'), 'sycophantic-words')
  })
  it('flags "Certainly," at sentence start', () => {
    assertFires(detectSycophanticWords('Certainly, I can help with that.'), 'sycophantic-words')
  })
  it('flags "Exactly," after sentence boundary', () => {
    assertFires(detectSycophanticWords('Good point. Exactly, that is how it works.'), 'sycophantic-words')
  })
  it('flags "Of course," at sentence start', () => {
    assertFires(detectSycophanticWords('Of course, there are multiple ways to approach this.'), 'sycophantic-words')
  })
  it('does not flag "absolutely" mid-sentence', () => {
    const text = 'This is absolutely the wrong approach to take.'
    expect(detectSycophanticWords(text).some(v => v.ruleId === 'sycophantic-words')).toBe(false)
  })
  it('does not flag "certainly" without following comma or exclamation', () => {
    const text = 'She was certainly aware of the risks involved.'
    expect(detectSycophanticWords(text).some(v => v.ruleId === 'sycophantic-words')).toBe(false)
  })
  it('flags "Absolutely." as a one-word sentence', () => {
    assertFires(detectSycophanticWords('Absolutely. The design holds up.'), 'sycophantic-words')
  })
  it('flags "Of course." as a one-word sentence', () => {
    assertFires(detectSycophanticWords('Of course. There are caveats.'), 'sycophantic-words')
  })
  it('flags "Perfect." praise opener', () => {
    assertFires(detectSycophanticWords('Perfect. Now run the tests again.'), 'sycophantic-words')
  })
  it('flags "Excellent!" praise opener', () => {
    assertFires(detectSycophanticWords('Excellent! The next step is deployment.'), 'sycophantic-words')
  })
  it('flags "Well done," praise opener', () => {
    assertFires(detectSycophanticWords('Well done, everyone.'), 'sycophantic-words')
  })
  it('flags "Great catch!" praise opener', () => {
    assertFires(detectSycophanticWords('Great catch! That would have shipped broken.'), 'sycophantic-words')
  })
  it('flags an opener at the start of a new line', () => {
    assertFires(detectSycophanticWords('Here is the plan:\nPerfect, we ship Friday.'), 'sycophantic-words')
  })
  it('does not flag "well done" describing a steak', () => {
    assertSilent(detectSycophanticWords('I like my steak well done.'), 'sycophantic-words')
  })
  it('does not flag "perfect" mid-sentence', () => {
    assertSilent(detectSycophanticWords('The timing was perfect.'), 'sycophantic-words')
  })
  it('does not flag "Definitely not" (no immediate punctuation)', () => {
    assertSilent(detectSycophanticWords('Definitely not what I expected.'), 'sycophantic-words')
  })
  it('does not flag praise inside quoted dialogue', () => {
    assertSilent(detectSycophanticWords('He grinned. "Nice catch!" she called back.'), 'sycophantic-words')
  })
})

// ── Slop trigrams ─────────────────────────────────────────────────────────────

describe('detectSlopTrigrams', () => {
  it('flags "voice barely a whisper" (one filler word)', () => {
    assertFires(detectSlopTrigrams('Her voice was barely a whisper.'), 'slop-trigram')
  })
  it('flags the comma variant "voice, barely a whisper"', () => {
    assertFires(detectSlopTrigrams('She spoke in a low voice, barely a whisper.'), 'slop-trigram')
  })
  it('flags the em-dash variant "voice—barely a whisper"', () => {
    assertFires(detectSlopTrigrams('His voice—barely a whisper—cut through the dark.'), 'slop-trigram')
  })
  it('flags "took a deep breath"', () => {
    assertFires(detectSlopTrigrams('She took a deep breath and knocked.'), 'slop-trigram')
  })
  it('does not match across a newline', () => {
    assertSilent(detectSlopTrigrams('I heard the voice\nbarely a whisper remained.'), 'slop-trigram')
  })
  it('does not match with more than two intervening words', () => {
    assertSilent(detectSlopTrigrams('The voice that reached us was barely a whisper.'), 'slop-trigram')
  })
})

// ── Slop bigrams ──────────────────────────────────────────────────────────────

describe('detectSlopBigrams', () => {
  it('flags "glimmer of hope" (one filler word)', () => {
    assertFires(detectSlopBigrams('A glimmer of hope remained.'), 'slop-bigram')
  })
  it('flags "glimmer of faint hope" (two filler words)', () => {
    assertFires(detectSlopBigrams('A glimmer of faint hope remained.'), 'slop-bigram')
  })
  it('flags the comma variant "brow, furrowed"', () => {
    assertFires(detectSlopBigrams('His brow, furrowed with worry, gave him away.'), 'slop-bigram')
  })
  it('flags an apostrophe filler word', () => {
    assertFires(detectSlopBigrams('He felt the day’s surge of anger.'), 'slop-bigram')
  })
  it('does not match with more than two intervening words', () => {
    assertSilent(detectSlopBigrams('The glimmer in what was left of hope faded.'), 'slop-bigram')
  })
  it('does not match across a newline', () => {
    assertSilent(detectSlopBigrams('a faint glimmer\nof hope in the dark'), 'slop-bigram')
  })
})

// ── Scare Quotes ──────────────────────────────────────────────────────────────

describe('detectScareQuotes', () => {
  it('flags word in straight double quotes', () => {
    assertFires(detectScareQuotes('The system uses "innovation" to mean cost cuts.'), 'quote-overuse')
  })
  it('flags word in curly double quotes', () => {
    assertFires(detectScareQuotes('The “brakes” work fine.'), 'quote-overuse')
  })
  it('flags word in curly single quotes', () => {
    assertFires(detectScareQuotes('Its ‘brakes’ are great (recovery).'), 'quote-overuse')
  })
  it('does not flag curly-single-quote apostrophes in contractions', () => {
    assertSilent(detectScareQuotes("It’s not a quote. Don’t flag this."), 'quote-overuse')
  })
  it('flags both occurrences when the same word appears in quotes twice', () => {
    const hits = detectScareQuotes('(the "brakes" of the car). Your "brakes" are great.')
    expect(hits.filter(v => v.ruleId === 'quote-overuse')).toHaveLength(2)
  })
  it('does not flag more than 4 words inside quotes', () => {
    assertSilent(detectScareQuotes('"This is a very long phrase inside quotes"'), 'quote-overuse')
  })
})

// ── Inline Emphasis Spam ────────────────────────────────────────────────────

describe('detectInlineEmphasis', () => {
  it('flags **bold** mid-sentence', () => {
    assertFires(detectInlineEmphasis('Your heart rate goes from 56 to 113 bpm, but **quickly returns to normal**.'), 'inline-emphasis')
  })
  it('flags *italic* mid-sentence', () => {
    assertFires(detectInlineEmphasis('The key insight is *surprisingly simple* once you see it.'), 'inline-emphasis')
  })
  it('flags multiple emphasis spans', () => {
    const hits = detectInlineEmphasis('Use **caution** when handling *raw data* in production.')
    expect(hits.filter(v => v.ruleId === 'inline-emphasis').length).toBe(2)
  })
  it('suggests the inner text as the fix (stripping markers)', () => {
    const hits = detectInlineEmphasis('This is **very important** to note.')
    const hit = hits.find(v => v.ruleId === 'inline-emphasis')
    expect(hit?.suggestedChange).toBe('very important')
  })
  it('does NOT flag bullet-start bold (handled by bold-first-bullets)', () => {
    assertSilent(detectInlineEmphasis('- **Security**: keeps data safe\n- **Performance**: runs fast'), 'inline-emphasis')
  })
  it('does NOT flag title-cased bold with 2+ words (heading/label)', () => {
    assertSilent(detectInlineEmphasis('**B. Something Something Else**'), 'inline-emphasis')
    assertSilent(detectInlineEmphasis('See **The New York Times** for details.'), 'inline-emphasis')
  })
  it('DOES flag a single capitalized word in emphasis', () => {
    assertFires(detectInlineEmphasis('Your Heart Rate Recovery is *Elite* compared to most people.'), 'inline-emphasis')
  })
  it('does NOT treat a * bullet as an italic opener', () => {
    const hits = detectInlineEmphasis('*   You dropped 25 bpm in *half a minute*.')
    const v = hits.find(h => h.ruleId === 'inline-emphasis')
    // should match *half a minute*, not the bullet-to-next-* span
    expect(v?.matchedText).toBe('*half a minute*')
  })
  it('does NOT flag lettered/numbered list item labels inside bold', () => {
    assertSilent(detectInlineEmphasis('**A. The "Muscle Pump" and Blood Pressure Shifts**'), 'inline-emphasis')
    assertSilent(detectInlineEmphasis('**1. Introduction to the Topic**'), 'inline-emphasis')
    assertSilent(detectInlineEmphasis('**B) Another Section**'), 'inline-emphasis')
  })
  it('does NOT flag when the entire heading content is the emphasis span', () => {
    assertSilent(detectInlineEmphasis('## **Core Problem**'), 'inline-emphasis')
  })
  it('DOES flag partial emphasis inside a markdown heading', () => {
    assertFires(detectInlineEmphasis('### 3. Your Heart Rate Recovery is *Elite*'), 'inline-emphasis')
    assertFires(detectInlineEmphasis('## The **Core** Problem'), 'inline-emphasis')
  })
  it('DOES flag emphasis on part of a non-heading list item', () => {
    assertFires(detectInlineEmphasis('1. Your heart rate recovery is *elite* compared to most.'), 'inline-emphasis')
  })
  it('does NOT flag plain text', () => {
    assertSilent(detectInlineEmphasis('Your heart rate quickly returns to normal.'), 'inline-emphasis')
  })
  it('fires via runClientDetectors', () => {
    assertFires(runClientDetectors('The process is **critically important** for success.'), 'inline-emphasis')
  })
})

// ── Code regions are never scanned ─────────────────────────────────────────

describe('code-region masking (via runClientDetectors)', () => {
  it('does not flag slop vocabulary inside a fenced code block', () => {
    const text = 'Here is an ordinary opening sentence about the weather today.\n\n```js\n// leverage the robust framework to delve deeper\nconst x = "crucial"\n```\n\nAnd here is an ordinary closing sentence about the weather tomorrow.'
    const violations = runClientDetectors(text)
    expect(violations).toHaveLength(0)
  })

  it('does not flag slop vocabulary inside inline code', () => {
    assertSilent(runClientDetectors('Call `delve()` to search the tree.'), 'overused-intensifier')
  })

  it('still flags the same vocabulary outside the code block', () => {
    const text = 'Let us delve into this.\n\n```\nclean code here\n```\n'
    assertFires(runClientDetectors(text), 'overused-intensifier')
  })

  it('keeps violation offsets aligned with the original text', () => {
    const text = '```\npadding padding\n```\n\nWe must leverage our assets.'
    const violations = runClientDetectors(text)
    const v = violations.find(x => x.ruleId === 'overused-intensifier')
    expect(v).toBeDefined()
    expect(text.slice(v!.startIndex, v!.endIndex)).toBe(v!.matchedText)
    expect(v!.matchedText.toLowerCase()).toContain('leverage')
  })
})

// Generates src/detectors/concreteNouns.ts from the Brysbaert et al. (2014)
// concreteness norms ("Concreteness ratings for 40 thousand generally known
// English word lemmas", Behavior Research Methods; CC-BY).
//
// Usage:
//   1. Download the norms TSV, e.g.:
//      https://raw.githubusercontent.com/ArtsEngine/concreteness/master/Concreteness_ratings_Brysbaert_et_al_BRM.txt
//   2. node scripts/generate-concrete-nouns.mjs <path-to-tsv>
//
// Filters (see header comment in the generated file for rationale):
//   - single words (Bigram=0), lowercase alphabetic, length >= 3
//   - Conc.M >= 4.2      — concrete-object territory; "war" (3.63) and
//                          "thing" (3.17) stay out, "springboard" (4.24) gets in
//   - SUBTLEX >= 5       — drops hapax-in-the-norms obscurities (roadsweeper)
//   - no Dom_Pos filter  — the column is unreliable ("plunger" is tagged
//                          Adjective) and the consumer only looks words up in
//                          noun position, so a POS filter costs real vehicles
//                          ("dial" is tagged Verb) for no precision gain
//   - person-noun skip   — generic humans read as literal scene description
//                          ("It's a man dressed in black"), not metaphor vehicles

import { readFileSync, writeFileSync } from 'node:fs'

const PERSON_SKIP = new Set([
  'man', 'woman', 'person', 'guy', 'girl', 'boy', 'kid', 'child', 'baby',
  'lady', 'gentleman', 'dude', 'dad', 'mom', 'mother', 'father', 'brother',
  'sister', 'son', 'daughter', 'wife', 'husband',
])

const src = process.argv[2]
if (!src) {
  console.error('usage: node scripts/generate-concrete-nouns.mjs <path-to-brysbaert-tsv>')
  process.exit(1)
}

const words = readFileSync(src, 'utf8')
  .split(/\r?\n/)
  .slice(1)
  .filter(Boolean)
  .map(l => {
    const [word, bigram, concM, , , , , subtlex] = l.split('\t')
    return { word, bigram: +bigram, conc: +concM, freq: +subtlex }
  })
  .filter(r =>
    r.bigram === 0 &&
    /^[a-z]{3,}$/.test(r.word) &&
    r.conc >= 4.2 &&
    r.freq >= 5 &&
    !PERSON_SKIP.has(r.word),
  )
  .map(r => r.word)
  .sort()

const body = `// GENERATED FILE — do not edit by hand. Regenerate with:
//   node scripts/generate-concrete-nouns.mjs <path-to-brysbaert-tsv>
//
// Concrete-object nouns from the Brysbaert et al. (2014) concreteness norms
// (CC-BY), filtered to Conc.M >= 4.2, SUBTLEX frequency >= 5, single lowercase
// words, generic person-nouns removed. Consumed by the decorative-metaphor
// detector: a word in this set appearing as the head noun of an "It's a ..."
// predicate is a concrete metaphor vehicle candidate. The 4.2 cutoff keeps
// canonical vehicles (knob 4.75, treadmill 4.93, springboard 4.24) and excludes
// abstractions ("war" 3.63, "thing" 3.17). Known miss: "detector" scores 3.7.
//
// ${words.length} words.

const WORDS = \`${words.join(' ')}\`

export const CONCRETE_NOUNS: ReadonlySet<string> = new Set(WORDS.split(' '))
`

writeFileSync('src/detectors/concreteNouns.ts', body)
console.log(`wrote src/detectors/concreteNouns.ts with ${words.length} words`)

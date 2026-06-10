// TypeScript port of wordfreq-en.js from eqbench Slop Score
// Original: https://github.com/rspeer/wordfreq (Apache 2.0 / CC-BY-SA 4.0)
// Data format: cBpack — array where bin[i] contains words with Zipf = (900 - i) / 100

import { decode } from '@msgpack/msgpack'

interface CbPackHeader {
  format: string
  version: number
}

export class WordfreqEn {
  private map: Map<string, number>
  private minZipf: number

  constructor(map: Map<string, number>, minZipf = 0) {
    this.map = map
    this.minZipf = minZipf
  }

  zipfFrequency(word: string): number {
    return this.map.get(word.toLowerCase().trim()) ?? this.minZipf
  }

  // Probability per word token: 10^(zipf - 9)
  frequency(word: string): number {
    const z = this.zipfFrequency(word)
    return z > 0 ? Math.pow(10, z - 9) : 0
  }
}

export async function loadWordfreq(url: string): Promise<WordfreqEn> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)

  const raw = await response.arrayBuffer()
  const bytes = new Uint8Array(raw)

  // Vite dev server adds Content-Encoding: gzip so the browser auto-decompresses
  // the .gz file before we see it. In production (Cloudflare Pages) it arrives raw.
  // Sniff gzip magic bytes (0x1f 0x8b) to decide whether to decompress.
  let buf: Uint8Array
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))
    buf = new Uint8Array(await new Response(stream).arrayBuffer())
  } else {
    buf = bytes
  }
  const data = decode(buf) as unknown[]

  const header = data[0] as CbPackHeader
  if (!header || header.format !== 'cB' || header.version !== 1) {
    throw new Error(`Unexpected wordfreq format: ${JSON.stringify(header)}`)
  }

  const map = new Map<string, number>()
  const bins = data.slice(1) as (string[])[]
  for (let i = 0; i < bins.length; i++) {
    const words = bins[i]
    if (!Array.isArray(words) || words.length === 0) continue
    const zipf = (900 - i) / 100
    for (const w of words) map.set(w, zipf)
  }

  return new WordfreqEn(map)
}

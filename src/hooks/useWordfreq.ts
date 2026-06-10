import { useState, useEffect } from 'react'
import { WordfreqEn, loadWordfreq } from '../utils/wordfreq'

export type WordfreqStatus = 'loading' | 'ready' | 'error'

export interface UseWordfreqResult {
  wf: WordfreqEn | null
  status: WordfreqStatus
}

export function useWordfreq(): UseWordfreqResult {
  const [wf, setWf] = useState<WordfreqEn | null>(null)
  const [status, setStatus] = useState<WordfreqStatus>('loading')

  useEffect(() => {
    loadWordfreq('/data/large_en.msgpack.gz')
      .then(result => {
        setWf(result)
        setStatus('ready')
      })
      .catch((err) => {
        console.error('[wordfreq] load failed:', err)
        setStatus('error')
      })
  }, [])

  return { wf, status }
}

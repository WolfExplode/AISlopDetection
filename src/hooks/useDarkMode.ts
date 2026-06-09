import { useState } from 'react'

const STORAGE_KEY = 'dark-mode'

export function useDarkMode(): [boolean, () => void] {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored !== null ? stored === 'true' : true
  })

  const toggle = () => setDark(d => {
    const next = !d
    localStorage.setItem(STORAGE_KEY, String(next))
    return next
  })

  return [dark, toggle]
}

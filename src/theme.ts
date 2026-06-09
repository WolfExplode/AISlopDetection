import { createContext, useContext } from 'react'

export interface Theme {
  isDark: boolean
  bg: string
  surface: string
  surfaceAlt: string
  surfaceHover: string
  border: string
  borderLight: string
  text: string
  textMuted: string
  textFaint: string
  textFainter: string
  textFaintest: string
  link: string
  caret: string
  selection: string
  scrollThumb: string
  green: string
  greenBg: string
  greenBorder: string
  amber: string
  amberBg: string
  amberBorder: string
  red: string
  redBg: string
  redBorder: string
}

export const lightTheme: Theme = {
  isDark: false,
  bg: '#f5f5f0',
  surface: '#ffffff',
  surfaceAlt: '#f8f8f8',
  surfaceHover: '#f0f0eb',
  border: '#e0e0e0',
  borderLight: '#f0f0f0',
  text: '#1a1a1a',
  textMuted: '#444',
  textFaint: '#666',
  textFainter: '#888',
  textFaintest: '#aaa',
  link: '#2563eb',
  caret: '#2563eb',
  selection: 'rgba(37, 99, 235, 0.15)',
  scrollThumb: '#ccc',
  green: '#16a34a',
  greenBg: '#f0fdf4',
  greenBorder: '#86efac',
  amber: '#92400e',
  amberBg: '#fffbeb',
  amberBorder: '#fcd34d',
  red: '#dc2626',
  redBg: '#fff5f5',
  redBorder: '#fecaca',
}

export const darkTheme: Theme = {
  isDark: true,
  bg: '#141414',
  surface: '#1c1c1c',
  surfaceAlt: '#252525',
  surfaceHover: '#2c2c2c',
  border: '#333333',
  borderLight: '#2a2a2a',
  text: '#e8e8e0',
  textMuted: '#c0c0b8',
  textFaint: '#999999',
  textFainter: '#777777',
  textFaintest: '#555555',
  link: '#60a5fa',
  caret: '#60a5fa',
  selection: 'rgba(96, 165, 250, 0.2)',
  scrollThumb: '#3a3a3a',
  green: '#4ade80',
  greenBg: 'rgba(22,163,74,0.18)',
  greenBorder: 'rgba(74,222,128,0.35)',
  amber: '#fcd34d',
  amberBg: 'rgba(251,191,36,0.15)',
  amberBorder: 'rgba(252,211,77,0.3)',
  red: '#f87171',
  redBg: 'rgba(220,38,38,0.15)',
  redBorder: 'rgba(248,113,113,0.3)',
}

export const ThemeContext = createContext<Theme>(darkTheme)
export const useTheme = () => useContext(ThemeContext)

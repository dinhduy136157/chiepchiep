"use client"

import { useEffect } from 'react'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const theme = stored || (prefersDark ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [])

  return children
}

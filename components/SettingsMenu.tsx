"use client"

import { useEffect, useRef, useState } from 'react'
import { Moon, Settings, Sun } from 'lucide-react'

export default function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark')
    setIsDark(isDarkMode)
  }, [])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (menuRef.current.contains(event.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggleTheme = () => {
    const nextIsDark = !isDark
    setIsDark(nextIsDark)
    document.documentElement.classList.toggle('dark', nextIsDark)
    localStorage.setItem('theme', nextIsDark ? 'dark' : 'light')
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Settings className="w-5 h-5 text-slate-600" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden z-20">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
            <p className="text-sm font-semibold text-slate-700">Cai dat</p>
          </div>
          <button
            onClick={toggleTheme}
            className="w-full px-4 py-3 text-left text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            Che do toi
            <span className="ml-auto text-xs text-slate-400">
              {isDark ? 'Bat' : 'Tat'}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

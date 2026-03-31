"use client"

import Link from 'next/link'
import { Bell, Search } from 'lucide-react'
import UserMenu from '@/components/UserMenu'
import SettingsMenu from '@/components/SettingsMenu'

type AppHeaderProps = {
  pageTitle?: string
  showSearch?: boolean
  searchTerm?: string
  onSearchChange?: (value: string) => void
  userName?: string | null
  avatarUrl?: string | null
}

export default function AppHeader({
  pageTitle,
  showSearch,
  searchTerm,
  onSearchChange,
  userName,
  avatarUrl,
}: AppHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-full overflow-hidden ring-1 ring-slate-200 bg-white group-hover:scale-105 transition-transform">
                <img
                  src="/logo.jpg"
                  alt="Duy logo"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="font-bold text-slate-800 hidden sm:block">Duy Vocabulary</span>
            </Link>

            {pageTitle ? (
              <span className="text-sm font-medium text-slate-500 hidden sm:block">
                {pageTitle}
              </span>
            ) : null}

            {showSearch ? (
              <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 w-64">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm học phần..."
                  value={searchTerm ?? ''}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm text-slate-600 w-full placeholder:text-slate-400"
                />
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors relative">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <SettingsMenu />
            <UserMenu avatarUrl={avatarUrl} userName={userName} />
          </div>
        </div>
      </div>
    </div>
  )
}

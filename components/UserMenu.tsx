"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { resolveAvatarUrl } from '@/utils/avatar'

type UserMenuProps = {
  avatarUrl?: string | null
  userName?: string | null
}

export default function UserMenu({ avatarUrl, userName }: UserMenuProps) {
  const supabase = createClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (menuRef.current.contains(event.target as Node)) return
      setOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const initials = (userName || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="group w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden border border-white/30 shadow-sm hover:shadow-md transition-all"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <img
          src={resolveAvatarUrl(avatarUrl)}
          alt="avatar"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/avatars/avatar-anh-meo-cute-5.jpg'
          }}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden z-20">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center text-xs font-bold overflow-hidden border border-white/30">
                <img
                  src={resolveAvatarUrl(avatarUrl)}
                  alt="avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/avatars/avatar-anh-meo-cute-5.jpg'
                  }}
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">
                  {userName || 'Nguoi dung'}
                </p>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {initials || 'U'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  )
}

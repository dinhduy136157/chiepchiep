"use client"
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-emerald-50 px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-white/80 bg-white/80 p-8 shadow-lg backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700/70">
            Flashcard Chiep
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Đăng nhập</h1>
          <p className="mt-2 text-sm text-slate-600">
            Giữ tập trung khi luyện từ vựng IELTS.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400"
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              required
            />
            <input
              type="password"
              placeholder="Mật khẩu"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400"
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              required
            />
            <button
              className="w-full rounded-full bg-emerald-600 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              disabled={loading}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Chưa có tài khoản?{' '}
            <Link href="/auth/register" className="font-semibold text-emerald-700 hover:text-emerald-900">
              Tạo tài khoản
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

"use client"
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })
    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    alert('Đăng ký thành công. Vui lòng kiểm tra email để xác nhận.')
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-emerald-50 px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-white/80 bg-white/80 p-8 shadow-lg backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700/70">
            Flashcard Chiep
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Tạo tài khoản</h1>
          <p className="mt-2 text-sm text-slate-600">
            Lưu học phần và học cùng bạn bè.
          </p>

          <form onSubmit={handleRegister} className="mt-8 space-y-4">
            <input
              type="text"
              placeholder="Tên hiển thị"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400"
              onChange={(e) => setUsername(e.target.value)}
              value={username}
              required
            />
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
              {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Đã có tài khoản?{' '}
            <Link href="/auth/login" className="font-semibold text-emerald-700 hover:text-emerald-900">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

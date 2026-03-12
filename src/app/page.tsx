"use client"
import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) router.push('/dashboard')
      else router.push('/auth/login')
    }
    checkUser()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center italic text-slate-400">
      Đang kiểm tra...
    </div>
  )
}

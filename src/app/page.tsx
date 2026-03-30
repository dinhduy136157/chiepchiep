"use client"
import { useEffect } from 'react'
import { useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      let session = (await supabase.auth.getSession()).data.session

      // On mobile/PWA launch, auth restore can be slightly delayed.
      if (!session) {
        await new Promise((resolve) => setTimeout(resolve, 350))
        session = (await supabase.auth.getSession()).data.session
      }

      if (session) router.replace('/dashboard')
      else router.replace('/auth/login')
    }
    checkUser()
  }, [router, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center italic text-slate-400">
      Đang kiểm tra...
    </div>
  )
}

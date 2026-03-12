'use client'
import { useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

type CardInput = { term: string; definition: string }

export default function CreateSetPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [cards, setCards] = useState<CardInput[]>([{ term: '', definition: '' }])
  const [saving, setSaving] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  const addRow = () => setCards([...cards, { term: '', definition: '' }])
  const removeRow = (index: number) => {
    if (cards.length === 1) return
    setCards(cards.filter((_, i) => i !== index))
  }

  const filledCards = useMemo(() => {
    return cards.filter((card) => card.term.trim() && card.definition.trim())
  }, [cards])

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tiêu đề học phần.')
      return
    }

    if (filledCards.length === 0) {
      alert('Hãy thêm ít nhất một thẻ trước khi lưu.')
      return
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.')
      setSaving(false)
      return
    }

    const { data: setData, error: setError } = await supabase
      .from('study_sets')
      .insert([{ title, description, author_id: user.id }])
      .select('id')
      .single()

    if (setError || !setData) {
      alert(setError?.message ?? 'Không thể tạo học phần.')
      setSaving(false)
      return
    }

    const cardsToInsert = filledCards.map((card) => ({
      ...card,
      set_id: setData.id,
    }))
    const { error: cardError } = await supabase.from('cards').insert(cardsToInsert)

    if (cardError) {
      alert(cardError.message)
      setSaving(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-emerald-50 px-6 py-10">
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-3xl border border-white/80 bg-white/80 p-8 shadow-sm backdrop-blur">
          <h1 className="text-2xl font-semibold">Tạo học phần mới</h1>
          <p className="mt-2 text-sm text-slate-600">
            Tập trung vào tiêu đề và thêm cặp thuật ngữ - định nghĩa rõ ràng.
          </p>

          <div className="mt-8 space-y-4">
            <input
              placeholder="Tiêu đề học phần (VD: IELTS 3000 từ)"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              placeholder="Mô tả ngắn (tuỳ chọn)"
              className="min-h-[96px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="mt-8 space-y-4">
            {cards.map((card, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm md:grid-cols-[1fr_1fr_auto]"
              >
                <input
                  placeholder="Thuật ngữ"
                  className="w-full border-b border-slate-200 bg-transparent pb-2 text-sm outline-none focus:border-emerald-400"
                  value={card.term}
                  onChange={(e) => {
                    const next = [...cards]
                    next[index].term = e.target.value
                    setCards(next)
                  }}
                />
                <input
                  placeholder="Định nghĩa"
                  className="w-full border-b border-slate-200 bg-transparent pb-2 text-sm outline-none focus:border-emerald-400"
                  value={card.definition}
                  onChange={(e) => {
                    const next = [...cards]
                    next[index].definition = e.target.value
                    setCards(next)
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                >
                  Xoá
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={addRow}
              className="rounded-full border border-emerald-200 bg-white px-5 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300"
            >
              Thêm thẻ
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {saving ? 'Đang lưu...' : 'Lưu học phần'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchBar({
  defaultSearch = '',
  defaultStatus,
}: {
  defaultSearch?: string
  defaultStatus?: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState(defaultSearch)

  const navigate = (newSearch: string) => {
    const params = new URLSearchParams()
    if (defaultStatus && defaultStatus !== '전체') params.set('status', defaultStatus)
    if (newSearch.trim()) params.set('search', newSearch.trim())
    router.push(`/admin/dashboard?${params.toString()}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(search)
  }

  const handleClear = () => {
    setSearch('')
    navigate('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="사업자번호 / 전화 / 이메일 검색"
          className="pl-4 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        {search && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>
      <button
        type="submit"
        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
      >
        검색
      </button>
    </form>
  )
}

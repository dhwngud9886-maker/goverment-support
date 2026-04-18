'use client'

import { useState } from 'react'

type ImageTypeFilter = 'SITE' | 'LICENSE' | 'SIGNATURE'

const TYPE_LABEL: Record<ImageTypeFilter, string> = {
  SITE: '현장사진',
  LICENSE: '사업자등록증',
  SIGNATURE: '서명',
}

export default function ZipDownloadButton({
  submissionId,
  label,
  type,
  variant = 'primary',
}: {
  submissionId: number
  label: string
  type?: ImageTypeFilter   // 없으면 전체 다운로드
  variant?: 'primary' | 'secondary' | 'ghost'
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDownload = async () => {
    setLoading(true)
    setError('')
    try {
      const url = type
        ? `/api/admin/download/${submissionId}?type=${type}`
        : `/api/admin/download/${submissionId}`

      const res = await fetch(url)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '다운로드에 실패했습니다')
      }

      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)

      // Content-Disposition 헤더에서 파일명 추출
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const utf8Match = disposition.match(/filename\*=UTF-8''(.+)/i)
      const asciiMatch = disposition.match(/filename="?([^";\n]+)"?/i)
      const filename = utf8Match
        ? decodeURIComponent(utf8Match[1])
        : asciiMatch
        ? asciiMatch[1]
        : `신청_${submissionId}${type ? `_${TYPE_LABEL[type]}` : '_사진전체'}.zip`

      const a = document.createElement('a')
      a.href = objectUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : '다운로드에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const baseClass =
    'inline-flex items-center gap-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed'

  const variantClass = {
    primary: 'px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    secondary:
      'px-3 py-1.5 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm',
    ghost: 'px-2 py-1 text-blue-600 hover:text-blue-800 hover:underline',
  }[variant]

  return (
    <div className="inline-block">
      <button
        onClick={handleDownload}
        disabled={loading}
        className={`${baseClass} ${variantClass}`}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>압축 중...</span>
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>{label}</span>
          </>
        )}
      </button>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

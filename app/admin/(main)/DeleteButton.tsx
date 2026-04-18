'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * afterDelete:
 *   'refresh' — 현재 페이지 새로고침 (목록 페이지에서 사용)
 *   '/path'   — 해당 경로로 이동 (상세 페이지에서 사용)
 *
 * size:
 *   'sm'  — 텍스트 버튼 스타일 (테이블 행 안)
 *   'md'  — 테두리 버튼 스타일 (위험 구역 섹션 안)
 */
export default function DeleteButton({
  submissionId,
  afterDelete = 'refresh',
  size = 'sm',
}: {
  submissionId: number
  afterDelete?: 'refresh' | string
  size?: 'sm' | 'md'
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    const confirmed = window.confirm(
      '이 신청을 삭제하시겠습니까?\n\n삭제 후 복구할 수 없으며, 첨부된 사진도 모두 삭제됩니다.'
    )
    if (!confirmed) return

    setDeleting(true)
    setError('')

    try {
      const res = await fetch(`/api/admin/submission/${submissionId}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || '삭제에 실패했습니다')

      if (afterDelete === 'refresh') {
        router.refresh()
      } else {
        router.push(afterDelete)
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다'
      )
      setDeleting(false)
    }
  }

  if (size === 'sm') {
    return (
      <span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-red-400 hover:text-red-600 text-sm font-medium disabled:opacity-40 transition-colors"
        >
          {deleting ? '삭제 중...' : '삭제'}
        </button>
        {error && (
          <span className="ml-2 text-red-500 text-xs">{error}</span>
        )}
      </span>
    )
  }

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-5 py-2 bg-white text-red-600 border border-red-300 rounded-lg text-sm font-semibold hover:bg-red-600 hover:text-white hover:border-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {deleting ? '삭제 중...' : '이 신청 삭제'}
      </button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  )
}

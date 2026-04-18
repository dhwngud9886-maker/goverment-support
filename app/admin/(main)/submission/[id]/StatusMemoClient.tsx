'use client'

import { useState, useTransition } from 'react'
import { updateStatus, updateAdminMemo } from '@/app/actions/admin'

const STATUS_OPTIONS = ['접수완료', '확인중', '연락완료', '완료']

const STATUS_ACTIVE_COLORS: Record<string, string> = {
  접수완료: 'bg-blue-600 text-white ring-blue-300',
  확인중: 'bg-yellow-500 text-white ring-yellow-300',
  연락완료: 'bg-orange-500 text-white ring-orange-300',
  완료: 'bg-green-600 text-white ring-green-300',
}

export default function StatusMemoClient({
  submissionId,
  currentStatus,
  currentAdminMemo,
}: {
  submissionId: number
  currentStatus: string
  currentAdminMemo: string
}) {
  const [status, setStatus] = useState(currentStatus)
  const [memo, setMemo] = useState(currentAdminMemo)
  const [statusMessage, setStatusMessage] = useState('')
  const [memoMessage, setMemoMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleStatusSave = () => {
    startTransition(async () => {
      await updateStatus(submissionId, status)
      setStatusMessage('저장되었습니다')
      setTimeout(() => setStatusMessage(''), 2500)
    })
  }

  const handleMemoSave = () => {
    startTransition(async () => {
      await updateAdminMemo(submissionId, memo)
      setMemoMessage('저장되었습니다')
      setTimeout(() => setMemoMessage(''), 2500)
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 상태 관리 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          상태 변경
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                status === s
                  ? `${STATUS_ACTIVE_COLORS[s]} ring-2 ring-offset-1`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleStatusSave}
            disabled={isPending || status === currentStatus}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? '저장 중...' : '상태 저장'}
          </button>
          {statusMessage && (
            <span className="text-green-600 text-sm font-medium">
              ✓ {statusMessage}
            </span>
          )}
        </div>
        {status !== currentStatus && (
          <p className="text-xs text-orange-600 mt-2">
            현재: <strong>{currentStatus}</strong> → 변경: <strong>{status}</strong>
          </p>
        )}
      </div>

      {/* 관리자 메모 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          관리자 메모
        </h3>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="관리자 메모를 입력하세요..."
          rows={4}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handleMemoSave}
            disabled={isPending}
            className="flex-1 bg-gray-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-40 transition-colors"
          >
            {isPending ? '저장 중...' : '메모 저장'}
          </button>
          {memoMessage && (
            <span className="text-green-600 text-sm font-medium">
              ✓ {memoMessage}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

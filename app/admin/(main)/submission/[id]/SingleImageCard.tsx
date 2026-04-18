'use client'

import { useState } from 'react'
import ImageGallery from './ImageGallery'

interface ImageData {
  id: number
  imageUrl: string
}

async function downloadFile(url: string, filename: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('파일을 가져오지 못했습니다')
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}

export default function SingleImageCard({
  title,
  image,
}: {
  title: string
  image: ImageData | undefined
}) {
  const [downloading, setDownloading] = useState(false)
  const [isBroken, setIsBroken] = useState(false)

  if (!image) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
          {title}
        </h3>
        <p className="text-gray-400 italic text-sm">업로드된 사진 없음</p>
      </div>
    )
  }

  const ext = image.imageUrl.split('.').pop()?.toLowerCase() || 'jpg'
  const filename = `${title}.${ext}`

  const handleDownload = async () => {
    if (isBroken) return
    setDownloading(true)
    try {
      await downloadFile(image.imageUrl, filename)
    } catch {
      alert('다운로드에 실패했습니다')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          {title}
        </h3>
        {!isBroken && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors disabled:opacity-50"
          >
            <svg
              className="h-3.5 w-3.5"
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
            {downloading ? '다운로드 중...' : '다운로드'}
          </button>
        )}
        {isBroken && (
          <span className="text-xs text-red-400 font-medium">파일 없음</span>
        )}
      </div>

      {/* 이미지 (갤러리 모달 포함) — 파일이 없을 때는 플레이스홀더 표시 */}
      {isBroken ? (
        <div className="aspect-square w-full max-w-xs flex flex-col items-center justify-center bg-gray-100 rounded-lg text-gray-400 gap-2">
          <svg className="h-10 w-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-400">이미지 파일을 찾을 수 없습니다</p>
          <p className="text-xs text-gray-300 break-all px-2 text-center">{image.imageUrl}</p>
        </div>
      ) : (
        <ImageGallery
          images={[image]}
          downloadPrefix={title}
          onFirstImageBroken={() => setIsBroken(true)}
        />
      )}
    </div>
  )
}

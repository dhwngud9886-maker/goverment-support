'use client'

import { useState } from 'react'

interface Image {
  id: number
  imageUrl: string
}

// 이미지 로드 실패 시 표시할 플레이스홀더
function BrokenImagePlaceholder({ label }: { label: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 gap-1 p-2">
      <svg className="h-7 w-7 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span className="text-[10px] text-center leading-tight">{label}<br />파일 없음</span>
    </div>
  )
}

async function downloadFile(url: string, filename: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('파일 요청 실패')
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

function DownloadIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
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
  )
}

export default function ImageGallery({
  images,
  downloadPrefix = '사진',
  onFirstImageBroken,
}: {
  images: Image[]
  downloadPrefix?: string   // 저장 파일명 접두사: "현장사진" → "현장사진_1.jpg"
  onFirstImageBroken?: () => void // SingleImageCard 에서 사용 (파일 없음 감지)
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [brokenIds, setBrokenIds] = useState<Set<number>>(new Set())

  const markBroken = (id: number, isFirst: boolean) => {
    setBrokenIds((prev) => new Set(prev).add(id))
    if (isFirst && onFirstImageBroken) onFirstImageBroken()
  }

  const open = (url: string, index: number) => {
    setSelected(url)
    setCurrentIndex(index)
  }
  const close = () => setSelected(null)

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation()
    const i = (currentIndex - 1 + images.length) % images.length
    setCurrentIndex(i)
    setSelected(images[i].imageUrl)
  }
  const next = (e: React.MouseEvent) => {
    e.stopPropagation()
    const i = (currentIndex + 1) % images.length
    setCurrentIndex(i)
    setSelected(images[i].imageUrl)
  }

  const getFilename = (img: Image, index: number) => {
    const ext = img.imageUrl.split('.').pop()?.toLowerCase() || 'jpg'
    return images.length > 1
      ? `${downloadPrefix}_${index + 1}.${ext}`
      : `${downloadPrefix}.${ext}`
  }

  const handleThumbnailDownload = async (
    e: React.MouseEvent,
    img: Image,
    index: number
  ) => {
    e.stopPropagation()
    setDownloadingId(img.id)
    try {
      await downloadFile(img.imageUrl, getFilename(img, index))
    } catch {
      alert('다운로드에 실패했습니다')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleModalDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const img = images[currentIndex]
    try {
      await downloadFile(img.imageUrl, getFilename(img, currentIndex))
    } catch {
      alert('다운로드에 실패했습니다')
    }
  }

  return (
    <>
      {/* 썸네일 그리드 */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {images.map((img, index) => (
          <div key={img.id} className="relative group">
            {/* 썸네일 클릭 → 모달 */}
            <button
              type="button"
              onClick={() => !brokenIds.has(img.id) && open(img.imageUrl, index)}
              disabled={brokenIds.has(img.id)}
              className="aspect-square w-full block rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 hover:shadow-md transition-all disabled:cursor-default disabled:hover:border-gray-200"
            >
              {brokenIds.has(img.id) ? (
                <BrokenImagePlaceholder label={`${downloadPrefix} ${index + 1}`} />
              ) : (
                <img
                  src={img.imageUrl}
                  alt={`${downloadPrefix} ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={() => markBroken(img.id, index === 0)}
                />
              )}
            </button>

            {/* 개별 다운로드 버튼 (hover 시 표시) */}
            <button
              type="button"
              onClick={(e) => handleThumbnailDownload(e, img, index)}
              disabled={downloadingId === img.id}
              title="이 사진 다운로드"
              className="
                absolute bottom-1.5 right-1.5
                bg-white/90 backdrop-blur-sm
                text-gray-700 hover:text-blue-700
                rounded-md p-1 shadow
                opacity-0 group-hover:opacity-100
                transition-opacity
                disabled:opacity-50
              "
            >
              {downloadingId === img.id ? (
                <svg
                  className="animate-spin h-3.5 w-3.5"
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
              ) : (
                <DownloadIcon className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        ))}
      </div>

      {/* 이미지 모달 */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          onClick={close}
        >
          <div
            className="relative max-w-4xl max-h-full flex items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 이전 */}
            {images.length > 1 && (
              <button
                onClick={prev}
                className="flex-shrink-0 bg-white/20 hover:bg-white/40 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors text-2xl"
              >
                ‹
              </button>
            )}

            <div className="relative">
              <img
                src={selected}
                alt="확대 이미지"
                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
                onError={(e) => {
                  const target = e.currentTarget
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent && !parent.querySelector('.broken-modal')) {
                    const div = document.createElement('div')
                    div.className = 'broken-modal w-64 h-48 flex flex-col items-center justify-center bg-gray-800 text-gray-400 rounded-xl gap-2'
                    div.innerHTML = '<svg class="h-10 w-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg><span class="text-sm">파일이 없습니다</span>'
                    parent.insertBefore(div, target)
                  }
                }}
              />

              {/* 닫기 */}
              <button
                onClick={close}
                className="absolute -top-3 -right-3 bg-white text-gray-800 w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 font-bold text-lg leading-none"
              >
                ×
              </button>

              {/* 모달 내 다운로드 버튼 */}
              <button
                onClick={handleModalDownload}
                className="
                  absolute bottom-3 right-3
                  inline-flex items-center gap-1.5
                  bg-white/90 backdrop-blur-sm
                  text-gray-800 hover:text-blue-700
                  text-sm font-medium px-3 py-1.5
                  rounded-lg shadow transition-colors
                "
              >
                <DownloadIcon className="h-4 w-4" />
                다운로드
              </button>

              {/* 이미지 번호 */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                  {currentIndex + 1} / {images.length}
                </div>
              )}
            </div>

            {/* 다음 */}
            {images.length > 1 && (
              <button
                onClick={next}
                className="flex-shrink-0 bg-white/20 hover:bg-white/40 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors text-2xl"
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}

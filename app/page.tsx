'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface FormState {
  businessNumber: string
  businessPlaceNumber: string
  phone: string
  email: string
  address: string
  memo: string
}

interface FormErrors {
  businessNumber?: string
  businessPlaceNumber?: string
  phone?: string
  email?: string
  address?: string
  sitePhotos?: string
  businessLicense?: string
  signaturePhoto?: string
}

interface ImagePreview {
  file: File
  url: string
  id: string
}

const INITIAL_FORM: FormState = {
  businessNumber: '',
  businessPlaceNumber: '',
  phone: '',
  email: '',
  address: '',
  memo: '',
}

function makePreview(file: File): ImagePreview {
  return { file, url: URL.createObjectURL(file), id: Math.random().toString(36).slice(2) }
}

// ── 공통 클래스 상수 ──────────────────────────────────────
// 반응형 기준: 모바일(기본) / sm:640px~ / md:768px~
const CLS = {
  card:    'bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6',
  cardErr: 'bg-white rounded-xl shadow-sm border p-4 sm:p-6',
  h2:      'text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2',
  label:   'block text-sm sm:text-base font-medium text-gray-700 mb-1',
  input:   'w-full px-4 py-3 sm:py-2.5 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
  hint:    'text-xs sm:text-sm text-gray-400 mt-1',
  errTxt:  'text-red-500 text-sm mt-1.5',
} as const

// ── 단일 이미지 업로드 컴포넌트 ──────────────────────────
function SingleImageUpload({
  label, required, guide, preview, error, onSelect, onRemove,
}: {
  label: string
  required?: boolean
  guide: string
  preview: ImagePreview | null
  error?: string
  onSelect: (file: File) => void
  onRemove: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onSelect(file)
    if (ref.current) ref.current.value = ''
  }

  return (
    <div>
      <h2 className={CLS.h2}>
        <span className="w-1.5 h-5 bg-blue-600 rounded-full inline-block flex-shrink-0" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </h2>

      {preview ? (
        <div className="flex items-start gap-4">
          <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex-shrink-0">
            <img
              src={preview.url}
              alt={label}
              className="w-full h-full object-cover rounded-xl border border-gray-200 shadow-sm"
            />
            <button
              type="button"
              onClick={onRemove}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-red-600 transition-colors text-base leading-none"
            >
              ×
            </button>
          </div>
          <div className="pt-1">
            <p className="text-sm sm:text-base text-green-600 font-medium">✓ 업로드 완료</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 break-all">{preview.file.name}</p>
            <button
              type="button"
              onClick={() => ref.current?.click()}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              다른 사진으로 변경
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => ref.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 sm:p-8 text-center cursor-pointer transition-all ${
            error
              ? 'border-red-400 bg-red-50 hover:border-red-500'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          <svg
            className="w-8 h-8 sm:w-9 sm:h-9 text-gray-400 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm sm:text-base text-gray-600 font-medium">클릭하여 사진 선택</p>
          <p className={CLS.hint}>{guide}</p>
        </div>
      )}

      <input ref={ref} type="file" accept="image/*" onChange={handleChange} className="hidden" />
      {error && <p className={CLS.errTxt}>{error}</p>}
    </div>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────
export default function SubmissionPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [sitePhotos, setSitePhotos] = useState<ImagePreview[]>([])
  const sitePhotosRef = useRef<HTMLInputElement>(null)
  const [businessLicense, setBusinessLicense] = useState<ImagePreview | null>(null)
  const [signaturePhoto, setSignaturePhoto] = useState<ImagePreview | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormErrors]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSitePhotosSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = 4 - sitePhotos.length
    setSitePhotos((prev) => [...prev, ...files.slice(0, remaining).map(makePreview)])
    if (sitePhotosRef.current) sitePhotosRef.current.value = ''
    if (errors.sitePhotos) setErrors((prev) => ({ ...prev, sitePhotos: '' }))
  }

  const removeSitePhoto = (id: string) => {
    setSitePhotos((prev) => {
      const t = prev.find((img) => img.id === id)
      if (t) URL.revokeObjectURL(t.url)
      return prev.filter((img) => img.id !== id)
    })
  }

  const handleSingleSelect = (
    setter: React.Dispatch<React.SetStateAction<ImagePreview | null>>,
    errorKey: keyof FormErrors
  ) => (file: File) => {
    setter((prev) => { if (prev) URL.revokeObjectURL(prev.url); return makePreview(file) })
    setErrors((prev) => ({ ...prev, [errorKey]: '' }))
  }

  const handleSingleRemove = (
    setter: React.Dispatch<React.SetStateAction<ImagePreview | null>>,
    prev: ImagePreview | null
  ) => () => {
    if (prev) URL.revokeObjectURL(prev.url)
    setter(null)
  }

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.businessNumber.trim())      e.businessNumber      = '사업자등록번호를 입력해주세요'
    if (!form.businessPlaceNumber.trim()) e.businessPlaceNumber = '사업장관리번호를 입력해주세요'
    if (!form.phone.trim())               e.phone               = '전화번호를 입력해주세요'
    if (!form.email.trim()) {
      e.email = '이메일을 입력해주세요'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = '올바른 이메일 형식이 아닙니다'
    }
    if (!form.address.trim()) e.address = '주소를 입력해주세요'
    if (sitePhotos.length < 4)
      e.sitePhotos = `현장사진을 정확히 4장 업로드해주세요 (현재 ${sitePhotos.length}장)`
    else if (sitePhotos.length > 4)
      e.sitePhotos = '현장사진은 4장까지만 업로드 가능합니다'
    if (!businessLicense) e.businessLicense = '사업자등록증 사진을 업로드해주세요'
    if (!signaturePhoto)  e.signaturePhoto  = '서명 사진을 업로드해주세요'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) {
      document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const fd = new FormData()
      fd.append('businessNumber',      form.businessNumber)
      fd.append('businessPlaceNumber', form.businessPlaceNumber)
      fd.append('phone',               form.phone)
      fd.append('email',               form.email)
      fd.append('address',             form.address)
      fd.append('memo',                form.memo)
      sitePhotos.forEach((img) => fd.append('sitePhotos', img.file))
      if (businessLicense) fd.append('businessLicensePhoto', businessLicense.file)
      if (signaturePhoto)  fd.append('signaturePhoto',       signaturePhoto.file)

      const res  = await fetch('/api/submit', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '제출 중 오류가 발생했습니다')
      router.push('/complete')
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : '제출 중 오류가 발생했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 렌더 ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* ── 헤더 ── */}
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-snug sm:leading-tight">
            정부지원 에어컨<br className="sm:hidden" /> 신청서 작성
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-2 leading-relaxed">
            아래 정보를 정확히 입력해 주세요.{' '}
            <span className="text-red-500">*</span> 는 필수 항목입니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">

          {/* ── 사업자 정보 ── */}
          <div className={CLS.card}>
            <h2 className={CLS.h2}>
              <span className="w-1.5 h-5 bg-blue-600 rounded-full inline-block flex-shrink-0" />
              사업자 정보
            </h2>
            <div className="space-y-4">
              <div data-error={!!errors.businessNumber}>
                <label className={CLS.label}>
                  사업자등록번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" name="businessNumber" value={form.businessNumber}
                  onChange={handleChange} placeholder="000-00-00000"
                  className={`${CLS.input} ${errors.businessNumber ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                />
                {errors.businessNumber && <p className={CLS.errTxt}>{errors.businessNumber}</p>}
              </div>
              <div data-error={!!errors.businessPlaceNumber}>
                <label className={CLS.label}>
                  사업장관리번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" name="businessPlaceNumber" value={form.businessPlaceNumber}
                  onChange={handleChange} placeholder="사업장관리번호를 입력하세요"
                  className={`${CLS.input} ${errors.businessPlaceNumber ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                />
                {errors.businessPlaceNumber && <p className={CLS.errTxt}>{errors.businessPlaceNumber}</p>}
              </div>
            </div>
          </div>

          {/* ── 연락처 정보 ── */}
          <div className={CLS.card}>
            <h2 className={CLS.h2}>
              <span className="w-1.5 h-5 bg-blue-600 rounded-full inline-block flex-shrink-0" />
              연락처 정보
            </h2>
            <div className="space-y-4">
              <div data-error={!!errors.phone}>
                <label className={CLS.label}>
                  전화번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel" name="phone" value={form.phone}
                  onChange={handleChange} placeholder="010-0000-0000"
                  className={`${CLS.input} ${errors.phone ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                />
                {errors.phone && <p className={CLS.errTxt}>{errors.phone}</p>}
              </div>
              <div data-error={!!errors.email}>
                <label className={CLS.label}>
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email" name="email" value={form.email}
                  onChange={handleChange} placeholder="example@email.com"
                  className={`${CLS.input} ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                />
                {errors.email && <p className={CLS.errTxt}>{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* ── 주소 ── */}
          <div className={CLS.card}>
            <h2 className={CLS.h2}>
              <span className="w-1.5 h-5 bg-blue-600 rounded-full inline-block flex-shrink-0" />
              주소
            </h2>
            <div data-error={!!errors.address}>
              <label className={CLS.label}>
                사업장 주소 <span className="text-red-500">*</span>
              </label>
              <input
                type="text" name="address" value={form.address}
                onChange={handleChange} placeholder="도로명 주소 또는 지번 주소를 입력하세요"
                className={`${CLS.input} ${errors.address ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              />
              {errors.address && <p className={CLS.errTxt}>{errors.address}</p>}
            </div>
          </div>

          {/* ── 추가 메모 ── */}
          <div className={CLS.card}>
            <h2 className={CLS.h2}>
              <span className="w-1.5 h-5 bg-gray-400 rounded-full inline-block flex-shrink-0" />
              추가 메모{' '}
              <span className="text-sm font-normal text-gray-400">(선택)</span>
            </h2>
            <textarea
              name="memo" value={form.memo} onChange={handleChange}
              placeholder="추가로 전달할 내용이 있으면 입력해주세요"
              rows={3}
              className={`${CLS.input} border-gray-300 resize-none`}
            />
          </div>

          {/* ── 현장사진 업로드 (4장) ── */}
          <div
            data-error={!!errors.sitePhotos}
            className={`${CLS.cardErr} ${errors.sitePhotos ? 'border-red-300' : 'border-gray-200'}`}
          >
            <h2 className={`${CLS.h2} flex-wrap`}>
              <span className="w-1.5 h-5 bg-blue-600 rounded-full inline-block flex-shrink-0" />
              현장사진 업로드
              <span className="text-red-500 font-extrabold text-lg sm:text-xl">(4장)</span>
              <span className="text-red-500">*</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-500 mb-4 leading-relaxed">
              현장사진 4장을 모두 업로드해주세요. 4장 미만이면 제출되지 않습니다.
            </p>

            {/* 진행 표시 */}
            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center text-xs sm:text-sm font-bold transition-all flex-shrink-0 ${
                    sitePhotos.length >= n
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 text-gray-400 bg-gray-50'
                  }`}
                >
                  {n}
                </div>
              ))}
              <span className="text-sm sm:text-base ml-1">
                {sitePhotos.length === 4 ? (
                  <span className="text-green-600 font-semibold">4장 완료 ✓</span>
                ) : (
                  <span className="text-gray-500">
                    <span className="font-bold text-blue-600">{sitePhotos.length}</span>/4장
                  </span>
                )}
              </span>
            </div>

            {/* 업로드 영역 */}
            {sitePhotos.length < 4 && (
              <div
                onClick={() => sitePhotosRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 sm:p-6 text-center cursor-pointer transition-all mb-4 ${
                  errors.sitePhotos
                    ? 'border-red-400 bg-red-50 hover:border-red-500'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <svg className="w-8 h-8 sm:w-9 sm:h-9 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <p className="text-sm sm:text-base text-gray-600 font-medium">
                  사진 추가하기 ({sitePhotos.length}/4)
                </p>
                <p className={CLS.hint}>JPG, PNG · 여러 장 동시 선택 가능</p>
              </div>
            )}

            <input
              ref={sitePhotosRef} type="file" accept="image/*"
              multiple onChange={handleSitePhotosSelect} className="hidden"
            />

            {/* 미리보기 그리드 */}
            {sitePhotos.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {sitePhotos.map((img, index) => (
                  <div key={img.id} className="relative group aspect-square">
                    <img
                      src={img.url} alt={`현장사진 ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-gray-200"
                    />
                    <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow">
                      {index + 1}
                    </div>
                    <button
                      type="button" onClick={() => removeSitePhoto(img.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow text-sm leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {sitePhotos.length < 4 &&
                  Array.from({ length: 4 - sitePhotos.length }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      onClick={() => sitePhotosRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all"
                    >
                      <span className="text-gray-300 text-2xl">+</span>
                    </div>
                  ))}
              </div>
            )}

            {errors.sitePhotos && <p className={`${CLS.errTxt} mt-3`}>{errors.sitePhotos}</p>}
          </div>

          {/* ── 사업자등록증 사진 ── */}
          <div
            data-error={!!errors.businessLicense}
            className={`${CLS.cardErr} ${errors.businessLicense ? 'border-red-300' : 'border-gray-200'}`}
          >
            <SingleImageUpload
              label="사업자등록증 사진 업로드" required
              guide="사업자등록증 원본을 평평하게 놓고 촬영해주세요 · JPG, PNG"
              preview={businessLicense}
              error={errors.businessLicense}
              onSelect={handleSingleSelect(setBusinessLicense, 'businessLicense')}
              onRemove={handleSingleRemove(setBusinessLicense, businessLicense)}
            />
          </div>

          {/* ── 서명 사진 ── */}
          <div
            data-error={!!errors.signaturePhoto}
            className={`${CLS.cardErr} ${errors.signaturePhoto ? 'border-red-300' : 'border-gray-200'}`}
          >
            <SingleImageUpload
              label="흰 종이에 서명한 사진 업로드" required
              guide="흰 종이에 서명 후 선명하게 촬영해주세요 · JPG, PNG"
              preview={signaturePhoto}
              error={errors.signaturePhoto}
              onSelect={handleSingleSelect(setSignaturePhoto, 'signaturePhoto')}
              onRemove={handleSingleRemove(setSignaturePhoto, signaturePhoto)}
            />
          </div>

          {/* 오류 메시지 */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm sm:text-base leading-relaxed">
              {submitError}
            </div>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit" disabled={submitting}
            className="w-full bg-blue-600 text-white py-4 sm:py-3.5 rounded-xl font-semibold text-base sm:text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {submitting ? '제출 중...' : '신청서 제출'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6 mb-8 leading-relaxed">
          접수 후 담당자가 순서대로 확인 및 연락드립니다.
        </p>
      </div>
    </div>
  )
}

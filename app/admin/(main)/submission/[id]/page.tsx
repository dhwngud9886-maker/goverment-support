import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import StatusMemoClient from './StatusMemoClient'
import ImageGallery from './ImageGallery'
import SingleImageCard from './SingleImageCard'
import ZipDownloadButton from './ZipDownloadButton'
import DeleteButton from '../../DeleteButton'

const STATUS_COLORS: Record<string, string> = {
  접수완료: 'bg-blue-100 text-blue-800',
  확인중: 'bg-yellow-100 text-yellow-800',
  연락완료: 'bg-orange-100 text-orange-800',
  완료: 'bg-green-100 text-green-800',
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default async function SubmissionDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { images: true },
  })

  if (!submission) notFound()

  // 이미지 타입별 분류 (SITE | LICENSE | SIGNATURE)
  const sitePhotos = submission.images.filter((img) => img.imageType === 'SITE')
  const businessLicenseImage = submission.images.find(
    (img) => img.imageType === 'LICENSE'
  )
  const signatureImage = submission.images.find(
    (img) => img.imageType === 'SIGNATURE'
  )

  const totalImages = submission.images.length

  return (
    <div>
      {/* 뒤로 가기 */}
      <div className="mb-5">
        <Link
          href="/admin/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center gap-1"
        >
          ← 목록으로 돌아가기
        </Link>
      </div>

      {/* 제목 행 */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          신청 #{submission.id}
        </h2>
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            STATUS_COLORS[submission.status] || 'bg-gray-100 text-gray-700'
          }`}
        >
          {submission.status}
        </span>

        {/* 전체 사진 ZIP 다운로드 */}
        {totalImages > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400">사진 {totalImages}장</span>
            <ZipDownloadButton
              submissionId={submission.id}
              label="전체 사진 ZIP 다운로드"
              variant="primary"
            />
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-6">{formatDate(submission.createdAt)}</p>

      {/* 정보 카드 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* 사업자 정보 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            사업자 정보
          </h3>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-gray-500 mb-0.5">사업자등록번호</dt>
              <dd className="font-semibold text-gray-900 text-lg">
                {submission.businessNumber}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 mb-0.5">사업장관리번호</dt>
              <dd className="font-semibold text-gray-900 text-lg">
                {submission.businessPlaceNumber}
              </dd>
            </div>
          </dl>
        </div>

        {/* 연락처 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            연락처
          </h3>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-gray-500 mb-0.5">전화번호</dt>
              <dd className="font-semibold text-gray-900 text-lg">
                {submission.phone}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 mb-0.5">이메일</dt>
              <dd className="font-semibold text-gray-900 text-lg break-all">
                {submission.email}
              </dd>
            </div>
          </dl>
        </div>

        {/* 주소 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            주소
          </h3>
          <p className="font-medium text-gray-900">{submission.address}</p>
        </div>

        {/* 제품 정보 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            제품 정보
          </h3>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-gray-500 mb-0.5">제품 종류</dt>
              <dd className="font-semibold text-gray-900 text-lg">
                {submission.productType ?? <span className="text-gray-400 italic text-sm font-normal">미입력</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 mb-0.5">수량</dt>
              <dd className="font-semibold text-gray-900 text-lg">
                {submission.quantity != null
                  ? `${submission.quantity}대`
                  : <span className="text-gray-400 italic text-sm font-normal">미입력</span>}
              </dd>
            </div>
          </dl>
        </div>

        {/* 신청자 메모 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            신청자 메모
          </h3>
          {submission.memo ? (
            <p className="text-gray-700 whitespace-pre-wrap">{submission.memo}</p>
          ) : (
            <p className="text-gray-400 italic text-sm">메모 없음</p>
          )}
        </div>
      </div>

      {/* ── 첨부 사진 섹션 ── */}
      <div className="space-y-5 mb-5">

        {/* 현장사진 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                현장사진
              </h3>
              {sitePhotos.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                  {sitePhotos.length}장
                </span>
              )}
            </div>
            {/* 현장사진 전체 ZIP 다운로드 */}
            {sitePhotos.length > 0 && (
              <ZipDownloadButton
                submissionId={submission.id}
                label="현장사진 ZIP"
                type="SITE"
                variant="secondary"
              />
            )}
          </div>

          {sitePhotos.length > 0 ? (
            <ImageGallery images={sitePhotos} downloadPrefix="현장사진" />
          ) : (
            <p className="text-gray-400 italic text-sm">업로드된 현장사진 없음</p>
          )}
        </div>

        {/* 사업자등록증 & 서명 — 2열 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SingleImageCard title="사업자등록증 사진" image={businessLicenseImage} />
          <SingleImageCard title="서명 사진" image={signatureImage} />
        </div>
      </div>

      {/* 상태 관리 & 관리자 메모 */}
      <StatusMemoClient
        submissionId={submission.id}
        currentStatus={submission.status}
        currentAdminMemo={submission.adminMemo || ''}
      />

      {/* 위험 구역 — 삭제 */}
      <div className="mt-6 border border-red-200 rounded-xl p-5 bg-red-50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-red-700 mb-1">위험 구역</h3>
            <p className="text-xs text-red-500">
              삭제하면 이 신청 건의 모든 데이터와 첨부 사진이 영구적으로
              제거됩니다. 복구할 수 없습니다.
            </p>
          </div>
          <DeleteButton
            submissionId={submission.id}
            afterDelete="/admin/dashboard"
            size="md"
          />
        </div>
      </div>
    </div>
  )
}

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import SearchBar from './SearchBar'
import DeleteButton from '../DeleteButton'

const STATUS_OPTIONS = ['전체', '접수완료', '확인중', '연락완료', '완료']

const STATUS_COLORS: Record<string, string> = {
  접수완료: 'bg-blue-100 text-blue-800',
  확인중: 'bg-yellow-100 text-yellow-800',
  연락완료: 'bg-orange-100 text-orange-800',
  완료: 'bg-green-100 text-green-800',
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string }
}) {
  const status =
    typeof searchParams.status === 'string' ? searchParams.status : undefined
  const search =
    typeof searchParams.search === 'string' ? searchParams.search : undefined

  const where: {
    status?: string
    OR?: Array<{ [key: string]: { contains: string } }>
  } = {}

  if (status && status !== '전체') {
    where.status = status
  }
  if (search) {
    where.OR = [
      { businessNumber: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
    ]
  }

  const submissions = await prisma.submission.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { images: { take: 1 } },
  })

  const activeStatus = status || '전체'

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">신청 목록</h2>
          <p className="text-gray-500 text-sm mt-1">
            {search || (status && status !== '전체')
              ? `검색 결과: ${submissions.length}건`
              : `전체 ${submissions.length}건`}
          </p>
        </div>
      </div>

      {/* 필터 & 검색 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          {/* 상태 필터 */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((s) => (
              <Link
                key={s}
                href={`/admin/dashboard?status=${s}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  activeStatus === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </Link>
            ))}
          </div>

          {/* 검색 */}
          <div className="ml-auto">
            <SearchBar defaultSearch={search} defaultStatus={status} />
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {submissions.length === 0 ? (
          <div className="py-20 text-center text-gray-500">
            <svg
              className="w-12 h-12 text-gray-300 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            신청 내역이 없습니다
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    No.
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    사업자등록번호
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    전화번호
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    이메일
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    접수일시
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    사진
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submissions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-4 text-sm text-gray-400">
                      #{sub.id}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">
                      {sub.businessNumber}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">
                      {sub.phone}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">
                      {sub.email}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          STATUS_COLORS[sub.status] ||
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(sub.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      {sub.images.length > 0 ? (
                        <img
                          src={sub.images[0].imageUrl}
                          alt="썸네일"
                          className="w-10 h-10 object-cover rounded-lg border border-gray-200"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">없음</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/submission/${sub.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                        >
                          보기 →
                        </Link>
                        <span className="text-gray-300">|</span>
                        <DeleteButton
                          submissionId={sub.id}
                          afterDelete="refresh"
                          size="sm"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

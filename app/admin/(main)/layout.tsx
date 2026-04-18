import Link from 'next/link'
import LogoutButton from './LogoutButton'

export default function AdminMainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/admin/dashboard"
            className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors"
          >
            신청 관리 시스템
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}

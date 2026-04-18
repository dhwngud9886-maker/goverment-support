import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '신청 접수 시스템',
  description: '신청 정보 수집 및 관리 시스템',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}

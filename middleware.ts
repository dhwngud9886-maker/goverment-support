import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const session = request.cookies.get('admin_session')
  const isValidSession = session?.value === process.env.ADMIN_SESSION_TOKEN

  if (!isValidSession) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // /admin/dashboard, /admin/submission/... 등에만 적용
  // /admin 로그인 페이지, /uploads/, /api/ 는 제외
  matcher: ['/admin/:path+'],
}

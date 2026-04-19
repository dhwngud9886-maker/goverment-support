import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

const CTX = 'api/admin/login'

// ── 서버 시작 시 필수 환경변수 검증 ──────────────────────────
const ADMIN_PASSWORD      = process.env.ADMIN_PASSWORD
const ADMIN_SESSION_TOKEN = process.env.ADMIN_SESSION_TOKEN

if (!ADMIN_PASSWORD) {
  logger.error(CTX, '환경변수 ADMIN_PASSWORD 가 설정되지 않았습니다. .env 파일을 확인하세요.')
}
if (!ADMIN_SESSION_TOKEN) {
  logger.error(CTX, '환경변수 ADMIN_SESSION_TOKEN 이 설정되지 않았습니다. .env 파일을 확인하세요.')
}

if (ADMIN_PASSWORD === 'change-this-password') {
  logger.warn(CTX, '⚠️  ADMIN_PASSWORD 가 기본값입니다. 반드시 변경하세요.')
}
if (ADMIN_SESSION_TOKEN === 'change-this-to-a-random-secret-string') {
  logger.warn(CTX, '⚠️  ADMIN_SESSION_TOKEN 이 기본값입니다. 반드시 변경하세요.')
}

/**
 * 실제 요청이 HTTPS 인지 판단한다.
 *
 * ┌─ 판단 순서 ──────────────────────────────────────────────┐
 * │ 1. X-Forwarded-Proto: https  → Nginx 등 프록시 뒤에서    │
 * │    HTTPS 요청이 들어온 경우 (권장 운영 구성)              │
 * │ 2. request.nextUrl.protocol === 'https:'                 │
 * │    → 직접 HTTPS 포트로 접속한 경우                        │
 * │                                                          │
 * │ HTTP로 직접 접속(개발·초기 배포) → false → secure: false  │
 * │ HTTPS(Nginx 프록시 또는 직접) → true → secure: true      │
 * └──────────────────────────────────────────────────────────┘
 */
function isHttpsRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto')
  if (forwardedProto) {
    // Nginx 가 여러 프록시를 거쳐 온 경우 "https, http" 형태일 수 있음
    return forwardedProto.split(',')[0].trim() === 'https'
  }
  return request.nextUrl.protocol === 'https:'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { error: '비밀번호를 입력해주세요' },
        { status: 400 }
      )
    }

    // 필수 환경변수 미설정 시 로그인 차단
    if (!ADMIN_PASSWORD || !ADMIN_SESSION_TOKEN) {
      logger.error(CTX, '필수 환경변수 미설정으로 로그인 처리 불가')
      return NextResponse.json(
        { error: '서버 설정 오류입니다. 관리자에게 문의하세요.' },
        { status: 500 }
      )
    }

    if (password !== ADMIN_PASSWORD) {
      logger.warn(CTX, '관리자 로그인 실패 - 비밀번호 불일치', {
        ip: request.headers.get('x-forwarded-for') ?? request.ip ?? 'unknown',
      })
      return NextResponse.json(
        { error: '비밀번호가 올바르지 않습니다' },
        { status: 401 }
      )
    }

    // ── 쿠키 secure 플래그: 실제 연결 방식으로 판단 ──────────
    // NODE_ENV=production 이어도 HTTP 접속이면 false
    // → HTTP 배포 테스트 환경에서도 쿠키가 정상 저장됨
    // HTTPS(Nginx 프록시 포함) 접속이면 true
    // → 운영 환경에서 보안 유지
    const secure = isHttpsRequest(request)

    logger.info(CTX, '관리자 로그인 성공', {
      ip: request.headers.get('x-forwarded-for') ?? request.ip ?? 'unknown',
      secure,  // 쿠키 secure 여부를 로그로 확인 가능
    })

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_session', ADMIN_SESSION_TOKEN, {
      httpOnly: true,           // JS에서 document.cookie 로 접근 불가 (XSS 방어)
      secure,                   // HTTPS 연결일 때만 true
      sameSite: 'lax',          // CSRF 방어 + 일반 탐색 허용
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: '/',
    })

    return response
  } catch (error) {
    logger.error(CTX, '로그인 처리 중 예외 발생', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

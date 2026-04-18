import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

const CTX = 'api/admin/login'

// ── 서버 시작 시 필수 환경변수 검증 ──────────────────────────
// 운영 환경에서 설정 누락 시 즉시 발견할 수 있도록 모듈 로드 시점에 검사
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD
const ADMIN_SESSION_TOKEN = process.env.ADMIN_SESSION_TOKEN

if (!ADMIN_PASSWORD) {
  logger.error(CTX, '환경변수 ADMIN_PASSWORD 가 설정되지 않았습니다. .env 파일을 확인하세요.')
}
if (!ADMIN_SESSION_TOKEN) {
  logger.error(CTX, '환경변수 ADMIN_SESSION_TOKEN 이 설정되지 않았습니다. .env 파일을 확인하세요.')
}

// 기본값(예시값) 그대로 사용하는 경우 경고
if (ADMIN_PASSWORD === 'change-this-password') {
  logger.warn(CTX, '⚠️  ADMIN_PASSWORD 가 기본값입니다. 반드시 변경하세요.')
}
if (ADMIN_SESSION_TOKEN === 'change-this-to-a-random-secret-string') {
  logger.warn(CTX, '⚠️  ADMIN_SESSION_TOKEN 이 기본값입니다. 반드시 변경하세요.')
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
      // 실패 로그 (비밀번호는 절대 로그에 남기지 않음)
      logger.warn(CTX, '관리자 로그인 실패 - 비밀번호 불일치', {
        ip: request.headers.get('x-forwarded-for') ?? 'unknown',
      })
      return NextResponse.json(
        { error: '비밀번호가 올바르지 않습니다' },
        { status: 401 }
      )
    }

    logger.info(CTX, '관리자 로그인 성공', {
      ip: request.headers.get('x-forwarded-for') ?? 'unknown',
    })

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_session', ADMIN_SESSION_TOKEN, {
      httpOnly: true,                                        // JS 접근 차단
      secure: process.env.NODE_ENV === 'production',        // HTTPS 전용 (운영)
      sameSite: 'lax',                                       // CSRF 방어
      maxAge: 60 * 60 * 24 * 7,                            // 7일
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

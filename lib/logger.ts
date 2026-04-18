/**
 * 구조화된 서버 로거
 * - 개발 환경: 상세 스택 트레이스 출력
 * - 운영 환경: 타임스탬프 + 에러 메시지 (스택 생략)
 */

type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  context: string
  message: string
  data?: Record<string, unknown>
  error?: string
  stack?: string
}

const isProd = process.env.NODE_ENV === 'production'

function formatEntry(entry: LogEntry): string {
  const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}] ${entry.message}`
  if (entry.data) {
    return `${base} ${JSON.stringify(entry.data)}`
  }
  return base
}

function buildEntry(
  level: LogLevel,
  context: string,
  message: string,
  extra?: { data?: Record<string, unknown>; error?: unknown }
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
  }

  if (extra?.data) entry.data = extra.data

  if (extra?.error instanceof Error) {
    entry.error = extra.error.message
    // 운영 환경에서는 스택을 콘솔에만 출력하고 외부 노출은 하지 않음
    if (!isProd) entry.stack = extra.error.stack
  } else if (extra?.error !== undefined) {
    entry.error = String(extra.error)
  }

  return entry
}

export const logger = {
  info(context: string, message: string, data?: Record<string, unknown>) {
    const entry = buildEntry('info', context, message, { data })
    console.log(formatEntry(entry))
  },

  warn(context: string, message: string, data?: Record<string, unknown>) {
    const entry = buildEntry('warn', context, message, { data })
    console.warn(formatEntry(entry))
  },

  error(context: string, message: string, error?: unknown, data?: Record<string, unknown>) {
    const entry = buildEntry('error', context, message, { data, error })
    const formatted = formatEntry(entry)

    if (entry.error) {
      console.error(`${formatted} | error="${entry.error}"`)
    } else {
      console.error(formatted)
    }

    // 개발 환경에서는 스택 트레이스도 출력
    if (!isProd && error instanceof Error && error.stack) {
      console.error(error.stack)
    }
  },
}

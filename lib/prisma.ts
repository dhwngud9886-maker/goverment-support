import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const isProd = process.env.NODE_ENV === 'production'

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd
      ? // 운영: 경고·에러만 기록
        [
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' },
        ]
      : // 개발: 쿼리·정보·경고·에러 모두 기록
        [
          { emit: 'stdout', level: 'query' },
          { emit: 'stdout', level: 'info' },
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' },
        ],
  })

// 개발 환경에서만 글로벌 캐시 (Hot Reload 시 중복 인스턴스 방지)
if (!isProd) globalForPrisma.prisma = prisma

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Server Actions 파일 크기 제한 (현장사진 4장 등 대용량 업로드 대응) ──
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },

  // ── 보안 HTTP 헤더 ──────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // 클릭재킹 방지
          { key: 'X-Frame-Options', value: 'DENY' },
          // MIME 타입 스니핑 방지
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Referrer 정보 제한
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // XSS 보호 (구형 브라우저 대응)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // 권한 정책
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      // /uploads/:path* 의 Cache-Control 헤더는
      // app/uploads/[...path]/route.ts 라우트 핸들러에서 직접 설정한다.
    ]
  },
}

export default nextConfig

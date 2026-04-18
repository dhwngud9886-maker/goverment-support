/**
 * PM2 ecosystem 설정 파일
 *
 * 사용법:
 *   pm2 start ecosystem.config.js          # 시작
 *   pm2 restart ecosystem.config.js        # 재시작
 *   pm2 stop ecosystem.config.js           # 중지
 *   pm2 delete ecosystem.config.js         # 프로세스 삭제
 *   pm2 save                               # 현재 프로세스 목록 저장
 *   pm2 startup                            # 서버 재부팅 시 자동 시작 등록
 *   pm2 logs government-support            # 로그 실시간 확인
 *   pm2 monit                              # 대시보드
 */

module.exports = {
  apps: [
    {
      // ── 기본 정보 ────────────────────────────────────────────
      name: 'government-support',
      script: 'node_modules/.bin/next',
      args: 'start',

      // 앱 실행 디렉터리
      // 운영 서버 배포 시 절대경로로 변경하세요:
      // cwd: '/var/www/government-support',
      cwd: './',

      // ── 인스턴스 설정 ────────────────────────────────────────
      // SQLite는 단일 프로세스만 지원 → instances: 1 고정
      // cluster 모드 절대 사용 금지 (DB 잠금 충돌 발생)
      instances: 1,
      exec_mode: 'fork',

      // ── 재시작 정책 ──────────────────────────────────────────
      autorestart: true,
      watch: false,              // 운영 환경에서는 OFF (파일 변경 감지 불필요)
      max_memory_restart: '512M', // 메모리 512MB 초과 시 자동 재시작

      // ── 환경변수 ─────────────────────────────────────────────
      // Next.js가 프로젝트 루트의 .env 파일을 자동으로 읽음
      // 여기서는 NODE_ENV와 PORT만 명시
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // ── 로그 설정 ────────────────────────────────────────────
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // 로그 로테이션 (pm2-logrotate 설치 시 적용)
      // pm2 install pm2-logrotate
      // pm2 set pm2-logrotate:max_size 10M
      // pm2 set pm2-logrotate:retain 7

      // ── 재시작 딜레이 ────────────────────────────────────────
      restart_delay: 3000,        // 연속 크래시 시 3초 후 재시작

      // ── 크래시 감지 ──────────────────────────────────────────
      min_uptime: '10s',          // 10초 미만 실행 시 크래시로 간주
      max_restarts: 10,           // 최대 10회 재시작 후 중단

      // ── 종료 설정 ────────────────────────────────────────────
      kill_timeout: 5000,         // 5초 내 종료 안 되면 강제 종료

      // ── 시작 전 스크립트 ─────────────────────────────────────
      // 업로드 디렉터리가 없으면 자동 생성
      // PM2 pre_start_script 는 지원하지 않으므로 args 로 처리하거나
      // 별도 init 스크립트 실행 필요
      // 대신 배포 시 수동으로 실행:
      //   mkdir -p public/uploads/{site,license,signature}
      //   chmod -R 755 public/uploads
    },
  ],

  // ── 배포 설정 (선택 - git 기반 자동 배포 시) ─────────────────
  // pm2 deploy ecosystem.config.js production
  deploy: {
    production: {
      user: 'ubuntu',
      host: '서버IP를-여기에-입력',
      ref: 'origin/main',
      repo: 'https://github.com/사용자명/저장소명.git',
      path: '/var/www/government-support',
      'pre-deploy-local': '',
      'post-deploy':
        'npm install && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save',
      'pre-setup': '',
    },
  },
}

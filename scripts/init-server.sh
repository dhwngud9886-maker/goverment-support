#!/bin/bash
# =============================================================
# 서버 최초 초기화 스크립트
# Ubuntu 서버에 처음 배포할 때 한 번만 실행합니다.
#
# 사용법:
#   chmod +x scripts/init-server.sh
#   ./scripts/init-server.sh
# =============================================================

set -e  # 오류 발생 시 즉시 종료

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "=========================================="
echo "  정부지원 시스템 서버 초기화"
echo "  경로: $APP_DIR"
echo "=========================================="

# ── 1. .env 파일 확인 ──────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  echo ""
  echo "[오류] .env 파일이 없습니다."
  echo "  cp $APP_DIR/.env.example $APP_DIR/.env"
  echo "  위 명령 실행 후 .env 파일을 편집한 뒤 다시 실행하세요."
  exit 1
fi

# ADMIN_PASSWORD, ADMIN_SESSION_TOKEN 기본값 감지
if grep -q "change-this-password" "$APP_DIR/.env" || \
   grep -q "change-this-to-a-random-secret-string" "$APP_DIR/.env"; then
  echo ""
  echo "[경고] .env 파일의 기본값을 변경하지 않았습니다."
  echo "  ADMIN_PASSWORD, ADMIN_SESSION_TOKEN 을 반드시 변경하세요."
  echo "  세션 토큰 생성: openssl rand -hex 32"
  echo ""
  read -p "그래도 계속 진행하시겠습니까? (y/N): " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "초기화 취소."
    exit 1
  fi
fi

echo ""
echo "[1/6] 업로드 디렉터리 생성..."
mkdir -p "$APP_DIR/public/uploads/site"
mkdir -p "$APP_DIR/public/uploads/license"
mkdir -p "$APP_DIR/public/uploads/signature"
chmod -R 755 "$APP_DIR/public/uploads"
echo "      OK: public/uploads/{site,license,signature}"

echo ""
echo "[2/6] 로그 디렉터리 생성..."
mkdir -p "$APP_DIR/logs"
echo "      OK: logs/"

echo ""
echo "[3/6] 백업 디렉터리 생성..."
mkdir -p "$APP_DIR/backups"
echo "      OK: backups/"

echo ""
echo "[4/6] npm install..."
cd "$APP_DIR"
npm install
echo "      OK"

echo ""
echo "[5/6] DB 초기화 (prisma db push)..."
npm run setup
echo "      OK"

echo ""
echo "[6/6] 프로덕션 빌드..."
npm run build
echo "      OK"

echo ""
echo "=========================================="
echo "  초기화 완료!"
echo "=========================================="
echo ""
echo "다음 명령으로 앱을 시작하세요:"
echo ""
echo "  pm2 start ecosystem.config.js"
echo "  pm2 save"
echo "  pm2 startup   (출력된 명령 실행)"
echo ""
echo "접속 확인: http://서버IP:3000"
echo ""

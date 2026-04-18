#!/bin/bash
# =============================================================
# 정부지원 에어컨 신청 관리 시스템 - 백업 스크립트 (Linux/Ubuntu)
# =============================================================
# 사용법:
#   chmod +x scripts/backup.sh        # 최초 1회만 실행
#   ./scripts/backup.sh               # 수동 백업
#
# cron 자동 백업 등록 예시 (매일 새벽 3시):
#   crontab -e
#   0 3 * * * /var/www/government-support/scripts/backup.sh >> /var/log/gov-backup.log 2>&1
# =============================================================

set -euo pipefail

# ── 설정 ──────────────────────────────────────────────────────
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="backup_${DATE}"
KEEP_DAYS=30    # 30일 이상 된 백업 자동 삭제

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 백업 시작: ${BACKUP_NAME}"

# ── 백업 디렉터리 생성 ────────────────────────────────────────
mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"

# ── SQLite DB 백업 ────────────────────────────────────────────
# .env 에서 DATABASE_URL 읽어 DB 경로 파악
DB_FILE=""
if [ -f "${PROJECT_DIR}/.env" ]; then
  # DATABASE_URL="file:/절대경로/db파일" 또는 "file:./상대경로" 파싱
  RAW_URL=$(grep -E '^DATABASE_URL=' "${PROJECT_DIR}/.env" | head -1 | cut -d'"' -f2)
  DB_PATH="${RAW_URL#file:}"   # "file:" 제거
  if [[ "$DB_PATH" == /* ]]; then
    DB_FILE="$DB_PATH"         # 절대경로
  else
    DB_FILE="${PROJECT_DIR}/${DB_PATH#./}"  # 상대경로 → 절대경로
  fi
fi

# fallback: prisma/production.db → prisma/dev.db 순으로 탐색
if [ -z "$DB_FILE" ] || [ ! -f "$DB_FILE" ]; then
  if [ -f "${PROJECT_DIR}/prisma/production.db" ]; then
    DB_FILE="${PROJECT_DIR}/prisma/production.db"
  elif [ -f "${PROJECT_DIR}/prisma/dev.db" ]; then
    DB_FILE="${PROJECT_DIR}/prisma/dev.db"
  elif [ -f "${PROJECT_DIR}/dev.db" ]; then
    DB_FILE="${PROJECT_DIR}/dev.db"
  fi
fi

if [ -n "$DB_FILE" ] && [ -f "$DB_FILE" ]; then
  if command -v sqlite3 &>/dev/null; then
    # SQLite Online Backup API: 쓰기 중에도 안전하게 백업
    sqlite3 "${DB_FILE}" ".backup '${BACKUP_DIR}/${BACKUP_NAME}/database.db'"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] DB 백업 완료 (sqlite3 online backup): ${DB_FILE}"
  else
    cp "${DB_FILE}" "${BACKUP_DIR}/${BACKUP_NAME}/database.db"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] DB 백업 완료 (cp): ${DB_FILE}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 권장: sudo apt install sqlite3 (안전한 백업 도구)"
  fi
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 경고: DB 파일을 찾을 수 없습니다."
fi

# ── 업로드 파일 백업 ──────────────────────────────────────────
UPLOADS_DIR="${PROJECT_DIR}/public/uploads"
if [ -d "${UPLOADS_DIR}" ]; then
  cp -r "${UPLOADS_DIR}" "${BACKUP_DIR}/${BACKUP_NAME}/uploads"
  UPLOAD_COUNT=$(find "${UPLOADS_DIR}" -type f ! -name '.gitkeep' | wc -l)
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 업로드 파일 백업 완료 (${UPLOAD_COUNT}개)"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 경고: uploads 폴더가 없습니다: ${UPLOADS_DIR}"
fi

# ── .env 파일 백업 (선택) ─────────────────────────────────────
if [ -f "${PROJECT_DIR}/.env" ]; then
  cp "${PROJECT_DIR}/.env" "${BACKUP_DIR}/${BACKUP_NAME}/.env.backup"
  chmod 600 "${BACKUP_DIR}/${BACKUP_NAME}/.env.backup"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] .env 백업 완료"
fi

# ── 압축 ─────────────────────────────────────────────────────
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}/"
rm -rf "${BACKUP_NAME}/"

ARCHIVE_SIZE=$(du -sh "${BACKUP_NAME}.tar.gz" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 압축 완료: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz (${ARCHIVE_SIZE})"

# ── 오래된 백업 정리 ──────────────────────────────────────────
DELETED=$(find "${BACKUP_DIR}" -name "backup_*.tar.gz" -mtime +${KEEP_DAYS} -print -delete | wc -l)
if [ "${DELETED}" -gt 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 오래된 백업 ${DELETED}개 삭제 (${KEEP_DAYS}일 초과)"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 백업 완료"

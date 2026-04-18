# 정부지원 에어컨 신청 관리 시스템 — 배포·운영 가이드

> **환경**: Ubuntu 22.04 LTS / Node.js self-hosting / 서버 1대  
> **스택**: Next.js 14 · Prisma · SQLite · PM2 · Nginx · Certbot

---

## 목차

1. [서버 준비 (Ubuntu 초기 설정)](#1-서버-준비)
2. [Node.js · PM2 · Nginx 설치](#2-nodejs--pm2--nginx-설치)
3. [프로젝트 업로드](#3-프로젝트-업로드)
4. [환경변수 설정 (.env)](#4-환경변수-설정)
5. [DB 초기화 · 빌드 · 실행](#5-db-초기화--빌드--실행)
6. [PM2로 운영하기](#6-pm2로-운영하기)
7. [서버 재부팅 시 자동 시작](#7-서버-재부팅-시-자동-시작)
8. [Nginx 리버스 프록시 설정](#8-nginx-리버스-프록시-설정)
9. [도메인 연결](#9-도메인-연결)
10. [HTTPS 인증서 발급 (Certbot)](#10-https-인증서-발급-certbot)
11. [SQLite · 업로드 파일 유지 방법](#11-sqlite--업로드-파일-유지-방법)
12. [백업 방법](#12-백업-방법)
13. [업데이트 · 재배포 절차](#13-업데이트--재배포-절차)
14. [운영 전 배포 체크리스트](#14-운영-전-배포-체크리스트)
15. [로그 확인 · 문제 해결](#15-로그-확인--문제-해결)
16. [빠른 참조 (치트시트)](#16-빠른-참조-치트시트)

---

## 1. 서버 준비

### 1-1. 서버 접속 및 시스템 업데이트

```bash
# 서버에 SSH 접속
ssh ubuntu@서버IP

# 패키지 목록 갱신 및 업그레이드
sudo apt update && sudo apt upgrade -y

# 필수 유틸리티 설치
sudo apt install -y curl git unzip tar
```

### 1-2. 방화벽 설정

```bash
# UFW 방화벽 활성화
sudo ufw enable

# SSH (22), HTTP (80), HTTPS (443) 허용
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# 상태 확인
sudo ufw status
```

> ⚠️ 포트 3000(Next.js)은 외부에 직접 열지 않습니다.  
> Nginx가 80/443을 받아 3000으로 전달합니다.

### 1-3. 앱 전용 디렉터리 생성

```bash
# 앱을 /var/www/government-support 에 설치
sudo mkdir -p /var/www/government-support
sudo chown $USER:$USER /var/www/government-support
```

---

## 2. Node.js · PM2 · Nginx 설치

### 2-1. Node.js 20 LTS 설치

```bash
# NodeSource 저장소 추가
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js 설치
sudo apt install -y nodejs

# 버전 확인
node -v   # v20.x.x
npm -v    # 10.x.x
```

### 2-2. PM2 설치

```bash
# 전역 설치
sudo npm install -g pm2

# 버전 확인
pm2 -v
```

### 2-3. Nginx 설치

```bash
sudo apt install -y nginx

# 부팅 시 자동 시작 등록
sudo systemctl enable nginx
sudo systemctl start nginx

# 상태 확인
sudo systemctl status nginx
```

---

## 3. 프로젝트 업로드

### 방법 A — Git 사용 (권장)

```bash
cd /var/www/government-support

# 저장소 클론 (저장소가 있는 경우)
git clone https://github.com/사용자명/저장소명.git .
```

### 방법 B — SCP로 직접 업로드

```bash
# 로컬 PC에서 실행 (Windows는 Git Bash 또는 PowerShell)
# 주의: node_modules, .next, prisma/dev.db 는 제외하고 업로드

scp -r ./정부지원/* ubuntu@서버IP:/var/www/government-support/

# rsync 사용 시 (더 빠르고 안정적)
rsync -avz --exclude='node_modules' --exclude='.next' \
  --exclude='prisma/dev.db' --exclude='public/uploads' \
  ./정부지원/ ubuntu@서버IP:/var/www/government-support/
```

### 업로드 후 확인

```bash
cd /var/www/government-support
ls -la
# 아래 파일들이 있어야 합니다:
# package.json  next.config.mjs  ecosystem.config.js
# prisma/       app/  lib/  public/  scripts/
```

---

## 4. 환경변수 설정

```bash
cd /var/www/government-support

# .env.example 복사
cp .env.example .env

# 편집
nano .env
```

### .env 설정값 (반드시 변경)

```env
# 데이터베이스 — 절대경로 사용 권장
DATABASE_URL="file:/var/www/government-support/prisma/production.db"

# 관리자 비밀번호 — 반드시 강력한 값으로 변경
ADMIN_PASSWORD=여기에-강력한-비밀번호-입력

# 세션 토큰 — 아래 명령으로 생성한 값 입력
# openssl rand -hex 32
ADMIN_SESSION_TOKEN=생성된-64자리-랜덤-문자열

# 실행 환경
NODE_ENV=production

# 포트 (기본 3000)
PORT=3000
```

### 세션 토큰 생성

```bash
openssl rand -hex 32
# 출력 예: a1b2c3d4e5f6...  (64자리)
# 이 값을 ADMIN_SESSION_TOKEN 에 붙여넣기
```

### .env 파일 권한 보호

```bash
# 소유자만 읽기 가능하도록 설정
chmod 600 .env
```

---

## 5. DB 초기화 · 빌드 · 실행

아래 명령을 순서대로 실행합니다.

```bash
cd /var/www/government-support

# ① 의존성 설치 (postinstall 에서 prisma generate 자동 실행)
npm install

# ② 업로드 디렉터리 미리 생성
#    (런타임 자동 생성되지만, 서버 시작 전 미리 만들어 두면 더 안정적)
mkdir -p public/uploads/site
mkdir -p public/uploads/license
mkdir -p public/uploads/signature
chmod -R 755 public/uploads

# ③ 로그 디렉터리 생성
mkdir -p logs

# ④ DB 테이블 생성 (최초 1회)
npm run setup

# ⑤ 프로덕션 빌드
npm run build

# ⑥ 테스트 실행 (확인 후 Ctrl+C로 종료)
npm run start
# → http://서버IP:3000 에서 동작 확인
```

> ℹ️ `npm run setup` 은 `prisma generate && prisma db push` 를 실행합니다.  
> DB 파일은 `.env`의 `DATABASE_URL` 경로에 생성됩니다.

---

## 6. PM2로 운영하기

```bash
cd /var/www/government-support

# PM2로 앱 시작
pm2 start ecosystem.config.js

# 상태 확인
pm2 status
pm2 list
```

정상 실행 시 아래처럼 표시됩니다:

```
┌────┬──────────────────────┬──────────┬───────┬───────────┬──────────┐
│ id │ name                 │ mode     │ ↺     │ status    │ cpu      │
├────┼──────────────────────┼──────────┼───────┼───────────┼──────────┤
│ 0  │ government-support   │ fork     │ 0     │ online    │ 0%       │
└────┴──────────────────────┴──────────┴───────┴───────────┴──────────┘
```

### PM2 주요 명령

```bash
pm2 start ecosystem.config.js          # 시작
pm2 stop government-support            # 중지
pm2 restart government-support         # 재시작 (코드 업데이트 후)
pm2 delete government-support          # 프로세스 삭제
pm2 logs government-support            # 실시간 로그
pm2 logs government-support --lines 200 # 최근 200줄
pm2 monit                              # CPU/메모리 대시보드
```

---

## 7. 서버 재부팅 시 자동 시작

```bash
# ① 현재 실행 중인 PM2 프로세스 목록 저장
pm2 save

# ② 재부팅 시 자동 시작 스크립트 등록
pm2 startup
```

`pm2 startup` 실행 후 아래와 같은 명령이 출력됩니다:

```
[PM2] To setup the Startup Script, copy/paste the following command:
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

**출력된 `sudo env ...` 명령을 그대로 복사하여 실행**하세요.

```bash
# 예시 (실제 출력 명령을 사용하세요)
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu

# ③ 저장 재확인
pm2 save

# ④ 재부팅 테스트
sudo reboot
# 재접속 후: pm2 status 로 자동 실행 확인
```

---

## 8. Nginx 리버스 프록시 설정

```bash
# 설정 파일 생성
sudo nano /etc/nginx/sites-available/government-support
```

아래 내용을 붙여넣으세요 (`도메인.com` 을 실제 도메인으로 변경):

```nginx
server {
    listen 80;
    server_name 도메인.com www.도메인.com;

    # 업로드 최대 크기 (현장사진 4장 + 사업자등록증 + 서명 고려)
    client_max_body_size 50M;

    # 연결 유지 설정 (모바일 환경 대응)
    keepalive_timeout 65;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 타임아웃 (파일 업로드 대비)
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

```bash
# 사이트 활성화
sudo ln -s /etc/nginx/sites-available/government-support \
           /etc/nginx/sites-enabled/

# 기본 사이트 비활성화 (선택)
sudo rm -f /etc/nginx/sites-enabled/default

# 설정 문법 검사
sudo nginx -t

# 적용
sudo systemctl reload nginx
```

---

## 9. 도메인 연결

### DNS A 레코드 설정

도메인 등록 업체(가비아, 카페24, Cloudflare 등)의 DNS 관리 페이지에서 설정합니다.

| 레코드 타입 | 호스트 | 값 | TTL |
|------------|-------|-----|-----|
| A | `@` (루트) | 서버IP | 300 |
| A | `www` | 서버IP | 300 |

예시 (가비아 DNS 설정):
```
타입: A
호스트: @
IP: 123.456.789.0   ← 실제 서버 IP 입력
```

DNS 전파 확인 (수분 ~ 수십 분 소요):

```bash
# 서버에서 확인
nslookup 도메인.com
dig 도메인.com +short

# 외부에서 확인
# https://dnschecker.org 에서 도메인 입력
```

---

## 10. HTTPS 인증서 발급 (Certbot)

### 전제조건
- 도메인 DNS가 서버 IP로 연결된 상태
- Nginx가 실행 중인 상태

```bash
# Certbot + Nginx 플러그인 설치
sudo apt install -y certbot python3-certbot-nginx

# 인증서 발급 (도메인을 실제 값으로 변경)
sudo certbot --nginx -d 도메인.com -d www.도메인.com
```

발급 중 이메일 입력 및 약관 동의 후 성공하면:

```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/도메인.com/fullchain.pem
...
```

Certbot이 Nginx 설정을 자동으로 수정하여 HTTPS가 활성화됩니다.  
이후 `/etc/nginx/sites-available/government-support` 를 열면 다음과 같이 변경되어 있습니다:

```nginx
server {
    listen 80;
    server_name 도메인.com www.도메인.com;
    return 301 https://$host$request_uri;   # HTTP → HTTPS 리다이렉트
}

server {
    listen 443 ssl;
    server_name 도메인.com www.도메인.com;

    ssl_certificate     /etc/letsencrypt/live/도메인.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/도메인.com/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        # ... (나머지 설정 동일)
    }
}
```

### 인증서 자동 갱신 확인

Let's Encrypt 인증서는 90일 유효합니다. Certbot이 자동 갱신을 설정합니다.

```bash
# 자동 갱신 테스트
sudo certbot renew --dry-run

# 자동 갱신 타이머 확인
sudo systemctl status certbot.timer
```

---

## 11. SQLite · 업로드 파일 유지 방법

### 데이터 파일 위치

| 항목 | 경로 | 설명 |
|------|------|------|
| DB | `/var/www/government-support/prisma/production.db` | 모든 신청 데이터 |
| 업로드 이미지 | `/var/www/government-support/public/uploads/` | 현장사진·사업자등록증·서명 |

### 주의사항 — 코드 업데이트 시

```bash
# ✅ 안전한 방법 (rsync 사용 시)
rsync -avz --exclude='node_modules' --exclude='.next' \
  --exclude='prisma/*.db' --exclude='public/uploads' \
  ./정부지원/ ubuntu@서버IP:/var/www/government-support/

# ❌ 절대 하지 말 것
# rm -rf /var/www/government-support/public/uploads   → 업로드 파일 전체 삭제
# rm /var/www/government-support/prisma/production.db → 신청 데이터 전체 삭제
```

### 업로드 디렉터리 권한 확인

```bash
# 디렉터리 존재 및 권한 확인
ls -la /var/www/government-support/public/uploads/

# 권한 수정 (Node.js 프로세스가 쓸 수 있어야 함)
chmod -R 755 /var/www/government-support/public/uploads/
```

### git pull 사용 시 주의

```bash
# .gitignore에 의해 public/uploads/* 와 prisma/*.db 는 git 관리에서 제외됨
# git pull 을 해도 이 파일들은 절대 삭제되지 않음
# 단, git clean -fdX 는 절대 실행하지 말 것 (gitignore 항목 전부 삭제됨)

git pull origin main   # ← 안전
# git clean -fdX       # ← 절대 금지
```

---

## 12. 백업 방법

### 백업 대상

| 파일 | 중요도 | 위치 |
|------|--------|------|
| `prisma/production.db` | ★★★ 필수 | 모든 신청 데이터 |
| `public/uploads/` | ★★★ 필수 | 업로드된 사진 전체 |
| `.env` | ★★ 중요 | 비밀번호·토큰 |

### 수동 백업

```bash
cd /var/www/government-support
./scripts/backup.sh
```

백업 파일은 `backups/backup_YYYYMMDD_HHMMSS.tar.gz` 로 저장됩니다.

### 자동 백업 — cron 등록 (매일 새벽 3시)

```bash
crontab -e
```

아래 내용 추가:

```
# 정부지원 시스템 자동 백업 (매일 03:00)
0 3 * * * /var/www/government-support/scripts/backup.sh >> /var/log/gov-backup.log 2>&1
```

### 백업 파일 외부 보관 (선택)

```bash
# 로컬 PC로 백업 파일 가져오기 (로컬에서 실행)
scp ubuntu@서버IP:/var/www/government-support/backups/backup_*.tar.gz ~/바탕화면/백업/
```

### 백업에서 복구

```bash
# 1. 백업 파일 압축 해제
tar -xzf backups/backup_20260418_030000.tar.gz -C /tmp/restore

# 2. PM2 앱 중지
pm2 stop government-support

# 3. DB 복구
cp /tmp/restore/backup_20260418_030000/database.db \
   /var/www/government-support/prisma/production.db

# 4. 업로드 파일 복구
cp -r /tmp/restore/backup_20260418_030000/uploads/* \
      /var/www/government-support/public/uploads/

# 5. PM2 재시작
pm2 start government-support

# 6. 확인
pm2 status
pm2 logs government-support --lines 30
```

---

## 13. 업데이트 · 재배포 절차

코드를 수정하고 서버에 반영하는 절차입니다.

```bash
cd /var/www/government-support

# ① 최신 코드 반영
git pull origin main
# 또는 scp/rsync 로 파일 업로드

# ② 의존성 업데이트 (패키지 변경 시)
npm install

# ③ DB 스키마 변경 시 (prisma/schema.prisma 수정된 경우)
npm run db:push

# ④ 다시 빌드
npm run build

# ⑤ PM2 재시작 (다운타임 최소화)
pm2 restart government-support

# ⑥ 정상 동작 확인
pm2 status
pm2 logs government-support --lines 50
```

---

## 14. 운영 전 배포 체크리스트

처음 배포 시 아래 항목을 순서대로 확인하세요.

### 🔧 서버 환경

- [ ] Ubuntu 22.04 LTS 서버 준비 완료
- [ ] SSH 접속 가능 확인
- [ ] `sudo apt update && sudo apt upgrade -y` 실행 완료
- [ ] Node.js 20.x 설치 확인 (`node -v`)
- [ ] PM2 설치 확인 (`pm2 -v`)
- [ ] Nginx 설치 및 실행 확인 (`sudo systemctl status nginx`)
- [ ] 방화벽 설정 완료 (22, 80, 443 허용 / 3000 차단)

### 📁 프로젝트 설정

- [ ] 프로젝트 파일 업로드 완료
- [ ] `.env` 파일 생성 완료 (`.env.example` 참고)
- [ ] `ADMIN_PASSWORD` 기본값에서 변경 완료
- [ ] `ADMIN_SESSION_TOKEN` 랜덤 값 (`openssl rand -hex 32`) 으로 변경 완료
- [ ] `DATABASE_URL` 절대경로로 설정 완료
- [ ] `NODE_ENV=production` 확인
- [ ] `.env` 파일 권한 설정 (`chmod 600 .env`)

### 🚀 앱 실행

- [ ] `npm install` 완료 (오류 없음)
- [ ] 업로드 디렉터리 생성 완료
  ```bash
  mkdir -p public/uploads/{site,license,signature} && chmod -R 755 public/uploads
  ```
- [ ] `npm run setup` 완료 (DB 테이블 생성)
- [ ] `npm run build` 성공 확인 (오류 없음)
- [ ] `npm run start` 로 포트 3000 정상 동작 확인 (테스트 후 Ctrl+C)
- [ ] `pm2 start ecosystem.config.js` 실행
- [ ] `pm2 status` 에서 `online` 상태 확인

### 🔁 자동 시작

- [ ] `pm2 save` 실행
- [ ] `pm2 startup` 실행 후 출력 명령 실행
- [ ] 재부팅 후 자동 시작 확인 (`sudo reboot` → 재접속 → `pm2 status`)

### 🌐 Nginx · 도메인 · HTTPS

- [ ] Nginx 설정 파일 작성 (`/etc/nginx/sites-available/government-support`)
- [ ] 설정 문법 검사 통과 (`sudo nginx -t`)
- [ ] 설정 적용 완료 (`sudo systemctl reload nginx`)
- [ ] DNS A 레코드 서버 IP로 설정 완료
- [ ] DNS 전파 확인 (nslookup 또는 dnschecker.org)
- [ ] `http://도메인.com` 접속 확인
- [ ] Certbot HTTPS 인증서 발급 완료
- [ ] `https://도메인.com` 접속 확인
- [ ] `http://` → `https://` 리다이렉트 확인

### 🧪 기능 테스트

- [ ] 신청 폼 (`https://도메인.com`) 접속 확인 (모바일 포함)
- [ ] 사진 4장 + 사업자등록증 + 서명 업로드 후 제출 성공 확인
- [ ] `/complete` 페이지로 이동 확인
- [ ] 관리자 로그인 (`https://도메인.com/admin`) 확인
- [ ] 관리자 대시보드에서 새 신청 데이터 확인
- [ ] 관리자 상세 페이지에서 이미지 정상 표시 확인
- [ ] ZIP 다운로드 기능 확인

### 💾 백업

- [ ] `./scripts/backup.sh` 수동 실행 및 파일 생성 확인
- [ ] cron 자동 백업 등록 완료
- [ ] 첫 백업 파일이 `backups/` 폴더에 있음 확인

### 🔒 보안

- [ ] `.env` 가 외부에서 접근 불가 확인 (`https://도메인.com/.env` → 404)
- [ ] `prisma/production.db` 가 외부 접근 불가 확인
- [ ] 포트 3000 이 외부에서 직접 접근 불가 확인

---

## 15. 로그 확인 · 문제 해결

### 로그 확인

```bash
# 실시간 로그 스트리밍
pm2 logs government-support

# 최근 200줄
pm2 logs government-support --lines 200

# 에러 로그만
tail -f /var/www/government-support/logs/pm2-error.log

# Nginx 접근 로그
sudo tail -f /var/log/nginx/access.log

# Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log
```

---

### 문제: 포트 3000이 이미 사용 중

```bash
# 사용 중인 프로세스 확인
sudo lsof -i :3000
# 또는
sudo ss -tlnp | grep 3000

# 프로세스 종료
sudo kill -9 <PID>

# 또는 .env 에서 PORT 변경 후 PM2 재시작
PORT=4000  # .env 수정
pm2 restart government-support
```

---

### 문제: 신청 제출 시 500 오류

```bash
# 서버 로그 확인
pm2 logs government-support --lines 100

# 주요 확인 항목:
# 1. DATABASE_URL 경로가 올바른지 (파일이 존재하는지)
ls -la /var/www/government-support/prisma/

# 2. 업로드 디렉터리 쓰기 권한
ls -la /var/www/government-support/public/uploads/
chmod -R 755 /var/www/government-support/public/uploads/

# 3. DB 테이블 존재 여부
npm run setup
```

---

### 문제: 이미지 업로드 후 깨짐

```bash
# 1. 실제 파일이 저장됐는지 확인
ls -la /var/www/government-support/public/uploads/site/
ls -la /var/www/government-support/public/uploads/license/
ls -la /var/www/government-support/public/uploads/signature/

# 2. 서버 로그에서 diskPath 확인
pm2 logs government-support --lines 50
# [INFO] [api/submit] [saveFile] 저장 완료 {diskPath: "...", imageUrl: "..."}
```

---

### 문제: PM2 앱이 `errored` 상태

```bash
# 에러 로그 확인
pm2 logs government-support --lines 100
# 또는
cat /var/www/government-support/logs/pm2-error.log

# 주요 원인:
# - .env 파일 누락
# - npm run build 를 하지 않음 (.next 폴더 없음)
# - 포트 충돌

# 해결 후 재시작
pm2 restart government-support
```

---

### 문제: HTTPS 인증서 발급 실패

```bash
# DNS 전파 확인 (도메인이 서버 IP를 가리키는지)
nslookup 도메인.com
# 응답에 서버 IP가 있어야 함

# 80 포트 접근 가능한지 확인
curl http://도메인.com

# Certbot 재시도
sudo certbot --nginx -d 도메인.com -d www.도메인.com
```

---

### 문제: 디스크 공간 부족 (`ENOSPC`)

```bash
# 디스크 사용량 확인
df -h

# 폴더별 크기 확인
du -sh /var/www/government-support/public/uploads/
du -sh /var/www/government-support/backups/
du -sh /var/www/government-support/.next/

# 오래된 백업 삭제 (30일 이상)
find /var/www/government-support/backups/ -mtime +30 -name "*.tar.gz" -delete

# PM2 로그 초기화
pm2 flush
```

---

## 16. 빠른 참조 (치트시트)

```bash
# ── PM2 ─────────────────────────────────────────────────────
pm2 start ecosystem.config.js          # 시작
pm2 stop government-support            # 중지
pm2 restart government-support         # 재시작
pm2 status                             # 상태 확인
pm2 logs government-support            # 로그
pm2 monit                              # 모니터링 대시보드

# ── Nginx ────────────────────────────────────────────────────
sudo nginx -t                          # 설정 문법 검사
sudo systemctl reload nginx            # 설정 적용
sudo systemctl restart nginx           # 재시작
sudo systemctl status nginx            # 상태 확인

# ── 백업 ────────────────────────────────────────────────────
./scripts/backup.sh                    # 수동 백업

# ── DB ──────────────────────────────────────────────────────
npm run db:push                        # 스키마 동기화
npx prisma studio                      # DB GUI (개발 시)

# ── 인증서 ──────────────────────────────────────────────────
sudo certbot renew --dry-run           # 갱신 테스트
sudo certbot renew                     # 강제 갱신

# ── 업데이트 ────────────────────────────────────────────────
git pull && npm install && npm run build && pm2 restart government-support
```

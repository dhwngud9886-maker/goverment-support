@echo off
REM =============================================================
REM 정부지원 에어컨 신청 관리 시스템 - 백업 스크립트 (Windows)
REM =============================================================
REM 사용법:
REM   scripts\backup.bat              -- 수동 백업
REM
REM 작업 스케줄러 자동 등록 (매일 새벽 3시):
REM   schtasks /create /tn "GovSupportBackup" /tr "C:\경로\scripts\backup.bat" /sc daily /st 03:00
REM =============================================================

setlocal enabledelayedexpansion

REM ── 날짜/시간 포맷 (YYYYMMDD_HHMMSS) ─────────────────────
for /f "tokens=1-3 delims=/-" %%a in ("%date%") do (
  set YYYY=%%c
  set MM=%%a
  set DD=%%b
)
for /f "tokens=1-2 delims=:." %%a in ("%time: =0%") do (
  set HH=%%a
  set MIN=%%b
)
set TIMESTAMP=%YYYY%%MM%%DD%_%HH%%MIN%00
set BACKUP_NAME=backup_%TIMESTAMP%

REM ── 경로 설정 ─────────────────────────────────────────────
set PROJECT_DIR=%~dp0..
set BACKUP_DIR=%PROJECT_DIR%\backups\%BACKUP_NAME%

echo [%date% %time%] 백업 시작: %BACKUP_NAME%

REM ── 백업 디렉토리 생성 ─────────────────────────────────────
if not exist "%PROJECT_DIR%\backups" mkdir "%PROJECT_DIR%\backups"
mkdir "%BACKUP_DIR%"

REM ── SQLite DB 백업 ─────────────────────────────────────────
set DB_FILE=%PROJECT_DIR%\dev.db
if exist "%DB_FILE%" (
  copy /Y "%DB_FILE%" "%BACKUP_DIR%\database.db" >nul
  echo [%date% %time%] DB 백업 완료
) else (
  echo [%date% %time%] 경고: DB 파일을 찾을 수 없습니다: %DB_FILE%
)

REM ── 업로드 파일 백업 ───────────────────────────────────────
set UPLOADS_DIR=%PROJECT_DIR%\public\uploads
if exist "%UPLOADS_DIR%" (
  xcopy /E /I /Y /Q "%UPLOADS_DIR%" "%BACKUP_DIR%\uploads\" >nul
  echo [%date% %time%] 업로드 파일 백업 완료
) else (
  echo [%date% %time%] 경고: uploads 폴더가 없습니다: %UPLOADS_DIR%
)

REM ── 압축 (PowerShell 사용) ─────────────────────────────────
set ARCHIVE=%PROJECT_DIR%\backups\%BACKUP_NAME%.zip
powershell -nologo -noprofile -command ^
  "Compress-Archive -Path '%BACKUP_DIR%' -DestinationPath '%ARCHIVE%' -Force"

if exist "%ARCHIVE%" (
  rmdir /S /Q "%BACKUP_DIR%"
  echo [%date% %time%] 압축 완료: %ARCHIVE%
) else (
  echo [%date% %time%] 경고: 압축 실패 - 폴더 백업은 유지됩니다.
)

REM ── 30일 이상 된 백업 정리 ────────────────────────────────
forfiles /P "%PROJECT_DIR%\backups" /M "backup_*.zip" /D -30 /C "cmd /c del @file" 2>nul
echo [%date% %time%] 오래된 백업 정리 완료

echo [%date% %time%] 백업 완료
endlocal

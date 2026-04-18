/**
 * 업로드 파일 경로 유틸리티
 *
 * ─ 핵심 원칙 ──────────────────────────────────────────────
 * 1. 파일시스템 경로 (diskPath) : path.join() 사용 → OS 구분자 (Windows: \)
 *    writeFile / readFile / unlink / stat 에만 사용
 *
 * 2. 웹 URL (imageUrl)          : 템플릿 리터럴로 직접 조합 → 항상 슬래시(/)
 *    DB 저장 및 <img src> 에만 사용
 *    형식: /uploads/site/파일명.jpg
 *          /uploads/license/파일명.jpg
 *          /uploads/signature/파일명.jpg
 * ──────────────────────────────────────────────────────────
 */

import path from 'path'

/** DB의 imageType 값 → URL/디렉터리에 사용할 하위 경로 이름 */
const TYPE_SUBDIR: Record<string, string> = {
  SITE:      'site',
  LICENSE:   'license',
  SIGNATURE: 'signature',
}

/**
 * 특정 imageType 의 업로드 디렉터리 절대 경로 (OS 구분자)
 * mkdir / path.join 용도로만 사용
 */
export function getUploadDir(imageType: string): string {
  const sub = TYPE_SUBDIR[imageType] ?? 'misc'
  return path.join(process.cwd(), 'public', 'uploads', sub)
}

/**
 * DB 저장용 웹 URL 반환
 * - 항상 슬래시(/) 기반
 * - OS 경로 문자열이 절대 섞이지 않음
 *
 * 예) SITE,      '1700000000000-abcdef.jpg' → /uploads/site/1700000000000-abcdef.jpg
 *     LICENSE,   '1700000000001-fedcba.png' → /uploads/license/1700000000001-fedcba.png
 *     SIGNATURE, '1700000000002-123456.jpg' → /uploads/signature/1700000000002-123456.jpg
 */
export function getImageUrl(imageType: string, filename: string): string {
  const sub = TYPE_SUBDIR[imageType] ?? 'misc'
  return `/uploads/${sub}/${filename}`
}

/**
 * DB에 저장된 웹 URL → 파일시스템 절대 경로 변환
 * readFile / unlink 에 사용
 *
 * 예) /uploads/site/abc.jpg      → /var/www/project/public/uploads/site/abc.jpg
 *     /uploads/license/abc.jpg   → /var/www/project/public/uploads/license/abc.jpg
 *     /uploads/signature/abc.jpg → /var/www/project/public/uploads/signature/abc.jpg
 *
 * 슬래시를 split 해서 path.join 에 전달하므로 Windows / Linux 모두 정상 동작
 */
export function imageUrlToFilepath(imageUrl: string): string {
  // '/uploads/site/abc.jpg' → ['uploads', 'site', 'abc.jpg']
  const parts = imageUrl.split('/').filter(Boolean)
  return path.join(process.cwd(), 'public', ...parts)
}

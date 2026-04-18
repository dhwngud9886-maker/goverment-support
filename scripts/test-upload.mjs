/**
 * 업로드 흐름 진단 스크립트
 * 실행: node scripts/test-upload.mjs
 *
 * next dev 없이 서버와 동일한 경로 계산 / 파일 쓰기 / URL 변환을 검증한다.
 */

import path from 'path'
import { writeFile, mkdir, stat, unlink, rmdir } from 'fs/promises'
import { existsSync } from 'fs'

const cwd = process.cwd()
console.log('\n=== 업로드 진단 시작 ===')
console.log('CWD:', cwd)

// ── lib/uploadPath.ts 와 동일한 로직 ──────────────────────
const TYPE_SUBDIR = { SITE: 'site', LICENSE: 'license', SIGNATURE: 'signature' }

function getUploadDir(imageType) {
  const sub = TYPE_SUBDIR[imageType] ?? 'misc'
  return path.join(cwd, 'public', 'uploads', sub)
}

function getImageUrl(imageType, filename) {
  const sub = TYPE_SUBDIR[imageType] ?? 'misc'
  return `/uploads/${sub}/${filename}`
}

function imageUrlToFilepath(imageUrl) {
  const parts = imageUrl.split('/').filter(Boolean)
  return path.join(cwd, 'public', ...parts)
}

// ── 테스트 실행 ────────────────────────────────────────────
const types = ['SITE', 'LICENSE', 'SIGNATURE']
const written = []

for (const type of types) {
  const uploadDir = getUploadDir(type)
  const filename  = `test-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`
  const diskPath  = path.join(uploadDir, filename)
  const imageUrl  = getImageUrl(type, filename)

  console.log(`\n[${type}]`)
  console.log('  uploadDir :', uploadDir)
  console.log('  diskPath  :', diskPath)
  console.log('  imageUrl  :', imageUrl)

  // 1. 디렉터리 생성
  try {
    await mkdir(uploadDir, { recursive: true })
    console.log('  mkdir     : OK')
  } catch (e) {
    console.error('  mkdir     : FAIL -', e.message)
    process.exit(1)
  }

  // 2. 파일 쓰기
  try {
    await writeFile(diskPath, Buffer.from(`test content for ${type}`))
    console.log('  writeFile : OK')
  } catch (e) {
    console.error('  writeFile : FAIL -', e.message)
    process.exit(1)
  }

  // 3. stat 검증
  try {
    const info = await stat(diskPath)
    if (info.size === 0) throw new Error('0바이트')
    console.log('  stat      : OK (size:', info.size, 'bytes)')
  } catch (e) {
    console.error('  stat      : FAIL -', e.message)
    process.exit(1)
  }

  // 4. imageUrlToFilepath 역변환 검증
  const recoveredPath = imageUrlToFilepath(imageUrl)
  const match = recoveredPath === diskPath
  console.log('  URL→path  :', match ? 'OK (일치)' : `MISMATCH!\n    expected: ${diskPath}\n    got     : ${recoveredPath}`)
  if (!match) process.exit(1)

  // 5. 파일이 실제로 public/ 하위에 있는지 확인
  const publicDir = path.join(cwd, 'public')
  const inPublic  = diskPath.startsWith(publicDir)
  console.log('  in public/:', inPublic ? 'OK' : 'FAIL - public/ 밖에 저장됨!')
  if (!inPublic) process.exit(1)

  written.push({ diskPath, imageUrl })
}

// ── 정리 ──────────────────────────────────────────────────
console.log('\n=== 테스트 파일 삭제 ===')
for (const { diskPath, imageUrl } of written) {
  await unlink(diskPath)
  console.log('  삭제:', imageUrl)
}

// ── 결론 ──────────────────────────────────────────────────
console.log('\n✅ 모든 검사 통과')
console.log('   next dev 실행 후 폼을 제출하면 아래 경로에 파일이 저장됩니다:')
for (const type of types) {
  console.log(`   ${getImageUrl(type, '파일명.jpg')}`)
}

console.log('\n서버 시작 명령: npm run dev')
console.log('접속 URL      : http://localhost:3000')
console.log('관리자 URL    : http://localhost:3000/admin')
console.log()

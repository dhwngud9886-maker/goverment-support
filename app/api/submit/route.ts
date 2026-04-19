import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import crypto from 'crypto'
import { writeFile, mkdir, stat } from 'fs/promises'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getUploadDir, getImageUrl } from '@/lib/uploadPath'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const CTX = 'api/submit'

// 사용하는 imageType 전체 목록 (POST 핸들러 시작 시 모두 미리 생성)
const ALL_IMAGE_TYPES = ['SITE', 'LICENSE', 'SIGNATURE'] as const

/**
 * 파일 하나를 디스크에 저장하고 DB 저장용 웹 URL을 반환한다.
 *
 * ┌─ diskPath ───────────────────────────────────────────────┐
 * │ path.join() → OS 구분자 (Windows: \)                     │
 * │ writeFile / stat 전용. 절대 DB에 저장하지 않는다.        │
 * └──────────────────────────────────────────────────────────┘
 * ┌─ imageUrl ───────────────────────────────────────────────┐
 * │ 템플릿 리터럴 → 항상 슬래시(/)                           │
 * │ 예: /uploads/site/1700000000000-abcdef.jpg               │
 * │ DB 저장 및 <img src> 전용. OS 경로 절대 포함 안 됨.     │
 * └──────────────────────────────────────────────────────────┘
 */
async function saveFile(file: File, imageType: string): Promise<string> {
  // ── 1. 파일 내용 읽기 ─────────────────────────────────────
  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(new Uint8Array(bytes))

  // ── 2. 고유 파일명 생성 ───────────────────────────────────
  const ext      = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filename = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}.${ext}`

  // ── 3. 경로 분리 ──────────────────────────────────────────
  //   diskPath  : OS 절대경로  (writeFile/stat 전용)
  //   imageUrl  : 웹 URL       (DB 저장 전용)
  const uploadDir = getUploadDir(imageType)           // path.join 내부 사용 (OS 구분자)
  const diskPath  = path.join(uploadDir, filename)    // OS 절대경로
  const imageUrl  = getImageUrl(imageType, filename)  // 항상 슬래시(/)

  logger.info(CTX, `[saveFile] 저장 준비`, {
    imageType,
    originalName: file.name,
    fileSize: buffer.length,
    diskPath,   // 실제 저장 위치 — 로그로 확인
    imageUrl,   // DB 저장값 — 로그로 확인
  })

  // ── 4. 디렉터리 보장 (각 파일마다 재확인) ────────────────
  await mkdir(uploadDir, { recursive: true })

  // ── 5. 파일 저장 ──────────────────────────────────────────
  try {
    await writeFile(diskPath, buffer)
  } catch (writeErr) {
    throw new Error(
      `[saveFile] writeFile 실패 | diskPath=${diskPath} | ${writeErr instanceof Error ? writeErr.message : String(writeErr)}`
    )
  }

  // ── 6. 저장 검증 ──────────────────────────────────────────
  let savedSize: number
  try {
    const fileInfo = await stat(diskPath)
    savedSize = fileInfo.size
  } catch (statErr) {
    throw new Error(
      `[saveFile] stat 실패 (파일이 존재하지 않음) | diskPath=${diskPath} | ${statErr instanceof Error ? statErr.message : String(statErr)}`
    )
  }

  if (savedSize === 0) {
    throw new Error(`[saveFile] 파일이 0바이트로 저장됨 | diskPath=${diskPath}`)
  }

  logger.info(CTX, `[saveFile] 저장 완료`, {
    diskPath,
    imageUrl,
    savedSize,
  })

  // ── 7. DB 저장용 웹 URL 반환 ──────────────────────────────
  return imageUrl
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // ── 텍스트 필드 ──────────────────────────────────────────
    const businessNumber      = (formData.get('businessNumber')      as string)?.trim()
    const businessPlaceNumber = (formData.get('businessPlaceNumber') as string)?.trim()
    const phone               = (formData.get('phone')               as string)?.trim()
    const email               = (formData.get('email')               as string)?.trim()
    const address             = (formData.get('address')             as string)?.trim()
    const memo                = (formData.get('memo')                as string)?.trim() ?? ''
    const productType         = (formData.get('productType')         as string)?.trim()
    const quantityRaw         = (formData.get('quantity')            as string)?.trim()
    const quantity            = quantityRaw ? parseInt(quantityRaw, 10) : NaN

    // 필수 텍스트 검증
    if (!businessNumber || !businessPlaceNumber || !phone || !email || !address) {
      return NextResponse.json(
        { error: '필수 항목을 모두 입력해주세요' },
        { status: 400 }
      )
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식이 아닙니다' },
        { status: 400 }
      )
    }
    if (!productType || !['2구', '3구'].includes(productType)) {
      return NextResponse.json(
        { error: '제품 종류를 선택해주세요' },
        { status: 400 }
      )
    }
    if (isNaN(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: '수량을 1 이상으로 입력해주세요' },
        { status: 400 }
      )
    }

    // ── 이미지 필드 ──────────────────────────────────────────
    const sitePhotoFiles: File[] = (formData.getAll('sitePhotos') as File[])
      .filter((f) => f instanceof File && f.size > 0)

    const businessLicenseFile = formData.get('businessLicensePhoto') as File | null
    const signaturePhotoFile  = formData.get('signaturePhoto')       as File | null

    // 현장사진 검증 (정확히 4장)
    if (sitePhotoFiles.length !== 4) {
      return NextResponse.json(
        { error: `현장사진은 정확히 4장 업로드해야 합니다 (현재 ${sitePhotoFiles.length}장)` },
        { status: 400 }
      )
    }

    // 사업자등록증 검증
    if (!businessLicenseFile || businessLicenseFile.size === 0) {
      return NextResponse.json(
        { error: '사업자등록증 사진을 업로드해주세요' },
        { status: 400 }
      )
    }

    // 서명 사진 검증
    if (!signaturePhotoFile || signaturePhotoFile.size === 0) {
      return NextResponse.json(
        { error: '서명 사진을 업로드해주세요' },
        { status: 400 }
      )
    }

    // 파일 MIME 타입 검증
    const allFiles = [...sitePhotoFiles, businessLicenseFile, signaturePhotoFile]
    for (const file of allFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `지원하지 않는 파일 형식입니다: ${file.name} (${file.type})` },
          { status: 400 }
        )
      }
    }

    // ── 업로드 디렉터리 사전 생성 ─────────────────────────────
    // 파일 저장 전에 세 디렉터리를 모두 확실히 생성한다.
    // mkdir({ recursive: true })는 이미 존재하면 에러 없이 통과한다.
    const uploadDirs = ALL_IMAGE_TYPES.map((t) => getUploadDir(t))

    logger.info(CTX, '업로드 디렉터리 생성 시작', {
      cwd: process.cwd(),
      dirs: uploadDirs,
    })

    await Promise.all(uploadDirs.map((dir) => mkdir(dir, { recursive: true })))

    logger.info(CTX, '업로드 디렉터리 생성 완료')

    // ── 파일 저장 ─────────────────────────────────────────────
    type ImageRecord = { imageUrl: string; imageType: string }
    const imageRecords: ImageRecord[] = []

    // 현장사진 4장 → /uploads/site/...
    for (let i = 0; i < sitePhotoFiles.length; i++) {
      const imageUrl = await saveFile(sitePhotoFiles[i], 'SITE')
      imageRecords.push({ imageUrl, imageType: 'SITE' })
    }

    // 사업자등록증 → /uploads/license/...
    const licenseUrl = await saveFile(businessLicenseFile, 'LICENSE')
    imageRecords.push({ imageUrl: licenseUrl, imageType: 'LICENSE' })

    // 서명 → /uploads/signature/...
    const signatureUrl = await saveFile(signaturePhotoFile, 'SIGNATURE')
    imageRecords.push({ imageUrl: signatureUrl, imageType: 'SIGNATURE' })

    logger.info(CTX, '모든 파일 저장 완료, DB 저장 시작', {
      imageRecords, // imageUrl 목록을 로그로 확인
    })

    // ── DB 저장 ───────────────────────────────────────────────
    // 모든 파일 저장이 성공한 이후에만 DB에 기록한다.
    const submission = await prisma.submission.create({
      data: {
        businessNumber,
        businessPlaceNumber,
        phone,
        email,
        address,
        memo,
        productType,
        quantity,
        images: { create: imageRecords },
      },
    })

    logger.info(CTX, '신청 접수 완료', { submissionId: submission.id, businessNumber })
    return NextResponse.json({ success: true, id: submission.id })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)

    const isDbError =
      msg.includes('prisma') ||
      msg.includes('Unique constraint') ||
      msg.includes('Foreign key')

    if (isDbError) {
      logger.error(CTX, 'DB 저장 실패', error)
    } else {
      logger.error(CTX, `파일 저장 실패: ${msg}`, error)
    }

    return NextResponse.json(
      { error: '서버 오류가 발생했습니다. 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}

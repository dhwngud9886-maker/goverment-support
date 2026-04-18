import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import JSZip from 'jszip'
import { readFile } from 'fs/promises'
import { imageUrlToFilepath } from '@/lib/uploadPath'

// type 파라미터 없으면 전체, 있으면 해당 타입만 포함
// GET /api/admin/download/1          → 전체 사진 ZIP
// GET /api/admin/download/1?type=SITE → 현장사진만 ZIP

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 관리자 세션 검증
  const session = request.cookies.get('admin_session')
  if (session?.value !== process.env.ADMIN_SESSION_TOKEN) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const id = parseInt(params.id)
  if (isNaN(id)) {
    return NextResponse.json({ error: '잘못된 ID입니다' }, { status: 400 })
  }

  const typeFilter = request.nextUrl.searchParams.get('type') // SITE | LICENSE | SIGNATURE | null

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { images: true },
  })

  if (!submission) {
    return NextResponse.json({ error: '신청을 찾을 수 없습니다' }, { status: 404 })
  }

  const targetImages = typeFilter
    ? submission.images.filter((img) => img.imageType === typeFilter)
    : submission.images

  if (targetImages.length === 0) {
    return NextResponse.json({ error: '다운로드할 사진이 없습니다' }, { status: 404 })
  }

  // ── ZIP 생성 ────────────────────────────────────────────
  const zip = new JSZip()

  // 타입별 폴더 및 표시명 매핑
  const TYPE_LABEL: Record<string, string> = {
    SITE:      '현장사진',
    LICENSE:   '사업자등록증',
    SIGNATURE: '서명',
  }

  // 타입별 카운터 (현장사진 1, 2, 3, 4)
  const counters: Record<string, number> = {}

  for (const image of targetImages) {
    // imageUrl 예: /uploads/site/abc.jpg
    // imageUrlToFilepath() 가 슬래시 기반 URL → OS 절대 경로로 변환
    const diskPath = imageUrlToFilepath(image.imageUrl)

    // 확장자는 URL 마지막 세그먼트에서 추출 (OS 구분자 오염 없음)
    const urlFilename = image.imageUrl.split('/').pop() ?? 'file'
    const ext         = urlFilename.split('.').pop()?.toLowerCase() || 'jpg'

    const label = TYPE_LABEL[image.imageType] ?? '기타'
    counters[image.imageType] = (counters[image.imageType] ?? 0) + 1
    const count = counters[image.imageType]

    // ZIP 내 엔트리 경로 결정
    let zipEntry: string
    if (typeFilter) {
      // 단일 타입: 폴더 없이 파일만
      zipEntry =
        image.imageType === 'SITE'
          ? `${label}_${count}.${ext}`
          : `${label}.${ext}`
    } else {
      // 전체: 타입별 폴더에 담기
      zipEntry =
        image.imageType === 'SITE'
          ? `${label}/${label}_${count}.${ext}`
          : `${label}/${label}.${ext}`
    }

    try {
      const fileBuffer = await readFile(diskPath)
      zip.file(zipEntry, fileBuffer)
    } catch {
      // 파일 누락 시 건너뜀
      console.warn(`[download] 파일 없음: ${diskPath}`)
    }
  }

  // ── ZIP 생성 (ArrayBuffer — TypeScript BodyInit 호환) ────
  const zipArrayBuffer: ArrayBuffer = await zip.generateAsync({
    type: 'arraybuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  // ZIP 파일명
  const safeNum    = submission.businessNumber.replace(/[^a-zA-Z0-9가-힣]/g, '')
  const typeSuffix = typeFilter ? `_${TYPE_LABEL[typeFilter] ?? typeFilter}` : '_사진전체'
  const zipFilename = `신청_${id}_${safeNum}${typeSuffix}.zip`

  return new Response(zipArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(zipFilename)}`,
      'Content-Length': zipArrayBuffer.byteLength.toString(),
    },
  })
}

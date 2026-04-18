import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { revalidatePath } from 'next/cache'
import { imageUrlToFilepath } from '@/lib/uploadPath'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 관리자 세션 검증
  const session = request.cookies.get('admin_session')
  if (session?.value !== process.env.ADMIN_SESSION_TOKEN) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: '잘못된 ID입니다' }, { status: 400 })
    }

    // 신청 + 첨부 이미지 조회
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: { images: true },
    })

    if (!submission) {
      return NextResponse.json(
        { error: '해당 신청을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 실제 이미지 파일 삭제
    for (const image of submission.images) {
      // imageUrl 예: /uploads/site/abc.jpg  /uploads/license/abc.jpg  /uploads/signature/abc.jpg
      // imageUrlToFilepath() 가 슬래시 기반 URL → OS 절대 경로로 변환
      const diskPath = imageUrlToFilepath(image.imageUrl)
      try {
        await unlink(diskPath)
      } catch {
        // 파일이 이미 없는 경우 무시하고 DB 삭제는 계속 진행
        console.warn(`파일 삭제 실패 (무시됨): ${diskPath}`)
      }
    }

    // DB 삭제 (schema onDelete: Cascade 로 Image 레코드도 함께 삭제됨)
    await prisma.submission.delete({ where: { id } })

    revalidatePath('/admin/dashboard')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: '삭제 중 오류가 발생했습니다. 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}

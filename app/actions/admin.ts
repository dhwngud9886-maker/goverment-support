'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

const VALID_STATUSES = ['접수완료', '확인중', '연락완료', '완료']

export async function updateStatus(id: number, status: string) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error('유효하지 않은 상태값입니다')
  }

  await prisma.submission.update({
    where: { id },
    data: { status },
  })

  revalidatePath(`/admin/submission/${id}`)
  revalidatePath('/admin/dashboard')
}

export async function updateAdminMemo(id: number, adminMemo: string) {
  await prisma.submission.update({
    where: { id },
    data: { adminMemo },
  })

  revalidatePath(`/admin/submission/${id}`)
}

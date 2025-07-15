import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(request: NextRequest) {
  try {
    const { submissionId, score, comment } = await request.json();
    
    if (!submissionId) {
      return NextResponse.json({ error: '提交记录ID不能为空' }, { status: 400 });
    }

    // 直接更新数据库中的submission记录
    await db
      .update(schema.submissions)
      .set({
        score: score,
        comment: comment,
        updatedAt: new Date()
      })
      .where(eq(schema.submissions.id, submissionId));
    
    return NextResponse.json({
      success: true,
      message: '评分更新成功'
    });
  } catch (error) {
    console.error('更新评分失败:', error);
    return NextResponse.json({ error: '更新评分失败' }, { status: 500 });
  }
} 
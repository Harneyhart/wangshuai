import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { validateRequest } from '@/lib/auth/validate-request';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: '用户未登录' }, { status: 401 });
    }

    const { courseId } = params;
    const body = await request.json();
    const { isActive } = body;

    if (!courseId) {
      return NextResponse.json({ error: '课程ID不能为空' }, { status: 400 });
    }

    if (isActive === undefined || isActive === null) {
      return NextResponse.json({ error: '课程状态参数缺失' }, { status: 400 });
    }

    // 检查课程是否存在
    const existingCourse = await db.query.courses.findFirst({
      where: (table, { eq }) => eq(table.id, courseId),
    });

    if (!existingCourse) {
      return NextResponse.json({ error: '课程不存在' }, { status: 404 });
    }

    // 更新课程状态
    const updatedCourse = await db.update(schema.courses)
      .set({ 
        isActive: isActive,
        updatedAt: new Date()
      })
      .where(eq(schema.courses.id, courseId))
      .returning();

    console.log('课程状态更新成功:', {
      courseId,
      oldStatus: existingCourse.isActive,
      newStatus: isActive
    });

    return NextResponse.json({
      success: true,
      message: '课程状态修改成功',
      data: updatedCourse[0]
    });
  } catch (error) {
    console.error('修改课程状态失败:', error);
    return NextResponse.json({ error: '修改课程状态失败' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: '用户未登录' }, { status: 401 });
    }

    const { courseId } = params;

    if (!courseId) {
      return NextResponse.json({ error: '课程ID不能为空' }, { status: 400 });
    }

    // 查询课程信息
    const course = await db.query.courses.findFirst({
      where: (table, { eq }) => eq(table.id, courseId),
    });

    if (!course) {
      return NextResponse.json({ error: '课程不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('获取课程信息失败:', error);
    return NextResponse.json({ error: '获取课程信息失败' }, { status: 500 });
  }
} 
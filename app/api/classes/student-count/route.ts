import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { studentsToClasses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// 获取班级学生数量
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('classId');

    if (!classId) {
      return NextResponse.json({ error: '缺少班级ID' }, { status: 400 });
    }

    // 查询 students_to_classes 表，计算该班级的学生数量
    const studentCount = await db
      .select()
      .from(studentsToClasses)
      .where(eq(studentsToClasses.classId, classId));

    return NextResponse.json({
      success: true,
      data: {
        classId,
        studentCount: studentCount.length,
        students: studentCount
      }
    });
  } catch (error) {
    console.error('获取班级学生数量失败:', error);
    return NextResponse.json({ error: '获取班级学生数量失败' }, { status: 500 });
  }
} 
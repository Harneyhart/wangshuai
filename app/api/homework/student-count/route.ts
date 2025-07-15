import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { studentsToClasses, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// 根据作业ID获取需要提交该作业的学生总数
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const homeworkId = searchParams.get('homeworkId');

    if (!homeworkId) {
      return NextResponse.json({ error: '缺少作业ID' }, { status: 400 });
    }

    // 1. 根据作业ID获取作业信息
    const homework = await db.query.homeworks.findFirst({
      where: (table, { eq }) => eq(table.id, homeworkId),
      with: {
        plan: {
          with: {
            class: true,
          },
        },
      },
    });

    if (!homework) {
      return NextResponse.json({ error: '作业不存在' }, { status: 404 });
    }

    // 2. 获取该作业所属班级的真实学生数量（只统计存在的用户）
    const classId = homework.plan.classId;
    const studentCount = await db
      .select({
        studentId: studentsToClasses.studentId,
      })
      .from(studentsToClasses)
      .innerJoin(users, eq(studentsToClasses.studentId, users.id))
      .where(eq(studentsToClasses.classId, classId));

    return NextResponse.json({
      success: true,
      data: {
        homeworkId,
        homeworkName: homework.name,
        classId,
        className: homework.plan.class.name,
        studentCount: studentCount.length,
      }
    });
  } catch (error) {
    console.error('获取作业学生数量失败:', error);
    return NextResponse.json({ error: '获取作业学生数量失败' }, { status: 500 });
  }
} 
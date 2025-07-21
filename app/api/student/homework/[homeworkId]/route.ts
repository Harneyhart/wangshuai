import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/validate-request';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { homeworkId: string } }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户未登录' },
        { status: 401 }
      );
    }

    const { homeworkId } = params;

    // 1. 验证当前用户是学生，并获取学生所在班级
    const studentInfo = await db
      .select({
        studentId: schema.students.id,
        classId: schema.studentsToClasses.classId,
      })
      .from(schema.students)
      .innerJoin(schema.studentsToClasses, eq(schema.students.id, schema.studentsToClasses.studentId))
      .where(eq(schema.students.userId, user.id));

    if (studentInfo.length === 0) {
      return NextResponse.json(
        { success: false, error: '未找到学生信息或学生未分配班级' },
        { status: 403 }
      );
    }

    const studentClassIds = studentInfo.map(s => s.classId);

    // 2. 获取作业信息并验证权限
    const homework = await db.query.homeworks.findFirst({
      where: (table, { eq }) => eq(table.id, homeworkId),
      with: {
        plan: {
          with: {
            course: true,
            class: true,
            attachments: {
              with: {
                attachment: true,
              },
            },
          },
        },
      },
    });

    if (!homework) {
      return NextResponse.json(
        { success: false, error: '作业不存在' },
        { status: 404 }
      );
    }

    // 3. 验证学生是否有权限查看此作业
    if (!studentClassIds.includes(homework.plan?.classId || '')) {
      return NextResponse.json(
        { success: false, error: '无权限查看此作业' },
        { status: 403 }
      );
    }

    // 4. 验证作业是否已发布
    if (homework.isActive !== 1) {
      return NextResponse.json(
        { success: false, error: '作业未发布' },
        { status: 403 }
      );
    }

    // 5. 返回作业详情（只包含教师上传的附件）
    const homeworkDetail = {
      key: homework.id,
      homework: homework.name,
      description: homework.description,
      courseName: homework.plan?.course?.name || '未知课程',
      className: homework.plan?.class?.name || '未知班级',
      publishTime: homework.createdAt,
      deadline: homework.deadline,
      status: '已发布',
      coursePlanId: homework.coursePlanId,
      attachments: homework.plan?.attachments?.map(att => ({
        id: att.attachment.id,
        name: att.attachment.name,
        fileName: att.attachment.fileName,
        fileKey: att.attachment.fileKey,
      })) || [],
    };

    return NextResponse.json({
      success: true,
      data: homeworkDetail,
    });

  } catch (error) {
    console.error('获取作业详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取作业详情失败' },
      { status: 500 }
    );
  }
} 
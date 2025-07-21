import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/validate-request';
import { queryStudentByUserId } from '@/utils/query';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // 验证用户登录状态
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: '用户未登录' }, { status: 401 });
    }

    // 获取学生信息
    const student = await queryStudentByUserId(user.id);
    if (!student) {
      return NextResponse.json({ error: '学生信息不存在' }, { status: 404 });
    }

    // 查询该学生的所有提交记录
    const submissions = await db.query.submissions.findMany({
      where: (table, { eq }) => eq(table.studentId, student.id),
      with: {
        homework: {
          with: {
            plan: {
              with: {
                class: true,
                course: true,
              },
            },
          },
        },
        attachments: {
          with: {
            attachment: true,
          },
        },
      },
    });

    // 转换为前端需要的格式 - 使用多种键进行映射
    const submissionMap: Record<string, {
      isSubmitted: boolean;
      score: number | null;
      comment: string | null;
      submitTime: string | null;
      status: '未提交' | '待评分' | '已评分';
    }> = {};

    submissions.forEach(submission => {
      const homeworkId = submission.homeworkId;
      const submissionData = {
        isSubmitted: true,
        score: submission.score,
        comment: submission.comment,
        submitTime: submission.createdAt.toISOString(),
        status: submission.score !== null ? '已评分' as const : '待评分' as const
      };
      
      // 使用homeworkId作为主键
      submissionMap[homeworkId] = submissionData;
      
      // 同时使用作业名称作为键，以便兼容不同的查询方式
      if (submission.homework?.name) {
        submissionMap[submission.homework.name] = submissionData;
      }
      
      // 如果有其他可能的标识符，也加入映射
      if (submission.homework?.id) {
        submissionMap[submission.homework.id] = submissionData;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        studentId: student.id,
        studentName: student.name,
        submissions: submissionMap
      }
    });
  } catch (error) {
    console.error('查询学生提交状态失败:', error);
    return NextResponse.json({ error: '查询提交状态失败' }, { status: 500 });
  }
} 
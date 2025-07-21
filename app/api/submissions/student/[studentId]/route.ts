import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const { studentId } = params;
    
    if (!studentId) {
      return NextResponse.json({ error: '学生ID不能为空' }, { status: 400 });
    }

    // 查询该学生的所有提交记录
    const submissions = await db.query.submissions.findMany({
      where: (table, { eq }) => eq(table.studentId, studentId),
      with: {
        student: true,
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
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });

    // 转换为前端需要的格式
    const gradingRecords = submissions.map((submission) => ({
      key: submission.id,
      id: submission.id,
      homework: submission.homework.name,
      courseName: submission.homework.plan.course.name,
      className: submission.homework.plan.class.name,
      studentName: submission.student.name,
      submitTime: submission.createdAt.toISOString(),
      score: submission.score,
      maxScore: 100,
      comment: submission.comment || '',
      status: submission.score !== null ? '已评分' : '未评分',
      description: submission.text || '',
      studentId: submission.studentId,
      homeworkId: submission.homeworkId,
      attachments: submission.attachments || []
    }));

    return NextResponse.json({
      success: true,
      data: {
        studentName: submissions.length > 0 ? submissions[0].student.name : '',
        submissions: gradingRecords
      }
    });
  } catch (error) {
    console.error('获取学生提交记录失败:', error);
    return NextResponse.json({ error: '获取学生提交记录失败' }, { status: 500 });
  }
} 
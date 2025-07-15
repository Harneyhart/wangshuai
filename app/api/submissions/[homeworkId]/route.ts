import { NextRequest, NextResponse } from 'next/server';
import { querySubmissionsByHomeworkId } from '@/utils/query';

export async function GET(
  request: NextRequest,
  { params }: { params: { homeworkId: string } }
) {
  try {
    const { homeworkId } = params;
    
    if (!homeworkId) {
      return NextResponse.json({ error: '作业ID不能为空' }, { status: 400 });
    }

    // 从数据库获取该作业的所有提交记录
    const submissions = await querySubmissionsByHomeworkId(homeworkId);
    
    // 转换为前端需要的格式
    const gradingRecords = submissions.map((submission, index) => ({
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
      data: gradingRecords
    });
  } catch (error) {
    console.error('获取提交记录失败:', error);
    return NextResponse.json({ error: '获取提交记录失败' }, { status: 500 });
  }
}

 
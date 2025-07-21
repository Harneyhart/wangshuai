import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { studentsToClasses, students, submissions, classes } from '@/lib/db/schema';
import { eq, and, notInArray } from 'drizzle-orm';

// 获取指定作业的未提交学生列表
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

    const classId = homework.plan.classId;

    // 2. 获取该作业所属班级的所有学生
    const allStudentsInClass = await db
      .select({
        studentId: studentsToClasses.studentId,
        studentName: students.name,
        className: classes.name,
      })
      .from(studentsToClasses)
      .innerJoin(students, eq(studentsToClasses.studentId, students.id))
      .innerJoin(classes, eq(studentsToClasses.classId, classes.id))
      .where(eq(studentsToClasses.classId, classId));

    // 3. 获取已提交该作业的学生ID列表
    const submittedStudents = await db
      .select({
        studentId: submissions.studentId,
      })
      .from(submissions)
      .where(eq(submissions.homeworkId, homeworkId));

    const submittedStudentIds = submittedStudents.map(s => s.studentId);

    // 4. 筛选出未提交的学生
    const unsubmittedStudents = allStudentsInClass.filter(
      student => !submittedStudentIds.includes(student.studentId)
    );

    return NextResponse.json({
      success: true,
      data: {
        homeworkId,
        homeworkName: homework.name,
        className: homework.plan.class.name,
        unsubmittedStudents: unsubmittedStudents.map(student => ({
          studentId: student.studentId,
          studentName: student.studentName,
          className: student.className,
        })),
        totalStudentsInClass: allStudentsInClass.length,
        unsubmittedCount: unsubmittedStudents.length,
      }
    });
  } catch (error) {
    console.error('获取未提交学生列表失败:', error);
    return NextResponse.json(
      { error: '获取未提交学生列表失败', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
} 
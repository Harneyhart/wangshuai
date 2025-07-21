import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { studentsToClasses, students, classes } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

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

    // 2. 获取该作业所属班级的真实学生数量（只统计存在的学生）
    const classId = homework.plan.classId;
    
    // 获取该班级的所有学生
    const studentsInClass = await db
      .select({
        studentId: studentsToClasses.studentId,
        className: classes.name,
      })
      .from(studentsToClasses)
      .innerJoin(students, eq(studentsToClasses.studentId, students.id))
      .innerJoin(classes, eq(studentsToClasses.classId, classes.id))
      .where(eq(studentsToClasses.classId, classId));

    // 按班级分组统计学生数量
    const classCounts: { [className: string]: number } = {};
    studentsInClass.forEach(student => {
      const className = student.className;
      classCounts[className] = (classCounts[className] || 0) + 1;
    });

    // 计算总学生数
    const totalStudentCount = studentsInClass.length;

    return NextResponse.json({
      success: true,
      data: {
        homeworkId,
        homeworkName: homework.name,
        classId,
        className: homework.plan.class.name,
        studentCount: totalStudentCount,
        classCounts: classCounts, // 按班级分组的学生数量
      }
    });
  } catch (error) {
    console.error('获取作业学生数量失败:', error);
    return NextResponse.json({ error: '获取作业学生数量失败' }, { status: 500 });
  }
} 
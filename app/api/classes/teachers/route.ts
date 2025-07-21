import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { classes, coursePlans, courseHours, teachersToCourseHours, teachers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// 获取班级的班导师信息
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('classId');
    const className = searchParams.get('className');

    if (!classId && !className) {
      return NextResponse.json({ error: '缺少班级ID或班级名称' }, { status: 400 });
    }

    let targetClassId = classId;

    // 如果提供的是班级名称，先找到班级ID
    if (!classId && className) {
      const classRecord = await db.query.classes.findFirst({
        where: (table, { eq }) => eq(table.name, className),
      });
      
      if (!classRecord) {
        return NextResponse.json({
          success: true,
          data: {
            className,
            teachers: []
          }
        });
      }
      
      targetClassId = classRecord.id;
    }

    // 执行复杂的表关联查询
    // classes -> course_plans -> course_hours -> teachers_to_course_hours -> teachers
    const result = await db
      .select({
        teacherId: teachers.id,
        teacherName: teachers.name
      })
      .from(classes)
      .innerJoin(coursePlans, eq(classes.id, coursePlans.classId))
      .innerJoin(courseHours, eq(coursePlans.id, courseHours.coursePlanId))
      .innerJoin(teachersToCourseHours, eq(courseHours.id, teachersToCourseHours.courseHourId))
      .innerJoin(teachers, eq(teachersToCourseHours.teacherId, teachers.id))
      .where(eq(classes.id, targetClassId!));

    // 去重教师
    const uniqueTeachers = Array.from(
      new Map(result.map(item => [item.teacherId, item])).values()
    );

    return NextResponse.json({
      success: true,
      data: {
        classId: targetClassId,
        className,
        teachers: uniqueTeachers.map(t => t.teacherName)
      }
    });
  } catch (error) {
    console.error('获取班级教师信息失败:', error);
    return NextResponse.json({ error: '获取班级教师信息失败' }, { status: 500 });
  }
}
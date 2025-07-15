import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { courseHours, teachersToCourseHours, assistantsToCourseHours, operatorsToCourseHours, coursePlans, courses, teachers, classes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// 获取特定课程的安排
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params;

    if (!courseId) {
      return NextResponse.json({ error: '缺少课程ID' }, { status: 400 });
    }

    // 查询课程安排
    const arrangements = await db
      .select({
        id: courseHours.id,
        classRoom: courseHours.classRoom,
        startTime: courseHours.startTime,
        endTime: courseHours.endTime,
        coursePlanId: courseHours.coursePlanId,
        createdAt: courseHours.createdAt,
        updatedAt: courseHours.updatedAt,
        className: classes.name,
      })
      .from(courseHours)
      .innerJoin(coursePlans, eq(courseHours.coursePlanId, coursePlans.id))
      .leftJoin(classes, eq(coursePlans.classId, classes.id))
      .where(eq(coursePlans.courseId, courseId));

    // 获取每个课程安排的教师信息
    const arrangementsWithTeachers = await Promise.all(
      arrangements.map(async (arrangement) => {
        // 分别查询三种类型的教师
        const [theoryTeachers, experimentTeachers, assistants] = await Promise.all([
          // 理论教师
          db
            .select({ teacherName: teachers.name })
            .from(teachersToCourseHours)
            .innerJoin(teachers, eq(teachersToCourseHours.teacherId, teachers.id))
            .where(eq(teachersToCourseHours.courseHourId, arrangement.id)),
          // 实验教师
          db
            .select({ teacherName: teachers.name })
            .from(operatorsToCourseHours)
            .innerJoin(teachers, eq(operatorsToCourseHours.operatorId, teachers.id))
            .where(eq(operatorsToCourseHours.courseHourId, arrangement.id)),
          // 助教
          db
            .select({ teacherName: teachers.name })
            .from(assistantsToCourseHours)
            .innerJoin(teachers, eq(assistantsToCourseHours.assistantId, teachers.id))
            .where(eq(assistantsToCourseHours.courseHourId, arrangement.id)),
        ]);

        const theoryTeacher = theoryTeachers[0]?.teacherName || '';
        const experimentTeacher = experimentTeachers[0]?.teacherName || '';
        const assistant = assistants[0]?.teacherName || '';

        // 处理时间显示
        // start_time存储周几，end_time存储具体时间
        const weekDay = arrangement.startTime || '';
        const timeSlot = arrangement.endTime || '';

        return {
          id: arrangement.id,
          key: arrangement.id,
          col1: arrangement.className || '', // 班级名称
          col2: theoryTeacher,             // 理论教师
          col3: experimentTeacher,         // 实验教师
          col4: assistant,                 // 助教
          col5: arrangement.classRoom,     // 教室
          col6: `${weekDay} ${timeSlot}`,  // 上课时间
          col7: '',
          col8: '',
          col9: '',
          week: weekDay,                   // 单独的星期字段
          timeSlot: timeSlot,             // 单独的时间段字段
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: arrangementsWithTeachers,
    });
  } catch (error) {
    console.error('获取课程安排失败:', error);
    return NextResponse.json({ error: '获取课程安排失败' }, { status: 500 });
  }
}

// 删除特定课程安排
export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params;
    const searchParams = request.nextUrl.searchParams;
    const planId = searchParams.get('planId');

    if (!courseId || !planId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 彻底删除教师关联关系
    await Promise.all([
      db.delete(teachersToCourseHours).where(eq(teachersToCourseHours.courseHourId, planId)),
      db.delete(operatorsToCourseHours).where(eq(operatorsToCourseHours.courseHourId, planId)),
      db.delete(assistantsToCourseHours).where(eq(assistantsToCourseHours.courseHourId, planId)),
    ]);

    // 彻底删除课程安排
    await db
      .delete(courseHours)
      .where(eq(courseHours.id, planId));

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除课程安排失败:', error);
    return NextResponse.json({ error: '删除课程安排失败' }, { status: 500 });
  }
} 
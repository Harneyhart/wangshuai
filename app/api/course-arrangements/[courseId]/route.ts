import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { courseHours, teachersToCourseHours, assistantsToCourseHours, operatorsToCourseHours, coursePlans, courses, teachers, classes, coursePlansToAttachments, attachments } from '@/lib/db/schema';
import { eq, and, asc, inArray } from 'drizzle-orm';

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

    // 查询课程安排，按创建时间排序以保持稳定的显示顺序
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
      .where(eq(coursePlans.courseId, courseId))
      .orderBy(asc(courseHours.createdAt)); // 按创建时间升序排列，保持稳定顺序

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
        // startTime和endTime都是timestamp类型，直接使用
        const startTime = arrangement.startTime;
        const endTime = arrangement.endTime;

        // 处理占位符班级显示
        const className = arrangement.className || '';
        const displayClassName = className === '__EMPTY_PLACEHOLDER__' ? '' : className;

        return {
          id: arrangement.id,
          key: arrangement.id,
          col1: displayClassName,          // 如果是占位符班级则显示为空
          col2: theoryTeacher,             // 理论教师
          col3: experimentTeacher,         // 实验教师
          col4: assistant,                 // 助教
          col5: arrangement.classRoom,     // 教室
          col6: '',                        // 上课时间（由前端处理显示）
          col7: '',
          col8: '',
          col9: '',
          startTime: startTime,            // 开始时间
          endTime: endTime,                // 结束时间
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

    // 先获取要删除的课程安排信息，以便后续清理孤立的课程计划
    const courseHourToDelete = await db
      .select({
        id: courseHours.id,
        coursePlanId: courseHours.coursePlanId,
      })
      .from(courseHours)
      .where(eq(courseHours.id, planId))
      .limit(1);

    if (!courseHourToDelete.length) {
      return NextResponse.json({ error: '课程安排不存在' }, { status: 404 });
    }

    const { coursePlanId } = courseHourToDelete[0];

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

    // 检查该课程计划是否还有其他课程安排，如果没有则删除课程计划
    const remainingCourseHours = await db
      .select({ id: courseHours.id })
      .from(courseHours)
      .where(eq(courseHours.coursePlanId, coursePlanId))
      .limit(1);

    if (remainingCourseHours.length === 0) {
      // 没有其他课程安排使用此计划，需要删除课程计划
      // 但先要删除与该课程计划关联的课件
      
      // 1. 获取该课程计划关联的所有课件
      const coursePlanAttachments = await db
        .select({
          attachmentId: coursePlansToAttachments.attachmentId,
        })
        .from(coursePlansToAttachments)
        .where(eq(coursePlansToAttachments.coursePlanId, coursePlanId));

      if (coursePlanAttachments.length > 0) {
        const attachmentIds = coursePlanAttachments.map(att => att.attachmentId);
        
        // 2. 删除课程计划与课件的关联关系
        await db
          .delete(coursePlansToAttachments)
          .where(eq(coursePlansToAttachments.coursePlanId, coursePlanId));
        
        // 3. 删除课件本身
        await db
          .delete(attachments)
          .where(inArray(attachments.id, attachmentIds));
        
        console.log('已删除课程计划关联的课件:', attachmentIds);
      }
      
      // 4. 最后删除课程计划
      await db
        .delete(coursePlans)
        .where(eq(coursePlans.id, coursePlanId));
      
      console.log('已删除孤立的课程计划:', coursePlanId);
    }

    console.log('硬删除完成 - 课程安排ID:', planId, '课程计划ID:', coursePlanId);

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除课程安排失败:', error);
    return NextResponse.json({ error: '删除课程安排失败' }, { status: 500 });
  }
} 
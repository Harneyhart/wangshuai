import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { courseHours, teachersToCourseHours, assistantsToCourseHours, operatorsToCourseHours, coursePlans, courses, teachers, classes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from 'lucia';

// 获取课程安排
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('courseId');

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
      })
      .from(courseHours)
      .innerJoin(coursePlans, eq(courseHours.coursePlanId, coursePlans.id))
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
          col1: '', // 班级名称，需要从course_plans关联获取
          col2: theoryTeacher,
          col3: experimentTeacher,
          col4: assistant,
          col5: arrangement.classRoom,
          col6: `${weekDay} ${timeSlot}`,
          col7: '',
          col8: '',
          col9: '',
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

// 创建课程安排
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, classRoom, week, timeSlot, teacherIds } = body;

    if (!courseId) {
      return NextResponse.json({ error: '缺少课程ID' }, { status: 400 });
    }

    // 首先找到对应的coursePlan
    const coursePlan = await db
      .select()
      .from(coursePlans)
      .where(eq(coursePlans.courseId, courseId))
      .limit(1);

    if (!coursePlan.length) {
      return NextResponse.json({ error: '未找到课程计划' }, { status: 404 });
    }

    // 创建课程安排
    const courseHourId = generateId(15);
    const newCourseHour = await db
      .insert(courseHours)
      .values({
        id: courseHourId,
        coursePlanId: coursePlan[0].id,
        classRoom: classRoom || '',
        startTime: week || '', // 存储周几
        endTime: timeSlot || '', // 存储具体时间
      })
      .returning();

    // 创建教师关联
    if (teacherIds) {
      const promises = [];
      
      if (teacherIds.theory) {
        promises.push(
          db.insert(teachersToCourseHours).values({
            teacherId: teacherIds.theory,
            courseHourId: courseHourId,
          })
        );
      }
      
      if (teacherIds.experiment) {
        promises.push(
          db.insert(operatorsToCourseHours).values({
            operatorId: teacherIds.experiment,
            courseHourId: courseHourId,
          })
        );
      }
      
      if (teacherIds.assistant) {
        promises.push(
          db.insert(assistantsToCourseHours).values({
            assistantId: teacherIds.assistant,
            courseHourId: courseHourId,
          })
        );
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    }

    return NextResponse.json({
      success: true,
      data: newCourseHour[0],
    });
  } catch (error) {
    console.error('创建课程安排失败:', error);
    return NextResponse.json({ error: '创建课程安排失败' }, { status: 500 });
  }
}

// 更新课程安排
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, courseId, classRoom, week, timeSlot, teacherIds, col1, col2, col3, col4, col5, col6 } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少课程安排ID' }, { status: 400 });
    }

    // 更新课程安排基本信息
    const updateData: any = {};
    
    if (classRoom !== undefined) updateData.classRoom = classRoom;
    if (col5 !== undefined) updateData.classRoom = col5; // 教室从col5传入
    
    // 处理时间信息
    if (week !== undefined) {
      updateData.startTime = week; // 存储周几
    }
    if (timeSlot !== undefined) {
      updateData.endTime = timeSlot; // 存储具体时间
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();
      await db
        .update(courseHours)
        .set(updateData)
        .where(eq(courseHours.id, id));
    }

    // 删除旧的教师关联
    await Promise.all([
      db.delete(teachersToCourseHours).where(eq(teachersToCourseHours.courseHourId, id)),
      db.delete(operatorsToCourseHours).where(eq(operatorsToCourseHours.courseHourId, id)),
      db.delete(assistantsToCourseHours).where(eq(assistantsToCourseHours.courseHourId, id)),
    ]);

    // 重新创建教师关联
    if (teacherIds) {
      const promises = [];
      
      if (teacherIds.theory) {
        promises.push(
          db.insert(teachersToCourseHours).values({
            teacherId: teacherIds.theory,
            courseHourId: id,
          })
        );
      }
      
      if (teacherIds.experiment) {
        promises.push(
          db.insert(operatorsToCourseHours).values({
            operatorId: teacherIds.experiment,
            courseHourId: id,
          })
        );
      }

      if (teacherIds.assistant) {
        promises.push(
          db.insert(assistantsToCourseHours).values({
            assistantId: teacherIds.assistant,
            courseHourId: id,
          })
        );
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    }

    return NextResponse.json({
      success: true,
      message: '更新成功',
    });
  } catch (error) {
    console.error('更新课程安排失败:', error);
    return NextResponse.json({ error: '更新课程安排失败' }, { status: 500 });
  }
}

// 删除课程安排
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const courseHourId = searchParams.get('id');

    if (!courseHourId) {
      return NextResponse.json({ error: '缺少课程安排ID' }, { status: 400 });
    }

    // 彻底删除教师关联关系
    await Promise.all([
      db.delete(teachersToCourseHours).where(eq(teachersToCourseHours.courseHourId, courseHourId)),
      db.delete(operatorsToCourseHours).where(eq(operatorsToCourseHours.courseHourId, courseHourId)),
      db.delete(assistantsToCourseHours).where(eq(assistantsToCourseHours.courseHourId, courseHourId)),
    ]);

    // 彻底删除课程安排
    await db
      .delete(courseHours)
      .where(eq(courseHours.id, courseHourId));

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除课程安排失败:', error);
    return NextResponse.json({ error: '删除课程安排失败' }, { status: 500 });
  }
} 
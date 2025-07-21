import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { courseHours, teachersToCourseHours, assistantsToCourseHours, operatorsToCourseHours, coursePlans, courses, teachers, classes } from '@/lib/db/schema';
import { eq, and, ne, asc } from 'drizzle-orm';
import { generateId } from 'lucia';

// 获取课程安排
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('courseId');

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
      })
      .from(courseHours)
      .innerJoin(coursePlans, eq(courseHours.coursePlanId, coursePlans.id))
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
        // start_time存储周几，end_time存储具体时间
        const weekDay = arrangement.startTime || 1;
        const timeSlot = arrangement.endTime || 2;

        // 获取班级名称
        const coursePlanInfo = await db
          .select({ className: classes.name })
          .from(coursePlans)
          .leftJoin(classes, eq(coursePlans.classId, classes.id))
          .where(eq(coursePlans.id, arrangement.coursePlanId))
          .limit(1);

        // 处理占位符班级显示
        const className = coursePlanInfo[0]?.className || '';
        const displayClassName = className === '__EMPTY_PLACEHOLDER__' ? '' : className;

        return {
          id: arrangement.id,
          key: arrangement.id,
          col1: displayClassName, // 如果是占位符班级则显示为空
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
    const { courseId, classRoom, week, timeSlot, teacherIds, startTime, endTime } = body;

    if (!courseId) {
      return NextResponse.json({ error: '缺少课程ID' }, { status: 400 });
    }

    // 创建一个临时的课程计划，使用特殊的占位符班级ID
    // 为每个新增的课程安排创建独立的课程计划，避免班级冲突
    console.log('正在为新课程安排创建独立的课程计划...');
    
    // 创建一个特殊的占位符班级ID，表示"未指定班级"
    // 由于数据库要求classId不能为null，我们使用一个特殊的ID
    const placeholderClassId = 'placeholder_empty_class';
    
    // 检查是否存在占位符班级，如果不存在则创建
    let placeholderClass = await db
      .select()
      .from(classes)
      .where(eq(classes.id, placeholderClassId))
      .limit(1);
    
    if (!placeholderClass.length) {
      // 创建占位符班级
      await db.insert(classes).values({
        id: placeholderClassId,
        name: '__EMPTY_PLACEHOLDER__', // 特殊名称，前端会识别并显示为空
        isActive: 0, // 设为非活跃状态，避免在正常班级列表中显示
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('占位符班级已创建');
    }
    
    const currentYear = new Date().getFullYear();
    const newCoursePlanId = generateId(15);
    const newCoursePlan = await db
      .insert(coursePlans)
      .values({
        id: newCoursePlanId,
        courseId: courseId,
        classId: placeholderClassId, // 使用占位符班级ID
        year: currentYear,
        semester: 0,
        isActive: 1, // 确保课程计划是活跃状态，学生端才能看到
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    if (!newCoursePlan.length) {
      return NextResponse.json({ error: '创建课程计划失败' }, { status: 500 });
    }
    
    const coursePlan = newCoursePlan;

    // 创建课程安排
    const courseHourId = generateId(15);
    const newCourseHour = await db
      .insert(courseHours)
      .values({
        id: courseHourId,
        coursePlanId: coursePlan[0].id,
        classRoom: classRoom || '',
        startTime: startTime ? new Date(startTime) : new Date('2024-01-01T08:00:00'), // 使用传入的时间或默认值
        endTime: endTime ? new Date(endTime) : new Date('2024-01-01T10:00:00'),       // 使用传入的时间或默认值
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
    const { id, courseId, classRoom, week, timeSlot, teacherIds, col1, col2, col3, col4, col5, col6, startTime, endTime } = body;

    console.log('收到更新请求，ID:', id, '类型:', typeof id);
    console.log('完整请求数据:', body);
    console.log('时间字段 - startTime:', startTime, 'endTime:', endTime);

    if (!id) {
      return NextResponse.json({ error: '缺少课程安排ID' }, { status: 400 });
    }

    // 验证课程安排是否存在
    const existingCourseHour = await db
      .select()
      .from(courseHours)
      .where(eq(courseHours.id, id))
      .limit(1);

    if (!existingCourseHour.length) {
      console.error('课程安排不存在，ID:', id);
      return NextResponse.json({ error: `课程安排不存在，ID: ${id}` }, { status: 404 });
    }

    // 更新课程安排基本信息
    const updateData: any = {};
    
    if (classRoom !== undefined) updateData.classRoom = classRoom;
    if (col5 !== undefined) updateData.classRoom = col5; // 教室从col5传入
    
    // 处理班级信息更新
    if (col1 !== undefined && col1 !== '') {
      // 根据班级名称找到班级ID
      const selectedClass = await db
        .select()
        .from(classes)
        .where(eq(classes.name, col1))
        .limit(1);
        
      if (selectedClass.length > 0) {
        // 获取当前coursePlan信息
        const currentCoursePlan = await db
          .select()
          .from(coursePlans)
          .where(eq(coursePlans.id, existingCourseHour[0].coursePlanId))
          .limit(1);
          
        if (currentCoursePlan.length > 0) {
          const plan = currentCoursePlan[0];
          
          // 检查是否需要创建新的coursePlan
          // 如果当前coursePlan的classId已经是目标classId，则无需更改
          if (plan.classId !== selectedClass[0].id) {
                         // 检查是否有其他courseHours使用相同的coursePlan
             const otherCourseHours = await db
               .select()
               .from(courseHours)
               .where(and(
                 eq(courseHours.coursePlanId, plan.id),
                 // 排除当前正在编辑的courseHour
                 ne(courseHours.id, id)
               ));
              
            console.log('其他使用相同coursePlan的courseHours数量:', otherCourseHours.length);
            
            if (otherCourseHours.length > 0) {
              // 有其他courseHours使用相同的coursePlan，需要创建新的coursePlan
              const newCoursePlanId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              
              // 创建新的coursePlan
              await db.insert(coursePlans).values({
                id: newCoursePlanId,
                courseId: plan.courseId,
                classId: selectedClass[0].id,
                year: plan.year,
                semester: plan.semester,
                isActive: 1, // 确保新课程计划是活跃状态
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              
              // 更新当前courseHour指向新的coursePlan，同时更新updatedAt
              await db
                .update(courseHours)
                .set({ 
                  coursePlanId: newCoursePlanId,
                  updatedAt: new Date()
                })
                .where(eq(courseHours.id, id));
                
              console.log('创建新的coursePlan:', newCoursePlanId, '班级:', col1);
            } else {
              // 没有其他courseHours使用相同的coursePlan，可以直接更新
              await db
                .update(coursePlans)
                .set({ classId: selectedClass[0].id })
                .where(eq(coursePlans.id, plan.id));
                
              console.log('直接更新coursePlan班级信息:', col1, '-> ID:', selectedClass[0].id);
            }
          }
        }
      }
    }
    
    // 处理时间信息更新
    if (startTime !== undefined) {
      updateData.startTime = startTime ? new Date(startTime) : new Date('2024-01-01T08:00:00');
      console.log('设置开始时间:', updateData.startTime);
    }
    if (endTime !== undefined) {
      updateData.endTime = endTime ? new Date(endTime) : new Date('2024-01-01T10:00:00');
      console.log('设置结束时间:', updateData.endTime);
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
      console.log('开始创建教师关联，courseHourId:', id);
      console.log('教师IDs:', teacherIds);
      
      const promises = [];
      
      if (teacherIds.theory) {
        console.log('添加理论教师关联:', teacherIds.theory);
        promises.push(
          db.insert(teachersToCourseHours).values({
            teacherId: teacherIds.theory,
            courseHourId: id,
          })
        );
      }
      
      if (teacherIds.experiment) {
        console.log('添加实验教师关联:', teacherIds.experiment);
        promises.push(
          db.insert(operatorsToCourseHours).values({
            operatorId: teacherIds.experiment,
            courseHourId: id,
          })
        );
      }

      if (teacherIds.assistant) {
        console.log('添加助教关联:', teacherIds.assistant);
        promises.push(
          db.insert(assistantsToCourseHours).values({
            assistantId: teacherIds.assistant,
            courseHourId: id,
          })
        );
      }

      if (promises.length > 0) {
        console.log('执行', promises.length, '个教师关联插入操作');
        try {
          await Promise.all(promises);
          console.log('教师关联创建成功');
        } catch (error) {
          console.error('创建教师关联失败:', error);
          throw error; // 重新抛出错误以便外层捕获
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '课程安排更新成功',
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
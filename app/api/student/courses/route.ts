import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/validate-request';
import { queryStudentByUserId } from '@/utils/query';
import { db } from '@/lib/db';

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

    // 1. 通过students_to_classes表找到该学生所在的班级
    const studentClasses = await db.query.studentsToClasses.findMany({
      where: (table, { eq }) => eq(table.studentId, student.id),
      with: {
        class: true,
      },
    });

    if (studentClasses.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          studentId: student.id,
          studentName: student.name,
          courses: []
        }
      });
    }

    // 2. 获取所有班级ID
    const classIds = studentClasses.map(sc => sc.classId);

    // 3. 通过course_plans表找到这些班级对应的课程
    const coursePlans = await db.query.coursePlans.findMany({
      where: (table, { inArray, eq, and }) => and(
        inArray(table.classId, classIds),
        eq(table.isActive, 1)
      ),
      with: {
        course: true,
        class: true,
        homeworks: {
          where: (table, { eq }) => eq(table.isActive, 1),
          orderBy: (table, { desc }) => [desc(table.deadline)],
        },
      },
    });

    // 4. 格式化课程数据，按照新的逻辑获取教师名字
    const courses = await Promise.all(coursePlans.map(async (plan) => {
      // 根据course_plans的id获取教师名字
      const teacherNames = await getTeacherNamesByCoursePlanId(plan.id);
      
      // 根据course_plans的id获取上课地点
      const location = await getCourseLocationByCoursePlanId(plan.id);
      
      return {
        id: plan.course.id,
        name: plan.course.name,
        description: plan.course.description,
        className: plan.class.name,
        classId: plan.class.id,
        planId: plan.id,
        teacherNames: teacherNames.join('、') || '暂无教师',
        location: location || '暂无地点',
        homeworks: plan.homeworks.map(hw => ({
          id: hw.id,
          name: hw.name,
          description: hw.description,
          deadline: hw.deadline,
          isActive: hw.isActive,
        })),
        createdAt: plan.course.createdAt,
      };
    }));

    return NextResponse.json({
      success: true,
      data: {
        studentId: student.id,
        studentName: student.name,
        courses
      }
    });
  } catch (error) {
    console.error('查询学生课程失败:', error);
    return NextResponse.json({ error: '查询学生课程失败' }, { status: 500 });
  }
}

// 按照用户要求的步骤获取教师名字的函数
async function getTeacherNamesByCoursePlanId(coursePlanId: string): Promise<string[]> {
  try {
    // 1. 根据course_plans的id去course_hours表找course_plan_id列
    const courseHours = await db.query.courseHours.findMany({
      where: (table, { eq, and }) => and(
        eq(table.coursePlanId, coursePlanId),
        eq(table.isActive, 1)
      ),
    });

    if (courseHours.length === 0) {
      return [];
    }

    // 2. 获取所有course_hours的id
    const courseHourIds = courseHours.map(hour => hour.id);

    // 3. 根据course_hours表的id去teachers_to_course_hours表找course_hour_id列
    const teacherHourRelations = await db.query.teachersToCourseHours.findMany({
      where: (table, { inArray }) => inArray(table.courseHourId, courseHourIds),
    });

    if (teacherHourRelations.length === 0) {
      return [];
    }

    // 4. 获取所有teacher_id
    const teacherIds = teacherHourRelations.map(relation => relation.teacherId);

    // 5. 根据teacher_id去teachers表获取name
    const teachers = await db.query.teachers.findMany({
      where: (table, { inArray }) => inArray(table.id, teacherIds),
    });

    // 6. 提取教师名字并去重
    const teacherNamesSet = new Set(teachers.map(teacher => teacher.name).filter(name => name));
    const teacherNames = Array.from(teacherNamesSet);

    return teacherNames;
  } catch (error) {
    console.error('获取教师名字失败:', error);
    return [];
  }
} 

// 获取上课地点
async function getCourseLocationByCoursePlanId(coursePlanId: string): Promise<string> {
  try {
    const courseHours = await db.query.courseHours.findMany({
      where: (table, { eq, and }) => and(
        eq(table.coursePlanId, coursePlanId),
        eq(table.isActive, 1)
      ),
      columns: {
        classRoom: true,
      },
    });

    if (courseHours.length === 0) {
      return '';
    }

    // 如果有多个课时，取第一个非空的教室，或者用逗号分隔多个教室
    const classRooms = courseHours
      .map(hour => hour.classRoom)
      .filter(room => room && room.trim() !== '');

    if (classRooms.length === 0) {
      return '暂无教室安排';
    }

    // 去重并用"、"连接多个教室
    const uniqueRooms = Array.from(new Set(classRooms));
    return uniqueRooms.join('、');
  } catch (error) {
    console.error('获取上课地点失败:', error);
    return '获取地点失败';
  }
}
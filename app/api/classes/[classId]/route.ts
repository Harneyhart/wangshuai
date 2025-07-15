import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  classes, 
  studentsToClasses, 
  coursePlans, 
  courseHours, 
  teachersToCourseHours,
  assistantsToCourseHours,
  operatorsToCourseHours,
  homeworks,
  submissions,
  submissionsToAttachments,
  coursePlansToAttachments
} from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { validateRequest } from '@/lib/auth/validate-request';

// 删除班级及其所有相关数据
export async function DELETE(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    // 验证用户登录状态
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: '用户未登录' }, { status: 401 });
    }

    const { classId } = params;

    if (!classId) {
      return NextResponse.json({ error: '班级ID不能为空' }, { status: 400 });
    }

    // 检查班级是否存在
    const existingClass = await db.query.classes.findFirst({
      where: (table, { eq }) => eq(table.id, classId),
    });

    if (!existingClass) {
      return NextResponse.json({ error: '班级不存在' }, { status: 404 });
    }

    // 在事务中执行删除操作，确保数据一致性
    await db.transaction(async (tx) => {
      // 1. 获取该班级的所有课程计划
      const classCoursePlans = await tx.query.coursePlans.findMany({
        where: (table, { eq }) => eq(table.classId, classId),
      });

      if (classCoursePlans.length > 0) {
        const coursePlanIds = classCoursePlans.map(cp => cp.id);

        // 2. 获取这些课程计划下的所有课时
        const classCourseHours = await tx.query.courseHours.findMany({
          where: (table, { inArray }) => inArray(table.coursePlanId, coursePlanIds),
        });

        if (classCourseHours.length > 0) {
          const courseHourIds = classCourseHours.map(ch => ch.id);

          // 3. 删除课时相关的教师、助教、实验员关系
          await tx.delete(teachersToCourseHours)
            .where(inArray(teachersToCourseHours.courseHourId, courseHourIds));
          
          await tx.delete(assistantsToCourseHours)
            .where(inArray(assistantsToCourseHours.courseHourId, courseHourIds));
          
          await tx.delete(operatorsToCourseHours)
            .where(inArray(operatorsToCourseHours.courseHourId, courseHourIds));

          // 4. 删除课时记录
          await tx.delete(courseHours)
            .where(inArray(courseHours.coursePlanId, coursePlanIds));
        }

        // 5. 获取该班级的所有作业
        const classHomeworks = await tx.query.homeworks.findMany({
          where: (table, { inArray }) => inArray(table.coursePlanId, coursePlanIds),
        });

        if (classHomeworks.length > 0) {
          const homeworkIds = classHomeworks.map(hw => hw.id);

          // 6. 获取这些作业的所有提交
          const homeworkSubmissions = await tx.query.submissions.findMany({
            where: (table, { inArray }) => inArray(table.homeworkId, homeworkIds),
          });

          if (homeworkSubmissions.length > 0) {
            const submissionIds = homeworkSubmissions.map(sub => sub.id);

            // 7. 删除提交的附件关系
            await tx.delete(submissionsToAttachments)
              .where(inArray(submissionsToAttachments.submissionId, submissionIds));

            // 8. 删除提交记录
            await tx.delete(submissions)
              .where(inArray(submissions.homeworkId, homeworkIds));
          }

          // 9. 删除作业记录
          await tx.delete(homeworks)
            .where(inArray(homeworks.coursePlanId, coursePlanIds));
        }

        // 10. 删除课程计划的附件关系
        await tx.delete(coursePlansToAttachments)
          .where(inArray(coursePlansToAttachments.coursePlanId, coursePlanIds));

        // 11. 删除课程计划
        await tx.delete(coursePlans)
          .where(eq(coursePlans.classId, classId));
      }

      // 12. 删除学生-班级关系
      await tx.delete(studentsToClasses)
        .where(eq(studentsToClasses.classId, classId));

      // 13. 最后删除班级本身
      await tx.delete(classes)
        .where(eq(classes.id, classId));
    });

    return NextResponse.json({
      success: true,
      message: `班级"${existingClass.name}"及其所有相关数据已成功删除`,
      data: {
        deletedClassId: classId,
        deletedClassName: existingClass.name
      }
    });

  } catch (error) {
    console.error('删除班级失败:', error);
    return NextResponse.json({ 
      error: '删除班级失败，请稍后重试',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
} 
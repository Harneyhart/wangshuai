import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '@/lib/db/schema';
import { db } from '@/lib/db';

import { sql, eq, and, desc, relations, inArray, SQL } from 'drizzle-orm';
import type { UpsertUploadFileItem } from '@/lib/course/actions';

type DB = PostgresJsDatabase<typeof schema>;

export async function queryDemoNotes(user_id: string) {
  try {
    return await db.query.demoNotes.findMany({
      where: (list, { eq, and }) =>
        and(eq(list.is_active, 1), eq(list.user_id, user_id)),
    });
  } catch (error) {
    throw new Error('queryDemoNotes error');
  }
}
export async function queryUsers() {
  try {
    return await db.query.users.findMany({
      where: (list, { eq }) => eq(list.isActive, 1),
      columns: {
        hashedPassword: false,
      },
    });
  } catch (error) {
    throw new Error('queryUsers error');
  }
}
// query user by id
export async function queryUserById(id: string) {
  try {
    return await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.id, id),
      columns: {
        hashedPassword: false,
      },
    });
  } catch (error) {
    throw new Error('queryUserById error');
  }
}
// delete user by id
export async function deleteUserById(id: string) {
  try {
    return await db
      .delete(schema.users)
      .where(eq(schema.users.id, id))
      .returning();
  } catch (error) {
    throw new Error('deleteUser error');
  }
}
// upsert user
export async function upsertUser(user: schema.UserInsert) {
  try {
    return await db.insert(schema.users).values(user).returning();
  } catch (error) {
    console.error(error);
    throw new Error('upsertUser error');
  }
}
export async function upsertDemoNotes(note: schema.DemoNotesInsert) {
  console.log('note', note);
  try {
    return await db.insert(schema.demoNotes).values(note).returning();
  } catch (error) {
    console.error(error);
    throw new Error('upsertDemoNotes error');
  }
}
export async function queryStudents() {
  try {
    return await db.query.students.findMany({
      with: {
        user: {
          columns: {
            hashedPassword: false,
          },
        },
        classes: {
          with: {
            class: true,
          },
        },
      },
    });
  } catch (error) {
    throw new Error('queryStudents error');
  }
}
// get student by user id
export async function queryStudentByUserId(userId: string) {
  try {
    return await db.query.students.findFirst({
      where: (table, { eq }) => eq(table.userId, userId),
      with: {
        user: {
          columns: {
            hashedPassword: false,
          },
        },
        classes: {
          with: {
            class: true,
          },
        },
      },
    });
  } catch (error) {
    throw new Error('queryStudentByUserId error');
  }
}
export async function deleteStudentById(id: string) {
  try {
    return await db
      .delete(schema.students)
      .where(eq(schema.students.id, id))
      .returning();
  } catch (error) {
    throw new Error('deleteStudent error');
  }
}
export async function upsertStudents(student: schema.StudentInsert) {
  console.log('student', student);
  try {
    return await db.insert(schema.students).values(student).returning();
  } catch (error) {
    console.error(error);
    throw new Error('upsertStudents error');
  }
}
export async function upsertTeacher(teacher: schema.TeacherInsert) {
  try {
    return await db.insert(schema.teachers).values(teacher).returning();
  } catch (error) {
    console.error(error);
    throw new Error('upsertTeachers error');
  }
}
export async function queryTeachers() {
  try {
    return await db.query.teachers.findMany({
      with: {
        user: {
          columns: {
            hashedPassword: false,
          },
        },
      },
    });
  } catch (error) {
    throw new Error('queryTeachers error');
  }
}
// query teacher by user id
export async function queryTeacherByUserId(userId: string) {
  try {
    return await db.query.teachers.findFirst({
      where: (table, { eq }) => eq(table.userId, userId),
      with: {
        user: {
          columns: {
            hashedPassword: false,
          },
        },
      },
    });
  } catch (error) {
    throw new Error('queryTeacherByUserId error');
  }
}
export async function deleteTeacherById(id: string) {
  try {
    return await db
      .delete(schema.teachers)
      .where(eq(schema.teachers.id, id))
      .returning();
  } catch (error) {
    throw new Error('deleteTeacher error');
  }
}
// query courses
export async function queryCourses() {
  try {
    return await db.query.courses.findMany({
      // where: (table, { eq }) => eq(table.isActive, 1),
      orderBy: (table) => [desc(table.createdAt)],
      with: {
        cover: true,
        plans: {
          with: {
            class: true,
            hours: true,
          },
        },
      },
    });
  } catch (error) {
    console.log('error', error);
    throw new Error('queryCourses error');
  }
}
// query course by id
export async function queryCourseById(id: string) {
  try {
    return await db.query.courses.findFirst({
      where: (course, { eq }) => eq(course.id, id),
      with: {
        plans: true,
      },
    });
  } catch (error) {
    throw new Error('queryCourseById error');
  }
}
// update course
export async function updateCourse(course: schema.CourseInsert) {
  try {
    return await db
      .update(schema.courses)
      .set(course)
      .where(eq(schema.courses.id, course.id))
      .returning();
  } catch (error) {
    console.error(error);
    throw new Error('updateCourse error');
  }
}
// upsert course
export async function upsertCourse(course: schema.CourseInsert) {
  try {
    return await db.insert(schema.courses).values(course).returning();
  } catch (error) {
    console.error(error);
    throw new Error('upsertCourse error');
  }
}
// delete course by id
export async function deleteCourseById(id: string) {
  try {
    return await db
      .update(schema.courses)
      .set({ isActive: 0 })
      .where(eq(schema.courses.id, id))
      .returning();
  } catch (error) {
    throw new Error('deleteCourse error');
  }
}
// upsert class
export async function upsertClass(classInfo: schema.ClassInsert) {
  try {
    return await db.insert(schema.classes).values(classInfo).returning();
  } catch (error) {
    console.error(error);
    throw new Error('upsertClass error');
  }
}
// query classes
export async function queryClasses() {
  try {
    return await db.query.classes.findMany({
      where: (table, { eq }) => eq(table.isActive, 1),
      orderBy: (table) => [desc(table.updatedAt)],
      with: {
        students: {
          with: {
            student: true,
          },
        },
        plans: {
          where: (plan, { eq }) => eq(plan.isActive, 1),
          with: {
            course: true,
            homeworks: {
              // 按照 deadline 排序
              orderBy: (table) => [desc(table.deadline)],
              where: (table, { eq }) => eq(table.isActive, 1),
            },
            attachments: {
              with: {
                attachment: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    throw new Error('queryClasses error');
  }
}
// query class by id
export async function queryClassById(id: string) {
  try {
    return await db.query.classes.findFirst({
      where: (table, { eq }) => eq(table.id, id),
      with: {
        students: true,
      },
    });
  } catch (error) {
    throw new Error('queryClassById error');
  }
}

/**
 * 查询课程列表
 */
export async function queryCourseOptions() {
  try {
    return await db
      .select({ label: schema.courses.name, value: schema.courses.id })
      .from(schema.courses)
      .where(and(eq(schema.courses.isActive, 1)));
  } catch (error) {
    console.error(error);
    throw new Error('queryCourseOptions error');
  }
}

export async function queryClassOptions(courseId?: string) {
  try {
    const filters: SQL[] = [eq(schema.coursePlans.isActive, 1)];

    if (courseId) {
      filters.push(eq(schema.coursePlans.courseId, courseId));
    }

    const classIds = await db
      .selectDistinct({ classId: schema.coursePlans.classId })
      .from(schema.coursePlans)
      .where(and(...filters));

    if (classIds.length === 0) return [];

    const ids = classIds.map((item) => item.classId);

    return await db
      .select({ label: schema.classes.name, value: schema.classes.id })
      .from(schema.classes)
      .where(
        and(eq(schema.classes.isActive, 1), inArray(schema.classes.id, ids)),
      );
  } catch (error) {
    console.error(error);
    throw new Error('queryClassOptions error, ' + courseId);
  }
}

export async function queryHomeworkOptions(
  courseId?: string,
  classId?: string,
  homeworkId?: string,
) {
  try {
    const filters: SQL[] = [eq(schema.coursePlans.isActive, 1)];

    if (courseId) {
      filters.push(eq(schema.coursePlans.courseId, courseId));
    }

    if (classId) {
      filters.push(eq(schema.coursePlans.classId, classId));
    }

    const idArr = await db
      .select({ id: schema.coursePlans.id })
      .from(schema.coursePlans)
      .where(and(...filters));

    if (idArr.length === 0) return [];

    let ids = idArr.map((item) => item.id);

    const homeworkOptions = await db
      .select({ label: schema.homeworks.name, value: schema.homeworks.id })
      .from(schema.homeworks)
      .where(
        and(
          eq(schema.homeworks.isActive, 1),
          inArray(schema.homeworks.coursePlanId, ids),
        ),
      );

    if (homeworkId) {
      return homeworkOptions.filter((item) => item.value === homeworkId);
    }

    return homeworkOptions;
  } catch (error) {
    console.error('queryHomeworkOptions', error);
  }
}

/**
 * 根据课程id/班级id/作业id查询作业列表
 */
export async function querySubmissionList(options: {
  courseId?: string;
  classId?: string;
  homeworkId?: string;
}) {
  try {
    const { courseId, classId, homeworkId } = options;

    if (!courseId && !classId && !homeworkId) {
      return await querySubmissions();
    }

    const homeworkOptions = await queryHomeworkOptions(
      courseId,
      classId,
      homeworkId,
    );

    if (!homeworkOptions || homeworkOptions.length === 0) return [];

    const homeworkIds = homeworkOptions.map((i) => i.value);

    return await db.query.submissions.findMany({
      where: (table, { inArray, and, eq }) =>
        and(eq(table.isActive, 1), inArray(table.homeworkId, homeworkIds)),
      orderBy: (table) => [desc(table.createdAt)],
      with: {
        student: {
          with: {
            user: true,
          },
        },
        homework: {
          with: {
            plan: {
              with: {
                class: true,
                course: true,
              },
            },
          },
        },
        attachments: {
          with: {
            attachment: true,
          },
        },
      },
    });
  } catch (error) {
    console.log(error);
    throw new Error('querySubmissionList error');
  }
}

export async function queryHomeworkStatistic(
  classId: string,
  homeworkId: string,
) {
  try {
    // 查出班级里的所有学生
    const data = await db
      .select()
      .from(schema.studentsToClasses)
      .where(eq(schema.studentsToClasses.classId, classId));

    const studentIdList = data.map((item) => item.studentId);

    if (!studentIdList) {
      return null;
    }

    const submission = await db
      .select()
      .from(schema.submissions)
      .where(
        and(
          eq(schema.submissions.homeworkId, homeworkId),
          eq(schema.submissions.isActive, 1),
          inArray(schema.submissions.studentId, studentIdList),
        ),
      );

    const submittedStudentIdList = submission.map((item) => item.studentId);

    const submitted: Array<string> = [];
    const unSubmitted: Array<string> = [];

    studentIdList.forEach((student) => {
      if (submittedStudentIdList.includes(student)) {
        submitted.push(student);
      } else {
        unSubmitted.push(student);
      }
    });

    const submittedStudentes =
      submitted.length > 0
        ? await db.query.students.findMany({
            where(fields, operators) {
              return operators.inArray(fields.id, submitted);
            },
          })
        : [];
    const unSubmittedStudentes =
      unSubmitted.length > 0
        ? await db.query.students.findMany({
            where(fields, operators) {
              return operators.inArray(fields.id, unSubmitted);
            },
          })
        : [];

    return {
      allStudent: studentIdList,
      submittedStudentes: submittedStudentes.map((item) => ({
        id: item.id,
        name: item.name,
      })),
      unSubmittedStudentes: unSubmittedStudentes.map((item) => ({
        id: item.id,
        name: item.name,
      })),
    };
  } catch (e) {
    console.error(e);
    return null;
  }
}

// update class
export async function updateClass(classInfo: schema.ClassInsert) {
  try {
    return await db
      .update(schema.classes)
      .set(classInfo)
      .where(eq(schema.classes.id, classInfo.id))
      .returning();
  } catch (error) {
    console.error(error);
    throw new Error('updateClass error');
  }
}
// delete class by id
export async function deleteClassById(id: string) {
  try {
    return await db
      .update(schema.classes)
      .set({ isActive: 0 })
      .where(eq(schema.classes.id, id))
      .returning();
  } catch (error) {
    throw new Error('deleteClass error');
  }
}
// upsert student to class
export async function upsertStudentsToClass(
  students: schema.StudentToClassInsert[],
) {
  try {
    return await db
      .insert(schema.studentsToClasses)
      .values(students)
      .returning();
  } catch (error) {
    console.error(error);
    throw new Error('upsertStudentsToClass error');
  }
}
// query class list by student id
export async function queryClassByStudentId(studentId: string) {
  try {
    return await db.query.studentsToClasses.findMany({
      where: (table, { eq }) => eq(table.studentId, studentId),
      with: {
        class: true,
      },
    });
  } catch (error) {
    throw new Error('queryClassByStudentId error');
  }
}
// delete student to class by class id
export async function deleteStudentsToClassByClassId(classId: string) {
  try {
    return await db
      .delete(schema.studentsToClasses)
      .where(eq(schema.studentsToClasses.classId, classId))
      .returning();
  } catch (error) {
    console.error(error);
    throw new Error('deleteStudentsToClassByClassId error');
  }
}
// query all course plans
export async function queryCoursePlans() {
  try {
    return await db.query.coursePlans.findMany({
      where: (table, { eq }) => eq(table.isActive, 1),
      with: {
        class: true,
        course: true,
      },
    });
  } catch (error) {
    throw new Error('queryCoursePlans error');
  }
}
// upsert course plan
export async function upsertCoursePlan(coursePlan: schema.CoursePlanInsert) {
  try {
    return await db.insert(schema.coursePlans).values(coursePlan).returning();
  } catch (error) {
    console.error(error);
    throw new Error('upsertCoursePlan error');
  }
}
// query course plan by class id list
export async function queryCoursePlansByClassIdList(classIdList: string[]) {
  try {
    return await db.query.coursePlans.findMany({
      where: (table, { inArray }) =>
        and(inArray(table.classId, classIdList), eq(table.isActive, 1)),
      with: {
        class: true,
        course: true,
      },
    });
  } catch (error) {
    throw new Error('queryCoursePlansByClassIdList error');
  }
}
// export async function queryCoursePlansByClassId(classId: string) {
//   try {
//     return await db.query.coursePlans.findMany({
//       where: (table, { eq, and }) =>
//         and(eq(table.classId, classId), eq(table.isActive, 1)),
//       with: {
//         class: true,
//         course: true,
//       },
//     });
//   } catch (error) {
//     throw new Error('queryCoursePlansByClassId error');
//   }
// }
// delete course plan by id
export async function deleteCoursePlanById(id: string) {
  try {
    return await db
      .update(schema.coursePlans)
      .set({ isActive: 0 })
      .where(eq(schema.coursePlans.id, id))
      .returning();
  } catch (error) {
    throw new Error('deleteCoursePlan error');
  }
}
// query all course hours
export async function queryCourseHours() {
  try {
    return await db.query.courseHours.findMany({
      where: (table, { eq }) => eq(table.isActive, 1),
      with: {
        teachers: {
          with: {
            teacher: true,
          },
        },
        assistants: {
          with: {
            teacher: true,
          },
        },
        operators: {
          with: {
            teacher: true,
          },
        },
        plan: {
          with: {
            class: true,
            course: true,
            homeworks: true,
            attachments: {
              with: {
                attachment: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    throw new Error('queryCourseHours error');
  }
}
// upsert course hour
export async function upsertCourseHour(courseHour: schema.CourseHourInsert) {
  try {
    return await db.insert(schema.courseHours).values(courseHour).returning();
  } catch (error) {
    console.error(error);
    throw new Error('upsertCourseHour error');
  }
}
// update course hour
export async function updateCourseHour(courseHour: schema.CourseHourInsert) {
  try {
    return await db
      .update(schema.courseHours)
      .set(courseHour)
      .where(eq(schema.courseHours.id, courseHour.id))
      .returning();
  } catch (error) {
    console.error(error);
    throw new Error('updateCourseHour error');
  }
}
// update course plan
export async function updateCoursePlan(coursePlan: schema.CoursePlanInsert) {
  try {
    return await db
      .update(schema.coursePlans)
      .set(coursePlan)
      .where(eq(schema.coursePlans.id, coursePlan.id))
      .returning();
  } catch (error) {
    console.error(error);
    throw new Error('updateCoursePlan error');
  }
}
// query course plan by id
export async function queryCoursePlanById(id: string) {
  try {
    return await db.query.coursePlans.findFirst({
      where: (table, { eq }) => eq(table.id, id),
    });
  } catch (error) {
    throw new Error('queryCoursePlanById error');
  }
}
// query course plans by courseId
export async function queryCoursePlansByCourseId(courseId: string) {
  try {
    return await db.query.coursePlans.findMany({
      where: (table, { eq }) => eq(table.courseId, courseId),
    });
  } catch (error) {
    throw new Error('queryCoursePlansByCourseId error');
  }
}
// query course hours by coursePlanId list
export async function queryCourseHoursByCoursePlanIdList(
  coursePlanIdList: string[],
) {
  try {
    return await db.query.courseHours.findMany({
      where: (table, { inArray }) =>
        inArray(table.coursePlanId, coursePlanIdList),
      with: {
        teachers: {
          with: {
            teacher: true,
          },
        },
        assistants: {
          with: {
            teacher: true,
          },
        },
        operators: {
          with: {
            teacher: true,
          },
        },
        plan: {
          with: {
            class: true,
            course: true,
            homeworks: true,
            attachments: {
              with: {
                attachment: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    throw new Error('queryCourseHoursByCoursePlanIdList error');
  }
}
// delete course hour by id
export async function deleteCourseHourById(id: string) {
  try {
    return await db
      .update(schema.courseHours)
      .set({ isActive: 0 })
      .where(eq(schema.courseHours.id, id))
      .returning();
  } catch (error) {
    console.error('删除课时失败:', error);
    throw new Error(`删除课时失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}
// query course hour by id
export async function queryCourseHourById(id: string) {
  try {
    return await db.query.courseHours.findFirst({
      where: (table, { eq, and }) =>
        and(eq(table.id, id), eq(table.isActive, 1)),
      with: {
        teachers: {
          with: {
            teacher: true,
          },
        },
        assistants: {
          with: {
            teacher: true,
          },
        },
        operators: {
          with: {
            teacher: true,
          },
        },
        plan: {
          with: {
            class: true,
            course: true,
            homeworks: {
              where: (table, { eq }) => eq(table.isActive, 1),
            },
            attachments: {
              with: {
                attachment: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    throw new Error('queryCourseHourById error');
  }
}
// upsert teachers to course hour
export async function upsertTeachersToCourseHour(
  teachers: schema.TeacherToCourseHourInsert[],
) {
  try {
    return await db
      .insert(schema.teachersToCourseHours)
      .values(teachers)
      .returning();
  } catch (error) {
    console.error(error);
    throw new Error('upsertTeachersToCourseHour error');
  }
}
// delete teachers to course hour by course hour id
export async function deleteTeachersToCourseHourByCourseHourId(
  courseHourId: string,
) {
  try {
    return await db
      .delete(schema.teachersToCourseHours)
      .where(eq(schema.teachersToCourseHours.courseHourId, courseHourId))
      .returning();
  } catch (error) {
    console.error('删除教师关联关系失败:', error);
    throw new Error(`删除教师关联关系失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}
// upsert assistants to course hour
export async function upsertAssistantsToCourseHour(
  assistants: schema.AssistantToCourseHourInsert[],
) {
  try {
    return await db
      .insert(schema.assistantsToCourseHours)
      .values(assistants)
      .returning();
  } catch (error) {
    console.error(error);
    throw new Error('upsertAssistantsToCourseHour error');
  }
}
// delete assistants to course hour by course hour id
export async function deleteAssistantsToCourseHourByCourseHourId(
  courseHourId: string,
) {
  try {
    return await db
      .delete(schema.assistantsToCourseHours)
      .where(eq(schema.assistantsToCourseHours.courseHourId, courseHourId))
      .returning();
  } catch (error) {
    console.error('删除助教关联关系失败:', error);
    throw new Error(`删除助教关联关系失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}
// upsert operators to course hour
export async function upsertOperatorsToCourseHour(
  operators: schema.OperatorToCourseHourInsert[],
) {
  try {
    return await db
      .insert(schema.operatorsToCourseHours)
      .values(operators)
      .returning();
  } catch (error) {
    console.error(error);
    throw new Error('upsertOperatorsToCourseHour error');
  }
}
// delete operators to course hour by course hour id
export async function deleteOperatorsToCourseHourByCourseHourId(
  courseHourId: string,
) {
  try {
    return await db
      .delete(schema.operatorsToCourseHours)
      .where(eq(schema.operatorsToCourseHours.courseHourId, courseHourId))
      .returning();
  } catch (error) {
    console.error('删除操作员关联关系失败:', error);
    throw new Error(`删除操作员关联关系失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}
// upsert homeworks
export async function upsertHomeworks(homework: schema.HomeworkInsert) {
  try {
    return await db.insert(schema.homeworks).values(homework).returning();
  } catch (error) {
    console.error(error);
    throw new Error('upsertHomeworks error');
  }
}
// query all homeworks
export async function queryHomeworks() {
  try {
    return await db.query.homeworks.findMany({
      where: (table, { eq }) => eq(table.isActive, 1),
      with: {
        plan: {
          with: {
            class: true,
            course: true,
          },
        },
        submissions: {
          with: {
            student: true,
            attachments: {
              with: {
                attachment: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    throw new Error('queryHomeworks error');
  }
}
// delete homeworks
export async function deleteHomeworksByCourseId(homeworkId: string) {
  console.log('homeworkId', homeworkId);
  try {
    return await db
      .update(schema.homeworks)
      .set({ isActive: 0 })
      .where(eq(schema.homeworks.id, homeworkId))
      .returning();
  } catch (error) {
    console.error(error);
    throw new Error('deleteHomeworksByCourseId error');
  }
}
// update homework
export async function updateHomework(homework: schema.HomeworkInsert) {
  try {
    return await db
      .update(schema.homeworks)
      .set(homework)
      .where(eq(schema.homeworks.id, homework.id))
      .returning();
  } catch (error) {
    console.error(error);
    throw new Error('updateHomework error');
  }
}
// upsert submissions
export async function upsertSubmissions(submission: schema.SubmissionInsert) {
  // 同一个 studentId 和 homeworkId 只能提交一次作业
  try {
    // 查找是否已经提交过
    const res = await db.query.submissions.findFirst({
      where: (table, { eq, and }) =>
        and(
          eq(table.studentId, submission.studentId),
          eq(table.homeworkId, submission.homeworkId),
        ),
    });
    if (res) {
      throw new Error('已经提交过作业');
    }
    return await db.insert(schema.submissions).values(submission).returning();
  } catch (error) {
    console.error(error);
    throw new Error('upsertSubmissions error');
  }
}

export async function querySubmissionById(submissionId: string) {
  try {
    return await db.query.submissions.findFirst({
      where: (table, { eq }) => eq(table.id, submissionId),
      with: {
        attachments: {
          with: {
            attachment: true,
          },
        },
      },
    });
  } catch (error) {
    throw new Error('querySubmissionById error, ' + submissionId);
  }
}

// query submissions by student id and homework id
export async function querySubmissionsByStudentIdAndHomeworkId(
  studentId: string,
  homeworkId: string,
) {
  try {
    return await db.query.submissions.findMany({
      where: (table, { eq, and }) =>
        and(eq(table.studentId, studentId), eq(table.homeworkId, homeworkId)),
      with: {
        student: {
          with: {
            user: true,
          },
        },
        homework: {
          with: {
            plan: {
              with: {
                class: true,
                course: true,
              },
            },
          },
        },
        attachments: {
          with: {
            attachment: true,
          },
        },
      },
    });
  } catch (error) {
    throw new Error('querySubmissionsByUserIdAndHomeworkId error');
  }
}
// query submissions by homework id
export async function querySubmissionsByHomeworkId(homeworkId: string) {
  try {
    return await db.query.submissions.findMany({
      where: (table, { eq, and }) =>
        and(eq(table.homeworkId, homeworkId), eq(table.isActive, 1)),
      with: {
        student: {
          with: {
            user: true,
          },
        },
        homework: {
          with: {
            plan: {
              with: {
                class: true,
                course: true,
              },
            },
          },
        },
        attachments: {
          with: {
            attachment: true,
          },
        },
      },
    });
  } catch (error) {
    throw new Error('querySubmissionsByHomeworkId error');
  }
}
// query all submissions
export async function querySubmissions() {
  try {
    const list = await db.query.submissions.findMany({
      orderBy: (table) => [desc(table.createdAt)],
      with: {
        student: {
          with: {
            user: true,
          },
        },
        homework: {
          with: {
            plan: {
              with: {
                class: true,
                course: true,
              },
            },
          },
        },
        attachments: {
          with: {
            attachment: true,
          },
        },
      },
    });
    // 过滤删除homeWork的数据
    return list.filter((item) => item.homework.isActive === 1);
  } catch (error) {
    throw new Error('querySubmissions error');
  }
}

// 根据submission id列表查询全部根据submission数据
export async function querySubmissionsByIds(ids: Array<string>) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  try {
    const list = await db.query.submissions.findMany({
      where: (table, { eq, and, inArray }) =>
        and(eq(table.isActive, 1), inArray(table.id, ids)),
      with: {
        student: {
          with: {
            user: true,
          },
        },
        homework: {
          with: {
            plan: {
              with: {
                class: true,
                course: true,
              },
            },
          },
        },
      },
    });

    return list;
  } catch (e) {
    console.error('querySubmissionsByIds error', e);
    return [];
  }
}

// upsert attachments to submission
export async function upsertAttachmentsToSubmission(
  attachments: schema.SubmissionToAttachmentInsert[],
) {
  if (attachments.length === 0) {
    return [];
  }
  try {
    return await db
      .insert(schema.submissionsToAttachments)
      .values(attachments)
      .returning();
  } catch (error) {
    console.error(error);
    throw new Error('upsertAttachmentsToSubmission error');
  }
}

/**
 * 删除指定的关联数据
 */
export async function deleteSubmissionsToAttachment(
  filters: UpsertUploadFileItem,
) {
  try {
    const all = await db.query.attachments.findMany({
      where: (table, { inArray }) =>
        inArray(
          table.fileKey,
          filters.map((i) => i.fileKey),
        ),
    });

    const ids = all.map((item) => item.id);

    return await db
      .delete(schema.submissionsToAttachments)
      .where(inArray(schema.submissionsToAttachments.attachmentId, ids));
  } catch (error) {
    console.error(error);
    throw new Error('deleteSubmissionToAttachmentBySubmissionId error');
  }
}

// delete submissions
export async function deleteSubmissionsByHomeworkId(homeworkId: string) {
  try {
    return await db
      .update(schema.submissions)
      .set({ isActive: 0 })
      .where(eq(schema.submissions.homeworkId, homeworkId))
      .returning();
  } catch (error) {
    console.error(error);
    throw new Error('deleteSubmissionsByHomeworkId error');
  }
}
// update submission
export async function updateSubmission(submission: schema.SubmissionInsert) {
  try {
    return await db
      .update(schema.submissions)
      .set(submission)
      .where(eq(schema.submissions.id, submission.id))
      .returning();
  } catch (error) {
    console.error(error);
    throw new Error('updateSubmission error');
  }
}
// upsert attachments
export async function upsertAttachments(attachment: schema.AttachmentInsert[]) {
  if (attachment.length === 0) {
    return [];
  }
  try {
    return await db.insert(schema.attachments).values(attachment).returning();
  } catch (error) {
    console.error(error);
    throw new Error('upsertAttachments error');
  }
}
// query attachments by course plan id
export async function queryAttachmentsByCoursePlanId(coursePlanId: string) {
  try {
    // 通过 coursePlanId 从 coursePlansToAttachments 找到对应的 attachmentId
    const res = await db.query.coursePlansToAttachments.findMany({
      where: (table, { eq }) => eq(table.coursePlanId, coursePlanId),
      with: {
        attachment: true,
        coursePlan: true,
      },
    });
    return res;
  } catch (error) {
    throw new Error('queryAttachmentsByCoursePlanId error');
  }
}
// upsert attachments to course plan
export async function upsertAttachmentsToCoursePlan(
  attachments: schema.CoursePlanToAttachmentInsert[],
) {
  try {
    return await db
      .insert(schema.coursePlansToAttachments)
      .values(attachments)
      .returning();
  } catch (error) {
    console.error(error);
    throw new Error('upsertAttachmentsToCoursePlan error');
  }
}

// query all attachments
export async function queryAllAttachments() {
  try {
    const res = await db.query.attachments.findMany({
      orderBy: (table) => [desc(table.createdAt)],
      with: {
        coursePlansToAttachments: {
          with: {
            coursePlan: {
              with: {
                course: true,
                class: true,
              },
            },
          },
        },
      },
    });
    return res;
  } catch (error) {
    throw new Error('queryAllAttachments error');
  }
}

// delete attachment by id
export async function deleteAttachmentById(id: string) {
  try {
    // 首先删除关联表中的数据
    await db
      .delete(schema.coursePlansToAttachments)
      .where(eq(schema.coursePlansToAttachments.attachmentId, id));
    
    // 然后删除附件表中的数据
    return await db
      .delete(schema.attachments)
      .where(eq(schema.attachments.id, id))
      .returning();
  } catch (error) {
    console.error(error);
    throw new Error('deleteAttachmentById error');
  }
}

'use server';

import { generateId, Scrypt } from 'lucia';
import type { UploadFile } from 'antd';

import {
  queryStudents,
  queryTeachers,
  queryUsers,
  upsertStudents,
  upsertTeacher,
  deleteStudentById,
  deleteTeacherById,
  queryCourses,
  updateCourse,
  upsertCourse,
  queryCourseById,
  deleteUserById,
  upsertUser,
  deleteCourseById,
  upsertHomeworks,
  deleteHomeworksByCourseId,
  updateHomework,
  upsertSubmissions,
  deleteSubmissionsByHomeworkId,
  updateSubmission,
  querySubmissionsByHomeworkId,
  querySubmissionsByStudentIdAndHomeworkId,
  upsertAttachmentsToSubmission,
  upsertAttachments,
  updateClass,
  upsertClass,
  queryClasses,
  deleteClassById,
  upsertStudentsToClass,
  deleteStudentsToClassByClassId,
  upsertCoursePlan,
  deleteCoursePlanById,
  upsertCourseHour,
  updateCourseHour,
  upsertTeachersToCourseHour,
  upsertAssistantsToCourseHour,
  upsertOperatorsToCourseHour,
  deleteTeachersToCourseHourByCourseHourId,
  deleteAssistantsToCourseHourByCourseHourId,
  deleteOperatorsToCourseHourByCourseHourId,
  queryCourseHours,
  queryCoursePlans,
  updateCoursePlan,
  queryCoursePlansByClassIdList,
  deleteCourseHourById,
  queryCourseHourById,
  queryAttachmentsByCoursePlanId,
  upsertAttachmentsToCoursePlan,
  queryStudentByUserId,
  queryClassByStudentId,
  queryCourseHoursByCoursePlanIdList,
  queryTeacherByUserId,
  queryHomeworks,
  querySubmissions,
  querySubmissionById,
  deleteSubmissionsToAttachment,
  querySubmissionList,
  queryCourseOptions,
  queryClassOptions,
  queryHomeworkOptions,
  queryHomeworkStatistic,
  queryAllAttachments,
  deleteAttachmentById,
  queryCoursePlansByCourseId,
} from '@/utils/query';
import { validateRequest } from '@/lib/auth/validate-request';
import * as schema from '@/lib/db/schema';
import { db } from '@/lib/db';
import { eq, desc, inArray } from 'drizzle-orm';
import type {
  BuildQueryResult,
  DBQueryConfig,
  ExtractTablesWithRelations,
} from 'drizzle-orm';
import { UploadFileItem } from '@/app/api/upload/route';
import { sql } from 'drizzle-orm';
import { h } from '@fullcalendar/core/preact.js';

// via: https://github.com/drizzle-team/drizzle-orm/issues/695
type Schema = typeof schema;
type TSchema = ExtractTablesWithRelations<Schema>;

type QueryConfig<TableName extends keyof TSchema> = DBQueryConfig<
  'one' | 'many',
  boolean,
  TSchema,
  TSchema[TableName]
>;

export type IncludeRelation<TableName extends keyof TSchema> = DBQueryConfig<
  'one' | 'many',
  boolean,
  TSchema,
  TSchema[TableName]
>['with'];

export type InferResultType<
  TableName extends keyof TSchema,
  With extends IncludeRelation<TableName> | undefined = undefined,
> = BuildQueryResult<
  TSchema,
  TSchema[TableName],
  {
    with: With;
  }
>;

export type InferQueryModel<
  TableName extends keyof TSchema,
  QBConfig extends QueryConfig<TableName> = {},
> = BuildQueryResult<TSchema, TSchema[TableName], QBConfig>;

export type UserItem = {
  id: string;
  name: string;
  email: string;
};

export type UpsertUploadFileItem = (UploadFileItem & {
  name: string;
})[];

// 高阶函数，用于处理 session 的验证
function withAuth<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return async function (
    ...args: Parameters<T>
  ): Promise<ReturnType<T> | { error: string }> {
    const { session } = await validateRequest();
    if (!session) {
      return {
        error: 'Unauthorized',
      };
    }

    // 如果 session 验证通过，调用原来的函数
    return fn(...args);
  } as T;
}

export async function getAllUsers(): Promise<UserItem[]> {
  const data = await queryUsers();
  return data.map((user) => {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  });
}
export type CreateUserItem = {
  name: string;
  email: string;
  password: string;
};
// create user
export const createUser = withAuth(async function (formData: CreateUserItem) {
  const { name, email, password } = formData;
  const id = generateId(21);
  const hashedPassword = await new Scrypt().hash(password);
  const data = await upsertUser({
    id,
    name,
    email,
    hashedPassword,
  });
  return data;
});
// delete user by id
export async function deleteUser(id: string) {
  const data = await deleteUserById(id);
  return data;
}

// get all classes
export type ClassesWithStudents = InferQueryModel<
  'classes',
  {
    with: {
      students: {
        with: {
          student: true;
        };
      };
      plans: {
        with: {
          course: true;
          homeworks: true;
          attachments: {
            with: {
              attachment: true;
            };
          };
        };
      };
    };
  }
>;
export const getAllClasses = withAuth(async function (): Promise<
  ClassesWithStudents[]
> {
  return await queryClasses();
});
// create class
export type CreateClassItem = {
  name: string;
  students?: string[];
};
export async function createClass(formData: CreateClassItem) {
  const id = generateId(21);
  const exist = await upsertClass({
    ...formData,
    id,
  });
  if (!exist) {
    return false;
  }
  // 关联学生 upsertStudentsToClasses
  if (formData.students?.length) {
    const studentsData: schema.StudentToClassInsert[] = formData.students.map(
      (studentId) => {
        return {
          classId: exist[0].id,
          studentId,
        };
      },
    );
    await upsertStudentsToClass(studentsData);
  }
}
// update class by id
export type UpdateClassItem = CreateClassItem & { id: string };
export async function updateClassById(formData: UpdateClassItem) {
  const { id } = formData;
  await updateClass(formData);
  // 删除之前关联的学生，并重新关联
  await deleteStudentsToClassByClassId(id);
  if (formData.students?.length) {
    const studentsData: schema.StudentToClassInsert[] = formData.students.map(
      (studentId) => {
        return {
          classId: id,
          studentId,
        };
      },
    );
    await upsertStudentsToClass(studentsData);
  }
}
// delete class by id
export async function deleteClass(id: string) {
  return await deleteClassById(id);
}

// get all course plans
export type CoursePlansWithRelations = InferQueryModel<
  'coursePlans',
  {
    with: {
      class: true;
      course: true;
    };
  }
>;
export async function getAllCoursePlans(): Promise<CoursePlansWithRelations[]> {
  return await queryCoursePlans();
}
// get course plans by class id
export async function getCoursePlansByClassId(
  classId: string,
): Promise<CoursePlansWithRelations[]> {
  return await queryCoursePlansByClassIdList([classId]);
}
// get course plans by course id
export async function getCoursePlansByCourseId(
  courseId: string,
): Promise<schema.CoursePlanSelect[]> {
  return await queryCoursePlansByCourseId(courseId);
}
// create course plan
export type CreateCoursePlanItem = Pick<
  schema.CoursePlanInsert,
  'classId' | 'courseId' | 'semester'
> & {
  year: number | string; // 为了默认值
};
export async function createCoursePlan(formData: CreateCoursePlanItem) {
  console.log('formData', formData);
  const id = generateId(21);
  return await upsertCoursePlan({
    id,
    ...formData,
    year: Number(formData.year),
  });
}
// delete course plan by id
export async function deleteCoursePlan(id: string) {
  return await deleteCoursePlanById(id);
}

export type CreateStudentItem = {
  name: string;
  userId: string;
  classId?: string;
};
export async function createStudent(formData: CreateStudentItem) {
  const userId = generateId(21);
  const data = await upsertStudents({
    id: userId,
    ...formData,
  });
  // 关联班级
  if (formData.classId) {
    await upsertStudentsToClass([
      {
        classId: formData.classId,
        studentId: userId,
      },
    ]);
  }
  return data;
}

export type StudentsWithUser = InferQueryModel<
  'students',
  {
    columns: { id: true; name: true };
    with: {
      user: {
        columns: { hashedPassword: false };
      };
      classes: {
        with: {
          class: true;
          hours: true;
        };
      };
    };
  }
>;
export async function getAllStudents(): Promise<StudentsWithUser[]> {
  const data = await queryStudents();
  return data;
}
export async function deleteStudent(id: string) {
  const data = await deleteStudentById(id);
  return data;
}

// check if user is a student
export async function checkIsStudent(userId: string) {
  const student = await queryStudentByUserId(userId);
  return !!student;
}

// check if user is a teacher
export async function checkIsTeacher(userId: string) {
  const teacher = await queryTeacherByUserId(userId);
  return !!teacher;
}

export type TeacherItem = {
  name: string;
  userId: string;
};

export async function createTeacher(formData: TeacherItem) {
  const userId = generateId(21);
  const data = await upsertTeacher({
    id: userId,
    ...formData,
  });
  return data;
}
export async function deleteTeacher(id: string) {
  const data = await deleteTeacherById(id);
  return data;
}

export type TeachersWithUser = InferQueryModel<
  'teachers',
  {
    columns: { id: true; name: true };
    with: {
      user: {
        columns: { hashedPassword: false };
      };
    };
  }
>;
export async function getAllTeachers(): Promise<TeachersWithUser[]> {
  const data = await queryTeachers();
  return data;
}

// create course
export type CreateCourseItem = {
  name: string;
  description: string;
  cover?: UpsertUploadFileItem;
};
export async function createCourse(formData: CreateCourseItem) {
  const { user } = await validateRequest();
  if (!user) {
    return false;
  }
  let coverId = '';
  // create attachments
  if (formData.cover && formData.cover.length > 0) {
    const attachmentsData: schema.AttachmentInsert[] = formData.cover.map(
      (cover) => {
        return {
          id: generateId(21),
          userId: user.id,
          name: cover.name,
          fileKey: cover.fileKey,
          fileName: cover.fileName,
        };
      },
    );
    const attachments = await upsertAttachments(attachmentsData);
    coverId = attachments[0].id;
  }
  return await upsertCourse({
    id: generateId(21),
    coverId,
    ...formData,
  });
}

export type CoursesWithPlan = InferQueryModel<
  'courses',
  {
    // columns: {};
    with: {
      cover: true;
      plans: {
        columns: {};
        with: {
          class: true;
        };
      };
    };
  }
>;
// get all courses
export const getAllCourses = withAuth(async function (): Promise<
  CoursesWithPlan[]
> {
  return await queryCourses();
});
export type UpdateCourseItem = CreateCourseItem & { id: string };
// update course by id
export async function updateCourseById(formData: UpdateCourseItem) {
  console.log('updateCourseById', formData);
  const { user } = await validateRequest();
  if (!user) {
    return false;
  }
  let coverId = '';
  // create attachments
  if (formData.cover && formData.cover.length > 0) {
    const attachmentsData: schema.AttachmentInsert[] = formData.cover.map(
      (cover) => {
        return {
          id: generateId(21),
          userId: user.id,
          name: cover.name,
          fileKey: cover.fileKey,
          fileName: cover.fileName,
        };
      },
    );
    const attachments = await upsertAttachments(attachmentsData);
    coverId = attachments[0].id;
  }
  return await updateCourse({
    ...formData,
    coverId,
  });
}

// query all course hours
export type CourseHoursWithRelations = InferQueryModel<
  'courseHours',
  {
    with: {
      teachers: {
        with: {
          teacher: true;
        };
      };
      assistants: {
        with: {
          teacher: true;
        };
      };
      operators: {
        with: {
          teacher: true;
        };
      };
      plan: {
        with: {
          class: true;
          course: true;
          homeworks: true;
          attachments: {
            with: {
              attachment: true;
            };
          };
        };
      };
    };
  }
>;
export async function getAllCourseHours(): Promise<CourseHoursWithRelations[]> {
  return await queryCourseHours();
}

export type CreateCourseHourItem = {
  id?: string;
  coursePlanId: string;
  classRoom: string;
  startTime: Date;
  endTime: Date;
  teachers?: string[];
  assistants?: string[];
  operators?: string[];
};
export async function createCourseHour(formData: CreateCourseHourItem) {
  const id = generateId(21);
  console.log('formData', formData);
  // return;
  const exist = await upsertCourseHour({
    ...formData,
    id,
  });
  if (!exist) {
    return false;
  }
  const { teachers, assistants, operators } = formData;
  // 绑定老师、助教、操作员
  if (teachers?.length) {
    const teachersData: schema.TeacherToCourseHourInsert[] = teachers.map(
      (teacherId) => {
        return {
          courseHourId: id,
          teacherId,
        };
      },
    );
    await upsertTeachersToCourseHour(teachersData);
  }
  if (assistants?.length) {
    const assistantsData: schema.AssistantToCourseHourInsert[] = assistants.map(
      (assistantId) => {
        return {
          courseHourId: id,
          assistantId,
        };
      },
    );
    await upsertAssistantsToCourseHour(assistantsData);
  }
  if (operators?.length) {
    const operatorsData: schema.OperatorToCourseHourInsert[] = operators.map(
      (operatorId) => {
        return {
          courseHourId: id,
          operatorId,
        };
      },
    );
    await upsertOperatorsToCourseHour(operatorsData);
  }
}
// update course hour by id
export type UpdateCourseHourItem = CreateCourseHourItem;
export async function updateCourseHourById(formData: UpdateCourseHourItem) {
  const courseHourId = formData.id;
  if (!courseHourId) {
    return false;
  }
  const { teachers, assistants, operators } = formData;
  // 绑定老师、助教、操作员
  if (teachers?.length) {
    // 删除之前关联的老师
    await deleteTeachersToCourseHourByCourseHourId(courseHourId);
    const teachersData: schema.TeacherToCourseHourInsert[] = teachers.map(
      (teacherId) => {
        return {
          courseHourId,
          teacherId,
        };
      },
    );
    await upsertTeachersToCourseHour(teachersData);
  }
  if (assistants?.length) {
    // 删除之前关联的助教
    await deleteAssistantsToCourseHourByCourseHourId(courseHourId);
    const assistantsData: schema.AssistantToCourseHourInsert[] = assistants.map(
      (assistantId) => {
        return {
          courseHourId,
          assistantId,
        };
      },
    );
    await upsertAssistantsToCourseHour(assistantsData);
  }
  if (operators?.length) {
    // 删除之前关联的操作员
    await deleteOperatorsToCourseHourByCourseHourId(courseHourId);
    const operatorsData: schema.OperatorToCourseHourInsert[] = operators.map(
      (operatorId) => {
        return {
          courseHourId,
          operatorId,
        };
      },
    );
    await upsertOperatorsToCourseHour(operatorsData);
  }
  return await updateCourseHour({
    ...formData,
    id: courseHourId,
  });
}
// delete course hour by id
export async function deleteCourseHour(id: string) {
  try {
    // 先删除相关的关联关系（如果存在的话）
    try {
      await deleteTeachersToCourseHourByCourseHourId(id);
    } catch (error) {
      console.log('删除教师关联关系失败（可能不存在）:', error);
    }
    
    try {
      await deleteAssistantsToCourseHourByCourseHourId(id);
    } catch (error) {
      console.log('删除助教关联关系失败（可能不存在）:', error);
    }
    
    try {
      await deleteOperatorsToCourseHourByCourseHourId(id);
    } catch (error) {
      console.log('删除操作员关联关系失败（可能不存在）:', error);
    }
    
    // 然后删除课时（软删除）
    return await deleteCourseHourById(id);
  } catch (error) {
    console.error('删除课时失败:', error);
    throw error;
  }
}
// get course hour by id
export async function getCourseHourById(
  id: string,
): Promise<CourseHoursWithRelations> {
  const courseHour = await queryCourseHourById(id);
  if (!courseHour) {
    throw new Error('Course hour not found');
  }
  return courseHour;
}
// get course hour by user id
export async function getCourseHourByUserId(
  userId: string,
): Promise<CourseHoursWithRelations[]> {
  const student = await queryStudentByUserId(userId);
  if (!student) {
    return [];
  }
  const studentId = student.id;
  console.log('studentId', studentId);
  const classes = await queryClassByStudentId(studentId);
  if (!classes.length) {
    return [];
  }
  const classIds = classes.map((item) => item.classId);
  console.log('classIds', classIds);
  const coursePlans = await queryCoursePlansByClassIdList(classIds);
  if (!coursePlans.length) {
    return [];
  }
  console.log('coursePlans', coursePlans);
  const coursePlanIds = coursePlans.map((item) => item.id);
  return await queryCourseHoursByCoursePlanIdList(coursePlanIds);
}

// get course hours by course plan id list
export async function getCourseHoursByCoursePlanIdList(
  coursePlanIds: string[],
): Promise<CourseHoursWithRelations[]> {
  return await queryCourseHoursByCoursePlanIdList(coursePlanIds);
}

export async function getHomeworkList(query: {
  courseId?: string;
  classId?: string;
  homeworkId?: string;
}) {
  const { courseId, classId, homeworkId } = query;

  if (classId && !courseId) {
    return [];
  }

  return await querySubmissionList({ classId, courseId, homeworkId });
}

export async function getHomeworkStatistic(
  classId?: string,
  homeworkId?: string,
) {
  if (!classId || !homeworkId) {
    return null;
  }

  return await queryHomeworkStatistic(classId, homeworkId);
}

export async function getCourseOptions() {
  return await queryCourseOptions();
}

export async function getClassOptions(courseId?: string) {
  return await queryClassOptions(courseId);
}

export async function getHomeworkOptions(courseId?: string, classId?: string) {
  return await queryHomeworkOptions(courseId, classId);
}

// delete course by id
export async function deleteCourse(id: string) {
  return await deleteCourseById(id);
}
export type CreateHomeworkItem = {
  coursePlanId: string;
  name: string;
  description: string;
  order: number;
  deadline: Date;
};
// create homework
export async function createHomework(formData: CreateHomeworkItem) {
  const id = generateId(21);
  return await upsertHomeworks({
    ...formData,
    id,
  });
}
// delete homework by course id
export async function deleteHomeworkByCourseId(courseId: string) {
  return await deleteHomeworksByCourseId(courseId);
}
export type UpdateHomeworkItem = CreateHomeworkItem & { id: string };
// update homework
export async function updateHomeworkById(formData: UpdateHomeworkItem) {
  return await updateHomework(formData);
}
export type HomeworksWithRelations = InferQueryModel<
  'homeworks',
  {
    with: {
      plan: {
        with: {
          class: true;
          course: true;
        };
      };
      submissions: {
        with: {
          student: true;
          attachments: {
            with: {
              attachment: true;
            };
          };
        };
      };
    };
  }
>;
// query all homeworks
export async function getAllHomeworks(): Promise<HomeworksWithRelations[]> {
  return await queryHomeworks();
}

export async function getHomeworksForTeacher() {
  const { user } = await validateRequest();
  if (!user) {
    return { error: '用户未登录' };
  }

  try {
    const homeworkData = await db
      .select({
        id: schema.homeworks.id,
        name: schema.homeworks.name,
        description: schema.homeworks.description,
        isActive: schema.homeworks.isActive,
      })
      .from(schema.homeworks)
      .orderBy(desc(schema.homeworks.createdAt));

    return homeworkData.map((h) => ({
      key: h.id,
      homework: h.name,
      description: h.description,
      status: h.isActive === 1 ? '已发布' : '未发布',
    }));
  } catch (error) {
    console.error('获取作业数据失败:', error);
    return { error: '获取作业数据失败' };
  }
}

// 获取学生可见的已发布作业
export async function getHomeworksForStudent() {
  const { user } = await validateRequest();
  if (!user) {
    return { error: '用户未登录' };
  }

  try {
    // 只获取已发布的作业 (isActive = 1)
    const homeworkData = await db
      .select({
        id: schema.homeworks.id,
        name: schema.homeworks.name,
        description: schema.homeworks.description,
        deadline: schema.homeworks.deadline,
        createdAt: schema.homeworks.createdAt,
        coursePlanId: schema.homeworks.coursePlanId,
      })
      .from(schema.homeworks)
      .where(eq(schema.homeworks.isActive, 1))
      .orderBy(desc(schema.homeworks.createdAt));

    // 获取课程计划信息
    const coursePlans = await db
      .select({
        id: schema.coursePlans.id,
        classId: schema.coursePlans.classId,
        courseId: schema.coursePlans.courseId,
      })
      .from(schema.coursePlans)
      .where(inArray(schema.coursePlans.id, homeworkData.map(h => h.coursePlanId)));

    // 获取班级和课程信息
    const classIds = Array.from(new Set(coursePlans.map(p => p.classId).filter(Boolean)));
    const courseIds = Array.from(new Set(coursePlans.map(p => p.courseId).filter(Boolean)));

    const classes = classIds.length > 0 ? await db
      .select({
        id: schema.classes.id,
        name: schema.classes.name,
      })
      .from(schema.classes)
      .where(inArray(schema.classes.id, classIds)) : [];

    const courses = courseIds.length > 0 ? await db
      .select({
        id: schema.courses.id,
        name: schema.courses.name,
      })
      .from(schema.courses)
      .where(inArray(schema.courses.id, courseIds)) : [];

    return homeworkData.map((h) => {
      const coursePlan = coursePlans.find(p => p.id === h.coursePlanId);
      const classInfo = classes.find(c => c.id === coursePlan?.classId);
      const courseInfo = courses.find(c => c.id === coursePlan?.courseId);
      
      return {
        key: h.id,
        homework: h.name,
        description: h.description,
        courseName: courseInfo?.name || '未知课程',
        className: classInfo?.name || '未知班级',
        publishTime: h.createdAt,
        deadline: h.deadline,
        status: '已发布',
      };
    });
  } catch (error) {
    console.error('获取学生作业数据失败:', error);
    return { error: '获取学生作业数据失败' };
  }
}

// 获取学生可见的课程
export async function getClassesForStudent() {
  const { user } = await validateRequest();
  if (!user) {
    return { error: '用户未登录' };
  }

  try {
    // 获取所有活跃的班级
    const classData = await db
      .select({
        id: schema.classes.id,
        name: schema.classes.name,
        createdAt: schema.classes.createdAt,
        updatedAt: schema.classes.updatedAt,
      })
      .from(schema.classes)
      .where(eq(schema.classes.isActive, 1))
      .orderBy(desc(schema.classes.createdAt));

    // 获取每个班级的课程计划
    const coursePlans = await db
      .select({
        id: schema.coursePlans.id,
        classId: schema.coursePlans.classId,
        courseId: schema.coursePlans.courseId,
        isActive: schema.coursePlans.isActive,
      })
      .from(schema.coursePlans)
      .where(eq(schema.coursePlans.isActive, 1));

    // 获取课程信息
    const courseIds = Array.from(new Set(coursePlans.map(p => p.courseId).filter(Boolean)));
    const courses = courseIds.length > 0 ? await db
      .select({
        id: schema.courses.id,
        name: schema.courses.name,
        description: schema.courses.description,
      })
      .from(schema.courses)
      .where(inArray(schema.courses.id, courseIds)) : [];

    // 获取每个班级的学生数量
    const studentCounts = await db
      .select({
        classId: schema.studentsToClasses.classId,
        studentCount: sql`count(*)`.as('count'),
      })
      .from(schema.studentsToClasses)
      .groupBy(schema.studentsToClasses.classId);

    return classData.map((classItem) => {
      const classCoursePlans = coursePlans.filter(p => p.classId === classItem.id);
      const classCourses = classCoursePlans.map(plan => {
        const course = courses.find(c => c.id === plan.courseId);
        return course ? course.name : '未知课程';
      });
      const studentCount = studentCounts.find(sc => sc.classId === classItem.id)?.studentCount || 0;
      
      return {
        key: classItem.id,
        className: classItem.name,
        description: '',
        courses: classCourses.join(', '),
        studentCount: Number(studentCount),
        createTime: classItem.createdAt,
        updateTime: classItem.updatedAt,
      };
    });
  } catch (error) {
    console.error('获取学生课程数据失败:', error);
    return { error: '获取学生课程数据失败' };
  }
}

export async function turnHomeworksForTeacher() {
  const { user } = await validateRequest();
  if (!user) {
    return { error: '用户未登录' };
  }

  try {
    const submissionData = await db
      .select({
        id: schema.submissions.id,
        homework_id: schema.submissions.homeworkId,
        text: schema.submissions.text,
        isActive: schema.submissions.isActive,
      })
      .from(schema.submissions)
      .orderBy(desc(schema.submissions.createdAt));

    const result = submissionData.map((h) => ({
      key: h.id,
      homework: h.homework_id,
      description: h.text,
      status: h.isActive === 1 ? '已批改' : '未批改',
    }));

    // // 后端打印所有 status 字段
    // result.forEach(item => {
    //   console.log('status:', item.status);
    // });

    return result;
  } catch (error) {
    console.error('获取批改作业数据失败:', error);
    return { error: '获取批改作业数据失败' };
  }
}


export type CreateSubmissionItem = {
  homeworkId: string;
  // studentId: string;
  text?: string;
  attachments?: UpsertUploadFileItem;
  // 存在submissionId表示当前属于更新操作
  submissionId?: string;
};
// create submission
export async function createSubmission(formData: CreateSubmissionItem) {
  // 通过 session 获取当前用户，再通过 students 获取学生id
  const { user } = await validateRequest();
  if (!user) {
    return false;
  }
  const student = await queryStudentByUserId(user.id);
  if (!student) {
    return false;
  }
  // step 1: upsert attachments
  /*
  if (!formData.attachments?.length) {
    return false;
  }
  */
  const attachmentsData: schema.AttachmentInsert[] = (
    formData.attachments || []
  ).map((attachment) => {
    const id = generateId(21);
    return {
      id,
      userId: user.id,
      name: attachment.name,
      fileKey: attachment.fileKey,
      fileName: attachment.fileName,
    };
  });
  const attachments = await upsertAttachments(attachmentsData);
  // step 2: upsert submissions
  const id = generateId(21);
  const submission = await upsertSubmissions({
    id,
    studentId: student.id,
    ...formData,
  });
  // step 3: 关联 attachments
  if (submission[0]?.id) {
    // 关联 submission
    const attachmentsData: schema.SubmissionToAttachmentInsert[] =
      attachments.map((attachment) => {
        return {
          submissionId: submission[0]?.id,
          attachmentId: attachment.id,
        };
      });
    await upsertAttachmentsToSubmission(attachmentsData);
  }
}

// upsert submission
export async function upsertSubmission(data: CreateSubmissionItem) {
  // 通过 session 获取当前用户，再通过 students 获取学生id
  const { user } = await validateRequest();
  if (!user) {
    return false;
  }

  const student = await queryStudentByUserId(user.id);
  if (!student) {
    return false;
  }

  if (!data.submissionId) return false;

  try {
    const { submissionId } = data;
    const submissionResult = await querySubmissionById(submissionId);

    if (!submissionResult) {
      return false;
    }

    // 已经打分的作业无法修改
    if (submissionResult.score !== null) {
      return false;
    }

    const { remove, add } = diffAttachments(
      (submissionResult.attachments ?? []).map((item) => ({
        name: item.attachment.name,
        fileKey: item.attachment.fileKey,
        fileName: item.attachment.fileName,
      })),
      data.attachments ?? [],
    );

    if (remove.length) {
      // 删除附件关联表中的数据
      await deleteSubmissionsToAttachment(remove);
    }

    if (add.length) {
      // 将新提交的附件入库并增加新的附件关联表数据
      const attachmentsData: schema.AttachmentInsert[] = add.map(
        (attachment) => {
          const id = generateId(21);
          return {
            id,
            userId: user.id,
            name: attachment.name,
            fileKey: attachment.fileKey,
            fileName: attachment.fileName,
          };
        },
      );

      const upsertAttachmentsResult = await upsertAttachments(attachmentsData);
      const _data = upsertAttachmentsResult.map((attachment) => {
        return {
          submissionId: submissionResult.id,
          attachmentId: attachment.id,
        };
      });

      await upsertAttachmentsToSubmission(_data);
    }

    // 更新submiession数据
    updateSubmissionById({
      ...submissionResult,
      text: data.text,
    });

    return true;
  } catch (e) {
    console.log('发生异常', e);
    return false;
  }
}

/**
 * diff 新旧附件数据
 * @param previous 旧的附件数据
 * @param current 修改接口中的附件数据
 */
function diffAttachments(
  previous: UpsertUploadFileItem,
  current: UpsertUploadFileItem,
): { remove: UpsertUploadFileItem; add: UpsertUploadFileItem } {
  if (previous.length === 0) {
    return {
      remove: [],
      add: current,
    };
  }

  if (current.length === 0) {
    return {
      remove: previous,
      add: [],
    };
  }

  const remove: UpsertUploadFileItem = [];
  const add: UpsertUploadFileItem = [];

  previous.forEach((item) => {
    const data = current.find(
      (_item) =>
        _item.fileKey === item.fileKey &&
        _item.fileName === item.fileName &&
        _item.name === item.name,
    );

    if (!data) {
      remove.push(item);
    }
  });

  current.forEach((item) => {
    const data = previous.find(
      (_item) =>
        _item.fileKey === item.fileKey &&
        _item.fileName === item.fileName &&
        _item.name === item.name,
    );

    if (!data) {
      add.push(item);
    }
  });

  return {
    remove,
    add,
  };
}

export type SubmissionsWithRelations = InferQueryModel<
  'submissions',
  {
    with: {
      student: {
        with: {
          user: true;
        };
      };
      homework: {
        with: {
          plan: {
            with: {
              course: true;
              class: true;
            };
          };
        };
      };
      attachments: {
        with: {
          attachment: true;
        };
      };
    };
  }
>;
// get all submissions
export async function getAllSubmissions(): Promise<SubmissionsWithRelations[]> {
  return await querySubmissions();
}
// update submission by id
export async function updateSubmissionById(formData: schema.SubmissionInsert) {
  return await updateSubmission(formData);
}
// get submissions by homework id
export async function getSubmissionsByHomeworkId(
  homeworkId: string,
): Promise<SubmissionsWithRelations[]> {
  return await querySubmissionsByHomeworkId(homeworkId);
}
// get submissions by user id and homework id
export async function getSubmissionsByUserIdAndHomeworkId(
  homeworkId: string,
): Promise<SubmissionsWithRelations[]> {
  const { user } = await validateRequest();
  if (!user) {
    return [];
  }
  // get student id from user id, with students
  const student = await queryStudentByUserId(user.id);
  if (!student) {
    return [];
  }

  return await querySubmissionsByStudentIdAndHomeworkId(student.id, homeworkId);
}
export type CreateAttachmentItem = {
  name: string;
  coursePlanId?: string;
  submissionId?: string;
  attachments?: UpsertUploadFileItem;
};
// create attachment
export async function createAttachment(formData: CreateAttachmentItem) {
  console.log('>>>>>>>>> createAttachment', formData);
  const { user } = await validateRequest();
  if (!user) {
    return false;
  }
  console.log('formData', formData);
  // step 1: upsert attachments
  if (!formData.attachments?.length) {
    const id = generateId(21);
  const attachment = await upsertAttachments([{
    id,
    userId: user.id,
    name: formData.name, // 课件名称
    fileKey: '',
    fileName: '',
  }]);
  if (formData.coursePlanId) {
    await upsertAttachmentsToCoursePlan([{
      coursePlanId: formData.coursePlanId,
      attachmentId: id,
    }]);
  }
  return attachment;
  }
  const attachmentsData: schema.AttachmentInsert[] = formData.attachments.map(
    (attachment) => {
      const id = generateId(21);
      return {
        id,
        userId: user.id,
        name: attachment.name,
        fileKey: attachment.fileKey,
        fileName: attachment.fileName,
      };
    },
  );
  const attachments = await upsertAttachments(attachmentsData);
  console.log('attachments', attachments);
  // 关联 coursePlansToAttachments
  if (formData.coursePlanId && attachments.length) {
    const coursePlanId = formData.coursePlanId;
    const attachmentsData: schema.CoursePlanToAttachmentInsert[] =
      attachments.map((attachment) => {
        return {
          coursePlanId,
          attachmentId: attachment.id,
        };
      });
    await upsertAttachmentsToCoursePlan(attachmentsData);
  }
  return attachments;

  // // step 2: course 或者 submission 关联 attachments
  // if (formData.courseId) {
  //   // 关联课程
  //   await updateCourse({
  //     id: formData.courseId,
  //     attachments: attachments.map((attachment) => attachment.id),
  //   });
  // } else if (formData.submissionId) {
  //   // 关联作业
  //   await updateSubmission({
  //     id: formData.submissionId,
  //     attachments: attachments.map((attachment) => attachment.id),
  //   });
  // }

  // const id = generateId(21);
  // return await upsertAttachments({
  //   id,
  //   ...formData,
  // });
}
// query attachments by course plan id
export async function getAttachmentsByCoursePlanId(courseId: string) {
  return await queryAttachmentsByCoursePlanId(courseId);
}

// get all attachments
export const getAllAttachments = withAuth(async function () {
  return await queryAllAttachments();
});

// delete attachment by id
export async function deleteAttachment(id: string) {
  return await deleteAttachmentById(id);
}

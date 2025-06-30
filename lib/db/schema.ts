import {
  unique,
  serial,
  timestamp,
  time,
  date,
  doublePrecision,
  varchar,
  integer,
  smallint,
  pgTable,
  text,
  index,
  pgEnum,
  primaryKey,
  boolean,
  customType,
} from 'drizzle-orm/pg-core';
import { is, relations } from 'drizzle-orm';

export type DemoNotesSelect = typeof demoNotes.$inferSelect;
export type DemoNotesInsert = typeof demoNotes.$inferInsert;

export type UserSelect = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

export type ClassSelect = typeof classes.$inferSelect;
export type ClassInsert = typeof classes.$inferInsert;

export type StudentSelect = typeof students.$inferSelect;
export type StudentInsert = typeof students.$inferInsert;

export type StudentToClassSelect = typeof studentsToClasses.$inferSelect;
export type StudentToClassInsert = typeof studentsToClasses.$inferInsert;

export type TeacherSelect = typeof teachers.$inferSelect;
export type TeacherInsert = typeof teachers.$inferInsert;

export type CourseSelect = typeof courses.$inferSelect;
export type CourseInsert = typeof courses.$inferInsert;

export type CoursePlanSelect = typeof coursePlans.$inferSelect;
export type CoursePlanInsert = typeof coursePlans.$inferInsert;

export type CourseHourSelect = typeof courseHours.$inferSelect;
export type CourseHourInsert = typeof courseHours.$inferInsert;

export type TeacherToCourseHourSelect =
  typeof teachersToCourseHours.$inferSelect;
export type TeacherToCourseHourInsert =
  typeof teachersToCourseHours.$inferInsert;

export type AssistantToCourseHourSelect =
  typeof assistantsToCourseHours.$inferSelect;
export type AssistantToCourseHourInsert =
  typeof assistantsToCourseHours.$inferInsert;

export type OperatorToCourseHourSelect =
  typeof operatorsToCourseHours.$inferSelect;
export type OperatorToCourseHourInsert =
  typeof operatorsToCourseHours.$inferInsert;

export type HomeworkSelect = typeof homeworks.$inferSelect;
export type HomeworkInsert = typeof homeworks.$inferInsert;

export type SubmissionSelect = typeof submissions.$inferSelect;
export type SubmissionInsert = typeof submissions.$inferInsert;

export type AttachmentSelect = typeof attachments.$inferSelect;
export type AttachmentInsert = typeof attachments.$inferInsert;

export type CoursePlanToAttachmentSelect =
  typeof coursePlansToAttachments.$inferSelect;
export type CoursePlanToAttachmentInsert =
  typeof coursePlansToAttachments.$inferInsert;

export type SubmissionToAttachmentSelect =
  typeof submissionsToAttachments.$inferSelect;
export type SubmissionToAttachmentInsert =
  typeof submissionsToAttachments.$inferInsert;

export const users = pgTable('users', {
  id: varchar('id', { length: 21 }).primaryKey(),
  name: varchar('name', { length: 50 }).unique().notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  hashedPassword: varchar('hashed_password', { length: 255 }),
  isAdmin: boolean('is_admin').default(false),
  isActive: smallint('is_active').default(1),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdate(() => new Date()),
});

export const sessions = pgTable(
  'sessions',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    userId: varchar('user_id', { length: 21 }).notNull(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
  },
  (t) => ({
    userIdx: index('session_user_idx').on(t.userId),
  }),
);

/**
 * - users <-> sessions -> 1-to-N
 */
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const teachers = pgTable('teachers', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 21 }).notNull(),
  name: varchar('name', { length: 10 }).notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdate(() => new Date()),
});

/**
 * - users <-> teachers -> 1-to-1
 * - courseHours <-> teachers -> N-to-N
 */
export const teachersRelations = relations(teachers, ({ many, one }) => ({
  teachersToCourseHours: many(teachersToCourseHours),
  assistantsToCourseHours: many(assistantsToCourseHours),
  operatorsToCourseHours: many(operatorsToCourseHours),
  user: one(users, {
    fields: [teachers.userId],
    references: [users.id],
  }),
}));

export const students = pgTable('students', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 21 }).notNull(),
  name: varchar('name', { length: 10 }).notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdate(() => new Date()),
});

/**
 * - users <-> students -> 1-to-1
 * - students <-> classes -> N-to-N
 */
export const studentsRelations = relations(students, ({ one, many }) => ({
  classes: many(studentsToClasses),
  user: one(users, {
    fields: [students.userId],
    references: [users.id],
  }),
}));

/**
 * 班级
 */
export const classes = pgTable('classes', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  isActive: smallint('is_active').default(1),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdate(() => new Date()),
});

/**
 * - students <-> classes -> N-to-N
 */
export const studentsToClasses = pgTable(
  'students_to_classes',
  {
    studentId: varchar('student_id', { length: 255 })
      .notNull()
      .references(() => students.id),
    classId: varchar('class_id', { length: 255 })
      .notNull()
      .references(() => classes.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.studentId, t.classId] }),
  }),
);

/**
 * - students <-> classes -> N-to-N
 */
export const studentsToClassesRelations = relations(
  studentsToClasses,
  ({ one }) => ({
    student: one(students, {
      fields: [studentsToClasses.studentId],
      references: [students.id],
    }),
    class: one(classes, {
      fields: [studentsToClasses.classId],
      references: [classes.id],
    }),
  }),
);

/**
 * - classes <-> students -> 1-to-N
 */
export const classesRelations = relations(classes, ({ many }) => ({
  students: many(studentsToClasses),
  plans: many(coursePlans),
}));

/**
 * 课程
 */
export const courses = pgTable('courses', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 5000 }).notNull(),
  coverId: varchar('cover_id', { length: 255 }),
  isActive: smallint('is_active').default(1),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdate(() => new Date()),
});

/**
 * - courses <-> coursePlans -> 1-to-N
 * - courses <-> attachments -> 1-to-1
 */
export const coursesRelations = relations(courses, ({ many, one }) => ({
  cover: one(attachments, {
    fields: [courses.coverId],
    references: [attachments.id],
  }),
  plans: many(coursePlans),
}));

/**
 * 课程计划：哪个学期，哪个学年，针对哪个班级
 */
export const coursePlans = pgTable('course_plans', {
  id: varchar('id', { length: 255 }).primaryKey(),
  courseId: varchar('course_id', { length: 255 }).notNull(),
  classId: varchar('class_id', { length: 255 }).notNull(),
  year: integer('year').notNull(), // 开课年份
  semester: integer('semester').notNull().default(0), // 开课学期，0: 上学期，1: 下学期
  isActive: smallint('is_active').default(1),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdate(() => new Date()),
});

/**
 * - coursePlans <-> attachments -> 1-to-N
 * - courses <-> coursePlans -> 1-to-N
 * - coursePlans <-> courseHours -> 1-to-N
 * - coursePlans <-> class -> 1-to-1
 */
export const coursePlanRelations = relations(coursePlans, ({ many, one }) => ({
  attachments: many(coursePlansToAttachments),
  course: one(courses, {
    fields: [coursePlans.courseId],
    references: [courses.id],
  }),
  class: one(classes, {
    fields: [coursePlans.classId],
    references: [classes.id],
  }),
  hours: many(courseHours),
  homeworks: many(homeworks),
}));

/**
 * 课时：排课计划
 */
export const courseHours = pgTable('course_hours', {
  id: varchar('id', { length: 255 }).primaryKey(),
  coursePlanId: varchar('course_plan_id', { length: 255 }).notNull(),
  classRoom: varchar('class_room', { length: 255 }).notNull(),
  // teacherId: varchar('teacher_id', { length: 255 }).notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  isActive: smallint('is_active').default(1),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdate(() => new Date()),
});

/**
 * - coursePlans <-> courseHours -> 1-to-N
 * - teachers <-> courseHours -> N-to-N
 * - assistants <-> courseHours -> N-to-N
 * - operators <-> courseHours -> N-to-N
 */
export const courseHoursRelations = relations(courseHours, ({ one, many }) => ({
  teachers: many(teachersToCourseHours),
  assistants: many(assistantsToCourseHours),
  operators: many(operatorsToCourseHours),
  plan: one(coursePlans, {
    fields: [courseHours.coursePlanId],
    references: [coursePlans.id],
  }),
}));

export const teachersToCourseHours = pgTable(
  'teachers_to_course_hours',
  {
    teacherId: varchar('teacher_id', { length: 255 })
      .notNull()
      .references(() => teachers.id),
    courseHourId: varchar('course_hour_id', { length: 255 })
      .notNull()
      .references(() => courseHours.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.teacherId, t.courseHourId] }),
  }),
);

/**
 * - teachers <-> courseHours -> N-to-N
 */
export const teachersToCourseHoursRelations = relations(
  teachersToCourseHours,
  ({ one }) => ({
    teacher: one(teachers, {
      fields: [teachersToCourseHours.teacherId],
      references: [teachers.id],
    }),
    courseHour: one(courseHours, {
      fields: [teachersToCourseHours.courseHourId],
      references: [courseHours.id],
    }),
  }),
);

export const assistantsToCourseHours = pgTable(
  'assistants_to_course_hours',
  {
    assistantId: varchar('assistant_id', { length: 255 })
      .notNull()
      .references(() => teachers.id),
    courseHourId: varchar('course_hour_id', { length: 255 })
      .notNull()
      .references(() => courseHours.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.assistantId, t.courseHourId] }),
  }),
);

/**
 * - assistants <-> courseHours -> N-to-N
 */
export const assistantsToCourseHoursRelations = relations(
  assistantsToCourseHours,
  ({ one }) => ({
    teacher: one(teachers, {
      fields: [assistantsToCourseHours.assistantId],
      references: [teachers.id],
    }),
    courseHour: one(courseHours, {
      fields: [assistantsToCourseHours.courseHourId],
      references: [courseHours.id],
    }),
  }),
);

/**
 * 实验老师
 */
export const operatorsToCourseHours = pgTable(
  'operators_to_course_hours',
  {
    operatorId: varchar('operator_id', { length: 255 })
      .notNull()
      .references(() => teachers.id),
    courseHourId: varchar('course_hour_id', { length: 255 })
      .notNull()
      .references(() => courseHours.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.operatorId, t.courseHourId] }),
  }),
);

/**
 * - operators <-> courseHours -> N-to-N
 */
export const operatorsToCourseHoursRelations = relations(
  operatorsToCourseHours,
  ({ one }) => ({
    teacher: one(teachers, {
      fields: [operatorsToCourseHours.operatorId],
      references: [teachers.id],
    }),
    courseHour: one(courseHours, {
      fields: [operatorsToCourseHours.courseHourId],
      references: [courseHours.id],
    }),
  }),
);

export const homeworks = pgTable('homeworks', {
  id: varchar('id', { length: 255 }).primaryKey(),
  coursePlanId: varchar('course_plan_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  order: integer('order').notNull(),
  description: varchar('description', { length: 5000 }),
  deadline: timestamp('deadline'),
  isActive: smallint('is_active').default(1),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdate(() => new Date()),
});

/**
 * - homeworks <-> submissions -> N-to-N
 * - coursePlans <-> homeworks -> 1-to-N
 */
export const homeworksRelations = relations(homeworks, ({ many, one }) => ({
  submissions: many(submissions),
  plan: one(coursePlans, {
    fields: [homeworks.coursePlanId],
    references: [coursePlans.id],
  }),
}));

export const submissions = pgTable('submissions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  studentId: varchar('studentId', { length: 255 }).notNull(),
  homeworkId: varchar('homework_id', { length: 255 }).notNull(),
  score: integer('score'),
  text: varchar('text', { length: 10000000 }),
  comment: varchar('comment', { length: 5000 }),
  isActive: smallint('is_active').default(1),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdate(() => new Date()),
});

/**
 * - students <-> submissions -> 1-to-N
 * - submissions <-> attachments -> 1-to-N
 * - submissions <-> homeworks -> 1-to-1
 */
export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  student: one(students, {
    fields: [submissions.studentId],
    references: [students.id],
  }),
  attachments: many(submissionsToAttachments),
  homework: one(homeworks, {
    fields: [submissions.homeworkId],
    references: [homeworks.id],
  }),
}));

export const attachments = pgTable('attachments', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 21 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileKey: varchar('file_key', { length: 255 }).unique().notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdate(() => new Date()),
});

/**
 * - users <-> attachments -> 1-to-N
 * - coursePlans <-> attachments -> 1-to-N
 * - submissions <-> attachments -> 1-to-N
 * - courses <-> attachments -> 1-to-1
 */
export const attachmentsRelations = relations(attachments, ({ one, many }) => ({
  user: one(users, {
    fields: [attachments.userId],
    references: [users.id],
  }),
  coursePlans: many(coursePlansToAttachments),
  coursePlansToAttachments: many(coursePlansToAttachments),
  submissions: many(submissionsToAttachments),
  submissionsToAttachments: many(submissionsToAttachments),
  // attachments: many(coursePlansToAttachments),
  cover: one(courses, {
    fields: [attachments.fileKey],
    references: [courses.coverId],
  }),
}));

export const coursePlansToAttachments = pgTable(
  'course_hours_to_attachments',
  {
    coursePlanId: varchar('course_plan_id', { length: 255 })
      .notNull()
      .references(() => coursePlans.id),
    attachmentId: varchar('attachment_id', { length: 255 })
      .notNull()
      .references(() => attachments.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.coursePlanId, t.attachmentId] }),
  }),
);

export const coursePlansToAttachmentsRelations = relations(
  coursePlansToAttachments,
  ({ one }) => ({
    coursePlan: one(coursePlans, {
      fields: [coursePlansToAttachments.coursePlanId],
      references: [coursePlans.id],
    }),
    attachment: one(attachments, {
      fields: [coursePlansToAttachments.attachmentId],
      references: [attachments.id],
    }),
  }),
);

export const submissionsToAttachments = pgTable(
  'submissions_to_attachments',
  {
    submissionId: varchar('submission_id', { length: 255 })
      .notNull()
      .references(() => submissions.id),
    attachmentId: varchar('attachment_id', { length: 255 })
      .notNull()
      .references(() => attachments.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.submissionId, t.attachmentId] }),
  }),
);

export const submissionsToAttachmentsRelations = relations(
  submissionsToAttachments,
  ({ one }) => ({
    submission: one(submissions, {
      fields: [submissionsToAttachments.submissionId],
      references: [submissions.id],
    }),
    attachment: one(attachments, {
      fields: [submissionsToAttachments.attachmentId],
      references: [attachments.id],
    }),
  }),
);

export const demoNotes = pgTable('demo_notes', {
  id: serial('id').unique(),
  title: varchar('title', { length: 256 }),
  text: varchar('text', { length: 256 }),
  is_active: smallint('is_active').default(1),
  user_id: varchar('user_id', { length: 21 }).notNull(),
  create_time: timestamp('create_time', {
    mode: 'string',
    precision: 3,
  }).defaultNow(),
});

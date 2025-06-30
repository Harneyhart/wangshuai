CREATE TABLE IF NOT EXISTS "assistants_to_classes" (
	"assistant_id" varchar(255) NOT NULL,
	"course_id" varchar(255) NOT NULL,
	CONSTRAINT "assistants_to_classes_assistant_id_course_id_pk" PRIMARY KEY("assistant_id","course_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attachments" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"content_type" varchar(255) NOT NULL,
	"data" "bytea" NOT NULL,
	"submission_id" varchar(255),
	"course_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "homeworks" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"order" integer NOT NULL,
	"description" varchar(5000) NOT NULL,
	"course_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "students_to_courses" (
	"student_id" varchar(255) NOT NULL,
	"course_id" varchar(255) NOT NULL,
	CONSTRAINT "students_to_courses_student_id_course_id_pk" PRIMARY KEY("student_id","course_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submissions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"studentId" varchar(255) NOT NULL,
	"score" integer NOT NULL,
	"text" varchar(5000) NOT NULL,
	"comment" varchar(5000) NOT NULL,
	"homework_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teachers_to_classes" (
	"teacher_id" varchar(255) NOT NULL,
	"course_id" varchar(255) NOT NULL,
	CONSTRAINT "teachers_to_classes_teacher_id_course_id_pk" PRIMARY KEY("teacher_id","course_id")
);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "cover" varchar(255) NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assistants_to_classes" ADD CONSTRAINT "assistants_to_classes_assistant_id_teachers_id_fk" FOREIGN KEY ("assistant_id") REFERENCES "public"."teachers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assistants_to_classes" ADD CONSTRAINT "assistants_to_classes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "students_to_courses" ADD CONSTRAINT "students_to_courses_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "students_to_courses" ADD CONSTRAINT "students_to_courses_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teachers_to_classes" ADD CONSTRAINT "teachers_to_classes_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teachers_to_classes" ADD CONSTRAINT "teachers_to_classes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

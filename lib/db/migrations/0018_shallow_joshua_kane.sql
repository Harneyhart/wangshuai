CREATE TABLE IF NOT EXISTS "assistants_to_course_hours" (
	"assistant_id" varchar(255) NOT NULL,
	"course_hour_id" varchar(255) NOT NULL,
	CONSTRAINT "assistants_to_course_hours_assistant_id_course_hour_id_pk" PRIMARY KEY("assistant_id","course_hour_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "course_hours" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"course_plan_id" varchar(255) NOT NULL,
	"class_room" varchar(255) NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"is_active" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "course_plans" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"course_id" varchar(255) NOT NULL,
	"class_id" varchar(255) NOT NULL,
	"year" integer NOT NULL,
	"semester" integer DEFAULT 0 NOT NULL,
	"is_active" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "operators_to_course_hours" (
	"operator_id" varchar(255) NOT NULL,
	"course_hour_id" varchar(255) NOT NULL,
	CONSTRAINT "operators_to_course_hours_operator_id_course_hour_id_pk" PRIMARY KEY("operator_id","course_hour_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teachers_to_course_hours" (
	"teacher_id" varchar(255) NOT NULL,
	"course_hour_id" varchar(255) NOT NULL,
	CONSTRAINT "teachers_to_course_hours_teacher_id_course_hour_id_pk" PRIMARY KEY("teacher_id","course_hour_id")
);
--> statement-breakpoint
DROP TABLE "assistants_to_classes";--> statement-breakpoint
DROP TABLE "students_to_classes";--> statement-breakpoint
DROP TABLE "students_to_courses";--> statement-breakpoint
DROP TABLE "teachers_to_classes";--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "course_plan_id" varchar(255);--> statement-breakpoint
ALTER TABLE "homeworks" ADD COLUMN "course_plan_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "class_id" varchar(255) NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assistants_to_course_hours" ADD CONSTRAINT "assistants_to_course_hours_assistant_id_teachers_id_fk" FOREIGN KEY ("assistant_id") REFERENCES "public"."teachers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assistants_to_course_hours" ADD CONSTRAINT "assistants_to_course_hours_course_hour_id_course_hours_id_fk" FOREIGN KEY ("course_hour_id") REFERENCES "public"."course_hours"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "operators_to_course_hours" ADD CONSTRAINT "operators_to_course_hours_operator_id_teachers_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."teachers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "operators_to_course_hours" ADD CONSTRAINT "operators_to_course_hours_course_hour_id_course_hours_id_fk" FOREIGN KEY ("course_hour_id") REFERENCES "public"."course_hours"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teachers_to_course_hours" ADD CONSTRAINT "teachers_to_course_hours_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teachers_to_course_hours" ADD CONSTRAINT "teachers_to_course_hours_course_hour_id_course_hours_id_fk" FOREIGN KEY ("course_hour_id") REFERENCES "public"."course_hours"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "attachments" DROP COLUMN IF EXISTS "course_id";--> statement-breakpoint
ALTER TABLE "homeworks" DROP COLUMN IF EXISTS "course_id";
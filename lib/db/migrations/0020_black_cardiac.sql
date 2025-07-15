CREATE TABLE IF NOT EXISTS "course_plans_to_attachments" (
	"course_plan_id" varchar(255) NOT NULL,
	"attachment_id" varchar(255) NOT NULL,
	CONSTRAINT "course_plans_to_attachments_course_plan_id_attachment_id_pk" PRIMARY KEY("course_plan_id","attachment_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "courses_to_attachments" (
	"course_id" varchar(255) NOT NULL,
	"attachment_id" varchar(255) NOT NULL,
	CONSTRAINT "courses_to_attachments_course_id_attachment_id_pk" PRIMARY KEY("course_id","attachment_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submissions_to_attachments" (
	"submission_id" varchar(255) NOT NULL,
	"attachment_id" varchar(255) NOT NULL,
	CONSTRAINT "submissions_to_attachments_submission_id_attachment_id_pk" PRIMARY KEY("submission_id","attachment_id")
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "user_id" varchar(21) NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_plans_to_attachments" ADD CONSTRAINT "course_plans_to_attachments_course_plan_id_course_plans_id_fk" FOREIGN KEY ("course_plan_id") REFERENCES "public"."course_plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_plans_to_attachments" ADD CONSTRAINT "course_plans_to_attachments_attachment_id_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."attachments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "courses_to_attachments" ADD CONSTRAINT "courses_to_attachments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "courses_to_attachments" ADD CONSTRAINT "courses_to_attachments_attachment_id_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."attachments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submissions_to_attachments" ADD CONSTRAINT "submissions_to_attachments_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submissions_to_attachments" ADD CONSTRAINT "submissions_to_attachments_attachment_id_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."attachments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "attachments" DROP COLUMN IF EXISTS "submission_id";--> statement-breakpoint
ALTER TABLE "attachments" DROP COLUMN IF EXISTS "course_plan_id";
DROP TABLE "course_plans_to_attachments";--> statement-breakpoint
DROP TABLE "courses_to_attachments";--> statement-breakpoint
DROP TABLE "submissions_to_attachments";--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "cover_id" varchar(255);--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN IF EXISTS "cover";
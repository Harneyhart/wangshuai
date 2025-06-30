ALTER TABLE "attachments" ADD COLUMN "key" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "attachments" DROP COLUMN IF EXISTS "content_type";--> statement-breakpoint
ALTER TABLE "attachments" DROP COLUMN IF EXISTS "data";
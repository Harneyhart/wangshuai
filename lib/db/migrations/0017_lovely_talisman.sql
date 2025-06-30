ALTER TABLE "attachments" ADD COLUMN "file_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "file_key" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "attachments" DROP COLUMN IF EXISTS "key";
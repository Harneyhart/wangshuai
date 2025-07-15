CREATE TABLE IF NOT EXISTS "course" (
	"id" serial NOT NULL,
	"name" varchar(1024),
	"description" text,
	"create_time" timestamp(3) DEFAULT now(),
	CONSTRAINT "course_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "userID" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "password" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "isTeacher" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "isStudent" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "isActive" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "isAdmin" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_userID_unique" UNIQUE("userID");
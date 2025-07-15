CREATE TABLE IF NOT EXISTS "demo_notes" (
	"id" serial NOT NULL,
	"title" varchar(256),
	"text" varchar(256),
	"is_active" smallint DEFAULT 1,
	"create_time" timestamp(3) DEFAULT now(),
	CONSTRAINT "demo_notes_id_unique" UNIQUE("id")
);

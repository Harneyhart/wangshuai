CREATE TABLE IF NOT EXISTS "students_to_classes" (
	"student_id" varchar(255) NOT NULL,
	"class_id" varchar(255) NOT NULL,
	CONSTRAINT "students_to_classes_student_id_class_id_pk" PRIMARY KEY("student_id","class_id")
);
--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "is_active" smallint DEFAULT 1;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "students_to_classes" ADD CONSTRAINT "students_to_classes_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "students_to_classes" ADD CONSTRAINT "students_to_classes_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN IF EXISTS "class_id";
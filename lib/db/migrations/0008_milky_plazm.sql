CREATE TABLE "vocabulary_forms" (
	"id" text PRIMARY KEY NOT NULL,
	"vocabulary_id" text NOT NULL,
	"form" text NOT NULL,
	"part_of_speech" "part_of_speech",
	"translation" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_phrases" ALTER COLUMN "ease_factor" SET DATA TYPE numeric(4, 2);--> statement-breakpoint
ALTER TABLE "user_phrases" ALTER COLUMN "ease_factor" SET DEFAULT '2.50';--> statement-breakpoint
ALTER TABLE "user_vocabulary" ALTER COLUMN "ease_factor" SET DATA TYPE numeric(4, 2);--> statement-breakpoint
ALTER TABLE "user_vocabulary" ALTER COLUMN "ease_factor" SET DEFAULT '2.50';--> statement-breakpoint
ALTER TABLE "vocabulary_forms" ADD CONSTRAINT "vocabulary_forms_vocabulary_id_vocabulary_id_fk" FOREIGN KEY ("vocabulary_id") REFERENCES "public"."vocabulary"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vocabulary_forms_form_idx" ON "vocabulary_forms" USING btree ("form");--> statement-breakpoint
CREATE INDEX "vocabulary_forms_vocab_idx" ON "vocabulary_forms" USING btree ("vocabulary_id");
CREATE TABLE "quiz_custom_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"user_id" text NOT NULL,
	"score" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"correct_answers" integer NOT NULL,
	"wrong_answers" integer NOT NULL,
	"duration_seconds" integer,
	"answers" jsonb DEFAULT '[]'::jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "quiz_custom_set_items" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"item_type" text NOT NULL,
	"item_id" text NOT NULL,
	"custom_question" text,
	"custom_answer" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_custom_sets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"content_type" text DEFAULT 'vocabulary' NOT NULL,
	"direction" text DEFAULT 'source_to_target' NOT NULL,
	"question_type" text DEFAULT 'type_in' NOT NULL,
	"questions_per_session" integer DEFAULT 0,
	"shuffle_questions" boolean DEFAULT true,
	"shuffle_options" boolean DEFAULT true,
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quiz_custom_attempts" ADD CONSTRAINT "quiz_custom_attempts_set_id_quiz_custom_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."quiz_custom_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_custom_attempts" ADD CONSTRAINT "quiz_custom_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_custom_set_items" ADD CONSTRAINT "quiz_custom_set_items_set_id_quiz_custom_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."quiz_custom_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_custom_sets" ADD CONSTRAINT "quiz_custom_sets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempt_set_idx" ON "quiz_custom_attempts" USING btree ("set_id");--> statement-breakpoint
CREATE INDEX "attempt_user_idx" ON "quiz_custom_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "attempt_started_idx" ON "quiz_custom_attempts" USING btree ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "set_item_idx" ON "quiz_custom_set_items" USING btree ("set_id","item_type","item_id");--> statement-breakpoint
CREATE INDEX "set_order_idx" ON "quiz_custom_set_items" USING btree ("set_id","sort_order");--> statement-breakpoint
CREATE INDEX "user_quiz_idx" ON "quiz_custom_sets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "public_quiz_idx" ON "quiz_custom_sets" USING btree ("is_public");
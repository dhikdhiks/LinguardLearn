CREATE TABLE "ai_interactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"prompt" text NOT NULL,
	"response" text NOT NULL,
	"model_used" text NOT NULL,
	"tokens_used" integer,
	"cache_hit" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_type" text NOT NULL,
	"score" integer,
	"total_questions" integer,
	"correct_answers" integer,
	"duration_seconds" integer,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_vocabulary" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"vocabulary_id" text NOT NULL,
	"status" text DEFAULT 'learning',
	"correct_count" integer DEFAULT 0,
	"wrong_count" integer DEFAULT 0,
	"last_reviewed_at" timestamp,
	"next_review_at" timestamp,
	"ease_factor" integer DEFAULT 2.5,
	"interval" integer DEFAULT 0,
	"repetition" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vocabulary" ADD CONSTRAINT "user_vocabulary_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vocabulary" ADD CONSTRAINT "user_vocabulary_vocabulary_id_vocabulary_id_fk" FOREIGN KEY ("vocabulary_id") REFERENCES "public"."vocabulary"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_ai_idx" ON "ai_interactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_session_idx" ON "learning_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_vocab_idx" ON "user_vocabulary" USING btree ("user_id","vocabulary_id");--> statement-breakpoint
CREATE INDEX "next_review_idx" ON "user_vocabulary" USING btree ("next_review_at");
CREATE TABLE "user_phrases" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"phrase_id" text NOT NULL,
	"status" text DEFAULT 'learning',
	"is_favorite" boolean DEFAULT false,
	"is_learned" boolean DEFAULT false,
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
ALTER TABLE "user_vocabulary" ADD COLUMN "is_favorite" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_vocabulary" ADD COLUMN "is_learned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_phrases" ADD CONSTRAINT "user_phrases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_phrases" ADD CONSTRAINT "user_phrases_phrase_id_phrases_id_fk" FOREIGN KEY ("phrase_id") REFERENCES "public"."phrases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_phrase_idx" ON "user_phrases" USING btree ("user_id","phrase_id");--> statement-breakpoint
ALTER TABLE "phrases" DROP COLUMN "is_favorite";--> statement-breakpoint
ALTER TABLE "phrases" DROP COLUMN "is_learned";--> statement-breakpoint
ALTER TABLE "vocabulary" DROP COLUMN "is_favorite";--> statement-breakpoint
ALTER TABLE "vocabulary" DROP COLUMN "is_learned";
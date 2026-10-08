DROP INDEX "category_idx";--> statement-breakpoint
ALTER TABLE "phrases" ADD COLUMN "difficulty" "difficulty" DEFAULT 'beginner';--> statement-breakpoint
ALTER TABLE "phrases" ADD COLUMN "is_favorite" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "phrases" ADD COLUMN "is_learned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "phrases" ADD COLUMN "tags" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "phrases" DROP COLUMN "category";
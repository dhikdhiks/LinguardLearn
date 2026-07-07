ALTER TABLE "vocabulary" ADD COLUMN "is_favorite" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "vocabulary" ADD COLUMN "is_learned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "vocabulary" ADD COLUMN "tags" text[] DEFAULT '{}';
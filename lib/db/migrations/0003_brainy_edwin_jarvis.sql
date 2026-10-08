CREATE TABLE "phrases" (
	"id" text PRIMARY KEY NOT NULL,
	"phrase" text NOT NULL,
	"translation" text NOT NULL,
	"phonetic" text,
	"category" text DEFAULT 'general',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "phrases_phrase_unique" UNIQUE("phrase")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "phrase_idx" ON "phrases" USING btree ("phrase");--> statement-breakpoint
CREATE INDEX "category_idx" ON "phrases" USING btree ("category");
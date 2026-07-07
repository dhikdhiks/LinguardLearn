CREATE TYPE "public"."difficulty" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."part_of_speech" AS ENUM('noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection');--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vocabulary" (
	"id" text PRIMARY KEY NOT NULL,
	"word" text NOT NULL,
	"translation" text,
	"definition" text,
	"example_sentence" text,
	"part_of_speech" "part_of_speech",
	"difficulty" "difficulty" DEFAULT 'beginner',
	"phonetic" text,
	"audio_url" text,
	"v1" text,
	"v2" text,
	"v3" text,
	"v_ing" text,
	"v_s" text,
	"plural_form" text,
	"synonyms" jsonb DEFAULT '[]'::jsonb,
	"antonyms" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vocabulary_word_unique" UNIQUE("word")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "word_idx" ON "vocabulary" USING btree ("word");--> statement-breakpoint
CREATE INDEX "part_of_speech_idx" ON "vocabulary" USING btree ("part_of_speech");
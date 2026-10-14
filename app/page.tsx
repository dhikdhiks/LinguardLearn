'use client';

import { Button, Card, Chip } from '@heroui/react';
import { Brain, BookOpen, MessageSquare, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="max-w-4xl space-y-8 text-center">
        {/* Logo & Tagline */}
        <div className="space-y-4">
          <Chip size="lg" variant="soft" color="accent" className="mb-2">
            <Chip.Label className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              English Vocabulary &amp; Quiz Learning
            </Chip.Label>
          </Chip>
          <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
            <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              LinguaLearn
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground md:text-2xl">
            Master English vocabulary at your own pace — with smart quizzes,
            spaced repetition, and progress that adapts to you.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col justify-center gap-4 pt-4 sm:flex-row">
          <Link href="/register">
            <Button size="lg" variant="primary" className="w-full px-8 py-6 text-lg sm:w-auto">
              Start Learning Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full px-8 py-6 text-lg sm:w-auto">
              Sign In
            </Button>
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 gap-6 pt-12 text-left md:grid-cols-3">
          <FeatureCard
            icon={<Brain className="h-9 w-9 text-primary" />}
            title="Personalized Practice"
            description="Exercises adapt to your level and target your weak spots automatically."
          />
          <FeatureCard
            icon={<BookOpen className="h-9 w-9 text-primary" />}
            title="Spaced Repetition"
            description="A proven method to lock vocabulary and grammar into long-term memory."
          />
          <FeatureCard
            icon={<MessageSquare className="h-9 w-9 text-primary" />}
            title="Phrase Drills"
            description="Practice real-world phrases and build fluency beyond single words."
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="p-6 transition-shadow hover:shadow-md">
      <div className="mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </Card>
  );
}

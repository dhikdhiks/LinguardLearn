'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Play,
  Users,
  BookOpen,
  MessageSquare,
  Hash,
  TrendingUp,
  Globe,
  User,
  Calendar,
  Keyboard,
  ListChecks,
  Shuffle,
  PlusCircle,
} from 'lucide-react';
import { Button, Card, Chip, Skeleton, Spinner } from '@heroui/react';

interface PublicQuiz {
  id: string;
  name: string;
  description: string | null;
  contentType: 'vocabulary' | 'phrases' | 'mixed';
  direction: 'source_to_target' | 'target_to_source' | 'mixed';
  questionType: 'type_in' | 'multiple_choice' | 'mixed';
  questionsPerSession: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  creatorName: string;
  playedCount: number;
}

export default function BrowsePublicQuizzesPage() {
  const [quizzes, setQuizzes] = useState<PublicQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchQuizzes = async (pageToFetch: number, append = false) => {
    if (loadingMore) return;
    if (append && !hasMore) return;

    setLoadingMore(true);
    try {
      const offset = (pageToFetch - 1) * PAGE_SIZE;
      const res = await fetch(`/api/quiz-custom/sets/public?limit=${PAGE_SIZE}&offset=${offset}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load public quizzes');

      if (append) {
        setQuizzes((prev) => [...prev, ...data.data]);
      } else {
        setQuizzes(data.data);
        setTotal(data.total);
        setHasMore(data.hasMore);
      }
      setPage(pageToFetch);
    } catch (error) {
      console.error('Failed to fetch public quizzes:', error);
      if (!append) {
        alert('Failed to load public quizzes. Please try again.');
      }
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchQuizzes(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = () => {
    fetchQuizzes(page + 1, true);
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'vocabulary': return <BookOpen className="h-4 w-4" />;
      case 'phrases': return <MessageSquare className="h-4 w-4" />;
      default: return <Hash className="h-4 w-4" />;
    }
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'vocabulary': return 'Vocabulary';
      case 'phrases': return 'Phrases';
      case 'mixed': return 'Mixed';
      default: return type;
    }
  };

  const getDirectionLabel = (dir: string) => {
    switch (dir) {
      case 'source_to_target': return 'EN → ID';
      case 'target_to_source': return 'ID → EN';
      case 'mixed': return 'Mixed';
      default: return dir;
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'type_in': return 'Type In';
      case 'multiple_choice': return 'Multiple Choice';
      case 'mixed': return 'Mixed';
      default: return type;
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'type_in': return <Keyboard className="h-4 w-4" />;
      case 'multiple_choice': return <ListChecks className="h-4 w-4" />;
      default: return <Shuffle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCount = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  return (
    <div className="py-8 px-4">
      <div className="mx-auto max-w-5xl">
        {/* HEADER */}
        <div className="mb-6">
          <Link
            href="/quiz-custom"
            className="mb-4 inline-flex items-center gap-2 text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Quizzes
          </Link>
          <Card className="p-6">
            <h1 className="mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent">
              Browse Public Quizzes
            </h1>
            <p className="text-muted-foreground">
              Discover quizzes published by other learners. Hit &quot;Start&quot; to play right away!
            </p>
          </Card>
        </div>

        {loading && quizzes.length === 0 ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton animationType="shimmer" className="h-7 w-64" />
                    <Skeleton animationType="pulse" className="h-4 w-96" />
                  </div>
                  <Skeleton animationType="pulse" className="h-10 w-28" />
                </div>
                <div className="flex gap-4">
                  <Skeleton animationType="pulse" className="h-4 w-24" />
                  <Skeleton animationType="pulse" className="h-4 w-24" />
                  <Skeleton animationType="pulse" className="h-4 w-24" />
                </div>
              </Card>
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="mx-auto mb-4 h-16 w-16 text-muted" />
            <h2 className="mb-2 text-xl font-bold text-foreground">No Public Quizzes Yet</h2>
            <p className="mb-6 text-muted-foreground">
              There are no quizzes published by other members yet.
            </p>
            <Link href="/quiz-custom/create">
              <Button variant="primary">
                <PlusCircle className="mr-1 h-4 w-4" /> Create &amp; Publish a Quiz
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            <div className="mb-6 space-y-4">
              {quizzes.map((quiz) => (
                <Card
                  key={quiz.id}
                  className="overflow-hidden transition-shadow hover:shadow-xl"
                >
                  <div className="p-6">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-3">
                          <h2 className="truncate text-xl font-bold text-foreground">
                            {quiz.name}
                          </h2>
                          <Chip size="sm" variant="soft" color="accent">
                            <Chip.Label className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              Public
                            </Chip.Label>
                          </Chip>
                        </div>
                        {quiz.description && (
                          <p className="mb-3 line-clamp-2 text-muted-foreground">
                            {quiz.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            {getContentTypeIcon(quiz.contentType)}
                            {getContentTypeLabel(quiz.contentType)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="flex h-4 w-4 items-center justify-center">↔</span>
                            {getDirectionLabel(quiz.direction)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            {getQuestionTypeIcon(quiz.questionType)}
                            {getQuestionTypeLabel(quiz.questionType)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <TrendingUp className="h-4 w-4" />
                            {formatCount(quiz.playedCount)} plays
                          </span>
                          <span className="flex items-center gap-1.5">
                            <User className="h-4 w-4" />
                            {quiz.creatorName === 'You'
                              ? 'Created by you'
                              : `Created by ${quiz.creatorName}`}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            {formatDate(quiz.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <Link href={`/quiz-custom/${quiz.id}/play`}>
                          <Button variant="primary" className="rounded-xl shadow-sm">
                            <Play className="mr-1 h-4 w-4" />
                            Start
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {hasMore && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onPress={loadMore}
                  isDisabled={loadingMore}
                  className="px-6 py-3"
                >
                  {loadingMore ? (
                    <Spinner size="sm" color="accent" />
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Showing {quizzes.length} of {total} public quizzes
            </p>
          </>
        )}
      </div>
    </div>
  );
}

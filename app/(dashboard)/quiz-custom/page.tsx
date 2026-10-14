'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PlusCircle,
  Edit,
  Trash2,
  Play,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Upload,
  Globe,
  Keyboard,
  ListChecks,
  Shuffle,
  BookOpen,
  MessageSquare,
  History,
} from 'lucide-react';
import { Button, Card, Chip, Skeleton, Spinner } from '@heroui/react';

interface QuizSet {
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
}

interface Attempt {
  id: string;
  setId: string;
  setName: string | null;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  durationSeconds: number | null;
  startedAt: string;
  endedAt: string | null;
}

export default function QuizCustomListPage() {
  const router = useRouter();
  const [sets, setSets] = useState<QuizSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Record<string, Attempt[]>>({});
  const [loadingAttempts, setLoadingAttempts] = useState<Set<string>>(new Set());

  const fetchSets = async () => {
    try {
      const res = await fetch('/api/quiz-custom/sets');
      const data = await res.json();
      setSets(data);
    } catch (error) {
      console.error('Failed to fetch quiz sets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttempts = async (setId: string) => {
    setLoadingAttempts(prev => new Set(prev).add(setId));
    try {
      const res = await fetch(`/api/quiz-custom/attempts?setId=${setId}&limit=5`);
      const data = await res.json();
      setAttempts(prev => ({ ...prev, [setId]: data.data }));
    } catch (error) {
      console.error('Failed to fetch attempts:', error);
    } finally {
      setLoadingAttempts(prev => {
        const s = new Set(prev);
        s.delete(setId);
        return s;
      });
    }
  };

  const toggleExpand = (setId: string) => {
    if (expandedId === setId) {
      setExpandedId(null);
    } else {
      setExpandedId(setId);
      if (!attempts[setId]) fetchAttempts(setId);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this quiz? All questions and history will be removed.')) return;
    try {
      await fetch(`/api/quiz-custom/sets/${id}`, { method: 'DELETE' });
      setSets(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete quiz');
    }
  };

  const handleShare = async (id: string) => {
    const url = `${window.location.origin}/quiz-custom/${id}/play`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Quiz link copied! Share it with your friends.');
    } catch (err) {
      alert('Failed to copy quiz link');
    }
  };

  useEffect(() => {
    fetchSets();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton animationType="shimmer" className="h-9 w-56" />
            <Skeleton animationType="pulse" className="h-5 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton animationType="pulse" className="h-9 w-32" />
            <Skeleton animationType="pulse" className="h-9 w-32" />
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton animationType="shimmer" className="h-7 w-2/3" />
              <Skeleton animationType="pulse" className="mt-3 h-4 w-1/2" />
              <Skeleton animationType="pulse" className="mt-2 h-4 w-1/3" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quizzes</h1>
          <p className="text-sm text-muted-foreground">
            Build your own quizzes from the words and phrases you choose. Perfect for targeted practice.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/quiz-custom/browse"
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-purple-700"
          >
            <Globe className="h-4 w-4" /> Browse Public Quizzes
          </Link>
          <Link
            href="/quiz-custom/import"
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-700"
          >
            <Upload className="h-4 w-4" /> Import Questions
          </Link>
          <Link
            href="/quiz-custom/create"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4" /> New Quiz
          </Link>
        </div>
      </div>

      {sets.length === 0 ? (
        <Card className="py-16 text-center">
          <p className="mb-4 text-lg text-muted-foreground">No custom quizzes yet.</p>
          <Link
            href="/quiz-custom/create"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4" /> Create Your First Quiz
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {sets.map((quiz) => (
            <Card key={quiz.id} className="overflow-hidden">
              {/* Quiz Card Header */}
              <button
                onClick={() => toggleExpand(quiz.id)}
                className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="truncate text-xl font-bold text-foreground">{quiz.name}</h2>
                    <Chip size="sm" variant="soft" color="accent">
                      <Chip.Label className="flex items-center gap-1">
                        {quiz.contentType === 'vocabulary' ? <BookOpen className="h-3 w-3" /> : quiz.contentType === 'phrases' ? <MessageSquare className="h-3 w-3" /> : <Shuffle className="h-3 w-3" />}
                        {getContentTypeLabel(quiz.contentType)}
                      </Chip.Label>
                    </Chip>
                    <Chip size="sm" variant="soft">
                      <Chip.Label>{getDirectionLabel(quiz.direction)}</Chip.Label>
                    </Chip>
                    <Chip size="sm" variant="soft" color="success">
                      <Chip.Label className="flex items-center gap-1">
                        {quiz.questionType === 'type_in' ? <Keyboard className="h-3 w-3" /> : quiz.questionType === 'multiple_choice' ? <ListChecks className="h-3 w-3" /> : <Shuffle className="h-3 w-3" />}
                        {getQuestionTypeLabel(quiz.questionType)}
                      </Chip.Label>
                    </Chip>
                    {quiz.isPublic && (
                      <Chip size="sm" variant="soft" color="warning">
                        <Chip.Label className="flex items-center gap-1">
                          <Globe className="h-3 w-3" /> Public
                        </Chip.Label>
                      </Chip>
                    )}
                  </div>
                  {quiz.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{quiz.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span>Created: {formatDate(quiz.createdAt)}</span>
                    <span>Updated: {formatDate(quiz.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/quiz-custom/${quiz.id}/play`}
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-green-700"
                  >
                    <Play className="h-4 w-4" /> Start
                  </Link>
                  <Link
                    href={`/quiz-custom/create?edit=${quiz.id}`}
                    onClick={e => e.stopPropagation()}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-blue-600"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShare(quiz.id); }}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-green-600"
                    title="Copy quiz link"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(quiz.id); }}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleExpand(quiz.id); }}
                    className="rounded-lg p-2 text-muted-foreground transition hover:text-foreground"
                  >
                    {expandedId === quiz.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </button>

              {/* Expanded: Recent Attempts */}
              {expandedId === quiz.id && (
                <div className="border-t border-border bg-accent/30 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-medium text-foreground">
                      <History className="h-4 w-4" />
                      Recent History
                    </h3>
                    <Link
                      href={`/quiz-custom/${quiz.id}/history`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View all
                    </Link>
                  </div>
                  {loadingAttempts.has(quiz.id) ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                      <Spinner size="sm" color="accent" />
                      Loading history…
                    </div>
                  ) : attempts[quiz.id]?.length === 0 ? (
                    <div className="py-4 text-center text-muted-foreground">No attempts yet.</div>
                  ) : (
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {attempts[quiz.id]?.slice(0, 5).map((attempt) => (
                        <div key={attempt.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                              attempt.score >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                              attempt.score >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                              'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                            }`}>
                              {attempt.score}%
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {attempt.correctAnswers} / {attempt.totalQuestions} correct
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(attempt.startedAt)} • {formatDuration(attempt.durationSeconds)}
                              </div>
                            </div>
                          </div>
                          <Link
                            href={`/quiz-custom/${quiz.id}/result/${attempt.id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Details
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

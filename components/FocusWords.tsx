'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Flame } from 'lucide-react';
import { Button, Card, Skeleton } from '@heroui/react';

interface Word {
  id: string;
  word: string;
  translation: string;
  partOfSpeech: string | null;
  difficulty: string | null;
}

// Skeleton component untuk loading state
function WordSkeleton() {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <div className="space-y-1">
        <Skeleton animationType="shimmer" className="h-5 w-40" />
        <Skeleton animationType="pulse" className="h-3.5 w-32" />
      </div>
      <Skeleton animationType="pulse" className="h-5 w-12" />
    </div>
  );
}

export default function FocusWords() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchRandomWords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vocabulary/random?limit=10');
      const data = await res.json();
      setWords(data);
    } catch (error) {
      console.error('Failed to fetch random words', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomWords();
  }, []);

  const handleRefresh = () => {
    fetchRandomWords();
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Flame className="h-5 w-5 text-orange-500" />
          Focus Practice
          <span className="text-sm font-normal text-muted-foreground">
            (not mastered yet)
          </span>
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          isDisabled={loading}
          className="flex items-center gap-1 text-primary"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      {loading ? (
        // Skeleton loading - 5 baris
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <WordSkeleton key={i} />
          ))}
        </div>
      ) : words.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          All words mastered! Add new words to keep going.
        </p>
      ) : (
        <div className="space-y-2">
          {words.map((word) => (
            <div key={word.id} className="flex items-center justify-between border-b border-border pb-2">
              <div>
                <span className="font-medium text-foreground">{word.word}</span>
                <span className="ml-2 text-sm text-muted-foreground">{word.translation}</span>
                <span className="ml-2 text-xs text-muted-foreground">{word.partOfSpeech}</span>
                <span className="ml-2 text-xs text-muted-foreground">{word.difficulty}</span>
              </div>
              <button
                onClick={() => router.push(`/vocabulary/edit/${word.id}`)}
                className="text-xs text-primary hover:underline"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

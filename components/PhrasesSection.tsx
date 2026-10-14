'use client';

import { useState } from 'react';
import { RefreshCw, MessageSquare } from 'lucide-react';
import { Button, Card, Skeleton } from '@heroui/react';

interface Phrase {
  id: string;
  phrase: string;
  translation: string | null;
  phonetic: string | null;
  difficulty: string | null;
}

function PhraseSkeleton() {
  return (
    <div className="border-b border-border pb-2 dark:border-gray-700">
      <Skeleton animationType="shimmer" className="mb-1 h-4 w-3/4" />
      <Skeleton animationType="pulse" className="h-3.5 w-1/2" />
    </div>
  );
}

export default function PhrasesSection({ phrases }: { phrases: Phrase[] }) {
  const [randomPhrases, setRandomPhrases] = useState<Phrase[]>(() =>
    phrases.slice(0, 10)
  );
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    // Shuffle di timeout biar UI responsive
    setTimeout(() => {
      const shuffled = [...phrases].sort(() => Math.random() - 0.5);
      setRandomPhrases(shuffled.slice(0, 10));
      setLoading(false);
    }, 0);
  };

  if (phrases.length === 0) return null;

  return (
    <Card className="mt-6 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <MessageSquare className="h-5 w-5 text-primary" />
          Everyday Phrases
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <PhraseSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {randomPhrases.map((p) => (
            <div key={p.id} className="border-b border-border pb-2 dark:border-gray-700">
              <div className="font-medium text-foreground">{p.phrase}</div>
              <div className="text-sm text-muted-foreground">{p.translation}</div>
              {p.phonetic && <div className="font-mono text-xs text-muted-foreground">{p.phonetic}</div>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

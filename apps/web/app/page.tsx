import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl text-center space-y-8">
        {/* Logo dan Tagline */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            LinguaLearn
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-700 max-w-2xl mx-auto">
          Kuasai Bahasa Inggris dengan <span className="font-semibold text-blue-600">AI</span> yang beradaptasi dengan gaya belajarmu.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link href="/register">
            <Button size="lg" className="w-full sm:w-auto px-8 py-6 text-lg bg-blue-600 hover:bg-blue-700">
              🚀 Mulai Belajar Gratis
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-6 text-lg">
              Masuk
            </Button>
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 text-left">
          <FeatureCard
            icon="🧠"
            title="AI Personal"
            description="Materi dan latihan disesuaikan dengan level dan kelemahanmu secara otomatis."
          />
          <FeatureCard
            icon="📚"
            title="Spaced Repetition"
            description="Metode ilmiah agar kosakata dan grammar melekat di ingatan jangka panjang."
          />
          <FeatureCard
            icon="🗣️"
            title="Latihan Speaking"
            description="AI akan mendengarkan dan memberi koreksi pengucapan secara real-time."
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
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <p className="text-gray-600 text-sm mt-1 leading-relaxed">{description}</p>
    </div>
  );
}
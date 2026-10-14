import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    // Translucent backdrop so the interactive particle starfield shows through
    <div className="min-h-screen bg-gradient-to-br from-slate-50/85 via-white/75 to-blue-50/40 dark:from-[#131314]/85 dark:via-[#151517]/80 dark:to-[#18181a]/75">
      <Navbar user={session.user} />
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
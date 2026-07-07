import Link from 'next/link';
import { BookOpen, Home, PlusCircle, LogOut, Upload, Brain } from 'lucide-react';
import { logout } from '@/app/actions/auth';

interface NavbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function Navbar({ user }: NavbarProps) {
  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">📚</span>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hidden sm:block">LinguaVault</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/dashboard" icon={<Home className="w-4 h-4" />}>Dashboard</NavLink>
            <NavLink href="/vocabulary" icon={<BookOpen className="w-4 h-4" />}>Kamus</NavLink>
            <NavLink href="/vocabulary/add" icon={<PlusCircle className="w-4 h-4" />}>Tambah</NavLink>
            <NavLink href="/vocabulary/import-batch" icon={<Upload className="w-4 h-4" />}>Import</NavLink>
            <NavLink href="/quiz" icon={<Brain className="w-4 h-4" />}>Kuis</NavLink>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{user.name || 'User'}</span>
            </div>

            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </form>
          </div>
        </div>

        <div className="md:hidden flex justify-around py-2 border-t border-gray-100 dark:border-gray-800">
          <MobileNavLink href="/dashboard" icon={<Home className="w-5 h-5" />}>Home</MobileNavLink>
          <MobileNavLink href="/vocabulary" icon={<BookOpen className="w-5 h-5" />}>Kamus</MobileNavLink>
          <MobileNavLink href="/vocabulary/add" icon={<PlusCircle className="w-5 h-5" />}>Tambah</MobileNavLink>
          <MobileNavLink href="/vocabulary/import-batch" icon={<Upload className="w-5 h-5" />}>Import</MobileNavLink>
          <MobileNavLink href="/quiz" icon={<Brain className="w-5 h-5" />}>Kuis</MobileNavLink>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children, icon }: { href: string; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all">
      {icon}{children}
    </Link>
  );
}

function MobileNavLink({ href, children, icon }: { href: string; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
      {icon}<span>{children}</span>
    </Link>
  );
}
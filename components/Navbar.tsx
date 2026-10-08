'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  BookOpen,
  Home,
  PlusCircle,
  LogOut,
  Moon,
  Sun,
  Upload,
  Brain,
  MessageSquare,
  Download,
  Menu,
  X,
} from 'lucide-react';
import { signOut } from "next-auth/react";

interface NavbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function Navbar({ user }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">📚</span>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hidden sm:block">
              LinguaVault
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/dashboard" icon={<Home className="w-4 h-4" />}>
              Dashboard
            </NavLink>
            <NavLink href="/vocabulary" icon={<BookOpen className="w-4 h-4" />}>
              Kamus
            </NavLink>
            <NavLink href="/phrases" icon={<MessageSquare className="w-4 h-4" />}>
              Kalimat
            </NavLink>
            <NavLink href="/quiz" icon={<Brain className="w-4 h-4" />}>
              Kuis
            </NavLink>

            {/* Export Dropdown */}
            {/* <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all">
                <Download className="w-4 h-4" />
                Ekspor
              </button>
              <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <Link
                  href="/vocabulary/export"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-t-lg"
                >
                  📚 Ekspor Vocabulary
                </Link>
                <Link
                  href="/phrases/export"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-b-lg"
                >
                  💬 Ekspor Phrases
                </Link>
              </div>
            </div> */}

            {/* Import/Export Dropdown */}
<div className="relative group">
  <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all">
    <Upload className="w-4 h-4" />
    <span>Impor/Ekspor</span>
  </button>
  <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
    <Link href="/vocabulary/import-batch" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-t-lg">
      📥 Impor Vocabulary
    </Link>
    <Link href="/phrases/import-batch" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30">
      📥 Impor Phrases
    </Link>
    <Link href="/vocabulary/export" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30">
      📤 Ekspor Vocabulary
    </Link>
    <Link href="/phrases/export" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-b-lg">
      📤 Ekspor Phrases
    </Link>
  </div>
</div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              {mounted &&
                (theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                ))}
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                {user.name || 'User'}
              </span>
            </div>
<button
  onClick={() => signOut({ callbackUrl: '/' })}
  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
>
  <LogOut className="w-4 h-4" />
  <span className="hidden sm:inline">Logout</span>
</button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-700"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
            <MobileNavLink href="/dashboard" icon={<Home className="w-5 h-5" />}>
              Dashboard
            </MobileNavLink>
            <MobileNavLink href="/vocabulary" icon={<BookOpen className="w-5 h-5" />}>
              Kamus
            </MobileNavLink>
            <MobileNavLink href="/phrases" icon={<MessageSquare className="w-5 h-5" />}>
              Kalimat
            </MobileNavLink>
            <MobileNavLink href="/quiz" icon={<Brain className="w-5 h-5" />}>
              Kuis
            </MobileNavLink>
            <div className="pl-4 space-y-1">
              <MobileNavLink href="/vocabulary/export" icon={<Download className="w-4 h-4" />}>
                Ekspor Vocabulary
              </MobileNavLink>
              <MobileNavLink href="/phrases/export" icon={<Download className="w-4 h-4" />}>
                Ekspor Phrases
              </MobileNavLink>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({
  href,
  children,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
    >
      {icon}
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  children,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
    >
      {icon}
      {children}
    </Link>
  );
}
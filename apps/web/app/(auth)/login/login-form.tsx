'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { loginUser, type AuthFormState } from '@/app/actions/auth';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
    >
      {pending ? 'Memproses...' : 'Masuk dengan Email'}
    </Button>
  );
}

export default function LoginForm({ externalError }: { externalError?: string | null }) {
  const router = useRouter();
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    loginUser,
    {}
  );

  useEffect(() => {
    // Jika sukses, signIn seharusnya sudah redirect. Fallback:
    if (state.success) {
      router.push('/dashboard');
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="mt-8 space-y-6">
      {(externalError || state.error) && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg"
        >
          {externalError || state.error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Alamat Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="contoh@email.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Kata Sandi
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="••••••••"
          />
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}

'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const deviceFingerprint = btoa(navigator.userAgent + navigator.language + screen.width + screen.height);

      const result = await signIn('credentials', {
        email,
        password,
        deviceFingerprint,
        deviceName: navigator.platform,
        redirect: false,
      });

      if (result?.error) {
        console.error('[LOGIN] NextAuth error:', result.error);
        setError(result.error === 'CredentialsSignin' ? 'Invalid email or password' : 'Auth error: ' + result.error);
      } else {
        router.push('/chat');
        router.refresh();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-parchment-700/50">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500">
          <span className="text-xl font-serif text-parchment-100">l</span>
        </div>
        <CardTitle className="text-2xl font-serif text-indigo-500">Welcome back</CardTitle>
        <CardDescription>Sign in to continue your journey with lurisa</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-error/10 p-3 text-sm text-error">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-charcoal-700" htmlFor="email">Email</label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-parchment-100"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-charcoal-700" htmlFor="password">Password</label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-parchment-100 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-300 hover:text-charcoal-500"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>
            ) : 'Sign In'}
          </Button>
          <p className="text-sm text-charcoal-500 text-center">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-indigo-500 hover:underline">Create one</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}


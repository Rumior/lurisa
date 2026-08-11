'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!consentGiven) {
      setError('Please agree to the privacy policy to continue');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, consentGiven }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong');
      } else {
        setSuccess(true);
        setTimeout(() => { router.push('/login'); }, 2000);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <Card className="border-parchment-700/50">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-sage-500 mb-4" />
          <CardTitle className="text-xl font-serif text-indigo-500 mb-2">Account created</CardTitle>
          <CardDescription>Redirecting you to sign in...</CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-parchment-700/50">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500">
          <span className="text-xl font-serif text-parchment-100">l</span>
        </div>
        <CardTitle className="text-2xl font-serif text-indigo-500">Begin your journey</CardTitle>
        <CardDescription>Create your lurisa account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-error/10 p-3 text-sm text-error">{error}</div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-charcoal-700" htmlFor="name">Name</label>
            <Input id="name" type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required className="bg-parchment-100" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-charcoal-700" htmlFor="email">Email</label>
            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-parchment-100" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-charcoal-700" htmlFor="password">Password</label>
            <div className="relative">
              <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="bg-parchment-100 pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-300 hover:text-charcoal-500">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <input type="checkbox" id="consent" checked={consentGiven} onChange={(e) => setConsentGiven(e.target.checked)} className="mt-1 h-4 w-4 rounded border-parchment-700 text-indigo-500 focus:ring-indigo-500" />
            <label htmlFor="consent" className="text-sm text-charcoal-500 leading-relaxed">
              I agree that lurisa will store my memories and personal data to help me grow. I understand I can view, edit, delete, or export my data at any time.
            </label>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</> : 'Create Account'}
          </Button>
          <p className="text-sm text-charcoal-500 text-center">
            Already have an account?{' '}<Link href="/login" className="text-indigo-500 hover:underline">Sign in</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

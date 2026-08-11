import { LoginForm } from '@/components/auth/login-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In — lurisa',
  description: 'Sign in to your lurisa account',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment-300 px-4">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}

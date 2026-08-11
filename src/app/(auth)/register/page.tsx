import { RegisterForm } from '@/components/auth/register-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account — lurisa',
  description: 'Create your lurisa account',
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment-300 px-4 py-8">
      <div className="w-full max-w-md">
        <RegisterForm />
      </div>
    </div>
  );
}

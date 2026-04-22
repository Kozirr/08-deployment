import { Suspense } from 'react';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Log in — Tempo' };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

'use client';

import { Button, Spinner } from '@gaming-platform/ui';
import { CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import { authApi } from '@/lib/auth-api';

type Status = 'verifying' | 'success' | 'error';

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing a token.');
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((error: { message?: string }) => {
        setStatus('error');
        setMessage(error?.message ?? 'This verification link is invalid or has expired.');
      });
  }, [token]);

  if (status === 'verifying') {
    return (
      <div className="space-y-4 text-center">
        <Spinner size={28} className="mx-auto" />
        <p className="text-sm text-muted-foreground">Verifying your email…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      {status === 'success' ? (
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
      ) : (
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
      )}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {status === 'success' ? 'Email verified' : 'Verification failed'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {status === 'success'
            ? 'Your email address has been confirmed. You can now access every feature.'
            : message}
        </p>
      </div>
      <Button asChild variant="gradient" className="w-full">
        <Link href="/">Go to dashboard</Link>
      </Button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Spinner size={24} />}>
      <VerifyEmailInner />
    </Suspense>
  );
}

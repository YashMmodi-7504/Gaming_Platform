import { Button } from '@gaming-platform/ui';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-7xl font-bold text-primary">404</p>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="max-w-md text-muted-foreground">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Button asChild variant="gradient">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}

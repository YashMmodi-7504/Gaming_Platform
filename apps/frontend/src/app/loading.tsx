import { Spinner } from '@gaming-platform/ui';

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size={32} label="Loading the platform" />
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@gaming-platform/ui';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Platform Settings' };

export default function AdminSettingsPage() {
  return (
    <div>
      <PageHeader title="Platform Settings" description="Global configuration and feature flags." />
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Platform-wide settings and feature flags will be managed here.
        </CardContent>
      </Card>
    </div>
  );
}

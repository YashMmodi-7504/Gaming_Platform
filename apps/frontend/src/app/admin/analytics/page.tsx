import { Card, CardContent, CardHeader, CardTitle } from '@gaming-platform/ui';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Analytics' };

export default function AdminAnalyticsPage() {
  return (
    <div>
      <PageHeader title="Analytics" description="Revenue, engagement, and retention." />
      <Card>
        <CardHeader>
          <CardTitle>Dashboard metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
            Charts render here once the Analytics module aggregates platform data.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

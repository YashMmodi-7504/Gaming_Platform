import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@gaming-platform/ui';
import { Activity, Gamepad2, Users, Wallet } from 'lucide-react';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Admin' };

const kpis = [
  { label: 'Total users', value: '—', icon: Users },
  { label: 'Active games', value: '—', icon: Gamepad2 },
  { label: 'GGR (30d)', value: '—', icon: Wallet },
  { label: 'Live sessions', value: '—', icon: Activity },
];

export default function AdminOverviewPage() {
  return (
    <div>
      <PageHeader title="Overview" description="Platform health and key metrics." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{kpi.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>System</CardTitle>
          <CardDescription>
            The admin API exposes a live runtime overview at <code>/api/v1/admin/overview</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Connect this panel to the Admin and Analytics modules to surface live data.
        </CardContent>
      </Card>
    </div>
  );
}

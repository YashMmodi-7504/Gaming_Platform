import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@gaming-platform/ui';
import { ShieldCheck, UserCircle2 } from 'lucide-react';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Manage your account and preferences." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-premium sheen group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet text-white shadow-glow-sm">
                <UserCircle2 className="h-4 w-4" />
              </span>
              <span className="text-gradient">Profile</span>
            </CardTitle>
            <CardDescription>Update your display name and avatar.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Profile management activates with the user data model.
          </CardContent>
        </Card>
        <Card className="card-premium sheen group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald to-accent text-white shadow-glow-neon">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="text-gradient">Security</span>
            </CardTitle>
            <CardDescription>Password and two-factor authentication.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Security settings activate with the user data model.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

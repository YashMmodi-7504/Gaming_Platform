import { Card, CardContent, CardHeader, CardTitle } from '@gaming-platform/ui';
import { Receipt } from 'lucide-react';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'History' };

export default function TransactionsPage() {
  return (
    <div>
      <PageHeader title="History" description="Your transaction ledger." />
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-gradient">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet text-white shadow-glow-sm">
              <Receipt className="h-4 w-4" />
            </span>
            Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="glass flex h-40 items-center justify-center rounded-xl border border-black/10 text-sm text-muted-foreground">
            The ledger appears here once transactions are recorded.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

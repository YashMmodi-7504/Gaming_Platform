'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Spinner,
} from '@gaming-platform/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/shared/page-header';
import { adminWalletApi, type WalletView } from '@/lib/wallet-api';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminWalletPage() {
  const queryClient = useQueryClient();
  const stats = useQuery({ queryKey: ['admin-wallet-stats'], queryFn: adminWalletApi.statistics });
  const overview = useQuery({ queryKey: ['admin-wallet-overview'], queryFn: () => adminWalletApi.overview(24) });
  const reconcile = useQuery({ queryKey: ['admin-wallet-reconcile'], queryFn: adminWalletApi.reconcile });

  const [adjust, setAdjust] = useState({ userId: '', currencyId: '', amount: '', reason: '' });
  const [inspectId, setInspectId] = useState('');
  const [inspected, setInspected] = useState<WalletView[] | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-wallet-stats'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-wallet-reconcile'] });
  };

  const credit = useMutation({
    mutationFn: () => adminWalletApi.credit(adjust),
    onSuccess: () => {
      invalidate();
      toast.success('Credited');
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Failed'),
  });
  const debit = useMutation({
    mutationFn: () => adminWalletApi.debit(adjust),
    onSuccess: () => {
      invalidate();
      toast.success('Debited');
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Failed'),
  });

  const inspect = useMutation({
    mutationFn: () => adminWalletApi.userWallets(inspectId),
    onSuccess: (data) => setInspected(data),
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Failed'),
  });

  const freeze = useMutation({
    mutationFn: (walletId: string) => adminWalletApi.freeze(walletId),
    onSuccess: () => {
      toast.success('Wallet frozen');
      inspect.mutate();
    },
  });
  const unfreeze = useMutation({
    mutationFn: (walletId: string) => adminWalletApi.unfreeze(walletId),
    onSuccess: () => {
      toast.success('Wallet unfrozen');
      inspect.mutate();
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Wallet Engine" description="Treasury, manual adjustments, reconciliation and risk." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Wallets" value={stats.data?.wallets ?? '—'} />
        <StatCard label="Available" value={stats.data?.available ?? '0'} />
        <StatCard label="Locked" value={stats.data?.locked ?? '0'} />
        <StatCard label="Pending" value={stats.data?.pending ?? '0'} />
        <StatCard label="Total" value={stats.data?.total ?? '0'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue (24h)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            {overview.isLoading ? (
              <Spinner />
            ) : overview.data ? (
              <>
                <Metric label="Turnover (bets)" value={overview.data.bets} />
                <Metric label="Wins paid" value={overview.data.wins} />
                <Metric label="House profit (GGR)" value={overview.data.houseProfit} />
                <Metric label="RTP" value={overview.data.rtp} />
                <Metric label="Deposits" value={overview.data.deposits} />
                <Metric label="Withdrawals" value={overview.data.withdrawals} />
                <Metric label="Cash flow" value={overview.data.cashFlow} />
                <Metric label="Bonuses" value={overview.data.bonuses} />
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ledger reconciliation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {reconcile.isLoading ? (
              <Spinner />
            ) : reconcile.data ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total debits</span>
                  <span className="font-mono">{reconcile.data.debit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total credits</span>
                  <span className="font-mono">{reconcile.data.credit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Difference</span>
                  <span className="font-mono">{reconcile.data.difference}</span>
                </div>
                <Badge variant={reconcile.data.balanced ? 'success' : 'destructive'}>
                  {reconcile.data.balanced ? 'Books balanced ✓' : 'Imbalance detected'}
                </Badge>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manual adjustment</CardTitle>
          <p className="text-sm text-muted-foreground">
            Credits and debits post immutable, double-entry ledger records — never direct balance writes.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Input placeholder="User ID" value={adjust.userId} onChange={(e) => setAdjust({ ...adjust, userId: e.target.value })} />
          <Input placeholder="Currency ID" value={adjust.currencyId} onChange={(e) => setAdjust({ ...adjust, currencyId: e.target.value })} />
          <Input placeholder="Amount" value={adjust.amount} onChange={(e) => setAdjust({ ...adjust, amount: e.target.value })} />
          <Input placeholder="Reason" value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} />
          <div className="flex gap-2 sm:col-span-4">
            <Button variant="gradient" disabled={!adjust.userId || !adjust.amount || credit.isPending} onClick={() => credit.mutate()}>
              Credit
            </Button>
            <Button variant="destructive" disabled={!adjust.userId || !adjust.amount || debit.isPending} onClick={() => debit.mutate()}>
              Debit
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>User wallet inspection</CardTitle>
          <div className="flex gap-2">
            <Input placeholder="User ID" className="h-8 w-56" value={inspectId} onChange={(e) => setInspectId(e.target.value)} />
            <Button size="sm" disabled={!inspectId || inspect.isPending} onClick={() => inspect.mutate()}>
              Inspect
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {inspected?.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <div>
                <p className="font-medium">{w.type}</p>
                <p className="text-xs text-muted-foreground">avail {w.available} · locked {w.locked} · v{w.version}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={w.status === 'ACTIVE' ? 'success' : 'warning'}>{w.status}</Badge>
                {w.status === 'ACTIVE' ? (
                  <Button size="sm" variant="outline" onClick={() => freeze.mutate(w.id)}>Freeze</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => unfreeze.mutate(w.id)}>Unfreeze</Button>
                )}
              </div>
            </div>
          ))}
          {inspected && inspected.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No wallets for this user.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}

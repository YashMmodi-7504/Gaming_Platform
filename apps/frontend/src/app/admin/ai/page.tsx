'use client';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Spinner, cn } from '@gaming-platform/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bot, ShieldAlert, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/shared/page-header';
import { adminAiApi, type AiAnswer, type RiskProfile } from '@/lib/ai-api';

type Tab = 'assistant' | 'fraud' | 'risk';
const TABS: Tab[] = ['assistant', 'fraud', 'risk'];

const BAND_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  low: 'success',
  medium: 'warning',
  high: 'destructive',
  critical: 'destructive',
};

export default function AdminAiPage() {
  const [tab, setTab] = useState<Tab>('assistant');
  return (
    <div className="space-y-6">
      <PageHeader title="AI Assistant" description="Ask questions, get insights, detect fraud and assess risk." />
      <div className="flex gap-1 rounded-lg bg-black/5 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
              tab === t ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'assistant' ? <Assistant /> : null}
      {tab === 'fraud' ? <Fraud /> : null}
      {tab === 'risk' ? <Risk /> : null}
    </div>
  );
}

function Assistant() {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<AiAnswer[]>([]);

  const ask = useMutation({
    mutationFn: (q: string) => adminAiApi.ask(q),
    onSuccess: (a) => setHistory((h) => [a, ...h]),
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Failed'),
  });

  const quick = (label: string, fn: () => Promise<AiAnswer>) => ({ label, fn });
  const quicks = [
    quick('Explain revenue', () => adminAiApi.revenue(24)),
    quick('Tournaments', adminAiApi.tournaments),
    quick('Wallet', adminAiApi.wallet),
    quick('Alerts', adminAiApi.alerts),
    quick('Daily report', adminAiApi.report),
  ];
  const run = useMutation({
    mutationFn: (fn: () => Promise<AiAnswer>) => fn(),
    onSuccess: (a) => setHistory((h) => [a, ...h]),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ask anything — e.g. explain revenue today"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && question && ask.mutate(question)}
            />
            <Button variant="gradient" disabled={!question || ask.isPending} onClick={() => ask.mutate(question)}>
              {ask.isPending ? <Spinner size={16} /> : <Sparkles className="h-4 w-4" />}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {quicks.map((q) => (
              <Button key={q.label} size="sm" variant="outline" disabled={run.isPending} onClick={() => run.mutate(q.fn)}>
                {q.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {history.map((a, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Bot className="h-3.5 w-3.5" /> {a.topic} · {a.provider}
            </div>
            <p className="whitespace-pre-wrap text-sm">{a.answer}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Fraud() {
  const scan = useQuery({ queryKey: ['ai-fraud-scan'], queryFn: () => adminAiApi.fraudScan(50) });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4" /> Flagged accounts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {scan.isLoading ? <Spinner /> : null}
        {scan.data && scan.data.length > 0 ? (
          scan.data.map((a) => (
            <div key={a.userId} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs">{a.userId.slice(0, 14)}</span>
                <Badge variant={BAND_VARIANT[a.band]}>
                  {a.band} · {a.score}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {a.signals.map((s, i) => (
                  <span key={i} className="rounded-full bg-black/5 px-2 py-0.5 text-[10px]" title={s.detail}>
                    {s.type}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : scan.data ? (
          <p className="text-sm text-muted-foreground">No flagged accounts.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Risk() {
  const [userId, setUserId] = useState('');
  const [profile, setProfile] = useState<RiskProfile | null>(null);
  const lookup = useMutation({
    mutationFn: () => adminAiApi.riskProfile(userId),
    onSuccess: setProfile,
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Not found'),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="Player ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <Button disabled={!userId || lookup.isPending} onClick={() => lookup.mutate()}>
          Assess
        </Button>
      </div>
      {profile ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Risk score</p>
              <p className="text-3xl font-bold">{profile.risk.score}</p>
              <Badge variant={BAND_VARIANT[profile.risk.band]}>{profile.risk.band}</Badge>
              <p className="mt-3 text-xs text-muted-foreground">
                Segment <span className="font-semibold text-foreground">{profile.segment}</span> · churn{' '}
                {Math.round(profile.churnProbability * 100)}% · action {profile.retentionAction}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Responsible gaming</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {profile.responsibleGaming.length > 0 ? (
                profile.responsibleGaming.map((f) => (
                  <div key={f.code} className="flex items-center justify-between text-sm">
                    <span>{f.message}</span>
                    <Badge variant={BAND_VARIANT[f.severity]}>{f.severity}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No RG flags.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

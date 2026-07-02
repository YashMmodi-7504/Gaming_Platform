'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
  Spinner,
} from '@gaming-platform/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Laptop, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter';
import { PageHeader } from '@/components/shared/page-header';
import { authApi } from '@/lib/auth-api';

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : '—';
}

function ChangePasswordSection() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const mutation = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: () => {
      toast.success('Password changed. Other sessions were signed out.');
      setCurrent('');
      setNext('');
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Unable to change password'),
  });

  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet text-white shadow-glow-sm">
            <KeyRound className="h-4 w-4" />
          </span>
          <span className="text-gradient">Password</span>
        </CardTitle>
        <CardDescription>Changing your password signs out all other sessions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current">Current password</Label>
          <Input
            id="current"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="next">New password</Label>
          <Input id="next" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
          <PasswordStrengthMeter password={next} />
        </div>
        <Button
          variant="gradient"
          disabled={mutation.isPending || !current || next.length < 8}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? <Spinner size={18} /> : 'Update password'}
        </Button>
      </CardContent>
    </Card>
  );
}

function TwoFactorSection() {
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ['2fa-status'], queryFn: authApi.twoFactorStatus });
  const [setup, setSetup] = useState<{ qrCodeDataUrl: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disableCode, setDisableCode] = useState('');

  const begin = useMutation({
    mutationFn: authApi.twoFactorSetup,
    onSuccess: (data) => setSetup({ qrCodeDataUrl: data.qrCodeDataUrl, secret: data.secret }),
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Unable to start setup'),
  });

  const enable = useMutation({
    mutationFn: () => authApi.twoFactorEnable(code),
    onSuccess: (data) => {
      setRecoveryCodes(data.recoveryCodes);
      setSetup(null);
      setCode('');
      void queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      toast.success('Two-factor authentication enabled.');
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Invalid code'),
  });

  const disable = useMutation({
    mutationFn: () => authApi.twoFactorDisable(disableCode),
    onSuccess: () => {
      setDisableCode('');
      void queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      toast.success('Two-factor authentication disabled.');
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Invalid code'),
  });

  const enabled = status.data?.enabled ?? false;

  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald to-accent text-white shadow-glow-neon">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="text-gradient">Two-factor authentication</span>
          {enabled ? <Badge variant="success">Enabled</Badge> : <Badge variant="outline">Off</Badge>}
        </CardTitle>
        <CardDescription>Add a one-time code from an authenticator app at sign-in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recoveryCodes ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-warning">
              Save these recovery codes — they are shown only once.
            </p>
            <div className="glass grid grid-cols-2 gap-2 rounded-xl border border-gold/20 p-4 font-mono text-sm">
              {recoveryCodes.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
            <Button variant="outline" onClick={() => setRecoveryCodes(null)}>
              I&apos;ve saved them
            </Button>
          </div>
        ) : enabled ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="disable-code">Enter a code to disable</Label>
              <Input
                id="disable-code"
                inputMode="numeric"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
              />
            </div>
            <Button
              variant="destructive"
              disabled={disable.isPending || disableCode.length < 6}
              onClick={() => disable.mutate()}
            >
              {disable.isPending ? <Spinner size={18} /> : 'Disable 2FA'}
            </Button>
          </div>
        ) : setup ? (
          <div className="space-y-3">
            <div className="glass inline-block rounded-2xl border border-black/10 p-3 shadow-glow-neon">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={setup.qrCodeDataUrl}
                alt="Two-factor QR code"
                className="h-44 w-44 rounded-lg bg-white p-2"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Or enter this secret manually: <span className="font-mono">{setup.secret}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="enable-code">Verification code</Label>
              <Input
                id="enable-code"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <Button
              variant="gradient"
              disabled={enable.isPending || code.length < 6}
              onClick={() => enable.mutate()}
            >
              {enable.isPending ? <Spinner size={18} /> : 'Verify & enable'}
            </Button>
          </div>
        ) : (
          <Button variant="gradient" disabled={begin.isPending} onClick={() => begin.mutate()}>
            {begin.isPending ? <Spinner size={18} /> : 'Enable two-factor'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function SessionsSection() {
  const queryClient = useQueryClient();
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: authApi.listSessions });

  const revoke = useMutation({
    mutationFn: (id: string) => authApi.revokeSession(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session revoked');
    },
  });
  const revokeOthers = useMutation({
    mutationFn: authApi.revokeOtherSessions,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Other sessions signed out');
    },
  });

  return (
    <Card className="card-premium">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 font-display">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet text-white shadow-glow-sm">
              <Laptop className="h-4 w-4" />
            </span>
            <span className="text-gradient">Active sessions</span>
          </CardTitle>
          <CardDescription>Devices currently signed in to your account.</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={revokeOthers.isPending}
          onClick={() => revokeOthers.mutate()}
        >
          Sign out others
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {sessions.isLoading ? <Spinner /> : null}
        {sessions.data?.map((s) => (
          <div
            key={s.id}
            className="glass flex items-center justify-between rounded-xl border border-black/10 p-3 transition-colors hover:bg-black/5"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet text-white shadow-glow-sm">
                <Laptop className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium">
                  {s.deviceName ?? s.userAgent ?? 'Unknown device'}{' '}
                  {s.current ? <Badge variant="default">This device</Badge> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.ipAddress ?? 'unknown IP'} · last active {formatDate(s.lastActivityAt)}
                </p>
              </div>
            </div>
            {!s.current ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Revoke session"
                onClick={() => revoke.mutate(s.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ))}
        {sessions.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active sessions.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DevicesSection() {
  const queryClient = useQueryClient();
  const devices = useQuery({ queryKey: ['devices'], queryFn: authApi.listDevices });
  const trust = useMutation({
    mutationFn: ({ id, trusted }: { id: string; trusted: boolean }) =>
      authApi.trustDevice(id, trusted),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['devices'] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => authApi.removeDevice(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success('Device removed');
    },
  });

  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-primary text-white shadow-glow-neon">
            <Smartphone className="h-4 w-4" />
          </span>
          <span className="text-gradient">Trusted devices</span>
        </CardTitle>
        <CardDescription>Manage devices that have accessed your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {devices.isLoading ? <Spinner /> : null}
        {devices.data?.map((d) => (
          <div
            key={d.id}
            className="glass flex items-center justify-between rounded-xl border border-black/10 p-3 transition-colors hover:bg-black/5"
          >
            <div>
              <p className="text-sm font-medium">
                {d.name ?? `${d.browser ?? 'Unknown'} · ${d.os ?? ''}`}{' '}
                {d.isTrusted ? <Badge variant="success">Trusted</Badge> : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {d.ipAddress ?? 'unknown IP'} · last used {formatDate(d.lastUsedAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => trust.mutate({ id: d.id, trusted: !d.isTrusted })}
              >
                {d.isTrusted ? 'Untrust' : 'Trust'}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove device"
                onClick={() => remove.mutate(d.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {devices.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No devices recorded.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ActivitySection() {
  const history = useQuery({ queryKey: ['login-history'], queryFn: authApi.loginHistory });

  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald to-accent text-white shadow-glow-neon">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="text-gradient">Recent sign-in activity</span>
        </CardTitle>
        <CardDescription>The latest authentication attempts on your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {history.isLoading ? <Spinner /> : null}
        {history.data?.map((h) => (
          <div key={h.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-black/5">
            <span className="flex items-center gap-2">
              <ShieldCheck
                className={h.success ? 'h-4 w-4 text-success' : 'h-4 w-4 text-destructive'}
              />
              {h.success ? 'Successful sign-in' : `Failed (${h.failureReason ?? 'unknown'})`}
            </span>
            <span className="text-xs text-muted-foreground">
              {h.location ?? h.ipAddress ?? '—'} · {formatDate(h.createdAt)}
            </span>
          </div>
        ))}
        {history.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sign-in history yet.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function SecuritySettingsPage() {
  return (
    <div>
      <PageHeader title="Account security" description="Protect your account and manage access." />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChangePasswordSection />
        <TwoFactorSection />
        <SessionsSection />
        <DevicesSection />
        <div className="lg:col-span-2">
          <ActivitySection />
        </div>
      </div>
      <Separator className="my-8" />
    </div>
  );
}

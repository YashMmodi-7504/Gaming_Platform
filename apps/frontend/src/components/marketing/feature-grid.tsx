import { Card, CardDescription, CardHeader, CardTitle } from '@gaming-platform/ui';
import { Gauge, Lock, Radio, Wallet } from 'lucide-react';

const features = [
  {
    icon: Gauge,
    title: 'Built for scale',
    description: 'A Turborepo monorepo with independently deployable services and shared packages.',
  },
  {
    icon: Lock,
    title: 'Secure by default',
    description: 'JWT auth, RBAC, rate limiting, Helmet, and validated configuration everywhere.',
  },
  {
    icon: Radio,
    title: 'Real-time core',
    description: 'WebSocket gateway for live notifications, wallet updates, and game events.',
  },
  {
    icon: Wallet,
    title: 'Wallet-ready',
    description: 'Multi-currency wallet and append-only transaction ledger architecture.',
  },
];

export function FeatureGrid() {
  return (
    <section id="about" className="container py-20">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">Everything the platform needs</h2>
        <p className="mt-3 text-muted-foreground">
          A production foundation you can build many game modules on top of.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title} className="transition-colors hover:border-primary/40">
              <CardHeader>
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </span>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

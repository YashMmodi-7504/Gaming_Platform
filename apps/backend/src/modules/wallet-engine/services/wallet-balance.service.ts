import { Injectable } from '@nestjs/common';
import { Money } from '@gaming-platform/wallet-core';

import { WalletEngineService, type WalletView } from './wallet-engine.service';

export interface BalanceSummary {
  wallets: WalletView[];
  totalsByCurrency: Record<string, string>;
}

/**
 * Read-side balance access. Reads flow through the engine's wallet views; this
 * service adds aggregation for the dashboard.
 */
@Injectable()
export class WalletBalanceService {
  constructor(private readonly engine: WalletEngineService) {}

  async summary(userId: string): Promise<BalanceSummary> {
    const wallets = await this.engine.getWallets(userId);
    const totalsByCurrency: Record<string, string> = {};
    for (const wallet of wallets) {
      const prev = totalsByCurrency[wallet.currencyId];
      totalsByCurrency[wallet.currencyId] = prev ? Money.add(prev, wallet.total) : wallet.total;
    }
    return { wallets, totalsByCurrency };
  }
}

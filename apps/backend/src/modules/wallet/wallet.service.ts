import { Injectable } from '@nestjs/common';

import { WalletEngineService } from '../wallet-engine/services/wallet-engine.service';
import { WalletBalanceService } from '../wallet-engine/services/wallet-balance.service';

/**
 * Backwards-compatible wallet facade. Delegates to the Enterprise Wallet Engine,
 * which is the single source of truth for all balances. Retained so existing
 * `/wallet` routes keep working alongside the richer `/wallet-engine` API.
 */
@Injectable()
export class WalletService {
  constructor(
    private readonly engine: WalletEngineService,
    private readonly balances: WalletBalanceService,
  ) {}

  findByUser(userId: string) {
    return this.engine.getWallets(userId);
  }

  summary(userId: string) {
    return this.balances.summary(userId);
  }

  findByCurrency(userId: string, currencyId: string) {
    return this.engine.getOrCreateWallet(userId, currencyId);
  }
}

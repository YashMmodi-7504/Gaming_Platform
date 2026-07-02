import { Global, Module } from '@nestjs/common';

import { AdminWalletController } from './admin-wallet.controller';
import { WalletEngineController } from './wallet-engine.controller';
import { WalletGateway } from './wallet.gateway';
import { BonusWalletService } from './services/bonus-wallet.service';
import { ReservationService } from './services/reservation.service';
import { RewardWalletService } from './services/reward-wallet.service';
import { SettlementService } from './services/settlement.service';
import { SystemAccountService } from './services/system-account.service';
import { WalletBalanceService } from './services/wallet-balance.service';
import { WalletBridgeService } from './services/wallet-bridge.service';
import { WalletEngineService } from './services/wallet-engine.service';
import { WalletLedgerService } from './services/wallet-ledger.service';
import { WalletReportingService } from './services/wallet-reporting.service';
import { WalletTransactionService } from './services/wallet-transaction.service';

/**
 * The Enterprise Wallet & Financial Engine — the platform's financial backbone.
 * Every balance movement flows through {@link WalletEngineService} (atomic,
 * idempotent, optimistically-locked, double-entry ledgered). Game engines
 * integrate exclusively via {@link WalletBridgeService}, which is exported.
 */
@Global()
@Module({
  controllers: [WalletEngineController, AdminWalletController],
  providers: [
    SystemAccountService,
    WalletEngineService,
    WalletBalanceService,
    WalletTransactionService,
    WalletLedgerService,
    ReservationService,
    SettlementService,
    BonusWalletService,
    RewardWalletService,
    WalletReportingService,
    WalletBridgeService,
    WalletGateway,
  ],
  exports: [
    WalletEngineService,
    WalletBalanceService,
    WalletTransactionService,
    WalletReportingService,
    SettlementService,
    ReservationService,
    BonusWalletService,
    RewardWalletService,
    WalletBridgeService,
  ],
})
export class WalletEngineModule {}

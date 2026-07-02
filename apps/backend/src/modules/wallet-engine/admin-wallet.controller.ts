import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WalletType } from '@prisma/client';

import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../authorization/rbac.constants';
import { WalletEngineService } from './services/wallet-engine.service';
import { WalletLedgerService } from './services/wallet-ledger.service';
import { WalletTransactionService } from './services/wallet-transaction.service';
import { SettlementService } from './services/settlement.service';
import { WalletReportingService } from './services/wallet-reporting.service';
import { AdminAdjustDto, RollbackDto, WalletStatusDto } from './dto/wallet.dto';

@ApiTags('Admin · Wallet Engine')
@ApiBearerAuth()
@Controller('admin/wallet')
export class AdminWalletController {
  constructor(
    private readonly engine: WalletEngineService,
    private readonly ledger: WalletLedgerService,
    private readonly transactions: WalletTransactionService,
    private readonly settlement: SettlementService,
    private readonly reporting: WalletReportingService,
  ) {}

  @Get('statistics')
  @RequirePermissions(PERMISSIONS.WALLETS_READ)
  @ApiOperation({ summary: 'Platform wallet statistics' })
  statistics() {
    return this.reporting.walletStatistics();
  }

  @Get('reports/overview')
  @RequirePermissions(PERMISSIONS.WALLETS_READ)
  @ApiOperation({ summary: 'Gaming revenue report (turnover, wins, RTP, GGR)' })
  overview(@Query('hours') hours?: string) {
    return this.reporting.overview(hours ? Number(hours) : 24);
  }

  @Get('reconcile')
  @RequirePermissions(PERMISSIONS.WALLETS_READ)
  @ApiOperation({ summary: 'Ledger trial balance (debits vs credits)' })
  reconcile() {
    return this.ledger.reconcile();
  }

  @Get('users/:userId/wallets')
  @RequirePermissions(PERMISSIONS.WALLETS_READ)
  @ApiOperation({ summary: 'Inspect a user’s wallets' })
  userWallets(@Param('userId') userId: string) {
    return this.engine.getWallets(userId);
  }

  @Get('users/:userId/transactions')
  @RequirePermissions(PERMISSIONS.WALLETS_READ)
  @ApiOperation({ summary: 'Inspect a user’s transaction history' })
  userTransactions(@Param('userId') userId: string) {
    return this.transactions.list(userId, { limit: 100 });
  }

  @Get('wallets/:walletId/ledger')
  @RequirePermissions(PERMISSIONS.WALLETS_READ)
  @ApiOperation({ summary: 'Ledger entries for a wallet' })
  walletLedger(@Param('walletId') walletId: string) {
    return this.ledger.entriesForWallet(walletId);
  }

  @Post('credit')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.WALLETS_ADJUST)
  @ApiOperation({ summary: 'Manual credit (administrative adjustment)' })
  credit(@Body() dto: AdminAdjustDto) {
    return this.engine.credit(dto.userId, dto.currencyId, {
      amount: dto.amount,
      typeCode: 'ADMIN_ADJUSTMENT',
      description: dto.reason ?? 'Manual credit',
      idempotencyKey: dto.idempotencyKey,
    }, WalletType.MAIN);
  }

  @Post('debit')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.WALLETS_ADJUST)
  @ApiOperation({ summary: 'Manual debit (administrative adjustment)' })
  debit(@Body() dto: AdminAdjustDto) {
    return this.engine.debit(dto.userId, dto.currencyId, {
      amount: dto.amount,
      typeCode: 'PENALTY',
      description: dto.reason ?? 'Manual debit',
      idempotencyKey: dto.idempotencyKey,
    }, WalletType.MAIN);
  }

  @Post('freeze')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.WALLETS_ADJUST)
  @ApiOperation({ summary: 'Freeze a wallet' })
  freeze(@Body() dto: WalletStatusDto) {
    return this.engine.freeze(dto.walletId);
  }

  @Post('unfreeze')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.WALLETS_ADJUST)
  @ApiOperation({ summary: 'Unfreeze a wallet' })
  unfreeze(@Body() dto: WalletStatusDto) {
    return this.engine.unfreeze(dto.walletId);
  }

  @Post('rollback')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.WALLETS_ADJUST)
  @ApiOperation({ summary: 'Reverse a transaction (correction)' })
  rollback(@Body() dto: RollbackDto) {
    return this.settlement.rollback(dto.transactionId, dto.idempotencyKey);
  }
}

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WalletType } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WalletEngineService } from './services/wallet-engine.service';
import { WalletBalanceService } from './services/wallet-balance.service';
import { WalletTransactionService } from './services/wallet-transaction.service';
import { BonusWalletService } from './services/bonus-wallet.service';
import { RewardWalletService } from './services/reward-wallet.service';
import { GrantBonusDto, RewardPointsDto, TransactionQueryDto, TransferDto } from './dto/wallet.dto';

@ApiTags('Wallet Engine')
@ApiBearerAuth()
@Controller('wallet-engine')
export class WalletEngineController {
  constructor(
    private readonly engine: WalletEngineService,
    private readonly balances: WalletBalanceService,
    private readonly transactions: WalletTransactionService,
    private readonly bonus: BonusWalletService,
    private readonly rewards: RewardWalletService,
  ) {}

  @Get('balances')
  @ApiOperation({ summary: 'Get all wallet balances for the authenticated user' })
  myBalances(@CurrentUser('id') userId: string) {
    return this.balances.summary(userId);
  }

  @Get('wallets/:currencyId')
  @ApiOperation({ summary: 'Get (or create) the main wallet for a currency' })
  wallet(@CurrentUser('id') userId: string, @Param('currencyId') currencyId: string) {
    return this.engine.getOrCreateWallet(userId, currencyId, WalletType.MAIN);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List my transaction history (filter + paginate)' })
  history(@CurrentUser('id') userId: string, @Query() query: TransactionQueryDto) {
    return this.transactions.list(userId, query);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get a transaction by id' })
  transaction(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.transactions.findById(userId, id);
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer funds between my wallet types' })
  transfer(@CurrentUser('id') userId: string, @Body() dto: TransferDto) {
    return this.engine.transfer(
      userId,
      dto.currencyId,
      dto.fromType as WalletType,
      dto.toType as WalletType,
      dto.amount,
      dto.idempotencyKey,
    );
  }

  // ---- Bonus & reward wallets ----------------------------------------------

  @Get('bonus')
  @ApiOperation({ summary: 'List my bonus wallets' })
  bonusWallets(@CurrentUser('id') userId: string) {
    return this.bonus.list(userId);
  }

  @Post('bonus/:id/convert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert a cleared bonus into the main wallet' })
  convertBonus(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.bonus.convert(userId, id);
  }

  @Get('reward')
  @ApiOperation({ summary: 'Get my reward (loyalty) wallet' })
  reward(@CurrentUser('id') userId: string) {
    return this.rewards.get(userId);
  }

  @Post('reward/redeem')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redeem loyalty points' })
  redeem(@CurrentUser('id') userId: string, @Body() dto: RewardPointsDto) {
    return this.rewards.redeem(userId, dto.points);
  }

  // Used to provision a starter wallet & demo funds in non-production play.
  @Post('grant-bonus')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Claim a promotional bonus (if eligible)' })
  grantBonus(@CurrentUser('id') userId: string, @Body() dto: GrantBonusDto) {
    return this.bonus.grant({
      userId,
      currencyId: dto.currencyId,
      amount: dto.amount,
      wageringRequirement: dto.wageringRequirement,
    });
  }
}

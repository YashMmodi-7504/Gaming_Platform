import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WalletService } from './wallet.service';

@ApiTags('Wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'List the authenticated user wallets' })
  myWallets(@CurrentUser('id') userId: string) {
    return this.walletService.findByUser(userId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Balance summary across all wallets' })
  summary(@CurrentUser('id') userId: string) {
    return this.walletService.summary(userId);
  }

  @Get(':currencyId')
  @ApiOperation({ summary: 'Get (or create) a wallet by currency for the user' })
  byCurrency(@CurrentUser('id') userId: string, @Param('currencyId') currencyId: string) {
    return this.walletService.findByCurrency(userId, currencyId);
  }
}

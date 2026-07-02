import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { DiceGameRuleSet } from '@gaming-platform/dice-engine';

import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../authorization/rbac.constants';
import { PrismaService } from '../database/prisma.service';
import { DiceVariantService } from './services/dice-variant.service';
import { CreateDiceVariantDto, UpdateDiceVariantDto } from './dto/dice.dto';

@ApiTags('Admin · Dice Engine')
@ApiBearerAuth()
@Controller('admin/dice')
export class AdminDiceController {
  constructor(
    private readonly variants: DiceVariantService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('variants')
  @RequirePermissions(PERMISSIONS.GAMES_READ)
  @ApiOperation({ summary: 'List all variants (incl. disabled)' })
  list() {
    return this.variants.list(true);
  }

  @Post('variants')
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Create a dice variant from rule configuration' })
  create(@Body() dto: CreateDiceVariantDto) {
    return this.variants.create({
      key: dto.key,
      name: dto.name,
      rules: dto.rules as Partial<DiceGameRuleSet>,
    });
  }

  @Put('variants/:key')
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Edit a variant rule configuration / payouts / limits' })
  update(@Param('key') key: string, @Body() dto: UpdateDiceVariantDto) {
    return this.variants.update(key, {
      name: dto.name,
      rules: dto.rules as Partial<DiceGameRuleSet> | undefined,
    });
  }

  @Post('variants/:key/enable')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Enable a variant table' })
  enable(@Param('key') key: string) {
    return this.variants.setEnabled(key, true);
  }

  @Post('variants/:key/disable')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Disable a variant table (maintenance mode)' })
  disable(@Param('key') key: string) {
    return this.variants.setEnabled(key, false);
  }

  @Delete('variants/:key')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Delete a custom variant' })
  remove(@Param('key') key: string) {
    return this.variants.remove(key);
  }

  @Get('statistics')
  @RequirePermissions(PERMISSIONS.GAMES_READ)
  @ApiOperation({ summary: 'Dice engine statistics' })
  async statistics() {
    const variants = await this.variants.list(true);
    const replays = await this.prisma.gameReplay.count({ where: { pluginKey: 'dice-engine' } });
    const savedStates = await this.prisma.gameRuntimeState.count({
      where: { pluginKey: 'dice-engine' },
    });
    return {
      totalVariants: variants.length,
      builtIn: variants.filter((v) => v.builtIn).length,
      custom: variants.filter((v) => !v.builtIn).length,
      disabled: variants.filter((v) => !v.enabled).length,
      replays,
      savedStates,
    };
  }

  @Get('replays')
  @RequirePermissions(PERMISSIONS.GAMES_READ)
  @ApiOperation({ summary: 'Inspect recent dice replays' })
  replays() {
    return this.prisma.gameReplay.findMany({
      where: { pluginKey: 'dice-engine' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, sessionId: true, seed: true, frameCount: true, durationMs: true, createdAt: true },
    });
  }
}

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
import type { RouletteRuleSet } from '@gaming-platform/roulette-engine';

import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../authorization/rbac.constants';
import { PrismaService } from '../database/prisma.service';
import { RouletteVariantService } from './services/roulette-variant.service';
import { CreateRouletteVariantDto, UpdateRouletteVariantDto } from './dto/roulette.dto';

@ApiTags('Admin · Roulette Engine')
@ApiBearerAuth()
@Controller('admin/roulette')
export class AdminRouletteController {
  constructor(
    private readonly variants: RouletteVariantService,
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
  @ApiOperation({ summary: 'Create a roulette variant from rule configuration' })
  create(@Body() dto: CreateRouletteVariantDto) {
    return this.variants.create({
      key: dto.key,
      name: dto.name,
      rules: dto.rules as Partial<RouletteRuleSet>,
    });
  }

  @Put('variants/:key')
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Edit a variant rule configuration / payouts / limits' })
  update(@Param('key') key: string, @Body() dto: UpdateRouletteVariantDto) {
    return this.variants.update(key, {
      name: dto.name,
      rules: dto.rules as Partial<RouletteRuleSet> | undefined,
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
  @ApiOperation({ summary: 'Roulette engine statistics' })
  async statistics() {
    const variants = await this.variants.list(true);
    const replays = await this.prisma.gameReplay.count({ where: { pluginKey: 'roulette-engine' } });
    const savedStates = await this.prisma.gameRuntimeState.count({
      where: { pluginKey: 'roulette-engine' },
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
  @ApiOperation({ summary: 'Inspect recent roulette replays' })
  replays() {
    return this.prisma.gameReplay.findMany({
      where: { pluginKey: 'roulette-engine' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, sessionId: true, seed: true, frameCount: true, durationMs: true, createdAt: true },
    });
  }
}

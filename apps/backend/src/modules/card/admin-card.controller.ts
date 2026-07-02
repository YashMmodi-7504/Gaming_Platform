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
import type { CardGameRuleSet } from '@gaming-platform/card-engine';

import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../authorization/rbac.constants';
import { PrismaService } from '../database/prisma.service';
import { CardVariantService } from './services/card-variant.service';
import { CreateVariantDto, UpdateVariantDto } from './dto/card.dto';

@ApiTags('Admin · Card Engine')
@ApiBearerAuth()
@Controller('admin/card')
export class AdminCardController {
  constructor(
    private readonly variants: CardVariantService,
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
  @ApiOperation({ summary: 'Create a card variant from rule configuration' })
  create(@Body() dto: CreateVariantDto) {
    return this.variants.create({
      key: dto.key,
      name: dto.name,
      rules: dto.rules as Partial<CardGameRuleSet>,
    });
  }

  @Put('variants/:key')
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Edit a variant rule configuration / payouts' })
  update(@Param('key') key: string, @Body() dto: UpdateVariantDto) {
    return this.variants.update(key, {
      name: dto.name,
      rules: dto.rules as Partial<CardGameRuleSet> | undefined,
    });
  }

  @Post('variants/:key/enable')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Enable a variant' })
  enable(@Param('key') key: string) {
    return this.variants.setEnabled(key, true);
  }

  @Post('variants/:key/disable')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Disable a variant (maintenance mode)' })
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
  @ApiOperation({ summary: 'Card engine statistics' })
  async statistics() {
    const variants = await this.variants.list(true);
    const replays = await this.prisma.gameReplay.count({ where: { pluginKey: 'card-engine' } });
    const savedStates = await this.prisma.gameRuntimeState.count({
      where: { pluginKey: 'card-engine' },
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
  @ApiOperation({ summary: 'Inspect recent card replays' })
  replays() {
    return this.prisma.gameReplay.findMany({
      where: { pluginKey: 'card-engine' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, sessionId: true, seed: true, frameCount: true, durationMs: true, createdAt: true },
    });
  }
}

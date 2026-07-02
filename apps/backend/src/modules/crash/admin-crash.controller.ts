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
import type { CrashGameRuleSet } from '@gaming-platform/crash-engine';

import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../authorization/rbac.constants';
import { PrismaService } from '../database/prisma.service';
import { CrashVariantService } from './services/crash-variant.service';
import { CreateCrashVariantDto, UpdateCrashVariantDto } from './dto/crash.dto';

@ApiTags('Admin · Crash Engine')
@ApiBearerAuth()
@Controller('admin/crash')
export class AdminCrashController {
  constructor(
    private readonly variants: CrashVariantService,
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
  @ApiOperation({ summary: 'Create a crash variant from rule configuration' })
  create(@Body() dto: CreateCrashVariantDto) {
    return this.variants.create({
      key: dto.key,
      name: dto.name,
      rules: dto.rules as Partial<CrashGameRuleSet>,
    });
  }

  @Put('variants/:key')
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Edit a variant rule configuration / volatility / house edge' })
  update(@Param('key') key: string, @Body() dto: UpdateCrashVariantDto) {
    return this.variants.update(key, {
      name: dto.name,
      rules: dto.rules as Partial<CrashGameRuleSet> | undefined,
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
  @ApiOperation({ summary: 'Crash engine statistics' })
  async statistics() {
    const variants = await this.variants.list(true);
    const replays = await this.prisma.gameReplay.count({ where: { pluginKey: 'crash-engine' } });
    const savedStates = await this.prisma.gameRuntimeState.count({
      where: { pluginKey: 'crash-engine' },
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
  @ApiOperation({ summary: 'Inspect recent crash replays' })
  replays() {
    return this.prisma.gameReplay.findMany({
      where: { pluginKey: 'crash-engine' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, sessionId: true, seed: true, frameCount: true, durationMs: true, createdAt: true },
    });
  }
}

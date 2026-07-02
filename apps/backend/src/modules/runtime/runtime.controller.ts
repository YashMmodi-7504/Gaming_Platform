import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RedisService } from '../redis/redis.service';
import { ActiveRuntimeService } from './services/active-runtime.service';
import { ProvablyFairService } from './services/provably-fair.service';
import { RuntimePluginRegistryService } from './services/runtime-plugin-registry.service';
import { RuntimeSessionService } from './services/runtime-session.service';
import {
  CreateRuntimeSessionDto,
  RuntimeActionDto,
  SaveReplayDto,
  SaveStateDto,
  VerifyFairnessDto,
} from './dto/runtime.dto';

@ApiTags('Game Runtime')
@Controller('runtime')
export class RuntimeController {
  constructor(
    private readonly registry: RuntimePluginRegistryService,
    private readonly sessions: RuntimeSessionService,
    private readonly active: ActiveRuntimeService,
    private readonly fair: ProvablyFairService,
    private readonly redis: RedisService,
  ) {}

  // ---- Plugin APIs ---------------------------------------------------------

  @Public()
  @Get('plugins')
  @ApiOperation({ summary: 'List registered game plugins (engines)' })
  plugins() {
    return this.registry.list();
  }

  @Public()
  @Get('plugins/:key')
  @ApiOperation({ summary: 'Plugin metadata and default configuration' })
  plugin(@Param('key') key: string) {
    return this.registry.get(key);
  }

  // ---- Runtime health ------------------------------------------------------

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Runtime health' })
  async health() {
    const redisOk = await this.redis.ping();
    return {
      status: redisOk ? 'ok' : 'degraded',
      plugins: this.registry.list().length,
      activeRuntimes: this.active.activeCount(),
      redis: redisOk ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    };
  }

  // ---- Provably fair -------------------------------------------------------

  @Public()
  @Post('provably-fair/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a provably-fair seed derivation' })
  verifyFairness(@Body() dto: VerifyFairnessDto) {
    return this.fair.verify(dto);
  }

  // ---- Session APIs --------------------------------------------------------

  @Post('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a runtime session' })
  createSession(@CurrentUser('id') userId: string, @Body() dto: CreateRuntimeSessionDto) {
    return this.sessions.create({ userId, ...dto });
  }

  @Get('sessions/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a runtime session' })
  getSession(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sessions.get(id, userId);
  }

  @Get('sessions/:id/config')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolved configuration for a session' })
  async config(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return (await this.sessions.get(id, userId)).config;
  }

  @Post('sessions/:id/action')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply a player action to the runtime (server-authoritative)' })
  async action(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: RuntimeActionDto,
  ) {
    const runtime = await this.ensureRuntime(id, userId);
    runtime.send(dto.type, dto.payload ?? {});
    return { state: runtime.saveState(), lastResult: runtime.results.last() ?? null };
  }

  @Get('sessions/:id/live-state')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Live in-memory state of an active runtime' })
  async liveState(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.sessions.getRecord(id, userId);
    if (!this.active.has(id)) return { active: false, state: null };
    return { active: true, state: this.active.get(id).saveState() };
  }

  // ---- Save / restore state ------------------------------------------------

  @Post('sessions/:id/state')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Persist a save state' })
  saveState(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SaveStateDto,
  ) {
    return this.sessions.saveState(id, userId, dto.state, dto.version);
  }

  @Get('sessions/:id/state')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore a save state' })
  getState(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sessions.getState(id, userId);
  }

  // ---- Replay --------------------------------------------------------------

  @Post('sessions/:id/replay')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Store a replay' })
  saveReplay(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SaveReplayDto,
  ) {
    return this.sessions.saveReplay(id, userId, dto);
  }

  @Get('sessions/:id/replay')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List replays for a session' })
  listReplays(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sessions.listReplays(id, userId);
  }

  @Post('sessions/:id/end')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'End a runtime session and release resources' })
  async end(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.active.stop(id);
    return this.sessions.end(id, userId);
  }

  private async ensureRuntime(id: string, userId: string) {
    const record = await this.sessions.getRecord(id, userId);
    return this.active.start({
      runtimeSessionId: id,
      pluginKey: record.pluginKey,
      context: this.sessions.buildContext(record),
      config: record.config,
      onEvent: () => undefined,
    });
  }
}

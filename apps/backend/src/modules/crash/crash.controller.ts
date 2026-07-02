import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CrashEngineService } from './services/crash-engine.service';
import { CrashSessionService } from './services/crash-session.service';
import { CrashVariantService } from './services/crash-variant.service';
import {
  CreateCrashSessionDto,
  SaveCrashReplayDto,
  SaveCrashStateDto,
  StartRoundDto,
  StatelessPlayDto,
  VerifyCrashDto,
  VerifyFairnessDto,
} from './dto/crash.dto';

@ApiTags('Crash Engine')
@Controller('crash')
export class CrashController {
  constructor(
    private readonly variants: CrashVariantService,
    private readonly engine: CrashEngineService,
    private readonly sessions: CrashSessionService,
  ) {}

  // ---- Variants & configuration -------------------------------------------

  @Public()
  @Get('variants')
  @ApiOperation({ summary: 'List available crash variants' })
  listVariants() {
    return this.variants.list();
  }

  @Public()
  @Get('variants/:key')
  @ApiOperation({ summary: 'Resolve the full ruleset for a variant' })
  getVariant(@Param('key') key: string) {
    return this.variants.resolve(key);
  }

  // ---- Stateless single round ---------------------------------------------

  @Post('play')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Play one self-contained, verifiable round (auto cash-out only)' })
  play(@Body() dto: StatelessPlayDto) {
    return this.engine.play(dto.variantKey, dto.bets, dto.manualCashouts, dto.clientSeed);
  }

  // ---- Provably fair -------------------------------------------------------

  @Public()
  @Post('verify-crash')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reproduce a deterministic crash point from a seed' })
  verifyCrash(@Body() dto: VerifyCrashDto) {
    return this.engine.verifyCrash(dto.variantKey, dto.seed);
  }

  @Public()
  @Post('verify-fairness')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a provably-fair seed derivation' })
  verifyFairness(@Body() dto: VerifyFairnessDto) {
    return this.engine.verifyFairness(dto);
  }

  // ---- Sessions ------------------------------------------------------------

  @Post('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a crash session for a variant' })
  createSession(@CurrentUser('id') userId: string, @Body() dto: CreateCrashSessionDto) {
    return this.sessions.create({ userId, ...dto });
  }

  @Get('sessions/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a crash session' })
  getSession(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sessions.get(id, userId);
  }

  @Post('sessions/:id/start')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Begin a round (opens the cash-out window; crash point hidden)' })
  startRound(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: StartRoundDto) {
    return this.sessions.startRound(id, userId, { amount: dto.amount, autoCashout: dto.autoCashout });
  }

  @Post('sessions/:id/cashout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cash out the in-progress round at the current multiplier' })
  cashout(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sessions.cashout(id, userId);
  }

  @Post('sessions/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve the in-progress round (bust / auto cash-out)' })
  resolve(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sessions.resolve(id, userId);
  }

  @Get('sessions/:id/state')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore saved state' })
  getState(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sessions.getState(id, userId);
  }

  @Post('sessions/:id/state')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Persist save state' })
  saveState(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SaveCrashStateDto,
  ) {
    return this.sessions.saveState(id, userId, dto.state, dto.version);
  }

  @Get('sessions/:id/replay')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List replays' })
  listReplays(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sessions.listReplays(id, userId);
  }

  @Post('sessions/:id/replay')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Store a replay' })
  saveReplay(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SaveCrashReplayDto,
  ) {
    return this.sessions.saveReplay(id, userId, dto);
  }

  @Get('sessions/:id/history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Round history' })
  history(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sessions.history(id, userId);
  }

  @Get('sessions/:id/fairness')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current fairness commitment' })
  fairness(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sessions.fairness(id, userId);
  }

  @Post('sessions/:id/end')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'End session and reveal server seed' })
  end(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sessions.end(id, userId);
  }
}

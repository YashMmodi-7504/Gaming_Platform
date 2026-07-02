import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RouletteEngineService } from './services/roulette-engine.service';
import { RouletteSessionService } from './services/roulette-session.service';
import { RouletteVariantService } from './services/roulette-variant.service';
import {
  CreateRouletteSessionDto,
  SaveRouletteReplayDto,
  SaveRouletteStateDto,
  SpinDto,
  StatelessSpinDto,
  VerifyFairnessDto,
  VerifySpinDto,
} from './dto/roulette.dto';

@ApiTags('Roulette Engine')
@Controller('roulette')
export class RouletteController {
  constructor(
    private readonly variants: RouletteVariantService,
    private readonly engine: RouletteEngineService,
    private readonly sessions: RouletteSessionService,
  ) {}

  // ---- Variants & configuration -------------------------------------------

  @Public()
  @Get('variants')
  @ApiOperation({ summary: 'List available roulette variants' })
  listVariants() {
    return this.variants.list();
  }

  @Public()
  @Get('variants/:key')
  @ApiOperation({ summary: 'Resolve the full ruleset for a variant' })
  getVariant(@Param('key') key: string) {
    return this.variants.resolve(key);
  }

  // ---- Stateless single spin ----------------------------------------------

  @Post('play')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Spin one self-contained, verifiable round' })
  play(@Body() dto: StatelessSpinDto) {
    return this.engine.play(dto.variantKey, dto.bets, dto.clientSeed);
  }

  // ---- Provably fair -------------------------------------------------------

  @Public()
  @Post('verify-spin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reproduce a deterministic spin outcome from a seed' })
  verifySpin(@Body() dto: VerifySpinDto) {
    return this.engine.verifySpin(dto.variantKey, dto.seed);
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
  @ApiOperation({ summary: 'Start a roulette session for a variant' })
  createSession(@CurrentUser('id') userId: string, @Body() dto: CreateRouletteSessionDto) {
    return this.sessions.create({ userId, ...dto });
  }

  @Get('sessions/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a roulette session' })
  getSession(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sessions.get(id, userId);
  }

  @Post('sessions/:id/spin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Spin the wheel and settle bets' })
  spin(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: SpinDto) {
    return this.sessions.spin(id, userId, dto.bets);
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
    @Body() dto: SaveRouletteStateDto,
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
    @Body() dto: SaveRouletteReplayDto,
  ) {
    return this.sessions.saveReplay(id, userId, dto);
  }

  @Get('sessions/:id/history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Spin history' })
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

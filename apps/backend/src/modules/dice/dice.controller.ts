import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { DiceEngineService } from './services/dice-engine.service';
import { DiceSessionService } from './services/dice-session.service';
import { DiceVariantService } from './services/dice-variant.service';
import {
  CreateDiceSessionDto,
  RollDto,
  SaveDiceReplayDto,
  SaveDiceStateDto,
  StatelessRollDto,
  VerifyFairnessDto,
  VerifyRollDto,
} from './dto/dice.dto';

@ApiTags('Dice Engine')
@Controller('dice')
export class DiceController {
  constructor(
    private readonly variants: DiceVariantService,
    private readonly engine: DiceEngineService,
    private readonly sessions: DiceSessionService,
  ) {}

  // ---- Variants & configuration -------------------------------------------

  @Public()
  @Get('variants')
  @ApiOperation({ summary: 'List available dice variants' })
  listVariants() {
    return this.variants.list();
  }

  @Public()
  @Get('variants/:key')
  @ApiOperation({ summary: 'Resolve the full ruleset for a variant' })
  getVariant(@Param('key') key: string) {
    return this.variants.resolve(key);
  }

  // ---- Stateless single roll ----------------------------------------------

  @Post('play')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Roll one self-contained, verifiable round' })
  play(@Body() dto: StatelessRollDto) {
    return this.engine.play(dto.variantKey, dto.bets, dto.clientSeed);
  }

  // ---- Provably fair -------------------------------------------------------

  @Public()
  @Post('verify-roll')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reproduce a deterministic dice outcome from a seed' })
  verifyRoll(@Body() dto: VerifyRollDto) {
    return this.engine.verifyRoll(dto.variantKey, dto.seed);
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
  @ApiOperation({ summary: 'Start a dice session for a variant' })
  createSession(@CurrentUser('id') userId: string, @Body() dto: CreateDiceSessionDto) {
    return this.sessions.create({ userId, ...dto });
  }

  @Get('sessions/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a dice session' })
  getSession(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sessions.get(id, userId);
  }

  @Post('sessions/:id/roll')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Roll the dice and settle bets' })
  roll(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: RollDto) {
    return this.sessions.roll(id, userId, dto.bets);
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
    @Body() dto: SaveDiceStateDto,
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
    @Body() dto: SaveDiceReplayDto,
  ) {
    return this.sessions.saveReplay(id, userId, dto);
  }

  @Get('sessions/:id/history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Roll history' })
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

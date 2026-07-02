import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CardEngineService } from './services/card-engine.service';
import { CardSessionService } from './services/card-session.service';
import { CardVariantService } from './services/card-variant.service';
import {
  CreateCardSessionDto,
  PlayRoundDto,
  SaveCardReplayDto,
  SaveCardStateDto,
  StatelessPlayDto,
  VerifyFairnessDto,
  VerifyShuffleDto,
} from './dto/card.dto';

@ApiTags('Card Engine')
@Controller('card')
export class CardController {
  constructor(
    private readonly variants: CardVariantService,
    private readonly engine: CardEngineService,
    private readonly sessions: CardSessionService,
  ) {}

  // ---- Variants & configuration -------------------------------------------

  @Public()
  @Get('variants')
  @ApiOperation({ summary: 'List available card game variants' })
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
  @ApiOperation({ summary: 'Play one self-contained, verifiable round' })
  play(@Body() dto: StatelessPlayDto) {
    return this.engine.play(dto.variantKey, dto.bets, dto.clientSeed);
  }

  // ---- Provably fair -------------------------------------------------------

  @Public()
  @Post('verify-shuffle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reproduce a deterministic shoe from a seed' })
  verifyShuffle(@Body() dto: VerifyShuffleDto) {
    return this.engine.verifyShuffle(dto.seed, dto.decks ?? 1, dto.jokersPerDeck ?? 0);
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
  @ApiOperation({ summary: 'Start a card session for a variant' })
  createSession(@CurrentUser('id') userId: string, @Body() dto: CreateCardSessionDto) {
    return this.sessions.create({ userId, ...dto });
  }

  @Get('sessions/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a card session' })
  getSession(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sessions.get(id, userId);
  }

  @Post('sessions/:id/round')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Play a round (auto-resolve games)' })
  playRound(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: PlayRoundDto,
  ) {
    return this.sessions.playRound(id, userId, dto.bets);
  }

  @Post('sessions/:id/bj/deal')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Blackjack — deal initial hands' })
  bjDeal(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: PlayRoundDto) {
    return this.sessions.blackjackDeal(id, userId, dto.bets);
  }

  @Post('sessions/:id/bj/hit')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Blackjack — hit' })
  bjHit(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sessions.blackjackHit(id, userId);
  }

  @Post('sessions/:id/bj/stand')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Blackjack — stand and resolve' })
  bjStand(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sessions.blackjackStand(id, userId);
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
    @Body() dto: SaveCardStateDto,
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
    @Body() dto: SaveCardReplayDto,
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

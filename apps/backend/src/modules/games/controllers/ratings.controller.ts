import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RateGameDto, ReviewGameDto } from '../dto/interactions.dto';
import { RatingService } from '../services/rating.service';

@ApiTags('Games · Ratings')
@ApiBearerAuth()
@Controller('game-ratings')
export class RatingsController {
  constructor(private readonly ratings: RatingService) {}

  @Post(':gameId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rate a game (1–5)' })
  rate(
    @CurrentUser('id') userId: string,
    @Param('gameId') gameId: string,
    @Body() dto: RateGameDto,
  ) {
    return this.ratings.rate(userId, gameId, dto.rating);
  }

  @Post(':gameId/review')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Write or update a review' })
  review(
    @CurrentUser('id') userId: string,
    @Param('gameId') gameId: string,
    @Body() dto: ReviewGameDto,
  ) {
    return this.ratings.review(userId, gameId, dto);
  }
}

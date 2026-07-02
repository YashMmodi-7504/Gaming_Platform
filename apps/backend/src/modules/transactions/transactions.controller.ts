import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'List the authenticated user transactions (paginated)' })
  list(@CurrentUser('id') userId: string, @Query() query: PaginationQueryDto) {
    return this.transactionsService.listForUser(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a single transaction by id' })
  findById(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.transactionsService.findById(userId, id);
  }
}

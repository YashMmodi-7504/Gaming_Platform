import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ApiKeyCreated, ApiKeySummary } from '@gaming-platform/types';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CreateApiKeyDto } from '../dto/auth-flow.dto';
import { ApiKeyService } from '../services/api-key.service';

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('auth/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeyService) {}

  @Get()
  @ApiOperation({ summary: 'List the current user API keys' })
  list(@CurrentUser('id') userId: string): Promise<ApiKeySummary[]> {
    return this.apiKeys.list(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an API key (the secret is returned once)' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateApiKeyDto): Promise<ApiKeyCreated> {
    const expiresAt = dto.expiresInDays
      ? new Date(Date.now() + dto.expiresInDays * 86_400_000)
      : undefined;
    return this.apiKeys.create(userId, { name: dto.name, scopes: dto.scopes, expiresAt });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an API key' })
  revoke(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.apiKeys.revoke(userId, id);
  }
}

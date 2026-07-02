import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { ApiKeyService } from '../services/api-key.service';

/**
 * Authenticates a request via the `x-api-key` header. Apply alongside `@Public`
 * to expose machine-to-machine endpoints. Populates `request.apiKey` with the
 * owner id and granted scopes.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeys: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      Request & { apiKey?: { userId: string; scopes: string[]; keyId: string } }
    >();
    const header = request.headers['x-api-key'];
    const raw = Array.isArray(header) ? header[0] : header;
    if (!raw) {
      throw new UnauthorizedException('API key required');
    }

    const verified = await this.apiKeys.verify(raw);
    if (!verified) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    request.apiKey = verified;
    return true;
  }
}

import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { extractRequestMeta, type RequestMeta } from '../security/request-meta';

/**
 * Injects the {@link RequestMeta} snapshot (IP, user-agent, device fingerprint,
 * geo headers) for the current request.
 */
export const ReqMeta = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestMeta =>
    extractRequestMeta(ctx.switchToHttp().getRequest<Request>()),
);

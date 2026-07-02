import { Injectable, NotFoundException } from '@nestjs/common';
import { DeviceType } from '@prisma/client';
import UAParser from 'ua-parser-js';

import type { RequestMeta } from '../../../common/security/request-meta';
import { PrismaService } from '../../database/prisma.service';

interface ParsedAgent {
  type: DeviceType;
  os: string | null;
  browser: string | null;
  name: string;
}

function parseUserAgent(userAgent: string | null): ParsedAgent {
  const result = new UAParser(userAgent ?? '').getResult();
  const osName = result.os.name ?? null;
  const browser = result.browser.name ?? null;
  const rawType = result.device.type;

  let type: DeviceType = DeviceType.WEB;
  if (osName === 'iOS') type = DeviceType.IOS;
  else if (osName === 'Android') type = DeviceType.ANDROID;
  else if (rawType === 'tablet') type = DeviceType.TABLET;
  else if (rawType === 'mobile') type = DeviceType.OTHER;

  const name = [browser, osName].filter(Boolean).join(' on ') || 'Unknown device';
  return { type, os: osName, browser, name };
}

/**
 * Tracks the devices a user authenticates from (keyed by a stable fingerprint)
 * and manages the "trusted device" flag used to relax step-up challenges.
 */
@Injectable()
export class DeviceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Record (or refresh) the device used for an authentication. */
  async register(userId: string, meta: RequestMeta) {
    const parsed = parseUserAgent(meta.userAgent);
    return this.prisma.device.upsert({
      where: { fingerprint: meta.fingerprint },
      update: {
        userId,
        ipAddress: meta.ipAddress,
        os: parsed.os,
        browser: parsed.browser,
        type: parsed.type,
        lastUsedAt: new Date(),
      },
      create: {
        userId,
        fingerprint: meta.fingerprint,
        name: parsed.name,
        type: parsed.type,
        os: parsed.os,
        browser: parsed.browser,
        ipAddress: meta.ipAddress,
        lastUsedAt: new Date(),
      },
    });
  }

  list(userId: string) {
    return this.prisma.device.findMany({
      where: { userId, deletedAt: null },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async setTrusted(userId: string, deviceId: string, isTrusted: boolean) {
    const device = await this.prisma.device.findFirst({ where: { id: deviceId, userId } });
    if (!device) throw new NotFoundException('Device not found');
    return this.prisma.device.update({ where: { id: deviceId }, data: { isTrusted } });
  }

  async remove(userId: string, deviceId: string) {
    const device = await this.prisma.device.findFirst({ where: { id: deviceId, userId } });
    if (!device) throw new NotFoundException('Device not found');
    await this.prisma.device.update({ where: { id: deviceId }, data: { deletedAt: new Date() } });
    return { success: true as const };
  }

  async isTrusted(userId: string, fingerprint: string): Promise<boolean> {
    const device = await this.prisma.device.findFirst({
      where: { userId, fingerprint, isTrusted: true, deletedAt: null },
      select: { id: true },
    });
    return Boolean(device);
  }
}
